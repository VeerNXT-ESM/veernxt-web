#!/usr/bin/env node
/**
 * scripts/exam-mapping/retag_state_exams.mjs
 *
 * Gives State-level exams their own category list, taken from the content
 * team's "State Government Exams" docx ("Category of Exam" column), kept
 * separate from the Central list (see retag_central_exams.mjs). State/UT are
 * searched mainly by conducting body, so category is a filtering aid, not the
 * primary key -- hence the doc's own wording is used as-is apart from:
 *   - pure spelling variants merged: "Forest Service" -> "Forest Services",
 *     "Judicial Service" -> "Judicial Services"
 *   - two doc names that collide with Central category names are folded into
 *     their State neighbour so State never shares a name with Central:
 *       "Civil Services" -> "State Civil Services", "Nursing" -> "Health Nursing"
 *   - the one blank-category doc row (UPSSSC UP Agriculture Technical
 *     Assistant) -> "Agriculture Services"
 * Also creates the doc's one missing exam (Punjab Gramin Dak Sevak, draft).
 * Writes src/lib/stateExamCategories.js so the admin editor can scope its
 * dropdown by level.
 *
 * Usage:
 *   node scripts/exam-mapping/retag_state_exams.mjs <stateDoc.json>            # dry run
 *   node scripts/exam-mapping/retag_state_exams.mjs <stateDoc.json> --execute  # writes
 * <stateDoc.json> = docx table as [[serNo, state, category, body, exam, website, logo], ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
const EXECUTE = process.argv.includes('--execute');
const docPath = process.argv[2];
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const clean = (s) => (s || '').replace(/​/g, '').replace(/\s+/g, ' ').trim();
const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stripNumbering = (s) => clean(s).replace(/^\d+[.)]\s*/, '');

const CATEGORY_FIXES = {
  'forest service': 'Forest Services',
  'judicial service': 'Judicial Services',
  'civil services': 'State Civil Services',
  'nursing': 'Health Nursing',
};
const BLANK_CATEGORY_FALLBACK = 'Agriculture Services';
const canonicalCategory = (raw) => {
  const c = clean(raw);
  if (!c) return BLANK_CATEGORY_FALLBACK;
  return CATEGORY_FIXES[norm(c)] || c;
};

async function fetchAll(table, select) {
  let all = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < 1000) return all;
    from += 1000;
  }
}

const docRows = JSON.parse(fs.readFileSync(docPath, 'utf-8')).slice(1)
  .map((r) => ({ st: clean(r[1]), rawCat: clean(r[2]), cat: canonicalCategory(r[2]), body: clean(r[3]), name: stripNumbering(r[4]), website: clean(r[5]) }));

const regions = await fetchAll('lc_regions', 'id,name,level');
const stateRegion = Object.fromEntries(regions.filter((r) => r.level === 'state').map((r) => [norm(r.name), r]));
const bodies = await fetchAll('lc_conducting_bodies', 'id,name');
const bodyById = Object.fromEntries(bodies.map((b) => [b.id, b]));
const exams = (await fetchAll('lc_exams', 'id,name,category,category_detail,conducting_body_id,region_id'))
  .filter((e) => Object.values(stateRegion).some((r) => r.id === e.region_id));
const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name]));

const idx = new Map();
for (const e of exams) { const k = `${norm(regionName[e.region_id])}|${norm(e.name)}`; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(e); }
const claimed = new Set(); const updates = []; const missing = []; let same = 0;
for (const d of docRows) {
  const cands = (idx.get(`${norm(d.st)}|${norm(d.name)}`) || []).filter((e) => !claimed.has(e.id));
  if (!cands.length) { missing.push(d); continue; }
  const pick = cands.find((e) => norm(e.category_detail) === norm(d.rawCat)) || cands[0];
  claimed.add(pick.id);
  if (pick.category === d.cat) same++; else updates.push({ id: pick.id, name: pick.name, st: d.st, from: pick.category, to: d.cat });
}
const orphans = exams.filter((e) => !claimed.has(e.id));
// An orphan that is a case/spelling twin of a doc exam in the same state takes its twin's category.
for (const o of orphans) {
  const twin = docRows.find((d) => norm(d.st) === norm(regionName[o.region_id]) && norm(d.name).replace(/ mts$/, '') === norm(o.name).replace(/ mts$/, '') || (norm(d.st) === norm(regionName[o.region_id]) && norm(d.name).startsWith(norm(o.name))));
  if (twin && twin.cat !== o.category) updates.push({ id: o.id, name: o.name, st: regionName[o.region_id], from: o.category, to: twin.cat, orphan: true });
}

