/**
 * Eligibility gate: hard filters that drop an exam from the candidate pool
 * BEFORE scoring. Anything that returns false here means the Agniveer
 * simply cannot apply, regardless of how good the other scores are.
 */

import * as W from './weights.js';

export const QUAL_RANK = { '10': 1, '12': 2, 'graduate': 3, 'post_graduate': 4 };

export function ageYears(dob, ref = new Date()) {
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const ms = ref - d;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Returns { eligible: boolean, reasons: string[] }
 */
export function checkEligibility(profile, exam) {
  const reasons = [];

  // ---- Qualification gate ----
  if (exam.min_qualification) {
    const need = QUAL_RANK[exam.min_qualification] || 0;
    const have = QUAL_RANK[mapQual(profile.highestQualification)] || 0;
    if (need && have < need) {
      reasons.push(`needs ${exam.min_qualification}, Agniveer has ${profile.highestQualification}`);
    }
  }

  // ---- Domicile gate (state/UT exams only) ----
  const effectiveState = exam.state_ut || inferState(exam.exam_name, exam.conducting_body, null);
  if (effectiveState) {
    if (!profile.stateOfDomicile) {
      reasons.push('state of domicile missing');
    } else if (normalizeState(profile.stateOfDomicile) !== normalizeState(effectiveState)) {
      // Domicile mismatch = hard filter UNLESS user opted "Anywhere in India"
      if (profile.relocation !== 'Anywhere in India') {
        reasons.push(`state/UT mismatch: exam is for ${effectiveState}, user is from ${profile.stateOfDomicile}`);
      }
    }
  }

  // ---- Career Preference Level gate (State vs Central Govt) ----
  if (Array.isArray(profile.careerPreferences) && profile.careerPreferences.length > 0) {
    const wantsState = profile.careerPreferences.some(p => /state/i.test(String(p)));
    const wantsCentral = profile.careerPreferences.some(p => /central/i.test(String(p)));
    
    // User explicitly chose ONLY State Government (not Central)
    if (wantsState && !wantsCentral && exam.level === 'central') {
      reasons.push('candidate preferred State Government only; Central exam skipped');
    }
    // User explicitly chose ONLY Central Government (not State)
    if (wantsCentral && !wantsState && (exam.level === 'state' || exam.level === 'ut')) {
      reasons.push('candidate preferred Central Government only; State/UT exam skipped');
    }
  }

  // ---- Physical gate (uniformed jobs) ----
  if (exam.physical_required) {
    if (profile.medicalCategory && profile.medicalCategory !== 'SHAPE-1') {
      reasons.push('physical standard (non-SHAPE-1)');
    }
    if (profile.physicalProficiency === 'Satisfactory' &&
        (exam.career_track === 'POLICE_CAPF' || exam.career_track === 'DEFENCE')) {
      reasons.push('physical proficiency below required level');
    }
  }

  // ---- Age gate (with Agniveer relaxation) ----
  // We do NOT hard-reject on age here because most govt exams have
  // different cutoffs per post. Instead, we'll rely on the live-scraper
  // to attach the current notification's age range and filter at that level.
  // Soft scoring still happens in scoring.js.

  return { eligible: reasons.length === 0, reasons };
}

export function mapQual(q) {
  if (!q) return null;
  const s = q.toString().toLowerCase();
  if (s.includes('post')) return 'post_graduate';
  if (s.includes('grad')) return 'graduate';
  if (s.includes('12')) return '12';
  if (s.includes('10')) return '10';
  return null;
}

// Known data-quality aliases: maps bad/legacy spellings → canonical normalised form.
// Entries are compared AFTER the standard normalisation (lowercase, trim, etc.).
const STATE_ALIASES = {
  'lakshadwee p':            'lakshadweep',
  'lakshadweep':             'lakshadweep',
  'jammu and kashmir':       'jammu & kashmir',
  'j&k':                     'jammu & kashmir',
  'uttaranchal':             'uttarakhand',
  'pondicherry':             'puducherry',
  'orissa':                  'odisha',
  'andaman & nicobar islands': 'andaman and nicobar islands',
  'andaman & nicobar':       'andaman and nicobar islands',
  'dadra & nagar haveli':    'dadra & nagar haveli and daman & diu',
  'daman & diu':             'dadra & nagar haveli and daman & diu',
};

export function normalizeState(s) {
  let normalized = (s || '').toString().trim().toLowerCase()
    .replace(/\s+and\s+/g, ' & ')
    .replace(/\s+/g, ' ');
  return STATE_ALIASES[normalized] || normalized;
}

export const STATE_INFERENCE_RULES = [
  { pattern: /uttar\s*pradesh|upsssc|uprvunl|uppsc|upsi|uptgt|up\s*police|up\s*jail/i, state: 'Uttar Pradesh' },
  { pattern: /west\s*bengal|wbpsc|wbssc|wb\s*police|wbhrb|wbcs/i, state: 'West Bengal' },
  { pattern: /bihar|bpsc|bpssc|btsc|bihar\s*police/i, state: 'Bihar' },
  { pattern: /rajasthan|rpsc|rsmssb/i, state: 'Rajasthan' },
  { pattern: /punjab|ppsc|psssb|pstet/i, state: 'Punjab' },
  { pattern: /haryana|hpsc|hssc|htet/i, state: 'Haryana' },
  { pattern: /delhi|dsssb|delhi\s*police/i, state: 'Delhi' },
  { pattern: /kerala|kpsc|ktet|kerala\s*police/i, state: 'Kerala' },
  { pattern: /tamil\s*nadu|tnpsc|tnusrb/i, state: 'Tamil Nadu' },
  { pattern: /maharashtra|mpsc|mahagenco/i, state: 'Maharashtra' },
  { pattern: /madhya\s*pradesh|mppsc|mpesb|vyapam|mp\s*police|mpro/i, state: 'Madhya Pradesh' },
  { pattern: /jammu|kashmir|jkpsc|jkssb|jktet/i, state: 'Jammu & Kashmir' },
  { pattern: /odisha|opsc|ossc|osssc/i, state: 'Odisha' },
  { pattern: /karnataka|kpsc|ksp/i, state: 'Karnataka' },
  { pattern: /andhra|appsc/i, state: 'Andhra Pradesh' },
  { pattern: /telangana|tspsc|tslprb/i, state: 'Telangana' },
  { pattern: /gujarat|gpsc|gsssb/i, state: 'Gujarat' },
  { pattern: /assam|apsc|slprb\s*assam/i, state: 'Assam' },
  { pattern: /jharkhand|jpsc|jssc/i, state: 'Jharkhand' },
  { pattern: /chhattisgarh|cgpsc|cgvyapam/i, state: 'Chhattisgarh' },
  { pattern: /uttarakhand|ukpsc|uksssc/i, state: 'Uttarakhand' },
  { pattern: /himachal|hppsc|hpssc/i, state: 'Himachal Pradesh' },
  { pattern: /goa|gpsc/i, state: 'Goa' },
  { pattern: /lakshadweep/i, state: 'Lakshadweep' },
  { pattern: /puducherry|pondicherry/i, state: 'Puducherry' },
  { pattern: /andaman/i, state: 'Andaman and Nicobar Islands' },
  { pattern: /ladakh/i, state: 'Ladakh' },
  { pattern: /chandigarh/i, state: 'Chandigarh' },
];

export function inferState(name, body, current) {
  if (current) return current;
  const text = `${name || ''} ${body || ''}`;
  for (const rule of STATE_INFERENCE_RULES) {
    if (rule.pattern.test(text)) return rule.state;
  }
  return null;
}

