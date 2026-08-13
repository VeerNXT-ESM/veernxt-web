import { MapPin, Shield, Clock, Medal, GraduationCap, Target } from 'lucide-react';

const CHARACTER_COPY = {
  Exemplary: 'An Exemplary discharge character strengthens your candidature across nearly every exam track.',
  'Very Good': 'A Very Good discharge character is a solid, positive signal for most recruiters and exams.',
  Good: 'A Good discharge character meets the bar for the large majority of government exams.',
};

const QUALIFICATION_COPY = {
  'Class 10': 'Class 10 opens Group C/D exams across SSC, Railways, and State PSCs.',
  'Class 12': 'Class 12 opens Group C and several Group B exams — a wide band of opportunity.',
  Graduate: 'Graduate-level qualification opens Group B exams across most departments.',
  'Post-Graduate': 'Post-Graduate qualification clears you for Group A/B exams, the widest band available.',
};

const CAREER_TRACK_LABELS = {
  POLICE_CAPF: 'Police & Central Armed Police Forces',
  SSC: 'SSC (Staff Selection Commission)',
  BANKING: 'Banking & Financial Services',
  RAILWAYS: 'Indian Railways',
  TEACHING: 'Teaching & Education',
  ENGINEERING: 'Engineering & Technical',
  NURSING: 'Nursing & Healthcare',
};

const TRANSFERABLE_SKILLS_BY_BRANCH = {
  'Indian Army': [
    'Leadership and team coordination under pressure',
    'Discipline and structured execution of complex tasks',
  ],
  'Indian Navy': [
    'Systems discipline and operating within strict protocols',
    'Teamwork in high-stakes, confined-crew environments',
  ],
  'Indian Air Force': [
    'Technical precision and adherence to safety-critical procedures',
    'Rapid decision-making under time pressure',
  ],
};

/**
 * Client-side, qualitative "here's what we're learning about you" copy —
 * deliberately NOT a score. The real VeerScore/matches only ever come from
 * one place: the /api/profile/recommend call at the end of the journey.
 * This just reflects back what the user already told us, in the same
 * vocabulary ProfilingResults.jsx uses for its breakdown chips, so the
 * journey and the results page feel like one voice.
 *
 * Also reused (unmodified field names) by ProfilingResults.jsx, fed with
 * the persisted `raw_profile_data` row instead of live formData — that
 * object uses the same field names, except service duration only survives
 * as the combined `totalServiceDuration` string, handled below.
 *
 * @param {object} formData
 * @param {{ context?: 'journey' | 'results' }} [opts]
 */
export function getProfilingInsights(formData, opts = {}) {
  const { context = 'journey' } = opts;
  const insights = [];

  if (formData.stateOfDomicile) {
    insights.push({
      icon: MapPin,
      label: 'Home State Advantage',
      detail: `Many ${formData.stateOfDomicile} government exams reserve seats or give preference to local domicile holders.`,
    });
  }

  if (formData.serviceBranch && formData.armCorpsTrade && formData.roleAppointment) {
    insights.push({
      icon: Shield,
      label: 'Strong Trade Match',
      detail: `We're mapping your ${formData.roleAppointment} background in ${formData.armCorpsTrade} to relevant civilian career tracks.`,
    });
  }

  let totalServiceMonths = null;
  if (formData.serviceYears !== '' && formData.serviceMonths !== '' && formData.serviceYears != null && formData.serviceMonths != null) {
    const years = parseInt(formData.serviceYears, 10);
    const months = parseInt(formData.serviceMonths, 10);
    if (!Number.isNaN(years) && !Number.isNaN(months)) totalServiceMonths = years * 12 + months;
  } else if (formData.totalServiceDuration) {
    // Persisted profiles only keep the combined string (e.g. "4 years 6 months") —
    // same parsing recommend.js already does for years_of_service.
    const yMatch = formData.totalServiceDuration.match(/(\d+)\s*years?/i);
    const mMatch = formData.totalServiceDuration.match(/(\d+)\s*months?/i);
    if (yMatch || mMatch) {
      totalServiceMonths = (yMatch ? parseInt(yMatch[1], 10) : 0) * 12 + (mMatch ? parseInt(mMatch[1], 10) : 0);
    }
  }
  if (totalServiceMonths != null && totalServiceMonths >= 48) {
    insights.push({
      icon: Clock,
      label: 'Full-Term Service',
      detail: '4+ years of service is a strength signal many recruiters and exams weight directly.',
    });
  }

  if (formData.characterOnDischarge && CHARACTER_COPY[formData.characterOnDischarge]) {
    insights.push({
      icon: Medal,
      label: `${formData.characterOnDischarge} Discharge Character`,
      detail: CHARACTER_COPY[formData.characterOnDischarge],
    });
  }

  if (formData.highestQualification && QUALIFICATION_COPY[formData.highestQualification]) {
    insights.push({
      icon: GraduationCap,
      label: 'Qualification Tier',
      detail: QUALIFICATION_COPY[formData.highestQualification],
    });
  }

  if (formData.careerPreferences && formData.careerPreferences.length > 0) {
    const labels = formData.careerPreferences.map((p) => CAREER_TRACK_LABELS[p] || p).slice(0, 4);
    const closing = context === 'results'
      ? 'This directly shaped your matched exams and VeerScore below.'
      : 'Your full VeerScore and matched exams are calculated on the last step.';
    insights.push({
      icon: Target,
      label: 'Career Alignment',
      detail: `Based on your answers, we're seeing strong alignment with: ${labels.join(', ')}. ${closing}`,
    });
  }

  return insights;
}

/**
 * Short, honest "transferable skills" bullets keyed off service branch —
 * distinct from getProfilingInsights()'s reflective copy, this is the one
 * genuinely new insight category the post-profiling results page needs.
 */
export function getTransferableSkills(formData) {
  const base = TRANSFERABLE_SKILLS_BY_BRANCH[formData.serviceBranch] || [
    'Leadership and team coordination under pressure',
    'Discipline and structured execution of complex tasks',
  ];
  const skills = [...base];
  if (formData.armCorpsTrade) {
    skills.push(`Technical proficiency in ${formData.armCorpsTrade}, transferable to related civilian trades`);
  }
  return skills;
}
