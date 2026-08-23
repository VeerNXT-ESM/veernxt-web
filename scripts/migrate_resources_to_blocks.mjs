#!/usr/bin/env node
/**
 * scripts/migrate_resources_to_blocks.mjs
 *
 * Phase of Resources_Migration_Plan.md: for each already-enriched book at
 * FINAL_CONTENT_ENRICHED/{Guide,Precis}/<title>/, upload its chapter-N.json
 * files to R2 and flip the matching resources_v2 rows' `format` column to
 * 'blocks' + a new `storage_base_url` pointing at the upload.
 *
 * Matching is deliberately EXACT title+category only, against resources_v2
 * rows whose current storage_base_url is under the canonical
 * `master_documents/` prefix (the shared, single-copy document -- verified
 * live: unlike per-exam-folder duplicate copies, every canonical
 * (title, category) pair maps to exactly one storage_base_url; see
 * Resources_Migration_Plan.md). No fuzzy/substring matching: this session
 * already found real false-positive traps in looser matching elsewhere
 * (job matching, conducting-body logos) and FINAL_CONTENT_ENRICHED's own
 * folder names don't all line up 1:1 with today's canonical titles (e.g.
 * "Gujarat_SI" vs the canonical "Gujarat_GS" -- likely genuinely different
 * documents, not a naming variant) -- exact match only, unmatched folders
 * are reported for manual reconciliation rather than guessed.
 *
 * A canonical (title, category)'s storage_base_url is shared by every
 * resources_v2 row that references it (one master document, many exams) --
 * this script updates ALL of those rows, not just one, so every exam that
 * already points at the canonical document starts serving the new format
 * immediately.
 *
 * Usage:
 *   node scripts/migrate_resources_to_blocks.mjs            (dry run)
 *   node scripts/migrate_resources_to_blocks.mjs --execute
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './ingest-drive-content.js';

const EXECUTE = process.argv.includes('--execute');
const SOURCE_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\FINAL_CONTENT_ENRICHED';
const TOP_LEVEL_CATEGORIES = ['Guide', 'Precis'];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
      const chapterFiles = fs.readdirSync(chaptersDir).filter((f) => /^chapter-\d+\.json$/.test(f));
      if (chapterFiles.length === 0) continue;
      books.push({ title: name.trim(), category, bookDir, chaptersDir, metadataPath, chapterFiles });
    }
  }
  return books;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (uploading + updating resources_v2.format)' : 'DRY RUN'}\n`);

  const books = listBookFolders();
  console.log(`${books.length} enriched book folders found under FINAL_CONTENT_ENRICHED.\n`);

  const masterRows = await fetchAllRows(
    'resources_v2',
    'resource_id,title,category,storage_base_url',
    (q) => q.ilike('storage_base_url', '%master_documents%')
  );

  // Group canonical rows by (title, category) -> distinct storage_base_urls.
  // A clean canonical set has exactly one base url per pair; more than one
  // means the data isn't as clean as assumed and this book is skipped
  // rather than guessed at.
  const canonicalByKey = new Map();
  for (const r of masterRows) {
    const key = `${r.title.trim().toLowerCase()}::${r.category}`;
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, { title: r.title, category: r.category, baseUrls: new Set(), rowCount: 0 });
    const entry = canonicalByKey.get(key);
    entry.baseUrls.add(r.storage_base_url);
    entry.rowCount++;
  }

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let matched = 0;
  let skippedAmbiguous = 0;
  let skippedNoMatch = 0;
  let totalRowsUpdated = 0;

  for (const book of books) {
    const key = `${book.title.toLowerCase()}::${book.category}`;
    const canonical = canonicalByKey.get(key);

    if (!canonical) {
      console.log(`[no match] "${book.title}" (${book.category}) — no canonical resources_v2 row found. Skipping.`);
      skippedNoMatch++;
      continue;
    }
    if (canonical.baseUrls.size > 1) {
      console.log(`[ambiguous] "${book.title}" (${book.category}) — ${canonical.baseUrls.size} distinct storage_base_urls for this title, expected 1. Skipping.`);
      skippedAmbiguous++;
      continue;
    }

    matched++;
    const oldBaseUrl = [...canonical.baseUrls][0];
    console.log(`[match] "${book.title}" (${book.category}) — ${book.chapterFiles.length} chapters, ${canonical.rowCount} resources_v2 row(s) share this document.`);

    if (!EXECUTE) continue;

    // Reuse the same resource_id folder the book already has on R2, just
    // under a new /blocks/ sub-path, so the canonical document's identity
    // (the uuid in its old storage_base_url) carries over.
    const oldFolderMatch = oldBaseUrl.match(/\/([a-f0-9-]+)_?[a-f0-9]*\/?$/i) || oldBaseUrl.match(/\/([a-f0-9-]{36})\/?$/i);
    const resourceFolderId = oldFolderMatch ? oldFolderMatch[1] : book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newPrefix = `structured_resources/blocks/${book.category}/${resourceFolderId}`;

    const metadata = JSON.parse(fs.readFileSync(book.metadataPath, 'utf-8'));
    await uploadToR2(s3, bucket, `${newPrefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
    for (const chapterFile of book.chapterFiles) {
      const body = fs.readFileSync(path.join(book.chaptersDir, chapterFile));
      await uploadToR2(s3, bucket, `${newPrefix}/chapters/${chapterFile}`, body, 'application/json');
    }

    const newBaseUrl = `${publicUrl}/${newPrefix}/`;
    const { error } = await supabase
      .from('resources_v2')
      .update({ format: 'blocks', storage_base_url: newBaseUrl })
      .eq('storage_base_url', oldBaseUrl);
    if (error) {
      console.error(`  [db error] ${error.message}`);
      continue;
    }
    totalRowsUpdated += canonical.rowCount;
    console.log(`  -> uploaded to ${newBaseUrl}, updated ${canonical.rowCount} resources_v2 row(s).`);
  }

  console.log('\n--- Summary ---');
  console.log(`Matched: ${matched}, ambiguous (skipped): ${skippedAmbiguous}, no canonical match (skipped): ${skippedNoMatch}`);
  if (EXECUTE) console.log(`Total resources_v2 rows updated: ${totalRowsUpdated}`);
  else console.log('\nDry run — no uploads or writes. Re-run with --execute to migrate.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
