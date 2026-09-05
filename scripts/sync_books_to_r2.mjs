import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './ingest-drive-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const SOURCE_ROOT = path.join(__dirname, '..', 'public', 'books');
const TOP_LEVEL_CATEGORIES = ['Guide', 'Precis'];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const IMAGE_CONTENT_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function generateId() {
  return 'res-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Fetch all paginated rows from Supabase
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

// Builds the same book descriptor shape listBookFolders() produces, for
// exactly one already-known category/folder -- used by the admin editor's
// "Publish to R2" action (api/admin/save-resource.js's books-publish),
// which knows which single book to sync and shouldn't re-scan all ~122
// folders to do it. Returns null if the folder isn't a valid book (no
// chapters/metadata.json, or zero chapter files).
function getBookFolder(category, name) {
  const bookDir = path.join(SOURCE_ROOT, category, name);
  if (!fs.existsSync(bookDir) || !fs.statSync(bookDir).isDirectory()) return null;

  const chaptersDir = path.join(bookDir, 'chapters');
  const metadataPath = path.join(bookDir, 'metadata.json');
  if (!fs.existsSync(chaptersDir) || !fs.existsSync(metadataPath)) return null;

  const chapterFiles = fs.readdirSync(chaptersDir).filter((f) => /^chapter-\d+\.json$/.test(f));
  if (chapterFiles.length === 0) return null;

  const imagesDir = path.join(bookDir, 'images');
  const imageFiles = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).filter((f) => IMAGE_CONTENT_TYPES[path.extname(f).toLowerCase()] && fs.statSync(path.join(imagesDir, f)).isFile())
    : [];

  return { title: name.trim(), category, bookDir, chaptersDir, metadataPath, chapterFiles, imagesDir, imageFiles };
}

function listBookFolders() {
  const books = [];
  for (const category of TOP_LEVEL_CATEGORIES) {
    const categoryDir = path.join(SOURCE_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const name of fs.readdirSync(categoryDir)) {
      const book = getBookFolder(category, name);
      if (book) books.push(book);
    }
  }
  return books;
}

/**
 * Syncs one book folder to R2 and upserts its resources_v2 row(s),
 * exactly reproducing one iteration of main()'s loop below -- extracted
 * so api/admin/save-resource.js's books-publish action can reuse this
 * exact logic for a single book instead of drifting a second
 * implementation. `dbRows` is that book's existing resources_v2 rows
 * (title+category match, fetched by the caller); `execute` mirrors the
 * CLI's --execute flag (false = dry run, computes URLs/logs but writes
 * nothing). Returns { storageBaseUrl, resourceId, group } summarizing
 * what happened, mirroring the counts.* categories from main()'s summary.
 */
