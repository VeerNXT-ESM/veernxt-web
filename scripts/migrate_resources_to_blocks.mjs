#!/usr/bin/env node
/**
 * scripts/migrate_resources_to_blocks.mjs
 *
 * Phase of Resources_Migration_Plan.md: for each already-enriched book at
 * public/books/{Guide,Precis}/<title>/ (the content team's consolidated
 * drop location -- previously K:\...\FINAL_CONTENT_ENRICHED, moved
 * in-repo once that stopped being the single source of truth), upload its
 * chapter-N.json files to R2 and flip the matching resources_v2 rows'
 * `format` column to 'blocks' + a new `storage_base_url` pointing at the
 * upload. Safe to re-run against a title already migrated (e.g. a book
 * reprocessed with a fuller/cheaper-tier pass) -- it just re-uploads and
 * overwrites the same R2 key and resources_v2 rows.
 *
 * Three cases per local book, matched EXACT title+category only (no
 * fuzzy/substring matching -- this session already found real
 * false-positive traps in looser matching elsewhere: job matching,
 * conducting-body logos, and FINAL_CONTENT_ENRICHED's own folder names
 * don't all line up 1:1 with today's canonical titles):
 *
 *   1. MATCHED -- exactly one canonical resources_v2 row already exists
 *      (storage_base_url under `master_documents/`, or already
 *      format='blocks' from an earlier run of this script). Re-uses that
 *      row's own R2 folder id and updates it in place.
 *   2. GROUP B -- one or more resources_v2 rows exist for this
 *      (title, category), but none are canonical yet (still on the old
 *      per-exam-folder duplicate scheme, one storage_base_url per row).
 *      Picks a canonical folder id deterministically (lowest resource_id
 *      -- stable across re-runs, not "whichever the DB happens to return
 *      first") and repoints ALL of that title's rows at one shared
 *      location. If the canonical set ALREADY has >1 distinct
 *      storage_base_url (a genuine inconsistency among rows already
 *      believed canonical), that's left alone and reported rather than
 *      auto-resolved -- that's a different, rarer problem than "never
 *      consolidated yet".
 *   3. GROUP A -- zero resources_v2 rows exist for this (title, category)
 *      at all. Inserts one new row with a real uuid resource_id and a
 *      real sha256 content hash (not a random placeholder). exam_name/
 *      subject/conducting_body are left as the same generic fallback
 *      values api/admin/save-resource.js already uses for unknown
 *      metadata -- this makes the content real and servable from R2, but
 *      it is NOT linked to any exam. A separate pass (lc_exam_resource_map
 *      / lc_subject_resources) is still required before any exam can
 *      surface this content -- ingesting the row alone does not do that.
 *
 * All three re-run safely: MATCHED and GROUP B always resolve to the same
 * folder id given the same DB state (extracted from the row's own
 * existing url, or the lowest resource_id's), so re-running just
 * re-uploads to the same key. GROUP A is the one exception -- it always
 * mints a fresh uuid, so re-running it inserts a second row. Once a title
 * has been through GROUP A once, it becomes MATCHED on the next run and
 * is safe again.
 *
 * Also uploads each book's images/*.{png,jpg,jpeg} (if present) alongside
 * its chapters, and rewrites every chapter's image blocks from their local
 * dev src ("/books/<Category>/<title>/images/xxx.jpeg", only resolvable
 * because public/books is served by Vite locally) to the uploaded image's
 * real R2 URL before uploading the chapter JSON -- BlockRenderer.jsx's
 * ImageBlock renders `src` verbatim with no base-path resolution, and
 * public/books is deliberately not deployed with the app (see
 * status_report.md, R2 migration section), so an un-rewritten src would
 * 404 in production every time.
 *
 * Usage:
 *   node scripts/migrate_resources_to_blocks.mjs            (dry run)
 *   node scripts/migrate_resources_to_blocks.mjs --execute
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const SOURCE_ROOT = path.join(__dirname, '..', 'public', 'books');
const TOP_LEVEL_CATEGORIES = ['Guide', 'Precis'];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const IMAGE_CONTENT_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

async function fetchAllRows(table, columns, filterFn) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function listBookFolders() {
  const books = [];
  for (const category of TOP_LEVEL_CATEGORIES) {
    const categoryDir = path.join(SOURCE_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const name of fs.readdirSync(categoryDir)) {
      const bookDir = path.join(categoryDir, name);
      if (!fs.statSync(bookDir).isDirectory()) continue;
      const chaptersDir = path.join(bookDir, 'chapters');
      const metadataPath = path.join(bookDir, 'metadata.json');
      if (!fs.existsSync(chaptersDir) || !fs.existsSync(metadataPath)) continue;
      const chapterFiles = fs.readdirSync(chaptersDir)
        .filter((f) => /^chapter-\d+\.json$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
      if (chapterFiles.length === 0) continue;
      const imagesDir = path.join(bookDir, 'images');
      const imageFiles = fs.existsSync(imagesDir)
        ? fs.readdirSync(imagesDir).filter((f) => IMAGE_CONTENT_TYPES[path.extname(f).toLowerCase()] && fs.statSync(path.join(imagesDir, f)).isFile())
        : [];
      books.push({ title: name.trim(), category, bookDir, chaptersDir, metadataPath, chapterFiles, imagesDir, imageFiles });
    }
  }
  return books;
}

/** Real sha256 over metadata.json + every chapter file's bytes, in stable chapter order. Used only for GROUP A's file_hash -- never a random placeholder. */
function computeContentHash(book) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(book.metadataPath));
  for (const chapterFile of book.chapterFiles) hash.update(fs.readFileSync(path.join(book.chaptersDir, chapterFile)));
  return hash.digest('hex');
}

