#!/usr/bin/env node
/**
 * scripts/seed_thumbnail_templates.mjs
 *
 * lc_thumbnail_templates was created empty in Phase 1 (learning_center_schema.sql)
 * and never seeded. This inserts the only template art that actually exists
 * today -- the 3 generic royal-color thumbnails in public/thumbnils/ -- so the
 * Exam Editor's template picker isn't empty. The 5 category-specific templates
 * from thumbnail_generation_prompt.md are still with the content team (not
 * delivered yet, per status_report.md §8/§9); more rows can be added here
 * later the same way, no code change needed.
 *
 * Name-checked before insert, so safe to re-run.
 *
 * Usage:
 *   node scripts/seed_thumbnail_templates.mjs            # dry run
 *   node scripts/seed_thumbnail_templates.mjs --execute  # writes
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

const TEMPLATES = [
  { name: 'Royal Blue', background_image_path: '/thumbnils/thumbnil royal blue.png' },
  { name: 'Royal Green', background_image_path: '/thumbnils/thumbnil royal green.png' },
  { name: 'Royal Red', background_image_path: '/thumbnils/thumbnil royal red.png' },
];

async function main() {
  const execute = process.argv.includes('--execute');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in .env');
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: existing, error: fetchErr } = await supabase.from('lc_thumbnail_templates').select('name');
  if (fetchErr) throw fetchErr;
  const existingNames = new Set((existing || []).map((r) => r.name));

  const toInsert = TEMPLATES.filter((t) => !existingNames.has(t.name));

  console.log(`${existingNames.size} template(s) already present.`);
  console.log(`${toInsert.length} template(s) to insert:`, toInsert.map((t) => t.name));

  if (!execute) {
    console.log('\nDry run only -- pass --execute to write.');
    return;
  }
  if (toInsert.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const { error: insertErr } = await supabase.from('lc_thumbnail_templates').insert(toInsert);
  if (insertErr) throw insertErr;
  console.log(`Inserted ${toInsert.length} template(s).`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
