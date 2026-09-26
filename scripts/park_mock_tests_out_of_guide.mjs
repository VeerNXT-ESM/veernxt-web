#!/usr/bin/env node
/**
 * scripts/park_mock_tests_out_of_guide.mjs
 *
 * Mock tests were ingested as html-format "Guide" resources (folders like
 * "5. 10 MOCK TESTS"). They are Mock Tests (Quiz Center), not Guides. This retags
 * them status='Draft' (category stays Guide -- resources_category_check has no Mock Test value; parked: rows and R2 files are kept, so
 * they can be found again when Mock Tests are rebuilt from Google Drive) and removes
 * their lc_exam_resource_map Guide links (full rows saved to the backup).
 *
 * Match rule: category='Guide', format='html', status='Published', and the storage
 * folder path or the title contains "mock"  -- OR the folder is one of the steno/lda/clerk
 * sets whose titles contain "mock". Precis rows are never touched.
 *
 * Dry run by default. --execute backs up first, updates resources, then deletes the
 * links, then verifies through the ANON key (what real pages read with).
 *
 * Usage: node scripts/park_mock_tests_out_of_guide.mjs [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY);
const BACKUP_ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;

async function all(build) {
  let out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await build().range(f, f + 999);
    if (error) throw new Error(error.message);
    out = out.concat(data || []);
    if (!data || data.length < 1000) break;
  }
  return out;
}
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const rows = await all(() => sb.from('resources').select('*').eq('category', 'Guide').eq('format', 'html').eq('status', 'Published'));
const folder = (r) => decodeURIComponent(r.storage_base_url || '');
const isMock = (r) => /mock/i.test(folder(r)) || /mock/i.test(r.title || '');
const targets = rows.filter(isMock);
const left = rows.filter((r) => !isMock(r));
const ids = targets.map((r) => r.resource_id);

let links = [];
for (const c of chunks(ids, 100)) links = links.concat(await all(() => sb.from('lc_exam_resource_map').select('*').in('resource_id', c)));

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`Published html Guide rows: ${rows.length}  -> mock tests to park: ${targets.length}, left in Guide: ${left.length}`);
console.log(`Exam links on the mock rows: ${links.length} (${new Set(links.map((l) => l.exam_id)).size} exams; categories: ${JSON.stringify([...new Set(links.map((l) => l.category))])})`);
console.log('Left in Guide (not mock):'); left.forEach((r) => console.log('   ', r.title, '|', r.chapter_count, 'ch'));
const byFolder = {}; targets.forEach((r) => { const f = folder(r).replace(/^https?:\/\/[^/]+\//, '').split('/').slice(-3, -2)[0]; byFolder[f] = (byFolder[f] || 0) + 1; });
console.log('Mock rows by folder:', byFolder);

if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'park_mock_tests_resources.json'), JSON.stringify(targets, null, 1));
fs.writeFileSync(path.join(dir, 'park_mock_tests_removed_links.json'), JSON.stringify(links, null, 1));
console.log(`[backup] ${dir}`);

for (const c of chunks(ids, 100)) {
  const { error } = await sb.from('resources').update({ status: 'Draft' }).in('resource_id', c);
  if (error) throw new Error(`resources update failed (nothing else changed for later batches): ${error.message}`);
}
console.log(`[DB] ${ids.length} resources -> status 'Draft' (category stays Guide: resources_category_check has no Mock Test value)`);
for (const c of chunks(links.map((l) => l.id), 100)) {
  const { error } = await sb.from('lc_exam_resource_map').delete().in('id', c);
  if (error) throw new Error(`link delete failed: ${error.message}`);
}
console.log(`[DB] removed ${links.length} exam links`);

let anonSees = 0, dangling = 0;
for (const c of chunks(ids, 50)) {
  anonSees += (await anon.from('resources').select('resource_id').in('resource_id', c)).data.length;
  dangling += (await sb.from('lc_exam_resource_map').select('id', { count: 'exact', head: true }).in('resource_id', c)).count;
}
console.log(`[verify] anon can still see ${anonSees} of ${ids.length} parked rows (expect 0) | exam links left on them: ${dangling} (expect 0)`);
