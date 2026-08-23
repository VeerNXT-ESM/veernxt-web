#!/usr/bin/env node
/**
 * scripts/fix_ut_gk_subject_gap.mjs
 *
 * Context (status_report.md, session after §25): user asked to recheck
 * whether the UT GK/GS books are genuinely duplicated across UTs. They are
 * (confirmed via embedded-image hashing, not just text similarity) -- the
 * canonical "GS & GK GUIDE BOOK" / "SSC COMPLETE GK" resources are already
 * broadly linked to 1,390 exams, including all 244 UT exams that currently
 * have a "General Knowledge / GS" subject slot.
 *
 * The real gap found while checking this: of 289 total UT exams, 45 have NO
 * "General Knowledge / GS" lc_exam_subjects row at all -- not a missing
 * resource-link problem, a missing subject-assignment problem. This script
 * closes that specific gap: for each of the 45, add the subject (appended
 * after any existing subjects on that exam) and link both canonical GK
 * resources to it, matching the pattern every other UT exam already has.
 *
 * Deliberately narrow scope -- does NOT touch the 8 orphaned duplicate
 * GK-titled lc_resources rows (0 exams each, a separate cleanup already
 * tracked in status_report.md §19/§23) and does NOT touch non-UT exams.
 *
 * Usage:
 *   node scripts/fix_ut_gk_subject_gap.mjs            # dry run
 *   node scripts/fix_ut_gk_subject_gap.mjs --execute  # writes
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
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

const GK_SUBJECT_ID = 'd0be9cbd-bee5-4b2c-9387-951373dfcc5a'; // "General Knowledge / GS"
const GUIDE_RESOURCE_ID = '5557633c-d6f2-470d-8a30-d5131a1c58dd'; // canonical "GS & GK GUIDE BOOK", 1390 exams
const PRECIS_RESOURCE_ID = '73866c8b-55ca-4a42-bd1e-49d1a2efdfe6'; // canonical "SSC COMPLETE GK", 1390 exams

const EXECUTE = process.argv.includes('--execute');

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in .env');
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // All UT exams.
  const { data: utExams, error: examErr } = await supabase
    .from('lc_exams')
    .select('id, name, category, status, region:lc_regions!inner(level)')
    .eq('region.level', 'ut');
  if (examErr) throw examErr;

  // UT exams that already have a GK/GS subject slot.
  const { data: existingLinks, error: linkErr } = await supabase
    .from('lc_exam_subjects')
    .select('exam_id, display_order, exam:lc_exams!inner(region:lc_regions!inner(level))')
    .eq('subject_id', GK_SUBJECT_ID)
    .eq('exam.region.level', 'ut');
  if (linkErr) throw linkErr;
  const haveGk = new Set(existingLinks.map((r) => r.exam_id));

  const missing = utExams.filter((e) => !haveGk.has(e.id));

  console.log(`Total UT exams: ${utExams.length}`);
  console.log(`UT exams already with GK/GS subject: ${haveGk.size}`);
  console.log(`UT exams MISSING GK/GS subject: ${missing.length}\n`);
  for (const e of missing) {
    console.log(`  - ${e.name}${e.category ? ` (${e.category})` : ''} [status: ${e.status}]`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nApplying...');
  let subjectsAdded = 0;
  let resourceLinksAdded = 0;
  for (const exam of missing) {
    // Append after this exam's existing subjects (if any).
    const { count } = await supabase
      .from('lc_exam_subjects')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', exam.id);
    const nextOrder = count || 0;

    const { data: newSubject, error: insertErr } = await supabase
      .from('lc_exam_subjects')
      .insert({ exam_id: exam.id, subject_id: GK_SUBJECT_ID, display_order: nextOrder })
      .select()
      .single();
    if (insertErr) { console.error(`FAILED subject insert for ${exam.name}: ${insertErr.message}`); continue; }
    subjectsAdded++;

    const { error: resErr } = await supabase.from('lc_subject_resources').insert([
      { exam_subject_id: newSubject.id, resource_id: GUIDE_RESOURCE_ID, display_order: 0 },
      { exam_subject_id: newSubject.id, resource_id: PRECIS_RESOURCE_ID, display_order: 1 },
    ]);
    if (resErr) { console.error(`FAILED resource link for ${exam.name}: ${resErr.message}`); continue; }
    resourceLinksAdded += 2;
  }

  console.log(`\nDone. Subjects added: ${subjectsAdded}/${missing.length}. Resource links added: ${resourceLinksAdded}/${missing.length * 2}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
