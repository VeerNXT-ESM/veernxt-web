#!/usr/bin/env node
/**
 * scripts/fix_mathematics_flat_chapters.mjs
 *
 * Fixes the two live "MATHEMATICS" book resources (found via a resources +
 * R2 metadata.json audit) that were parsed into one flat "Introduction"
 * chapter each, even though their source .docx files contain 9 real
 * chapters (numbered 1,2,4,5,6,9,14,17,19 -- matching a syllabus topic map,
 * not sequential book chapters; the missing numbers were simply never
 * authored in the source content, a separate gap not addressed here).
 *
 * Root cause confirmed live: unlike the plain-text "CHAPTER N" markers
 * scripts/resplit_flat_chapters.mjs already knows how to split on, these
 * markers are each wrapped in their own single-row single-cell Word table
 * (a styled header box), so the ingestion parser filed them as type='table'
 * blocks -- invisible to any heading/paragraph-based marker scan. Confirmed
 * identical marker block indices/content between the local public/books/
 * copy and the live R2 copy for MATHEMATICS PRECIS, so this operates
 * directly on the fetched-live blocks (not a re-parse of the source docx),
 * preserving any live admin edits.
 *
 * Targets:
 *   1. Precis "MATHEMATICS PRECIS" -- Published, 952 resources rows all
 *      sharing one R2 storage_base_url. Fixing the shared R2 content once
 *      fixes all 952; their denormalized chapter_count column still needs
 *      a bulk update.
 *   2. Guide "Cluster_083_MATHEMATICS" -- Draft, 1 row.
 *
 * Usage:
 *   node scripts/fix_mathematics_flat_chapters.mjs             # dry run
 *   node scripts/fix_mathematics_flat_chapters.mjs --execute    # writes R2 + updates Supabase
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getS3Client, uploadToR2 } from './lib/ingest-drive-content.js';

const EXECUTE = process.argv.includes('--execute');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = process.env.R2_BUCKET_NAME;

const TARGETS = [
  {
    label: 'Precis / MATHEMATICS PRECIS (952 rows)',
    storageBaseUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/0568526f-4c9d-44c9-a4c9-0568526f4c9d/',
    r2KeyPrefix: 'structured_resources/blocks/Precis/0568526f-4c9d-44c9-a4c9-0568526f4c9d',
  },
  {
    label: 'Guide / Cluster_083_MATHEMATICS (1 row, Draft)',
    storageBaseUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Guide/2def3084-400a-456d-9a95-640d858dabc6/',
    r2KeyPrefix: 'structured_resources/blocks/Guide/2def3084-400a-456d-9a95-640d858dabc6',
  },
  {
    // Same book_id (7a06ssp) / same source content as the Precis "MATHEMATICS
    // PRECIS" target above, but a separate resource row + separate R2 copy
    // titled "MATHEMATICS" (resource_id f1d7a8e1-...), found live via the
    // admin panel (/admin/books/Precis/f1d7a8e1-...) after the first fix --
    // it wasn't part of the 952-row group sharing the other storage_base_url.
    label: 'Precis / MATHEMATICS (resource_id f1d7a8e1..., 1 row)',
    storageBaseUrl: 'https://pub-8c123d43246448199bbe4a14bffa2c06.r2.dev/structured_resources/blocks/Precis/f1d7a8e1-32cf-4aa8-b599-120d280566e5/',
    r2KeyPrefix: 'structured_resources/blocks/Precis/f1d7a8e1-32cf-4aa8-b599-120d280566e5',
  },
];

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
}

// Matches the single-cell chapter-marker table: first <p> is "CHAPTER N",
// second <p> is the real chapter title. Excludes the unrelated "WHAT THIS
// BOOK COVERS" back-cover summary table (also a single-cell table) because
// its first line doesn't match this pattern.
function detectChapterMarker(block) {
  if (block.type !== 'table') return null;
  if (!Array.isArray(block.rows) || block.rows.length !== 1) return null;
  const cells = block.rows[0].cells;
  if (!Array.isArray(cells) || cells.length !== 1) return null;
  const paras = [...cells[0].matchAll(/<p[^>]*>(.*?)<\/p>/g)].map((m) => stripTags(m[1]));
  if (paras.length < 1) return null;
  const m = paras[0].match(/^CHAPTER\s+(\d+)$/i);
  if (!m) return null;
  return { number: parseInt(m[1], 10), title: paras[1] || `Chapter ${m[1]}` };
}

function splitBlocksIntoChapters(blocks) {
  const markers = [];
  blocks.forEach((b, i) => {
    const marker = detectChapterMarker(b);
    if (marker) markers.push({ index: i, ...marker });
  });
  // Require at least 2 markers -- a lone marker isn't a meaningful split and
  // (critically) matches what an already-fixed book's chapter-1.json looks
  // like on a re-run: it still carries its own leading "CHAPTER 1" marker,
  // so a `=== 0` check here would silently re-collapse an already-correct
  // split back down to a false "1 chapter" state.
  if (markers.length < 2) return null;

  const chapters = [];
  for (let i = 0; i < markers.length; i++) {
    const startIdx = i === 0 ? 0 : markers[i].index;
    const endIdx = i === markers.length - 1 ? blocks.length : markers[i + 1].index;
    chapters.push({
      title: markers[i].title,
      order: i + 1,
      blocks: blocks.slice(startIdx, endIdx),
    });
  }
  return chapters;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function processTarget(target) {
  console.log(`\n=== ${target.label} ===`);
  const metadata = await fetchJson(`${target.storageBaseUrl}metadata.json`);
  const chapter1 = await fetchJson(`${target.storageBaseUrl}chapters/chapter-1.json`);
  const blocks = chapter1.blocks || [];
  console.log(`  Current: ${metadata.chapters?.length ?? '?'} declared chapter(s), ${blocks.length} blocks in chapter-1.json`);

  const newChapters = splitBlocksIntoChapters(blocks);
  if (!newChapters) {
    console.log('  [SKIP] no chapter-marker tables found -- not touching this book.');
    return;
  }

  const totalOut = newChapters.reduce((sum, c) => sum + c.blocks.length, 0);
  console.log(`  Proposed split: ${blocks.length} blocks -> ${newChapters.length} chapters:`);
  newChapters.forEach((c) => console.log(`    ${c.order}. "${c.title}" -- ${c.blocks.length} blocks`));
  if (totalOut !== blocks.length) {
    console.log(`  [ABORT] block count mismatch: ${blocks.length} in, ${totalOut} out -- refusing to write.`);
    return;
  }

  if (!EXECUTE) return;

  const s3 = getS3Client();

  for (const c of newChapters) {
    const chapterOut = { id: chapter1.id, title: c.title, order: c.order, blocks: c.blocks, enriched: true };
    await uploadToR2(
      s3, bucket,
      `${target.r2KeyPrefix}/chapters/chapter-${c.order}.json`,
      Buffer.from(JSON.stringify(chapterOut, null, 2)),
      'application/json'
    );
  }

  const newMetadata = {
    ...metadata,
    chapter_count: newChapters.length,
    chapters: newChapters.map((c) => ({
      title: c.title,
      order: c.order,
      enriched: true,
      blocks_count: c.blocks.length,
      file_name: `chapters/chapter-${c.order}.json`,
    })),
  };
  await uploadToR2(
    s3, bucket,
    `${target.r2KeyPrefix}/metadata.json`,
    Buffer.from(JSON.stringify(newMetadata, null, 2)),
    'application/json'
  );
  console.log(`  [R2 WRITTEN] ${newChapters.length} chapter files + metadata.json`);

  const { data, error, count } = await supabase
    .from('resources')
    .update({ chapter_count: newChapters.length })
    .eq('storage_base_url', target.storageBaseUrl)
    .select('resource_id', { count: 'exact' });
  if (error) throw new Error(`Supabase bulk update failed: ${error.message}`);
  console.log(`  [DB UPDATED] chapter_count=${newChapters.length} on ${data?.length ?? count ?? '?'} resources row(s)`);
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing R2 + Supabase)' : 'DRY RUN (no writes)'}`);
  for (const target of TARGETS) await processTarget(target);
  if (!EXECUTE) console.log('\nDry run only -- re-run with --execute to write.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
