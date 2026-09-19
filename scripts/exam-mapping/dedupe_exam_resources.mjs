#!/usr/bin/env node
/**
 * scripts/exam-mapping/dedupe_exam_resources.mjs
 *
 * Finds duplicate Guide/Precis links WITHIN one exam (lc_exam_resource_map)
 * and removes the redundant ones. Only the exam<->resource link is removed --
 * `resources` rows are never touched (another exam may still use them).
 *
 * Within one (exam, category), two linked resources are "the same resource" -- and
 * the extra link is removable -- when EITHER:
 *   - they share a file_hash (identical bytes), OR
 *   - they share storage_base_url AND chapter_count AND title (they serve the
 *     identical stored content; the hash differs only because the source .docx
 *     was ingested twice under different file names, e.g. MATHEMATICS.docx vs
 *     Cluster_008_MATHEMATICS.docx).
 * Which link stays: the resource that is Published, then the one used by the most
 * exams overall (the canonical shared copy), then the oldest link.
 *
 * Same title but different content is NOT removed -- it is written to the plan's
 * "flagged" list for the content team to decide:
 *   - same title + same chapter count, different stored file  ("likely_same_file")
 *   - same title + different chapter count                    ("different_content")
 *
 * Usage:
 *   node scripts/exam-mapping/dedupe_exam_resources.mjs [--plan out.json]              # dry run
 *   node scripts/exam-mapping/dedupe_exam_resources.mjs --execute [--backup-dir DIR]   # backs up, then deletes
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

const maps = (await fetchAll('lc_exam_resource_map', '*')).filter((m) => m.category === 'Guide' || m.category === 'Precis');
const resources = Object.fromEntries((await fetchAll('resources', 'resource_id,title,file_hash,source_file,storage_base_url,status,chapter_count,created_at')).map((r) => [r.resource_id, r]));
const exams = Object.fromEntries((await fetchAll('lc_exams', 'id,name,category,region:lc_regions(name,level)')).map((e) => [e.id, e]));

const examsPerResource = {};
for (const m of maps) (examsPerResource[m.resource_id] = examsPerResource[m.resource_id] || new Set()).add(m.exam_id);

const byGroup = new Map();
for (const m of maps) { const k = `${m.exam_id}|${m.category}`; if (!byGroup.has(k)) byGroup.set(k, []); byGroup.get(k).push(m); }

// Union-find over one group's links.
function clusters(links) {
  const parent = links.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (let i = 0; i < links.length; i++) {
    for (let j = i + 1; j < links.length; j++) {
      const a = resources[links[i].resource_id]; const b = resources[links[j].resource_id];
      if (!a || !b) continue;
      if (a.resource_id === b.resource_id) { union(i, j); continue; }
      const sameHash = a.file_hash && a.file_hash === b.file_hash;
      const sameServed = a.storage_base_url && a.storage_base_url === b.storage_base_url && a.chapter_count === b.chapter_count && norm(a.title) === norm(b.title);
      if (sameHash || sameServed) union(i, j);
    }
  }
  const out = new Map();
  links.forEach((l, i) => { const r = find(i); if (!out.has(r)) out.set(r, []); out.get(r).push(l); });
  return [...out.values()];
}
const rank = (m) => {
  const r = resources[m.resource_id] || {};
  return [r.status === 'Published' ? 0 : 1, -(examsPerResource[m.resource_id]?.size || 0), m.created_at || ''];
};
const cmp = (a, b) => { const x = rank(a); const y = rank(b); for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; };

const remove = []; const flagged = []; let dupClusters = 0;
for (const [key, links] of byGroup) {
  const [examId, category] = key.split('|');
  const cl = clusters(links);
  for (const c of cl) {
    if (c.length < 2) continue;
    dupClusters++;
    c.sort(cmp);
    for (const m of c.slice(1)) remove.push({ ...m, kept_resource_id: c[0].resource_id });
  }
  // Same normalized title across clusters that were NOT merged -> flag for the content team.
  const survivors = cl.map((c) => c[0]); // the kept link of each cluster
  const byTitle = new Map();
  for (const m of survivors) { const r = resources[m.resource_id]; if (!r) continue; const t = norm(r.title); if (!byTitle.has(t)) byTitle.set(t, []); byTitle.get(t).push(m); }
  for (const [title, ms] of byTitle) {
    if (ms.length < 2) continue;
    const chapters = new Set(ms.map((m) => resources[m.resource_id].chapter_count));
    flagged.push({
      exam_id: examId, exam: exams[examId]?.name, level: exams[examId]?.region?.level, region: exams[examId]?.region?.name, exam_category: exams[examId]?.category,
      category, title, kind: chapters.size === 1 ? 'likely_same_file' : 'different_content',
      resources: ms.map((m) => { const r = resources[m.resource_id]; return { map_id: m.id, resource_id: r.resource_id, chapter_count: r.chapter_count, source_file: r.source_file, status: r.status, created_at: r.created_at, storage_base_url: r.storage_base_url, file_hash: r.file_hash, used_by_exams: examsPerResource[r.resource_id]?.size || 0 }; }),
    });
  }
}

const removeExamCount = new Set(remove.map((m) => m.exam_id)).size;
const flagKinds = {}; flagged.forEach((f) => { flagKinds[f.kind] = (flagKinds[f.kind] || 0) + 1; });
const keptBy = {}; remove.forEach((m) => { keptBy[m.category] = (keptBy[m.category] || 0) + 1; });
console.log(`Guide/Precis links: ${maps.length} across ${byGroup.size} exam/category groups`);
console.log(`Duplicate clusters: ${dupClusters} | links to REMOVE: ${remove.length} (${JSON.stringify(keptBy)}) across ${removeExamCount} exams -> ${maps.length - remove.length} links remain`);
console.log(`Flagged for the content team (same title, not the same content): ${flagged.length} groups ${JSON.stringify(flagKinds)}`);
const orphanedIfRemoved = new Set(Object.keys(examsPerResource).filter((rid) => [...examsPerResource[rid]].every((eid) => remove.some((m) => m.resource_id === rid && m.exam_id === eid)))).size;
console.log(`Resources left with no exam link afterwards (rows kept, just unlinked): ${orphanedIfRemoved}`);

if (PLAN_OUT) { fs.writeFileSync(PLAN_OUT, JSON.stringify({ remove, flagged, resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, { title: v.title, chapter_count: v.chapter_count }])) })); console.log('plan written to', PLAN_OUT); }
if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to back up and delete.'); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(BACKUP_DIR, stamp);
fs.mkdirSync(dir, { recursive: true });
const backupFile = path.join(dir, 'lc_exam_resource_map_removed_duplicates.json');
fs.writeFileSync(backupFile, JSON.stringify(remove, null, 1));
console.log('backup of rows to be deleted:', backupFile, `(${remove.length} rows)`);

let deleted = 0;
for (let i = 0; i < remove.length; i += 200) {
  const ids = remove.slice(i, i + 200).map((m) => m.id);
  await withRetry(() => supabase.from('lc_exam_resource_map').delete().in('id', ids));
  deleted += ids.length;
  if ((i / 200) % 5 === 0) console.log(`  deleted ${deleted}/${remove.length}`);
}
console.log(`deleted ${deleted} duplicate links`);
