#!/usr/bin/env node
/**
 * scripts/exam-mapping/sync_central_to_doc.mjs
 *
 * Makes the Central level of lc_exams match the content team's Central Exams
 * List docx exactly: same exams, each in the doc's category, under the doc's
 * conducting body. Follows retag_central_exams.mjs (which already fixed the
 * category names); this pass handles what's left:
 *   - doc rows with no Central exam            -> CREATE (status 'draft')
 *   - Central exams not in the doc             -> reported as EXTRA, never deleted
 *
 * Conducting bodies of already-matched exams are deliberately NOT rewritten:
 * the DB stores acronyms (SSC, RBI, UPSC) where the doc spells names out, and
 * repeated names ("Staff Nurse") can't be paired to a specific row safely --
 * Nursing was confirmed correct by the content team as-is.
 *
 * Matching: each doc row claims at most one Central exam, same target
 * category + same normalized exam name, conducting-body word overlap
 * preferred. Nothing is guessed across categories.
 *
 * Usage:
 *   node scripts/exam-mapping/sync_central_to_doc.mjs <docRows.json>            # dry run
 *   node scripts/exam-mapping/sync_central_to_doc.mjs <docRows.json> --execute  # writes
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

const DOC_TO_CATEGORY = {
  'ssc': 'SSC', 'banking': 'Banking', 'teaching': 'Teaching & Education', 'indian railways': 'Railways',
  'university grants commission national eligibility test': 'UGC NET', 'nursing': 'Nursing',
  'civil services': 'Civil Services', 'engineering recruitment': 'Engineering Recruitment',
  'defence exams': 'Defence', 'judiciary exams': 'Judiciary & Legal Services', 'insurance exams': 'Insurance',
  'other government exams': 'Other Government Exams', 'india post': 'India Post',
  'bhabha atomic research centre barc': 'BARC', 'icar iari': 'ICAR IARI', 'national informatics centre nic': 'NIC',
  'accounting commerce': 'Accounting & Commerce', 'police exams': 'Police',
  'public sector undertaking maharatna': 'PSU Maharatna', 'public sector undertaking navratna': 'PSU Navratna',
  'metro rail': 'Metro Rail',
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

const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
const overlap = (a, b) => { const B = words(b); let n = 0; for (const w of words(a)) if (B.has(w)) n++; return n; };

const docRows = JSON.parse(fs.readFileSync(docPath, 'utf-8')).slice(1)
  .map((r) => ({ cat: clean(r[1]), body: clean(r[2]), name: stripNumbering(r[3]), website: clean(r[4]) }))
  .filter((r) => r.name && DOC_TO_CATEGORY[norm(r.cat)])
  .map((r) => ({ ...r, target: DOC_TO_CATEGORY[norm(r.cat)] }));

const regions = await fetchAll('lc_regions', 'id,name,level');
const centralRegion = regions.find((r) => r.level === 'central');
const bodies = await fetchAll('lc_conducting_bodies', 'id,name,website');
const bodyById = Object.fromEntries(bodies.map((b) => [b.id, b]));
const exams = (await fetchAll('lc_exams', 'id,name,category,status,conducting_body_id,website,region_id'))
  .filter((e) => e.region_id === centralRegion.id);

// Best existing body for a doc body name: exact normalized name, else most word overlap (>=2 words or full match of a short name).
const findBody = (docBody) => {
  const n = norm(docBody);
  const exact = bodies.find((b) => norm(b.name) === n);
  if (exact) return exact;
  const scored = bodies.map((b) => ({ b, s: overlap(docBody, b.name) })).sort((x, y) => y.s - x.s);
  const need = Math.min(2, words(docBody).size);
  return scored[0] && scored[0].s >= need && scored[0].s > (scored[1]?.s ?? 0) ? scored[0].b : null;
};

const claimed = new Set();
const creates = []; let matched = 0;
for (const d of docRows) {
  const cands = exams.filter((e) => !claimed.has(e.id) && e.category === d.target && norm(e.name) === norm(d.name));
  if (!cands.length) { creates.push(d); continue; }
  cands.sort((a, b) => overlap(d.body, bodyById[b.conducting_body_id]?.name) - overlap(d.body, bodyById[a.conducting_body_id]?.name));
  claimed.add(cands[0].id); matched++;
}
const extras = exams.filter((e) => !claimed.has(e.id));

console.log(`Doc rows: ${docRows.length} | matched: ${matched} | to CREATE: ${creates.length} | Central exams NOT in doc: ${extras.length}`);
const cc = {}; creates.forEach((c) => { const k = `${c.target} / ${c.body}`; cc[k] = (cc[k] || 0) + 1; });
console.log('\nTO CREATE (category / doc body : count)'); Object.entries(cc).sort().forEach(([k, v]) => console.log(String(v).padStart(3), k));
console.log('\nEXTRA Central exams not in doc:'); extras.forEach((e) => console.log('  ', e.category, '|', bodyById[e.conducting_body_id]?.name, '|', e.name, '|', e.status));
console.log('\nBODY each new exam will use:');
creates.forEach((c) => console.log('  ', `${c.target} | ${c.name}  ->  ${findBody(c.body)?.name ?? '(create) ' + c.body}   [doc: ${c.body}]`));

const newBodies = [...new Set(creates.map((c) => c.body).filter((b) => !findBody(b)))];
console.log('\nConducting bodies to CREATE for new exams:', newBodies);

if (!EXECUTE) { console.log('\nDRY RUN -- pass --execute to write.'); process.exit(0); }

const bodyIdFor = {};
for (const name of new Set(creates.map((c) => c.body))) {
  let b = findBody(name);
  if (!b) {
    const site = docRows.find((r) => r.body === name)?.website || null;
    const { data, error } = await supabase.from('lc_conducting_bodies').insert({ name, website: site }).select('id,name,website').single();
    if (error) { console.error('body create failed', name, error.message); continue; }
    b = data; bodies.push(b);
  }
  bodyIdFor[name] = b.id;
}
let made = 0;
for (const c of creates) {
  if (!bodyIdFor[c.body]) continue;
  const { error } = await supabase.from('lc_exams').insert({
    name: c.name, category: c.target, conducting_body_id: bodyIdFor[c.body], region_id: centralRegion.id,
    website: c.website || null, status: 'draft',
  });
  if (error) console.error('create failed', c.name, error.message); else made++;
}
console.log(`created ${made}/${creates.length} exams`);
