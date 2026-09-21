#!/usr/bin/env node
/**
 * scripts/exam-mapping/remove_misfiled_precis_links.mjs
 *
 * Removes Precis links that actually point at a Guide file. Found 2026-09-19:
 * the 2026-09-17 "Backfilled from legacy exam_name duplicate row" run trusted
 * resources.category = 'Precis' on 1,179 English resources whose stored files
 * live under /blocks/Guide/ (23-chapter Guide-sized documents; genuine English
 * Precis have 1 or 30 chapters). 691 exams got a Precis link to one of them
 * (all the same file, Cluster_005_ENGLISH.docx).
 *
 * A candidate is a link with: category 'Precis', reasoning starting
 * "Backfilled from legacy", resource labelled Precis but stored under /blocks/Guide/.
 * Per candidate, on its own exam:
 *   A) the exam already links this same English as a Guide (same stored folder, or
 *      same title + chapter_count)                 -> REMOVE (a straight duplicate)
 *   B) otherwise, the exam already has a genuine English Precis (stored under
 *      /blocks/Precis/ or a legacy path)          -> REMOVE
 *   C) neither: it would leave the exam with no English Precis -> KEPT, listed for
 *      the content team (they need a real Precis linked, ideally in bulk).
 * Only lc_exam_resource_map rows are deleted -- never `resources`.
 *
 * Usage:
 *   node scripts/exam-mapping/remove_misfiled_precis_links.mjs [--plan out.json]              # dry run
 *   node scripts/exam-mapping/remove_misfiled_precis_links.mjs --execute [--backup-dir DIR]   # backs up, then deletes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
const argVal = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };
const EXECUTE = process.argv.includes('--execute');
const PLAN_OUT = argVal('--plan');
const BACKUP_DIR = argVal('--backup-dir') || 'K:/tmp/db_backups';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn) {
  let last;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await fn();
    if (!error) return data;
    last = error; await sleep(2000 * (i + 1));
  }
  throw new Error(String(last.message).slice(0, 200));
}
async function fetchAll(table, select) {
  let all = []; let from = 0;
  for (;;) {
    const data = await withRetry(() => supabase.from(table).select(select).range(from, from + 999));
    all = all.concat(data || []);
    if (!data || data.length < 1000) return all;
    from += 1000;
  }
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pathType = (url) => { const m = /\/blocks\/(Guide|Precis|Intro)\//.exec(url || ''); return m ? m[1] : (url ? 'legacy' : null); };
const folder = (url) => (/\/blocks\/(?:Guide|Precis|Intro)\/([^/]+)/.exec(url || '') || [])[1] || null;

const maps = await fetchAll('lc_exam_resource_map', 'id,exam_id,resource_id,category,reasoning,source,created_at');
const resources = Object.fromEntries((await fetchAll('resources', 'resource_id,title,category,storage_base_url,chapter_count,source_file')).map((r) => [r.resource_id, r]));
const exams = Object.fromEntries((await fetchAll('lc_exams', 'id,name,category,region:lc_regions(name,level)')).map((e) => [e.id, e]));

const isMisfiled = (r) => r && r.category === 'Precis' && pathType(r.storage_base_url) === 'Guide';
const linksByExam = new Map();
for (const m of maps) { if (!linksByExam.has(m.exam_id)) linksByExam.set(m.exam_id, []); linksByExam.get(m.exam_id).push(m); }

const candidates = maps.filter((m) => m.category === 'Precis' && (m.reasoning || '').startsWith('Backfilled from legacy') && isMisfiled(resources[m.resource_id]));
const remove = []; const keep = [];
for (const m of candidates) {
  const r = resources[m.resource_id];
  const ls = (linksByExam.get(m.exam_id) || []).filter((x) => x.id !== m.id && resources[x.resource_id]);
  const guideTwin = ls.some((x) => x.category === 'Guide' && (folder(resources[x.resource_id].storage_base_url) === folder(r.storage_base_url)
    || (norm(resources[x.resource_id].title) === norm(r.title) && resources[x.resource_id].chapter_count === r.chapter_count)));
  const genuinePrecis = ls.some((x) => x.category === 'Precis' && !isMisfiled(resources[x.resource_id]) && norm(resources[x.resource_id].title).startsWith('english'));
  if (guideTwin) remove.push({ ...m, why: 'A: exam already has this English as a Guide' });
  else if (genuinePrecis) remove.push({ ...m, why: 'B: exam already has a genuine English Precis' });
  else keep.push(m);
}

const whyCount = {}; remove.forEach((m) => { whyCount[m.why] = (whyCount[m.why] || 0) + 1; });
const levels = {}; remove.forEach((m) => { const l = exams[m.exam_id]?.region?.level; levels[l] = (levels[l] || 0) + 1; });
console.log(`Candidates (backfilled Precis links to Guide-stored files): ${candidates.length}`);
console.log(`REMOVE ${remove.length} ${JSON.stringify(whyCount)} by level ${JSON.stringify(levels)} across ${new Set(remove.map((m) => m.exam_id)).size} exams`);
console.log(`KEEP for the content team (no other English Precis on the exam): ${keep.length}`);
keep.forEach((m) => console.log('  ', exams[m.exam_id]?.region?.level, '|', exams[m.exam_id]?.region?.name, '|', exams[m.exam_id]?.name));
// Safety: no exam may end up with zero Precis links because of this run.
const removedPer = {}; remove.forEach((m) => { removedPer[m.exam_id] = (removedPer[m.exam_id] || 0) + 1; });
const emptied = Object.entries(removedPer).filter(([eid, n]) => (linksByExam.get(eid) || []).filter((x) => x.category === 'Precis').length <= n).length;
console.log(`Exams left with NO Precis at all after removal: ${emptied}`);

if (PLAN_OUT) { fs.writeFileSync(PLAN_OUT, JSON.stringify({ remove, keep: keep.map((m) => ({ ...m, exam: exams[m.exam_id]?.name, region: exams[m.exam_id]?.region?.name })) })); console.log('plan written to', PLAN_OUT); }
if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to back up and delete.'); process.exit(0); }
if (emptied > 0) { console.error('Refusing to execute: some exams would lose all Precis.'); process.exit(1); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(BACKUP_DIR, stamp);
fs.mkdirSync(dir, { recursive: true });
const backupFile = path.join(dir, 'lc_exam_resource_map_removed_misfiled_precis.json');
fs.writeFileSync(backupFile, JSON.stringify(remove, null, 1));
console.log('backup of rows to be deleted:', backupFile, `(${remove.length} rows)`);
let deleted = 0;
for (let i = 0; i < remove.length; i += 200) {
  const ids = remove.slice(i, i + 200).map((m) => m.id);
  await withRetry(() => supabase.from('lc_exam_resource_map').delete().in('id', ids));
  deleted += ids.length;
}
console.log(`deleted ${deleted} misfiled Precis links`);
