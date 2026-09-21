// Replaces every copy of each duplicated PNG in R2 with a WebP of the same
// image, in place (same key, Content-Type image/webp -- browsers decode by
// content type, not extension). Companion to r2_shrink_brand_cover.mjs, but
// for the whole set of duplicated images instead of one.
//
// Input: a manifest produced by the conversion step -- one entry per distinct
// image (grouped by R2 ETag): { id, etag, size, mode, webp, ... }, with the
// original at <dir>/originals/<id>.png and the replacement at <dir>/webp/<id>.webp
// (entries with mode 'skip' are ignored).
//
// Safety: only objects whose current ETag still equals the group's original
// are overwritten; the originals stay in <dir>/originals as the rollback
// source, and the exact key list is saved under K:/tmp/db_backups first.
//
// Usage: node scripts/r2_shrink_duplicate_images.mjs <dir> [--execute]
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const [dir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const execute = process.argv.includes('--execute');
if (!dir) { console.error('Usage: node scripts/r2_shrink_duplicate_images.mjs <dir> [--execute]'); process.exit(1); }

const Bucket = process.env.R2_BUCKET_NAME;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest2.json'), 'utf8')).filter((m) => m.mode !== 'skip');
const byEtag = new Map(manifest.map((m) => [m.etag, m]));
console.log(`${manifest.length} images to replace. Mode: ${execute ? 'EXECUTE' : 'dry run'}`);

const targets = [];
let tok;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: tok, MaxKeys: 1000 }));
  for (const o of r.Contents || []) {
    const m = byEtag.get(o.ETag);
    if (m && o.Key.toLowerCase().endsWith('.png')) targets.push({ key: o.Key, size: o.Size, id: m.id, webp: m.webp });
  }
  tok = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (tok);

const before = targets.reduce((a, t) => a + t.size, 0);
const after = targets.reduce((a, t) => a + t.webp, 0);
console.log(`${targets.length} objects, ${(before / 1e9).toFixed(2)} GB -> ${(after / 1e9).toFixed(2)} GB (saves ${((before - after) / 1e9).toFixed(2)} GB)`);
if (!execute) { console.log('Dry run only. Re-run with --execute.'); process.exit(0); }

const bdir = path.join('K:/tmp/db_backups', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(bdir, { recursive: true });
fs.writeFileSync(path.join(bdir, 'duplicate_images_shrink_keys.json'), JSON.stringify(targets));
console.log('Key list backed up to', bdir, `(originals: ${dir}/originals)`);

const bodies = new Map();
const bodyFor = (id) => { if (!bodies.has(id)) { const b = fs.readFileSync(path.join(dir, 'webp', `${id}.webp`)); bodies.set(id, { b, md5: `"${crypto.createHash('md5').update(b).digest('hex')}"` }); } return bodies.get(id); };

let done = 0, failed = 0;
const q = [...targets];
await Promise.all(Array.from({ length: 32 }, async () => {
  while (q.length) {
    const t = q.pop();
    try {
      const { b, md5 } = bodyFor(t.id);
      const r = await s3.send(new PutObjectCommand({ Bucket, Key: t.key, Body: b, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' }));
      if (r.ETag && r.ETag !== md5) throw new Error(`etag mismatch ${r.ETag}`);
      done++;
    } catch (e) { failed++; console.error('FAILED', t.key, e.message); }
    if ((done + failed) % 2000 === 0) console.log(`${done + failed}/${targets.length}`);
  }
}));
console.log(`Done: ${done} replaced, ${failed} failed.`);
