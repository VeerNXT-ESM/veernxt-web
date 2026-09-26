#!/usr/bin/env node
/**
 * scripts/snapshot_questions.mjs
 *
 * Read-only export of the (very large) `questions` table to <SNAPSHOT_ROOT>/<label>/questions.jsonl.
 * snapshot_db.mjs cannot do this: an exact count on ~250k rows times out and offset paging is slow.
 * This uses keyset paging (id > last id, ordered by id), retries each page, and is resumable: re-run with the
 * same label and it continues after the last id already written. Nothing in the database is changed.
 *
 * Usage: node scripts/snapshot_questions.mjs <label>
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ROOT = process.env.SNAPSHOT_ROOT || String.raw`K:\tmp\snapshots`;
const label = process.argv[2];
if (!label) { console.error('Usage: node scripts/snapshot_questions.mjs <label>'); process.exit(1); }
const dir = path.join(ROOT, label);
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'questions.jsonl');
const PAGE = 500;

let last = null, written = 0;
if (fs.existsSync(file)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  written = lines.length;
  if (lines.length) last = JSON.parse(lines[lines.length - 1]).id;
  console.log(`Resuming after ${written} rows (last id ${last})`);
}
const fd = fs.openSync(file, 'a');
for (;;) {
  let data, error;
  for (let attempt = 0; attempt < 6; attempt++) {
    let q = sb.from('questions').select('*').order('id', { ascending: true }).limit(PAGE);
    if (last !== null) q = q.gt('id', last);
    ({ data, error } = await q);
    if (!error) break;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  if (error) throw new Error(`questions after id ${last}: ${error.message || JSON.stringify(error)}`);
  if (!data.length) break;
  fs.writeSync(fd, data.map((r) => JSON.stringify(r)).join('\n') + '\n');
  written += data.length;
  last = data[data.length - 1].id;
  if (written % 10000 < PAGE) console.log(`${written} rows...`);
}
fs.closeSync(fd);

const m = path.join(dir, 'manifest.json');
const manifest = fs.existsSync(m) ? JSON.parse(fs.readFileSync(m, 'utf8')) : { tables: {} };
manifest.tables.questions = { written, note: 'exact count times out; keyset export ordered by id. Verify with SQL: select count(*) from questions (Management API)' };
fs.writeFileSync(m, JSON.stringify(manifest, null, 2));
console.log(`questions: written=${written} (verify against: select count(*) from questions)`);