async function syncOneBook(book, dbRows, { supabase, s3, bucket, publicUrl, execute }) {
  let finalBaseUrl = '';
  let resourceFolderId = '';
  let resourceId = null;
  let group;

  if (!dbRows || dbRows.length === 0) {
    // --- GROUP A: Zero row exists in DB (New Ingestion) ---
    group = 'new';
    const newUuid = generateId();
    resourceId = newUuid;
    resourceFolderId = newUuid;
    finalBaseUrl = `${publicUrl}/structured_resources/blocks/${book.category}/${resourceFolderId}/`;

    if (execute) {
      const newRecord = {
        resource_id: newUuid,
        file_hash: generateId() + generateId(),
        title: book.title,
        category: book.category,
        format: 'blocks',
        storage_base_url: finalBaseUrl,
        metadata_url: `${finalBaseUrl}metadata.json`,
        status: 'Published',
        chapter_count: book.chapterFiles.length,
        is_freemium: false,
        is_locked: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('resources_v2').insert(newRecord);
      if (error) throw new Error(`Failed to insert new resources_v2 row: ${error.message}`);
    }
  } else {
    // --- GROUP B (>1 row, consolidate) / CANONICAL (1 row): same update shape either way ---
    group = dbRows.length > 1 ? 'consolidated' : 'canonical';
    const canonicalRow = dbRows[0];
    resourceId = canonicalRow.resource_id;
    const oldBaseUrl = canonicalRow.storage_base_url;
    const oldFolderMatch = oldBaseUrl?.match(/\/([a-f0-9-]+)_?[a-f0-9]*\/?$/i) || oldBaseUrl?.match(/\/([a-f0-9-]{36})\/?$/i);
    resourceFolderId = oldFolderMatch ? oldFolderMatch[1] : book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    finalBaseUrl = `${publicUrl}/structured_resources/blocks/${book.category}/${resourceFolderId}/`;

    if (execute) {
      const { error } = await supabase
        .from('resources_v2')
        .update({ format: 'blocks', storage_base_url: finalBaseUrl, metadata_url: `${finalBaseUrl}metadata.json` })
        .eq('title', book.title)
        .eq('category', book.category);
      if (error) throw new Error(`Failed to update resources_v2 row(s): ${error.message}`);
    }
  }

  // --- UPLOAD PROCESS (identical for all three groups once canonical url is established) ---
  const newPrefix = `structured_resources/blocks/${book.category}/${resourceFolderId}`;
  const imageUrlByFilename = new Map(book.imageFiles.map((f) => [f, `${finalBaseUrl}images/${f}`]));

  const rewrittenChapters = [];
  for (const chapterFile of book.chapterFiles) {
    const chapter = JSON.parse(fs.readFileSync(path.join(book.chaptersDir, chapterFile), 'utf-8'));
    for (const block of chapter.blocks || []) {
      if (block.type === 'image' && typeof block.src === 'string') {
        const filename = block.src.split('/').pop();
        const r2Url = imageUrlByFilename.get(filename);
        if (r2Url && block.src !== r2Url) block.src = r2Url;
      }
    }
    rewrittenChapters.push({ chapterFile, chapter });
  }

  if (execute) {
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
  }

  return { group, storageBaseUrl: finalBaseUrl, resourceId, chapterCount: book.chapterFiles.length, imageCount: book.imageFiles.length };
}

async function main() {
  console.log("=== VEERNXT UNIVERSAL R2 SYNC & DB INGESTION PIPELINE ===");
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to DB and uploading to R2)' : 'DRY RUN'}\n`);

  const books = listBookFolders();
  console.log(`${books.length} enriched book folders found locally under ${SOURCE_ROOT}.\n`);

  // Fetch all existing rows in resources_v2
  console.log("Fetching resources_v2 catalog from database...");
  const allRows = await fetchAllRows('resources_v2', 'resource_id,title,category,storage_base_url,format');
  console.log(`Fetched ${allRows.length} database entries.\n`);

  // Group database entries by (title, category)
  const dbEntriesByKey = new Map();
  for (const r of allRows) {
    if (!r.title || !r.category) continue;
    const key = `${r.title.trim().toLowerCase()}::${r.category}`;
    if (!dbEntriesByKey.has(key)) {
      dbEntriesByKey.set(key, { 
        title: r.title, 
        category: r.category, 
        rows: [] 
      });
    }
    dbEntriesByKey.get(key).rows.push(r);
  }

  const s3 = EXECUTE ? getS3Client() : null;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  let counts = { canonical: 0, groupA: 0, groupB: 0, failed: 0 };

  for (const book of books) {
    const key = `${book.title.toLowerCase()}::${book.category}`;
    const dbEntry = dbEntriesByKey.get(key);
    const dbRows = dbEntry?.rows || [];

    const label = dbRows.length === 0 ? 'Group A - New Ingest' : dbRows.length > 1 ? 'Group B - Duplicate Consolidate' : 'Canonical - Standard match';
    console.log(`[${label}] "${book.title}" (${book.category}) — ${dbRows.length} existing row(s).`);

    try {
      const result = await syncOneBook(book, dbRows, { supabase, s3, bucket, publicUrl, execute: EXECUTE });
      if (result.group === 'new') counts.groupA++;
      else if (result.group === 'consolidated') counts.groupB++;
      else counts.canonical++;
      console.log(`  -> ${EXECUTE ? 'SUCCESS: uploaded to' : 'Would upload to'} ${result.storageBaseUrl} (${result.chapterCount} chapters, ${result.imageCount} images).`);
    } catch (err) {
      console.error(`  [error] ${err.message}`);
      counts.failed++;
    }
  }

  console.log('\n=== PIPELINE RUN SUMMARY ===');
  console.log(`Group A (Newly Ingested): ${counts.groupA}`);
  console.log(`Group B (Consolidated Duplicates): ${counts.groupB}`);
  console.log(`Standard Canonical Matches: ${counts.canonical}`);
  console.log(`Failed runs: ${counts.failed}`);
  
  if (!EXECUTE) {
    console.log('\nDry run completed. Re-run with --execute to perform write actions.');
  } else {
    console.log('\nSynchronizations finished successfully.');
  }
}

// Guard main()'s CLI run behind direct-execution so api/admin/save-resource.js
// can `import` this module's helpers (getBookFolder, syncOneBook, fetchAllRows,
// getS3Client/uploadToR2 re-exports) for its books-publish action without
// that import side-effecting a full 122-book sync to production.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { getBookFolder, syncOneBook, fetchAllRows, getS3Client, uploadToR2, supabase };
