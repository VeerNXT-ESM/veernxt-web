#!/usr/bin/env node
/**
 * scripts/exam-mapping/split_merged_categories.mjs
 *
 * Follow-up fix to normalize_exam_categories.mjs: three of its 20 buckets
 * were wrongly over-merged (confirmed against the content team's own
 * "Central Exams List" document, which treats Banking/Insurance and
 * Railways/Metro Rail as distinct categories; Nursing was split out from
 * the broader Health/Medical grouping the same way). This re-splits every
 * affected exam using lc_exams.category_detail -- the original raw wording
 * normalize_exam_categories.mjs preserved before it collapsed these -- so
 * no new judgment calls are needed, just finer-grained versions of the
 * same lookup.
 *
 * Usage:
 *   node scripts/exam-mapping/split_merged_categories.mjs            # dry run
 *   node scripts/exam-mapping/split_merged_categories.mjs --execute  # writes
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

// Old merged bucket -> { raw category_detail (case/trim-insensitive) -> new split bucket }
const SPLITS = {
  'Banking & Insurance': {
    'banking': 'Banking', 'rural banking': 'Banking', 'cooperative banking': 'Banking',
    'insurance exams': 'Insurance',
  },
  'Railways & Metro': {
    'indian railways': 'Railways',
    'metro rail': 'Metro Rail', 'metro': 'Metro Rail',
  },
  'Health, Medical & Nursing Services': {
    'nursing': 'Nursing', 'health nursing': 'Nursing',
    'health services': 'Health & Medical Services', 'health': 'Health & Medical Services',
    'medical': 'Health & Medical Services', 'medical services': 'Health & Medical Services',
    'medical officer': 'Health & Medical Services', 'health cho': 'Health & Medical Services',
    'nhm health': 'Health & Medical Services', 'mpw': 'Health & Medical Services',
    'pharma services': 'Health & Medical Services', 'health pharma': 'Health & Medical Services',
    'drug control': 'Health & Medical Services', 'food safety': 'Health & Medical Services',
  },
};

async function fetchAll(supabase, table, columns, filterFn) {
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + 999);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const mergedBuckets = Object.keys(SPLITS);
  const exams = await fetchAll(supabase, 'lc_exams', 'id,name,category,category_detail', (q) => q.in('category', mergedBuckets));

  console.log(`Exams currently in a merged bucket: ${exams.length}\n`);

  const updates = [];
  const unresolved = [];
  const newBucketCounts = {};

  for (const exam of exams) {
    const lookup = SPLITS[exam.category];
    const key = (exam.category_detail || '').trim().toLowerCase();
    const newCategory = lookup[key];
    if (!newCategory) {
      unresolved.push(exam);
      continue;
    }
    newBucketCounts[newCategory] = (newBucketCounts[newCategory] || 0) + 1;
    updates.push({ id: exam.id, category: newCategory });
  }

  console.log('New distribution:');
  for (const [cat, n] of Object.entries(newBucketCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${cat}`);
  }

  if (unresolved.length > 0) {
    console.log(`\n⚠ ${unresolved.length} exam(s) could not be resolved (category_detail missing or unrecognized) -- left untouched:`);
    for (const e of unresolved.slice(0, 20)) {
      console.log(`  ${e.name} -- category="${e.category}" category_detail="${e.category_detail}"`);
    }
    if (unresolved.length > 20) console.log(`  ...and ${unresolved.length - 20} more`);
  } else {
    console.log('\nEvery exam in a merged bucket resolved cleanly.');
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const { error } = await supabase.from('lc_exams').update({ category: u.category }).eq('id', u.id);
    if (error) { console.error(`FAILED ${u.id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Updated ${written}/${updates.length} exams.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
