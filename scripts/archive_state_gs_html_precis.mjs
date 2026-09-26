#!/usr/bin/env node
/**
 * scripts/archive_state_gs_html_precis.mjs
 *
 * 10 state GS documents (Goa GS, Haryana_GS, Gujarat_CONSTABLE, ...) were ingested as html-format
 * PRECIS copies, one per exam, because the content team dropped the same file in every exam's
 * "3. PRECIS" Drive folder. The same book already exists as a block-format GUIDE. The Guides stay;
 * these Precis copies are duplicates and are archived.
 *
 * For each html Precis row of those titles, the exam(s) that depend on it are found two ways: an
 * explicit lc_exam_resource_map link, or (unlinked rows) the legacy exam_name match to a single
 * lc_exams row. Every dependent exam is guaranteed to hold the matching block Guide (link added if
 * missing). Then the html rows' links are deleted and the rows set to Draft.
 * A row that is unlinked AND whose exam_name does not resolve to exactly one exam is left
 * Published (never archived without a known alternate path).
 *
 * Dry run by default; --execute backs up first (rows, removed links, added links), then verifies
 * through the ANON key.
 *
 * Usage: node scripts/archive_state_gs_html_precis.mjs [--execute]
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

// html Precis title -> block Guide title(s) holding the same book
const PAIRS = {
  'arunachal pradesh si': ['arunachal pradesh si', 'arunachal pradesh gs'],
  'chhattisgarh_si': ['chhattisgarh gs'],
  'chhattisgarh_gs': ['chhattisgarh gs'],
  'goa gs': ['goa gs'],
  'haryana_gs': ['haryana gs'],
  'kerala constable': ['kerala gs'],
  'gujarat_constable': ['gujarat gs'],
  'himachal_pradesh_gs': ['himachal pradesh gs'],
  'karnataka_gs': ['karnataka gs'],
  'andhra_pradesh gs': ['andhra pradesh gs'],
};
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const normName = (s) => String(s || '').toLowerCase().replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim();

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

const res = await all(() => sb.from('resources').select('*').in('category', ['Guide', 'Precis']));
const links = await all(() => sb.from('lc_exam_resource_map').select('*').in('category', ['Guide', 'Precis']));
const exams = await all(() => sb.from('lc_exams').select('id,name'));
const examsByName = new Map();
for (const e of exams) { const k = normName(e.name); examsByName.set(k, [...(examsByName.get(k) || []), e.id]); }

const htmlRows = res.filter((r) => r.category === 'Precis' && r.format === 'html' && r.status === 'Published' && PAIRS[r.title.trim().toLowerCase()]);
const guideByTitle = new Map(); // title -> block Guide Published with most links
const linkCount = new Map(); for (const l of links) linkCount.set(l.resource_id, (linkCount.get(l.resource_id) || 0) + 1);
for (const r of res.filter((x) => x.category === 'Guide' && x.format === 'blocks' && x.status === 'Published')) {
  const k = r.title.trim().toLowerCase();
  if (!guideByTitle.has(k) || (linkCount.get(r.resource_id) || 0) > (linkCount.get(guideByTitle.get(k).resource_id) || 0)) guideByTitle.set(k, r);
}
const missingGuides = [...new Set(Object.values(PAIRS).flat())].filter((t) => !guideByTitle.has(t));
if (missingGuides.length) throw new Error(`No published block Guide for: ${missingGuides.join(', ')}`);

const guideLinks = new Map(); // exam -> Set(guide resource ids)
for (const l of links.filter((x) => x.category === 'Guide')) { if (!guideLinks.has(l.exam_id)) guideLinks.set(l.exam_id, new Set()); guideLinks.get(l.exam_id).add(l.resource_id); }
const linksByRes = new Map(); for (const l of links) linksByRes.set(l.resource_id, [...(linksByRes.get(l.resource_id) || []), l]);

const archive = []; const keep = []; const removeLinks = []; const addGuide = new Map(); // key exam|guide
let dependentExams = new Set(), alreadyHadGuide = 0;
for (const r of htmlRows) {
  const linked = linksByRes.get(r.resource_id) || [];
  let dep = linked.map((l) => l.exam_id);
  let via = 'link';
  if (!dep.length) {
    const c = examsByName.get(normName(r.exam_name)) || [];
    if (c.length === 1) { dep = c; via = 'exam_name'; } else { keep.push({ r, why: c.length ? 'exam_name ambiguous' : 'exam_name unresolved' }); continue; }
  }
  const wanted = PAIRS[r.title.trim().toLowerCase()].map((t) => guideByTitle.get(t));
  for (const e of dep) {
    dependentExams.add(e);
    const has = guideLinks.get(e) || new Set();
    if (wanted.some((g) => has.has(g.resource_id))) alreadyHadGuide++;
    else { const g = wanted[0]; addGuide.set(`${e}|${g.resource_id}`, { exam_id: e, resource_id: g.resource_id, category: 'Guide', confidence: 'high', reasoning: 'State GS Guide added when its duplicate html Precis copy was archived', source: 'manual' }); }
  }
  archive.push({ r, via });
  removeLinks.push(...linked);
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`html state-GS Precis rows Published: ${htmlRows.length} -> archive ${archive.length} (${archive.filter((a) => a.via === 'link').length} linked, ${archive.filter((a) => a.via === 'exam_name').length} reached via exam_name), keep ${keep.length}`);
console.log('kept (no safe alternate path):', keep.reduce((a, k) => (a[k.why] = (a[k.why] || 0) + 1, a), {}));
console.log(`exams depending on these rows: ${dependentExams.size} | already hold the matching Guide: ${alreadyHadGuide} | Guide links to ADD: ${addGuide.size} | Precis links to remove: ${removeLinks.length}`);
const perTitle = {}; for (const a of archive) perTitle[a.r.title] = (perTitle[a.r.title] || 0) + 1; console.log('archive per title:', perTitle);

if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'state_gs_html_precis_rows.json'), JSON.stringify(archive.map((a) => a.r), null, 1));
fs.writeFileSync(path.join(dir, 'state_gs_html_precis_removed_links.json'), JSON.stringify(removeLinks, null, 1));
fs.writeFileSync(path.join(dir, 'state_gs_guide_links_added.json'), JSON.stringify([...addGuide.values()], null, 1));
console.log(`[backup] ${dir}`);

const adds = [...addGuide.values()];
for (const c of chunks(adds, 500)) {
  const { error } = await sb.from('lc_exam_resource_map').upsert(c, { onConflict: 'exam_id,resource_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
console.log(`[DB] added ${adds.length} Guide links`);
for (const c of chunks(removeLinks.map((l) => l.id), 100)) {
  const { error } = await sb.from('lc_exam_resource_map').delete().in('id', c);
  if (error) throw new Error(error.message);
}
console.log(`[DB] removed ${removeLinks.length} Precis links`);
for (const c of chunks(archive.map((a) => a.r.resource_id), 100)) {
  const { error } = await sb.from('resources').update({ status: 'Draft' }).in('resource_id', c);
  if (error) throw new Error(error.message);
}
console.log(`[DB] archived ${archive.length} html Precis rows`);

// verify through anon: every dependent exam holds a state Guide; archived rows invisible
let noGuide = 0, seenArchived = 0;
const wantedIds = new Set([...guideByTitle.values()].map((g) => g.resource_id));
for (const c of chunks([...dependentExams], 40)) {
  const { data } = await anon.from('lc_exam_resource_map').select('exam_id,resource_id').eq('category', 'Guide').in('exam_id', c);
  const have = new Set((data || []).filter((d) => wantedIds.has(d.resource_id)).map((d) => d.exam_id));
  noGuide += c.filter((e) => !have.has(e)).length;
}
for (const c of chunks(archive.map((a) => a.r.resource_id), 40)) seenArchived += ((await anon.from('resources').select('resource_id').in('resource_id', c)).data || []).length;
console.log(`[verify via anon] dependent exams WITHOUT a state Guide: ${noGuide} (expect 0) | archived rows still visible: ${seenArchived} (expect 0)`);
