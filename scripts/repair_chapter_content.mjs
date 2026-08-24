#!/usr/bin/env node
/**
 * scripts/repair_chapter_content.mjs
 *
 * Repairs the content-loss bug fixed in scripts/docxParser.mjs: every
 * paragraph/important/examTip/definition/example/callout block's `content`
 * and every table/list/numberedList block's cells/items were silently lost
 * (see docxParser.mjs's own docstring) across the whole locally-enriched
 * corpus under public/books/{Guide,Precis}. Confirmed live: 29,192
 * paragraph blocks, 4,761 table blocks, 3,305 list blocks -- 100% of each
 * -- across 2,174 chapters.
 *
 * This does NOT call Gemini again. Tables/lists/paragraphs are original
 * document text, not model output -- Gemini only ever produced the
 * decoration blocks (statStrip/keyFacts/pullQuote/examAlert/
 * comparisonTable), which are untouched here. For each already-enriched
 * local book:
 *   1. Read metadata.json's source_file, locate that exact .docx under
 *      MASTER_DOCS_ROOT, and re-parse it with the FIXED parser.
 *   2. Validate the fresh parse's chapter count and heading-block sequence
 *      exactly matches the existing chapter files' -- headings never had
 *      the content-loss bug, so if they don't match, something structural
 *      changed since the original run (different source revision, etc.)
 *      and this book is skipped rather than guessed at.
 *   3. For each chapter, walk both the fresh parse and the existing
 *      chapter's blocks, tracking one counter PER EXACT BLOCK TYPE
 *      (paragraph, important, examTip, definition, example, callout,
 *      table, list, numberedList independently -- not lumped together).
 *      Since block classification logic is identical between the old
 *      (content-broken) and new (fixed) parses of the same source text,
 *      the Nth block of a given type in one should be the Nth block of
 *      that type in the other. If the per-type counts don't match for a
 *      chapter, that chapter is skipped and reported rather than
 *      mis-attaching content to the wrong block.
 *   4. Separately (no docx re-parse needed): drops any pullQuote block
 *      whose content verbatim-duplicates a heading elsewhere in the same
 *      chapter -- the "chapter looks like it's said twice" bug -- since a
 *      duplicate pull-quote adds no information beyond the heading it
 *      copies.
 *
 * Usage:
 *   node scripts/repair_chapter_content.mjs             # dry run
 *   node scripts/repair_chapter_content.mjs --execute    # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseDocxToSemanticModelNode } from './docxParser.mjs';

const EXECUTE = process.argv.includes('--execute');
const BOOKS_ROOT = path.resolve('public/books');
const CATEGORY_DIRS = ['Guide', 'Precis'];
const MASTER_DOCS_ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\MASTER DOCUMENTS_superseded_20260819';

// 'heading4' is its own repairable kind: classifyParagraph's short-line
// heuristic classifies terse lines (e.g. bullet points <=5 words) as
// `{ type: 'heading', level: 4 }` and hit the exact same content-loss bug
// as paragraphs. Level 2/3 headings (h2/h3/h4 tags) always used
// .textContent and were never affected -- those are the reliable signal
// used to validate a fresh parse actually matches, so they're kept out of
// the repairable set and never touched.
const REPAIRABLE_CONTENT_TYPES = ['paragraph', 'important', 'examTip', 'definition', 'example', 'callout', 'heading4'];
const REPAIRABLE_LIST_TYPES = ['list', 'numberedList'];
const REPAIRABLE_TABLE_TYPE = 'table';

/** Distinguishes structural headings (level 2/3, always correct) from classifyParagraph's short-line "heading4" (bug-affected, repairable). */
function blockKind(block) {
  if (block.type === 'heading' && block.level === 4) return 'heading4';
  return block.type;
}

function findDocxByName(root, targetName) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === targetName) return full;
    }
  }
  return null;
}

