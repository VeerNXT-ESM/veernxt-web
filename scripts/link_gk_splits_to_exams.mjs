#!/usr/bin/env node
/**
 * scripts/link_gk_splits_to_exams.mjs
 *
 * Adds the 7 SSC-GK subject splits (GK Biology/Chemistry/Economics/Geography/History/
 * Physics/Polity, Precis) to every exam that currently holds the combined GK Precis,
 * unless that exam has its own state/UT-specific GK book in Precis. Only exams at the levels given by --levels=central,state,ut (default central) are touched. The combined book's link is
 * KEPT (it can be delinked later once the content team agrees). Links only -- no rows
 * in `resources` change.
 *
 * "Combined GK Precis" = a Precis resource titled GS & GK / GENERAL KNOWLEDGE /
 * 2026 GK-GS / SSC COMPLETE GK.
 * "State/UT-specific GK book" = a Precis resource whose title or source file is
 * one of the state/UT GS books (STATE_GS below, from the MASTER DOCUMENTS list).
 *
 * Dry run by default (writes an xlsx-free summary + a JSON plan). --execute upserts the
 * links (onConflict exam_id,resource_id, ignoreDuplicates), saves the inserted (exam,
 * resource) pairs to a backup for rollback, then verifies through the ANON key.
 *
 * Usage: node scripts/link_gk_splits_to_exams.mjs [--execute]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const EXECUTE = process.argv.includes('--execute');
const LEVELS = (process.argv.find((a) => a.startsWith('--levels=')) || '--levels=central').split('=')[1].split(',');
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sb = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY);
const BACKUP_ROOT = process.env.DB_BACKUP_ROOT || String.raw`K:\tmp\db_backups`;

const SPLIT_IDS = {
  biology: '4d91ed46-0c77-4767-b5fd-dc4e8ec3609f',
  chemistry: '403bf624-0abe-44f0-a3cd-e41a8ee33722',
  economics: '53b5a406-eea4-4a6a-80eb-40039334911e',
  geography: 'a76e58c1-521d-434f-91ca-a1f4c7631469',
  history: 'b2500197-f17a-4d4c-9860-2d81f8551a2b',
  physics: '870ffdb1-0bc2-49c4-b3d6-7131f2da6ead',
  polity: 'c7fd0e2a-188b-47ae-a3fe-635138735ce7',
};
const COMBINED_TITLES = ['gs & gk', 'general knowledge', '2026 gk-gs', 'ssc complete gk'];
const STATE_GS = new Set(['assamgs', 'jharkhandgs', 'bihargs', 'manipurgs', 'maharshtrags', 'maharashtrags', 'himachalpradeshconstable', 'goags', 'gujaratgs', 'mizoramgs', 'arunachalpradeshsi', 'karnatakaconstable', 'wbpolicesi', 'haryanags', 'rajasthansigsguide', 'rajasthangs', 'telanganaconstable', 'meghalayags', 'punjabsiguidebook', 'punjabgs', 'chhattisgarhsi', 'uttarakhandconstable', 'uttarakhandgs', 'andhrapradeshconstable', 'odishaconstable', 'odishags', 'tripuraconstable', 'tripurags', 'keralaconstable', 'keralags', 'madhyapradeshgs', 'tamilnaduconstable', 'tamilnadugs', 'andamannicobargs', 'chandigarhgs', 'lakshadweepgs', 'delhigs', 'jammukashmirgs', 'ladakhgs', 'puducherrygs', 'dadranagarhavelidamandiugs', 'himachalpradeshgs', 'karnatakags', 'andhrapradeshgs', 'chhattisgarhgs', 'jkgksi', 'jkgkconstable', 'gujaratconstable', 'haryanaconstable', 'arunachalpradeshconstable', 'jkgs', 'westbengalgs']);
const norm = (s) => String(s || '').toLowerCase().replace(/^cluster_\d+_/, '').replace(/\.docx$/, '').replace(/ ?\(\d+\)$/, '').replace(/[^a-z0-9]/g, '').replace(/(book|guide)$/, '');
const isStateBook = (r) => STATE_GS.has(norm(r.title)) || STATE_GS.has(norm((r.source_file || '').replace(/^.*[\\/]/, '')));
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

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

const resources = await all(() => sb.from('resources').select('resource_id,title,category,status,format,source_file').in('category', ['Guide', 'Precis']));
const byId = new Map(resources.map((r) => [r.resource_id, r]));
const links = await all(() => sb.from('lc_exam_resource_map').select('exam_id,resource_id,category').in('category', ['Guide', 'Precis']));
const exams = await all(() => sb.from('lc_exams').select('id,name,status,region_id'));
const regions = await all(() => sb.from('lc_regions').select('id,level,name'));
const regionOf = new Map(regions.map((r) => [r.id, r]));
const examOf = new Map(exams.map((e) => [e.id, e]));

const perExam = new Map(); // exam -> { combined, state, resIds:Set }
for (const l of links) {
  const r = byId.get(l.resource_id);
  if (!r) continue;
  if (!perExam.has(l.exam_id)) perExam.set(l.exam_id, { combined: false, state: false, ids: new Set() });
  const o = perExam.get(l.exam_id);
  o.ids.add(l.resource_id);
  if (r.category === 'Precis' && COMBINED_TITLES.includes(r.title.trim().toLowerCase())) o.combined = true;
  if (r.category === 'Precis' && isStateBook(r)) o.state = true;
}

const stats = { withCombined: 0, skippedStateSpecific: 0, eligible: 0, alreadyHadAllSplits: 0 };
const byLevel = {};
const plan = []; // {exam_id, resource_id}
const skipped = [];
for (const [examId, o] of perExam) {
  if (!o.combined) continue;
  const lvl = regionOf.get(examOf.get(examId)?.region_id)?.level || '?';
  if (!LEVELS.includes(lvl)) { byLevel[`${lvl}: not in --levels (left for later)`] = (byLevel[`${lvl}: not in --levels (left for later)`] || 0) + 1; continue; }
  stats.withCombined++;
  if (o.state) { stats.skippedStateSpecific++; skipped.push({ examId, name: examOf.get(examId)?.name, lvl }); byLevel[`${lvl}: has own state GK (skipped)`] = (byLevel[`${lvl}: has own state GK (skipped)`] || 0) + 1; continue; }
  stats.eligible++;
  byLevel[`${lvl}: gets splits`] = (byLevel[`${lvl}: gets splits`] || 0) + 1;
  const missing = Object.values(SPLIT_IDS).filter((id) => !o.ids.has(id));
  if (!missing.length) { stats.alreadyHadAllSplits++; continue; }
  for (const id of missing) plan.push({ exam_id: examId, resource_id: id });
}

console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(stats);
console.log('by level:', byLevel);
console.log(`Links to add: ${plan.length} (${new Set(plan.map((p) => p.exam_id)).size} exams x up to 7 splits)`);
console.log('Sample skipped (own state/UT GK book):', skipped.slice(0, 8).map((s) => `${s.name} [${s.lvl}]`));
const unpub = exams.filter((e) => plan.some((p) => p.exam_id === e.id) && String(e.status).toLowerCase() !== 'published').length;
console.log(`Target exams that are not published: ${unpub}`);

const outDir = process.env.TEMP || '.';
fs.writeFileSync(path.join(outDir, 'gk_splits_link_plan.json'), JSON.stringify({ stats, byLevel, plan }, null, 1));

if (!EXECUTE) { console.log('\nDry run only -- re-run with --execute.'); process.exit(0); }

const dir = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'gk_splits_links_added.json'), JSON.stringify(plan, null, 1));
console.log(`[backup / rollback list] ${dir}`);
const rows = plan.map((p) => ({ ...p, category: 'Precis', confidence: 'high', reasoning: 'GK subject split assigned alongside the combined GK book', source: 'manual' }));
for (const c of chunks(rows, 500)) {
  const { error } = await sb.from('lc_exam_resource_map').upsert(c, { onConflict: 'exam_id,resource_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
console.log(`[DB] upserted ${rows.length} links`);

let seen = 0;
const sample = [...new Set(plan.map((p) => p.exam_id))].slice(0, 25);
for (const c of chunks(sample, 5)) {
  const { data } = await anon.from('lc_exam_resource_map').select('resource_id').in('exam_id', c).in('resource_id', Object.values(SPLIT_IDS));
  seen += (data || []).length;
}
const { data: vis } = await anon.from('resources').select('resource_id').in('resource_id', Object.values(SPLIT_IDS));
console.log(`[verify via anon] split resources visible: ${vis?.length}/7 | split links visible on 25 sample exams: ${seen} (expect ${sample.length * 7})`);
