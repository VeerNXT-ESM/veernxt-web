#!/usr/bin/env node
/**
 * scripts/backup_catalog_tables.mjs
 *
 * Companion to backup_content_tables.mjs, covering the catalog/schema
 * side (lc_* tables, the legacy `exams` table, and `jobs`) that isn't
 * covered there. Read-only against Supabase; writes only new files.
 * Run before any destructive change to these tables (e.g. a full
 * catalog reset/re-seed).
 *
 * Usage: node scripts/backup_catalog_tables.mjs [--out DIR]
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { outDir: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out.outDir = args[++i];
  }
  return out;
}

const TABLES = [
  'lc_exams', 'lc_resources', 'lc_exam_subjects', 'lc_subject_resources',
  'lc_regions', 'lc_conducting_bodies', 'lc_subjects', 'lc_tags',
  'lc_exam_tags', 'lc_thumbnail_templates', 'lc_exam_legacy_map',
  'exams', 'jobs',
];

async function fetchAllRows(supabase, table) {
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  const opts = parseArgs();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = opts.outDir || path.join('K:', 'tmp', 'db_backups', `catalog_${timestamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Backing up ${TABLES.join(', ')} to ${outDir}`);

  const summary = {};
  for (const table of TABLES) {
    process.stdout.write(`  ${table} ... `);
    try {
      const rows = await fetchAllRows(supabase, table);
      fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 1), 'utf-8');
      summary[table] = rows.length;
      console.log(`${rows.length} rows`);
    } catch (e) {
      console.log(`SKIPPED (${e.message})`);
      summary[table] = `error: ${e.message}`;
    }
  }

  fs.writeFileSync(
    path.join(outDir, '_manifest.json'),
    JSON.stringify({ timestamp, tables: summary }, null, 1),
    'utf-8'
  );
  console.log(`\nDone. Backup manifest: ${path.join(outDir, '_manifest.json')}`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