function listBookFolders() {
  const books = [];
  for (const category of CATEGORY_DIRS) {
    const categoryDir = path.join(BOOKS_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const name of fs.readdirSync(categoryDir)) {
      const bookDir = path.join(categoryDir, name);
      if (!fs.statSync(bookDir).isDirectory()) continue;
      const metadataPath = path.join(bookDir, 'metadata.json');
      const chaptersDir = path.join(bookDir, 'chapters');
      if (!fs.existsSync(metadataPath) || !fs.existsSync(chaptersDir)) continue;
      const chapterFiles = fs.readdirSync(chaptersDir)
        .filter((f) => /^chapter-\d+\.json$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
      if (!chapterFiles.length) continue;
      books.push({ title: name, category, bookDir, chaptersDir, metadataPath, chapterFiles });
    }
  }
  return books;
}

function headingSignature(chapterBlocks) {
  return chapterBlocks.filter((b) => b.type === 'heading' && b.level !== 4).map((b) => (b.content || '').trim());
}

// Headings are frequently list-numbered ("1. Important Sessions..."); a
// pullQuote duplicating that heading's text never carries the prefix, so
// it has to be stripped before comparing or the match silently misses
// (caught live: chapter 13 of "GS & GK GUIDE BOOK" survived a first pass
// for exactly this reason).
function normalize(s) {
  return (s || '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
}

/** Removes pullQuote blocks that verbatim-duplicate a heading in the same chapter. Returns count removed. */
function stripDuplicatePullQuotes(blocks) {
  const headingTexts = new Set(blocks.filter((b) => b.type === 'heading').map((b) => normalize(b.content)));
  let removed = 0;
  const kept = blocks.filter((b) => {
    if (b.type === 'pullQuote' && headingTexts.has(normalize(b.content))) { removed++; return false; }
    return true;
  });
  return { blocks: kept, removed };
}

const REPAIRABLE_KINDS = [...REPAIRABLE_CONTENT_TYPES, ...REPAIRABLE_LIST_TYPES, REPAIRABLE_TABLE_TYPE];

/** Repairs one chapter's blocks in place using the matching fresh chapter's blocks. Returns a stats object, or null if kind counts mismatch. */
function repairChapterBlocks(existingBlocks, freshBlocks) {
  const freshByKind = {};
  for (const kind of REPAIRABLE_KINDS) {
    freshByKind[kind] = freshBlocks.filter((b) => blockKind(b) === kind);
  }
  const existingCountByKind = {};
  for (const kind of REPAIRABLE_KINDS) {
    existingCountByKind[kind] = existingBlocks.filter((b) => blockKind(b) === kind).length;
  }
  for (const kind of REPAIRABLE_KINDS) {
    if (existingCountByKind[kind] !== freshByKind[kind].length) {
      return { mismatch: { kind, existing: existingCountByKind[kind], fresh: freshByKind[kind].length } };
    }
  }

  const cursor = {};
  let paragraphsRepaired = 0, tablesRepaired = 0, listsRepaired = 0;
  for (const block of existingBlocks) {
    const kind = blockKind(block);
    if (!REPAIRABLE_KINDS.includes(kind)) continue;
    cursor[kind] = (cursor[kind] || 0);
    const freshBlock = freshByKind[kind][cursor[kind]];
    cursor[kind]++;
    if (!freshBlock) continue;

    if (REPAIRABLE_CONTENT_TYPES.includes(kind)) {
      const isEmpty = !block.content || String(block.content).trim() === '';
      if (isEmpty && freshBlock.content) { block.content = freshBlock.content; paragraphsRepaired++; }
    } else if (kind === REPAIRABLE_TABLE_TYPE) {
      const isEmpty = (block.rows || []).every((r) => (r.cells || []).every((c) => !c || String(c).trim() === ''));
      if (isEmpty) { block.rows = freshBlock.rows; tablesRepaired++; }
    } else if (REPAIRABLE_LIST_TYPES.includes(kind)) {
      const isEmpty = (block.items || []).every((it) => !it || String(it).trim() === '');
      if (isEmpty) { block.items = freshBlock.items; listsRepaired++; }
    }
  }
  return { paragraphsRepaired, tablesRepaired, listsRepaired };
}

async function main() {
  const books = listBookFolders();
  console.log(`${books.length} local book folders found under public/books/{Guide,Precis}.\n`);

  let booksOk = 0, booksSkippedNoSource = 0, booksSkippedChapterCountMismatch = 0, booksSkippedHeadingMismatch = 0;
  let totalParagraphsRepaired = 0, totalTablesRepaired = 0, totalListsRepaired = 0, totalPullQuotesDropped = 0;
  let chaptersSkippedTypeMismatch = 0;
  const mismatchExamples = [];

  for (const book of books) {
    const metadata = JSON.parse(fs.readFileSync(book.metadataPath, 'utf-8'));
    const sourceFile = metadata.source_file;
    if (!sourceFile) { booksSkippedNoSource++; console.log(`[skip] "${book.title}" (${book.category}) — metadata.json has no source_file.`); continue; }

    const docxPath = findDocxByName(MASTER_DOCS_ROOT, sourceFile);
    if (!docxPath) { booksSkippedNoSource++; console.log(`[skip] "${book.title}" (${book.category}) — source file "${sourceFile}" not found under MASTER_DOCS_ROOT.`); continue; }

    let freshBook;
    try {
      const buffer = fs.readFileSync(docxPath);
      const { book: parsed } = await parseDocxToSemanticModelNode(buffer, sourceFile);
      freshBook = parsed;
    } catch (err) {
      console.log(`[skip] "${book.title}" (${book.category}) — failed to re-parse "${sourceFile}": ${err.message}`);
      booksSkippedNoSource++;
      continue;
    }

    if (freshBook.chapters.length !== book.chapterFiles.length) {
      booksSkippedChapterCountMismatch++;
      console.log(`[skip] "${book.title}" (${book.category}) — chapter count mismatch: existing ${book.chapterFiles.length}, fresh parse ${freshBook.chapters.length}.`);
      continue;
    }

    let bookHeadingMismatch = false;
    let bookParagraphsRepaired = 0, bookTablesRepaired = 0, bookListsRepaired = 0, bookPullQuotesDropped = 0;
    const chapterWrites = [];

    for (let i = 0; i < book.chapterFiles.length; i++) {
      const chapterPath = path.join(book.chaptersDir, book.chapterFiles[i]);
      const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf-8'));
      const freshChapter = freshBook.chapters[i];

      const existingHeadings = headingSignature(chapter.blocks);
      const freshHeadings = headingSignature(freshChapter.blocks);
      if (JSON.stringify(existingHeadings) !== JSON.stringify(freshHeadings)) {
        bookHeadingMismatch = true;
        if (mismatchExamples.length < 8) mismatchExamples.push(`"${book.title}" (${book.category}) ${book.chapterFiles[i]} — heading sequence differs from fresh parse.`);
        break;
      }

      const result = repairChapterBlocks(chapter.blocks, freshChapter.blocks);
      if (result.mismatch) {
        chaptersSkippedTypeMismatch++;
        if (mismatchExamples.length < 8) mismatchExamples.push(`"${book.title}" (${book.category}) ${book.chapterFiles[i]} — ${result.mismatch.kind} count differs: existing ${result.mismatch.existing}, fresh ${result.mismatch.fresh}.`);
        continue;
      }

      const { blocks: strippedBlocks, removed } = stripDuplicatePullQuotes(chapter.blocks);
      chapter.blocks = strippedBlocks;

      bookParagraphsRepaired += result.paragraphsRepaired;
      bookTablesRepaired += result.tablesRepaired;
      bookListsRepaired += result.listsRepaired;
      bookPullQuotesDropped += removed;

      chapterWrites.push({ chapterPath, chapter });
    }

    if (bookHeadingMismatch) {
      booksSkippedHeadingMismatch++;
      console.log(`[skip] "${book.title}" (${book.category}) — heading mismatch, skipped entirely (not guessing).`);
      continue;
    }

    booksOk++;
    totalParagraphsRepaired += bookParagraphsRepaired;
    totalTablesRepaired += bookTablesRepaired;
    totalListsRepaired += bookListsRepaired;
    totalPullQuotesDropped += bookPullQuotesDropped;
    console.log(`[ok] "${book.title}" (${book.category}) — ${bookParagraphsRepaired} paragraphs, ${bookTablesRepaired} tables, ${bookListsRepaired} lists repaired; ${bookPullQuotesDropped} duplicate pull-quotes dropped.`);

    if (EXECUTE) {
      for (const { chapterPath, chapter } of chapterWrites) {
        fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Books fully repaired: ${booksOk}/${books.length}`);
  console.log(`Books skipped — no resolvable source docx: ${booksSkippedNoSource}`);
  console.log(`Books skipped — chapter count mismatch: ${booksSkippedChapterCountMismatch}`);
  console.log(`Books skipped — heading sequence mismatch: ${booksSkippedHeadingMismatch}`);
  console.log(`Chapters skipped within otherwise-ok books — block-type count mismatch: ${chaptersSkippedTypeMismatch}`);
  console.log(`Total paragraphs repaired: ${totalParagraphsRepaired}`);
  console.log(`Total tables repaired: ${totalTablesRepaired}`);
  console.log(`Total lists repaired: ${totalListsRepaired}`);
  console.log(`Total duplicate pull-quotes dropped: ${totalPullQuotesDropped}`);
  if (mismatchExamples.length) {
    console.log('\n--- Mismatch examples ---');
    console.log(mismatchExamples.join('\n'));
  }

  if (!EXECUTE) console.log('\nDry run only — no files written. Re-run with --execute to apply.');
  else console.log('\nDone.');
}

main().catch((err) => { console.error(err); process.exit(1); });
