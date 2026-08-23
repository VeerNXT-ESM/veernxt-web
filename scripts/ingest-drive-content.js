#!/usr/bin/env node
/**
 * scripts/ingest-drive-content.js
 *
 * Standalone Node port of the browser Drive-ingestion pipeline
 * (AdminDriveIngestion.jsx + contentEngineProcessor.js), for bulk-loading
 * a local folder tree of .docx study material straight into production
 * (R2 + Supabase resources_v2) without the browser drag-and-drop UI — built
 * because the real content set (~7,000 files) makes that impractical by
 * hand.
 *
 * Category/conducting-body/exam-name derivation is kept in exact sync with
 * findCategoryFolder() in AdminDriveIngestion.jsx (verified against real
 * sample paths from this content set before this script was written).
 *
 * Simplifications vs. the browser tool (explicit scope decision, to keep
 * this buildable quickly): no custom "Royal Green" branded thumbnail
 * generation, no WebP re-encoding of extracted images — images are stored
 * in their original format, and thumbnail_url (if any) is just the cover
 * image's own uploaded URL.
 *
 * The resources_v2 row written here matches, column for column, what
 * api/admin/save-resource.js's V2 branch persists — that endpoint is the
 * proven-working reference, so this deliberately doesn't add or rename
 * anything relative to it (e.g. it does NOT write drive_path — that field
 * exists in the in-memory metadata object but save-resource.js has never
 * actually persisted it either).
 *
 * Usage:
 *   node scripts/ingest-drive-content.js --root "<folder>" [--limit N] [--dry-run] [--concurrency N]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// .env loader (avoids adding a dotenv dependency for a one-off script)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
// resources_v2.category has a Postgres CHECK constraint that only allows
// Guide/Intro/Precis (confirmed empirically — Mock Test and PYQ are
// rejected outright, no spelling/casing gets through). Mock Test/PYQ
// content already has a real, working home in the separate `quizzes` table
// (structured question/option/answer rows, consumed by the quiz viewer) —
// routing STATE EXAMS' Mock Test/PYQ docx files there is a distinct,
// deferred piece of work, not something this script attempts. Anything
// whose detected category isn't in this set is skipped (not an error).
const RESOURCES_V2_ALLOWED_CATEGORIES = new Set(['Guide', 'Intro', 'Precis']);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { root: null, limit: Infinity, dryRun: false, concurrency: 6, onlyCategory: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') out.root = args[++i];
    else if (args[i] === '--limit') out.limit = parseInt(args[++i], 10);
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--concurrency') out.concurrency = parseInt(args[++i], 10);
    else if (args[i] === '--only-category') out.onlyCategory = args[++i];
  }
  if (!out.root) {
    console.error('Usage: node scripts/ingest-drive-content.js --root "<folder>" [--limit N] [--dry-run] [--concurrency N]');
    process.exit(1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Category / conducting-body / exam-name derivation
// — kept in exact sync with findCategoryFolder() in AdminDriveIngestion.jsx
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORD_RULES = [
  { category: 'Mock Test', patterns: ['MOCK TEST', 'MOCK TESTS', 'MOCK EXAM', 'TEST SERIES', 'MOCKS', 'MOCK'] },
  { category: 'PYQ', patterns: ['PYQ', 'PYQS', 'PREVIOUS YEAR', 'PREV YEAR', 'PAST PAPER', 'PAST PAPERS', 'PAST YEAR'] },
  { category: 'Precis', patterns: ['PRECIS', 'PRÉCIS'] },
  { category: 'Intro', patterns: ['INTRO', 'INTRODUCTION'] },
];

function findCategoryFolder(folderLevels) {
  for (let i = folderLevels.length - 1; i >= 0; i--) {
    const segment = folderLevels[i].toUpperCase();
    for (const rule of CATEGORY_KEYWORD_RULES) {
      if (rule.patterns.some((p) => segment.includes(p))) {
        return { index: i, category: rule.category };
      }
    }
  }
  return { index: folderLevels.length - 1, category: 'Guide' };
}

// Source folder names carry a "N. " or "N." list-ordinal (content team's
// own filing convention, e.g. "2. Assistant", "11. INSURANCE EXAMS") that
// the rebuilt exams/lc_conducting_bodies tables this session (see
// rebuild_exams_from_datamap.mjs, preview_conducting_body_names.mjs)
// deliberately don't carry. Stripped here so newly-ingested resources_v2
// rows use the same clean convention -- without this, exam_name still
// substring-matches fine (Dashboard.jsx/ProfilingResults.jsx's ilike
// fallback), but the raw prefix would look inconsistent everywhere it's
// displayed directly (admin tables, resource titles).
function stripOrdinal(segment) {
  const stripped = segment.replace(/^\s*\d+\.?\s*/, '').trim() || segment;
  // Some source folders use underscores as filename-safe word separators
  // (e.g. "Uttar_Pradesh_Public_Service_Commission_(UPPSC)") -- not a real
  // naming choice, so normalize to spaces like every other folder already uses.
  return stripped.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveMetadataFromPath(folderLevels) {
  const { index: categoryIndex, category } = findCategoryFolder(folderLevels);
  const identitySegments = folderLevels.slice(0, categoryIndex).map(stripOrdinal);
  const postCategorySegments = folderLevels.slice(categoryIndex + 1).map(stripOrdinal);
  const conductingBody = identitySegments.slice(0, 2).join(' — ') || 'General Body';
  const examNameBase = identitySegments.length > 2
    ? identitySegments.slice(2).join(' — ')
    : (identitySegments[identitySegments.length - 1] || 'General Exam');
  const examName = postCategorySegments.length > 0
    ? `${examNameBase} — ${postCategorySegments.join(' — ')}`
    : examNameBase;
  return { category, conductingBody, examName };
}

