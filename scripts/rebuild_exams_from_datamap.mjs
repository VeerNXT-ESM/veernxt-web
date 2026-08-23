#!/usr/bin/env node
/**
 * scripts/rebuild_exams_from_datamap.mjs
 *
 * Full reseed of the unified `exams` table from the authoritative
 * exam_master_datamap.json (1,534 exams), replacing the old accumulated
 * data entirely. Per explicit user direction: do NOT try to preserve the
 * old exams.metadata eligibility fields (min_qualification,
 * physical_required, ex_servicemen_quota, etc.) -- all current
 * user_profiles are test data and will be reset/recalculated after this
 * lands, so there's nothing worth carrying over.
 *
 * Reuses lc_exams' own `id` (uuid) as the new exams.exam_id, since
 * exam_master_datamap.json IS the same source lc_exams was already built
 * from (same 1,534 count, near-identical names) -- this means
 * lc_exam_subjects/lc_subject_resources/jobs.lc_exam_id (all keyed on
 * lc_exams.id) need zero re-keying. lc_exams itself becomes redundant
 * after this and can be dropped once the admin CMS is repointed at
 * `exams` (separate step, not done here).
 *
 * jobs.exam_id has a hard FK to exams.exam_id and is nulled out before
 * the delete+reseed -- jobs.lc_exam_id (this session's better-matched
 * column) is unaffected and remains the source of truth for job->exam
 * linking going forward.
 *
 * Usage:
 *   node scripts/rebuild_exams_from_datamap.mjs            # dry run
 *   node scripts/rebuild_exams_from_datamap.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');
const DATAMAP_PATH = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\1. EXAM LIST\\exam_master_datamap.json';

function normalize(name) {
  return name.replace(/^\s*\d+\.\s*/, '').toLowerCase().replace(/[()&,'".]/g, '').replace(/\s+/g, ' ').trim();
}

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

  const datamap = JSON.parse(fs.readFileSync(DATAMAP_PATH, 'utf-8'));
  console.log(`Datamap exams: ${datamap.length}`);

  const lcExams = await fetchAll(supabase, 'lc_exams', 'id,name,conducting_body_id,region_id,category,website,also_listed_as');
  const lcByNorm = new Map();
  for (const e of lcExams) {
    const n = normalize(e.name);
    if (!lcByNorm.has(n)) lcByNorm.set(n, []);
    lcByNorm.get(n).push(e);
  }

  const newRows = [];
  const unmatched = [];
  const usedLcIds = new Set();

  for (const d of datamap) {
    const n = normalize(d.exam_name);
    const candidates = (lcByNorm.get(n) || []).filter((c) => !usedLcIds.has(c.id));
    if (candidates.length === 0) { unmatched.push(d.exam_name); continue; }
    const lc = candidates[0];
    usedLcIds.add(lc.id);

    newRows.push({
      exam_id: lc.id,
      exam_name: d.exam_name,
      conducting_body_id: lc.conducting_body_id,
      region_id: lc.region_id,
      conducting_body: null, // filled in below once conducting_body names are loaded
      career_track: (d.category || '').toUpperCase() || null,
      state_ut: d.level === 'central' ? null : d.state,
      is_state_specific: d.level !== 'central',
      base_url: d.website || null,
      subject_requirements: d.subject_requirements || null,
      logo_path: d.logo?.path || null,
      content_completeness: d.content_completeness || null,
      metadata: { level: d.level, pwd_eligibility: d.pwd_eligibility || null, also_listed_as: d.also_listed_as || null },
    });
  }

  console.log(`Matched to lc_exams: ${newRows.length}`);
  console.log(`Unmatched datamap entries: ${unmatched.length}`);
  if (unmatched.length) console.log(unmatched.slice(0, 20));

  const unusedLcExams = lcExams.filter((e) => !usedLcIds.has(e.id));
  console.log(`lc_exams rows with no datamap match: ${unusedLcExams.length}`);
  if (unusedLcExams.length) console.log(unusedLcExams.slice(0, 10).map((e) => e.name));

  // Resolve conducting_body names (post-rename) for the new rows' flat text column.
  const cbIds = [...new Set(newRows.map((r) => r.conducting_body_id).filter(Boolean))];
  const cbRows = await fetchAll(supabase, 'lc_conducting_bodies', 'id,name');
  const cbById = new Map(cbRows.map((c) => [c.id, c.name]));
  for (const r of newRows) r.conducting_body = cbById.get(r.conducting_body_id) || null;

  console.log('\n--- Sample new rows ---');
  for (const r of newRows.slice(0, 3)) {
    console.log(`  ${r.exam_name} | body: ${r.conducting_body} | track: ${r.career_track} | state_ut: ${r.state_ut}`);
  }

  const { count: currentJobsWithExamId } = await supabase.from('jobs').select('job_id', { count: 'exact', head: true }).not('exam_id', 'is', null);
  const { count: currentExamsCount } = await supabase.from('exams').select('exam_id', { count: 'exact', head: true });
  console.log(`\nCurrent exams table: ${currentExamsCount} rows (will be fully replaced)`);
  console.log(`jobs.exam_id currently set on ${currentJobsWithExamId} rows (will be nulled -- jobs.lc_exam_id is unaffected)`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nNulling jobs.exam_id (FK to the exams rows about to be deleted)...');
  const { error: nullErr } = await supabase.from('jobs').update({ exam_id: null }).not('exam_id', 'is', null);
  if (nullErr) throw nullErr;

  console.log('Deleting all rows from exams...');
  const { error: delErr } = await supabase.from('exams').delete().not('exam_id', 'is', null);
  if (delErr) throw delErr;

  console.log(`Inserting ${newRows.length} new exams rows...`);
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const chunk = newRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('exams').insert(chunk);
    if (error) { console.error(`FAILED chunk starting at ${i}: ${error.message}`); continue; }
    inserted += chunk.length;
  }
  console.log(`Done. Inserted ${inserted}/${newRows.length} rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
