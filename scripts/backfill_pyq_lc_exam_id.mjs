#!/usr/bin/env node
/**
 * Backfills pyq_papers.lc_exam_id from the free-text exam_name column, so
 * PyqCenter.jsx can match papers to an exam by FK instead of substring
 * text (see docs/status_report.md's PYQ audit section -- the exams table
 * has 117 exam_name values shared by 2+ different real exams, e.g. "Staff
 * Nurse" x19, so text substring matching cross-contaminates unrelated
 * exams' PYQ pages).
 *
 * exams.exam_id and lc_exams.id share the same UUID for 1531/1537 rows
 * (verified live) -- api/exams.js's own header comment confirms this is
 * relied on elsewhere already ("exam_id == lc_exams.id, see
 * status_report.md §27.5"). So this resolves against `exams` (richer
 * fields: conducting_body, career_track) and writes that same uuid
 * straight into pyq_papers.lc_exam_id, which FKs to lc_exams(id).
 *
 * Resolution is deliberately conservative -- never fuzzy-guessed:
 *   1. exact normalized exam_name match, only if it resolves to exactly
 *      one exams row
 *   2. else normalized "conducting_body + exam_name" combo match (for
 *      BANKING-style short generic exam_name rows), only if unique
 *   3. else: the paper's own normalized exam_name is checked for how many
 *      DIFFERENT exams' normalized exam_name is a prefix of it (the real
 *      ingestion convention -- "<exam name> 10 YEARS PYQ PAPER N"); only
 *      resolved if exactly one exam qualifies
 * Anything matching 0 or 2+ candidates is left alone (lc_exam_id stays
 * null) rather than guessed.
 *
 * Usage:
 *   node scripts/backfill_pyq_lc_exam_id.mjs              (dry run)
 *   node scripts/backfill_pyq_lc_exam_id.mjs --execute
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll(table, select) {
  let all = []; let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function indexBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writes lc_exam_id)' : 'DRY RUN (no writes)'}\n`);

  const exams = await fetchAll('exams', 'exam_id, exam_name, conducting_body, career_track');
  const papers = await fetchAll('pyq_papers', 'id, exam_name, lc_exam_id');
  const unresolved = papers.filter((p) => p.exam_name && !p.lc_exam_id);

  const byName = indexBy(exams, (e) => normalize(e.exam_name));
  const byCombo = indexBy(exams, (e) => normalize(`${e.conducting_body || ''} ${e.exam_name || ''}`));
  // Precompute each exam's normalized name once for the prefix scan below.
  const examsWithNorm = exams.map((e) => ({ e, norm: normalize(e.exam_name) })).filter((x) => x.norm.length > 0);

  let resolvedExact = 0, resolvedCombo = 0, resolvedPrefix = 0, ambiguous = 0, noMatch = 0;
  const updates = [];

  for (const p of unresolved) {
    const pNorm = normalize(p.exam_name);
    let resolved = null;

    const exactList = byName.get(pNorm);
    if (exactList && exactList.length === 1) {
      resolved = exactList[0]; resolvedExact++;
    } else if (exactList && exactList.length > 1) {
      ambiguous++;
    }

    if (!resolved) {
      const comboList = byCombo.get(pNorm);
      if (comboList && comboList.length === 1) {
        resolved = comboList[0]; resolvedCombo++;
      } else if (comboList && comboList.length > 1) {
        ambiguous++;
      }
    }

    if (!resolved && !(exactList && exactList.length > 1)) {
      const prefixCandidates = examsWithNorm.filter((x) => pNorm.startsWith(x.norm));
      if (prefixCandidates.length === 1) {
        resolved = prefixCandidates[0].e; resolvedPrefix++;
      } else if (prefixCandidates.length > 1) {
        ambiguous++;
      } else {
        noMatch++;
      }
    }

    if (resolved) updates.push({ id: p.id, lc_exam_id: resolved.exam_id, exam_name: p.exam_name, resolvedName: resolved.exam_name });
  }

  console.log(`pyq_papers with exam_name set, lc_exam_id still null: ${unresolved.length}`);
  console.log(`  resolved via exact name match:  ${resolvedExact}`);
  console.log(`  resolved via combo match:       ${resolvedCombo}`);
  console.log(`  resolved via unique prefix:     ${resolvedPrefix}`);
  console.log(`  ambiguous (2+ candidates, skipped): ${ambiguous}`);
  console.log(`  no match at all (skipped):      ${noMatch}`);
  console.log(`  TOTAL to write: ${updates.length}\n`);

  if (!EXECUTE) {
    console.log('Sample of what would be written:');
    for (const u of updates.slice(0, 20)) console.log(`  "${u.exam_name}" -> exam_id ${u.lc_exam_id} ("${u.resolvedName}")`);
    console.log('\nDry run only -- nothing written. Re-run with --execute to apply.');
    return;
  }

  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('pyq_papers').update({ lc_exam_id: u.lc_exam_id }).eq('id', u.id);
    if (error) { console.error(`  [FAIL] ${u.id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Wrote lc_exam_id for ${written}/${updates.length} rows.`);
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