// ---------------------------------------------------------------------------
// Resource ID / hash helpers — ported from contentEngineProcessor.js
// ---------------------------------------------------------------------------
function generateSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateResourceId(filename, examName, category, subject) {
  const timestamp = Date.now();
  const seed = `${examName}_${category}_${subject}_${filename}_${timestamp}_${Math.random()}`;
  const h1 = generateSimpleHash(seed);
  const h2 = generateSimpleHash(seed + '_2');
  const h3 = generateSimpleHash(seed + '_3');
  const h4 = generateSimpleHash(seed + '_4');
  return `${h1.slice(0, 8)}-${h2.slice(0, 4)}-4${h3.slice(0, 3)}-a${h4.slice(0, 3)}-${h1}${h2.slice(0, 4)}`;
}

// ---------------------------------------------------------------------------
// DOCX parsing — Node port of processDocxFile() in contentEngineProcessor.js
// ---------------------------------------------------------------------------
function parseRelationships(relsXmlText) {
  const rels = {};
  const doc = new DOMParser().parseFromString(relsXmlText, 'text/xml');
  const relElements = doc.getElementsByTagName('Relationship');
  for (let i = 0; i < relElements.length; i++) {
    const id = relElements[i].getAttribute('Id');
    const target = relElements[i].getAttribute('Target');
    if (id && target) {
      let cleanTarget = target.startsWith('/') ? target.substring(1) : target;
      if (cleanTarget.startsWith('word/')) cleanTarget = cleanTarget.substring(5);
      rels[id] = { target: cleanTarget };
    }
  }
  return rels;
}

function extFromPath(p) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(p);
  return m ? m[1].toLowerCase() : 'png';
}

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  bmp: 'image/bmp', emf: 'image/x-emf', wmf: 'image/x-wmf', tif: 'image/tiff', tiff: 'image/tiff',
};

