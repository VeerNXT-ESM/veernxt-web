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
  if (exam.domicile_required && exam.state_ut) {
    if (!profile.stateOfDomicile) {
      reasons.push('state of domicile missing');
    } else if (normalizeState(profile.stateOfDomicile) !== normalizeState(exam.state_ut)) {
      // Domicile mismatch = hard filter UNLESS user opted "Anywhere in India"
      if (profile.relocation !== 'Anywhere in India') {
        reasons.push(`state-only exam (${exam.state_ut})`);
      }
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

export function normalizeState(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(/\s+and\s+/g, ' & ')
    .replace(/\s+/g, ' ');
}
