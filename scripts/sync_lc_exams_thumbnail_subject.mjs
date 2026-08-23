#!/usr/bin/env node
/**
 * scripts/sync_lc_exams_thumbnail_subject.mjs
 *
 * Copies exams.thumbnail_subject onto lc_exams.thumbnail_subject, keyed by
 * the shared id (exams.exam_id was rebuilt from lc_exams.id this session --
 * see status_report.md §27.5 -- so a direct row-for-row copy is safe, no
 * matching needed). One-off sync until the admin CMS is repointed at the
 * unified exams table, at which point lc_exams' copy becomes unnecessary.
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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function fetchAll(table, columns) {
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

const exams = await fetchAll('exams', 'exam_id,thumbnail_subject');
console.log(`Syncing ${exams.length} rows...`);
let written = 0;
for (const e of exams) {
  const { error } = await supabase.from('lc_exams').update({ thumbnail_subject: e.thumbnail_subject }).eq('id', e.exam_id);
  if (error) { console.error(`FAILED ${e.exam_id}: ${error.message}`); continue; }
  written++;
}
console.log(`Done. Synced ${written}/${exams.length}.`);
