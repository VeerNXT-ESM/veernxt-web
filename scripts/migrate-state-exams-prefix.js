#!/usr/bin/env node
/**
 * scripts/migrate-state-exams-prefix.js
 *
 * One-off migration: moves every resources_v2 row whose R2 storage lives at
 * a bare state-name prefix (structured_resources/1. Andhra Pradesh/...) to
 * live under structured_resources/STATE EXAMS/1. Andhra Pradesh/... instead
 * — matching the pre-existing convention used by an earlier ingestion pass
 * and the user's intended Central/State/UT top-level taxonomy.
 *
 * R2 (S3-compatible) has no rename — this is CopyObject + DeleteObject per
 * object, then updating storage_base_url/metadata_url/thumbnail_url on the
 * Supabase row. Resumable by design: the row-selection query only picks up
 * rows NOT already under STATE EXAMS/ or CENTRAL EXAMS/, so a row is never
 * touched again once its DB row has been updated — safe to re-run after an
 * interruption without re-copying or double-processing anything.
 *
 * Usage: node scripts/migrate-state-exams-prefix.js [--limit N] [--concurrency N]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: Infinity, concurrency: 10 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') out.limit = parseInt(args[++i], 10);
    else if (args[i] === '--concurrency') out.concurrency = parseInt(args[++i], 10);
  }
  return out;
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
}

async function mapWithConcurrency(items, limit, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}

async function fetchRowsToMigrate(supabase, limit) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('resources_v2')
      .select('resource_id, storage_base_url, metadata_url, thumbnail_url')
      .not('storage_base_url', 'ilike', '%/structured_resources/STATE EXAMS/%')
      .not('storage_base_url', 'ilike', '%/structured_resources/CENTRAL EXAMS/%')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
    if (all.length >= limit) break;
  }
  return all.slice(0, limit);
}

function marker() { return '/structured_resources/'; }

function relPath(url) {
  const idx = url.indexOf(marker());
  return idx === -1 ? null : url.slice(idx + marker().length);
}

async function migrateOne(s3, bucket, publicUrl, supabase, row) {
  const oldRel = relPath(row.storage_base_url); // e.g. "1. Andhra Pradesh/.../<resource_id>/"
  if (!oldRel) throw new Error('storage_base_url missing /structured_resources/ marker');
  const oldPrefix = `structured_resources/${oldRel}`;
  const newPrefix = `structured_resources/STATE EXAMS/${oldRel}`;

  // 1. List every object under the old prefix
  let continuationToken;
  const keys = [];
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: oldPrefix, ContinuationToken: continuationToken }));
    (res.Contents || []).forEach((o) => keys.push(o.Key));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  if (keys.length === 0) {
    throw new Error(`No objects found under ${oldPrefix} — refusing to update DB row with nothing to point to`);
  }

  // 2. Copy each object to the new prefix (R2/S3 has no rename)
  for (const key of keys) {
    const newKey = newPrefix + key.slice(oldPrefix.length);
    await s3.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
      Key: newKey,
    }));
  }

  // 3. Only after every copy succeeded: update the DB row to the new URLs
  const newStorageBaseUrl = row.storage_base_url.replace(oldPrefix, newPrefix);
  const newMetadataUrl = row.metadata_url ? row.metadata_url.replace(oldPrefix, newPrefix) : row.metadata_url;
  const newThumbnailUrl = row.thumbnail_url ? row.thumbnail_url.replace(oldPrefix, newPrefix) : row.thumbnail_url;

  const { error } = await supabase
    .from('resources_v2')
    .update({ storage_base_url: newStorageBaseUrl, metadata_url: newMetadataUrl, thumbnail_url: newThumbnailUrl })
    .eq('resource_id', row.resource_id);
  if (error) throw error;

  // 4. Only after the DB row points at the new location: delete the old objects
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch } }));
  }

  return keys.length;
}

async function main() {
  const opts = parseArgs();
  const supabase = getSupabase();
  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  console.log('Fetching rows to migrate...');
  const rows = await fetchRowsToMigrate(supabase, opts.limit);
  console.log(`${rows.length} rows to migrate (concurrency=${opts.concurrency}).\n`);

  let done = 0;
  let objectsMoved = 0;
  const failed = [];

  await mapWithConcurrency(rows, opts.concurrency, async (row, i) => {
    try {
      const n = await migrateOne(s3, bucket, publicUrl, supabase, row);
      objectsMoved += n;
      done++;
      if (done % 100 === 0 || done === rows.length) {
        console.log(`[${done}/${rows.length}] migrated, ${objectsMoved} objects moved so far`);
      }
    } catch (err) {
      failed.push({ resource_id: row.resource_id, error: err.message });
      console.error(`[${i + 1}/${rows.length}] FAILED ${row.resource_id}: ${err.message}`);
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Migrated: ${done}`);
  console.log(`Objects moved: ${objectsMoved}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length > 0) {
    const reportPath = path.resolve(process.cwd(), `migrate-failures-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(failed, null, 2));
    console.log(`Failure details written to ${reportPath}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
