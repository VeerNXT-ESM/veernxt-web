#!/usr/bin/env node
/**
 * scripts/upload_book_preview.mjs
 *
 * Uploads a locally parsed book (output of reparse_book_direct.mjs) to R2 under a
 * PREVIEW prefix so the content team can review it in /dev-reader. Touches nothing else:
 * no Supabase writes, no existing keys (aborts if the prefix already holds objects,
 * unless --overwrite is passed).
 *
 * Image `src` values ("images/image_001.png") are rewritten to absolute R2 public URLs
 * on the fly (also inside table-cell <img>). Local files are not modified.
 *
 * Usage:
 *   node scripts/upload_book_preview.mjs --dir FINAL_BOOKS_STRUCTURED/Guide/guide-gkgs-2026 --name gkgs-2026            (dry run)
 *   node scripts/upload_book_preview.mjs --dir ... --name gkgs-2026 --execute [--overwrite]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const DIR = arg('--dir');
const NAME = arg('--name');
const EXECUTE = process.argv.includes('--execute');
const OVERWRITE = process.argv.includes('--overwrite');
if (!DIR || !NAME) { console.error('Usage: --dir <parsed book dir> --name <preview slug> [--execute] [--overwrite]'); process.exit(1); }

const PREFIX = `structured_resources/blocks/Preview/${NAME}`;
const PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const Bucket = process.env.R2_BUCKET_NAME;
if (!PUBLIC || !Bucket) { console.error('R2_PUBLIC_URL / R2_BUCKET_NAME missing in .env'); process.exit(1); }
const BASE = `${PUBLIC}/${PREFIX}`;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.json': 'application/json' };

const rewrite = (block) => {
  const b = JSON.parse(JSON.stringify(block));
  if (b.type === 'image' && b.src && !/^https?:/.test(b.src)) b.src = `${BASE}/${b.src}`;
  if (b.type === 'table') for (const r of b.rows) r.cells = r.cells.map((c) => c.replace(/(<img[^>]*\ssrc=")(images\/[^"]+)"/g, `$1${BASE}/$2"`));
  return b;
};

// existing objects under the prefix?
const existing = [];
let tok;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: PREFIX + '/', ContinuationToken: tok }));
  existing.push(...(r.Contents || []));
  tok = r.NextContinuationToken;
} while (tok);
if (existing.length && !OVERWRITE) {
  console.error(`Prefix ${PREFIX}/ already holds ${existing.length} object(s). Re-run with --overwrite to replace them.`);
  process.exit(1);
}

const jobs = [];
const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'metadata.json'), 'utf8'));
jobs.push({ key: `${PREFIX}/metadata.json`, body: Buffer.from(JSON.stringify({ ...meta, storage_base_url: BASE + '/', preview: true })), type: TYPES['.json'] });
for (const f of fs.readdirSync(path.join(DIR, 'chapters'))) {
  const ch = JSON.parse(fs.readFileSync(path.join(DIR, 'chapters', f), 'utf8'));
  ch.blocks = ch.blocks.map(rewrite);
  jobs.push({ key: `${PREFIX}/chapters/${f}`, body: Buffer.from(JSON.stringify(ch)), type: TYPES['.json'] });
}
for (const f of fs.readdirSync(path.join(DIR, 'images'))) {
  jobs.push({ key: `${PREFIX}/images/${f}`, body: fs.readFileSync(path.join(DIR, 'images', f)), type: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
}
const bytes = jobs.reduce((a, j) => a + j.body.length, 0);
console.log(`${EXECUTE ? 'EXECUTE' : 'DRY RUN'}: ${jobs.length} objects, ${(bytes / 1048576).toFixed(1)} MB -> ${BASE}/`);
if (!EXECUTE) process.exit(0);

let done = 0;
const queue = jobs.slice();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const j = queue.shift();
    await s3.send(new PutObjectCommand({ Bucket, Key: j.key, Body: j.body, ContentType: j.type, CacheControl: 'public, max-age=300' }));
    if (++done % 50 === 0) console.log(`  ${done}/${jobs.length}`);
  }
}));
console.log(`Uploaded ${done} objects.\nBase URL: ${BASE}/`);
