/**
 * test_first20.mjs
 * 
 * Runs the first 20 profiles from Profiler_Test_Input_2026-09-28.xlsx through
 * the recommendation engine locally (no HTTP / no Supabase — uses exam_master.json).
 * 
 * Usage:  node backend/engine/test_first20.mjs
 *         node backend/engine/test_first20.mjs --after   (uses updated engine files)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Import engine modules (resolved relative to this file) ────────────────────
import { checkEligibility, normalizeState } from './eligibility.js';
import { scoreExam }                        from './scoring.js';

// ── Load exam_master.json ─────────────────────────────────────────────────────
const examMasterPath = resolve(__dirname, 'data', 'exam_master.json');
const examMaster = JSON.parse(readFileSync(examMasterPath, 'utf-8'));
const ALL_EXAMS  = examMaster.exams;

// ── Load Excel ────────────────────────────────────────────────────────────────
const xlsxPath = resolve(__dirname, '../../Profiler_Test_Input_2026-09-28.xlsx');
const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets['Profiles - full survey data'];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert pipe-separated string → array; keep existing array as-is */
function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split('|').map(s => s.trim()).filter(Boolean);
}

/** Map Excel bool values ('TRUE'/'FALSE', true/false) → real boolean */
function toBool(v) {
  if (v === true || v === 'TRUE') return true;
  return false;
}

/** Pre-filter matching recommend.js fetchPreFilteredExams() */
const QUAL_RANK_MAP  = { 'Class 10': 1, 'Class 12': 2, 'Graduate': 3, 'Post-Graduate': 4 };
const QUAL_DB_RANK   = { '10': 1, '12': 2, 'graduate': 3, 'post_graduate': 4 };

function preFilter(profile, exams) {
  const userQualRank  = QUAL_RANK_MAP[profile.highestQualification] || 0;
  const isNonSHAPE1   = profile.medicalCategory && profile.medicalCategory !== 'SHAPE-1';
  const wantsAnyState = profile.relocation === 'Anywhere in India';
  const userState     = normalizeState(profile.stateOfDomicile || '');

  return exams.filter(exam => {
    const needRank = QUAL_DB_RANK[exam.min_qualification] || 0;
    if (needRank && userQualRank < needRank) return false;
    if (isNonSHAPE1 && exam.physical_required) return false;
    if (!wantsAnyState && exam.domicile_required && exam.state_ut) {
      const examState = normalizeState(exam.state_ut);
      if (examState && examState !== userState) return false;
    }
    return true;
  });
}

