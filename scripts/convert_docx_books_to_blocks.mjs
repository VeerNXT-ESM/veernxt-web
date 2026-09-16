#!/usr/bin/env node
/**
 * scripts/convert_docx_books_to_blocks.mjs
 *
 * Converts the client's master Guide/Precis docx books into the same
 * blocks-JSON format already live in production (public/books/{Guide,Precis}/
 * <title>/metadata.json + chapters/chapter-N.json -- see BlockRenderer.jsx /
 * BookBlocks.jsx for the block types this must match).
 *
 * No AI/Gemini involved, on purpose -- see scripts/content/batch_enrich_books.mjs
 * for the existing paid pipeline this deliberately does NOT call. That
 * script's own first step, parseDocxToSemanticModelNode()
 * (scripts/lib/docxParser.mjs), is already a complete, deterministic
 * docx -> blocks parser; Gemini only runs after it, to splice in purely
 * decorative extra blocks (statStrip/keyFacts/pullQuote/examAlert/
 * comparisonTable) -- it never touches the original paragraphs, which are
 * preserved verbatim either way. This script reuses that exact same
 * parser and stops there, at zero AI cost. Verified live against a real
 * 12-chapter Guide book (Cluster_082_AGRICULTURAL AND RURAL DEVELOPMENT.docx)
 * before writing this file: clean chapter splits on Word H1s, correct
 * heading levels, 60+ real data tables and several definition lists
 * extracted intact, no garbage. One known minor gap carried over from
 * docxParser.mjs, found in that same test: a bold-lead-in paragraph like
 * "**Important:** ..." is not always promoted to a styled `important`
 * callout block (falls through to a plain paragraph, bold markup intact)
 * -- same class of edge case convert_docx_intros_to_blocks.mjs's own
 * docstring already flagged once for Introductions. Not data loss, just
 * a less-decorated render than the ideal; worth a spot-check across a
 * few dozen books before trusting it blanket, not a blocker.
 *
 * Source folder note: batch_enrich_books.mjs's own hardcoded
 * MASTER_DOCS_ROOT ("MASTER DOCUMENTS_superseded_20260819") no longer
 * exists at that path -- it moved under DEPRECATED\. Cross-checked two
 * remaining K: drive candidates against live `resources.source_file`
 * values before picking a default here: FINAL_CONTENT\Final
 * Documents\MASTER DOCUMENTS (67 docx) uniquely contains the exact
 * state-GS-book filenames (Haryana_GS, Goa GS, Tripura_CONSTABLE, etc.)
 * that are actually live in production today, while
 * DEPRECATED\MASTER DOCUMENTS_superseded_20260819 (93 docx) has 60 files
 * not reflected in live content at all -- strong evidence the former is
 * current, not exhaustively proven for every file. Re-check before a
 * full unattended run if anything here looks off against a specific book.
 *
 * Titles are derived from the docx filename (Cluster_NNN_ prefix and a
 * trailing " (n)" dedupe suffix stripped, same convention
 * batch_enrich_books.mjs's cleanTitle() already uses) -- these will NOT
 * always match the live `resources.title` value exactly (some were
 * manually retitled independently of their filename, e.g.
 * "Cluster_043_RRB GS.docx" is titled "GENERAL SCIENCE PRECIS(PCB)" in
 * production). Treat the derived title as a draft starting point for
 * human review, not an authoritative rename.
 *
 * This script only WRITES local JSON (FINAL_BOOKS_STRUCTURED/) -- it does
 * not touch Supabase, upload to R2, or replace anything live. That's a
 * deliberately separate follow-up step, same convention
 * convert_docx_intros_to_blocks.mjs already established.
 *
 * Usage:
 *   node scripts/convert_docx_books_to_blocks.mjs                        (dry run, reports what it would do)
 *   node scripts/convert_docx_books_to_blocks.mjs --execute               (writes the JSON files)
 *   node scripts/convert_docx_books_to_blocks.mjs --execute --limit 5     (only the first 5, for spot-checking)
 *   node scripts/convert_docx_books_to_blocks.mjs --execute --only "GS BOOK STATE"   (path must contain this substring)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseDocxToSemanticModelNode } from './lib/docxParser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const EXECUTE = ARGS.includes('--execute');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1], 10) : Infinity;
})();
const ONLY = (() => {
  const i = ARGS.indexOf('--only');
  return i >= 0 ? ARGS[i + 1] : null;
})();
const ROOT_OVERRIDE = (() => {
  const i = ARGS.indexOf('--root');
  return i >= 0 ? ARGS[i + 1] : null;
})();

// See the file docstring for why this specific folder, not the dead path
// batch_enrich_books.mjs still points to. Pass --root to point at another
// copy without editing this file.
const CONTENT_ROOT = ROOT_OVERRIDE || String.raw`K:\H DRIVE\Quantum Climb\CLIENT ASSETS\VeerNXT\CONTENT\FINAL_CONTENT\Final Documents\MASTER DOCUMENTS`;
// Deliberately NOT under public/ -- local intermediate conversion output,
// same reasoning as FINAL_INTROS_STRUCTURED/FINAL_PYPS_STRUCTURED.
const OUTPUT_ROOT = path.join(__dirname, '..', 'FINAL_BOOKS_STRUCTURED');

const CATEGORIES = ['Guide', 'Precis'];

// ── filesystem walk ──────────────────────────────────────────────
function findDocxFiles(root) {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && /\.docx$/i.test(entry.name) && !entry.name.startsWith('~$')) {
        found.push(full);
      }
    }
  }
  return found.sort();
}

// Same convention as batch_enrich_books.mjs's cleanTitle() -- see file
// docstring on why this is a draft title, not authoritative.
function cleanTitle(fileName) {
  return fileName
    .replace(/^Cluster_\d+_/, '')
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
}

// category = top-level folder under CONTENT_ROOT (Guide/Precis); anything
// else (e.g. "_uncategorized") is kept as its own category rather than
// silently forced into Guide, so it surfaces for a human to sort out.
function deriveIdentity(docxPath) {
  const relPath = path.relative(CONTENT_ROOT, docxPath);
  const parts = relPath.split(path.sep);
  const category = CATEGORIES.includes(parts[0]) ? parts[0] : (parts[0] || 'Unsorted');
  const fileName = path.basename(docxPath);
  const title = cleanTitle(fileName);
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'untitled-book';
  // Appended unconditionally, not just on a detected collision -- same
  // reasoning as convert_docx_intros_to_blocks.mjs: no per-file human
  // review at this scale to catch a silent overwrite otherwise.
  const hash = crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 6);
  const slug = `${category.toLowerCase()}-${baseSlug}-${hash}`;
  return { category, title, slug, relPath, fileName };
}

// ── per-file conversion ──────────────────────────────────────────
async function convertOne(docxPath) {
  const { category, title, slug, relPath, fileName } = deriveIdentity(docxPath);
  const buffer = fs.readFileSync(docxPath);
  const { book } = await parseDocxToSemanticModelNode(buffer, fileName);

  const chapters = book.chapters.map((ch, idx) => ({ ...ch, order: idx + 1 }));
  const totalBlocks = chapters.reduce((sum, ch) => sum + ch.blocks.length, 0);
  const blockTypeCounts = {};
  for (const ch of chapters) {
    for (const b of ch.blocks) blockTypeCounts[b.type] = (blockTypeCounts[b.type] || 0) + 1;
  }

  const metadata = {
    book_id: book.id,
    title,
    source_file: fileName,
    category,
    chapter_count: chapters.length,
    image_count: 0,
    chapters: chapters.map((ch) => ({
      title: ch.title,
      order: ch.order,
      enriched: false,
      blocks_count: ch.blocks.length,
      file_name: `chapters/chapter-${ch.order}.json`,
    })),
  };

  return { category, slug, title, relPath, fileName, metadata, chapters, totalBlocks, blockTypeCounts };
}

// ── main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing JSON files)' : 'DRY RUN'}`);
  console.log(`Scanning for .docx files under: ${CONTENT_ROOT}\n`);

  if (!fs.existsSync(CONTENT_ROOT)) {
    console.error(`Source folder not found: ${CONTENT_ROOT}\nPass --root to point at a different copy.`);
    process.exit(1);
  }

  let files = findDocxFiles(CONTENT_ROOT);
  if (ONLY) files = files.filter((f) => f.toLowerCase().includes(ONLY.toLowerCase()));
  if (files.length > LIMIT) files = files.slice(0, LIMIT);

  console.log(`${files.length} docx file(s) queued.\n`);

  let ok = 0, failed = 0, totalBlocks = 0;
  const emptyBooks = [];
  const noChapterHeadings = [];
  const slugCollisions = new Map();
  const categoryTotals = {};
  const blockTypeTotals = {};

  for (const docxPath of files) {
    try {
      const result = await convertOne(docxPath);
      ok++;
      totalBlocks += result.totalBlocks;
      categoryTotals[result.category] = (categoryTotals[result.category] || 0) + 1;
      for (const [type, count] of Object.entries(result.blockTypeCounts)) {
        blockTypeTotals[type] = (blockTypeTotals[type] || 0) + count;
      }
      if (result.chapters.length === 0 || result.totalBlocks === 0) emptyBooks.push(result.relPath);
      // A book with exactly one chapter titled "Introduction" (docxParser's
      // own fallback bucket when no H1 was found at all) means the source
      // docx used a different/no heading style for its top-level sections
      // -- worth a manual look, since the mechanical split relies on H1.
      if (result.chapters.length === 1 && /^introduction$/i.test(result.chapters[0].title)) {
        noChapterHeadings.push(result.relPath);
      }

      if (slugCollisions.has(result.slug)) {
        slugCollisions.get(result.slug).push(result.relPath);
      } else {
        slugCollisions.set(result.slug, [result.relPath]);
      }

      console.log(`[ok] [${result.category}] "${result.title}" — ${result.chapters.length} chapter(s), ${result.totalBlocks} blocks`);

      if (EXECUTE) {
        const outDir = path.join(OUTPUT_ROOT, result.category, result.slug);
        fs.mkdirSync(path.join(outDir, 'chapters'), { recursive: true });
        fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(result.metadata, null, 2));
        for (const ch of result.chapters) {
          fs.writeFileSync(path.join(outDir, 'chapters', `chapter-${ch.order}.json`), JSON.stringify(ch, null, 2));
        }
      }
    } catch (err) {
      failed++;
      console.error(`[FAIL] ${docxPath}\n       ${err.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Converted: ${ok}  Failed: ${failed}`);
  console.log(`By category: ${JSON.stringify(categoryTotals)}`);
  console.log(`Total blocks produced: ${totalBlocks}  (avg ${(totalBlocks / (ok || 1)).toFixed(1)}/book)`);
  console.log(`Block type breakdown: ${JSON.stringify(blockTypeTotals)}`);

  if (emptyBooks.length) {
    console.log(`\n${emptyBooks.length} book(s) produced ZERO chapters/blocks (needs a manual look):`);
    for (const f of emptyBooks) console.log(`  ${f}`);
  }
  if (noChapterHeadings.length) {
    console.log(`\n${noChapterHeadings.length} book(s) had no real H1 chapter headings detected -- everything fell into one fallback "Introduction" chapter, worth checking the source docx's heading styles:`);
    for (const f of noChapterHeadings) console.log(`  ${f}`);
  }
  const dupes = [...slugCollisions.entries()].filter(([, paths]) => paths.length > 1);
  if (dupes.length) {
    console.log(`\n${dupes.length} slug collision(s) despite the path hash -- investigate:`);
    for (const [slug, paths] of dupes) {
      console.log(`  ${slug}:`);
      for (const p of paths) console.log(`    ${p}`);
    }
  }
  if (!EXECUTE) console.log('\nDry run only -- no files written. Re-run with --execute to write to ' + OUTPUT_ROOT);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
