#!/usr/bin/env node
/**
 * scripts/migrate-r2-account.js
 *
 * Cross-account R2 migration: copies every object from the old bucket
 * (R2_* — account belonging to a developer who's gone unreachable, see
 * status_report.md) to a new bucket under R2_NEW_* (an account the team
 * actually controls). Unlike the earlier same-account STATE EXAMS prefix
 * migration, R2 has no server-side CopyObject across different accounts —
 * this has to actually download each object and re-upload it.
 *
 * Does NOT touch Supabase. This only copies bytes; resources_v2's
 * storage_base_url/metadata_url/thumbnail_url still point at the OLD
 * bucket's public URL until a separate, deliberate cutover step repoints
 * them — the app keeps working against the old bucket the entire time
 * this runs.
 *
 * Resumable by design: skips any key that already exists (and matches
 * size) at the destination, so an interrupted run can just be re-launched.
 *
 * Usage: node scripts/migrate-r2-account.js [--limit N] [--concurrency N]
 */

import fs from 'node:fs';
import path from 'node:path';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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
  const out = { limit: Infinity, concurrency: 24 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') out.limit = parseInt(args[++i], 10);
    else if (args[i] === '--concurrency') out.concurrency = parseInt(args[++i], 10);
  }
  return out;
}

function getSourceClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
}

function getDestClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_NEW_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_NEW_ACCESS_KEY_ID, secretAccessKey: process.env.R2_NEW_SECRET_ACCESS_KEY },
  });
}

async function listAllKeys(client, bucket) {
  const all = [];
  let continuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
    (res.Contents || []).forEach((o) => all.push({ key: o.Key, size: o.Size }));
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return all;
}

async function alreadyCopied(destClient, destBucket, key, expectedSize) {
  try {
    const res = await destClient.send(new HeadObjectCommand({ Bucket: destBucket, Key: key }));
    return res.ContentLength === expectedSize;
  } catch {
    return false;
  }
}

async function copyOne(sourceClient, sourceBucket, destClient, destBucket, key) {
  const getRes = await sourceClient.send(new GetObjectCommand({ Bucket: sourceBucket, Key: key }));
  const chunks = [];
  for await (const chunk of getRes.Body) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  await destClient.send(new PutObjectCommand({
    Bucket: destBucket,
    Key: key,
    Body: body,
    ContentType: getRes.ContentType || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000',
  }));

  return body.length;
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

async function main() {
  const opts = parseArgs();
  const sourceClient = getSourceClient();
  const destClient = getDestClient();
  const sourceBucket = process.env.R2_BUCKET_NAME;
  const destBucket = process.env.R2_NEW_BUCKET_NAME;

  console.log(`Source: ${sourceBucket} (account ${process.env.R2_ACCOUNT_ID})`);
  console.log(`Dest:   ${destBucket} (account ${process.env.R2_NEW_ACCOUNT_ID})`);
  console.log('Listing source bucket...');
  const allKeys = await listAllKeys(sourceClient, sourceBucket);
  console.log(`${allKeys.length} objects in source.`);

  const toProcess = allKeys.slice(0, opts.limit);
  console.log(`Processing ${toProcess.length} (concurrency=${opts.concurrency}, checking each for already-copied first)...\n`);

  let copied = 0;
  let skipped = 0;
  let bytesTransferred = 0;
  const failed = [];

  await mapWithConcurrency(toProcess, opts.concurrency, async (item, i) => {
    try {
      const exists = await alreadyCopied(destClient, destBucket, item.key, item.size);
      if (exists) {
        skipped++;
        return;
      }
      const size = await copyOne(sourceClient, sourceBucket, destClient, destBucket, item.key);
      bytesTransferred += size;
      copied++;
      if ((copied + skipped) % 500 === 0) {
        console.log(`[${copied + skipped}/${toProcess.length}] copied=${copied} skipped=${skipped} (${(bytesTransferred / 1024 / 1024).toFixed(0)} MB transferred)`);
      }
    } catch (err) {
      failed.push({ key: item.key, error: err.message });
      console.error(`FAILED ${item.key}: ${err.message}`);
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Copied: ${copied}`);
  console.log(`Already present (skipped): ${skipped}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Bytes transferred: ${(bytesTransferred / 1024 / 1024 / 1024).toFixed(2)} GB`);

  if (failed.length > 0) {
    const reportPath = path.resolve(process.cwd(), `r2-migrate-failures-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(failed, null, 2));
    console.log(`Failure details written to ${reportPath} — re-run this script to retry (resumable).`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
