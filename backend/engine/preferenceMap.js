/**
 * Maps the "Top Career Preference" buckets from Section E of the questionnaire
 * to the career_track values in exam_master.json.
 */

export const PREF_MAP = {
  CENTRAL_GOVT: [
    'SSC', 'RAILWAYS', 'CIVIL_SERVICES', 'DEFENCE', 'PSU',
    'ACCOUNTING', 'ENGINEERING', 'SECRETARIAT', 'ADMINISTRATIVE',
    'POSTAL', 'TEACHING', 'JUDICIARY', 'POLICE_CAPF',
  ],
  STATE_GOVT: [
    'POLICE_CAPF', 'REVENUE', 'FOREST', 'CIVIL_SERVICES',
    'ADMINISTRATIVE', 'SECRETARIAT', 'HEALTH', 'TEACHING',
    'AGRICULTURE', 'ANIMAL_HUSBANDRY', 'RURAL_DEV',
    'MUNICIPAL', 'FIRE', 'EXCISE', 'TOURISM',
    'SOCIAL_WELFARE', 'ENVIRONMENT', 'DISASTER_MGMT',
    'GROUP_A', 'GROUP_B', 'GROUP_C', 'GROUP_D', 'TRANSPORT',
  ],
  BANKING_PSU: [
    'BANKING', 'INSURANCE', 'PSU', 'ACCOUNTING',
  ],
  PRIVATE: [
    // Private sector is handled outside govt exams;
    // still surface tracks that ladder into private logistics/security.
    'TRANSPORT', 'POLICE_CAPF', 'ENGINEERING',
  ],
  ENTREPRENEURSHIP: [
    // No direct govt exam matches — these will receive 0 preference
    // and the engine will surface financial planning / incubator guidance instead.
  ],
};
