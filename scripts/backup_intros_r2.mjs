#!/usr/bin/env node
/**
 * scripts/backup_intros_r2.mjs
 *
 * Downloads all Intro resources (chapters/*.json and metadata.json) from
 * Cloudflare R2 into a timestamped local snapshot directory under
 * scripts/backups/intros_<timestamp>/ along with a manifest.json.
 *
 * Use scripts/revert_intros_r2.mjs to restore Cloudflare R2 from any snapshot.
 *
 * Usage:
 *   node scripts/backup_intros_r2.mjs
 *   node scripts/backup_intros_r2.mjs --all-intros   (include unlinked Intro resources too)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from './lib/ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const ALL_INTROS = ARGS.includes('--all-intros');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
const R2_BUCKET = process.env.R2_BUCKET_NAME;

async function fetchAll(table, select) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function keyPrefixFromUrl(storageBaseUrl) {
  if (!storageBaseUrl) return null;
  const clean = storageBaseUrl.replace(/\/+$/, '') + '/';
  const prefix = `${R2_PUBLIC_URL}/`;
  if (!clean.startsWith(prefix)) return null;
  return clean.slice(prefix.length);
}

async function getObjectBuffer(s3, key) {
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const bytes = await out.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

async function main() {
  if (!R2_BUCKET || !R2_PUBLIC_URL) {
    throw new Error('Missing R2_BUCKET_NAME or R2_PUBLIC_URL in .env');
  }

  console.log('Loading Intro resources from Supabase...');
  const [intros, mapRows, resources] = await Promise.all([
    fetchAll('lc_exam_intro', 'exam_id, source, resource_id'),
    fetchAll('lc_exam_resource_map', 'exam_id, resource_id, category').then((rows) =>
      rows.filter((r) => (r.category || '').trim().toLowerCase() === 'intro')
    ),
    fetchAll('resources', 'resource_id, title, category, format, storage_base_url, chapter_count'),
  ]);

  const linkedIds = new Set();
  for (const i of intros) if (i.source === 'auto' && i.resource_id) linkedIds.add(i.resource_id);
  for (const m of mapRows) if (m.resource_id) linkedIds.add(m.resource_id);

  const targets = resources.filter((r) => {
    const isIntroCat = (r.category || '').trim().toLowerCase() === 'intro';
    if (ALL_INTROS) return isIntroCat;
    return linkedIds.has(r.resource_id);
  });

  // Deduplicate by storage_base_url keyPrefix so we don't fetch the same R2 object twice
  const byPrefix = new Map();
  for (const r of targets) {
    const keyPrefix = keyPrefixFromUrl(r.storage_base_url);
    if (!keyPrefix) continue;
    if (!byPrefix.has(keyPrefix)) {
      byPrefix.set(keyPrefix, {
        keyPrefix,
        storage_base_url: r.storage_base_url,
        chapter_count: Math.max(1, Number(r.chapter_count) || 1),
        resource_ids: [r.resource_id],
      });
    } else {
      const existing = byPrefix.get(keyPrefix);
      existing.resource_ids.push(r.resource_id);
      existing.chapter_count = Math.max(existing.chapter_count, Number(r.chapter_count) || 1);
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, 'backups', `intros_${stamp}`);
  const filesRoot = path.join(backupDir, 'files');
  fs.mkdirSync(filesRoot, { recursive: true });

  console.log(`Backing up ${byPrefix.size} unique R2 Intro prefixes (${targets.length} resource rows) to:\n  ${backupDir}\n`);

  const s3 = getS3Client();
  const limit = pLimit(10);
  const manifestEntries = [];
  let filesSaved = 0;
  let missingFiles = 0;
  let processed = 0;

  const entries = Array.from(byPrefix.values());
  await Promise.all(
    entries.map((entry) =>
      limit(async () => {
        const keysToFetch = [`${entry.keyPrefix}metadata.json`];
        for (let i = 1; i <= entry.chapter_count; i++) {
          keysToFetch.push(`${entry.keyPrefix}chapters/chapter-${i}.json`);
        }

        const savedFiles = [];
        for (const key of keysToFetch) {
          const buf = await getObjectBuffer(s3, key);
          if (!buf) {
            missingFiles++;
            continue;
          }
          const relLocal = key;
          const destPath = path.join(filesRoot, relLocal);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, buf);
          const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
          savedFiles.push({ key, local_path: path.join('files', relLocal), bytes: buf.length, sha256 });
          filesSaved++;
        }

        manifestEntries.push({
          key_prefix: entry.keyPrefix,
          storage_base_url: entry.storage_base_url,
          resource_ids: entry.resource_ids,
          files: savedFiles,
        });

        processed++;
        if (processed % 100 === 0 || processed === entries.length) {
          console.log(`  Progress: ${processed}/${entries.length} prefixes (${filesSaved} files saved, ${missingFiles} missing)`);
        }
      })
    )
  );

  const manifest = {
    created_at: new Date().toISOString(),
    r2_bucket: R2_BUCKET,
    r2_public_url: R2_PUBLIC_URL,
    prefix_count: manifestEntries.length,
    files_saved: filesSaved,
    missing_files: missingFiles,
    entries: manifestEntries,
  };

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nBackup complete!`);
  console.log(`  Snapshot: ${backupDir}`);
  console.log(`  Files saved: ${filesSaved}, Missing in R2: ${missingFiles}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