export async function processDocxBuffer(buffer, fileName, fileSize, options) {
  const { examName, category, subject, conductingBody, drivePath } = options;

  const zip = new JSZip();
  const zipContent = await zip.loadAsync(buffer);

  let rels = {};
  const relsFile = zipContent.file('word/_rels/document.xml.rels');
  if (relsFile) {
    rels = parseRelationships(await relsFile.async('text'));
  }

  const docFile = zipContent.file('word/document.xml');
  if (!docFile) {
    throw new Error('Invalid .docx file: word/document.xml missing.');
  }
  const docXmlText = await docFile.async('text');
  const xmlDoc = new DOMParser().parseFromString(docXmlText, 'text/xml');

  const extractedImages = {}; // path -> { buffer, ext }
  const imageRIdMap = {};
  let imageCounter = 0;
  let coverPath = null;
  let coverExt = null;

  const blips = Array.from(xmlDoc.getElementsByTagNameNS('*', 'blip'));
  const imagedatas = Array.from(xmlDoc.getElementsByTagNameNS('*', 'imagedata'));
  const imageElements = [...blips, ...imagedatas];

  for (const el of imageElements) {
    const rId = el.getAttribute('r:embed') || el.getAttribute('r:id') || el.getAttribute('id');
    if (rId && rels[rId] && !imageRIdMap[rId]) {
      const relPath = 'word/' + rels[rId].target;
      const mediaZipFile = zipContent.file(relPath);
      if (mediaZipFile) {
        imageCounter++;
        const rawBuffer = await mediaZipFile.async('nodebuffer');
        const ext = extFromPath(rels[rId].target);
        const fileNameOut = `fig-${imageCounter}-${generateSimpleHash(rId)}.${ext}`;
        const imgPath = `images/${fileNameOut}`;
        extractedImages[imgPath] = { buffer: rawBuffer, ext };
        imageRIdMap[rId] = fileNameOut;
        if (!coverPath) { coverPath = imgPath; coverExt = ext; }
      }
    }
  }

  if (coverPath) {
    extractedImages[`images/cover.${coverExt}`] = extractedImages[coverPath];
  }

  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
  const chapters = [];
  let currentChapter = { title: 'Introduction', order: 1, body_html: '', images: [] };
  let htmlParts = [];

  for (const para of paragraphs) {
    let pStyle = '';
    const styleEl = para.getElementsByTagNameNS('*', 'pStyle')[0];
    if (styleEl) {
      pStyle = (styleEl.getAttribute('w:val') || styleEl.getAttribute('val') || '').toLowerCase();
    }
    const isHeading1 = pStyle.includes('heading1') || pStyle.includes('heading 1') || pStyle === 'title';
    const isHeading2 = pStyle.includes('heading2') || pStyle.includes('heading 2');
    const isHeading3 = pStyle.includes('heading3') || pStyle.includes('heading 3');

    const runs = Array.from(para.getElementsByTagNameNS('*', 'r'));
    let paraHtmlParts = [];

    for (const run of runs) {
      const isBold = run.getElementsByTagNameNS('*', 'b').length > 0;
      const isItalic = run.getElementsByTagNameNS('*', 'i').length > 0;
      const tEls = Array.from(run.getElementsByTagNameNS('*', 't'));
      let textContent = tEls.map((t) => t.textContent).join('');

      const runBlips = Array.from(run.getElementsByTagNameNS('*', 'blip'));
      const runImagedatas = Array.from(run.getElementsByTagNameNS('*', 'imagedata'));
      for (const imgEl of [...runBlips, ...runImagedatas]) {
        const rId = imgEl.getAttribute('r:embed') || imgEl.getAttribute('r:id') || imgEl.getAttribute('id');
        if (rId && imageRIdMap[rId]) {
          paraHtmlParts.push(`<img src="images/${imageRIdMap[rId]}" alt="figure"/>`);
        }
      }

      if (textContent) {
        textContent = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (isBold && isItalic) paraHtmlParts.push(`<strong><em>${textContent}</em></strong>`);
        else if (isBold) paraHtmlParts.push(`<strong>${textContent}</strong>`);
        else if (isItalic) paraHtmlParts.push(`<em>${textContent}</em>`);
        else paraHtmlParts.push(textContent);
      }
    }

    const paraInner = paraHtmlParts.join('').trim();
    if (!paraInner) continue;
    const rawText = para.textContent ? para.textContent.trim() : '';

    if (isHeading1 && rawText) {
      if (htmlParts.length > 0) {
        currentChapter.body_html = htmlParts.join('\n');
        const imgs = Array.from(currentChapter.body_html.matchAll(/src="images\/([^"]+)"/g)).map((m) => `images/${m[1]}`);
        currentChapter.images = Array.from(new Set(imgs));
        chapters.push(currentChapter);
      }
      currentChapter = { title: rawText, order: chapters.length + 1, body_html: '', images: [] };
      htmlParts = [`<h1>${paraInner}</h1>`];
    } else if (isHeading2) {
      htmlParts.push(`<h2>${paraInner}</h2>`);
    } else if (isHeading3) {
      htmlParts.push(`<h3>${paraInner}</h3>`);
    } else {
      htmlParts.push(`<p>${paraInner}</p>`);
    }
  }

  if (htmlParts.length > 0) {
    currentChapter.body_html = htmlParts.join('\n');
    const imgs = Array.from(currentChapter.body_html.matchAll(/src="images\/([^"]+)"/g)).map((m) => `images/${m[1]}`);
    currentChapter.images = Array.from(new Set(imgs));
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({ title: 'Content', order: 1, body_html: '<p>Document content parsed.</p>', images: [] });
  }
  chapters.forEach((ch, idx) => { ch.order = idx + 1; });

  const resourceId = generateResourceId(fileName, examName, category, subject);
  const docTitle = fileName.replace(/\.[^/.]+$/, '');

  const metadata = {
    resource_id: resourceId,
    title: docTitle,
    exam_name: examName,
    subject,
    category,
    conducting_body: conductingBody,
    drive_path: drivePath || '',
    website_url: '',
    source_file: fileName,
    file_hash: generateSimpleHash(fileName + fileSize),
    chapter_count: chapters.length,
    is_freemium: category.toLowerCase() === 'intro',
    is_locked: category.toLowerCase() !== 'intro',
  };

  const cleanDrivePath = (drivePath || '').split('/').map((s) => s.trim()).filter(Boolean).join('/');
  const r2Prefix = cleanDrivePath
    ? `structured_resources/${cleanDrivePath}/${resourceId}`
    : `structured_resources/${resourceId}`;

  const r2Files = [];
  r2Files.push({ key: `${r2Prefix}/metadata.json`, body: Buffer.from(JSON.stringify(metadata, null, 2)), contentType: 'application/json' });
  chapters.forEach((ch) => {
    r2Files.push({ key: `${r2Prefix}/chapters/chapter-${ch.order}.json`, body: Buffer.from(JSON.stringify(ch, null, 2)), contentType: 'application/json' });
  });
  for (const [imgPath, { buffer: imgBuf, ext }] of Object.entries(extractedImages)) {
    r2Files.push({ key: `${r2Prefix}/${imgPath}`, body: imgBuf, contentType: MIME_BY_EXT[ext] || 'application/octet-stream' });
  }

  return {
    resourceId,
    r2Prefix,
    metadata,
    chapters,
    r2Files,
    thumbnailKey: coverPath ? `${r2Prefix}/${coverPath}` : null,
    imageCount: Object.keys(extractedImages).length,
  };
}