const cats = {};
docRows.forEach((d) => { cats[d.cat] = (cats[d.cat] || 0) + 1; });
const stateCategoryNames = Object.keys(cats).sort((a, b) => a.localeCompare(b));
const existingCats = new Set((await fetchAll('lc_exam_categories', 'name')).map((c) => c.name));
const centralNames = new Set(fs.readFileSync('src/lib/centralExamCategories.js', 'utf-8').match(/'[^']+'/g).map((s) => s.slice(1, -1)));
const collisions = stateCategoryNames.filter((n) => centralNames.has(n));
const toCreate = stateCategoryNames.filter((n) => !existingCats.has(n));
const reused = stateCategoryNames.filter((n) => existingCats.has(n));

console.log(`Doc rows ${docRows.length} | DB state exams ${exams.length} | matched ${claimed.size} | already correct ${same} | to recategorise ${updates.length} | doc rows missing ${missing.length} | orphans ${orphans.length}`);
console.log(`State categories: ${stateCategoryNames.length} | new to create: ${toCreate.length} | already exist (shared name with legacy list): ${reused.length} ${JSON.stringify(reused)}`);
console.log('collisions with Central names:', collisions);
console.log('\nMissing (will be created as draft):'); missing.forEach((d) => console.log('  ', d.st, '|', d.cat, '|', d.body, '|', d.name));
console.log('\nOrphans:'); orphans.forEach((o) => console.log('  ', regionName[o.region_id], '|', o.category, '|', o.name));
const flow = {}; updates.forEach((u) => { const k = `${u.from}  ->  ${u.to}`; flow[k] = (flow[k] || 0) + 1; });
console.log('\nRecategorise flows (old -> new): top 25 of', Object.keys(flow).length);
Object.entries(flow).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(String(v).padStart(4), k));

if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to write.'); process.exit(0); }

// 1. categories
if (toCreate.length) {
  const { error } = await supabase.from('lc_exam_categories').insert(toCreate.map((name) => ({ name })));
  if (error) throw error;
  console.log('created categories:', toCreate.length);
}
// 2. missing exams (draft)
for (const d of missing) {
  const region = stateRegion[norm(d.st)];
  const body = bodies.find((b) => norm(b.name) === norm(d.body));
  if (!region || !body) { console.error('cannot create (region/body not found):', d); continue; }
  const { error } = await supabase.from('lc_exams').insert({ name: d.name, category: d.cat, conducting_body_id: body.id, region_id: region.id, website: d.website || null, status: 'draft' });
  console.log(error ? 'create failed: ' + error.message : `created draft: ${d.st} | ${d.name}`);
}
// 3. recategorise
let done = 0;
for (const u of updates) {
  const { error } = await supabase.from('lc_exams').update({ category: u.to }).eq('id', u.id);
  if (error) console.error('FAILED', u, error.message); else done++;
}
console.log(`recategorised ${done}/${updates.length}`);
// 4. code-side list for the editor dropdown
const out = `/**
 * The State category list -- taken from the content team's State Government
 * Exams doc (see scripts/exam-mapping/retag_state_exams.mjs). Offered in the
 * exam editor's Category dropdown when Level is State, and never shares a name
 * with the Central list (centralExamCategories.js). Names must match
 * lc_exam_categories.name exactly. Regenerate by re-running that script.
 */
export const STATE_EXAM_CATEGORIES = ${JSON.stringify(stateCategoryNames, null, 2)};
`;
fs.writeFileSync('src/lib/stateExamCategories.js', out);
console.log('wrote src/lib/stateExamCategories.js');
