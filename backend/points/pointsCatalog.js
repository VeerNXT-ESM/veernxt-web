/**
 * Server-side catalog of point-earning actions. The client only ever
 * reports *what happened* (an action_code, optionally a ref_id); this
 * catalog is the single source of truth for *how many points that's
 * worth* and *how often it can be earned* — never trust a client-supplied
 * point value.
 */

// once: 'user'   -> idempotency key is the action code alone (one award ever)
// once: 'target' -> idempotency key includes ref_id (one award per target, e.g. per quiz)
export const POINT_ACTIONS = {
  PROFILING_COMPLETE: {
    once: 'user',
    points: 100,
  },
  RESUME_BUILT: {
    once: 'user',
    points: 100,
  },
  RESOURCE_OPENED: {
    once: 'target',
    refTable: 'resources_v2',
    points: 20,
  },
  QUIZ_COMPLETE: {
    once: 'target',
    refTable: 'quizzes',
    // 30 base + 20 bonus for a strong attempt (>=80% correct).
    computePoints: (metadata = {}) => {
      const scorePercent = Number(metadata.score_percent) || 0;
      return 30 + (scorePercent >= 80 ? 20 : 0);
    },
  },
};

export function resolvePoints(actionCode, metadata) {
  const cfg = POINT_ACTIONS[actionCode];
  if (!cfg) return null;
  return cfg.computePoints ? cfg.computePoints(metadata) : cfg.points;
}

export function buildIdempotencyKey(actionCode, refId) {
  const cfg = POINT_ACTIONS[actionCode];
  if (!cfg) return null;
  return cfg.once === 'target' ? `${actionCode}:${refId}` : actionCode;
}

export function refTableFor(actionCode) {
  return POINT_ACTIONS[actionCode]?.refTable || null;
}