// ---------------------------------------------------------------------------
// R2 / Supabase clients
// ---------------------------------------------------------------------------
function getS3Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

async function uploadToR2(s3, bucket, key, body, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  }));
}

function getSupabase() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Folder walk
// ---------------------------------------------------------------------------
function walkDocxFiles(root) {
  const results = [];
  function walk(dir, relParts) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, [...relParts, entry.name]);
      } else if (entry.isFile()) {
        // Skip Word's own hidden lock/temp files (~$filename.docx), created
        // while a document is open — same extension, not real zip content.
        if (entry.name.startsWith('~$')) continue;
        // "_PENDING_CONTENT.docx" is the content team's placeholder sentinel
        // for not-yet-written content (verified: one such file's entire text
        // is just "<Exam Name> — Intro", nothing else) -- 3,753 of these
        // exist across the whole CENTRAL/STATE/UT tree. exam_master_datamap.
        // json's content_completeness field counts file PRESENCE, not
        // whether the file is real, so this check can't be skipped.
        if (entry.name === '_PENDING_CONTENT.docx') continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.docx' || ext === '.doc') {
          results.push({ fullPath: full, fileName: entry.name, folderLevels: relParts });
        }
      }
    }
  }
  walk(root, []);
  return results;
}

// ---------------------------------------------------------------------------
// Duplicate detection — same semantics as isDuplicateFile() in the browser
// tool: title+path substring match against everything already in
// resources_v2, fetched once up front (paginated) so re-running this script
// safely skips anything already ingested.
// ---------------------------------------------------------------------------
async function fetchExistingResources(supabase) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('resources_v2')
      .select('title, source_file, storage_base_url')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function isDuplicate(existing, fileName, targetPath) {
  const cleanName = (fileName || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
  const cleanPath = (targetPath || '').toLowerCase().trim();
  return existing.some((res) => {
    const dbTitle = (res.title || res.source_file || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
    const dbPath = (res.storage_base_url || '').toLowerCase().trim();
    return dbTitle.includes(cleanName) && dbPath.includes(cleanPath);
  });
}

// ---------------------------------------------------------------------------
// Simple concurrency-limited map
// ---------------------------------------------------------------------------
async function mapWithConcurrency(items, limit, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      await fn(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  const root = path.resolve(opts.root);
  if (!fs.existsSync(root)) {
    console.error(`Root folder not found: ${root}`);
    process.exit(1);
  }

  console.log(`Scanning ${root} ...`);
  const allFiles = walkDocxFiles(root);
  console.log(`Found ${allFiles.length} .docx/.doc files.`);

  const supabase = getSupabase();
  const s3 = opts.dryRun ? null : getS3Client();
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  console.log('Fetching existing resources_v2 rows for duplicate check...');
  const existing = await fetchExistingResources(supabase);
  console.log(`${existing.length} existing rows loaded.`);

  const toProcess = [];
  let skippedDup = 0;
  let skippedDeferredCategory = 0;
  for (const f of allFiles) {
    const { category } = deriveMetadataFromPath(f.folderLevels);
    if (!RESOURCES_V2_ALLOWED_CATEGORIES.has(category)) { skippedDeferredCategory++; continue; }
    if (opts.onlyCategory && category !== opts.onlyCategory) { skippedDeferredCategory++; continue; }
    // Must match the separator used to build storage_base_url below
    // (plain '/', no spaces) — a mismatch here (this used to join with
    // ' / ') meant the substring check never matched anything, so re-runs
    // silently re-ingested everything as fresh "new" files instead of
    // skipping duplicates. Caught only by watching a live re-run closely;
    // 90 duplicate rows + their R2 objects had to be cleaned up afterward.
    const targetPath = f.folderLevels.join('/');
    if (isDuplicate(existing, f.fileName, targetPath)) { skippedDup++; continue; }
    toProcess.push(f);
    if (toProcess.length >= opts.limit) break;
  }
  console.log(`${toProcess.length} files queued this run (${skippedDup} already ingested, ${skippedDeferredCategory} Mock Test/PYQ deferred).\n`);

  const results = { success: 0, failed: [] };

  await mapWithConcurrency(toProcess, opts.concurrency, async (f, i) => {
    const label = `[${i + 1}/${toProcess.length}] ${f.fileName}`;
    try {
      const ext = path.extname(f.fileName).toLowerCase();
      if (ext !== '.docx') {
        throw new Error('Legacy .doc binary format not supported by parser');
      }

      const { category, conductingBody, examName } = deriveMetadataFromPath(f.folderLevels);
      const subject = f.fileName.replace(/\.[^/.]+$/, '').toUpperCase();
      const drivePath = f.folderLevels.join('/');

      const buffer = fs.readFileSync(f.fullPath);
      const stat = fs.statSync(f.fullPath);

      const processed = await processDocxBuffer(buffer, f.fileName, stat.size, {
        examName, category, subject, conductingBody, drivePath,
      });

      if (opts.dryRun) {
        console.log(`${label} DRY-RUN OK — exam="${examName}" body="${conductingBody}" category="${category}" chapters=${processed.chapters.length} images=${processed.imageCount}`);
        results.success++;
        return;
      }

      for (const rf of processed.r2Files) {
        await uploadToR2(s3, bucket, rf.key, rf.body, rf.contentType);
      }

      const storageBaseUrl = `${publicUrl}/${processed.r2Prefix}/`;
      const record = {
        resource_id: processed.metadata.resource_id,
        file_hash: processed.metadata.file_hash,
        source_file: processed.metadata.source_file,
        title: processed.metadata.title,
        exam_name: processed.metadata.exam_name,
        subject: processed.metadata.subject,
        category: processed.metadata.category,
        conducting_body: processed.metadata.conducting_body,
        website_url: processed.metadata.website_url,
        chapter_count: processed.metadata.chapter_count,
        storage_base_url: storageBaseUrl,
        metadata_url: `${storageBaseUrl}metadata.json`,
        thumbnail_url: processed.thumbnailKey ? `${publicUrl}/${processed.thumbnailKey}` : null,
        is_freemium: processed.metadata.is_freemium,
        is_locked: processed.metadata.is_locked,
        status: 'Published',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('resources_v2').upsert(record, { onConflict: 'resource_id' });
      if (error) throw error;

      console.log(`${label} OK — "${examName}" / ${category} (${processed.chapters.length} ch, ${processed.imageCount} img)`);
      results.success++;
    } catch (err) {
      console.error(`${label} FAILED — ${err.message}`);
      results.failed.push({ file: f.fullPath, error: err.message });
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Succeeded: ${results.success}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Skipped (already ingested): ${skippedDup}`);
  console.log(`Skipped (Mock Test/PYQ, deferred): ${skippedDeferredCategory}`);

  if (results.failed.length > 0) {
    const reportPath = path.resolve(process.cwd(), `ingest-failures-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results.failed, null, 2));
    console.log(`Failure details written to ${reportPath}`);
  }
}

// Guard so other scripts can `import { processDocxBuffer, ... }` from this
// file (e.g. ingest_master_documents.mjs, reusing the docx parser for the
// deduplicated FINAL_CONTENT documents) without also triggering this
// file's own CLI main() on import.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { getS3Client, uploadToR2, generateSimpleHash, generateResourceId };
