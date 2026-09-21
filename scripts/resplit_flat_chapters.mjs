#!/usr/bin/env node
/**
 * scripts/resplit_flat_chapters.mjs
 *
 * Fixes a real docxParser.mjs/split_large_books.mjs limitation: chapter
 * detection only fires on mammoth's <h1> tag, which only appears when the
 * source .docx used Word's actual "Heading 1" paragraph style for chapter
 * titles. When a chapter title was typed as bold/large text instead, the
 * whole document falls into one ensureChapter() catch-all bucket literally
 * titled "Introduction" -- confirmed live across 11 local books, all
 * titled "Introduction", all with 145-1,081 blocks (never a genuinely
 * short book).
 *
 * Of those 11, these 6 have a real, in-text "CHAPTER N" marker this script
 * can split on (the other 5 have no such marker at all and need either a
 * source-doc reformat or a Gemini-assisted split -- not attempted here):
 *
 *   Guide/Assam_GS, Guide/Bihar_GS, Guide/ELECTRICAL ENGINEERING,
 *   Precis/ELECTRICAL ENGINEERING, Guide/SSC REASONING GUIDE BOOK,
 *   Precis/REASONING
 *
 * Marker detection matches block TEXT, not just type='heading' -- some
 * chapter markers (e.g. "CHAPTER 2 -- AC CIRCUITS & PHASORS") got
 * misclassified as type='paragraph' by classifyParagraph()'s <=5-word
 * heading heuristic (6+ words), so restricting to type='heading' would
 * silently keep splitting around a missing chapter. Confirmed live this
 * exact gap in both Electrical Engineering (missing Chapter 2) and SSC
 * Reasoning (missing Chapter 02) before writing this.
 *
 * Only the FIRST occurrence of each chapter number is used as a boundary
 * -- both Electrical Engineering files have a second, tightly-clustered
 * "Chapter 1.../Chapter 2..." listing near the end of the document (an
 * index/summary section, ~2 blocks apart) that would otherwise be
 * misread as real boundaries.
 *
 * Content before the first marker (title page, "how to use this book",
 * table of contents) is folded into chapter 1 rather than dropped, so no
 * original content is lost.
 *
 * Usage:
 *   node scripts/resplit_flat_chapters.mjs             # dry run, prints the proposed split
 *   node scripts/resplit_flat_chapters.mjs --execute    # writes new chapter files + metadata.json
 */
import fs from 'node:fs';
import path from 'node:path';

const EXECUTE = process.argv.includes('--execute');

const TARGETS = [
  { category: 'Guide', title: 'Assam_GS' },
  { category: 'Guide', title: 'Bihar_GS' },
  { category: 'Guide', title: 'ELECTRICAL ENGINEERING' },
  { category: 'Precis', title: 'ELECTRICAL ENGINEERING' },
  { category: 'Guide', title: 'SSC REASONING GUIDE BOOK' },
  { category: 'Precis', title: 'REASONING' },
  { category: 'Guide', title: 'BASE BOOK' },
  { category: 'Guide', title: 'HINDI' },
  { category: 'Guide', title: 'HINDI GUIDE BOOK' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '');
}

function blockText(b) {
  if (typeof b.content === 'string') return stripTags(b.content);
  if (typeof b.text === 'string') return stripTags(b.text);
  if (Array.isArray(b.items)) return b.items.map(stripTags).join(' ');
  return '';
}

// Matches "CHAPTER 1", "CHAPTER  01\tANALOGY", "CHAPTER 2 — AC CIRCUITS & PHASORS",
// "UNIT 1 — QUANTITATIVE APTITUDE", etc.
const CHAPTER_MARKER_RE = /^(?:chapter|unit)\s*[-:.]?\s*0*(\d+)\b[\s\t:—.-]*(.*)$/i;
// Matches "अध्याय 1: परीक्षा परिचय..." (Hindi for "Chapter N: ...").
const HINDI_CHAPTER_MARKER_RE = /^अध्याय\s*0*(\d+)\s*[:：]?\s*(.*)$/;

function findChapterMarkers(blocks) {
  const firstSeen = new Map(); // chapterNum -> { index, suffix }
  blocks.forEach((b, i) => {
    if (b.type !== 'heading' && b.type !== 'paragraph') return;
    const text = blockText(b).trim();
    const m = text.match(CHAPTER_MARKER_RE) || text.match(HINDI_CHAPTER_MARKER_RE);
    if (!m) return;
    const num = parseInt(m[1], 10);
    if (!firstSeen.has(num)) firstSeen.set(num, { index: i, suffix: (m[2] || '').trim() });
  });
  return firstSeen;
}

