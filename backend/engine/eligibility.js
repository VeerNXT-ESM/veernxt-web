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
  // State/UT exams are strictly for candidates from that state/UT.
  // Even if candidate chooses "Anywhere in India", other states' exams (e.g. UP state exams for Kerala)
  // are never recommended; instead, "Anywhere in India" unlocks All-India Central Government exams.
  const effectiveState = exam.state_ut || inferState(exam.exam_name, exam.conducting_body, null);
  if (effectiveState) {
    if (!profile.stateOfDomicile) {
      reasons.push('state of domicile missing');
    } else if (normalizeState(profile.stateOfDomicile) !== normalizeState(effectiveState)) {
      reasons.push(`state/UT mismatch: exam is for ${effectiveState}, user is from ${profile.stateOfDomicile}`);
    }
  }

  // ---- Career Preference Level gate (State vs Central Govt) ----
  if (Array.isArray(profile.careerPreferences) && profile.careerPreferences.length > 0) {
    const wantsState = profile.careerPreferences.some(p => /state/i.test(String(p)));
    const wantsCentral = profile.careerPreferences.some(p => /central/i.test(String(p)));
    const isAnywhereInIndia = profile.relocation === 'Anywhere in India';
    
    // User chose ONLY State Government (not Central).
    // EXCEPTION: If relocation is 'Anywhere in India', Central exams are AUTOMATICALLY unlocked!
    if (wantsState && !wantsCentral && !isAnywhereInIndia && exam.level === 'central') {
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
  { pattern: /uttar\s*pradesh|\bupsssc\b|\buprvunl\b|\buppsc\b|\bupsi\b|\buptgt\b|up\s*police|up\s*jail/i, state: 'Uttar Pradesh' },
  { pattern: /west\s*bengal|\bwbpsc\b|\bwbssc\b|wb\s*police|\bwbhrb\b|\bwbcs\b/i, state: 'West Bengal' },
  { pattern: /bihar|\bbpsc\b|\bbpssc\b|\bbtsc\b|bihar\s*police/i, state: 'Bihar' },
  { pattern: /rajasthan|\brpsc\b|\brsmssb\b/i, state: 'Rajasthan' },
  { pattern: /punjab|\bppsc\b|\bpsssb\b|\bpstet\b/i, state: 'Punjab' },
  { pattern: /haryana|\bhpsc\b|\bhssc\b|\bhtet\b/i, state: 'Haryana' },
  { pattern: /delhi|\bdsssb\b|delhi\s*police/i, state: 'Delhi' },
  { pattern: /jammu|kashmir|\bjkpsc\b|\bjkssb\b|\bjktet\b/i, state: 'Jammu & Kashmir' },
  { pattern: /himachal|\bhppsc\b|\bhpssc\b/i, state: 'Himachal Pradesh' },
  { pattern: /andhra|\bappsc\b/i, state: 'Andhra Pradesh' },
  { pattern: /telangana|\btspsc\b|\btslprb\b/i, state: 'Telangana' },
  { pattern: /kerala|\bkpsc\b|\bktet\b|kerala\s*police/i, state: 'Kerala' },
  { pattern: /tamil\s*nadu|\btnpsc\b|\btnusrb\b/i, state: 'Tamil Nadu' },
  { pattern: /maharashtra|\bmpsc\b|\bmahagenco\b/i, state: 'Maharashtra' },
  { pattern: /madhya\s*pradesh|\bmppsc\b|\bmpesb\b|\bvyapam\b|mp\s*police|\bmpro\b/i, state: 'Madhya Pradesh' },
  { pattern: /odisha|\bopsc\b|\bossc\b|\bosssc\b/i, state: 'Odisha' },
  { pattern: /karnataka|\bkpsc\b|\bksp\b/i, state: 'Karnataka' },
  { pattern: /gujarat|\bgpsc\b|\bgsssb\b/i, state: 'Gujarat' },
  { pattern: /assam|\bapsc\b|slprb\s*assam/i, state: 'Assam' },
  { pattern: /jharkhand|\bjpsc\b|\bjssc\b/i, state: 'Jharkhand' },
  { pattern: /chhattisgarh|\bcgpsc\b|\bcgvyapam\b/i, state: 'Chhattisgarh' },
  { pattern: /uttarakhand|\bukpsc\b|\buksssc\b/i, state: 'Uttarakhand' },
  { pattern: /goa|\bgpsc\b/i, state: 'Goa' },
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

