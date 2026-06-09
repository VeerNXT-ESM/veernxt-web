/**
 * Weighted scorer for an (Agniveer profile, exam) pair.
 * Call scoreExam(profile, exam) → { score, breakdown } after eligibility passes.
 */

import * as W from './weights.js';
import { PREF_MAP } from './preferenceMap.js';
import { resolveTradeTracks } from './tradeMap.js';
import { mapQual, QUAL_RANK } from './eligibility.js';

function add(breakdown, key, value) {
  if (!value) return;
  breakdown[key] = (breakdown[key] || 0) + value;
}

/**
 * Normalise the user's Section-E preferences (array of labels) into our
 * internal preference bucket keys.
 */
export function normalisePreferences(prefs = []) {
  const out = new Set();
  for (const p of prefs) {
    const s = p.toLowerCase();
    if (s.includes('central')) out.add('CENTRAL_GOVT');
    else if (s.includes('state')) out.add('STATE_GOVT');
    else if (s.includes('bank') || s.includes('psu')) out.add('BANKING_PSU');
    else if (s.includes('private')) out.add('PRIVATE');
    else if (s.includes('entrepren')) out.add('ENTREPRENEURSHIP');
  }
  return [...out];
}

export function scoreExam(profile, exam, options = {}) {
  const priorityTracks = options.priorityTracks || [];
  const breakdown = {};

  // 1. Ex-Servicemen track bonus (Agniveers benefit strongly)
  if (exam.ex_servicemen_quota) {
    add(breakdown, 'ex_servicemen_quota', W.EX_SERVICEMEN_TRACK_BONUS);
  }

  // 2. Priority track bonus (user-selected focus areas)
  if (priorityTracks.includes(exam.career_track)) {
    add(breakdown, 'priority_track', W.PRIORITY_TRACK_BONUS);
  }

  // 3. Preference alignment
  const prefs = normalisePreferences(profile.careerPreferences);
  for (const p of prefs) {
    if ((PREF_MAP[p] || []).includes(exam.career_track)) {
      add(breakdown, `preference_${p.toLowerCase()}`, W.PREFERENCE_WEIGHTS[p]);
    }
  }

  // 4. Trade → role match
  const traceInputs = [
    profile.armCorpsTrade,
    profile.roleAppointment,
    ...(profile.specificSkills || []),
  ].filter(Boolean).join(' ');
  const tracks = resolveTradeTracks(traceInputs, profile.specificSkills);
  if (tracks.strong.includes(exam.career_track)) {
    add(breakdown, 'trade_strong_match', W.TRADE_ROLE_MATCH_BONUS);
  } else if (tracks.soft.includes(exam.career_track)) {
    add(breakdown, 'trade_soft_match', W.TRADE_ROLE_SOFT_MATCH_BONUS);
  }

  // 5. Qualification fit
  const needRank = QUAL_RANK[exam.min_qualification] || 0;
  const haveRank = QUAL_RANK[mapQual(profile.highestQualification)] || 0;
  if (needRank && haveRank === needRank) {
    add(breakdown, 'qualification_exact', W.QUALIFICATION_EXACT_MATCH);
  } else if (needRank && haveRank > needRank) {
    add(breakdown, 'qualification_over', W.QUALIFICATION_OVER_MATCH);
  }

  // 6. Domicile match (home state)
  if (exam.state_ut && profile.stateOfDomicile &&
      exam.state_ut.toLowerCase().trim() === profile.stateOfDomicile.toLowerCase().trim()) {
    add(breakdown, 'domicile_home', W.DOMICILE_MATCH_BONUS);
  }

  // 7. Category reservation bonus
  const catBonus = W.CATEGORY_RESERVATION_BONUS[profile.category] || 0;
  add(breakdown, 'category_reservation', catBonus);

  // 8. Character on discharge (required for certain tracks)
  if (profile.characterOnDischarge) {
    const bonus = W.CHARACTER_BONUS[profile.characterOnDischarge] || 0;
    if (W.CHARACTER_REQUIRED_TRACKS.includes(exam.career_track)) {
      add(breakdown, 'character_required_track', bonus);
    } else {
      add(breakdown, 'character_general', Math.floor(bonus / 2));
    }
  }

  // 9. NCC bonus (big for SSC GD / Police)
  if (exam.ncc_bonus) {
    add(breakdown, 'ncc', W.NCC_WEIGHTS[profile.nccCertification] || 0);
  }

  // 10. Sports quota
  if (exam.sports_quota_eligible || ['POLICE_CAPF','DEFENCE','RAILWAYS'].includes(exam.career_track)) {
    add(breakdown, 'sports_quota', W.SPORTS_BONUS[profile.sportsAchievement] || 0);
  }

  // 11. Math in 12th
  if (exam.math_required) {
    add(breakdown, 'math', profile.mathInClass12 ? W.MATH_REQUIRED_BONUS : W.MATH_REQUIRED_PENALTY);
  }

  // 12. English comfort
  const engBonus = W.ENGLISH_WEIGHTS[profile.englishComfort] || 0;
  add(breakdown, 'english', engBonus);
  if (exam.english_intensive && profile.englishComfort === 'Basic') {
    add(breakdown, 'english_penalty', W.ENGLISH_PENALTY_FOR_INTENSIVE_IF_BASIC);
  }

  // 13. Physical fit bonus (for uniformed)
  if (exam.physical_required && profile.medicalCategory === 'SHAPE-1' &&
      profile.physicalProficiency !== 'Satisfactory') {
    add(breakdown, 'physical_fit', W.PHYSICAL_MATCH_BONUS);
  }

  // 14. Full-term service bonus
  const months = parseServiceDurationToMonths(profile.totalServiceDuration);
  if (months >= 48) add(breakdown, 'full_term', W.SERVICE_DURATION_FULL_4YR_BONUS);

  // 15. Technical trade preferred and Agniveer has technical skills
  if (exam.technical_trade_preferred && tracks.strong.includes('ENGINEERING')) {
    add(breakdown, 'technical_trade_alignment', 8);
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, breakdown };
}

function parseServiceDurationToMonths(raw = '') {
  if (!raw) return 0;
  const m = raw.toString().match(/(\d+)\s*y/i);
  const mm = raw.toString().match(/(\d+)\s*m/i);
  return (m ? parseInt(m[1]) * 12 : 0) + (mm ? parseInt(mm[1]) : 0);
}
