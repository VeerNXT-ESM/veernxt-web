#!/usr/bin/env node
/**
 * scripts/rebuild_exam_subjects_from_requirements.mjs
 *
 * Full reseed of lc_exam_subjects from exams.subject_requirements (the
 * syllabus map already loaded onto every exam by
 * rebuild_exams_from_datamap.mjs). Replaces the old accumulated
 * assignments entirely, per the same "clean slate" direction as the
 * exams rebuild.
 *
 * One naming mismatch found between the two sources that already exist
 * in this DB: subject_requirements uses the key "Quantitative Aptitude",
 * but lc_subjects (seeded earlier, 12 rows) uses "Mathematics" for the
 * same concept -- aliased below rather than adding a 13th subject.
 *
 * lc_subject_resources.exam_subject_id has ON DELETE CASCADE onto
 * lc_exam_subjects, so this wipes the 9,489 existing document links too
 * -- expected and fine, since those point at content this same rebuild
 * project is about to replace (66 master docs + 566 Intro files) in a
 * separate step; nothing here is a document you'd want to keep.
 *
 * Usage:
 *   node scripts/rebuild_exam_subjects_from_requirements.mjs            # dry run
 *   node scripts/rebuild_exam_subjects_from_requirements.mjs --execute  # writes
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
// The datamap uses two different spellings for the same math subject
// across different generation batches (never both on one exam, verified) --
// alias both onto lc_subjects' single "Mathematics" row.
const KEY_ALIAS = { 'Quantitative Aptitude': 'Mathematics', 'Maths': 'Mathematics' };

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

  const [exams, subjects, currentAssignments] = await Promise.all([
    fetchAll(supabase, 'exams', 'exam_id,subject_requirements'),
    fetchAll(supabase, 'lc_subjects', 'id,name'),
    fetchAll(supabase, 'lc_exam_subjects', 'id'),
  ]);

  const nameToId = new Map(subjects.map((s) => [s.name, s.id]));
  const unmappedKeys = new Set();

  const newRows = [];
  for (const exam of exams) {
    let order = 0;
    for (const [key, value] of Object.entries(exam.subject_requirements || {})) {
      if (value !== 'Yes') continue;
      const subjectName = KEY_ALIAS[key] || key;
      const subjectId = nameToId.get(subjectName);
      if (!subjectId) { unmappedKeys.add(key); continue; }
      newRows.push({ exam_id: exam.exam_id, subject_id: subjectId, display_order: order++ });
    }
  }

  console.log(`Exams: ${exams.length}`);
  console.log(`Existing lc_exam_subjects rows (will be replaced): ${currentAssignments.length}`);
  console.log(`New rows to insert: ${newRows.length}`);
  if (unmappedKeys.size) console.log(`Unmapped subject_requirements keys (no matching lc_subjects row): ${[...unmappedKeys].join(', ')}`);
  else console.log('All subject_requirements keys mapped cleanly.');

  const avgPerExam = (newRows.length / exams.length).toFixed(1);
  console.log(`Average subjects per exam: ${avgPerExam}`);

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nDeleting all existing lc_exam_subjects (cascades to lc_subject_resources)...');
  const { error: delErr } = await supabase.from('lc_exam_subjects').delete().not('id', 'is', null);
  if (delErr) throw delErr;

  console.log(`Inserting ${newRows.length} new lc_exam_subjects rows...`);
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const chunk = newRows.slice(i, i + CHUNK);
    const { error } = await supabase.from('lc_exam_subjects').insert(chunk);
    if (error) { console.error(`FAILED chunk at ${i}: ${error.message}`); continue; }
    inserted += chunk.length;
  }
  console.log(`Done. Inserted ${inserted}/${newRows.length} rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
