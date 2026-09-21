#!/usr/bin/env node
/**
 * scripts/create_2026_book_copies.mjs
 *
 * For the five books that lost chapters to the old "introduction" filter, creates a
 * NEW complete copy titled "2026 <title>" instead of editing the live book:
 *
 *   - new R2 folder  structured_resources/blocks/<Category>/<new uuid>/  holding every
 *     existing live chapter (untouched content, renumbered where a chapter was inserted)
 *     plus the restored chapters, with their images copied into the new folder and the
 *     image links rewritten to it (so the copy does not depend on the original)
 *   - one new `resources` row per book (Published, same category/flags as the original,
 *     exam_name "General Exam" like the other single-row books)
 *   - the ORIGINAL books are left exactly as they are
 *
 * Relinking: only GK-GS has exam links today (185 exams). Those exams are linked to
 * "2026 GK-GS" and unlinked from the old GK-GS. The other four have no links and get none.
 *
 * Planning (which chapters are missing, where they go, SSC/RRB handling, active-copy
 * selection) is the tested logic in merge_missing_chapters_into_live_books.mjs.
 *
 * Safety: dry run by default. --execute writes only NEW R2 objects and NEW rows, then
 * (GK-GS) inserts the new links first and deletes the old ones after. Everything needed
 * to undo it (created ids, the deleted link rows) is written to
 * <BACKUP_ROOT>/<timestamp>/2026-copies/ROLLBACK.json. A book whose "2026 <title>" row
 * already exists is skipped, so a re-run cannot duplicate. Credentials come from .env.
 *
 * Usage:
 *   node scripts/create_2026_book_copies.mjs                     (dry run, all five)
 *   node scripts/create_2026_book_copies.mjs --only iti          (one book)
 *   node scripts/create_2026_book_copies.mjs --execute
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';
import { BOOKS, planBook, fetchJson, fetchRetry, pool, isArchivedStatus, textOf, IMG_CT } from './merge_missing_chapters_into_live_books.mjs';

const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const ONLY = (() => { const i = ARGS.indexOf('--only'); return i >= 0 ? ARGS[i + 1] : null; })();
const BACKUP_ROOT = process.env.BOOK_MERGE_BACKUP_ROOT || String.raw`K:\tmp\book_merge_backups`;
const PREFIX_TITLE = '2026 ';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function fetchAllMapRows(resourceIds, category) {
  let out = [];
  for (let i = 0; i < resourceIds.length; i += 100) {
    for (let f = 0; ; f += 1000) {
      const { data, error } = await supabase.from('lc_exam_resource_map').select('*').eq('category', category).in('resource_id', resourceIds.slice(i, i + 100)).range(f, f + 999);
      if (error) throw new Error(error.message);
      out = out.concat(data || []);
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}

// Build the whole new book in memory: chapters (new folder URLs), image copy list, metadata.
function buildCopy(plan, newId) {
  const { b, live, layout, meta, imagesToUpload } = plan;
  const newPrefix = `structured_resources/blocks/${b.category}/${newId}`;
  const newUrl = `${R2_PUBLIC_URL}/${newPrefix}/`;
  const oldImages = `${live.url}images/`;
  const newImages = `${newUrl}images/`;
  const inMemory = new Set([...imagesToUpload].map(([id, img]) => `image_${id}.${img.ext}`));
  const toCopy = new Set(); // file names under the old images/ folder to copy over
  const rx = new RegExp(`${esc(oldImages)}([^"\\s\\\\]+)`, 'g');

  const chapters = layout.map((l) => {
    const body = l.kind === 'live' ? { ...l.json, order: l.order } : l.json;
    const text = JSON.stringify(body, null, 2);
    for (const m of text.matchAll(rx)) if (!inMemory.has(m[1])) toCopy.add(m[1]);
    return { order: l.order, kind: l.kind, text: text.split(oldImages).join(newImages), meta: l };
  });
  const newMeta = {
    ...meta,
    book_id: crypto.randomBytes(4).toString('hex').slice(0, 7),
    title: `${PREFIX_TITLE}${b.title}`,
    chapter_count: layout.length,
    image_count: (meta.image_count || 0) + imagesToUpload.size,
    chapters: layout.map((l) => (l.kind === 'live'
      ? { ...l.meta, order: l.order, file_name: `chapters/chapter-${l.order}.json` }
      : { title: l.title, order: l.order, enriched: false, blocks_count: l.json.blocks.length, file_name: `chapters/chapter-${l.order}.json` })),
  };
  return { newPrefix, newUrl, newImages, oldImages, chapters, toCopy: [...toCopy], newMeta };
}

async function activeSourceRow(live) {
  const { data, error } = await supabase.from('resources').select('*').eq('storage_base_url', live.url);
  if (error) throw new Error(error.message);
  const active = (data || []).filter((r) => !isArchivedStatus(r.status));
  return { rows: data || [], active, canonical: active[0] };
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing R2 + Supabase)' : 'DRY RUN (nothing is written)'}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const list = BOOKS.filter((b) => !ONLY || b.key === ONLY);
  if (!list.length) throw new Error(`--only ${ONLY} matches no book. Keys: ${BOOKS.map((b) => b.key).join(', ')}`);
  const rollback = { createdAt: new Date().toISOString(), books: [] };
  const dir = path.join(BACKUP_ROOT, stamp, '2026-copies');

  for (const b of list) {
    console.log(`\n=== [${b.key}] ${b.category} "${b.title}"  ->  "${PREFIX_TITLE}${b.title}" ===`);
    const plan = await planBook(b);
    if (plan.skip) { console.log(`  SKIPPED: ${plan.skip}`); continue; }

    const { data: exists } = await supabase.from('resources').select('resource_id').eq('category', b.category).eq('title', `${PREFIX_TITLE}${b.title}`).limit(1);
    if (exists?.length) { console.log(`  SKIPPED: "${PREFIX_TITLE}${b.title}" already exists (resource_id ${exists[0].resource_id}) -- not creating a second copy`); continue; }

    const { rows, active, canonical } = await activeSourceRow(plan.live);
    const newId = crypto.randomUUID();
    const copy = buildCopy(plan, newId);
    const oldLinks = await fetchAllMapRows(rows.map((r) => r.resource_id), b.category);
    const activeIds = new Set(active.map((r) => r.resource_id));
    const moveLinks = oldLinks.filter((l) => activeIds.has(l.resource_id));
    const moveExams = [...new Set(moveLinks.map((l) => l.exam_id))];

    const words = plan.newOnes.reduce((n, x) => n + textOf(x.json.blocks).split(/\s+/).filter(Boolean).length, 0);
    console.log(`  new copy   : ${copy.chapters.length} chapters (${plan.liveChapters.length} existing + ${plan.newOnes.length} restored, ~${words} restored words)   ${plan.stripBrand ? '[SSC/RRB deleted from restored chapters]' : ''}`);
    plan.newOnes.forEach((n) => console.log(`      + ch ${String(n.order).padStart(3)}: "${n.title.slice(0, 58)}"`));
    console.log(`  new folder : .../${copy.newPrefix.split('/').slice(-3).join('/')}/   (${copy.chapters.length} chapter files + metadata.json)`);
    console.log(`  images     : ${copy.toCopy.length} copied from the original + ${plan.imagesToUpload.size} from restored chapters`);
    console.log(`  db row     : new resources row, Published, from original's flags (locked=${canonical.is_locked}, freemium=${canonical.is_freemium}, cost=${canonical.unlock_cost}), thumbnail ${canonical.thumbnail_url ? 'copied' : 'none'}`);
    console.log(`  links      : ${moveExams.length ? `MOVE ${moveExams.length} exam link(s) (${moveLinks.length} link rows on active rows) to the new copy, remove them from the old one` : 'none to move (original has no exam links)'}`);
    if (oldLinks.length !== moveLinks.length) console.log(`  note       : ${oldLinks.length - moveLinks.length} link(s) on Draft/Archived rows are left alone`);

    if (!EXECUTE) continue;

    const s3 = getS3Client();
    // 1) R2: images, chapters, metadata last (all NEW objects, nothing existing is overwritten)
    for (const [id, img] of plan.imagesToUpload) await uploadToR2(s3, bucket, `${copy.newPrefix}/images/image_${id}.${img.ext}`, img.buffer, IMG_CT[img.ext] || 'application/octet-stream');
    await pool(copy.toCopy, 4, async (file) => {
      const r = await fetchRetry(`${copy.oldImages}${file}`);
      if (!r.ok) throw new Error(`could not read original image ${file}: HTTP ${r.status}`);
      await uploadToR2(s3, bucket, `${copy.newPrefix}/images/${file}`, Buffer.from(await r.arrayBuffer()), r.headers.get('content-type') || 'application/octet-stream');
    });
    await pool(copy.chapters, 8, async (c) => uploadToR2(s3, bucket, `${copy.newPrefix}/chapters/chapter-${c.order}.json`, Buffer.from(c.text), 'application/json'));
    const metaText = JSON.stringify(copy.newMeta, null, 2);
    await uploadToR2(s3, bucket, `${copy.newPrefix}/metadata.json`, Buffer.from(metaText), 'application/json');
    console.log(`  [R2] wrote ${plan.imagesToUpload.size + copy.toCopy.length} image(s), ${copy.chapters.length} chapter file(s), metadata.json`);

    // 2) new resources row
    const row = {
      resource_id: newId,
      file_hash: crypto.createHash('sha256').update(metaText).digest('hex'),
      source_file: canonical.source_file,
      title: `${PREFIX_TITLE}${b.title}`,
      exam_name: 'General Exam',
      subject: 'General',
      category: b.category,
      conducting_body: '',
      website_url: canonical.website_url || '',
      chapter_count: copy.chapters.length,
      storage_base_url: copy.newUrl,
      metadata_url: `${copy.newUrl}metadata.json`,
      thumbnail_url: canonical.thumbnail_url || '',
      is_freemium: canonical.is_freemium,
      is_locked: canonical.is_locked,
      unlock_cost: canonical.unlock_cost,
      status: 'Published',
      format: 'blocks',
      level: canonical.level ?? null,
      state_ut: canonical.state_ut ?? null,
    };
    const { error: insErr } = await supabase.from('resources').insert(row);
    if (insErr) throw new Error(`resources insert failed for ${b.key}: ${insErr.message}`);
    console.log(`  [DB] created resource ${newId}`);
    const entry = { key: b.key, category: b.category, newResourceId: newId, newPrefix: copy.newPrefix, originalUrl: plan.live.url, insertedLinkIds: [], removedLinks: [] };
    rollback.books.push(entry);

    // 3) relink: insert the new links first, delete the old ones only after that succeeded
    if (moveExams.length) {
      const newLinks = moveExams.map((exam_id) => ({ exam_id, resource_id: newId, category: b.category, confidence: 'high', reasoning: `Relinked from "${b.title}" to the 2026 edition`, source: 'manual' }));
      for (let i = 0; i < newLinks.length; i += 200) {
        const { data, error } = await supabase.from('lc_exam_resource_map').insert(newLinks.slice(i, i + 200)).select('id');
        if (error) throw new Error(`link insert failed: ${error.message}`);
        entry.insertedLinkIds.push(...data.map((d) => d.id));
      }
      entry.removedLinks = moveLinks; // full rows, enough to restore
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'ROLLBACK.json'), JSON.stringify(rollback, null, 2)); // before deleting anything
      for (let i = 0; i < moveLinks.length; i += 200) {
        const { error } = await supabase.from('lc_exam_resource_map').delete().in('id', moveLinks.slice(i, i + 200).map((l) => l.id));
        if (error) throw new Error(`old link delete failed: ${error.message}`);
      }
      console.log(`  [DB] linked ${moveExams.length} exam(s) to the new copy, removed ${moveLinks.length} old link row(s)`);
    }

    // 4) read back
    const back = await fetchJson(`${copy.newUrl}metadata.json`);
    const first = await fetch(`${copy.newUrl}chapters/chapter-1.json`);
    const last = await fetch(`${copy.newUrl}chapters/chapter-${copy.chapters.length}.json`);
    const { count } = await supabase.from('lc_exam_resource_map').select('id', { count: 'exact', head: true }).eq('resource_id', newId);
    console.log(`  [verify] metadata lists ${back.chapters.length} chapters | chapter-1 HTTP ${first.status}, chapter-${copy.chapters.length} HTTP ${last.status} | exam links on new copy: ${count}`);
  }

  if (EXECUTE) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ROLLBACK.json'), JSON.stringify(rollback, null, 2));
    console.log(`\nRollback info: ${path.join(dir, 'ROLLBACK.json')}`);
  } else {
    console.log('\nDry run only -- re-run with --execute to write.');
  }
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