function extractFolderId(url) {
  const m = url && (url.match(/\/([a-f0-9-]+)_?[a-f0-9]*\/?$/i) || url.match(/\/([a-f0-9-]{36})\/?$/i));
  return m ? m[1] : null;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (uploading + updating resources_v2)' : 'DRY RUN'}\n`);

  const books = listBookFolders();
  console.log(`${books.length} enriched book folders found under ${SOURCE_ROOT}.\n`);

  // Canonical = either the original un-migrated master_documents copy, OR
  // a row this script already migrated in an earlier run (storage_base_url
  // now under structured_resources/blocks/, format='blocks').
  const masterRows = await fetchAllRows(
    'resources_v2',
    'resource_id,title,category,storage_base_url,format',
    (q) => q.or('storage_base_url.ilike.%master_documents%,format.eq.blocks')
  );
  const canonicalByKey = new Map();
  for (const r of masterRows) {
    const key = `${r.title.trim().toLowerCase()}::${r.category}`;
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, { title: r.title, category: r.category, baseUrls: new Set(), rowCount: 0 });
    const entry = canonicalByKey.get(key);
    entry.baseUrls.add(r.storage_base_url);
    entry.rowCount++;
  }

  // Every resources_v2 row for this title, canonical or not -- used to tell
  // GROUP A (zero rows anywhere) apart from GROUP B (rows exist, just not
  // canonical yet).
  const allRows = await fetchAllRows('resources_v2', 'resource_id,title,category,storage_base_url');
  const allRowsByKey = new Map();
  for (const r of allRows) {
    const key = `${r.title.trim().toLowerCase()}::${r.category}`;
    if (!allRowsByKey.has(key)) allRowsByKey.set(key, []);
    allRowsByKey.get(key).push(r);
  }

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let matched = 0, groupA = 0, groupB = 0, skippedAmbiguous = 0;
  let totalRowsUpdated = 0, totalRowsInserted = 0;

  for (const book of books) {
    const key = `${book.title.toLowerCase()}::${book.category}`;
    const canonical = canonicalByKey.get(key);

    let newPrefix, newBaseUrl, dbAction;

    if (canonical && canonical.baseUrls.size === 1) {
      matched++;
      const oldBaseUrl = [...canonical.baseUrls][0];
      const resourceFolderId = extractFolderId(oldBaseUrl) || crypto.randomUUID();
      newPrefix = `structured_resources/blocks/${book.category}/${resourceFolderId}`;
      newBaseUrl = `${publicUrl}/${newPrefix}/`;
      dbAction = { kind: 'update', filterUrl: oldBaseUrl, rowCount: canonical.rowCount, label: 'match' };
    } else if (canonical && canonical.baseUrls.size > 1) {
      console.log(`[ambiguous] "${book.title}" (${book.category}) — ${canonical.baseUrls.size} distinct storage_base_urls already believed canonical, expected 1. Skipping.`);
      skippedAmbiguous++;
      continue;
    } else {
      const legacyRows = allRowsByKey.get(key) || [];
      if (legacyRows.length === 0) {
        groupA++;
        const newUuid = crypto.randomUUID();
        newPrefix = `structured_resources/blocks/${book.category}/${newUuid}`;
        newBaseUrl = `${publicUrl}/${newPrefix}/`;
        dbAction = { kind: 'insert', newUuid, label: 'group-a' };
      } else {
        groupB++;
        const sorted = [...legacyRows].sort((a, b) => a.resource_id.localeCompare(b.resource_id));
        const resourceFolderId = extractFolderId(sorted[0].storage_base_url) || crypto.randomUUID();
        newPrefix = `structured_resources/blocks/${book.category}/${resourceFolderId}`;
        newBaseUrl = `${publicUrl}/${newPrefix}/`;
        dbAction = { kind: 'update-title', rowCount: legacyRows.length, label: 'group-b' };
      }
    }

    // Map each local image filename -> its future R2 URL under this book's
    // new prefix, so chapter blocks can be rewritten below regardless of
    // dry-run/execute (dry run just reports the count, doesn't write).
    const imageUrlByFilename = new Map(book.imageFiles.map((f) => [f, `${newBaseUrl}images/${f}`]));

    const rewrittenChapters = [];
    let imagesRewritten = 0;
    for (const chapterFile of book.chapterFiles) {
      const chapter = JSON.parse(fs.readFileSync(path.join(book.chaptersDir, chapterFile), 'utf-8'));
      for (const block of chapter.blocks || []) {
        if (block.type === 'image' && typeof block.src === 'string') {
          const filename = block.src.split('/').pop();
          const r2Url = imageUrlByFilename.get(filename);
          if (r2Url && block.src !== r2Url) { block.src = r2Url; imagesRewritten++; }
        }
      }
      rewrittenChapters.push({ chapterFile, chapter });
    }

    console.log(`[${dbAction.label}] "${book.title}" (${book.category}) — ${book.chapterFiles.length} chapters, ${book.imageFiles.length} images, ${imagesRewritten} image src rewritten, ${dbAction.rowCount ?? 'new'} resources_v2 row(s).`);

    if (!EXECUTE) continue;

    const metadata = JSON.parse(fs.readFileSync(book.metadataPath, 'utf-8'));
    await uploadToR2(s3, bucket, `${newPrefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
    for (const { chapterFile, chapter } of rewrittenChapters) {
      await uploadToR2(s3, bucket, `${newPrefix}/chapters/${chapterFile}`, Buffer.from(JSON.stringify(chapter, null, 2)), 'application/json');
    }
    for (const imageFile of book.imageFiles) {
      const body = fs.readFileSync(path.join(book.imagesDir, imageFile));
      const contentType = IMAGE_CONTENT_TYPES[path.extname(imageFile).toLowerCase()];
      await uploadToR2(s3, bucket, `${newPrefix}/images/${imageFile}`, body, contentType);
    }

    if (dbAction.kind === 'update') {
      const { error } = await supabase.from('resources_v2').update({ format: 'blocks', storage_base_url: newBaseUrl }).eq('storage_base_url', dbAction.filterUrl);
      if (error) { console.error(`  [db error] ${error.message}`); continue; }
      totalRowsUpdated += dbAction.rowCount;
      console.log(`  -> uploaded to ${newBaseUrl}, updated ${dbAction.rowCount} resources_v2 row(s).`);
    } else if (dbAction.kind === 'update-title') {
      const { error } = await supabase.from('resources_v2').update({ format: 'blocks', storage_base_url: newBaseUrl }).eq('title', book.title).eq('category', book.category);
      if (error) { console.error(`  [db error] ${error.message}`); continue; }
      totalRowsUpdated += dbAction.rowCount;
      console.log(`  -> uploaded to ${newBaseUrl}, consolidated ${dbAction.rowCount} previously-duplicate resources_v2 row(s).`);
    } else if (dbAction.kind === 'insert') {
      const record = {
        resource_id: dbAction.newUuid,
        file_hash: computeContentHash(book),
        source_file: metadata.source_file || '',
        title: book.title,
        exam_name: 'General Exam',
        subject: 'General',
        category: book.category,
        conducting_body: '',
        website_url: '',
        chapter_count: book.chapterFiles.length,
        format: 'blocks',
        storage_base_url: newBaseUrl,
        metadata_url: `${newBaseUrl}metadata.json`,
        thumbnail_url: '',
        is_freemium: false,
        is_locked: true,
        status: 'Published',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('resources_v2').insert(record);
      if (error) { console.error(`  [db error] ${error.message}`); continue; }
      totalRowsInserted++;
      console.log(`  -> uploaded to ${newBaseUrl}, inserted new resources_v2 row (resource_id=${dbAction.newUuid}). NOT linked to any exam yet.`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Matched (already canonical): ${matched}`);
  console.log(`Group B (duplicate rows consolidated): ${groupB}`);
  console.log(`Group A (new rows created): ${groupA}`);
  console.log(`Ambiguous (skipped, needs manual review): ${skippedAmbiguous}`);
  if (EXECUTE) {
    console.log(`Total resources_v2 rows updated: ${totalRowsUpdated}`);
    console.log(`Total resources_v2 rows inserted: ${totalRowsInserted}`);
    if (groupA > 0) console.log(`\nNote: ${groupA} newly-inserted row(s) are real content on R2 but are NOT linked to any exam yet -- a separate lc_exam_resource_map / lc_subject_resources pass is still needed before any exam surfaces them.`);
  } else {
    console.log('\nDry run — no uploads or writes. Re-run with --execute to migrate.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
