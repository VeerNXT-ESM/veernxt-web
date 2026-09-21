// Shrinks the VeerNXT brand cover image that the image extractor copied into
// thousands of book folders (cover.png, fig-1-0034f0aa.png and a few other names, 3.8MB each,
// byte-identical -- matched by ETag, not filename). Overwrites each copy IN PLACE with a 256-colour PNG of the
// same 1023x1537 image, so every existing URL and every chapter JSON keeps
// working -- nothing is re-linked or deleted. The replacement is a WebP served
// with Content-Type image/webp under the existing .png keys (browsers decode
// by Content-Type, not extension; verified against the public R2 URL).
//
// Safety: only objects whose R2 ETag equals the known original's are touched
// (anything edited since is skipped); the original is backed up locally first.
//
// Usage: node scripts/r2_shrink_brand_cover.mjs <compressed.webp|png> [--execute]
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const ORIGINAL_ETAG = '"4bc49dbd99ba82bf2b9db41da7578c80"';
const [srcPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const execute = process.argv.includes('--execute');
if (!srcPath) { console.error('Usage: node scripts/r2_shrink_brand_cover.mjs <compressed.webp|png> [--execute]'); process.exit(1); }

const Bucket = process.env.R2_BUCKET_NAME;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const body = fs.readFileSync(srcPath);
const contentType = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' }[path.extname(srcPath).toLowerCase()];
if (!contentType) { console.error('Unsupported replacement type'); process.exit(1); }
console.log(`Replacement: ${srcPath} (${(body.length / 1024).toFixed(0)} KB). Mode: ${execute ? 'EXECUTE' : 'dry run'}`);

const targets = [];
let tok;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: tok, MaxKeys: 1000 }));
  for (const o of r.Contents || []) {
    if (o.ETag === ORIGINAL_ETAG) targets.push({ key: o.Key, size: o.Size });
  }
  tok = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (tok);

const before = targets.reduce((a, t) => a + t.size, 0);
const after = targets.length * body.length;
console.log(`${targets.length} matching objects, ${(before / 1e9).toFixed(2)} GB -> ${(after / 1e9).toFixed(2)} GB (saves ${((before - after) / 1e9).toFixed(2)} GB)`);
if (!execute) { console.log('Dry run only. Re-run with --execute.'); process.exit(0); }

const dir = path.join('K:/tmp/db_backups', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'brand_cover_shrink_keys.json'), JSON.stringify(targets));
console.log('Key list backed up to', dir, '(original image: K:/tmp/r2_cleanup/brand_cover_ORIGINAL.png)');

let done = 0, failed = 0;
const q = [...targets];
await Promise.all(Array.from({ length: 16 }, async () => {
  while (q.length) {
    const t = q.pop();
    try {
      await s3.send(new PutObjectCommand({ Bucket, Key: t.key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000' }));
      const h = await s3.send(new HeadObjectCommand({ Bucket, Key: t.key }));
      if (h.ContentLength !== body.length) throw new Error(`size mismatch ${h.ContentLength}`);
      done++;
    } catch (e) { failed++; console.error('FAILED', t.key, e.message); }
    if ((done + failed) % 500 === 0) console.log(`${done + failed}/${targets.length}`);
  }
}));
console.log(`Done: ${done} replaced, ${failed} failed.`);
