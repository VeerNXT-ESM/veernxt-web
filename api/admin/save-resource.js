import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';
import { getS3Client, uploadToR2, generateResourceId } from '../../scripts/ingest-drive-content.js';

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

const BOOK_CATEGORIES = ['Guide', 'Precis'];

// R2 is the only source of truth for book content -- these actions read
// and write Cloudflare R2 + the resources_v2 table directly, nothing on
// local disk, so they work identically whether this runs on `npm run dev`
// or on a real Vercel deployment. (An earlier version of this editor
// treated public/books on local disk as the source of truth with R2 as a
// "publish" target; that's gone now -- the content team edits straight
// against what's actually live, from wherever the admin site is deployed.)

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);
}

function getR2PublicUrl() {
  return process.env.R2_PUBLIC_URL;
}

function getR2Bucket() {
  return process.env.R2_BUCKET_NAME;
}

// resources_v2.title has heavy pre-existing duplication (the same book
// linked from many exams, one row per link -- see books-list's own
// comment), so every lookup here matches by title, not row id. ilike is
// used for a case-insensitive match; % and _ are escaped first so a title
// containing either character doesn't act as a SQL wildcard.
function escapeIlike(str) {
  return str.trim().replace(/[\\%_]/g, '\\$&');
}

// Paginated: some titles in resources_v2 have 1000+ duplicate rows, well
// past PostgREST's per-request row cap.
async function fetchRowsByTitle(supabase, category, title) {
  const escaped = escapeIlike(title);
  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('resources_v2')
      .select('resource_id,title,category,storage_base_url,format,chapter_count')
      .eq('category', category)
      .ilike('title', escaped)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows = rows.concat(data);
    if (data.length < 1000) break;
  }
  return rows;
}

