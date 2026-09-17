import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mammoth from 'mammoth';
import { getS3Client, uploadToR2, generateResourceId } from '../../scripts/lib/ingest-drive-content.js';
import { parseDocxToSemanticModelNode } from '../../scripts/lib/docxParser.mjs';
import { parseHtmlToBlocks, generateId as generateIntroBlockId, STYLE_MAP as INTRO_STYLE_MAP } from '../../scripts/convert_docx_intros_to_blocks.mjs';

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

const BOOK_CATEGORIES = ['Guide', 'Precis', 'Intro'];

// Guide/Precis legitimately have many resources rows sharing one
// (category, title) -- the same book linked from many exams -- so every
// action on "this book" groups and mutates by title. Intro resources
// don't share that pattern: they're independently-authored, exam-specific
// documents that often happen to carry a generic filename-derived title
// like "Introduction" or "1.MTS_INTRO" across dozens of unrelated exams
// (see docs/status_report.md §48.1's mislinked-Introduction audit).
// Grouping/mutating Intro rows by title would silently merge unrelated
// exams' content in the list, or worse, rename/archive/delete every one
// of them at once when only one was meant. Intro books are always scoped
// to exactly their own resource_id instead.
const TITLE_DEDUPED_CATEGORIES = ['Guide', 'Precis'];
function isTitleDedupedCategory(category) {
  return TITLE_DEDUPED_CATEGORIES.includes(category);
}

// In-memory cache for books-list responses (TTL: 60s)
const booksListCache = new Map();
const BOOKS_CACHE_TTL_MS = 60 * 1000;

function invalidateBooksCache() {
  booksListCache.clear();
}

