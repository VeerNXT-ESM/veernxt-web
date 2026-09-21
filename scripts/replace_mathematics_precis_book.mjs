#!/usr/bin/env node
/**
 * scripts/replace_mathematics_precis_book.mjs
 *
 * Replaces the live "MATHEMATICS FINAL PRECIS" (9 chapters -- the source docx it
 * came from only had 9 of the 20 promised chapters written) with the content
 * team's complete 20-chapter document, Mathematics_Precis_FULL_fixed.docx.
 *
 * That docx is Mathematics_Precis_FULL.docx with its heading styles corrected
 * for the converter: each chapter title is Heading 1 and the N.1/N.2 sections
 * are Heading 2 (the original used Heading 1 for the sections, which split the
 * book into 75 chapters and, via the old "introduction" filter, dropped 15).
 *
 * Unlike a plain docxParser run this keeps the book's pictures: the parser's
 * opt-in `onImage` hook turns each embedded image into an `image` block, and
 * this script uploads the image files next to the book in R2
 * (<prefix>/images/image_<id>.<ext>), the same layout the live book already uses.
 *
 * What is NOT carried over: the 4 AI-enrichment blocks the old 9-chapter version
 * had (stat strip / key facts / pull quote / exam alert). The new chapters are
 * plain parser output. The 11 old image files stay in R2, unreferenced.
 *
 * Only ACTIVE rows (not Draft/Archived) get their chapter_count updated. The
 * Draft rows sharing this storage_base_url keep 9 -- the R2 files themselves are
 * shared by every row, so they cannot be excluded from the content change.
 *
 * Safety: dry run by default; --execute first backs up the live metadata.json and
 * all chapter files to <BACKUP_ROOT>/<timestamp>/mathematics-precis/, uploads
 * images and chapter files first and metadata.json last, then reads it back.
 * Credentials come from .env.
 *
 * Usage:
 *   node scripts/replace_mathematics_precis_book.mjs              (dry run)
 *   node scripts/replace_mathematics_precis_book.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseDocxToSemanticModelNode } from './lib/docxParser.mjs';

const EXECUTE = process.argv.includes('--execute');
const SRC_DOCX = process.env.MATH_DOCX || String.raw`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\Mathematics_Precis_FULL_fixed.docx`;
const BACKUP_ROOT = process.env.BOOK_MERGE_BACKUP_ROOT || String.raw`K:\tmp\book_merge_backups`;

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const bucket = process.env.R2_BUCKET_NAME;
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LIVE_URL = `${R2_PUBLIC_URL}/structured_resources/blocks/Precis/0568526f-4c9d-44c9-a4c9-0568526f4c9d/`;
const PREFIX = 'structured_resources/blocks/Precis/0568526f-4c9d-44c9-a4c9-0568526f4c9d';

const isArchivedStatus = (st) => ['draft', 'archived'].includes(String(st || '').toLowerCase());
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

async function fetchJson(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing R2 + Supabase)' : 'DRY RUN (nothing is written)'}`);
  if (!fs.existsSync(SRC_DOCX)) throw new Error(`Source docx not found: ${SRC_DOCX}`);

  // ---- parse, collecting images (content-hash ids so identical images are stored once)
  const images = new Map(); // id -> { buffer, ext }
  const onImage = (buffer, contentType) => {
    const id = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 10);
    const ext = EXT[contentType] || 'png';
    images.set(id, { buffer, ext });
    return `${R2_PUBLIC_URL}/${PREFIX}/images/image_${id}.${ext}`;
  };
  const { book } = await parseDocxToSemanticModelNode(fs.readFileSync(SRC_DOCX), path.basename(SRC_DOCX), { onImage });
  const chapters = book.chapters.map((c, i) => ({ ...c, order: i + 1 }));

  // images actually used by kept chapters (the cover image sits in the dropped front-matter chapter)
  const used = new Map();
  let imageBlocks = 0;
  for (const c of chapters) {
    for (const b of c.blocks) {
      if (b.type !== 'image') continue;
      imageBlocks++;
      const m = b.src.match(/image_([0-9a-f]+)\.(\w+)$/);
      if (m && images.has(m[1])) used.set(m[1], images.get(m[1]));
      b.imageId = m ? m[1] : b.imageId;
    }
  }

  // ---- live state
  const meta = await fetchJson(`${LIVE_URL}metadata.json`);
  const { data: rows, error } = await supabase.from('resources').select('resource_id,status').eq('storage_base_url', LIVE_URL);
  if (error) throw new Error(error.message);
  const activeIds = (rows || []).filter((r) => !isArchivedStatus(r.status)).map((r) => r.resource_id);

  console.log(`\nSource     : ${SRC_DOCX}`);
  console.log(`Live book  : "${meta.title}"  ${meta.chapters.length} chapters, ${meta.image_count} images  (${rows.length} resource rows share it: ${activeIds.length} active, ${rows.length - activeIds.length} Draft/Archived)`);
  console.log(`New book   : ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.blocks.length, 0)} blocks, ${imageBlocks} image blocks (${used.size} distinct image files to upload)`);
  chapters.forEach((c) => console.log(`   ${String(c.order).padStart(2)}. ${c.title.padEnd(46)} ${String(c.blocks.length).padStart(3)} blocks  ${String(c.blocks.filter((b) => b.type === 'image').length).padStart(1)} img`));
  console.log(`chapter_count: ${meta.chapters.length} -> ${chapters.length} on the ${activeIds.length} active row(s) only`);
  if (chapters.length !== 20) console.log(`WARNING: expected 20 chapters, got ${chapters.length}`);

  if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute to write.'); return; }
  if (chapters.length !== 20) throw new Error('Refusing to write: not 20 chapters.');

  // ---- backup
  const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'), 'mathematics-precis');
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
  for (const c of meta.chapters) fs.writeFileSync(path.join(dir, c.file_name), JSON.stringify(await fetchJson(`${LIVE_URL}${c.file_name}`), null, 2));
  fs.writeFileSync(path.join(dir, 'BACKUP_INFO.json'), JSON.stringify({ storageBaseUrl: LIVE_URL, prefix: PREFIX, note: 'restore = re-upload these files; the old images were never deleted' }, null, 2));
  console.log(`\n[backup] live metadata.json + ${meta.chapters.length} chapter files -> ${dir}`);

  // ---- write: images, chapters, then metadata last
  const s3 = getS3Client();
  const CT = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  for (const [id, img] of used) await uploadToR2(s3, bucket, `${PREFIX}/images/image_${id}.${img.ext}`, img.buffer, CT[img.ext] || 'application/octet-stream');
  console.log(`[R2] uploaded ${used.size} image file(s)`);
  for (const c of chapters) {
    await uploadToR2(s3, bucket, `${PREFIX}/chapters/chapter-${c.order}.json`, Buffer.from(JSON.stringify({ id: c.id, title: c.title, order: c.order, blocks: c.blocks, enriched: false }, null, 2)), 'application/json');
  }
  console.log(`[R2] uploaded ${chapters.length} chapter file(s)`);
  const newMeta = {
    ...meta,
    chapter_count: chapters.length,
    image_count: used.size,
    chapters: chapters.map((c) => ({ title: c.title, order: c.order, enriched: false, blocks_count: c.blocks.length, file_name: `chapters/chapter-${c.order}.json` })),
  };
  await uploadToR2(s3, bucket, `${PREFIX}/metadata.json`, Buffer.from(JSON.stringify(newMeta, null, 2)), 'application/json');
  console.log('[R2] uploaded metadata.json (last)');

  for (let i = 0; i < activeIds.length; i += 100) {
    const { error: upErr } = await supabase.from('resources').update({ chapter_count: chapters.length }).in('resource_id', activeIds.slice(i, i + 100));
    if (upErr) throw new Error(`Supabase chapter_count update failed: ${upErr.message}`);
  }
  console.log(`[DB] chapter_count=${chapters.length} on ${activeIds.length} active row(s)`);

  // ---- read back
  const back = await fetchJson(`${LIVE_URL}metadata.json`);
  const seq = back.chapters.every((c, i) => c.file_name === `chapters/chapter-${i + 1}.json`);
  const sample = [...used.entries()].slice(0, 3);
  const imgOk = [];
  for (const [id, img] of sample) { const r = await fetch(`${R2_PUBLIC_URL}/${PREFIX}/images/image_${id}.${img.ext}`); imgOk.push(`${r.status} ${r.headers.get('content-type')}`); }
  console.log(`[verify] live metadata: ${back.chapters.length} chapters, sequential file names: ${seq ? 'yes' : 'NO'} | sample image fetch: ${imgOk.join(', ')}`);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
