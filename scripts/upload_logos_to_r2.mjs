#!/usr/bin/env node
/**
 * scripts/upload_logos_to_r2.mjs
 *
 * Uploads the conducting-body logo files referenced by
 * exam-logos/manifest.json to the same Cloudflare R2 bucket the book
 * resources already live in (scripts/ingest-drive-content.js's
 * getS3Client/uploadToR2 — same env vars, same bucket), under an
 * `exam-logos/` prefix that mirrors the manifest's own relative paths
 * (e.g. exam-logos/central/foo.png). Only uploads entries that
 * scripts/map_conducting_body_logos.mjs can actually match to a
 * lc_conducting_bodies row -- no point uploading the ~150 unreferenced/
 * unmatched files sitting in the local exam-logos/ folder.
 *
 * Usage:
 *   node scripts/upload_logos_to_r2.mjs            (dry run)
 *   node scripts/upload_logos_to_r2.mjs --execute
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

async function fetchAllRows(table, columns) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// Same three-tier matcher as scripts/map_conducting_body_logos.mjs, kept
// in sync deliberately -- this script decides WHICH files are worth
// uploading using the exact same "would this actually get used" logic.
function buildMatcher(bodies) {
  const byExact = new Map(bodies.map((b) => [b.name.trim().toLowerCase(), b]));
  const byNorm = new Map(bodies.map((b) => [normalize(b.name), b]));
  return (conductingBodyName) => {
    const exactKey = conductingBodyName.trim().toLowerCase();
    if (byExact.has(exactKey)) return byExact.get(exactKey);
    const normKey = normalize(conductingBodyName);
    if (byNorm.has(normKey)) return byNorm.get(normKey);
    const abbrMatch = conductingBodyName.match(/\(([A-Za-z&]{2,10})\)/);
    if (abbrMatch) {
      const abbrKey = abbrMatch[1].trim().toLowerCase();
      if (byExact.has(abbrKey)) return byExact.get(abbrKey);
    }
    return null;
  };
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (uploading to R2)' : 'DRY RUN'}\n`);

  const repoRoot = path.join(__dirname, '..');
  const manifestPath = path.join(repoRoot, 'exam-logos', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const bodies = await fetchAllRows('lc_conducting_bodies', 'id,name');
  const findMatch = buildMatcher(bodies);

  const toUpload = [];
  const seenLogoPaths = new Set();
  for (const entry of manifest) {
    if (!entry.logo || !findMatch(entry.conducting_body)) continue;
    if (seenLogoPaths.has(entry.logo)) continue; // same logo file referenced by >1 manifest entry
    seenLogoPaths.add(entry.logo);
    const localPath = path.join(repoRoot, 'exam-logos', entry.logo);
    if (!fs.existsSync(localPath)) {
      console.warn(`  [warn] missing on disk: ${entry.logo}`);
      continue;
    }
    toUpload.push({ relPath: entry.logo, localPath, size: fs.statSync(localPath).size });
  }

  const totalBytes = toUpload.reduce((sum, f) => sum + f.size, 0);
  console.log(`${toUpload.length} files to upload, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total.\n`);

  if (!EXECUTE) {
    console.log('Sample of files that would be uploaded:');
    console.log(toUpload.slice(0, 10).map((f) => `  exam-logos/${f.relPath} (${(f.size / 1024).toFixed(0)} KB)`).join('\n'));
    console.log('\nDry run — no uploads. Re-run with --execute to upload.');
    return;
  }

  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME;
  let uploaded = 0;
  for (const f of toUpload) {
    const key = `exam-logos/${f.relPath}`;
    const body = fs.readFileSync(f.localPath);
    try {
      await uploadToR2(s3, bucket, key, body, contentTypeFor(f.localPath));
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  ${uploaded}/${toUpload.length} uploaded...`);
    } catch (err) {
      console.error(`  [error] ${key}: ${err.message}`);
    }
  }
  console.log(`\nDone. ${uploaded}/${toUpload.length} uploaded to ${process.env.R2_PUBLIC_URL}/exam-logos/`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