// Of however many resources_v2 rows share a title, picks the storage
// location most of them already agree on (or the only one, in the common
// case). Every books-save-chapter/books-delete call also re-points every
// row in the group at whatever this returns, so duplicate rows converge
// on one location a little more each time a book is touched here, instead
// of the group drifting further apart.
function pickCanonicalStorageBaseUrl(rows) {
  const counts = new Map();
  for (const r of rows) {
    if (!r.storage_base_url) continue;
    counts.set(r.storage_base_url, (counts.get(r.storage_base_url) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [url, count] of counts) {
    if (count > bestCount) {
      best = url;
      bestCount = count;
    }
  }
  return best;
}

// storage_base_url is a full public URL (e.g.
// "https://pub-xxx.r2.dev/structured_resources/blocks/Guide/<id>/");
// returns just the R2 object key prefix, no trailing slash. Returns null
// if the URL doesn't start with this deployment's own R2_PUBLIC_URL --
// this project migrated R2 accounts once already (R2_OLD_* env vars still
// exist), so a stale row could point at the old bucket, and treating that
// as "can't resolve" is much safer than guessing.
function prefixFromStorageBaseUrl(storageBaseUrl, publicUrl) {
  if (!storageBaseUrl || !publicUrl) return null;
  const base = publicUrl.replace(/\/$/, '') + '/';
  if (!storageBaseUrl.startsWith(base)) return null;
  return storageBaseUrl.slice(base.length).replace(/\/$/, '');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function listR2Keys(s3, bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const resp = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/`, ContinuationToken: continuationToken }));
    for (const obj of resp.Contents || []) keys.push(obj.Key);
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deleteR2Keys(s3, bucket, keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })) } }));
  }
}

function genBookId() {
  return Math.random().toString(36).slice(2, 9);
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

/**
 * POST /api/admin/save-resource with { type: 'books-list' }
 *
 * Lists every Guide/Precis book by grouping resources_v2 rows by
 * (title, category) -- this table has heavy pre-existing duplication (the
 * same book linked from many exams, one row per link; some titles have
 * 1000+ rows), so this shows one representative per group, not one row
 * per DB row. Paginated past PostgREST's 1000-row response cap.
 *
 * Also attaches each book's issue counts from content-issues-report.json
 * (scripts/scan_content_issues.mjs) when that report exists, matched by
 * title -- that report is generated from a local snapshot of these books
 * and can go stale as content gets edited here, but it's still a useful
 * starting point for "which books need work."
 */
async function handleBooksList(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  try {
    const supabase = getSupabaseAdmin();

    let rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('resources_v2')
        .select('resource_id,title,category,storage_base_url,chapter_count')
        .in('category', BOOK_CATEGORIES)
        .eq('format', 'blocks')
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      rows = rows.concat(data);
      if (data.length < 1000) break;
    }

    const groups = new Map();
    for (const r of rows) {
      if (!r.title) continue;
      const key = `${r.category}::${r.title.trim().toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, { title: r.title.trim(), category: r.category, rows: [] });
      groups.get(key).rows.push(r);
    }

    let issuesByTitle = null;
    try {
      const reportPath = path.resolve(process.cwd(), 'content-issues-report.json');
      if (fs.existsSync(reportPath)) {
        issuesByTitle = {};
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        for (const issue of report.issues || []) {
          const key = `${issue.category}::${issue.book?.trim().toLowerCase()}`;
          if (!issuesByTitle[key]) issuesByTitle[key] = { high: 0, medium: 0, low: 0 };
          issuesByTitle[key][issue.severity] = (issuesByTitle[key][issue.severity] || 0) + 1;
        }
      }
    } catch (e) {
      console.error('[admin/save-resource:books-list] Failed to read content-issues-report.json:', e.message);
    }

    const publicUrl = getR2PublicUrl();
    const books = [];
    for (const group of groups.values()) {
      const canonicalUrl = pickCanonicalStorageBaseUrl(group.rows);
      if (!canonicalUrl || !prefixFromStorageBaseUrl(canonicalUrl, publicUrl)) continue; // broken/unresolvable -- nothing to open
      const canonicalRow = group.rows.find((r) => r.storage_base_url === canonicalUrl) || group.rows[0];
      const issueKey = `${group.category}::${group.title.toLowerCase()}`;
      books.push({
        resourceId: canonicalRow.resource_id,
        title: group.title,
        category: group.category,
        storageBaseUrl: canonicalUrl,
        chapterCount: canonicalRow.chapter_count ?? null,
        duplicateRowCount: group.rows.length,
        issueCounts: issuesByTitle ? (issuesByTitle[issueKey] || { high: 0, medium: 0, low: 0 }) : null,
      });
    }

    return res.status(200).json({ ok: true, books });
  } catch (e) {
    console.error('[admin/save-resource:books-list] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-get', resourceId }
 *
 * Resolves one book's live title/category/canonical storage location by
 * resource_id -- the chapter browser needs this on a fresh page load
 * (direct link or refresh), since the category+resourceId in the URL
 * alone isn't enough to know where its content actually lives in R2.
 */
async function handleBooksGet(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId } = req.body || {};
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Missing resourceId' });
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase.from('resources_v2').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchRowsByTitle(supabase, row.category, row.title);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    if (!canonicalUrl) return res.status(500).json({ ok: false, error: 'Could not resolve storage location for this book' });

    return res.status(200).json({ ok: true, resourceId: row.resource_id, title: row.title, category: row.category, storageBaseUrl: canonicalUrl });
  } catch (e) {
    console.error('[admin/save-resource:books-get] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-issues', category, title }
 *
 * Returns the full per-block issue list (from content-issues-report.json)
 * for one book, so the chapter browser can highlight exactly which blocks
 * scripts/scan_content_issues.mjs flagged. Kept separate from books-list
 * so the book-list page doesn't have to download every block-level issue
 * for all ~122 books just to render per-book counts.
 */
async function handleBooksIssues(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { category, title } = req.body || {};
  if (!BOOK_CATEGORIES.includes(category) || !title) {
    return res.status(400).json({ ok: false, error: 'Invalid category or title' });
  }

  try {
    const reportPath = path.resolve(process.cwd(), 'content-issues-report.json');
    if (!fs.existsSync(reportPath)) {
      return res.status(200).json({ ok: true, issues: [], scanned: false });
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const norm = title.trim().toLowerCase();
    const issues = (report.issues || []).filter((i) => i.category === category && i.book?.trim().toLowerCase() === norm);
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
 * { type: 'books-save-chapter', resourceId, fileName, chapterData }
 *
 * Writes one chapter's edited blocks straight to R2, at whatever prefix
 * this book's resources_v2 rows already agree it lives at. Also patches
 * metadata.json's per-chapter title/blocks_count and the DB's own
 * chapter_count to match, and re-points every duplicate row sharing this
 * title+category at the canonical location (see pickCanonicalStorageBaseUrl).
 */
async function handleBooksSaveChapter(req, res) {
  if (!checkAdminSecret(req, res)) return;

  const { resourceId, fileName, chapterData } = req.body || {};
  if (!resourceId || !fileName || !chapterData || !Array.isArray(chapterData.blocks)) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid resourceId, fileName or chapterData' });
  }
  if (!/^chapters\/chapter-\d+\.json$/.test(fileName)) {
    return res.status(400).json({ ok: false, error: 'Invalid fileName' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources_v2').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchRowsByTitle(supabase, row.category, row.title);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);
    if (!prefix) return res.status(500).json({ ok: false, error: 'Could not resolve storage location for this book' });

    const s3 = getS3Client();
    await uploadToR2(s3, bucket, `${prefix}/${fileName}`, Buffer.from(JSON.stringify(chapterData, null, 2)), 'application/json');

    let realChapterCount = null;
    try {
      const metadata = await fetchJson(`${canonicalUrl}metadata.json`);
      const entry = (metadata.chapters || []).find((c) => c.file_name === fileName);
      if (entry) {
        entry.blocks_count = chapterData.blocks.length;
        if (chapterData.title) entry.title = chapterData.title;
      }
      realChapterCount = metadata.chapters?.length ?? null;
      await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
    } catch (e) {
      // The chapter itself already saved successfully above -- a failure
      // here just means metadata.json's display title/count go stale,
      // not that the edit was lost.
      console.error('[admin/save-resource:books-save-chapter] metadata.json patch failed (chapter content still saved):', e.message);
    }

    const updatePatch = { format: 'blocks', storage_base_url: canonicalUrl, metadata_url: `${canonicalUrl}metadata.json` };
    if (realChapterCount !== null) updatePatch.chapter_count = realChapterCount;
    const { error: updateError } = await supabase.from('resources_v2').update(updatePatch).eq('category', row.category).ilike('title', escapeIlike(row.title));
    if (updateError) console.error('[admin/save-resource:books-save-chapter] row consolidation update failed (content still saved):', updateError.message);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/save-resource:books-save-chapter] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-create', title, category }
 *
 * Creates a blank book straight in R2: metadata.json + a single empty
 * chapter-1.json under a freshly generated resource id, plus its
 * resources_v2 row. For content with no source docx to enrich -- e.g. a
 * book authored directly in the editor rather than through the ingestion
 * pipeline.
 */
async function handleBooksCreate(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { title, category } = req.body || {};
  if (!BOOK_CATEGORIES.includes(category) || !title?.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid title or category' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();

    // Refuse a duplicate title+category rather than silently adding to the
    // pile -- Duplicate Book is the path for "another one like this", New
    // Book is for something that doesn't exist yet.
    const existing = await fetchRowsByTitle(supabase, category, title.trim());
    if (existing.length > 0) return res.status(409).json({ ok: false, error: `A ${category} book titled "${title.trim()}" already exists` });

    const newResourceId = generateResourceId(title.trim(), '', category, '');
    const storageBaseUrl = `${publicUrl}/structured_resources/blocks/${category}/${newResourceId}/`;
    const prefix = `structured_resources/blocks/${category}/${newResourceId}`;

    const s3 = getS3Client();
    const metadata = {
      book_id: genBookId(),
      title: title.trim(),
      source_file: null,
      category,
      chapter_count: 1,
      image_count: 0,
      chapters: [{ title: 'Chapter 1', order: 1, enriched: true, blocks_count: 0, file_name: 'chapters/chapter-1.json' }],
    };
    await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
    await uploadToR2(s3, bucket, `${prefix}/chapters/chapter-1.json`, Buffer.from(JSON.stringify({ id: genBookId(), title: 'Chapter 1', order: 1, blocks: [] }, null, 2)), 'application/json');

    const { error } = await supabase.from('resources_v2').insert({
      resource_id: newResourceId,
      file_hash: genBookId() + genBookId(),
      title: title.trim(),
      category,
      format: 'blocks',
      storage_base_url: storageBaseUrl,
      metadata_url: `${storageBaseUrl}metadata.json`,
      status: 'Published',
      chapter_count: 1,
      is_freemium: false,
      is_locked: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    return res.status(200).json({ ok: true, resourceId: newResourceId });
  } catch (e) {
    console.error('[admin/save-resource:books-create] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-duplicate', sourceResourceId, newTitle, destCategory, findReplace }
 *
 * Clones every R2 object under the source book's prefix to a fresh
 * resource id (images via a server-side R2 copy; metadata.json and every
 * chapter file downloaded, optionally rewritten via literal find/replace
 * pairs, and re-uploaded), then inserts a new resources_v2 row. Generalizes
 * what scripts/duplicate_enriched_books.mjs did by hand for one hardcoded
 * set of Precis subject books into a reusable action for any book (e.g.
 * cloning a state's GS guide into a new state and rebranding the state
 * name throughout).
 */
async function handleBooksDuplicate(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { sourceResourceId, newTitle, destCategory, findReplace } = req.body || {};
  if (!sourceResourceId || !newTitle?.trim() || !BOOK_CATEGORIES.includes(destCategory)) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid sourceResourceId, newTitle or destCategory' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: sourceRow, error: rowError } = await supabase.from('resources_v2').select('resource_id,title,category,storage_base_url').eq('resource_id', sourceResourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!sourceRow) return res.status(404).json({ ok: false, error: 'Source book not found' });

    const sourceGroupRows = await fetchRowsByTitle(supabase, sourceRow.category, sourceRow.title);
    const sourceCanonicalUrl = pickCanonicalStorageBaseUrl(sourceGroupRows.length ? sourceGroupRows : [sourceRow]);
    const sourcePrefix = prefixFromStorageBaseUrl(sourceCanonicalUrl, publicUrl);
    if (!sourcePrefix) return res.status(500).json({ ok: false, error: 'Could not resolve source storage location' });

    const existingDest = await fetchRowsByTitle(supabase, destCategory, newTitle.trim());
    if (existingDest.length > 0) return res.status(409).json({ ok: false, error: `A ${destCategory} book titled "${newTitle.trim()}" already exists` });

    const s3 = getS3Client();
    const objectKeys = await listR2Keys(s3, bucket, sourcePrefix);
    if (objectKeys.length === 0) return res.status(400).json({ ok: false, error: 'Source book has no content in R2' });

    const newResourceId = generateResourceId(newTitle.trim(), '', destCategory, '');
    const destPrefix = `structured_resources/blocks/${destCategory}/${newResourceId}`;
    const destStorageBaseUrl = `${publicUrl}/structured_resources/blocks/${destCategory}/${newResourceId}/`;
    const pairs = Array.isArray(findReplace) ? findReplace.filter((p) => p && p.find) : [];

    let metadata = null;
    for (const key of objectKeys) {
      const relative = key.slice(sourcePrefix.length + 1); // strip "prefix/"
      const destKey = `${destPrefix}/${relative}`;

      if (relative === 'metadata.json' || relative.startsWith('chapters/')) {
        const content = await fetchJson(`${publicUrl}/${key}`);
        const transformed = pairs.length ? deepReplaceStrings(content, pairs) : content;
        if (relative === 'metadata.json') {
          metadata = transformed; // uploaded once below, after title/id/category are patched in
        } else {
          await uploadToR2(s3, bucket, destKey, Buffer.from(JSON.stringify(transformed, null, 2)), 'application/json');
        }
      } else {
        // Images etc. -- binary, no text transform, server-side copy (no download/reupload round trip)
        await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `${bucket}/${encodeURIComponent(key)}`, Key: destKey }));
      }
    }

    if (!metadata) return res.status(500).json({ ok: false, error: 'Source book has no metadata.json' });
    metadata.book_id = genBookId();
    metadata.title = newTitle.trim();
    metadata.category = destCategory;
    await uploadToR2(s3, bucket, `${destPrefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');

    const { error } = await supabase.from('resources_v2').insert({
      resource_id: newResourceId,
      file_hash: genBookId() + genBookId(),
      title: newTitle.trim(),
      category: destCategory,
      format: 'blocks',
      storage_base_url: destStorageBaseUrl,
      metadata_url: `${destStorageBaseUrl}metadata.json`,
      status: 'Published',
      chapter_count: metadata.chapters?.length ?? 0,
      is_freemium: false,
      is_locked: true,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    return res.status(200).json({ ok: true, resourceId: newResourceId });
  } catch (e) {
    console.error('[admin/save-resource:books-duplicate] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-delete', resourceId }
 *
 * Deletes every R2 object under the book's canonical prefix, then deletes
 * every resources_v2 row sharing that title+category -- leaving any of
 * them behind would just be a dangling reference to now-missing content.
 * Destructive; the only undo is re-Duplicating from a version still open
 * in someone's browser, or re-ingesting from a source doc if one exists.
 */
async function handleBooksDelete(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId } = req.body || {};
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Missing resourceId' });
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources_v2').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchRowsByTitle(supabase, row.category, row.title);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);

    if (prefix) {
      const s3 = getS3Client();
      const keys = await listR2Keys(s3, bucket, prefix);
      if (keys.length > 0) await deleteR2Keys(s3, bucket, keys);
    }

    const { error } = await supabase.from('resources_v2').delete().eq('category', row.category).ilike('title', escapeIlike(row.title));
    if (error) throw new Error(error.message);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/save-resource:books-delete] failed:', e.message);
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

  if (req.body?.type === 'books-get') {
    return handleBooksGet(req, res);
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
