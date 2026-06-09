/**
 * Scoring weights for the VeerNXT Career Profiling Engine.
 * All scores are in 0..100 range and then multiplied by these weights.
 * Tune these over time based on feedback from counsellors.
 */

// ---- Priority track boost (user-selected focus areas) ----
export const PRIORITY_TRACK_BONUS = 15;

// ---- Ex-Servicemen track boost ----
export const EX_SERVICEMEN_TRACK_BONUS = 25;

// ---- Preference alignment ----
export const PREFERENCE_WEIGHTS = {
  CENTRAL_GOVT: 20,
  STATE_GOVT: 18,
  BANKING_PSU: 16,
  PRIVATE: 6,
  ENTREPRENEURSHIP: 2,
};

// ---- Trade → Role match ----
export const TRADE_ROLE_MATCH_BONUS = 20;
export const TRADE_ROLE_SOFT_MATCH_BONUS = 10;

// ---- Qualification fit ----
export const QUALIFICATION_EXACT_MATCH = 15;
export const QUALIFICATION_OVER_MATCH = 8;
export const QUALIFICATION_GATE_FAIL = null;

// ---- Domicile ----
export const DOMICILE_MATCH_BONUS = 18;
export const DOMICILE_MISMATCH_PENALTY = null;

// ---- Category / Reservation boost ----
export const CATEGORY_RESERVATION_BONUS = {
  SC: 5, ST: 5, OBC: 3, EWS: 3, General: 0,
};

// ---- Character on discharge (critical for Banking/PSU/Police) ----
export const CHARACTER_BONUS = {
  Exemplary: 10,
  'Very Good': 6,
  Good: 2,
};
export const CHARACTER_REQUIRED_TRACKS = ['BANKING','PSU','POLICE_CAPF','JUDICIARY'];

// ---- NCC bonus ----
export const NCC_WEIGHTS = {
  'C Certificate': 10,
  'B Certificate': 5,
  'A Certificate': 2,
  'None': 0,
};

// ---- Sports quota ----
export const SPORTS_BONUS = {
  'International/Services': 15,
  'National': 10,
  'State': 6,
  'District': 3,
  'None': 0,
};

// ---- Math-in-12 (required for technical/clerical) ----
export const MATH_REQUIRED_BONUS = 8;
export const MATH_REQUIRED_PENALTY = -10;

// ---- English comfort ----
export const ENGLISH_WEIGHTS = {
  Fluent: 8,
  Intermediate: 4,
  Basic: 0,
};
export const ENGLISH_PENALTY_FOR_INTENSIVE_IF_BASIC = -8;

// ---- Physical compliance ----
export const PHYSICAL_MATCH_BONUS = 10;
export const PHYSICAL_FAIL_PENALTY = null;

// ---- Age relaxation for Agniveers (ex-srvc rules) ----
export const AGNIVEER_AGE_RELAXATION_YEARS = 5;

// ---- Service duration ----
export const SERVICE_DURATION_FULL_4YR_BONUS = 5;
