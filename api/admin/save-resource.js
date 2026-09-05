import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';
import { getBookFolder, syncOneBook, getS3Client } from '../../scripts/sync_books_to_r2.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Book-content-editor actions (type: 'books-*') live in this same file
// rather than their own api/admin/books/*.js functions because Vercel
// Hobby caps a deployment at 12 serverless functions and api/ was already
// at that cap (see api/admin/admins.js's docstring for the same reasoning).
function checkAdminSecret(req, res) {
  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

const BOOKS_ROOT = path.resolve(process.cwd(), 'public', 'books');
const BOOK_CATEGORIES = ['Guide', 'Precis'];

/**
 * POST /api/admin/save-resource with { type: 'books-list' }
 *
 * Lists every book under public/books/{Guide,Precis} by reading each
 * metadata.json -- the admin book browser can't discover book folders on
 * its own since public/books is served as static files with no directory
 * index. Chapter *content* doesn't need an endpoint: once the client has
 * a book's chapters[].file_name from this response, it fetches the JSON
 * directly from /books/<category>/<folder>/chapters/chapter-N.json like
 * the candidate-facing reader does against R2.
 *
 * Also attaches each book's issue counts from content-issues-report.json
 * (scripts/scan_content_issues.mjs) when that report exists, so the
 * browser can sort/flag by how much work a book actually needs.
 */
async function handleBooksList(req, res) {
  if (!checkAdminSecret(req, res)) return;

  // issuesByBook stays null (not {}) when no report has ever been generated,
  // so the client can tell "scanned and clean" (zero-count object) apart
  // from "never scanned" (null) -- both look like "no issues" otherwise.
  let issuesByBook = null;
  try {
    const reportPath = path.resolve(process.cwd(), 'content-issues-report.json');
    if (fs.existsSync(reportPath)) {
      issuesByBook = {};
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      for (const issue of report.issues || []) {
        const key = `${issue.category}/${issue.book}`;
        if (!issuesByBook[key]) issuesByBook[key] = { high: 0, medium: 0, low: 0 };
        issuesByBook[key][issue.severity] = (issuesByBook[key][issue.severity] || 0) + 1;
      }
    }
  } catch (e) {
    console.error('[admin/save-resource:books-list] Failed to read content-issues-report.json:', e.message);
  }

  const getIssueCounts = (key) => (issuesByBook ? (issuesByBook[key] || { high: 0, medium: 0, low: 0 }) : null);

  const books = [];
  for (const category of BOOK_CATEGORIES) {
    const categoryDir = path.join(BOOKS_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const folder of fs.readdirSync(categoryDir)) {
      const bookDir = path.join(categoryDir, folder);
      if (!fs.statSync(bookDir).isDirectory()) continue;

      const metadataPath = path.join(bookDir, 'metadata.json');
      const key = `${category}/${folder}`;
      if (!fs.existsSync(metadataPath)) {
        books.push({ category, folder, title: folder, book_id: null, chapters: [], empty: true, issueCounts: getIssueCounts(key) });
        continue;
      }
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        books.push({
          category,
          folder,
          book_id: metadata.book_id,
          title: metadata.title || folder,
          source_file: metadata.source_file || null,
          chapter_count: metadata.chapter_count ?? metadata.chapters?.length ?? 0,
          image_count: metadata.image_count ?? 0,
          chapters: metadata.chapters || [],
          empty: false,
          issueCounts: getIssueCounts(key),
        });
      } catch (e) {
        books.push({ category, folder, title: folder, book_id: null, chapters: [], empty: true, error: e.message, issueCounts: getIssueCounts(key) });
      }
    }
  }

  return res.status(200).json({ ok: true, books });
}

/**
 * POST /api/admin/save-resource with { type: 'books-issues', category, folder }
 *
 * Returns the full per-block issue list (from content-issues-report.json)
 * for one book, so the chapter browser can highlight exactly which blocks
 * scripts/scan_content_issues.mjs flagged. Kept separate from books-list
 * so the book-list page doesn't have to download every block-level issue
 * for all 122 books just to render per-book counts.
 */
