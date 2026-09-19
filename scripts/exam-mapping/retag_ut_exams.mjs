#!/usr/bin/env node
/**
 * scripts/exam-mapping/retag_ut_exams.mjs
 *
 * Gives UT-level exams their own category list, taken from the content team's
 * "UT Exams List" docx ("Category of Exam" column), separate from the Central
 * list (retag_central_exams.mjs) and the State list (retag_state_exams.mjs).
 * Same rules as the State pass:
 *   - the doc's wording is used as-is, except case variants merged
 *     (ADMINISTRATIVE/Administrative, BANKING/Banking, POLICE/Police) and the
 *     "Animal" + "Husbandry" cell that Word split across two rows;
 *   - any name that would still collide with a Central or State category gets
 *     a " (UT)" suffix, so no category is ever shared between levels;
 *   - doc rows with no DB exam are created as drafts; DB exams whose only
 *     difference from a doc row is naming (e.g. "A&N GDS (Gramin Dak Sevak)"
 *     vs "GDS / Postal Assistant", "SSC CGL" vs "SSC CGL (Combined Graduate
 *     Level)") are treated as the same exam -- recategorised, never renamed
 *     or duplicated;
 *   - legacy categories left with no exams at all and not in any of the three
 *     level lists are deleted (only if unused).
 * Writes src/lib/utExamCategories.js for the admin editor's UT dropdown.
 *
 * Usage:
 *   node scripts/exam-mapping/retag_ut_exams.mjs <utDoc.json>            # dry run
 *   node scripts/exam-mapping/retag_ut_exams.mjs <utDoc.json> --execute  # writes
 * <utDoc.json> = flat rows [{ut, cat, catfrag?, body, name, website}, ...]
 * (the UT docx's 23 fragmented tables flattened, UT/category carried forward
 * across merged cells).
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
const listFrom = (file) => new Set(fs.readFileSync(file, 'utf-8').match(/(['"])(?:(?!\1).)+\1/g).map((s) => s.slice(1, -1)).filter((s) => !s.startsWith('/')));
const centralNames = listFrom('src/lib/centralExamCategories.js');
const stateNames = listFrom('src/lib/stateExamCategories.js');

// Case variants collapse to the most frequent spelling; collisions get " (UT)".
const rawRows = JSON.parse(fs.readFileSync(docPath, 'utf-8'));
const spelled = {};
for (const r of rawRows) { const c = clean(r.catfrag ? `${r.cat} ${r.catfrag}` : r.cat); (spelled[norm(c)] = spelled[norm(c)] || {})[c] = (spelled[norm(c)][c] || 0) + 1; }
const canonBySpelling = Object.fromEntries(Object.entries(spelled).map(([k, v]) => [k, Object.entries(v).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]]));
// Title-case an ALL-CAPS-only spelling (e.g. "POLICE") so it reads like the rest.
// Acronyms (SSC, IBPS...) stay as written -- only longer all-caps words are softened.
const pretty = (s) => (s === s.toUpperCase() && /[A-Z]{5,}/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase() : s);
const isTaken = (n) => centralNames.has(n) || stateNames.has(n);
const canonicalCategory = (rawCat) => {
  const base = pretty(canonBySpelling[norm(rawCat)] || clean(rawCat));
  return isTaken(base) ? `${base} (UT)` : base;
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

const docRows = rawRows.map((r) => {
  const rawCat = clean(r.catfrag ? `${r.cat} ${r.catfrag}` : r.cat);
  return { ut: clean(r.ut), rawCat, cat: canonicalCategory(rawCat), body: clean(r.body), name: clean(r.name), website: clean(r.website) };
});

const regions = await fetchAll('lc_regions', 'id,name,level');
const utRegion = Object.fromEntries(regions.filter((r) => r.level === 'ut').map((r) => [norm(r.name), r]));
const regionName = Object.fromEntries(regions.map((r) => [r.id, r.name]));
const bodies = await fetchAll('lc_conducting_bodies', 'id,name');
const exams = (await fetchAll('lc_exams', 'id,name,category,category_detail,conducting_body_id,region_id'))
  .filter((e) => regions.find((r) => r.id === e.region_id)?.level === 'ut');
const findBody = (name) => bodies.find((b) => norm(b.name) === norm(name));

const idx = new Map();
for (const e of exams) { const k = `${norm(regionName[e.region_id])}|${norm(e.name)}`; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(e); }
const claimed = new Set(); const updates = []; let same = 0; let unmatched = [];
for (const d of docRows) {
  const c = (idx.get(`${norm(d.ut)}|${norm(d.name)}`) || []).filter((e) => !claimed.has(e.id));
  if (!c.length) { unmatched.push(d); continue; }
  claimed.add(c[0].id);
  if (c[0].category === d.cat) same++; else updates.push({ id: c[0].id, name: c[0].name, ut: d.ut, from: c[0].category, to: d.cat });
}
// Pair leftover doc rows with leftover DB exams that differ only in naming.
const orphans = exams.filter((e) => !claimed.has(e.id));
const twinPairs = []; const missing = [];
for (const d of unmatched) {
  const o = orphans.find((x) => !claimed.has(x.id) && norm(regionName[x.region_id]) === norm(d.ut)
    && ((norm(d.name).startsWith(norm(x.name)) && norm(x.name).length >= 4) || (/\bgds\b/i.test(d.name) && /\bgds\b/i.test(x.name))));
  if (o) { claimed.add(o.id); twinPairs.push({ doc: d, exam: o }); if (o.category !== d.cat) updates.push({ id: o.id, name: o.name, ut: d.ut, from: o.category, to: d.cat, twin: d.name }); }
  else missing.push(d);
}
const leftover = exams.filter((e) => !claimed.has(e.id));
// A leftover that repeats a doc row's exact UT+name is a duplicate exam: it takes
// that row's category so it isn't stranded in a shared/legacy one (never deleted).
const duplicates = [];
for (const e of leftover) {
  const d = docRows.find((x) => norm(x.ut) === norm(regionName[e.region_id]) && norm(x.name) === norm(e.name));
  if (d) { duplicates.push({ ut: d.ut, name: e.name }); if (e.category !== d.cat) updates.push({ id: e.id, name: e.name, ut: d.ut, from: e.category, to: d.cat, duplicate: true }); }
}

const catCounts = {}; docRows.forEach((d) => { catCounts[d.cat] = (catCounts[d.cat] || 0) + 1; });
const utCategoryNames = Object.keys(catCounts).sort((a, b) => a.localeCompare(b));
const existingCats = new Set((await fetchAll('lc_exam_categories', 'name')).map((c) => c.name));
const toCreate = utCategoryNames.filter((n) => !existingCats.has(n));
const suffixed = utCategoryNames.filter((n) => n.endsWith(' (UT)'));

console.log(`Doc rows ${docRows.length} | DB UT exams ${exams.length} | exact matches ${claimed.size - twinPairs.length} | naming twins ${twinPairs.length} | already correct ${same} | recategorise ${updates.length} | to CREATE ${missing.length} | DB leftovers ${leftover.length}`);
console.log(`UT categories: ${utCategoryNames.length} | new: ${toCreate.length} | renamed-with-(UT): ${JSON.stringify(suffixed)}`);
console.log('\nNaming twins (kept as-is, recategorised):'); twinPairs.forEach((t) => console.log('  ', t.doc.ut, '|', t.doc.name, '<=>', t.exam.name));
console.log('\nMissing (will be created as draft):');
missing.forEach((d) => console.log('  ', d.ut, '|', d.cat, '|', d.body || '(no body in doc)', '|', d.name, findBody(d.body || 'SSC') ? '' : '  [body NOT FOUND -> would create]'));
console.log('\nDB leftovers (not in doc):'); leftover.forEach((e) => console.log('  ', regionName[e.region_id], '|', e.category, '|', e.name));
const flow = {}; updates.forEach((u) => { const k = `${u.from}  ->  ${u.to}`; flow[k] = (flow[k] || 0) + 1; });
console.log('\nRecategorise flows:', Object.keys(flow).length, '(top 30)');
Object.entries(flow).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(String(v).padStart(4), k));

// Legacy categories that will be unused and belong to no level list.
const inUseAfter = new Set(utCategoryNames);
exams.forEach((e) => { if (!updates.find((u) => u.id === e.id)) inUseAfter.add(e.category); });
const nonUtExams = await fetchAll('lc_exams', 'category,region:lc_regions(level)');
nonUtExams.filter((e) => e.region.level !== 'ut').forEach((e) => inUseAfter.add(e.category));
const retire = [...existingCats].filter((n) => !inUseAfter.has(n) && !centralNames.has(n) && !stateNames.has(n) && !utCategoryNames.includes(n));
console.log('\nLegacy categories to retire (unused, in no level list):', retire);

if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to write.'); process.exit(0); }

if (toCreate.length) {
  const { error } = await supabase.from('lc_exam_categories').insert(toCreate.map((name) => ({ name })));
  if (error) throw error;
  console.log('created categories:', toCreate.length);
}
for (const d of missing) {
  const region = utRegion[norm(d.ut)];
  let body = findBody(d.body);
  if (!body && d.body) {
    const { data, error } = await supabase.from('lc_conducting_bodies').insert({ name: d.body, website: d.website || null }).select('id,name').single();
    if (error) { console.error('body create failed', d.body, error.message); continue; }
    body = data; bodies.push(body);
  }
  if (!region || !body) { console.error('cannot create (region/body missing):', d); continue; }
  const { error } = await supabase.from('lc_exams').insert({ name: d.name, category: d.cat, conducting_body_id: body.id, region_id: region.id, website: d.website || null, status: 'draft' });
  console.log(error ? 'create failed: ' + error.message : `created draft: ${d.ut} | ${d.name}`);
}
let done = 0;
for (const u of updates) {
  const { error } = await supabase.from('lc_exams').update({ category: u.to }).eq('id', u.id);
  if (error) console.error('FAILED', u, error.message); else done++;
}
console.log(`recategorised ${done}/${updates.length}`);
// Re-check usage against the live table before deleting anything.
for (const name of retire) {
  const { count } = await supabase.from('lc_exams').select('id', { count: 'exact', head: true }).eq('category', name);
  if (count === 0) {
    const { error } = await supabase.from('lc_exam_categories').delete().eq('name', name);
    console.log(error ? `could not delete "${name}": ${error.message}` : `deleted unused category "${name}"`);
  } else console.log(`kept "${name}" -- still used by ${count}`);
}
fs.writeFileSync('src/lib/utExamCategories.js', `/**
 * The UT category list -- taken from the content team's UT Exams List doc
 * (see scripts/exam-mapping/retag_ut_exams.mjs). Offered in the exam editor's
 * Category dropdown when Level is UT. Never shares a name with the Central or
 * State lists: a doc name that would collide carries a " (UT)" suffix. Names
 * must match lc_exam_categories.name exactly. Regenerate by re-running that
 * script.
 */
export const UT_EXAM_CATEGORIES = ${JSON.stringify(utCategoryNames, null, 2)};
`);
console.log('wrote src/lib/utExamCategories.js');
