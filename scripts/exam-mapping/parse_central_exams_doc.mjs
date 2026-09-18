#!/usr/bin/env node
/**
 * scripts/exam-mapping/parse_central_exams_doc.mjs
 *
 * Parses "1. Central Exams List (1).docx" (the content team's own
 * authoritative Central-exam category/conducting-body/exam-name/website
 * list) into structured JSON, for scripts/exam-mapping/audit_central_exams.mjs
 * to diff against lc_exams. Read-only, writes nothing to the DB.
 *
 * mammoth.convertToHtml preserves the doc's real <table> with rowspan-
 * merged Category/Conducting Body/Website/Main-head cells (confirmed live
 * -- extractRawText flattens those merges away, which is why this uses
 * convertToHtml + a small purpose-built table walker instead of a
 * plain-text heuristic).
 *
 * Usage:
 *   node scripts/exam-mapping/parse_central_exams_doc.mjs [outPath]
 */
import fs from 'node:fs';
import mammoth from 'mammoth';

const DOC_PATH = 'K:/H DRIVE/Quantum Climb/CLIENT ASSETS/VeerNXT/1. Central Exams List  (1).docx';
const OUT_PATH = process.argv[2] || 'central_exams_parsed.json';

function stripTags(html) {
  if (!html) return '';
  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<a\s+id="[^"]*"[^>]*>\s*<\/a>/gi, '')
    // Separate cells sometimes hold multiple <p>/<li> paragraphs (e.g. a
    // conducting body's full name and its abbreviation as two paragraphs in
    // one cell) -- turn those boundaries into a space before stripping the
    // rest, so they don't fuse into one word.
    .replace(/<\/(p|li|div|br)\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[\u200b\u00a0]/g, ' ') // zero-width space / nbsp seen trailing on website cells
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(html) {
  const m = html.match(/<a\s+href="([^"]+)"/i);
  return m ? m[1] : null;
}

function parseCells(rowHtml) {
  const cells = [];
  const cellRe = /<t[hd]([^>]*)>([\s\S]*?)<\/t[hd]>/gi;
  let m;
  while ((m = cellRe.exec(rowHtml))) {
    const attrs = m[1];
    const inner = m[2];
    const rowspanMatch = attrs.match(/rowspan="(\d+)"/i);
    cells.push({
      rowspan: rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1,
      text: stripTags(inner),
      href: extractHref(inner),
    });
  }
  return cells;
}

async function main() {
  const { value: html } = await mammoth.convertToHtml({ path: DOC_PATH });

  const tableMatch = html.match(/<table>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error('No <table> found in converted HTML');
  const tableHtml = tableMatch[1];

  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  const rows = [];
  let m;
  while ((m = rowRe.exec(tableHtml))) rows.push(m[1]);

  console.log(`Found ${rows.length} <tr> rows.`);

  // Standard HTML rowspan carry-forward: 6 logical columns (Sr.No, Category,
  // Conducting Body, Exam Name, Website, Main head). pending[col] holds
  // {text, href, remaining} while a rowspan from an earlier row is still
  // covering this column.
  const NUM_COLS = 6;
  const pending = new Array(NUM_COLS).fill(null);
  const records = []; // one per (category, conducting body, exam name) triple

  // Skip header row (row 0).
  for (let r = 1; r < rows.length; r++) {
    const cells = parseCells(rows[r]);
    let cellIdx = 0;
    const rowValues = new Array(NUM_COLS).fill(null);

    for (let col = 0; col < NUM_COLS; col++) {
      if (pending[col] && pending[col].remaining > 0) {
        rowValues[col] = pending[col];
        pending[col].remaining -= 1;
        if (pending[col].remaining === 0) pending[col] = null;
      } else {
        const cell = cells[cellIdx++];
        if (!cell) { rowValues[col] = { text: '', href: null }; continue; }
        rowValues[col] = { text: cell.text, href: cell.href };
        if (cell.rowspan > 1) pending[col] = { text: cell.text, href: cell.href, remaining: cell.rowspan - 1 };
      }
    }

    const [, category, conductingBody, examName, website] = rowValues;
    if (!examName.text && !conductingBody.text) continue; // fully blank row, skip

    // Some cells are authored as a numbered <ol><li> list (e.g. ESIC's
    // "1. Clerical: UDC..." / "2. Technical & Medical..."), which otherwise
    // survives into the exam name and breaks matching against lc_exams
    // (which has no such prefix).
    const cleanExamName = examName.text.replace(/^\d+[.)]\s*/, '');

    if (!cleanExamName && !conductingBody.text) continue; // blank padding row

    records.push({
      category: category.text,
      conductingBody: conductingBody.text,
      examName: cleanExamName,
      website: website.href || website.text || null,
    });
  }

  console.log(`Parsed ${records.length} exam rows.`);
  const categories = [...new Set(records.map((r) => r.category).filter(Boolean))];
  console.log(`Distinct categories found: ${categories.length}`);
  console.log(categories.join(' | '));

  fs.writeFileSync(OUT_PATH, JSON.stringify(records, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
