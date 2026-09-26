#!/usr/bin/env node
/**
 * scripts/rollback_guide_precis_links_to.mjs
 *
 * Point-in-time rollback of Guide/Precis exam links ONLY (lc_exam_resource_map rows with
 * category Guide or Precis). Intro links, resources, quizzes and everything else are never touched.
 * The map table records only creation times, so the state at T = the links created at or before T.
 *
 *   node scripts/rollback_guide_precis_links_to.mjs --snapshot                  # write live + 08:00 + 09:00 states
 *   node scripts/rollback_guide_precis_links_to.mjs --to=2026-09-23T08:00:00Z   # dry run
 *   node scripts/rollback_guide_precis_links_to.mjs --to=2026-09-23T08:00:00Z --execute
 *
 * --execute first writes every link it is about to delete to <ROOT>/<ts>/links_deleted.json
 * (restore = upsert that file back on id). Links deleted by other steps after T are not resurrected.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
const EXECUTE = process.argv.includes('--execute');
const SNAP = process.argv.includes('--snapshot');
const TO = arg('to');
const ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;
const SNAPROOT = process.env.SNAPSHOT_ROOT || String.raw`K:\tmp\snapshots`;
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const ts = new Date().toISOString().replace(/[:.]/g, '-');

async function fetchLinks() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let data, error;
    for (let a = 0; a < 4; a++) {
      ({ data, error } = await sb.from('lc_exam_resource_map').select('*').in('category', ['Guide', 'Precis']).order('id').range(from, from + 999));
      if (!error) break; await new Promise((r) => setTimeout(r, 1500 * (a + 1)));
    }
    if (error) throw new Error(error.message);
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const upTo = (rows, t) => rows.filter((r) => new Date(r.created_at) <= new Date(t));

const live = await fetchLinks();
console.log(`Live Guide/Precis links: ${live.length}`);

if (SNAP) {
  const dir = path.join(SNAPROOT, `guide_precis_links_${ts}`); fs.mkdirSync(dir, { recursive: true });
  writeJsonl(path.join(dir, 'live_now.jsonl'), live);
  for (const [name, t] of [['state_2026-09-23_0800Z', '2026-09-23T08:00:00Z'], ['state_2026-09-23_0900Z', '2026-09-23T09:00:00Z']]) {
    const s = upTo(live, t); writeJsonl(path.join(dir, `${name}.jsonl`), s);
    console.log(`${name}: ${s.length} links (${live.length - s.length} created later)`);
  }
  console.log(`Snapshot dir: ${dir}`); process.exit(0);
}

if (!TO) { console.error('Usage: --snapshot | --to=<ISO time> [--execute]'); process.exit(1); }
const del = live.filter((r) => new Date(r.created_at) > new Date(TO));
const cnt = (f) => del.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} | rollback to ${TO} | would delete ${del.length} links, keep ${live.length - del.length}`);
console.log('by category:', cnt((r) => r.category)); console.log('by day:', cnt((r) => r.created_at.slice(0, 10)));
console.log('by reason:', cnt((r) => (r.reasoning || '').startsWith('Synced') ? 'sync' : (r.reasoning || '').startsWith('Co-linked') ? 'co-linked' : (r.reasoning || '').startsWith('Manually') ? 'manually added' : 'other'));
console.log('exams affected:', new Set(del.map((r) => r.exam_id)).size);
if (EXECUTE) {
  const dir = path.join(ROOT, ts); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'links_deleted.json'), JSON.stringify(del, null, 1));
  console.log(`Backup written: ${dir}\links_deleted.json`);
  for (const c of chunks(del.map((r) => r.id), 100)) {
    const { error } = await sb.from('lc_exam_resource_map').delete().in('id', c).in('category', ['Guide', 'Precis']); if (error) throw new Error(error.message);
  }
  const after = await fetchLinks(); console.log(`Done. Guide/Precis links now: ${after.length} (expected ${live.length - del.length})`);
} else console.log('Dry run only -- add --execute to apply.');