const PRIORITY_TRACKS = ['POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'ENGINEERING', 'PSU'];

function diversify(scored, topN = 10, capPerTrack = 4) {
  const out = [];
  const counts = {};
  for (const row of scored) {
    const t = row.exam.career_track;
    if ((counts[t] || 0) >= capPerTrack) continue;
    out.push(row);
    counts[t] = (counts[t] || 0) + 1;
    if (out.length >= topN) break;
  }
  if (out.length < topN) {
    const chosen = new Set(out.map(r => r.exam.exam_id));
    for (const row of scored) {
      if (chosen.has(row.exam.exam_id)) continue;
      out.push(row);
      if (out.length >= topN) break;
    }
  }
  return out;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
const FIRST_20 = rows.slice(0, 20);

const results = [];
let wrongStateCount = 0;
let zeroScoreCount  = 0;
let thinPoolCount   = 0;
let zeroPrefBonus   = 0;
let zeroTradeBonus  = 0;

for (const row of FIRST_20) {
  const profile = {
    fullName:           row.fullName || 'Test',
    dateOfBirth:        row.dateOfBirth || '2000-01-01',
    category:           row.category   || 'General',
    disabilityStatus:   row.disabilityStatus || 'No',
    disabilityType:     row.disabilityType || null,
    disabilityPercentage: row.disabilityPercentage || null,
    stateOfDomicile:    row.stateOfDomicile || '',
    district:           row.district || '',
    maritalStatus:      row.maritalStatus || 'Single',
    email:              row.email || 'test@example.com',
    mobile:             row.mobile || '0000000000',
    serviceBranch:      row.serviceBranch || 'Indian Army',
    armCorpsTrade:      row.armCorpsTrade || '',
    roleAppointment:    row.roleAppointment || '',
    totalServiceDuration: row.totalServiceDuration || '4 years 0 months',
    militaryCourses:    toArray(row.militaryCourses),
    characterOnDischarge: row.characterOnDischarge || 'Good',
    specificSkills:     toArray(row.specificSkills),
    highestQualification: row.highestQualification || 'Class 12',
    completedDuringService: toBool(row.completedDuringService),
    nccCertification:   row.nccCertification || 'None',
    sportsAchievement:  row.sportsAchievement || 'None',
    mathInClass12:      toBool(row.mathInClass12),
    heightCm:           Number(row.heightCm) || 170,
    weightKg:           row.weightKg ? Number(row.weightKg) : null,
    chestCm:            row.chestCm ? Number(row.chestCm) : null,
    chestExpansion:     row.chestExpansion ? Number(row.chestExpansion) : null,
    vision:             row.vision || null,
    colourBlind:        toBool(row.colourBlind),
    medicalCategory:    row.medicalCategory || 'SHAPE-1',
    physicalProficiency: row.physicalProficiency || 'Good',
    careerPreferences:  toArray(row.careerPreferences),
    relocation:         row.relocation || 'Home State',
    englishComfort:     row.englishComfort || 'Basic',
    sewaNidhiInterests: toArray(row.sewaNidhiInterests),
    consent:            true,
  };

  const preFiltered = preFilter(profile, ALL_EXAMS);
  const survivors   = [];
  const rejected    = [];
  for (const exam of preFiltered) {
    const e = checkEligibility(profile, exam);
    if (e.eligible) survivors.push(exam);
    else rejected.push({ exam_id: exam.exam_id, reasons: e.reasons });
  }

  const scored = survivors.map(exam => {
    const { score, breakdown } = scoreExam(profile, exam, { priorityTracks: PRIORITY_TRACKS });
    return { exam, score, breakdown };
  });
  scored.sort((a, b) => b.score - a.score);

  const top5 = diversify(scored, 5, 2);

  // ── Diagnostic flags ───────────────────────────────────────────────────────
  const userStateLow  = normalizeState(profile.stateOfDomicile);
  const wrongState    = profile.relocation !== 'Anywhere in India'
    ? top5.filter(r => r.exam.domicile_required && r.exam.state_ut &&
        normalizeState(r.exam.state_ut) !== userStateLow)
    : [];

  const topScore = top5[0]?.score ?? 0;

  // Check preference bonus applied
  const prefBonusApplied = top5.some(r =>
    Object.keys(r.breakdown).some(k => k.startsWith('preference_'))
  );
  // Check trade bonus applied
  const tradeBonusApplied = top5.some(r =>
    r.breakdown.trade_strong_match || r.breakdown.trade_soft_match
  );

  if (wrongState.length > 0) wrongStateCount++;
  if (topScore < 20) zeroScoreCount++;
  if (survivors.length < 10) thinPoolCount++;
  if (!prefBonusApplied) zeroPrefBonus++;
  if (!tradeBonusApplied) zeroTradeBonus++;

  results.push({
    persona:   row.persona_id,
    state:     profile.stateOfDomicile,
    relocation: profile.relocation,
    arm:       profile.armCorpsTrade,
    prefs:     profile.careerPreferences.join(', '),
    qual:      profile.highestQualification,
    eligible:  survivors.length,
    rejected:  rejected.length,
    topScore,
    top5:      top5.map(r => `${r.exam.exam_name} (${r.exam.state_ut || 'Central'}) [${Math.round(r.score)}]`),
    wrongStateExams: wrongState.map(r => `${r.exam.exam_name} (${r.exam.state_ut})`),
    prefBonusApplied,
    tradeBonusApplied,
    breakdown: top5[0]?.breakdown || {},
  });
}

// ── Print Report ──────────────────────────────────────────────────────────────
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const GRN   = '\x1b[32m';
const YLW   = '\x1b[33m';
const CYN   = '\x1b[36m';
const DIM   = '\x1b[2m';
const RESET = '\x1b[0m';
const TICK  = `${GRN}✓${RESET}`;
const CROSS = `${RED}✗${RESET}`;
const WARN  = `${YLW}⚠${RESET}`;

console.log(`\n${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  VeerNXT Recommendation Engine — Test Report (First 20 Profiles)${RESET}`);
console.log(`${BOLD}  Exam source: exam_master.json (${ALL_EXAMS.length} exams)${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);

for (const r of results) {
  const domOk   = r.wrongStateExams.length === 0 ? TICK : CROSS;
  const prefOk  = r.prefBonusApplied ? TICK : WARN;
  const tradeOk = r.tradeBonusApplied ? TICK : WARN;
  const poolOk  = r.eligible >= 10 ? TICK : WARN;
  const scoreOk = r.topScore >= 20 ? TICK : WARN;

  console.log(`${BOLD}${CYN}[${r.persona}]${RESET}  ${r.state}  ${DIM}(${r.relocation})${RESET}`);
  console.log(`  Arm: ${r.arm}  |  Prefs: ${r.prefs}  |  Qual: ${r.qual}`);
  console.log(`  Eligible pool: ${r.eligible} ${poolOk}  |  Top score: ${r.topScore} ${scoreOk}`);
  console.log(`  Domicile filter: ${domOk}  |  Pref bonus: ${prefOk}  |  Trade bonus: ${tradeOk}`);
  if (r.wrongStateExams.length > 0) {
    console.log(`  ${RED}WRONG STATE EXAMS IN TOP5: ${r.wrongStateExams.join(', ')}${RESET}`);
  }
  console.log(`  Top 5 recommendations:`);
  r.top5.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  console.log(`  Score breakdown (top match): ${JSON.stringify(r.breakdown)}`);
  console.log();
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  SUMMARY${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`  Total profiles tested  : 20`);
console.log(`  Wrong-state in top-5   : ${wrongStateCount === 0 ? `${GRN}${wrongStateCount}${RESET} ✓` : `${RED}${wrongStateCount}${RESET} ✗`}`);
console.log(`  Top score < 20 (thin)  : ${zeroScoreCount === 0  ? `${GRN}${zeroScoreCount}${RESET} ✓`  : `${YLW}${zeroScoreCount}${RESET} ⚠`}`);
console.log(`  Eligible pool < 10     : ${thinPoolCount === 0   ? `${GRN}${thinPoolCount}${RESET} ✓`   : `${YLW}${thinPoolCount}${RESET} ⚠`}`);
console.log(`  Profiles w/ ZERO pref bonus : ${zeroPrefBonus === 0 ? `${GRN}${zeroPrefBonus}${RESET} ✓` : `${RED}${zeroPrefBonus}${RESET} ✗ ← careerPreferences format bug`}`);
console.log(`  Profiles w/ ZERO trade bonus: ${zeroTradeBonus === 0 ? `${GRN}${zeroTradeBonus}${RESET} ✓` : `${YLW}${zeroTradeBonus}${RESET} ⚠ ← unresolved arm/corps`}`);
console.log();
