#!/usr/bin/env node
/**
 * scripts/exam-mapping/seed_exam_categories.mjs
 *
 * One-time seed: populates lc_exam_categories from the historical list in
 * src/lib/examCategoryTaxonomy.js. Run once, right after
 * sql/lc_exam_categories.sql creates the table. Idempotent -- skips names
 * already present, so re-running after the content team has added their
 * own categories is safe.
 *
 * Usage:
 *   node scripts/exam-mapping/seed_exam_categories.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { EXAM_CATEGORIES } from '../../src/lib/examCategoryTaxonomy.js';

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

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: existing, error: fetchErr } = await supabase.from('lc_exam_categories').select('name');
  if (fetchErr) throw fetchErr;
  const existingNames = new Set((existing || []).map((r) => r.name));

  const toInsert = EXAM_CATEGORIES.filter((name) => !existingNames.has(name)).map((name) => ({ name }));
  console.log(`${existingNames.size} already present, ${toInsert.length} to insert.`);
  if (toInsert.length === 0) { console.log('Nothing to do.'); return; }

  const { error: insErr } = await supabase.from('lc_exam_categories').insert(toInsert);
  if (insErr) throw insErr;
  console.log(`Inserted ${toInsert.length} categories.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
