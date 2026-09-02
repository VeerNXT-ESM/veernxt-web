#!/usr/bin/env node
/**
 * scripts/backfill_exam_intro.mjs
 *
 * Populates lc_exam_intro (sql/lc_exam_intro.sql) — one row per lc_exams
 * row, guaranteeing every exam has an Intro slot the admin CMS
 * (ExamEditorPanel.jsx) can render, instead of the admin CMS having no
 * exam-level Intro concept at all. See
 * docs/admin_intro_housekeeping_plan.md for the full writeup.
 *
 * Per exam:
 *   1. lc_exam_resource_map rows with category='Intro'. Exactly one ->
 *      use it (source='auto').
 *   2. More than one (121 exams, live-verified) -> pick highest
 *      confidence (high > medium > low), then earliest created_at, then
 *      resource_id as a final deterministic tiebreak (verified live: all
 *      rows for a given exam share the same batch-write created_at, so
 *      created_at alone doesn't actually discriminate ties). Every exam
 *      this fires on is logged so it's a reviewable list, not a silent
 *      guess (source='auto').
 *   3. Zero rows -> exact-name fallback: resources_v2 row with
 *      category='Intro' and exam_name matching lc_exams.name exactly
 *      (source='auto').
 *   4. Still nothing -> insert with source='unset', resource_id=null —
 *      the visible punch list for manual entry in the admin UI.
 *
 * Idempotent (upsert on exam_id), safe to re-run as the legacy mapping
 * data changes.
 *
 * Modes:
 *   --execute    Actually write lc_exam_intro rows. Without this flag the
 *                script only prints a summary of what it would write.
 *   --verbose    Print every exam the ambiguous-tiebreak rule fires on.
 *
 * Usage:
 *   node scripts/backfill_exam_intro.mjs           # dry run
 *   node scripts/backfill_exam_intro.mjs --execute
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const VERBOSE = args.includes('--verbose');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllRows(table, columns, filter) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// resources_v2.exam_name carries a "N. " ordinal prefix from CMS ingestion
// that lc_exams.name never has (same fix applied in
// scripts/map_exam_resources_gemini.mjs) -- without stripping it, an exact
// match against lc_exams.name misses 12 of the 29 live exact-name-fallback
// exams (verified: 17 without stripping vs 29 with, confirmed against the
// runtime ilike-substring tier in src/hooks/useExamContent.js, which does
// reach these since the prefix is a substring match, just not caught by
// this script's stricter exact-equality check without stripping first).
function stripPrefix(s) {
  return (s || '').replace(/^\d+\.\s*/, '').trim();
}

function normalize(s) {
  return stripPrefix(s).toLowerCase();
}

const CONF_RANK = { high: 0, medium: 1, low: 2 };

function pickBest(rows) {
  return [...rows].sort((a, b) => {
    const c = CONF_RANK[a.confidence] - CONF_RANK[b.confidence];
    if (c !== 0) return c;
    const t = new Date(a.created_at) - new Date(b.created_at);
    if (t !== 0) return t;
    return a.resource_id < b.resource_id ? -1 : a.resource_id > b.resource_id ? 1 : 0;
  })[0];
}

async function main() {
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (writing to lc_exam_intro)' : 'DRY RUN (no writes)'}\n`);

  const [exams, introMapRows, introResources] = await Promise.all([
    fetchAllRows('lc_exams', 'id,name'),
    fetchAllRows('lc_exam_resource_map', 'exam_id,resource_id,confidence,created_at', (q) => q.eq('category', 'Intro')),
    fetchAllRows('resources_v2', 'resource_id,exam_name', (q) => q.eq('category', 'Intro')),
  ]);

  const mapRowsByExam = new Map();
  for (const r of introMapRows) {
    if (!mapRowsByExam.has(r.exam_id)) mapRowsByExam.set(r.exam_id, []);
    mapRowsByExam.get(r.exam_id).push(r);
  }

  const exactNameByNorm = new Map();
  for (const r of introResources) {
    const key = normalize(r.exam_name);
    if (!exactNameByNorm.has(key)) exactNameByNorm.set(key, []);
    exactNameByNorm.get(key).push(r);
  }

  const rowsToWrite = [];
  let autoFromMap = 0, autoAmbiguous = 0, autoExactName = 0, unset = 0;

  for (const exam of exams) {
    const mapped = mapRowsByExam.get(exam.id) || [];

    if (mapped.length === 1) {
      rowsToWrite.push({ exam_id: exam.id, resource_id: mapped[0].resource_id, manual_title: null, manual_body: null, source: 'auto' });
      autoFromMap++;
      continue;
    }

    if (mapped.length > 1) {
      const best = pickBest(mapped);
      rowsToWrite.push({ exam_id: exam.id, resource_id: best.resource_id, manual_title: null, manual_body: null, source: 'auto' });
      autoAmbiguous++;
      if (VERBOSE) {
        console.log(`[ambiguous] "${exam.name}" — ${mapped.length} candidates, picked resource_id=${best.resource_id} (confidence=${best.confidence})`);
      }
      continue;
    }

    const exact = exactNameByNorm.get(normalize(exam.name));
    if (exact && exact.length > 0) {
      const chosen = [...exact].sort((a, b) => (a.resource_id < b.resource_id ? -1 : 1))[0];
      rowsToWrite.push({ exam_id: exam.id, resource_id: chosen.resource_id, manual_title: null, manual_body: null, source: 'auto' });
      autoExactName++;
      continue;
    }

    rowsToWrite.push({ exam_id: exam.id, resource_id: null, manual_title: null, manual_body: null, source: 'unset' });
    unset++;
  }

  console.log('--- Summary ---');
  console.log(`Total exams: ${exams.length}`);
  console.log(`Auto (single map row): ${autoFromMap}`);
  console.log(`Auto (ambiguous, tie-break applied): ${autoAmbiguous}`);
  console.log(`Auto (exact-name fallback): ${autoExactName}`);
  console.log(`Unset (no Intro found — manual entry needed): ${unset}`);
  console.log(`Rows to write: ${rowsToWrite.length}`);

  if (EXECUTE) {
    const batchSize = 500;
    for (let i = 0; i < rowsToWrite.length; i += batchSize) {
      const batch = rowsToWrite.slice(i, i + batchSize);
      const { error } = await supabase.from('lc_exam_intro').upsert(batch, { onConflict: 'exam_id' });
      if (error) {
        console.error(`[db error] batch ${i / batchSize}: ${error.message}`);
        process.exit(1);
      }
    }
    console.log('\nDone — lc_exam_intro populated.');
  } else {
    console.log('\nDry run — no rows written. Re-run with --execute to write.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
