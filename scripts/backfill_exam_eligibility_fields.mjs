#!/usr/bin/env node
/**
 * scripts/backfill_exam_eligibility_fields.mjs
 *
 * Restores the eligibility-scoring fields that scripts/rebuild_exams_from_
 * datamap.mjs deliberately did NOT carry over (per explicit user direction
 * at the time -- "don't worry about the old eligibility data, we'll reset
 * the users anyway"). The recalculation in status_report.md §27.11.1/
 * §27.11.2 then measured the real cost of that: every exam passes the hard
 * -eligibility gate for every user (0 rejections across all 10 test
 * profiles checked), which flattens scoring within a career track.
 *
 * Source: the pre-wipe `exams` table backup (K:\tmp\db_backups\catalog_
 * 2026-08-22T18-35-31-915Z\exams.json, 1,629 rows, each with these fields
 * in its `metadata` column) joined through `lc_exam_legacy_map` (still
 * intact, 1,525 of 1,534 current exams matched to their old counterpart).
 * Merges the eligibility fields into each exam's current `metadata` JSON
 * (level/pwd_eligibility/also_listed_as, added during the rebuild, are
 * preserved -- this only adds keys, never removes).
 *
 * The ~9 exams with no crosswalk match (new exams added by the datamap
 * rebuild, or the 2 known "Sanitary Inspector" duplicate-row cases) get no
 * eligibility fields -- same as today, not a regression.
 *
 * Usage:
 *   node scripts/backfill_exam_eligibility_fields.mjs            # dry run
 *   node scripts/backfill_exam_eligibility_fields.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');
const BACKUP_PATH = 'K:\\tmp\\db_backups\\catalog_2026-08-22T18-35-31-915Z\\exams.json';
const ELIGIBILITY_KEYS = [
  'min_qualification', 'physical_required', 'ex_servicemen_quota',
  'ncc_bonus', 'math_required', 'english_intensive',
  'technical_trade_preferred', 'sports_quota_eligible',
];

async function fetchAll(supabase, table, columns) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const oldExams = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
  const oldByExamId = new Map(oldExams.map((e) => [e.exam_id, e]));
  console.log(`Old exams backup: ${oldExams.length} rows`);

  const [currentExams, crosswalk] = await Promise.all([
    fetchAll(supabase, 'exams', 'exam_id,metadata'),
    fetchAll(supabase, 'lc_exam_legacy_map', 'lc_exam_id,legacy_exam_id'),
  ]);
  const legacyIdByLcExamId = new Map(crosswalk.map((c) => [c.lc_exam_id, c.legacy_exam_id]));

  console.log(`Current exams: ${currentExams.length}`);
  console.log(`Crosswalk entries: ${crosswalk.length}`);

  const updates = [];
  const unmatched = [];
  let alreadyHasFields = 0;

  for (const exam of currentExams) {
    if (exam.metadata && ELIGIBILITY_KEYS.some((k) => k in exam.metadata)) { alreadyHasFields++; continue; }

    const legacyId = legacyIdByLcExamId.get(exam.exam_id);
    if (!legacyId) { unmatched.push(exam.exam_id); continue; }
    const oldExam = oldByExamId.get(legacyId);
    if (!oldExam || !oldExam.metadata) { unmatched.push(exam.exam_id); continue; }

    const eligibilityFields = {};
    for (const key of ELIGIBILITY_KEYS) {
      if (key in oldExam.metadata) eligibilityFields[key] = oldExam.metadata[key];
    }
    if (Object.keys(eligibilityFields).length === 0) { unmatched.push(exam.exam_id); continue; }

    updates.push({
      exam_id: exam.exam_id,
      metadata: { ...(exam.metadata || {}), ...eligibilityFields },
    });
  }

  console.log(`\nAlready has eligibility fields (skip): ${alreadyHasFields}`);
  console.log(`Rows to update: ${updates.length}`);
  console.log(`Unmatched (no crosswalk / no old metadata): ${unmatched.length}`);

  // Sanity check: how many end up with a real (non-null) min_qualification, etc.
  const withQual = updates.filter((u) => u.metadata.min_qualification).length;
  const withPhysical = updates.filter((u) => u.metadata.physical_required === true).length;
  const withExServicemen = updates.filter((u) => u.metadata.ex_servicemen_quota === true).length;
  console.log(`\nOf the rows being updated: ${withQual} have a real min_qualification, ${withPhysical} have physical_required=true, ${withExServicemen} have ex_servicemen_quota=true`);

  console.log('\n--- Sample ---');
  for (const u of updates.slice(0, 5)) {
    console.log(`  ${u.exam_id}:`, JSON.stringify(ELIGIBILITY_KEYS.reduce((o, k) => (k in u.metadata ? { ...o, [k]: u.metadata[k] } : o), {})));
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('exams').update({ metadata: u.metadata }).eq('exam_id', u.exam_id);
    if (error) { console.error(`FAILED ${u.exam_id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Updated ${written}/${updates.length} exams.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
