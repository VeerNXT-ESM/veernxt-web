#!/usr/bin/env node
/**
 * scripts/bulk_reparse_books.mjs
 *
 * Reparses the linked Guide/Precis books from their DOCX with the WYSIWYG parser and (with --execute)
 * creates NEW "<title> 2026 NEW" entries. It NEVER overwrites anything:
 *   - DB: INSERT only, one Draft `resources` row per book, no exam links. Existing rows are never updated/deleted
 *         (the only deletes are --rollback of rows this script itself created).
 *   - R2: writes only under a brand-new prefix  structured_resources/blocks/<Category>/<new resource_id>/
 *         (aborts if that prefix is not empty) and the review index  structured_resources/blocks/_review/index.json
 *   - A book that fails verification (scripts/lib/verifyBook.mjs) is skipped, nothing uploaded for it.
 *
 * Default is a DRY RUN: parse + verify + local output + report. No network writes.
 *
 * Usage
 *   node scripts/build_reparse_manifest.mjs                          # once, read-only
 *   node scripts/bulk_reparse_books.mjs [--only "Assam"] [--limit 5] [--wave 1]   # dry run
 *   node scripts/bulk_reparse_books.mjs --only "Assam" --execute                  # real pilot
 *   node scripts/bulk_reparse_books.mjs --rollback FINAL_BOOKS_STRUCTURED/_bulk/results.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseDocxDirect } from './lib/docxDirectParser.mjs';
import { verifyBook } from './lib/verifyBook.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
const { getS3Client, generateResourceId } = await import('./lib/ingest-drive-content.js');

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);
const BULK_DIR = arg('--out') || path.join(__dirname, '..', 'FINAL_BOOKS_STRUCTURED', '_bulk');
const MANIFEST = arg('--manifest') || path.join(BULK_DIR, 'manifest.json');
const EXECUTE = has('--execute');
const ONLY = arg('--only');
const LIMIT = arg('--limit') ? parseInt(arg('--limit'), 10) : Infinity;
const WAVE = arg('--wave');
const ROLLBACK = arg('--rollback');
const REVIEW_KEY = 'structured_resources/blocks/_review/index.json';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PUBLIC = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const BUCKET = process.env.R2_BUCKET_NAME;
const needR2 = EXECUTE || ROLLBACK;
if (needR2 && (!PUBLIC || !BUCKET)) { console.error('R2_PUBLIC_URL / R2_BUCKET_NAME missing in .env'); process.exit(1); }
const s3 = needR2 ? getS3Client() : null;
const CT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

async function listKeys(prefix) {
  const keys = []; let tok;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: tok }));
    keys.push(...(r.Contents || []).map((o) => o.Key)); tok = r.NextContinuationToken;
  } while (tok);
  return keys;
}
async function readReviewIndex() {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: REVIEW_KEY }));
    return JSON.parse(await r.Body.transformToString());
  } catch { return { books: [] }; }
}
async function writeReviewIndex(idx) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: REVIEW_KEY, Body: Buffer.from(JSON.stringify(idx, null, 1)), ContentType: 'application/json', CacheControl: 'public, max-age=60' }));
}
async function countRows(table) { const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }); if (error) throw new Error(error.message); return count; }

// ── rollback ─────────────────────────────────────────────────
if (ROLLBACK) {
  const res = JSON.parse(fs.readFileSync(ROLLBACK, 'utf8'));
  const created = res.books.filter((b) => b.created);
  console.log(`Rollback: ${created.length} book(s) created by that run`);
  const idx = await readReviewIndex();
  for (const b of created) {
    const { data: row } = await sb.from('resources').select('resource_id,status,title').eq('resource_id', b.created.resourceId).maybeSingle();
    if (row && (row.status !== 'Draft' || !/ 2026 NEW$/.test(row.title))) { console.log('  SKIP (row is no longer a Draft "2026 NEW" book):', row.title); continue; }
    const keys = await listKeys(b.created.prefix + '/');
    for (let i = 0; i < keys.length; i += 900) await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys.slice(i, i + 900).map((Key) => ({ Key })) } }));
    if (row) await sb.from('resources').delete().eq('resource_id', b.created.resourceId);
    idx.books = idx.books.filter((x) => x.resourceId !== b.created.resourceId);
    console.log('  removed', b.newTitle, `(${keys.length} objects)`);
  }
  await writeReviewIndex(idx);
  process.exit(0);
}

// ── run ──────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let entries = manifest.entries;
if (ONLY) entries = entries.filter((e) => (e.newTitle + ' ' + e.oldTitle).toLowerCase().includes(ONLY.toLowerCase()));
console.log(`${EXECUTE ? 'EXECUTE' : 'DRY RUN'}: ${entries.length} manifest entries (${entries.filter((e) => e.status === 'ready').length} with a source)`);

const before = EXECUTE ? { resources: await countRows('resources'), map: await countRows('lc_exam_resource_map') } : null;
const results = { startedAt: new Date().toISOString(), mode: EXECUTE ? 'execute' : 'dry-run', books: [] };
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let processed = 0;

for (const e of entries) {
  if (processed >= LIMIT) break;
  const rec = { id: e.id, category: e.category, oldTitle: e.oldTitle, newTitle: e.newTitle, status: e.status, examsLinked: e.examsLinked };
  results.books.push(rec);
  if (e.status !== 'ready') { rec.skipped = e.note || e.status; console.log(`- ${e.newTitle}: SKIPPED (${e.status})`); continue; }
  processed++;
  const t0 = Date.now();
  try {
    const buffer = fs.readFileSync(e.source);
    rec.source = e.source; rec.sourceSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const dir = path.join(BULK_DIR, e.id);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 });
    fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true }); fs.mkdirSync(path.join(dir, 'images'), { recursive: true });

    const { chapters, stats } = await parseDocxDirect(buffer, {
      onImage: async ({ bytes, ext, name }) => { const file = `${name}.${ext}`; fs.writeFileSync(path.join(dir, 'images', file), bytes); return `images/${file}`; },
    });
    const parts = [...new Set(chapters.map((c) => c.part).filter(Boolean))];
    const v = await verifyBook(buffer, chapters, { parts });

    // flags for the content team
    const sizes = chapters.map((c) => c.blocks.length);
    const titles = chapters.map((c) => c.title.replace(/\s+/g, ' ').trim());
    const flags = [];
    if (stats.visualMode) flags.push(`chapters detected from formatting (no heading styles): ${stats.visualChapters}`);
    if (stats.tocChaptersDropped) flags.push('Table of Contents chapter dropped');
    const big = chapters.filter((c) => c.blocks.length > 150); if (big.length) flags.push(`oversized chapters: ${big.map((c) => `${c.title.slice(0, 30)} (${c.blocks.length})`).join('; ')}`);
    const tiny = sizes.filter((n) => n < 4).length; if (tiny >= 3) flags.push(`${tiny} chapters with under 4 blocks`);
    const dup = titles.filter((t, i) => titles.indexOf(t) !== i); if (dup.length) flags.push(`duplicate titles: ${[...new Set(dup)].slice(0, 3).join('; ')}`);
    let hidden = 0; chapters.forEach((c) => c.blocks.forEach((b, i) => { if (i > 0 && ['paragraph', 'heading'].includes(b.type) && /^(CHAPTER|UNIT|PART|LESSON|अध्याय)\s*[-–—:.]?\s*\d+/i.test(plain(b.content)) && plain(b.content).length < 120) hidden++; }));
    if (hidden) flags.push(`${hidden} chapter-like lines inside chapters (possibly merged chapters)`);
    if (parts.length) flags.push(`${parts.length} subjects`);
    if (stats.frontMatterDropped) flags.push(`cover/contents dropped (${stats.frontMatterDropped} blocks)`);
    rec.stats = { chapters: chapters.length, subjects: parts.length, blocks: v.metrics.blocks, types: v.metrics.types, images: v.metrics.imagesOut, listItems: stats.listItems, tables: stats.tables, maxChapterBlocks: Math.max(0, ...sizes) };
    rec.verify = { pass: v.pass, issues: v.issues, warnings: v.warnings, coveragePct: v.metrics.coveragePct };
    rec.flags = flags;

    // local output (same layout as a published book)
    const imageCount = fs.readdirSync(path.join(dir, 'images')).length;
    const metadata = {
      book_id: e.id, title: e.newTitle, source_file: path.basename(e.source), category: e.category,
      parser: 'docxDirectParser v2 (no AI enrichment)', chapter_count: chapters.length, image_count: imageCount,
      chapters: chapters.map((c) => ({ title: c.title, order: c.order, part: c.part, enriched: false, blocks_count: c.blocks.length, file_name: `chapters/chapter-${c.order}.json` })),
    };
    chapters.forEach((c) => fs.writeFileSync(path.join(dir, 'chapters', `chapter-${c.order}.json`), JSON.stringify(c)));
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log(`${v.pass ? '✔' : '✘'} ${e.newTitle}: ${chapters.length} ch, ${parts.length} subj, ${v.metrics.imagesOut} img, cov ${v.metrics.coveragePct}%${flags.length ? ' | ' + flags.join(' | ').slice(0, 140) : ''}${v.issues.length ? ' | ISSUES ' + v.issues.join('; ') : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

    if (!EXECUTE || !v.pass) continue;

    // ── create the new entry (insert only) ──
    const { data: dupRow, error: dupErr } = await sb.from('resources').select('resource_id').eq('title', e.newTitle).eq('category', e.category).limit(1);
    if (dupErr) throw new Error(dupErr.message);
    if (dupRow?.length) { rec.skipped = 'a row with this title already exists'; console.log('   skipped: row exists'); continue; }
    const resourceId = generateResourceId(e.newTitle, '', e.category, '');
    const prefix = `structured_resources/blocks/${e.category}/${resourceId}`;
    if ((await listKeys(prefix + '/')).length) throw new Error('R2 prefix not empty: ' + prefix);
    const base = `${PUBLIC}/${prefix}`;
    const objects = [];
    objects.push({ key: `${prefix}/metadata.json`, body: Buffer.from(JSON.stringify({ ...metadata, resource_id: resourceId, storage_base_url: base + '/' }, null, 2)), type: 'application/json' });
    for (const c of chapters) {
      const copy = JSON.parse(JSON.stringify(c));
      for (const b of copy.blocks) {
        if (b.type === 'image' && !/^https?:/.test(b.src)) b.src = `${base}/${b.src}`;
        if (b.type === 'table') for (const r of b.rows) r.cells = r.cells.map((cell) => cell.replace(/(<img[^>]*\ssrc=")(images\/[^"]+)"/g, `$1${base}/$2"`));
      }
      objects.push({ key: `${prefix}/chapters/chapter-${c.order}.json`, body: Buffer.from(JSON.stringify(copy)), type: 'application/json' });
    }
    for (const f of fs.readdirSync(path.join(dir, 'images'))) objects.push({ key: `${prefix}/images/${f}`, body: fs.readFileSync(path.join(dir, 'images', f)), type: CT[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    const queue = objects.slice();
    await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) { const o = queue.shift(); await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: o.key, Body: o.body, ContentType: o.type, CacheControl: 'public, max-age=300' })); } }));

    const { error: insErr } = await sb.from('resources').insert({
      resource_id: resourceId,
      file_hash: crypto.createHash('sha256').update(rec.sourceSha256 + '|' + e.newTitle).digest('hex').slice(0, 64),
      source_file: path.basename(e.source), title: e.newTitle, exam_name: null, category: e.category, format: 'blocks',
      chapter_count: chapters.length, storage_base_url: base + '/', metadata_url: `${base}/metadata.json`,
      status: 'Draft', ...e.copy, updated_at: new Date().toISOString(),
    });
    if (insErr) throw new Error('insert failed: ' + insErr.message + ' (R2 objects left under ' + prefix + ', see results.json)');
    rec.created = { resourceId, prefix, objects: objects.length };
    const idx = await readReviewIndex();
    idx.books = idx.books.filter((x) => x.title !== e.newTitle).concat({ title: e.newTitle, category: e.category, resourceId, base, chapters: chapters.length, subjects: parts.length, flags, createdAt: new Date().toISOString() });
    await writeReviewIndex(idx);
    console.log(`   created Draft row ${resourceId} (${objects.length} objects)`);
  } catch (err) {
    rec.error = String(err.message).slice(0, 300);
    console.log(`✘ ${e.newTitle}: ERROR ${rec.error}`);
    if (EXECUTE) { fs.writeFileSync(path.join(BULK_DIR, 'results.json'), JSON.stringify(results, null, 2)); console.log('Aborting the run on the first error (results.json written).'); break; }
  }
}

if (EXECUTE) {
  const after = { resources: await countRows('resources'), map: await countRows('lc_exam_resource_map') };
  const made = results.books.filter((b) => b.created).length;
  results.counts = { before, after, expectedNewRows: made };
  console.log(`resources rows ${before.resources} -> ${after.resources} (expected +${made}); lc_exam_resource_map ${before.map} -> ${after.map} (expected unchanged)`);
  if (after.resources - before.resources !== made || after.map !== before.map) console.log('!! COUNT MISMATCH: stop and investigate');
  // learners must not see the new Drafts
  const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: vis } = await anon.from('resources').select('title').like('title', '% 2026 NEW');
  console.log(`anon can see ${vis?.length || 0} "2026 NEW" rows (expected 0)`);
  results.anonVisible = vis?.length || 0;
}
results.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(BULK_DIR, EXECUTE ? 'results.json' : 'dryrun_results.json'), JSON.stringify(results, null, 2));

// report
const ok = results.books.filter((b) => b.verify?.pass);
let md = `# Bulk reparse ${EXECUTE ? 'RESULT' : 'DRY RUN'} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})\n\n`;
md += `${results.books.length} manifest entries: ${ok.length} verified, ${results.books.filter((b) => b.verify && !b.verify.pass).length} failed verification, ${results.books.filter((b) => b.skipped).length} skipped, ${results.books.filter((b) => b.error).length} errors.${EXECUTE ? '' : ' Nothing was written to Supabase or R2.'}\n\n`;
md += `| Book | Exams | Verify | Ch | Subj | Img | Lists | Tables | Max ch | Flags for the content team |\n|---|---:|---|---:|---:|---:|---:|---:|---:|---|\n`;
for (const b of results.books) {
  if (b.skipped && !b.stats) { md += `| ${b.newTitle} | ${b.examsLinked} | skipped | | | | | | | ${b.skipped.slice(0, 160)} |\n`; continue; }
  if (!b.stats) { md += `| ${b.newTitle} | ${b.examsLinked} | ERROR | | | | | | | ${b.error} |\n`; continue; }
  md += `| ${b.newTitle} | ${b.examsLinked} | ${b.verify.pass ? 'PASS' : 'FAIL'} ${b.verify.coveragePct}% | ${b.stats.chapters} | ${b.stats.subjects || '-'} | ${b.stats.images} | ${b.stats.listItems} | ${b.stats.tables} | ${b.stats.maxChapterBlocks} | ${[...b.verify.issues, ...b.verify.warnings, ...(b.flags || [])].join('; ').slice(0, 260)} |\n`;
}
fs.writeFileSync(path.join(BULK_DIR, EXECUTE ? 'report_execute.md' : 'report_dryrun.md'), md);
console.log('\nReport:', path.join(BULK_DIR, EXECUTE ? 'report_execute.md' : 'report_dryrun.md'));
