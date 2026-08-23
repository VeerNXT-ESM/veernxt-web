#!/usr/bin/env node
/**
 * scripts/strip_exam_name_prefixes.mjs
 *
 * exam_master_datamap.json is itself inconsistently formatted -- some
 * entries carry a "N. " list-ordinal prefix (a leftover from whatever
 * per-conducting-body list the content team authored it in), some don't.
 * scripts/rebuild_exams_from_datamap.mjs copied exam_name straight from
 * the datamap without stripping this, so 838 of 1,534 rows in the
 * supposedly-clean unified `exams` table still carry it (verified live;
 * the earlier claim of "clean names" in status_report.md §27.5 was based
 * on a few examples that happened to already be prefix-free, not a
 * systematic check). This is what the user is seeing as "old exam naming"
 * in the admin CMS.
 *
 * Strips the prefix from exams.exam_name directly (safe: it only makes
 * existing ilike substring matches against resources_v2 MORE permissive,
 * never fewer). lc_exams.name should be re-synced afterward with
 * scripts/sync_lc_exams_names.mjs.
 *
 * Usage:
 *   node scripts/strip_exam_name_prefixes.mjs            # dry run
 *   node scripts/strip_exam_name_prefixes.mjs --execute  # writes
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
  const exams = await fetchAll(supabase, 'exams', 'exam_id,exam_name');

  const updates = [];
  for (const e of exams) {
    const stripped = e.exam_name.replace(/^\s*\d+\.\s*/, '').trim();
    if (stripped !== e.exam_name && stripped) updates.push({ exam_id: e.exam_id, old: e.exam_name, new: stripped });
  }

  console.log(`Total exams: ${exams.length}`);
  console.log(`Rows to strip: ${updates.length}`);
  console.log('\n--- Sample ---');
  for (const u of updates.slice(0, 10)) console.log(`  "${u.old}"  ->  "${u.new}"`);

  // Check for collisions this rename would create (two exams ending up with
  // the identical stripped name that didn't already collide) -- informational
  // only, not blocking, since exam_name was never unique to begin with.
  const nameCounts = new Map();
  for (const e of exams) {
    const n = updates.find((u) => u.exam_id === e.exam_id)?.new || e.exam_name;
    nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
  }
  const newCollisions = [...nameCounts.entries()].filter(([, c]) => c > 1).length;
  console.log(`\nExam names (post-strip) shared by more than one exam: ${newCollisions} distinct names (expected -- exam_name was never unique; region/conducting_body still distinguish them)`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('exams').update({ exam_name: u.new }).eq('exam_id', u.exam_id);
    if (error) { console.error(`FAILED ${u.exam_id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Stripped ${written}/${updates.length} exam names.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