async function handleBooksIssues(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { category, folder } = req.body || {};
  if (!BOOK_CATEGORIES.includes(category) || !folder) {
    return res.status(400).json({ ok: false, error: 'Invalid category or folder' });
  }

  try {
    const reportPath = path.resolve(process.cwd(), 'content-issues-report.json');
    if (!fs.existsSync(reportPath)) {
      return res.status(200).json({ ok: true, issues: [], scanned: false });
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const issues = (report.issues || []).filter((i) => i.category === category && i.book === folder);
    return res.status(200).json({ ok: true, issues, scanned: true, generatedAt: report.generatedAt });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'r2-upload', key, contentType, dataBase64 }
 *
 * Proxies a single file to Cloudflare R2 using backend-only env vars.
 * Used by src/lib/r2Uploader.js — that file used to hold the R2 account ID,
 * access key, and secret access key as literal strings, which shipped them
 * into the browser bundle (a live write-credential leak into a public repo).
 * Gated by the same shared x-admin-api-secret header as the redemption
 * admin endpoints; not real auth (see AdminLogin.jsx), just closes this off
 * from being a fully public write API.
 */
async function handleR2Upload(req, res) {
  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { key, contentType, dataBase64 } = req.body;
  if (!key || !dataBase64) {
    return res.status(400).json({ ok: false, error: 'Missing key or file data' });
  }

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2Bucket = process.env.R2_BUCKET_NAME;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  if (!r2AccountId || !r2Bucket || !r2AccessKeyId || !r2SecretAccessKey || !r2PublicUrl) {
    console.error('[admin/save-resource] Missing R2 env vars on server');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 credentials not set' });
  }

  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
    });

    await s3Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: Buffer.from(dataBase64, 'base64'),
      ContentType: contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000',
    }));

    return res.status(200).json({ ok: true, url: `${r2PublicUrl}/${key}` });
  } catch (err) {
    console.error('[admin/save-resource] R2 upload error:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to upload to R2' });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-save-chapter', category, folder, fileName, chapterData }
 *
 * Writes one chapter's edited blocks back to public/books on disk. Only
 * works against the local dev server -- Vercel's deployed filesystem is
 * read-only (process.env.VERCEL is set on every Vercel deployment,
 * preview or production), so a write there fails loudly instead of
 * silently no-op'ing. Content curation happens from this repo on the
 * editor's machine; scripts/sync_books_to_r2.mjs (wrapped by the
 * "Publish" action in a later phase) is what actually ships an edit to
 * candidates.
 *
 * Also patches metadata.json's blocks_count/title for this chapter so it
 * doesn't immediately show up as stale in scripts/scan_content_issues.mjs.
 */
