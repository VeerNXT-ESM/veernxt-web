#!/usr/bin/env node
/**
 * scripts/exam-mapping/retag_central_exams.mjs
 *
 * Re-tags every Central-level lc_exams row to exactly one of the content
 * team's own Central Exams List categories (the docx's 21 headings), and
 * creates the categories that list has but lc_exam_categories doesn't
 * (UGC NET, Civil Services, Engineering Recruitment, India Post, BARC, ICAR
 * IARI, NIC, Accounting & Commerce, PSU Maharatna, PSU Navratna).
 *
 * Assignment order per exam:
 *   1. lc_exams.category_detail -- the raw doc heading normalize_exam_categories
 *      preserved (present on ~all rows that came from the doc).
 *   2. Otherwise the doc row(s) with the same normalized exam name; if the
 *      name repeats under different categories, conducting-body word
 *      overlap breaks the tie. Anything still ambiguous is reported and left
 *      untouched -- never guessed.
 *
 * Usage:
 *   node scripts/exam-mapping/retag_central_exams.mjs <docRows.json>            # dry run
 *   node scripts/exam-mapping/retag_central_exams.mjs <docRows.json> --execute  # writes
 * <docRows.json> = the docx's table as [[srNo, category, body, exam, website, head], ...]
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

// doc heading (normalized) -> category name in lc_exam_categories
const DOC_TO_CATEGORY = {
  'ssc': 'SSC',
  'banking': 'Banking',
  'teaching': 'Teaching & Education',
  'indian railways': 'Railways',
  'university grants commission national eligibility test': 'UGC NET',
  'nursing': 'Nursing',
  'civil services': 'Civil Services',
  'engineering recruitment': 'Engineering Recruitment',
  'defence exams': 'Defence',
  'judiciary exams': 'Judiciary & Legal Services',
  'insurance exams': 'Insurance',
  'other government exams': 'Other Government Exams',
  'india post': 'India Post',
  'bhabha atomic research centre barc': 'BARC',
  'icar iari': 'ICAR IARI',
  'national informatics centre nic': 'NIC',
  'accounting commerce': 'Accounting & Commerce',
  'police exams': 'Police',
  'public sector undertaking maharatna': 'PSU Maharatna',
  'public sector undertaking navratna': 'PSU Navratna',
  'metro rail': 'Metro Rail',
};
const NEW_CATEGORIES = ['UGC NET', 'Civil Services', 'Engineering Recruitment', 'India Post', 'BARC', 'ICAR IARI', 'NIC', 'Accounting & Commerce', 'PSU Maharatna', 'PSU Navratna'];
// Old merged PSU bucket is split into Maharatna/Navratna per the doc; dropped once unused.
const RETIRED_CATEGORY = 'Public Sector Undertakings (PSU)';

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

const rawRows = JSON.parse(fs.readFileSync(docPath, 'utf-8')).slice(1);
const docRows = rawRows
  .map((r) => ({ cat: clean(r[1]), body: clean(r[2]), name: clean(r[3]) }))
  .filter((r) => r.name && DOC_TO_CATEGORY[norm(r.cat)]);
const unknownHeadings = new Set(rawRows.filter((r) => clean(r[3]) && !DOC_TO_CATEGORY[norm(r[1])]).map((r) => clean(r[1])));
if (unknownHeadings.size) console.log('!! doc headings with no mapping:', [...unknownHeadings]);

const docByName = new Map();
for (const r of docRows) {
  const k = norm(r.name);
  if (!docByName.has(k)) docByName.set(k, []);
  docByName.get(k).push({ ...r, target: DOC_TO_CATEGORY[norm(r.cat)] });
}

const exams = await fetchAll('lc_exams', 'id,name,category,category_detail,conducting_body_id,region:lc_regions(level)');
const bodies = Object.fromEntries((await fetchAll('lc_conducting_bodies', 'id,name')).map((b) => [b.id, b.name]));
const central = exams.filter((e) => e.region?.level === 'central');

const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const overlap = (a, b) => { const B = words(b); let n = 0; for (const w of words(a)) if (B.has(w)) n++; return n; };

const changes = []; const unchanged = []; const unresolved = []; const conflicts = [];
for (const e of central) {
  let target = null;
  const detailKey = norm(e.category_detail);
  if (detailKey && DOC_TO_CATEGORY[detailKey]) target = DOC_TO_CATEGORY[detailKey];

  const cands = docByName.get(norm(e.name)) || [];
  let docTarget = null;
  if (cands.length) {
    const targets = [...new Set(cands.map((c) => c.target))];
    if (targets.length === 1) docTarget = targets[0];
    else {
      const scored = cands.map((c) => ({ c, s: overlap(c.body, bodies[e.conducting_body_id]) })).sort((a, b) => b.s - a.s);
      if (scored[0].s > 0 && scored[0].s > scored[1].s) docTarget = scored[0].c.target;
    }
  }
  if (!target && docTarget) target = docTarget;
  if (target && docTarget && target !== docTarget) conflicts.push({ name: e.name, body: bodies[e.conducting_body_id], detail: target, doc: docTarget, current: e.category });
  if (!target) { unresolved.push({ id: e.id, name: e.name, body: bodies[e.conducting_body_id], current: e.category, detail: e.category_detail }); continue; }
  if (target === e.category) unchanged.push(e); else changes.push({ id: e.id, name: e.name, from: e.category, to: target });
}

const tally = {};
for (const c of changes) { const k = `${c.from}  ->  ${c.to}`; tally[k] = (tally[k] || 0) + 1; }
console.log(`Central exams: ${central.length} | already right: ${unchanged.length} | to change: ${changes.length} | unresolved: ${unresolved.length} | detail/doc conflicts: ${conflicts.length}`);
console.log('\nChanges (from -> to):');
Object.entries(tally).sort().forEach(([k, v]) => console.log(String(v).padStart(4), k));
if (conflicts.length) { console.log('\nCONFLICTS (category_detail says X, doc name-match says Y; detail wins):'); conflicts.forEach((c) => console.log('  ', JSON.stringify(c))); }
if (unresolved.length) { console.log('\nUNRESOLVED (left untouched):'); unresolved.forEach((u) => console.log('  ', JSON.stringify(u))); }

if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to write.'); process.exit(0); }

const existing = new Set((await fetchAll('lc_exam_categories', 'name')).map((c) => c.name));
const toCreate = NEW_CATEGORIES.filter((n) => !existing.has(n));
if (toCreate.length) {
  const { error } = await supabase.from('lc_exam_categories').insert(toCreate.map((name) => ({ name })));
  if (error) throw error;
  console.log('created categories:', toCreate);
}
let done = 0;
for (const c of changes) {
  const { error } = await supabase.from('lc_exams').update({ category: c.to }).eq('id', c.id);
  if (error) { console.error('FAILED', c, error.message); continue; }
  done++;
}
console.log(`updated ${done}/${changes.length} exams`);
const { count } = await supabase.from('lc_exams').select('id', { count: 'exact', head: true }).eq('category', RETIRED_CATEGORY);
if (count === 0) {
  const { error } = await supabase.from('lc_exam_categories').delete().eq('name', RETIRED_CATEGORY);
  console.log(error ? 'could not delete retired category: ' + error.message : `deleted now-unused category "${RETIRED_CATEGORY}"`);
} else console.log(`kept "${RETIRED_CATEGORY}" -- still used by ${count} exam(s)`);
