#!/usr/bin/env node
/**
 * scripts/scan_content_issues.mjs
 *
 * Read-only QA scan over every book under public/books/{Guide,Precis}.
 * Phase 0 of the book-content-editor plan: before building an editor to fix
 * "some text is missing" by hand, find out how much is actually broken and
 * where, so the fix list is prioritized instead of a blind re-read of ~122
 * books.
 *
 * Flags, per chapter:
 *   - structural: metadata.json chapter count/blocks_count vs the actual
 *     chapter-N.json files on disk (missing files, orphan files, stale counts)
 *   - empty/near-empty content on any text-bearing block (heading, paragraph,
 *     important, examTip, definition, example, callout, pullQuote)
 *   - empty or ragged table / comparisonTable cells (ragged = row length
 *     doesn't match the header row's column count)
 *   - empty list/numberedList/examAlert/keyFacts items
 *   - statStrip entries missing a label or value
 *   - image blocks whose src doesn't resolve to a real file under public/
 *   - duplicate pullQuote content -- verbatim match against a heading in the
 *     same chapter, the leftover artifact from the bug repair_chapter_content.mjs
 *     already fixed once
 *
 * This does not modify any file. Output:
 *   - console summary: issue counts by type, worst-offending books
 *   - full JSON report written to the path given by --out (default: a
 *     scratch file next to this script, see OUT_DEFAULT below)
 *
 * Usage:
 *   node scripts/scan_content_issues.mjs [--out path/to/report.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_ROOT = path.resolve(__dirname, '..', 'public', 'books');
const CATEGORY_DIRS = ['Guide', 'Precis'];

const outArgIndex = process.argv.indexOf('--out');
const OUT_PATH = outArgIndex !== -1 && process.argv[outArgIndex + 1]
  ? path.resolve(process.argv[outArgIndex + 1])
  : path.resolve(__dirname, '..', 'content-issues-report.json');

const TEXT_BLOCK_TYPES = new Set([
  'paragraph', 'important', 'examTip', 'definition', 'example', 'callout', 'pullQuote',
]);
const SHORT_CONTENT_THRESHOLD = 15; // stripped chars

function stripHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function listBookDirs() {
  const books = [];
  for (const category of CATEGORY_DIRS) {
    const categoryDir = path.join(BOOKS_ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const name of fs.readdirSync(categoryDir)) {
      const bookDir = path.join(categoryDir, name);
      if (!fs.statSync(bookDir).isDirectory()) continue;
      books.push({ category, name, bookDir });
    }
  }
  return books;
}

function addIssue(issues, issue) {
  issues.push(issue);
}

function checkChapterBlocks(blocks, chapterLabel, bookDir, issues) {
  const headingContents = new Set();
  for (const b of blocks) {
    if (b.type === 'heading') {
      const stripped = stripHtml(b.content);
      if (stripped) headingContents.add(stripped.toLowerCase());
    }
  }

  for (const [idx, b] of blocks.entries()) {
    const where = { ...chapterLabel, blockIndex: idx, blockId: b.id, blockType: b.type };

    if (b.type === 'heading' || TEXT_BLOCK_TYPES.has(b.type)) {
      const stripped = stripHtml(b.content);
      if (!stripped) {
        addIssue(issues, { ...where, issue: 'empty_content', severity: 'high', detail: 'content is empty/missing' });
      } else if (b.type !== 'heading' && stripped.length < SHORT_CONTENT_THRESHOLD) {
        // Headings are legitimately short all the time (single-word section
        // titles, and the docx parser's short-line heuristic classifies
        // terse lines like MCQ options as heading level 4) -- flagging those
        // as "content issues" is pure noise. Only paragraph-like prose
        // blocks are worth a short-content check.
        addIssue(issues, { ...where, issue: 'short_content', severity: 'medium', detail: `content is only ${stripped.length} chars: "${stripped}"` });
      }
      if (b.type === 'pullQuote' && stripped && headingContents.has(stripped.toLowerCase())) {
        addIssue(issues, { ...where, issue: 'duplicate_pullquote', severity: 'medium', detail: 'pullQuote content duplicates a heading in the same chapter' });
      }
    } else if (b.type === 'table') {
      const rows = Array.isArray(b.rows) ? b.rows : [];
      if (rows.length === 0) {
        addIssue(issues, { ...where, issue: 'empty_table', severity: 'high', detail: 'table has no rows' });
      } else {
        const headerCols = rows[0]?.cells?.length ?? 0;
        rows.forEach((row, rIdx) => {
          const cells = Array.isArray(row.cells) ? row.cells : [];
          if (cells.length !== headerCols) {
            addIssue(issues, { ...where, issue: 'ragged_table_row', severity: 'high', detail: `row ${rIdx} has ${cells.length} cells, header has ${headerCols}` });
          }
          cells.forEach((cell, cIdx) => {
            if (!stripHtml(cell)) {
              addIssue(issues, { ...where, issue: 'empty_table_cell', severity: 'high', detail: `row ${rIdx}, col ${cIdx} is empty` });
            }
          });
        });
      }
    } else if (b.type === 'comparisonTable') {
      const headers = Array.isArray(b.headers) ? b.headers : [];
      const rows = Array.isArray(b.rows) ? b.rows : [];
      if (headers.length === 0) {
        addIssue(issues, { ...where, issue: 'empty_comparison_headers', severity: 'high', detail: 'comparisonTable has no headers' });
      }
      headers.forEach((h, hIdx) => {
        if (!stripHtml(h)) addIssue(issues, { ...where, issue: 'empty_comparison_header', severity: 'high', detail: `header col ${hIdx} is empty` });
      });
      rows.forEach((row, rIdx) => {
        const cells = Array.isArray(row) ? row : [];
        if (cells.length !== headers.length) {
          addIssue(issues, { ...where, issue: 'ragged_comparison_row', severity: 'high', detail: `row ${rIdx} has ${cells.length} cells, headers has ${headers.length}` });
        }
        cells.forEach((cell, cIdx) => {
          if (!stripHtml(cell)) addIssue(issues, { ...where, issue: 'empty_comparison_cell', severity: 'high', detail: `row ${rIdx}, col ${cIdx} is empty` });
        });
      });
    } else if (b.type === 'list' || b.type === 'numberedList' || b.type === 'examAlert') {
      const items = Array.isArray(b.items) ? b.items : [];
      if (items.length === 0) {
        addIssue(issues, { ...where, issue: 'empty_items', severity: 'high', detail: `${b.type} has no items` });
      } else {
        items.forEach((item, iIdx) => {
          if (!stripHtml(item)) addIssue(issues, { ...where, issue: 'empty_item', severity: 'high', detail: `item ${iIdx} is empty` });
        });
      }
    } else if (b.type === 'keyFacts') {
      const items = Array.isArray(b.items) ? b.items : [];
      if (items.length === 0) {
        addIssue(issues, { ...where, issue: 'empty_items', severity: 'high', detail: 'keyFacts has no items' });
      } else {
        items.forEach((item, iIdx) => {
          if (!stripHtml(item)) addIssue(issues, { ...where, issue: 'empty_item', severity: 'high', detail: `item ${iIdx} is empty` });
        });
      }
    } else if (b.type === 'statStrip') {
      const stats = Array.isArray(b.stats) ? b.stats : [];
      if (stats.length === 0) {
        addIssue(issues, { ...where, issue: 'empty_stats', severity: 'high', detail: 'statStrip has no stats' });
      } else {
        stats.forEach((s, sIdx) => {
          if (!stripHtml(s?.label)) addIssue(issues, { ...where, issue: 'empty_stat_label', severity: 'medium', detail: `stat ${sIdx} missing label` });
          if (!stripHtml(s?.value)) addIssue(issues, { ...where, issue: 'empty_stat_value', severity: 'medium', detail: `stat ${sIdx} missing value` });
        });
      }
    } else if (b.type === 'image') {
      if (!b.src) {
        addIssue(issues, { ...where, issue: 'missing_image_src', severity: 'high', detail: 'image block has no src' });
      } else if (b.src.startsWith('/books/')) {
        const absolute = path.resolve(__dirname, '..', 'public', b.src.replace(/^\//, ''));
        if (!fs.existsSync(absolute)) {
          addIssue(issues, { ...where, issue: 'missing_image_file', severity: 'high', detail: `${b.src} does not exist on disk` });
        }
      }
    }
  }
}

function scanBook({ category, name, bookDir }, issues) {
  const metadataPath = path.join(bookDir, 'metadata.json');
  const chaptersDir = path.join(bookDir, 'chapters');
  const bookLabelBase = { category, book: name };

  if (!fs.existsSync(metadataPath)) {
    addIssue(issues, { ...bookLabelBase, issue: 'missing_metadata', severity: 'high', detail: 'metadata.json not found' });
    return;
  }
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (e) {
    addIssue(issues, { ...bookLabelBase, issue: 'invalid_metadata_json', severity: 'high', detail: e.message });
    return;
  }

  const declaredChapters = Array.isArray(metadata.chapters) ? metadata.chapters : [];
  const actualFiles = fs.existsSync(chaptersDir)
    ? fs.readdirSync(chaptersDir).filter((f) => /^chapter-\d+\.json$/.test(f))
    : [];
  const actualFileSet = new Set(actualFiles);
  const declaredFileSet = new Set(declaredChapters.map((c) => c.file_name?.replace('chapters/', '')));

  for (const c of declaredChapters) {
    const fileName = c.file_name?.replace('chapters/', '');
    if (!fileName || !actualFileSet.has(fileName)) {
      addIssue(issues, { ...bookLabelBase, issue: 'missing_chapter_file', severity: 'high', detail: `metadata references ${c.file_name} but it is not on disk (order ${c.order}: "${c.title}")` });
    }
  }
  for (const fileName of actualFiles) {
    if (!declaredFileSet.has(fileName)) {
      addIssue(issues, { ...bookLabelBase, issue: 'orphan_chapter_file', severity: 'medium', detail: `${fileName} exists on disk but metadata.json doesn't reference it` });
    }
  }

  for (const c of declaredChapters) {
    const fileName = c.file_name?.replace('chapters/', '');
    if (!fileName || !actualFileSet.has(fileName)) continue;
    const chapterPath = path.join(chaptersDir, fileName);
    const chapterLabel = { ...bookLabelBase, chapterFile: fileName, chapterOrder: c.order, chapterTitle: c.title };
    let chapterData;
    try {
      chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
    } catch (e) {
      addIssue(issues, { ...chapterLabel, issue: 'invalid_chapter_json', severity: 'high', detail: e.message });
      continue;
    }
    const blocks = Array.isArray(chapterData.blocks) ? chapterData.blocks : [];
    if (typeof c.blocks_count === 'number' && c.blocks_count !== blocks.length) {
      // Cosmetic: blocks_count is a display/admin field, never read by
      // BlockRenderer, so a mismatch doesn't affect what ships -- but it's
      // worth regenerating metadata.json once real edits stop landing.
      addIssue(issues, { ...chapterLabel, issue: 'blocks_count_mismatch', severity: 'low', detail: `metadata says ${c.blocks_count} blocks, file has ${blocks.length}` });
    }
    if (blocks.length === 0) {
      addIssue(issues, { ...chapterLabel, issue: 'empty_chapter', severity: 'high', detail: 'chapter has zero blocks' });
    }
    checkChapterBlocks(blocks, chapterLabel, bookDir, issues);
  }
}

function run() {
  const books = listBookDirs();
  const issues = [];
  console.log(`Scanning ${books.length} books under public/books/{Guide,Precis}...\n`);

  for (const book of books) {
    scanBook(book, issues);
  }

  // Summary by issue type
  const byType = {};
  for (const iss of issues) {
    byType[iss.issue] = (byType[iss.issue] || 0) + 1;
  }

  // Summary by book -- ranked on high+medium only so cosmetic "low"
  // (blocks_count_mismatch) noise doesn't dominate the priority order.
  const byBook = {};
  const byBookActionable = {};
  for (const iss of issues) {
    const key = `${iss.category}/${iss.book}`;
    byBook[key] = (byBook[key] || 0) + 1;
    if (iss.severity !== 'low') byBookActionable[key] = (byBookActionable[key] || 0) + 1;
  }
  const worstBooks = Object.entries(byBookActionable).sort((a, b) => b[1] - a[1]).slice(0, 20);

  console.log('=== Issue counts by type ===');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(6)}  ${type}`);
  }
  console.log(`\nTotal issues: ${issues.length} across ${Object.keys(byBook).length} books\n`);

  console.log('=== Worst 20 books (by high+medium issue count, low-severity excluded) ===');
  for (const [book, count] of worstBooks) {
    console.log(`  ${String(count).padStart(5)}  ${book}`);
  }

  const highSeverity = issues.filter((i) => i.severity === 'high').length;
  const mediumSeverity = issues.filter((i) => i.severity === 'medium').length;
  const lowSeverity = issues.filter((i) => i.severity === 'low').length;
  console.log(`\nSeverity split: ${highSeverity} high, ${mediumSeverity} medium, ${lowSeverity} low (cosmetic)\n`);

  const report = {
    generatedAt: new Date().toISOString(),
    booksScanned: books.length,
    totalIssues: issues.length,
    byType,
    worstBooks: worstBooks.map(([book, count]) => ({ book, count })),
    issues,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));
  console.log(`Full report written to: ${OUT_PATH}`);
}

run();
