#!/usr/bin/env node
/**
 * scripts/rebuild_review_index.mjs
 *
 * Rebuilds the review list that /dev-reader shows (R2: structured_resources/blocks/_review/index.json) from the
 * run records of bulk_reparse_books.mjs (docs/bulk_reparse_runs/results_*.json). Use it if the index was damaged,
 * or after a --rollback. It only WRITES that one small JSON file.
 *
 * Usage: node scripts/rebuild_review_index.mjs [--dir docs/bulk_reparse_runs] [--execute]   (dry run prints the count)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
const { getS3Client } = await import('./lib/ingest-drive-content.js');
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const DIR = arg('--dir') || path.join(__dirname, '..', 'docs', 'bulk_reparse_runs');
const PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const books = new Map();
for (const f of fs.readdirSync(DIR).filter((x) => /^results_.*\.json$/.test(x)).sort()) {
  const run = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const b of run.books) {
    if (!b.created) continue;
    books.set(b.created.resourceId, { title: b.newTitle, category: b.category, resourceId: b.created.resourceId, base: `${PUBLIC}/${b.created.prefix}`, chapters: b.stats.chapters, subjects: b.stats.subjects, flags: b.flags || [], createdAt: run.finishedAt });
  }
}
console.log(`${books.size} books from the run records`);
if (!process.argv.includes('--execute')) { console.log('dry run: nothing written (add --execute)'); process.exit(0); }
await getS3Client().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: 'structured_resources/blocks/_review/index.json', Body: Buffer.from(JSON.stringify({ books: [...books.values()] }, null, 1)), ContentType: 'application/json', CacheControl: 'public, max-age=60' }));
console.log('review index rewritten');
