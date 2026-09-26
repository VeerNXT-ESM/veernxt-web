#!/usr/bin/env node
/**
 * scripts/rollback_2026_09_23.mjs
 *
 * Undoes the database changes made on 2026-09-23 (docs/status_report.md §64), one step at a time,
 * from the backup files each step wrote. Dry run by default -- prints what it would restore.
 *
 *   node scripts/rollback_2026_09_23.mjs --step=rename-math      [--execute]
 *   node scripts/rollback_2026_09_23.mjs --step=unpark-mocks     [--execute]
 *   node scripts/rollback_2026_09_23.mjs --step=restore-gk-dupes [--execute]
 *   node scripts/rollback_2026_09_23.mjs --step=unlink-gk-splits [--execute]
 *
 * Steps are independent. Backups live in K:\tmp\db_backups\<timestamp>\ (override the four
 * directories below with env vars if the folders were moved).
 * Not covered here: the 09-21 book work (Mathematics 20-chapter replace, the five "2026 ..." copies)
 * -- see docs/status_report.md §63 for those restore paths.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const STEP = (process.argv.find((a) => a.startsWith('--step=')) || '').split('=')[1];
const ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;
const DIRS = {
  'rename-math': process.env.BK_RENAME_MATH || '2026-09-23T07-22-50-982Z',
  'unpark-mocks': process.env.BK_MOCKS || '2026-09-23T16-20-45-617Z',
  'restore-gk-dupes': process.env.BK_GK_DUPES || '2026-09-23T16-46-01-777Z',
  'unlink-gk-splits': process.env.BK_GK_LINKS || '2026-09-23T17-02-31-941Z',
};
const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const load = (step, file) => JSON.parse(fs.readFileSync(path.join(ROOT, DIRS[step], file), 'utf8'));

if (!DIRS[STEP]) { console.error(`Usage: --step=${Object.keys(DIRS).join('|')} [--execute]`); process.exit(1); }
console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} | step: ${STEP} | backup: ${path.join(ROOT, DIRS[STEP])}`);

if (STEP === 'rename-math') {
  const rows = load(STEP, 'mathematics_precis_rename_backup.json');
  // Guard: only rows STILL titled '2026 MATHEMATICS' are renamed, so a later manual rename by the content team is never overwritten.
  const { data: cur } = await sb.from('resources').select('resource_id').in('resource_id', rows.map((r) => r.resource_id).slice(0, 500)).eq('title', '2026 MATHEMATICS');
  console.log(`${rows.length} rows in backup; would rename back to "${rows[0].title}" only those still titled '2026 MATHEMATICS' (first 500 checked: ${cur?.length ?? 0}).`);
  if (EXECUTE) for (const c of chunks(rows.map((r) => r.resource_id), 200)) {
    const { error } = await sb.from('resources').update({ title: rows[0].title }).in('resource_id', c).eq('title', '2026 MATHEMATICS'); if (error) throw new Error(error.message);
  }
}

if (STEP === 'unpark-mocks') {
  const rows = load(STEP, 'park_mock_tests_resources.json');
  const links = load(STEP, 'park_mock_tests_removed_links.json');
  console.log(`Would set ${rows.length} resources back to status Published and re-insert ${links.length} exam links.`);
  if (EXECUTE) {
    for (const c of chunks(rows.map((r) => r.resource_id), 100)) { const { error } = await sb.from('resources').update({ status: 'Published' }).in('resource_id', c); if (error) throw new Error(error.message); }
    for (const c of chunks(links, 200)) { const { error } = await sb.from('lc_exam_resource_map').upsert(c, { onConflict: 'id' }); if (error) throw new Error(error.message); }
  }
}

if (STEP === 'restore-gk-dupes') {
  const rows = load(STEP, 'gk_split_dedupe_rows.json'); // all 33 rows, each Published before the run
  const polity = rows.find((r) => r.resource_id === 'c7fd0e2a-188b-47ae-a3fe-635138735ce7');
  console.log(`Would set ${rows.length} rows back to Published and restore the title "${polity?.title}" on the kept Polity split.`);
  if (EXECUTE) {
    for (const c of chunks(rows.map((r) => r.resource_id), 100)) { const { error } = await sb.from('resources').update({ status: 'Published' }).in('resource_id', c); if (error) throw new Error(error.message); }
    if (polity) { const { error } = await sb.from('resources').update({ title: polity.title }).eq('resource_id', polity.resource_id); if (error) throw new Error(error.message); }
  }
}

if (STEP === 'unlink-gk-splits') {
  const plan = load(STEP, 'gk_splits_links_added.json'); // [{exam_id, resource_id}]
  console.log(`Would delete ${plan.length} exam->GK-split links (${new Set(plan.map((p) => p.exam_id)).size} exams). The combined GK links are untouched.`);
  if (EXECUTE) {
    const byRes = new Map(); for (const p of plan) byRes.set(p.resource_id, [...(byRes.get(p.resource_id) || []), p.exam_id]);
    for (const [rid, exams] of byRes) for (const c of chunks(exams, 100)) {
      const { error } = await sb.from('lc_exam_resource_map').delete().eq('resource_id', rid).in('exam_id', c); if (error) throw new Error(error.message);
    }
  }
}
console.log(EXECUTE ? 'Done.' : 'Dry run only -- add --execute to apply.');
