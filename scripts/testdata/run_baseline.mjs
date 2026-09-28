/**
 * Phase 2 baseline: run every persona (both variants) through the REAL
 * /api/profile/recommend handler and record what the engine does today.
 *
 * READ-ONLY: requests carry no Authorization header, so the handler never writes
 * user_profiles or awards points; the only DB access is its own exams SELECT.
 *
 * Output: test-data/baseline/results.json  (consumed by make_baseline_xlsx.py)
 * Usage:  node scripts/testdata/run_baseline.mjs
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import handler from '../../api/profile/recommend.js';
import { normalizeState, mapQual, QUAL_RANK } from '../../backend/engine/eligibility.js';
import { resolveTradeTracks, TRADE_MAP } from '../../backend/engine/tradeMap.js';
import { PREF_MAP } from '../../backend/engine/preferenceMap.js';

const here = dirname(fileURLToPath(import.meta.url));
const personaDir = resolve(here, '../../test-data/personas');
const outDir = resolve(here, '../../test-data/baseline');
mkdirSync(outDir, { recursive: true });

const personas = ['survey_personas.json', 'synthetic_personas.json']
  .flatMap((f) => JSON.parse(readFileSync(resolve(personaDir, f), 'utf8')));

// --- The whole exam pool, for "what was available" metrics --------------------------------
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const pool = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('exams').select('exam_id,exam_name,conducting_body,career_track,state_ut,metadata').range(from, from + 999);
  if (error) throw error;
  pool.push(...data);
  if (data.length < 1000) break;
}
const engineVocab = new Set([
  ...Object.values(PREF_MAP).flat(),
  ...Object.values(TRADE_MAP).flatMap((v) => [...v.strong, ...v.soft]),
  'POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'ENGINEERING', 'PSU',
]);
const isPolice = (e) => /police|constable/i.test(`${e.exam_name} ${e.career_track}`);
const QUAL_DB_RANK = { '10': 1, '12': 2, graduate: 3, post_graduate: 4 };

// --- Call the real handler ----------------------------------------------------------------
async function callEngine(profile, topN) {
  const realLog = console.log;
  console.log = () => {};
  try {
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ method: 'POST', body: profile, query: { topN: String(topN) }, headers: {} }, res);
    return { code: res.code, body: res.body };
  } finally {
    console.log = realLog;
  }
}

function analyse(profile, body, body50) {
  const recs = body.recommendations || [];
  const userRank = QUAL_RANK[mapQual(profile.highestQualification)] || 0;
  const userState = normalizeState(profile.stateOfDomicile);
  const violations = [];
  let qualUnverifiable = 0;

  for (const r of recs) {
    const f = r.eligibilityFlags || {};
    const need = QUAL_DB_RANK[f.min_qualification] || 0;
    if (!f.min_qualification) qualUnverifiable += 1;
    if (need && need > userRank) violations.push(`qualification: #${r.rank} ${r.exam_name} needs ${f.min_qualification}`);
    if (f.domicile_required && r.state_ut && normalizeState(r.state_ut) !== userState && profile.relocation !== 'Anywhere in India') {
      violations.push(`domicile: #${r.rank} ${r.exam_name} is ${r.state_ut}-only`);
    }
    if (f.physical_required && profile.medicalCategory && profile.medicalCategory !== 'SHAPE-1') {
      violations.push(`physical: #${r.rank} ${r.exam_name} needs SHAPE-1, user ${profile.medicalCategory}`);
    }
    if (f.physical_required && profile.physicalProficiency === 'Satisfactory' && ['POLICE_CAPF', 'DEFENCE'].includes(r.career_track)) {
      violations.push(`proficiency: #${r.rank} ${r.exam_name}`);
    }
  }

  const traceInputs = [profile.armCorpsTrade, profile.roleAppointment, ...(profile.specificSkills || [])].filter(Boolean).join(' ');
  const tracks = resolveTradeTracks(traceInputs, profile.specificSkills);
  const strongPool = pool.filter((e) => tracks.strong.includes(e.career_track)).length;
  const homePolice = pool.filter((e) => isPolice(e) && normalizeState(e.state_ut) === userState);
  const top50 = body50?.recommendations || [];
  const homePoliceIds = new Set(homePolice.map((e) => e.exam_id));
  const bestHomePoliceRank = top50.find((r) => homePoliceIds.has(r.exam_id))?.rank ?? null;
  const scores = recs.map((r) => r.score);
  const keys = (r) => Object.keys(r.breakdown || {});

  return {
    recCount: recs.length,
    totalEligible: body.totalEligible,
    totalRejected: body.totalRejected,
    overallScore: body.summary?.overall_match_score ?? null,
    skillGaps: (body.skillGaps || []).map((g) => `${g.label} (${g.blockedCount})`),
    violations,
    qualUnverifiable,
    recognisedTrack: recs.filter((r) => engineVocab.has(r.career_track)).length,
    withPrefPoints: recs.filter((r) => keys(r).some((k) => k.startsWith('preference_'))).length,
    withTradeMatch: recs.filter((r) => keys(r).some((k) => k.startsWith('trade_'))).length,
    withDomicileHome: recs.filter((r) => keys(r).includes('domicile_home')).length,
    atScoreCap: recs.filter((r) => r.score >= 100).length,
    distinctScores: new Set(scores).size,
    scoreMax: scores.length ? Math.max(...scores) : null,
    scoreMin: scores.length ? Math.min(...scores) : null,
    levelMix: recs.reduce((m, r) => { const k = r.level || 'unknown'; m[k] = (m[k] || 0) + 1; return m; }, {}),
    distinctTracks: new Set(recs.map((r) => r.career_track)).size,
    engineStrongTracks: tracks.strong,
    engineSoftTracks: tracks.soft,
    strongTrackExamsInPool: strongPool,
    homeStateExamsInPool: pool.filter((e) => normalizeState(e.state_ut) === userState).length,
    homeStatePoliceInPool: homePolice.length,
    bestHomeStatePoliceRank: bestHomePoliceRank,
    homeStatePoliceInTop10: recs.filter((r) => homePoliceIds.has(r.exam_id)).length,
  };
}

const results = [];
let httpErrors = 0;
for (const p of personas) {
  for (const variant of ['profile_survey', 'profile_app']) {
    const profile = p[variant];
    const r10 = await callEngine(profile, 10);
    const r50 = await callEngine(profile, 50);
    if (r10.code !== 200 || !r10.body?.ok) {
      httpErrors += 1;
      results.push({ id: p.id, variant, source: p.source, purpose: p.purpose || null, error: r10.body?.error || r10.body?.errors || `HTTP ${r10.code}` });
      continue;
    }
    results.push({
      id: p.id, variant, source: p.source, purpose: p.purpose || null, slug: p.slug || null,
      profile: {
        category: profile.category, state: profile.stateOfDomicile, qualification: profile.highestQualification,
        arm: profile.armCorpsTrade, role: profile.roleAppointment, branch: profile.serviceBranch,
        preferences: profile.careerPreferences, relocation: profile.relocation, medical: profile.medicalCategory,
        proficiency: profile.physicalProficiency, ncc: profile.nccCertification, sports: profile.sportsAchievement,
        english: profile.englishComfort, math: profile.mathInClass12, character: profile.characterOnDischarge,
        skills: profile.specificSkills, disability: profile.disabilityStatus,
      },
      metrics: analyse(profile, r10.body, r50.body),
      top10: r10.body.recommendations.map((x) => ({
        rank: x.rank, exam_id: x.exam_id, exam: x.exam_name, body: x.conducting_body, level: x.level, state: x.state_ut,
        track: x.career_track, score: x.score, breakdown: x.breakdown, min_qualification: x.eligibilityFlags?.min_qualification ?? null,
        physical_required: x.eligibilityFlags?.physical_required ?? null,
      })),
      top50ExamIds: r50.body.recommendations.map((x) => x.exam_id),
    });
  }
}

// Determinism: same input twice -> identical top 10
let nondeterministic = 0;
for (const p of personas.slice(0, 8)) {
  const a = await callEngine(p.profile_survey, 10);
  const b = await callEngine(p.profile_survey, 10);
  if (JSON.stringify(a.body.recommendations) !== JSON.stringify(b.body.recommendations)) nondeterministic += 1;
}

const meta = {
  ranAt: new Date().toISOString(), personas: personas.length, calls: results.length, httpErrors, nondeterministic,
  examPool: pool.length, engineVocabSize: engineVocab.size,
  poolWithRecognisedTrack: pool.filter((e) => engineVocab.has(e.career_track)).length,
  poolMissingMinQualification: pool.filter((e) => !e.metadata?.min_qualification).length,
  poolMissingPhysicalFlag: pool.filter((e) => e.metadata?.physical_required === undefined).length,
  poolTrackCounts: Object.entries(pool.reduce((m, e) => { m[e.career_track] = (m[e.career_track] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]),
};
writeFileSync(resolve(outDir, 'results.json'), JSON.stringify({ meta, results }, null, 1));
console.log(`done: ${results.length} runs, ${httpErrors} errors, nondeterministic=${nondeterministic}`);
console.log(meta);