async function handleBooksSaveChapter(req, res) {
  if (!checkAdminSecret(req, res)) return;

  if (process.env.VERCEL) {
    return res.status(503).json({ ok: false, error: "Content editing only works against the local dev server (npm run dev) -- Vercel's deployed filesystem is read-only. Edit locally and commit, then Publish to push to R2." });
  }

  const { category, folder, fileName, chapterData } = req.body || {};
  if (!BOOK_CATEGORIES.includes(category) || !folder || !fileName || !chapterData || !Array.isArray(chapterData.blocks)) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid category, folder, fileName or chapterData' });
  }
  if (!/^chapters\/chapter-\d+\.json$/.test(fileName)) {
    return res.status(400).json({ ok: false, error: 'Invalid fileName' });
  }

  const resolvedBookDir = path.resolve(BOOKS_ROOT, category, folder);
  if (!resolvedBookDir.startsWith(BOOKS_ROOT + path.sep) || !fs.existsSync(resolvedBookDir)) {
    return res.status(400).json({ ok: false, error: 'Unknown book folder' });
  }
  const chapterPath = path.resolve(resolvedBookDir, fileName);
  if (!chapterPath.startsWith(resolvedBookDir + path.sep) || !fs.existsSync(chapterPath)) {
    return res.status(400).json({ ok: false, error: 'Unknown chapter file' });
  }

  try {
    fs.writeFileSync(chapterPath, JSON.stringify(chapterData, null, 2) + '\n');

    const metadataPath = path.join(resolvedBookDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const entry = (metadata.chapters || []).find((c) => c.file_name === fileName);
      if (entry) {
        entry.blocks_count = chapterData.blocks.length;
        if (chapterData.title) entry.title = chapterData.title;
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/save-resource:books-save-chapter] write failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

function genBookId() {
  return Math.random().toString(36).slice(2, 9);
}

// A book folder name is a plain single path segment: no separators, no
// "..", not empty. Same shape validation for source and destination in
// duplicate/create/delete so a client-supplied folder name can never walk
// outside BOOKS_ROOT/<category>/.
function isSafeFolderName(name) {
  return typeof name === 'string' && name.length > 0 && name.length < 200 && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..';
}

function resolveBookDir(category, folder) {
  if (!BOOK_CATEGORIES.includes(category) || !isSafeFolderName(folder)) return null;
  const resolved = path.resolve(BOOKS_ROOT, category, folder);
  if (!resolved.startsWith(path.join(BOOKS_ROOT, category) + path.sep)) return null;
  return resolved;
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// Applies literal find->replace pairs to every string value found anywhere
// in a JSON-shaped value (recursing through objects/arrays). Used by
// books-duplicate to rebrand a cloned book's text -- e.g. turning a
// Bihar_GS clone into Jharkhand_GS by replacing "Bihar" with "Jharkhand"
// across every chapter, the same rebrand step scripts/duplicate_enriched_books.mjs
// did by hand for one specific set of books.
function deepReplaceStrings(value, pairs) {
  if (typeof value === 'string') {
    let out = value;
    for (const { find, replace } of pairs) {
      if (find) out = out.split(find).join(replace ?? '');
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => deepReplaceStrings(v, pairs));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepReplaceStrings(v, pairs);
    return out;
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TRANSIENT_FS_ERROR_CODES = new Set(['EPERM', 'ENOTEMPTY', 'EBUSY']);

// A path just deleted via books-delete can stay in a transient
// locked/"pending delete" state on this drive for a moment (see
// handleBooksDelete's own retry loop) -- long enough that immediately
// creating something new at the same path can throw EPERM/EBUSY even
// though the delete already reported success. Retries only the specific
// error codes that mean "this is a lock, not a real problem"; anything
// else (bad JSON, disk full, permissions genuinely wrong) rethrows on the
// first try.
async function retryTransientFsOp(fn, { attempts = 4, delayMs = 600 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt >= attempts - 1 || !TRANSIENT_FS_ERROR_CODES.has(e.code)) throw e;
      await sleep(delayMs);
    }
  }
}

function requireLocalFilesystem(res) {
  if (process.env.VERCEL) {
    res.status(503).json({ ok: false, error: "This action only works against the local dev server (npm run dev) -- Vercel's deployed filesystem is read-only." });
    return false;
  }
  return true;
}

/**
 * POST /api/admin/save-resource with { type: 'books-create', category, folder, title }
 *
 * Creates a blank book: metadata.json + a single empty chapter-1.json.
 * For content with no source docx to enrich -- e.g. a book authored
 * directly in the editor rather than through the ingestion pipeline.
 */
async function handleBooksCreate(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!requireLocalFilesystem(res)) return;

  const { category, folder, title } = req.body || {};
  const bookDir = resolveBookDir(category, folder);
  if (!bookDir || !title?.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid category, folder or title' });
  }
  if (fs.existsSync(bookDir)) {
    return res.status(409).json({ ok: false, error: `${category}/${folder} already exists` });
  }

  try {
    await retryTransientFsOp(() => fs.mkdirSync(path.join(bookDir, 'chapters'), { recursive: true }));
    const bookId = genBookId();
    const metadata = {
      book_id: bookId,
      title: title.trim(),
      source_file: null,
      category,
      chapter_count: 1,
      image_count: 0,
      chapters: [{ title: 'Chapter 1', order: 1, enriched: true, blocks_count: 0, file_name: 'chapters/chapter-1.json' }],
    };
    fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    fs.writeFileSync(path.join(bookDir, 'chapters', 'chapter-1.json'), JSON.stringify({ id: genBookId(), title: 'Chapter 1', order: 1, blocks: [] }, null, 2) + '\n');
    return res.status(200).json({ ok: true, category, folder });
  } catch (e) {
    console.error('[admin/save-resource:books-create] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-duplicate', sourceCategory, sourceFolder, destCategory, destFolder, newTitle, findReplace }
 *
 * Clones an entire book folder (metadata.json + chapters/ + images/) to a
 * new folder, assigns it a fresh book_id, and optionally rewrites every
 * string in the clone via literal find/replace pairs -- generalizes what
 * scripts/duplicate_enriched_books.mjs did by hand for one hardcoded set
 * of Precis subject books into a reusable action for any book (e.g.
 * cloning a state's GS guide into a new state and rebranding the state
 * name throughout).
 */
async function handleBooksDuplicate(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!requireLocalFilesystem(res)) return;

  const { sourceCategory, sourceFolder, destCategory, destFolder, newTitle, findReplace } = req.body || {};
  const sourceDir = resolveBookDir(sourceCategory, sourceFolder);
  const destDir = resolveBookDir(destCategory, destFolder);
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    return res.status(400).json({ ok: false, error: 'Unknown source book' });
  }
  if (!destDir) {
    return res.status(400).json({ ok: false, error: 'Invalid destination category or folder name' });
  }
  if (fs.existsSync(destDir)) {
    return res.status(409).json({ ok: false, error: `${destCategory}/${destFolder} already exists` });
  }
  const pairs = Array.isArray(findReplace) ? findReplace.filter((p) => p && p.find) : [];

  try {
    await retryTransientFsOp(() => copyDirRecursive(sourceDir, destDir));

    const metadataPath = path.join(destDir, 'metadata.json');
    let metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    metadata.book_id = genBookId();
    metadata.category = destCategory;
    metadata.title = newTitle?.trim() || metadata.title;
    if (pairs.length) metadata = deepReplaceStrings(metadata, pairs);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');

    if (pairs.length) {
      for (const chapter of metadata.chapters || []) {
        const chapterPath = path.join(destDir, chapter.file_name);
        if (!fs.existsSync(chapterPath)) continue;
        const chapterData = deepReplaceStrings(JSON.parse(fs.readFileSync(chapterPath, 'utf8')), pairs);
        fs.writeFileSync(chapterPath, JSON.stringify(chapterData, null, 2) + '\n');
      }
    }

    return res.status(200).json({ ok: true, category: destCategory, folder: destFolder });
  } catch (e) {
    console.error('[admin/save-resource:books-duplicate] failed:', e.message);
    // Best-effort cleanup of a partially-written clone so a failed attempt
    // doesn't block retrying under the same destination name.
    try { fs.rmSync(destDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 400 }); } catch { /* ignore */ }
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-delete', category, folder }
 *
 * Deletes a book folder entirely. Exists mainly to clean up after
 * books-create/books-duplicate mistakes without dropping to a filesystem
 * outside the editor -- this is destructive and local-only, no undo beyond
 * git (which won't help for a book that was never committed).
 */
async function handleBooksDelete(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!requireLocalFilesystem(res)) return;

  const { category, folder } = req.body || {};
  const bookDir = resolveBookDir(category, folder);
  if (!bookDir || !fs.existsSync(bookDir)) {
    return res.status(400).json({ ok: false, error: 'Unknown book' });
  }

  // Windows (and especially a cloud-synced drive letter, which this repo
  // can live on) can hold the directory's own handle -- or a transient
  // sync-status file inside it -- well after the real content is gone,
  // observed here taking upward of 20s to release on its own. Several
  // short rounds with real waits between them absorb the common case
  // without either tying up the request for 20s+ on every delete or
  // giving up after the very first race.
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(750);
    try {
      fs.rmSync(bookDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
      return res.status(200).json({ ok: true });
    } catch (e) {
      lastError = e;
    }
  }

  // Every real file under bookDir is reliably gone by now (rmSync removes
  // depth-first, so only the final rmdir of the now-empty directory can
  // still be racing a lock) -- if the directory is empty, the book is
  // functionally deleted even though the empty shell hasn't been reclaimed
  // yet. Treat that as success rather than block the request further; the
  // leftover empty folder is harmless and books-list already has a
  // category for it ("empty folder").
  let remaining;
  try { remaining = fs.readdirSync(bookDir); } catch { remaining = null; }
  if (remaining === null || remaining.length === 0) {
    try { fs.rmdirSync(bookDir); } catch { /* fine either way, see above */ }
    return res.status(200).json({ ok: true });
  }

  console.error('[admin/save-resource:books-delete] failed:', lastError.message);
  return res.status(500).json({ ok: false, error: lastError.message });
}

/**
 * POST /api/admin/save-resource with { type: 'books-publish', category, folder }
 *
 * Phase 4 of the book-content-editor plan: pushes one book's current local
 * JSON to R2 and upserts its resources_v2 row(s), so edits made in the
 * chapter editor actually reach the candidate-facing app instead of sitting
 * in public/books until someone remembers to run the bulk sync script.
 * Reuses scripts/sync_books_to_r2.mjs's syncOneBook() -- the exact same
 * logic the bulk `node scripts/sync_books_to_r2.mjs --execute` run uses --
 * scoped to this one book instead of scanning all ~122.
 */
async function handleBooksPublish(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!requireLocalFilesystem(res)) return;

  const { category, folder } = req.body || {};
  if (!BOOK_CATEGORIES.includes(category) || !folder) {
    return res.status(400).json({ ok: false, error: 'Missing category or folder' });
  }

  const book = getBookFolder(category, folder);
  if (!book) {
    return res.status(400).json({ ok: false, error: 'Not a valid book folder (missing metadata.json or chapters)' });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!supabaseUrl || !bucket || !publicUrl) {
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: Supabase/R2 env vars not set' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);

    // ilike for a case-insensitive match against sync_books_to_r2.mjs's own
    // title matching (trimmed, case-insensitive) -- % and _ are escaped
    // first so a title containing either doesn't act as a SQL wildcard.
    // Paginated: some titles in this table have 1000+ duplicate rows (a
    // pre-existing data-hygiene issue, not something this action fixes),
    // well past PostgREST's per-request row cap.
    const escapedTitle = book.title.trim().replace(/[\\%_]/g, '\\$&');
    let dbRows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: fetchError } = await supabase
        .from('resources_v2')
        .select('resource_id,title,category,storage_base_url,format')
        .eq('category', category)
        .ilike('title', escapedTitle)
        .range(from, from + 999);
      if (fetchError) throw new Error(fetchError.message);
      dbRows = dbRows.concat(data);
      if (data.length < 1000) break;
    }

    const s3 = getS3Client();
    const result = await syncOneBook(book, dbRows, { supabase, s3, bucket, publicUrl, execute: true });
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('[admin/save-resource:books-publish] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.body?.type === 'r2-upload') {
    return handleR2Upload(req, res);
  }

  if (req.body?.type === 'books-list') {
    return handleBooksList(req, res);
  }

  if (req.body?.type === 'books-issues') {
    return handleBooksIssues(req, res);
  }

  if (req.body?.type === 'books-save-chapter') {
    return handleBooksSaveChapter(req, res);
  }

  if (req.body?.type === 'books-create') {
    return handleBooksCreate(req, res);
  }

  if (req.body?.type === 'books-duplicate') {
    return handleBooksDuplicate(req, res);
  }

  if (req.body?.type === 'books-delete') {
    return handleBooksDelete(req, res);
  }

  if (req.body?.type === 'books-publish') {
    return handleBooksPublish(req, res);
  }

  if (!supabaseUrl) {
    return res.status(500).json({ error: 'Missing Supabase credentials on server' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);

    // Check if this is a V2 resource save call
    if (req.body.metadata || req.body.version === 2) {
      const { metadata, r2Urls } = req.body;
      if (!metadata || !metadata.resource_id) {
        return res.status(400).json({ error: 'Invalid resource metadata provided' });
      }

      const record = {
        resource_id: metadata.resource_id,
        file_hash: metadata.file_hash || '',
        source_file: metadata.source_file || '',
        title: metadata.title,
        exam_name: metadata.exam_name || 'General Exam',
        subject: metadata.subject || 'General',
        category: metadata.category || 'Guide',
        conducting_body: metadata.conducting_body || '',
        website_url: metadata.website_url || '',
        chapter_count: metadata.chapter_count || 0,
        storage_base_url: r2Urls?.storage_base_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/`,
        metadata_url: r2Urls?.metadata_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/metadata.json`,
        thumbnail_url: r2Urls?.thumbnail_url || `${process.env.R2_PUBLIC_URL || 'https://pub-82194047da2d4c1c8ff3a6284533ac21.r2.dev'}/structured_resources/${metadata.resource_id}/thumbnail.png`,
        is_freemium: metadata.is_freemium || false,
        is_locked: metadata.is_locked !== undefined ? metadata.is_locked : true,
        status: 'Published',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('resources_v2')
        .upsert(record, { onConflict: 'resource_id' })
        .select();

      if (error) {
        console.error('Supabase V2 Upsert Error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data });
    }

    // Standard V1 resource save call
    const { id, dataToSave } = req.body;
    if (!dataToSave) {
      return res.status(400).json({ error: 'No data provided' });
    }

    let result;
    if (id) {
      result = await supabase
        .from('resources')
        .update(dataToSave)
        .eq('id', id)
        .select();
    } else {
      result = await supabase
        .from('resources')
        .insert([dataToSave])
        .select();
    }

    const { data, error } = result;
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Save Resource Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