function titleCase(s) {
  if (s !== s.toUpperCase()) return s; // already mixed-case, leave as authored
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveTitle(marker, blocks) {
  let suffix = marker.suffix.replace(/&amp;/g, '&').replace(/^[\t\s]+/, '');
  if (suffix) return titleCase(suffix);
  // Bare "CHAPTER N" with no descriptive suffix -- the very next block is
  // always the real descriptive title (verified live in Assam_GS/Bihar_GS),
  // but classifyParagraph()'s <=5-word heading heuristic often misclassifies
  // a 6-8 word title as type='paragraph' -- so accept either type here,
  // gated on it actually looking like a short title, not body prose.
  const next = blocks[marker.index + 1];
  if (next && (next.type === 'heading' || next.type === 'paragraph')) {
    const text = blockText(next).trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (text && wordCount <= 12 && !/[.!?]$/.test(text)) return titleCase(text);
  }
  return `Chapter`;
}

function processBook(target) {
  const bookDir = path.join('public/books', target.category, target.title);
  const chaptersDir = path.join(bookDir, 'chapters');
  const metadataPath = path.join(bookDir, 'metadata.json');
  const chapterFile = path.join(chaptersDir, 'chapter-1.json');

  console.log(`\n=== "${target.title}" (${target.category}) ===`);

  if (!fs.existsSync(chapterFile)) {
    console.log(`  [SKIP] ${chapterFile} not found.`);
    return;
  }

  const original = JSON.parse(fs.readFileSync(chapterFile, 'utf-8'));
  const blocks = original.blocks || [];
  const markers = findChapterMarkers(blocks);
  const sortedNums = [...markers.keys()].sort((a, b) => a - b);

  let indicesMonotonic = true;
  for (let i = 1; i < sortedNums.length; i++) {
    if (markers.get(sortedNums[i]).index <= markers.get(sortedNums[i - 1]).index) indicesMonotonic = false;
  }

  if (sortedNums.length < 2 || !indicesMonotonic) {
    console.log(`  [SKIP] markers not usable (found ${sortedNums.length} distinct numbers, monotonic=${indicesMonotonic}) -- not touching this book.`);
    return;
  }

  const newChapters = [];
  for (let i = 0; i < sortedNums.length; i++) {
    const num = sortedNums[i];
    const marker = markers.get(num);
    const startIdx = i === 0 ? 0 : marker.index;
    const endIdx = i === sortedNums.length - 1 ? blocks.length : markers.get(sortedNums[i + 1]).index;
    const chapterBlocks = blocks.slice(startIdx, endIdx);
    newChapters.push({
      id: generateId(),
      title: deriveTitle(marker, blocks),
      order: i + 1,
      blocks: chapterBlocks,
      enriched: original.enriched !== false,
    });
  }

  const totalOut = newChapters.reduce((sum, ch) => sum + ch.blocks.length, 0);
  console.log(`  ${blocks.length} blocks -> ${newChapters.length} chapters (front matter folded into chapter 1):`);
  newChapters.forEach((ch) => console.log(`    ${ch.order}. "${ch.title}" — ${ch.blocks.length} blocks`));

  if (totalOut !== blocks.length) {
    console.log(`  [ABORT] block count mismatch: original=${blocks.length}, split total=${totalOut} -- refusing to write.`);
    return;
  }

  if (!EXECUTE) return;

  // Remove the old single chapter file, write the new ones.
  fs.unlinkSync(chapterFile);
  for (const ch of newChapters) {
    const outPath = path.join(chaptersDir, `chapter-${ch.order}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ id: ch.id, title: ch.title, order: ch.order, blocks: ch.blocks, enriched: ch.enriched }, null, 2));
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  metadata.chapter_count = newChapters.length;
  metadata.chapters = newChapters.map((ch) => ({
    title: ch.title,
    order: ch.order,
    enriched: ch.enriched,
    blocks_count: ch.blocks.length,
    file_name: `chapters/chapter-${ch.order}.json`,
  }));
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`  [WRITTEN] ${newChapters.length} chapter files + metadata.json updated.`);
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing files)' : 'DRY RUN (no writes)'}`);
for (const target of TARGETS) processBook(target);
if (!EXECUTE) console.log('\nDry run only -- re-run with --execute to write.');
