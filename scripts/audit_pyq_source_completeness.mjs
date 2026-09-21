#!/usr/bin/env node
/**
 * scripts/audit_pyq_source_completeness.mjs
 *
 * Phase 2 of docs/pyq_source_completeness_audit_plan.md: walks the real
 * (non-placeholder) "10 YEARS PYQ" / "PYQ" folders under
 * CONTENT\ORIGINAL CONTENT, derives each one's exam identity, and checks
 * whether pyq_papers has a plausible number of ingested rows for it.
 *
 * Phase 1 already established live: STATE EXAMS and UT EXAMS are 100%
 * unfulfilled placeholders (_PENDING_CONTENT.docx / a README stub) --
 * zero real content anywhere under those two categories. CENTRAL EXAMS is
 * the only category with real source content (155 folders, ~370 distinct
 * papers), so that's the only thing worth reconciling here. Also learned
 * live: state police exams (Bihar, UP, etc.) are filed under
 * CENTRAL EXAMS\18.POLICE EXAMS\{state}\{post}\, not under STATE EXAMS --
 * a real quirk in the client's own folder taxonomy, not a gap.
 *
 * Matching is intentionally approximate (fuzzy exam-name substring, both
 * directions) -- this produces a punch list for human review, not an
 * authoritative gap count. A folder with zero matching rows is a strong
 * signal; a folder with some matches but fewer than its paper count is a
 * weaker one and needs eyeballing before concluding anything is missing.
 *
 * Usage: node scripts/audit_pyq_source_completeness.mjs
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\ORIGINAL CONTENT';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function isPyqFolderName(name) {
  return /pyq/i.test(name);
}
function isPlaceholderName(n) {
  return /pending/i.test(n) || /readme/i.test(n);
}
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/^\d+\s*[.)]?\s*/, '') // strip leading ordinal like "1." or "01."
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveExamName(chain) {
  // chain excludes the PYQ folder itself, e.g.
  // ["CENTRAL EXAMS","01.SSC","1.SSC CGL (Combined Graduate Level)"]
  // ["CENTRAL EXAMS","18.POLICE EXAMS","03 (1).Bihar_Police","02 (1).Constable"]
  if (chain.length >= 2 && /police exams/i.test(chain[1] || '')) {
    // state-force + post, e.g. "Bihar Police" + "Constable"
    return `${chain[chain.length - 2] || ''} ${chain[chain.length - 1] || ''}`;
  }
  return chain[chain.length - 1] || '';
}

function walk(dir, chain, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (isPyqFolderName(entry.name)) {
      let files;
      try {
        files = fs.readdirSync(full, { withFileTypes: true }).filter((f) => f.isFile()).map((f) => f.name);
      } catch (e) {
        files = [];
      }
      const realFiles = files.filter((n) => !isPlaceholderName(n));
      if (realFiles.length === 0) continue; // placeholder or empty, skip
      const baseNames = new Set(
        realFiles.filter((n) => /\.(pdf|docx)$/i.test(n)).map((n) => n.replace(/\.(pdf|docx)$/i, '').trim().toLowerCase())
      );
      results.push({ path: full, chain: [...chain], examName: deriveExamName(chain), paperCount: Math.max(baseNames.size, realFiles.length ? 1 : 0) });
    } else {
      walk(full, [...chain, entry.name], results);
    }
  }
}

async function fetchAllPapers() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from('pyq_papers').select('id,exam_name').range(from, from + pageSize - 1);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const results = [];
  walk(path.join(ROOT, 'CENTRAL EXAMS'), ['CENTRAL EXAMS'], results);
  console.log(`Found ${results.length} real (non-placeholder) PYQ folders under CENTRAL EXAMS.`);
  const totalPapers = results.reduce((s, r) => s + r.paperCount, 0);
  console.log(`Total distinct source papers: ${totalPapers}\n`);

  const papers = await fetchAllPapers();
  const normalizedPapers = papers.map((p) => ({ ...p, norm: normalize(p.exam_name) }));

  const noMatch = [];
  const partialMatch = [];
  const okMatch = [];

  for (const r of results) {
    const term = normalize(r.examName);
    if (!term) continue;
    const matches = normalizedPapers.filter((p) => p.norm && (p.norm.includes(term) || term.includes(p.norm)));
    const entry = { ...r, matchCount: matches.length };
    if (matches.length === 0) noMatch.push(entry);
    else if (matches.length < r.paperCount) partialMatch.push(entry);
    else okMatch.push(entry);
  }

  console.log(`--- OK (matched rows >= source paper count): ${okMatch.length} ---`);
  console.log(`--- PARTIAL (some matches, but fewer than source papers) -- needs a human look: ${partialMatch.length} ---`);
  partialMatch.forEach((r) => console.log(`  "${r.examName}" — source has ${r.paperCount} papers, found ${r.matchCount} matching rows (${r.path})`));

  console.log(`\n--- NO MATCH (zero rows found for this exam name) -- likely genuine gaps: ${noMatch.length} ---`);
  noMatch.forEach((r) => console.log(`  "${r.examName}" — source has ${r.paperCount} papers, 0 matches (${r.path})`));

  console.log('\nNote: this is a fuzzy substring match on exam_name -- always eyeball the flagged ones (a folder-name/exam_name spelling mismatch reads identically to a real gap here) before assuming content is actually missing.');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
