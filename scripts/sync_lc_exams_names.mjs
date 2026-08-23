#!/usr/bin/env node
/**
 * scripts/sync_lc_exams_names.mjs
 *
 * lc_exams.name still carries the old "N. " ordinal prefix on 838 of 1,534
 * rows (the admin CMS reads lc_exams, not the unified exams table -- see
 * status_report.md §27.9), which is what the user is seeing as "old exam
 * naming" in the CMS. exams.exam_name (rebuilt clean from
 * exam_master_datamap.json this session) already matches lc_exams.id ==
 * exams.exam_id 1:1 for 1,530 of 1,534 rows, so this is a straight sync,
 * not a re-derivation.
 *
 * Usage:
 *   node scripts/sync_lc_exams_names.mjs            # dry run
 *   node scripts/sync_lc_exams_names.mjs --execute  # writes
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

  const [lcExams, exams] = await Promise.all([
    fetchAll(supabase, 'lc_exams', 'id,name'),
    fetchAll(supabase, 'exams', 'exam_id,exam_name'),
  ]);
  const cleanNameById = new Map(exams.map((e) => [e.exam_id, e.exam_name]));

  const updates = [];
  for (const lc of lcExams) {
    const clean = cleanNameById.get(lc.id);
    if (clean && clean !== lc.name) updates.push({ id: lc.id, old: lc.name, new: clean });
  }

  console.log(`lc_exams: ${lcExams.length}`);
  console.log(`Rows to rename: ${updates.length}`);
  console.log('\n--- Sample ---');
  for (const u of updates.slice(0, 10)) console.log(`  "${u.old}"  ->  "${u.new}"`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('lc_exams').update({ name: u.new }).eq('id', u.id);
    if (error) { console.error(`FAILED ${u.id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Renamed ${written}/${updates.length} lc_exams rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
