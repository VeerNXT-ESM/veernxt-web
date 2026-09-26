#!/usr/bin/env node
/**
 * scripts/snapshot_db.mjs
 *
 * Read-only export of the content tables to <SNAPSHOT_ROOT>/<label>/<table>.jsonl (one JSON row per line),
 * plus manifest.json with the row count the database reported for each table and the count actually written
 * (they must match). Pages are ordered by a stable key so no row is skipped or repeated.
 * Nothing in the database is changed. Credentials come from .env.
 *
 * Usage: node scripts/snapshot_db.mjs [label]     (default label = ISO timestamp)
 * Restore (per table, when needed): read the .jsonl and upsert on the key column in batches.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = process.env.SNAPSHOT_ROOT || String.raw`K:\tmp\snapshots`;
const label = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(ROOT, label);
fs.mkdirSync(dir, { recursive: true });

// [table, stable order column]
const TABLES = [
  ['resources', 'id'], ['lc_exam_resource_map', 'id'], ['lc_exam_intro', 'exam_id'], ['lc_exams', 'id'],
  ['lc_exam_categories', 'id'], ['lc_regions', 'id'], ['lc_exam_quiz_map', 'id'], ['quizzes', 'id'],
  ['questions', 'id'], ['pyq_papers', 'id'], ['quiz_attempts', 'id'],
];
const PAGE = 1000;
const manifest = { label, createdAt: new Date().toISOString(), tables: {} };

for (const [table, key] of TABLES) {
  const { count, error: cErr } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (cErr) { manifest.tables[table] = { skipped: cErr.message }; console.log(`${table}: skipped (${cErr.message})`); continue; }
  const file = path.join(dir, `${table}.jsonl`);
  const fd = fs.openSync(file, 'w');
  let written = 0;
  for (let from = 0; ; from += PAGE) {
    let data, error;
    for (let attempt = 0; attempt < 4; attempt++) {
      ({ data, error } = await sb.from(table).select('*').order(key, { ascending: true }).range(from, from + PAGE - 1));
      if (!error) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (error) throw new Error(`${table} page ${from}: ${error.message}`);
    if (!data.length) break;
    fs.writeSync(fd, data.map((r) => JSON.stringify(r)).join('\n') + '\n');
    written += data.length;
    if (data.length < PAGE) break;
  }
  fs.closeSync(fd);
  manifest.tables[table] = { dbCount: count, written, ok: count === written, orderedBy: key };
  console.log(`${table}: db=${count} written=${written} ${count === written ? 'OK' : 'MISMATCH'}`);
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Snapshot: ${dir}`);
