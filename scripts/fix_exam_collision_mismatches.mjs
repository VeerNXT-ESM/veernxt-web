#!/usr/bin/env node
/**
 * scripts/fix_exam_collision_mismatches.mjs
 *
 * Fixes a real data bug in scripts/rebuild_exams_from_datamap.mjs: that
 * script matched each exam_master_datamap.json entry to an lc_exams row by
 * normalized name ONLY, picking the first available candidate whenever
 * several lc_exams rows shared a name (e.g. "Staff Nurse" appears 20 times,
 * once per state/UT health department). 392 of 1,534 exams (25%) share a
 * name with at least one sibling, and for those the greedy first-match
 * could -- and demonstrably did (verified: Delhi's "Pharmacist" ended up
 * with state_ut="Andaman and Nicobar Islands") -- attach the wrong
 * datamap entry's region/syllabus data to the wrong exam.
 *
 * This re-matches ONLY the 392 at-risk exams, using conducting-body token
 * similarity (generic institutional words stripped, same approach as
 * scripts/match_jobs_to_lc_exams.mjs) plus an exact level/state check
 * against the real lc_exams region -- both signals are available on every
 * datamap entry and weren't used the first time. Exams with a unique name
 * are already correct and untouched.
 *
 * Updates in place (same exam_id/lc_exams.id, just corrects the
 * datamap-derived fields: exam_name, state_ut, is_state_specific,
 * career_track, subject_requirements, logo_path, content_completeness,
 * base_url, metadata). conducting_body_id/region_id come from lc_exams
 * itself and were never wrong.
 *
 * Usage:
 *   node scripts/fix_exam_collision_mismatches.mjs            # dry run
 *   node scripts/fix_exam_collision_mismatches.mjs --execute  # writes
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const EXECUTE = process.argv.includes('--execute');
const DATAMAP_PATH = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\1. EXAM LIST\\exam_master_datamap.json';

function normalize(name) {
  return name.replace(/^\s*\d+\.\s*/, '').toLowerCase().replace(/[()&,'".]/g, '').replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set(['of', 'the', 'and', 'for', '&']);
const BODY_GENERIC_WORDS = new Set(['staff', 'selection', 'board', 'commission', 'public', 'service', 'services', 'department', 'authority', 'corporation', 'limited', 'ltd', 'india', 'state', 'union', 'government', 'office', 'directorate', 'health', 'medical', 'education']);
function bodyTokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[()&,'".:/-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !BODY_GENERIC_WORDS.has(t));
}
function overlapSim(aTok, bTok) {
  if (!aTok.length || !bTok.length) return 0;
  const setA = new Set(aTok);
  const setB = new Set(bTok);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / Math.min(setA.size, setB.size);
}

async function fetchAll(supabase, table, columns) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const datamap = JSON.parse(fs.readFileSync(DATAMAP_PATH, 'utf-8'));
  const lcExams = await fetchAll(supabase, 'lc_exams', 'id,name,conducting_body_id,region_id,conducting_body:lc_conducting_bodies(name),region:lc_regions(name,level)');

  // Group both sides by normalized name.
  const lcGroups = new Map();
  for (const e of lcExams) {
    const n = normalize(e.name);
    if (!lcGroups.has(n)) lcGroups.set(n, []);
    lcGroups.get(n).push(e);
  }
  const datamapGroups = new Map();
  for (const d of datamap) {
    const n = normalize(d.exam_name);
    if (!datamapGroups.has(n)) datamapGroups.set(n, []);
    datamapGroups.get(n).push(d);
  }

  const collisionNames = [...lcGroups.entries()].filter(([, g]) => g.length > 1).map(([n]) => n);
  console.log(`Collision groups: ${collisionNames.length}, covering ${collisionNames.reduce((s, n) => s + lcGroups.get(n).length, 0)} lc_exams rows`);

  const updates = [];
  const stillAmbiguous = [];
  const droppedNoDatamap = [];

  for (const name of collisionNames) {
    const lcCandidates = lcGroups.get(name);
    const dCandidates = datamapGroups.get(name) || [];
    const usedD = new Set();
    const usedLc = new Set();

    // Greedy best-score-first assignment within the collision group.
    const pairs = [];
    for (const lc of lcCandidates) {
      const lcBody = bodyTokens(lc.conducting_body?.name);
      for (const d of dCandidates) {
        const dBody = bodyTokens(d.conducting_body);
        const bodySim = overlapSim(lcBody, dBody);
        const regionMatch = lc.region?.level === d.level && (d.level === 'central' || (lc.region?.name || '').toLowerCase() === (d.state || '').toLowerCase());
        const score = bodySim + (regionMatch ? 1 : 0);
        pairs.push({ lc, d, score, bodySim, regionMatch });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    for (const p of pairs) {
      if (usedLc.has(p.lc.id) || usedD.has(p.d)) continue;
      if (p.score <= 0) continue; // no signal at all -- don't guess
      usedLc.add(p.lc.id);
      usedD.add(p.d);
      updates.push({ lc: p.lc, d: p.d, bodySim: p.bodySim, regionMatch: p.regionMatch });
    }
    for (const lc of lcCandidates) {
      if (!usedLc.has(lc.id)) stillAmbiguous.push(lc);
    }
  }

  console.log(`Resolved with real signal: ${updates.length}`);
  console.log(`Still ambiguous / no signal (left unmatched, not touched): ${stillAmbiguous.length}`);
  if (stillAmbiguous.length) console.log(stillAmbiguous.slice(0, 15).map((e) => `${e.name} [${e.conducting_body?.name}, ${e.region?.name}]`));

  console.log('\n--- Sample resolved ---');
  for (const u of updates.slice(0, 10)) {
    console.log(`  "${u.lc.name}" [${u.lc.conducting_body?.name}, ${u.lc.region?.name}]  <-  datamap "${u.d.exam_name}" [${u.d.conducting_body}, ${u.d.state || u.d.level}]  (bodySim=${u.bodySim.toFixed(2)}, regionMatch=${u.regionMatch})`);
  }

  if (!EXECUTE) {
    console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
    return;
  }

  console.log('\nWriting...');
  let written = 0;
  for (const u of updates) {
    const d = u.d;
    const metadata = { level: d.level, pwd_eligibility: d.pwd_eligibility || null, also_listed_as: d.also_listed_as || null };
    const { error } = await supabase.from('exams').update({
      exam_name: d.exam_name,
      career_track: (d.category || '').toUpperCase() || null,
      state_ut: d.level === 'central' ? null : d.state,
      is_state_specific: d.level !== 'central',
      subject_requirements: d.subject_requirements || null,
      logo_path: d.logo?.path || null,
      content_completeness: d.content_completeness || null,
      base_url: d.website || null,
      metadata,
    }).eq('exam_id', u.lc.id);
    if (error) { console.error(`FAILED ${u.lc.id}: ${error.message}`); continue; }
    written++;
  }
  console.log(`Done. Corrected ${written}/${updates.length} exams rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
