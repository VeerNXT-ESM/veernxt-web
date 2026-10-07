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
 * Maps the live profiling form's code values (e.g. 'POLICE_CAPF', 'SSC') to the
 * preference bucket keys the scorer uses.  The form sends these codes; the
 * Excel test data sends human-readable strings like 'Central Government'.
 * Both are handled below so scores are consistent across both paths.
 */
const FORM_CODE_TO_BUCKET = {
  // Central-government tracks
  POLICE_CAPF:    'CENTRAL_GOVT',
  SSC:            'CENTRAL_GOVT',
  RAILWAYS:       'CENTRAL_GOVT',
  ENGINEERING:    'CENTRAL_GOVT',
  CIVIL_SERVICES: 'CENTRAL_GOVT',
  DEFENCE:        'CENTRAL_GOVT',
  POSTAL:         'CENTRAL_GOVT',
  PSU:            'CENTRAL_GOVT',
  // State-government tracks
  TEACHING:       'STATE_GOVT',
  NURSING:        'STATE_GOVT',
  REVENUE:        'STATE_GOVT',
  FOREST:         'STATE_GOVT',
  HEALTH:         'STATE_GOVT',
  AGRICULTURE:    'STATE_GOVT',
  MUNICIPAL:      'STATE_GOVT',
  FIRE:           'STATE_GOVT',
  GROUP_C:        'STATE_GOVT',
  GROUP_D:        'STATE_GOVT',
  // Banking / PSU tracks
  BANKING:        'BANKING_PSU',
  INSURANCE:      'BANKING_PSU',
  // Private tracks
  PRIVATE:        'PRIVATE',
  TRANSPORT:      'PRIVATE',
  // Entrepreneurship
  ENTREPRENEURSHIP: 'ENTREPRENEURSHIP',
};

/**
 * Normalise the user's Section-E preferences (array of labels) into our
 * internal preference bucket keys.  Accepts BOTH the live form's career-track
 * codes (e.g. 'POLICE_CAPF') AND human-readable strings (e.g. 'Central Government').
 */
export function normalisePreferences(prefs = []) {
  const out = new Set();
  for (const p of prefs) {
    // 1. Direct code match first (live form)
    const upper = p.trim().toUpperCase().replace(/\s+/g, '_');
    if (FORM_CODE_TO_BUCKET[upper]) {
      out.add(FORM_CODE_TO_BUCKET[upper]);
      continue;
    }
    // 2. Substring match for human-readable strings (Excel / legacy)
    const s = p.toLowerCase();
    if (s.includes('central'))            out.add('CENTRAL_GOVT');
    else if (s.includes('state'))         out.add('STATE_GOVT');
    else if (s.includes('bank') || s.includes('psu')) out.add('BANKING_PSU');
    else if (s.includes('private'))       out.add('PRIVATE');
    else if (s.includes('entrepren'))     out.add('ENTREPRENEURSHIP');
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
  if (profile.relocation === 'Anywhere in India' && !prefs.includes('CENTRAL_GOVT')) {
    prefs.push('CENTRAL_GOVT');
  }
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

  // 16. Banking Post-Tier Differentiation
  // ─────────────────────────────────────────────────────────────────────
  // India's banking sector has DISTINCT ESM quota tracks depending on post:
  //   • Security Guard / Sub-Staff: strong ESM quota, prefers combat trades,
  //     Class 10 eligible — heavily favored for Infantry/GD/combat arms
  //   • Clerical / Office Assistant: ESM preferred, Clerk/Admin/Storekeeper trades
  //   • Officer (PO / SO): Open competition, Graduate + Fluent English strongly needed
  //
  // Without this tier-differentiation, all BANKING exams get the same score regardless
  // of trade/qualification — causing a Sepoy to see the same exams as a Graduate Clerk.
  if (exam.career_track === 'BANKING') {
    const examNameLower = (exam.exam_name || '').toLowerCase();
    const conductingBodyLower = (exam.conducting_body || '').toLowerCase();
    const examText = `${examNameLower} ${conductingBodyLower}`;
    const haveRankForBanking = QUAL_RANK[mapQual(profile.highestQualification)] || 0;

    // Detect banking post tier from exam name heuristics
    const isSecurityPost = /security|guard|watchman|cash.?in.?transit|armed|peon|sub.?staff|group.?d/i.test(examText);
    const isClerkPost    = /clerk|office.?assistant|single.?window|mts|assistant.*bank|bank.*assistant/i.test(examText);
    const isOfficerPost  = /officer|po\b|probationary|specialist|so\b|manager|scale.?ii|grade.?b|rbi.*grade/i.test(examText);

    const isCombatTrade = tracks.strong.some(t => ['POLICE_CAPF'].includes(t));
    const isAdminTrade  = tracks.strong.some(t => ['SSC', 'ACCOUNTING', 'ADMINISTRATIVE', 'SECRETARIAT', 'POSTAL'].includes(t));
    const isGradOrAbove = haveRankForBanking >= 3;
    const isFluent      = profile.englishComfort === 'Fluent';
    const isIntermediate = profile.englishComfort === 'Intermediate';

    if (isSecurityPost) {
      // Best match for combat/security-trade Agniveers regardless of qualification
      if (isCombatTrade) {
        add(breakdown, 'banking_security_strong', 20);
      } else {
        add(breakdown, 'banking_security_soft', 8);
      }
    } else if (isClerkPost) {
      // Best match for admin/clerk/storekeeper trades with good English
      if (isAdminTrade && (isFluent || isIntermediate)) {
        add(breakdown, 'banking_clerk_strong', 18);
      } else if (isAdminTrade) {
        add(breakdown, 'banking_clerk_moderate', 10);
      } else if (isCombatTrade) {
        // Combat trade applying for clerk post — possible but not ideal
        add(breakdown, 'banking_clerk_mismatch', -5);
      }
    } else if (isOfficerPost) {
      // Officer posts strongly favor Graduate + Fluent English
      if (isGradOrAbove && isFluent) {
        add(breakdown, 'banking_officer_strong', 15);
      } else if (isGradOrAbove && isIntermediate) {
        add(breakdown, 'banking_officer_moderate', 8);
      } else if (!isGradOrAbove) {
        // Under-qualified for officer post — de-emphasise
        add(breakdown, 'banking_officer_underqualified', -10);
      }
    }
    // Unknown post type: no tier bonus/penalty — neutral
  }

  // 17. Combat/Police Trade Security Bonus
  // Agniveers from combat trades (Infantry, GD, Rifleman, Armoured) should score
  // higher for Police/CAPF and Security posts even when preference isn't selected,
  // because ex-serviceman quota in these tracks is the single strongest employment route.
  if (['POLICE_CAPF', 'DEFENCE', 'SECURITY', 'FIRE'].includes(exam.career_track)) {
    const combatTrades = ['POLICE_CAPF'];
    if (tracks.strong.some(t => combatTrades.includes(t))) {
      add(breakdown, 'combat_trade_security_affinity', 12);
    }
  }

  let score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  score = Math.max(0, Math.min(score, 100)); // clamp to [0, 100]
  return { score, breakdown };
}

function parseServiceDurationToMonths(raw = '') {
  if (!raw) return 0;
  const m = raw.toString().match(/(\d+)\s*y/i);
  const mm = raw.toString().match(/(\d+)\s*m/i);
  return (m ? parseInt(m[1]) * 12 : 0) + (mm ? parseInt(mm[1]) : 0);
}