// R2 is the only source of truth for book content -- these actions read
// and write Cloudflare R2 + the resources table directly, nothing on
// local disk, so they work identically whether this runs on `npm run dev`
// or on a real Vercel deployment. (An earlier version of this editor
// treated public/books on local disk as the source of truth with R2 as a
// "publish" target; that's gone now -- the content team edits straight
// against what's actually live, from wherever the admin site is deployed.)

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * POST /api/admin/save-resource with { type: 'docx-preview-convert', fileName, dataBase64, category }
 *
 * Runs one uploaded .docx through a parser chosen by `category`, and
 * returns the resulting book/chapters/blocks directly in the response --
 * no R2 upload, no Supabase write, nothing persisted. First step of
 * PublishContentPage.jsx's upload -> preview -> publish flow (see
 * content-publish below for the second step).
 *
 * category 'Guide'/'Precis' (or omitted): the same non-AI mechanical
 * parser scripts/convert_docx_books_to_blocks.mjs and scripts/content/
 * batch_enrich_books.mjs's own first step already use
 * (parseDocxToSemanticModelNode, scripts/lib/docxParser.mjs) -- a
 * multi-chapter book, splitting on Word's Heading 1 style.
 *
 * category 'Intro': a DIFFERENT parser (mammoth + the table-aware
 * scripts/convert_docx_intros_to_blocks.mjs) instead of
 * parseDocxToSemanticModelNode -- an Introduction is "a single simple
 * document" (see that script's own docstring), so Word H1/H2/H3 headings
 * become heading blocks at different levels rather than splitting into
 * new chapters, and <w:tbl> tables are parsed into real table blocks (the
 * book parser above never looks at tables at all). Same `{ buffer }`
 * mammoth call docxParser.mjs already uses in this same function.
 *
 * Real constraint, not fixed here: a deployed Vercel serverless function
 * caps the request body at ~4.5MB, and real master book docx files run up
 * to ~39MB (base64-encoding adds another ~33% on top). This works fully
 * against the local dev server (vite.config.js's vercelApiPlugin runs
 * this file's handler directly in Node with no such cap), but a large
 * file will 413 against the actual deployed veernxt.in admin site --
 * PublishContentPage.jsx warns the client about this before sending
 * rather than let it fail silently.
 */
async function handleDocxPreviewConvert(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { fileName, dataBase64, category } = req.body || {};
  if (!fileName || !dataBase64) {
    return res.status(400).json({ ok: false, error: 'Missing fileName or dataBase64' });
  }
  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    if (category === 'Intro') {
      const result = await mammoth.convertToHtml({ buffer }, { styleMap: INTRO_STYLE_MAP });
      const { blocks } = parseHtmlToBlocks(result.value);
      const title = fileName.replace(/\.[^/.]+$/, '');
      const book = { title, chapters: [{ id: generateIntroBlockId(), title, order: 1, blocks }] };
      return res.status(200).json({ ok: true, book });
    }
    const { book } = await parseDocxToSemanticModelNode(buffer, fileName);
    return res.status(200).json({ ok: true, book });
  } catch (e) {
    console.error('[admin/save-resource:docx-preview-convert] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'content-publish', category, fileName, book, examId?, overwrite? }
 *
 * Publishes an already-converted book/Introduction (the exact
 * { title, chapters } shape docx-preview-convert returns above -- the docx
 * itself isn't resent, just its already-parsed blocks) as a fresh
 * `resources` row. Built because the content team otherwise has no way to
 * turn a new docx into a live resource short of a developer running a CLI
 * script: see docs/status_report.md §52-53 for why -- a system-wide scan
 * found zero unconverted-but-real Intro docx left anywhere, so closing
 * content gaps depends entirely on the content team writing new ones.
 *
 * Intro and Guide/Precis attach to exams differently, so only the resource
 * creation (R2 upload + `resources` insert, works for any chapter count)
 * is shared here:
 *   - category 'Intro' is exam-specific 1:1, never more than one exam --
 *     `examId` is optional (the exam it belongs to may not exist in the
 *     catalog yet); when given, this action also upserts `lc_exam_intro`
 *     server-side (never a silent overwrite: 409 `ALREADY_HAS_INTRO`
 *     unless `overwrite: true`, same principle link_intros_to_exams.mjs
 *     already enforces). When omitted, the resource is created unlinked,
 *     to be attached later via the exam's own Resources panel once a
 *     matching exam exists.
 *   - category 'Guide'/'Precis' books are legitimately shared across many
 *     exams (the same book linked from dozens of them), so this action
 *     just creates the resource and returns its id -- the client attaches
 *     it to whichever exam(s) were picked via a direct
 *     `lc_exam_resource_map` insert, the exact same table/shape
 *     ExamResourcesPanel.jsx's own "Add Resource" flow already uses
 *     (that table already grants browser/anon writes; `resources` and
 *     `lc_exam_intro` don't, hence this server action for those).
 *
 * Mirrors link_intros_to_exams.mjs's own resourceRow/introRow shapes (its
 * lines ~422-460) and handleBooksCreate's resource-defaults convention
 * above, against `lc_exams` (the browser-reachable exam catalog
 * `lc_exam_intro.exam_id` itself FKs to) rather than the service-role-only
 * `exams` table those CLI scripts use.
 */
async function handleContentPublish(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { category, examId, fileName, book, overwrite } = req.body || {};
  const chapters = book?.chapters || [];
  if (!BOOK_CATEGORIES.includes(category) || !fileName || !chapters.length || !chapters.some((c) => c.blocks?.length)) {
    return res.status(400).json({ ok: false, error: 'Missing/invalid category, fileName, or a converted chapter with blocks' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();

    let examName = '';
    let conductingBody = '';
    if (category === 'Intro' && examId) {
      const { data: exam, error: examError } = await supabase
        .from('lc_exams')
        .select('id, name, conducting_body:lc_conducting_bodies(name)')
        .eq('id', examId)
        .maybeSingle();
      if (examError) throw new Error(examError.message);
      if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found' });
      examName = exam.name || '';
      conductingBody = exam.conducting_body?.name || '';

      // Never a silent overwrite -- checked against both places a live
      // intro can come from (see useExamContent.js's own fallback order).
      const [{ data: introRows }, { data: mapRows }] = await Promise.all([
        supabase.from('lc_exam_intro').select('resource_id').eq('exam_id', examId).limit(1),
        supabase.from('lc_exam_resource_map').select('resource_id').eq('exam_id', examId).eq('category', 'Intro').limit(1),
      ]);
      const existingResourceId = introRows?.[0]?.resource_id || mapRows?.[0]?.resource_id || null;
      if (existingResourceId && !overwrite) {
        const { data: existingResource } = await supabase.from('resources').select('title').eq('resource_id', existingResourceId).maybeSingle();
        return res.status(409).json({ ok: false, code: 'ALREADY_HAS_INTRO', existingTitle: existingResource?.title || '(untitled)' });
      }
    }

    const resourceId = generateResourceId(fileName, examName, category, '');
    const prefix = `structured_resources/blocks/${category}/${resourceId}`;
    const storageBaseUrl = `${publicUrl}/${prefix}/`;

    const metadata = {
      book_id: genBookId(),
      title: book.title,
      source_file: fileName,
      category,
      chapter_count: chapters.length,
      image_count: 0,
      chapters: chapters.map((ch, i) => ({ title: ch.title, order: ch.order ?? i + 1, enriched: false, blocks_count: ch.blocks.length, file_name: `chapters/chapter-${ch.order ?? i + 1}.json` })),
    };
    const s3 = getS3Client();
    await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
    for (const ch of chapters) {
      await uploadToR2(s3, bucket, `${prefix}/chapters/chapter-${ch.order}.json`, Buffer.from(JSON.stringify(ch, null, 2)), 'application/json');
    }

    // Same is_freemium/is_locked convention handleBooksCreate above uses:
    // Intro is always free/unlocked, Guide/Precis default to paid/locked.
    const { error: resErr } = await supabase.from('resources').insert({
      resource_id: resourceId,
      file_hash: crypto.createHash('sha256').update(JSON.stringify(chapters)).digest('hex'),
      source_file: fileName,
      title: book.title,
      exam_name: examName,
      subject: 'General',
      category,
      conducting_body: conductingBody,
      website_url: '',
      chapter_count: chapters.length,
      format: 'blocks',
      storage_base_url: storageBaseUrl,
      metadata_url: `${storageBaseUrl}metadata.json`,
      thumbnail_url: null,
      is_freemium: category === 'Intro',
      is_locked: category !== 'Intro',
      status: 'Published',
      updated_at: new Date().toISOString(),
    });
    if (resErr) throw new Error(resErr.message);

    if (category !== 'Intro' || !examId) {
      invalidateBooksCache();
      return res.status(200).json({ ok: true, resourceId });
    }

    const { error: introErr } = await supabase.from('lc_exam_intro').upsert(
      { exam_id: examId, resource_id: resourceId, manual_title: null, manual_body: null, source: 'auto', updated_at: new Date().toISOString() },
      { onConflict: 'exam_id' }
    );
    if (introErr) throw new Error(introErr.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true, resourceId });
  } catch (e) {
    console.error('[admin/save-resource:content-publish] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

function getR2PublicUrl() {
  return process.env.R2_PUBLIC_URL;
}

function getR2Bucket() {
  return process.env.R2_BUCKET_NAME;
}

// resources.title has heavy pre-existing duplication (the same book
// linked from many exams, one row per link -- see books-list's own
// comment), so every lookup here matches by title, not row id. ilike is
// used for a case-insensitive match; % and _ are escaped first so a title
// containing either character doesn't act as a SQL wildcard.
function escapeIlike(str) {
  return str.trim().replace(/[\\%_]/g, '\\$&');
}

// Paginated: some titles in resources have 1000+ duplicate rows, well
// past PostgREST's per-request row cap.
async function fetchRowsByTitle(supabase, category, title) {
  const escaped = escapeIlike(title);
  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('resources')
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

// Every resources row this "book" actually spans. Title-deduped
// categories (Guide/Precis) genuinely group by title; Intro never does
// (see TITLE_DEDUPED_CATEGORIES) -- an Intro book is always exactly the
// one row matching `row`, regardless of what its title happens to be.
async function fetchBookRows(supabase, row) {
  if (!isTitleDedupedCategory(row.category)) return [row];
  return fetchRowsByTitle(supabase, row.category, row.title);
}

// Scopes a resources-table query (an .update(...) or .delete() builder)
// to every row this book spans, same rule as fetchBookRows -- title+category
// for Guide/Precis, this one resource_id only for Intro. Use for every
// mutation that should apply to "this book" rather than "this row".
function bookRowsFilter(query, row) {
  return isTitleDedupedCategory(row.category)
    ? query.eq('category', row.category).ilike('title', escapeIlike(row.title))
    : query.eq('resource_id', row.resource_id);
}

// Of however many resources rows share a title, picks the storage
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

function replaceTextInValue(value, findStr, replaceStr, { matchCase = false, matchWholeWord = false } = {}) {
  if (!findStr || typeof findStr !== 'string') return { value, count: 0 };
  const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = matchCase ? 'g' : 'gi';
  const regex = new RegExp(pattern, flags);

  let count = 0;
  function walk(node) {
    if (typeof node === 'string') {
      const matches = node.match(regex);
      if (matches) {
        count += matches.length;
        return node.replace(regex, () => (replaceStr ?? ''));
      }
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === 'id' || k === 'type' || k === 'order') {
          out[k] = v;
        } else {
          out[k] = walk(v);
        }
      }
      return out;
    }
    return node;
  }

  const result = walk(value);
  return { value: result, count };
}

/**
 * POST /api/admin/save-resource with { type: 'books-list', category? }
 *
 * Lists books by grouping resources rows by (title, category) for Guide/Precis
 * and by resource_id for Intro. Supports optional category filtering for fast
 * scoped queries and in-memory caching.
 */
async function handleBooksList(req, res) {
  if (!checkAdminSecret(req, res)) return;
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  const reqCategory = req.body?.category;
  const categoriesToFetch = (reqCategory && BOOK_CATEGORIES.includes(reqCategory))
    ? [reqCategory]
    : BOOK_CATEGORIES;

  const cacheKey = reqCategory && BOOK_CATEGORIES.includes(reqCategory) ? reqCategory : 'all';
  const cached = booksListCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < BOOKS_CACHE_TTL_MS)) {
    return res.status(200).json({ ok: true, books: cached.books, cached: true });
  }

  try {
    const supabase = getSupabaseAdmin();
    const selectFields = 'resource_id,title,category,storage_base_url,chapter_count,status,level,state_ut,conducting_body';

    const fetchCategoryRows = async (cat) => {
      const { data: firstBatch, count, error } = await supabase
        .from('resources')
        .select(selectFields, { count: 'exact' })
        .eq('category', cat)
        .eq('format', 'blocks')
        .range(0, 999);

      if (error) throw new Error(error.message);
      let catRows = firstBatch || [];

      if (count && count > 1000) {
        const promises = [];
        for (let from = 1000; from < count; from += 1000) {
          promises.push(
            supabase
              .from('resources')
              .select(selectFields)
              .eq('category', cat)
              .eq('format', 'blocks')
              .range(from, from + 999)
          );
        }
        const results = await Promise.all(promises);
        for (const r of results) {
          if (r.error) throw new Error(r.error.message);
          if (r.data) catRows = catRows.concat(r.data);
        }
      }
      return catRows;
    };

    const catResults = await Promise.all(categoriesToFetch.map(fetchCategoryRows));
    const rows = catResults.flat();

    const groups = new Map();
    for (const r of rows) {
      if (!r.title) continue;
      const key = isTitleDedupedCategory(r.category)
        ? `${r.category}::${r.title.trim().toLowerCase()}`
        : `${r.category}::id::${r.resource_id}`;
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
      // A title can have many duplicate rows at the same canonical URL (the
      // legacy one-row-per-exam pattern, mostly archived now -- see
      // docs/status_report.md §60.5) alongside exactly one live one. Picking
      // whichever row .find() happens to hit first would surface an
      // archived duplicate as "the book" at random -- prefer a live
      // (non-Draft/Archived) row at that URL when one exists.
      const rowsAtCanonicalUrl = group.rows.filter((r) => r.storage_base_url === canonicalUrl);
      const canonicalRow = rowsAtCanonicalUrl.find((r) => !['draft', 'archived'].includes((r.status || '').toLowerCase())) || rowsAtCanonicalUrl[0] || group.rows[0];
      const issueKey = `${group.category}::${group.title.toLowerCase()}`;
      // Archived means the book itself (its live/canonical row) is Draft or
      // Archived -- not "does this title happen to have an archived
      // duplicate sitting next to its live row." The old `.some(...)` check
      // treated every book as archived the moment ANY of its legacy
      // duplicates got archived, hiding fully-live books from the default
      // view entirely (found live 2026-09-17: 53 Guide + 29 Precis books).
      const isArchived = ['draft', 'archived'].includes((canonicalRow.status || '').toLowerCase());
      books.push({
        resourceId: canonicalRow.resource_id,
        title: group.title,
        category: group.category,
        level: canonicalRow.level || null,
        stateUt: canonicalRow.state_ut || null,
        conductingBody: canonicalRow.conducting_body || null,
        storageBaseUrl: canonicalUrl,
        chapterCount: canonicalRow.chapter_count ?? null,
        duplicateRowCount: group.rows.length,
        status: isArchived ? 'Draft' : (canonicalRow.status || 'Published'),
        isArchived,
        issueCounts: issuesByTitle ? (issuesByTitle[issueKey] || { high: 0, medium: 0, low: 0 }) : null,
      });
    }

    booksListCache.set(cacheKey, { timestamp: Date.now(), books });
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
    const { data: row, error } = await supabase.from('resources').select('resource_id,title,category,storage_base_url,status,format,chapter_count').eq('resource_id', resourceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchBookRows(supabase, row);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    // Same fix as books-list above: whether THIS row (the one actually
    // being opened) is archived, not whether some sibling duplicate row
    // happens to be -- see its comment for the live bug this caused.
    const isArchived = ['draft', 'archived'].includes((row.status || '').toLowerCase());
    return res.status(200).json({
      ok: true,
      resourceId: row.resource_id,
      title: row.title,
      category: row.category,
      storageBaseUrl: canonicalUrl,
      format: row.format || (groupRows.find((r) => r.format)?.format) || 'blocks',
      chapterCount: row.chapter_count ?? (groupRows.find((r) => r.chapter_count != null)?.chapter_count) ?? 1,
      status: isArchived ? 'Draft' : (row.status || 'Published'),
      isArchived,
    });
  } catch (e) {
    console.error('[admin/save-resource:books-get] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-fetch-content', url?, storageBaseUrl?, resourceId?, fileName? }
 *
 * Fetches JSON content (metadata.json or chapter JSON) server-side from R2
 * to bypass browser CORS and network restrictions.
 */
async function handleBooksFetchContent(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { url, storageBaseUrl, resourceId, fileName } = req.body || {};
  let targetUrl = url;

  if (!targetUrl && storageBaseUrl) {
    const base = storageBaseUrl.replace(/\/+$/, '') + '/';
    const rel = (fileName || 'metadata.json').replace(/^\/+/, '');
    targetUrl = `${base}${rel}`;
  }

  if (!targetUrl && resourceId) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: row, error } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
      if (!error && row) {
        const groupRows = await fetchBookRows(supabase, row);
        const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
        if (canonicalUrl) {
          const base = canonicalUrl.replace(/\/+$/, '') + '/';
          const rel = (fileName || 'metadata.json').replace(/^\/+/, '');
          targetUrl = `${base}${rel}`;
        }
      }
    } catch (err) {
      console.warn('[admin/save-resource:books-fetch-content] failed to resolve resourceId:', err.message);
    }
  }

  if (!targetUrl) {
    return res.status(400).json({ ok: false, error: 'Missing url, storageBaseUrl, or valid resourceId' });
  }

  try {
    const cleanUrl = targetUrl.includes('?') ? targetUrl : `${targetUrl}?t=${Date.now()}`;
    const data = await fetchJson(cleanUrl);
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error('[admin/save-resource:books-fetch-content] fetch failed for ' + targetUrl + ':', e.message);
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
 * this book's resources rows already agree it lives at. Also patches
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
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchBookRows(supabase, row);
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
    const { error: updateError } = await bookRowsFilter(supabase.from('resources').update(updatePatch), row);
    if (updateError) console.error('[admin/save-resource:books-save-chapter] row consolidation update failed (content still saved):', updateError.message);

    invalidateBooksCache();
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
 * resources row. For content with no source docx to enrich -- e.g. a
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
    // Book is for something that doesn't exist yet. Doesn't apply to Intro:
    // sharing a generic title (e.g. "Introduction") across unrelated exams
    // is normal there, not a collision (see TITLE_DEDUPED_CATEGORIES).
    if (isTitleDedupedCategory(category)) {
      const existing = await fetchRowsByTitle(supabase, category, title.trim());
      if (existing.length > 0) return res.status(409).json({ ok: false, error: `A ${category} book titled "${title.trim()}" already exists` });
    }

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

    const { error } = await supabase.from('resources').insert({
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

    invalidateBooksCache();
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
 * pairs, and re-uploaded), then inserts a new resources row. Generalizes
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
    const { data: sourceRow, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', sourceResourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!sourceRow) return res.status(404).json({ ok: false, error: 'Source book not found' });

    const sourceGroupRows = await fetchBookRows(supabase, sourceRow);
    const sourceCanonicalUrl = pickCanonicalStorageBaseUrl(sourceGroupRows.length ? sourceGroupRows : [sourceRow]);
    const sourcePrefix = prefixFromStorageBaseUrl(sourceCanonicalUrl, publicUrl);
    if (!sourcePrefix) return res.status(500).json({ ok: false, error: 'Could not resolve source storage location' });

    if (isTitleDedupedCategory(destCategory)) {
      const existingDest = await fetchRowsByTitle(supabase, destCategory, newTitle.trim());
      if (existingDest.length > 0) return res.status(409).json({ ok: false, error: `A ${destCategory} book titled "${newTitle.trim()}" already exists` });
    }

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

    const { error } = await supabase.from('resources').insert({
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

    invalidateBooksCache();
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
 * every resources row sharing that title+category -- leaving any of
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
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchBookRows(supabase, row);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);

    if (prefix) {
      const s3 = getS3Client();
      const keys = await listR2Keys(s3, bucket, prefix);
      if (keys.length > 0) await deleteR2Keys(s3, bucket, keys);
    }

    const { error } = await bookRowsFilter(supabase.from('resources').delete(), row);
    if (error) throw new Error(error.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/save-resource:books-delete] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-rename', resourceId, newTitle }
 *
 * Renames a book by updating:
 * 1. `metadata.json` in R2 (`metadata.title = newTitle.trim()`)
 * 2. All duplicate/linked rows in `resources` table for this category + old title
 */
async function handleBooksRename(req, res) {
  if (!checkAdminSecret(req, res)) return;

  const { resourceId, newTitle } = req.body || {};
  if (!resourceId || !newTitle || !newTitle.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing resourceId or newTitle' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  const trimmedNewTitle = newTitle.trim();

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchBookRows(supabase, row);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);

    // Patch metadata.json in R2 if prefix is resolvable
    if (prefix) {
      try {
        const metadata = await fetchJson(`${canonicalUrl}metadata.json`);
        metadata.title = trimmedNewTitle;
        const s3 = getS3Client();
        await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
      } catch (e) {
        console.error('[admin/save-resource:books-rename] metadata.json patch failed:', e.message);
      }
    }

    // Update DB rows for this book
    const { error: updateError } = await bookRowsFilter(
      supabase.from('resources').update({ title: trimmedNewTitle, updated_at: new Date().toISOString() }),
      row
    );
    if (updateError) throw new Error(updateError.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true, newTitle: trimmedNewTitle });
  } catch (e) {
    console.error('[admin/save-resource:books-rename] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

const BOOK_LEVELS = ['central', 'state', 'ut'];

/**
 * POST /api/admin/save-resource with
 * { type: 'books-save-tags', resourceId, category?, level?, stateUt?, conductingBody? }
 *
 * One combined save for every tag the admin table lets you edit inline
 * (Category, Level, State/UT, Conducting Body) -- the frontend stages all
 * of them locally as the admin changes dropdowns and sends one request on
 * an explicit "Save" click, rather than a separate round trip per field.
 * Only the fields actually present in the request body are touched
 * (`undefined` means "leave alone"; pass `null` to clear a tag).
 *
 * Category changes re-label in place -- content stays exactly where it
 * already lives in R2 (storage_base_url is stored per-row, not recomputed
 * from category at read time). Deliberately does NOT reject a destination
 * title that already exists: unlike books-create/books-duplicate, where a
 * title clash means "these are two different things," a mis-tagged book
 * landing on a title the destination category already has is exactly the
 * case this exists to fix (e.g. "Haryana_GS" split with some rows wrongly
 * left in Guide while the real book lives in Precis) -- it merges into
 * that group the same way any other duplicate-titled row already does.
 *
 * Level/State-UT/Conducting Body are plain labels for future exam<->book
 * mapping -- they don't affect content, category grouping, or R2 at all.
 */
async function handleBooksSaveTags(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId, title: newTitle, category: newCategory, level: newLevel, stateUt: newStateUt, conductingBody: newConductingBody } = req.body || {};
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Missing resourceId' });
  if (newCategory !== undefined && !BOOK_CATEGORIES.includes(newCategory)) {
    return res.status(400).json({ ok: false, error: 'Invalid category' });
  }
  if (newLevel !== undefined && newLevel !== null && !BOOK_LEVELS.includes(newLevel)) {
    return res.status(400).json({ ok: false, error: 'Invalid level' });
  }
  if (newTitle !== undefined && (!newTitle || !newTitle.trim())) {
    return res.status(400).json({ ok: false, error: 'Title cannot be empty' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const patch = { updated_at: new Date().toISOString() };
    if (newTitle !== undefined && newTitle.trim() !== row.title) {
      const trimmedTitle = newTitle.trim();
      patch.title = trimmedTitle;

      // Update metadata.json in R2 if storage location is resolvable
      const publicUrl = getR2PublicUrl();
      const bucket = getR2Bucket();
      if (publicUrl && bucket) {
        try {
          const groupRows = await fetchBookRows(supabase, row);
          const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
          const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);
          if (prefix) {
            const metadata = await fetchJson(`${canonicalUrl}metadata.json`);
            metadata.title = trimmedTitle;
            const s3 = getS3Client();
            await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json');
          }
        } catch (e) {
          console.error('[admin/save-resource:books-save-tags] metadata.json title patch failed:', e.message);
        }
      }
    }
    if (newCategory !== undefined) patch.category = newCategory;
    if (newLevel !== undefined) patch.level = newLevel;
    if (newStateUt !== undefined) patch.state_ut = newStateUt;
    if (newConductingBody !== undefined) patch.conducting_body = newConductingBody;

    // bookRowsFilter scopes by `row`'s CURRENT category/title (Guide/Precis
    // title-grouped, Intro resource_id-only) -- correct even when this same
    // patch also changes `category` or `title`, since the WHERE clause is built before
    // the UPDATE's SET values apply.
    const { error: updateError } = await bookRowsFilter(supabase.from('resources').update(patch), row);
    if (updateError) throw new Error(updateError.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true, ...patch });
  } catch (e) {
    console.error('[admin/save-resource:books-save-tags] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-archive', resourceId }
 *
 * Sets status = 'Draft' on all resources rows for this book (hides from candidates & active list)
 */
async function handleBooksArchive(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId } = req.body || {};
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Missing resourceId' });
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const { error: updateError } = await bookRowsFilter(
      supabase.from('resources').update({ status: 'Draft', updated_at: new Date().toISOString() }),
      row
    );
    if (updateError) throw new Error(updateError.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true, status: 'Draft' });
  } catch (e) {
    console.error('[admin/save-resource:books-archive] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with { type: 'books-unarchive', resourceId }
 *
 * Sets status = 'Published' on all resources rows for this book
 */
async function handleBooksUnarchive(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId } = req.body || {};
  if (!resourceId) return res.status(400).json({ ok: false, error: 'Missing resourceId' });
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const { error: updateError } = await bookRowsFilter(
      supabase.from('resources').update({ status: 'Published', updated_at: new Date().toISOString() }),
      row
    );
    if (updateError) throw new Error(updateError.message);

    invalidateBooksCache();
    return res.status(200).json({ ok: true, status: 'Published' });
  } catch (e) {
    console.error('[admin/save-resource:books-unarchive] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-find-replace', resourceId, find, replace, matchCase, matchWholeWord, scope, chapterFileName }
 *
 * Finds and replaces text across chapters and metadata directly in R2.
 */
async function handleBooksFindReplace(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId, find, replace = '', matchCase = false, matchWholeWord = false, scope = 'all', chapterFileName } = req.body || {};
  if (!resourceId || !find || typeof find !== 'string' || !find.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing or invalid search term' });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  const bucket = getR2Bucket();
  if (!publicUrl || !bucket) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchBookRows(supabase, row);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);
    const prefix = prefixFromStorageBaseUrl(canonicalUrl, publicUrl);
    if (!prefix) return res.status(500).json({ ok: false, error: 'Could not resolve storage location for this book' });

    const s3 = getS3Client();
    const metadata = await fetchJson(`${canonicalUrl}metadata.json?t=${Date.now()}`);
    const chapters = metadata.chapters || [];

    const targetChapters = scope === 'chapter' && chapterFileName
      ? chapters.filter((c) => c.file_name === chapterFileName)
      : chapters;

    let totalReplacements = 0;
    const modifiedChapters = [];

    // Process all chapters concurrently so replace happens everywhere at once
    const chapterResults = await Promise.all(
      targetChapters.map(async (chapterMeta) => {
        try {
          const chapterData = await fetchJson(`${canonicalUrl}${chapterMeta.file_name}?t=${Date.now()}`);
          const { value: updatedChapter, count: chapterCount } = replaceTextInValue(chapterData, find, replace, { matchCase, matchWholeWord });

          if (chapterCount > 0) {
            await uploadToR2(s3, bucket, `${prefix}/${chapterMeta.file_name}`, Buffer.from(JSON.stringify(updatedChapter, null, 2)), 'application/json', 'no-cache, no-store, must-revalidate');

            if (updatedChapter.title && updatedChapter.title !== chapterMeta.title) {
              chapterMeta.title = updatedChapter.title;
            }
            return {
              fileName: chapterMeta.file_name,
              title: updatedChapter.title || chapterMeta.title,
              count: chapterCount,
            };
          }
          return null;
        } catch (err) {
          console.error(`[books-find-replace] Error updating ${chapterMeta.file_name}:`, err.message);
          return null;
        }
      })
    );

    for (const resItem of chapterResults) {
      if (resItem) {
        totalReplacements += resItem.count;
        modifiedChapters.push(resItem);
      }
    }

    let metadataChanged = false;
    let oldTitle = row.title;
    let newTitle = metadata.title;
    if (scope === 'all') {
      const { value: updatedMetaTitle, count: metaTitleCount } = replaceTextInValue(metadata.title, find, replace, { matchCase, matchWholeWord });
      if (metaTitleCount > 0) {
        metadata.title = updatedMetaTitle;
        newTitle = updatedMetaTitle;
        metadataChanged = true;
        totalReplacements += metaTitleCount;
      }
    }
    if (modifiedChapters.length > 0 || metadataChanged) {
      await uploadToR2(s3, bucket, `${prefix}/metadata.json`, Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json', 'no-cache, no-store, must-revalidate');
    }

    if (metadataChanged && newTitle !== oldTitle) {
      try {
        await supabase
          .from('resources')
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq('category', row.category)
          .ilike('title', escapeIlike(oldTitle));
      } catch (dbErr) {
        console.error('[books-find-replace] Failed to update resources table title:', dbErr.message);
      }
    }

    invalidateBooksCache();
    return res.status(200).json({
      ok: true,
      totalReplacements,
      chaptersModified: modifiedChapters.length,
      modifiedChapters,
      metadata,
    });
  } catch (e) {
    console.error('[admin/save-resource:books-find-replace] failed:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/admin/save-resource with
 * { type: 'books-find-count', resourceId, find, matchCase, matchWholeWord, scope, chapterFileName }
 *
 * Fast server-side match count across chapters in R2 without modifying anything.
 */
async function handleBooksFindCount(req, res) {
  if (!checkAdminSecret(req, res)) return;
  const { resourceId, find, matchCase = false, matchWholeWord = false, scope = 'all', chapterFileName } = req.body || {};
  if (!resourceId || !find || typeof find !== 'string' || !find.trim()) {
    return res.status(200).json({ ok: true, totalMatches: 0, chapterMatches: {} });
  }
  if (!supabaseUrl) return res.status(500).json({ ok: false, error: 'Missing Supabase credentials on server' });
  const publicUrl = getR2PublicUrl();
  if (!publicUrl) return res.status(500).json({ ok: false, error: 'Server misconfiguration: R2 env vars not set' });

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: rowError } = await supabase.from('resources').select('resource_id,title,category,storage_base_url').eq('resource_id', resourceId).maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) return res.status(404).json({ ok: false, error: 'Book not found' });

    const groupRows = await fetchRowsByTitle(supabase, row.category, row.title);
    const canonicalUrl = pickCanonicalStorageBaseUrl(groupRows.length ? groupRows : [row]);

    const metadata = await fetchJson(`${canonicalUrl}metadata.json?t=${Date.now()}`);
    const chapters = metadata.chapters || [];

    const targetChapters = scope === 'chapter' && chapterFileName
      ? chapters.filter((c) => c.file_name === chapterFileName)
      : chapters;

    let totalMatches = 0;
    const chapterMatches = {};

    await Promise.all(
      targetChapters.map(async (chapterMeta) => {
        try {
          const chapterData = await fetchJson(`${canonicalUrl}${chapterMeta.file_name}?t=${Date.now()}`);
          const { count } = replaceTextInValue(chapterData, find, '', { matchCase, matchWholeWord });
          if (count > 0) {
            totalMatches += count;
            chapterMatches[chapterMeta.file_name] = count;
          }
        } catch {}
      })
    );

    if (scope === 'all') {
      const { count: metaTitleCount } = replaceTextInValue(metadata.title, find, '', { matchCase, matchWholeWord });
      if (metaTitleCount > 0) {
        totalMatches += metaTitleCount;
      }
    }

    return res.status(200).json({
      ok: true,
      totalMatches,
      chapterMatches,
    });
  } catch (e) {
    console.error('[admin/save-resource:books-find-count] failed:', e.message);
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

  if (req.body?.type === 'docx-preview-convert') {
    return handleDocxPreviewConvert(req, res);
  }
  if (req.body?.type === 'content-publish') {
    return handleContentPublish(req, res);
  }

  if (req.body?.type === 'books-list') {
    return handleBooksList(req, res);
  }

  if (req.body?.type === 'books-get') {
    return handleBooksGet(req, res);
  }

  if (req.body?.type === 'books-fetch-content') {
    return handleBooksFetchContent(req, res);
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

  if (req.body?.type === 'books-rename') {
    return handleBooksRename(req, res);
  }

  if (req.body?.type === 'books-save-tags') {
    return handleBooksSaveTags(req, res);
  }

  if (req.body?.type === 'books-archive') {
    return handleBooksArchive(req, res);
  }

  if (req.body?.type === 'books-unarchive') {
    return handleBooksUnarchive(req, res);
  }

  if (req.body?.type === 'books-delete') {
    return handleBooksDelete(req, res);
  }

  if (req.body?.type === 'books-find-count') {
    return handleBooksFindCount(req, res);
  }

  if (req.body?.type === 'books-find-replace') {
    return handleBooksFindReplace(req, res);
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
        .from('resources')
        .upsert(record, { onConflict: 'resource_id' })
        .select();

      if (error) {
        console.error('Supabase V2 Upsert Error:', error);
        return res.status(400).json({ error: error.message });
      }

      invalidateBooksCache();
      return res.status(200).json({ success: true, data });
    }

    return res.status(400).json({ error: 'Unrecognized save-resource request shape' });
  } catch (err) {
    console.error('Save Resource Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
