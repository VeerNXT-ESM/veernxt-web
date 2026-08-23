/**
 * subscriptionAccess.js — Centralized Subscription Access Control
 * 
 * Single source of truth for what each tier can access.
 * Every component imports from here instead of doing ad-hoc tier checks.
 */

// ═══════════════════════════════════════════
// TIER DEFINITIONS & HIERARCHY
// ═══════════════════════════════════════════

export const TIERS = {
  FREE: 'FREE',
  SCORE_UNLOCK: 'SCORE_UNLOCK',
  SCORE_CV: 'SCORE_CV',
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
  BIENNIAL: 'BIENNIAL',
  PREMIUM: 'PREMIUM',
};

// Higher number = higher tier. Used for >= comparisons.
export const TIER_RANK = {
  FREE: 0,
  SCORE_UNLOCK: 1,
  SCORE_CV: 2,
  MONTHLY: 3,
  ANNUAL: 3,
  BIENNIAL: 3,
  PREMIUM: 4,
};

// ═══════════════════════════════════════════
// PLAN DETAILS (used by Subscribe page)
// ═══════════════════════════════════════════

export const PLAN_DETAILS = [
  {
    id: 'MONTHLY',
    name: 'Monthly Plan',
    price: 49,
    priceLabel: '₹49',
    duration: '1 month',
    durationLabel: '/month',
    type: 'subscription',
    badge: null,
    features: [
      'VeerScore + Recommendations',
      'Personalised CV / Resume',
      'Access to all exams & mock tests',
      'Full study material library',
      'All guides, precis & PYQ papers',
    ],
  },
  {
    id: 'ANNUAL',
    name: 'Annual Plan',
    price: 299,
    priceLabel: '₹299',
    duration: '12 months',
    durationLabel: '/12 months',
    type: 'subscription',
    badge: 'BEST VALUE',
    features: [
      'Everything in Monthly Plan',
      'Save ₹289 vs monthly billing',
      'Full access for 12 months',
    ],
  },
  {
    id: 'BIENNIAL',
    name: '2-Year Plan',
    price: 399,
    priceLabel: '₹399',
    duration: '24 months',
    durationLabel: '/24 months',
    type: 'subscription',
    badge: null,
    features: [
      'Everything in Monthly Plan',
      'Save ₹777 vs monthly billing',
      'Full access for 24 months',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium Plan',
    price: 499,
    priceLabel: '₹499',
    duration: '24 months',
    durationLabel: '/24 months',
    type: 'subscription',
    badge: 'INCLUDES MENTORSHIP',
    features: [
      'Everything in 2-Year Plan',
      'Live mentorship & career guidance',
      'Priority support from veterans',
      '1:1 session access',
    ],
  },
];

// ═══════════════════════════════════════════
// EXPIRY & EFFECTIVE TIER
// ═══════════════════════════════════════════

/**
 * Check if a time-based subscription is still active.
 * One-time purchases (SCORE_UNLOCK, SCORE_CV) never expire.
 */
export function isSubscriptionActive(tier, expiresAt) {
  // Free tier is always "active"
  if (!tier || tier === TIERS.FREE) return true;

  // One-time purchases never expire
  if (tier === TIERS.SCORE_UNLOCK || tier === TIERS.SCORE_CV) return true;

  // Time-based plans: check expiry
  if (!expiresAt) return true; // No expiry set = assume active (legacy data)
  return new Date(expiresAt) > new Date();
}

/**
 * Returns the effective tier, accounting for expired subscriptions.
 * If a time-based plan has expired, the user effectively drops to FREE
 * (but retains one-time purchases like SCORE_UNLOCK/SCORE_CV if they had them).
 */
export function getEffectiveTier(tier, expiresAt) {
  if (!tier) return TIERS.FREE;
  if (isSubscriptionActive(tier, expiresAt)) return tier;
  // Expired time-based subscription → revert to FREE
  return TIERS.FREE;
}

// ═══════════════════════════════════════════
// ACCESS CONTROL FUNCTIONS
// ═══════════════════════════════════════════

/** Can user see their VeerScore number? Profiling is free for everyone. */
export function canViewVeerScore() {
  return true;
}

/** Can user see their personalised exam recommendations? Free for everyone. */
export function canViewRecommendations() {
  return true;
}

/** Can user generate/download their personalised CV? Free for everyone. */
export function canGenerateCV() {
  return true;
}

/** Can user access live mentorship features? */
export function canAccessMentorship(tier) {
  return tier === TIERS.PREMIUM;
}

/**
 * Can user access full content of a resource?
 *
 * Free tier rules:
 * - 'Intro' category: always fully accessible
 * - 'Guide' category: always fully accessible
 * - 'Precis' category: locked
 * - 'PYQ' category: locked
 * - Everything else: locked
 *
 * @param {string} tier - User's effective subscription tier
 * @param {string} category - Resource category (Intro, Guide, Precis, PYQ, Mock Test, etc.)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canAccessResource(tier, category) {
  // Paid tiers (MONTHLY and above) get full access
  if ((TIER_RANK[tier] || 0) >= TIER_RANK.MONTHLY) {
    return { allowed: true };
  }

  const cat = (category || '').toLowerCase().trim();

  // Intro & Guide — always fully accessible for free users
  if (cat === 'intro' || cat === 'guide') {
    return { allowed: true };
  }

  // Precis, PYQ, and everything else — locked for free/score-only tiers
  return { allowed: false, reason: 'Upgrade to access this resource' };
}

/**
 * Can user take a quiz/mock test?
 * 
 * Free tier: 1 free attempt (tracked by free_quiz_used flag)
 * SCORE_UNLOCK / SCORE_CV: same as free (no quiz access)
 * MONTHLY and above: unlimited
 * 
 * @param {string} tier
 * @param {boolean} freeQuizUsed - Whether user has already used their free attempt
 * @returns {{ allowed: boolean, isFreeAttempt?: boolean, reason?: string }}
 */
export function canTakeQuiz(tier, freeQuizUsed = false) {
  // Paid tiers (MONTHLY and above) get unlimited
  if ((TIER_RANK[tier] || 0) >= TIER_RANK.MONTHLY) {
    return { allowed: true };
  }

  // Free / SCORE_UNLOCK / SCORE_CV: 1 free attempt
  if (!freeQuizUsed) {
    return { allowed: true, isFreeAttempt: true };
  }

  return { allowed: false, reason: 'You\'ve used your free mock test. Upgrade for unlimited practice.' };
}

/**
 * Should a resource card in the Learning Center show a lock badge?
 * This is a simplified check for card-level display (not chapter-level).
 */
export function isResourceLockedForUser(tier, category) {
  if ((TIER_RANK[tier] || 0) >= TIER_RANK.MONTHLY) return false;

  const cat = (category || '').toLowerCase().trim();

  // Intro & Guide are always free
  if (cat === 'intro' || cat === 'guide') return false;

  // Mock Test — handled separately via canTakeQuiz
  if (cat === 'mock test') return false; // Quiz gating is handled in InteractiveQuiz

  // Precis, PYQ, and everything else is locked
  return true;
}

/**
 * Is the user's current tier higher or equal to a target tier?
 */
export function isTierAtLeast(currentTier, targetTier) {
  return (TIER_RANK[currentTier] || 0) >= (TIER_RANK[targetTier] || 0);
}

/**
 * Merges a freshly-purchased tier with the server-fetched one, keeping
 * whichever ranks higher — used right after an in-place purchase (see
 * useInlineUnlock) so the UI can unlock instantly without a reload/refetch.
 */
export function higherTier(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (TIER_RANK[b] || 0) > (TIER_RANK[a] || 0) ? b : a;
}
