/**
 * Display-only copy for the points system. Mirrors the action codes in
 * backend/points/pointsCatalog.js (the server-side source of truth for
 * point values); src/ is Vite-bundled and api/ is plain Node so, matching
 * the existing TIERS/PLAN_DETAILS split in subscriptionAccess.js, this
 * repo keeps a display-only copy here rather than cross-importing.
 */
export const POINT_ACTION_LABELS = {
  PROFILING_COMPLETE: 'Profile Complete',
  RESUME_BUILT: 'Resume Built',
  RESOURCE_OPENED: 'Study Material Opened',
  QUIZ_COMPLETE: 'Quiz Completed',
};
