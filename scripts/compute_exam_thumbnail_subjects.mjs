#!/usr/bin/env node
/**
 * scripts/compute_exam_thumbnail_subjects.mjs
 *
 * Computes and stores exams.thumbnail_subject for every exam, using the
 * 17-subject taxonomy in src/lib/thumbnailTaxonomy.js. Dominant subject is
 * resolved from the exam's actual ingested resources_v2 content (the 12
 * core-subject documents + 33 state/UT GS books from
 * scripts/ingest_master_documents.mjs) -- reliable and unambiguous, since
 * those titles are known exactly, rather than guessing from
 * subject_requirements Yes/No flags which have no natural priority order.
 *
 * Usage:
 *   node scripts/compute_exam_thumbnail_subjects.mjs            # dry run
 *   node scripts/compute_exam_thumbnail_subjects.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { resolveThumbnailSubject } from '../src/lib/thumbnailTaxonomy.js';

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

  const [exams, resources] = await Promise.all([
    fetchAll(supabase, 'exams', 'exam_id,exam_name,thumbnail_subject'),
    fetchAll(supabase, 'resources_v2', 'exam_name,title,category'),
  ]);

  const resourcesByExamName = new Map();
  for (const r of resources) {
    if (!resourcesByExamName.has(r.exam_name)) resourcesByExamName.set(r.exam_name, []);
    resourcesByExamName.get(r.exam_name).push(r);
  }

  const tally = {};
  const updates = [];
  for (const exam of exams) {
    const rows = resourcesByExamName.get(exam.exam_name) || [];
    const subject = resolveThumbnailSubject(rows);
    tally[subject.key] = (tally[subject.key] || 0) + 1;
    if (exam.thumbnail_subject !== subject.key) {
      updates.push({ exam_id: exam.exam_id, thumbnail_subject: subject.key });
    }
  }

  console.log(`Exams: ${exams.length}`);
  console.log(`Rows needing an update: ${updates.length}`);
  console.log('\nDistribution across all exams:');
  for (const [key, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key}: ${count}`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('exams').update({ thumbnail_subject: u.thumbnail_subject }).eq('exam_id', u.exam_id);
    if (error) { console.error(`FAILED ${u.exam_id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Updated ${written}/${updates.length} exams.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
