#!/usr/bin/env node
/**
 * scripts/merge_missing_chapters_into_live_books.mjs
 *
 * Restores chapters that the OLD docxParser cleanup silently deleted (any
 * chapter whose title contained "introduction" -- fixed in 899022b) from five
 * live Guide/Precis books, WITHOUT re-converting them.
 *
 * Why merge instead of re-convert: the live chapters are not plain parser
 * output. They carry AI enrichment blocks (statStrip / keyFacts / pullQuote /
 * comparisonTable / examAlert), injected image blocks, and -- in some copies --
 * the word "SSC" deleted from the text. Re-converting from the source .docx
 * would throw all of that away. So every existing live chapter is kept as is,
 * and only the missing chapters are added, at their correct position.
 *
 * The student reader loads chapters BY POSITION (SecureReader.jsx:
 * `chapters/chapter-${index + 1}.json`), so an insert renumbers every later
 * chapter file. Chapters that shift are re-uploaded under their new number
 * (with their `order` field updated); chapters before the first insert are not
 * touched. metadata.json is written last.
 *
 * Inserted chapters are plain parser output (no AI enrichment, which is not a priority)
 * but KEEP their images (uploaded next to the book), and get the same SSC/RRB word deletion as
 * their book when that copy was branded-stripped (auto-detected per book).
 *
 * Safety:
 *   - dry run by default; --execute is required to write anything
 *   - --execute first saves every live metadata.json + chapter file it will
 *     touch to <BACKUP_ROOT>/<timestamp>/<slug>/ (default K:\tmp\book_merge_backups)
 *   - only ACTIVE (non-Draft, non-Archived) live copies are touched; archived ones are skipped
 *   - a book is skipped (not partially written) if its live chapters can't be
 *     aligned to the source in order with nothing left over
 *   - all credentials come from .env
 *
 * Usage:
 *   node scripts/merge_missing_chapters_into_live_books.mjs                 (dry run, all five)
 *   node scripts/merge_missing_chapters_into_live_books.mjs --only iti      (one book, by key)
 *   node scripts/merge_missing_chapters_into_live_books.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { parseDocxToSemanticModelNode } from './lib/docxParser.mjs';

const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const ONLY = (() => { const i = ARGS.indexOf('--only'); return i >= 0 ? ARGS[i + 1] : null; })();

const SRC_ROOT = String.raw`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT\Final Documents\MASTER DOCUMENTS`;
const BACKUP_ROOT = process.env.BOOK_MERGE_BACKUP_ROOT || String.raw`K:\tmp\book_merge_backups`;

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// key -> which live copy to fix and which source docx it came from. The live
// copy is the storage_base_url with the most resource rows among rows whose
// title AND source_file match (titles alone are not safe: 999 live rows are
// titled "Descriptive Writing Bank Exams" but hold the REASONING book).
const BOOKS = [
  { key: 'general-knowledge', category: 'Guide', title: 'GENERAL KNOWLEDGE', srcLike: '%GENERAL KNOWLEDGE%', srcFile: 'Cluster_062_GENERAL KNOWLEDGE.docx' },
  { key: 'gk-gs', category: 'Precis', title: 'GK-GS', srcLike: '%SSC COMPLETE GK%', srcFile: 'Cluster_001_SSC COMPLETE GK.docx' },
  { key: 'iti', category: 'Guide', title: 'ITI Technical Trade Literacy', srcLike: '%ITI_Technical_Trade_Literacy%', srcFile: 'Cluster_058_ITI_Technical_Trade_Literacy_GUIDE BOOK.docx' },
  { key: 'descriptive-writing', category: 'Guide', title: 'Descriptive Writing Bank Exams', srcLike: '%Descriptive_Writing_Bank_Exams%', srcFile: 'Cluster_080_Descriptive_Writing_Bank_Exams.docx' },
  { key: 'rrb-complete-gk', category: 'Precis', title: 'RRB COMPLETE GK', srcLike: '%RRB COMPLETE GK%', srcFile: 'Cluster_079_RRB COMPLETE GK.docx' },
];

// Blocks the plain parser produces; anything else in a live chapter is enrichment.
const ORIGINAL_TYPES = new Set(['heading', 'paragraph', 'table', 'list', 'numberedList', 'callout']);
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
const IMG_CT = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
const MATCH_WINDOW = 2; // a source chapter may only match a live chapter this close to the current position

const norm = (s) => String(s).toLowerCase().replace(/\b(ssc|rrb)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const brandCount = (s) => (String(s).match(/\b(SSC|RRB)\b/g) || []).length;

function stringsOf(o, out = []) {
  if (o == null) return out;
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => stringsOf(x, out));
  else if (typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k !== 'id' && k !== 'type' && k !== 'level') stringsOf(v, out);
  return out;
}
const textOf = (blocks) => stringsOf(blocks).join(' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

// Same edit the branded-stripped live copies show: the token is deleted, nothing else changes.
function deleteBrandWords(value) {
  if (typeof value === 'string') return value.replace(/\b(SSC|RRB)\b\s?/g, '').replace(/[ \t]{2,}/g, ' ');
  if (Array.isArray(value)) return value.map(deleteBrandWords);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = (k === 'id' || k === 'type' || k === 'level') ? v : deleteBrandWords(v);
    return out;
  }
  return value;
}

async function fetchJson(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

function findSourceFile(name) {
  const stack = [SRC_ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === name) return full;
    }
  }
  return null;
}

// Same rule BooksPage/save-resource use: a book is archived when its rows are
// Draft or Archived. A copy (storage_base_url) counts as active when at least one
// of its rows is neither -- this script only ever touches active copies.
const isArchivedStatus = (st) => ['draft', 'archived'].includes(String(st || '').toLowerCase());

async function pickLiveCopy(b) {
  const { data, error } = await supabase
    .from('resources')
    .select('resource_id,status,storage_base_url,chapter_count')
    .eq('format', 'blocks').eq('category', b.category).eq('title', b.title).ilike('source_file', b.srcLike);
  if (error) throw new Error(error.message);
  const groups = new Map();
  for (const r of data || []) {
    const g = groups.get(r.storage_base_url) || { rows: 0, active: 0, statuses: {} };
    g.rows++;
    if (!isArchivedStatus(r.status)) g.active++;
    g.statuses[r.status || 'null'] = (g.statuses[r.status || 'null'] || 0) + 1;
    groups.set(r.storage_base_url, g);
  }
  const all = [...groups.entries()].map(([url, g]) => ({ url, ...g })).sort((a, c) => c.rows - a.rows);
  if (!all.length) return null;
  const active = all.filter((g) => g.active > 0);
  if (!active.length) return { archivedOnly: true, all };
  return { url: active[0].url, rows: active[0].rows, active: active[0].active, statuses: active[0].statuses, otherCopies: all.filter((g) => g.url !== active[0].url) };
}

function r2Prefix(url) {
  const base = `${R2_PUBLIC_URL}/`;
  if (!url.startsWith(base)) throw new Error(`storage_base_url ${url} is not under R2_PUBLIC_URL`);
  return url.slice(base.length).replace(/\/+$/, '');
}

async function planBook(b) {
  const live = await pickLiveCopy(b);
  if (!live) return { b, skip: 'no live copy found' };
  if (live.archivedOnly) return { b, skip: `ARCHIVED -- every matching copy is Draft/Archived (${live.all.map((g) => `${g.rows} row(s) ${JSON.stringify(g.statuses)}`).join('; ')}); not touched` };
  const srcPath = findSourceFile(b.srcFile);
  if (!srcPath) return { b, skip: `source docx not found: ${b.srcFile}` };

  const meta = await fetchJson(`${live.url}metadata.json`);
  const liveChapters = await pool(meta.chapters || [], 16, async (c) => ({ meta: c, json: await fetchJson(`${live.url}${c.file_name}`) }));
  // Keep the pictures in inserted chapters: every embedded image is stored next to the book
  // (<prefix>/images/image_<hash>.<ext>, the layout the live books already use). Only the images
  // referenced by chapters we actually insert get uploaded.
  const prefix = r2Prefix(live.url);
  const images = new Map();
  const onImage = (buffer, contentType) => {
    const id = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 10);
    const ext = IMG_EXT[contentType] || 'png';
    images.set(id, { buffer, ext });
    return `${R2_PUBLIC_URL}/${prefix}/images/image_${id}.${ext}`;
  };
  const parsed = (await parseDocxToSemanticModelNode(fs.readFileSync(srcPath), b.srcFile, { onImage })).book.chapters;

  // Ordered alignment of source chapters onto live chapters.
  const entries = []; // { kind: 'live', idx } | { kind: 'new', chapter }
  let ptr = 0;
  const matched = [];
  for (const p of parsed) {
    let hit = -1;
    for (let j = ptr; j < Math.min(liveChapters.length, ptr + MATCH_WINDOW + 1); j++) {
      if (norm(liveChapters[j].meta.title) === norm(p.title)) { hit = j; break; }
    }
    if (hit < 0) { entries.push({ kind: 'new', chapter: p }); continue; }
    for (let j = ptr; j < hit; j++) entries.push({ kind: 'live', idx: j }); // live-only chapters in between are kept, in place
    entries.push({ kind: 'live', idx: hit });
    matched.push({ p, hit });
    ptr = hit + 1;
  }
  for (let j = ptr; j < liveChapters.length; j++) entries.push({ kind: 'live', idx: j });

  const liveKept = entries.filter((e) => e.kind === 'live').length;
  if (liveKept !== liveChapters.length) return { b, live, skip: `alignment kept ${liveKept} of ${liveChapters.length} live chapters` };
  const liveOnly = liveChapters.length - matched.length;

  // Was SSC/RRB deleted in this live copy? Compare brand words in matched original blocks.
  const srcBrand = matched.reduce((n, m) => n + brandCount(textOf(m.p.blocks)), 0);
  const liveBrand = matched.reduce((n, m) => n + brandCount(textOf(liveChapters[m.hit].json.blocks.filter((x) => ORIGINAL_TYPES.has(x.type)))), 0);
  const stripBrand = srcBrand > 0 && liveBrand / srcBrand < 0.1;

  const layout = entries.map((e, i) => {
    const order = i + 1;
    if (e.kind === 'live') {
      const lc = liveChapters[e.idx];
      return { order, kind: 'live', oldOrder: e.idx + 1, meta: lc.meta, json: lc.json, needsWrite: e.idx + 1 !== order };
    }
    const c = e.chapter;
    const blocks = stripBrand ? deleteBrandWords(c.blocks) : c.blocks;
    const title = stripBrand ? deleteBrandWords(c.title).trim() : c.title;
    return { order, kind: 'new', title, json: { id: c.id, title, order, blocks, enriched: false }, needsWrite: true };
  });

  const imagesToUpload = new Map();
  for (const l of layout.filter((x) => x.kind === 'new')) {
    for (const blk of l.json.blocks) {
      if (blk.type !== 'image') continue;
      const m = String(blk.src).match(/image_([0-9a-f]+)\.(\w+)$/);
      if (m && images.has(m[1])) { imagesToUpload.set(m[1], images.get(m[1])); blk.imageId = m[1]; }
    }
  }

  return { b, live, meta, liveChapters, layout, imagesToUpload, newOnes: layout.filter((l) => l.kind === 'new'), rewrites: layout.filter((l) => l.kind === 'live' && l.needsWrite).length, liveOnly, stripBrand, srcBrand, liveBrand, sourceChapters: parsed.length, prefix };
}

function describe(plan) {
  const { b, live } = plan;
  console.log(`\n=== [${b.key}] ${b.category} "${b.title}" ===`);
  if (plan.skip) { console.log(`  SKIPPED: ${plan.skip}`); return; }
  console.log(`  live copy : ...${live.url.slice(-45)}  (${live.rows} resource row(s), status ${JSON.stringify(live.statuses)}${live.otherCopies.length ? `; ${live.otherCopies.length} other copy/copies of this title+source NOT touched` : ''})`);
  console.log(`  chapters  : live ${plan.liveChapters.length}  ->  ${plan.layout.length} after merge   (source has ${plan.sourceChapters})`);
  for (const n of plan.newOnes) {
    const words = textOf(n.json.blocks).split(/\s+/).filter(Boolean).length;
    const imgs = n.json.blocks.filter((x) => x.type === 'image').length;
    console.log(`    + insert as chapter ${String(n.order).padStart(3)}: "${n.title.slice(0, 60)}"  (${n.json.blocks.length} blocks, ~${words} words, ${imgs} image(s))`);
  }
  console.log(`  db        : chapter_count updated on the ${live.active} active row(s) only; ${live.rows - live.active} Draft/Archived row(s) sharing the same files are left as they are`);
  console.log(`  files     : ${plan.newOnes.length} new + ${plan.rewrites} existing renumbered + ${plan.imagesToUpload.size} image file(s) + metadata.json;  ${plan.liveChapters.length - plan.rewrites} live chapter files untouched`);
  console.log(`  branding  : source has ${plan.srcBrand} SSC/RRB word(s) in matched chapters, live copy has ${plan.liveBrand}  ->  ${plan.stripBrand ? 'SSC/RRB will be DELETED from inserted chapters (matches this copy)' : 'inserted chapters kept as in source'}`);
  if (plan.liveOnly) console.log(`  note      : ${plan.liveOnly} live chapter(s) have no source match and are kept in place`);
  console.log('  images    : inserted chapters keep their pictures; existing chapters keep theirs untouched');
}

async function execute(plan, stamp) {
  const { b, live, layout, meta, liveChapters, prefix } = plan;
  // 1) backup everything that exists live
  const dir = path.join(BACKUP_ROOT, stamp, b.key);
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
  for (const c of liveChapters) fs.writeFileSync(path.join(dir, c.meta.file_name), JSON.stringify(c.json, null, 2));
  fs.writeFileSync(path.join(dir, 'BACKUP_INFO.json'), JSON.stringify({ storageBaseUrl: live.url, r2Prefix: prefix, liveRows: live.rows, chapterCount: liveChapters.length }, null, 2));
  console.log(`  [backup] ${liveChapters.length} chapter files + metadata.json -> ${dir}`);

  const s3 = getS3Client();
  // 2a) images used by the inserted chapters (before any chapter references them)
  for (const [id, img] of plan.imagesToUpload) await uploadToR2(s3, bucket, `${prefix}/images/image_${id}.${img.ext}`, img.buffer, IMG_CT[img.ext] || 'application/octet-stream');
  if (plan.imagesToUpload.size) console.log(`  [R2] uploaded ${plan.imagesToUpload.size} image file(s)`);
  // 2b) chapter files (new + renumbered); untouched ones are not re-uploaded
  const toWrite = layout.filter((l) => l.needsWrite);
  await pool(toWrite, 8, async (l) => {
    const body = l.kind === 'live' ? { ...l.json, order: l.order } : l.json;
    await uploadToR2(s3, bucket, `${prefix}/chapters/chapter-${l.order}.json`, Buffer.from(JSON.stringify(body, null, 2)), 'application/json');
  });
  // 3) metadata last, so readers only see the new list once every file it names exists
  const newMeta = {
    ...meta,
    chapter_count: layout.length,
    chapters: layout.map((l) => (l.kind === 'live'
      ? { ...l.meta, order: l.order, file_name: `chapters/chapter-${l.order}.json` }
      : { title: l.title, order: l.order, enriched: false, blocks_count: l.json.blocks.length, file_name: `chapters/chapter-${l.order}.json` })),
  };
  await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(newMeta, null, 2)), 'application/json');
  console.log(`  [R2] wrote ${toWrite.length} chapter file(s) + metadata.json`);

  // chapter_count only on the ACTIVE rows; Draft/Archived rows sharing these files keep their old count.
  const { data: sharing, error: selErr } = await supabase.from('resources').select('resource_id,status').eq('storage_base_url', live.url);
  if (selErr) throw new Error(`Supabase select failed: ${selErr.message}`);
  const activeIds = (sharing || []).filter((r) => !isArchivedStatus(r.status)).map((r) => r.resource_id);
  for (let i = 0; i < activeIds.length; i += 100) {
    const { error } = await supabase.from('resources').update({ chapter_count: layout.length }).in('resource_id', activeIds.slice(i, i + 100));
    if (error) throw new Error(`Supabase chapter_count update failed: ${error.message}`);
  }
  console.log(`  [DB] chapter_count=${layout.length} on ${activeIds.length} active row(s); ${(sharing || []).length - activeIds.length} Draft/Archived row(s) sharing these files left unchanged`);

  // 4) read it back
  const back = await fetchJson(`${live.url}metadata.json`);
  const ok = back.chapters.length === layout.length && back.chapters.every((c, i) => c.file_name === `chapters/chapter-${i + 1}.json`);
  console.log(`  [verify] live metadata now lists ${back.chapters.length} chapters, file names sequential: ${ok ? 'yes' : 'NO -- check!'}`);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing R2 + Supabase)' : 'DRY RUN (nothing is written)'}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const list = BOOKS.filter((b) => !ONLY || b.key === ONLY);
  if (!list.length) throw new Error(`--only ${ONLY} matches no book. Keys: ${BOOKS.map((b) => b.key).join(', ')}`);
  for (const b of list) {
    const plan = await planBook(b);
    describe(plan);
    if (EXECUTE && !plan.skip) await execute(plan, stamp);
  }
  if (!EXECUTE) console.log('\nDry run only -- re-run with --execute to write.');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
