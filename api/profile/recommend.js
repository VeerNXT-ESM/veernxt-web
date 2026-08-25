/**
 * POST /api/profile/recommend
 * 
 * Merged profiling engine — runs eligibility + scoring directly
 * as a Vercel serverless function. No Render dependency.
 * 
 * Body: Profile JSON matching profileSchema (Sections A-G)
 * Query: ?topN=10&live=false
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';
import { checkEligibility } from '../../backend/engine/eligibility.js';
import { scoreExam } from '../../backend/engine/scoring.js';
import { resolvePoints, buildIdempotencyKey } from '../../backend/points/pointsCatalog.js';

// --- Profile validation schema ---
const profileSchema = Joi.object({
  fullName:         Joi.string().min(2).required(),
  dateOfBirth:      Joi.date().iso().required(),
  category:         Joi.string().valid('General','OBC','SC','ST','EWS').required(),
  disabilityStatus: Joi.string().valid('No','Yes').required(),
  disabilityType:   Joi.string().valid('Locomotor','Visual','Hearing','Intellectual','Multiple','Other').allow('', null),
  disabilityPercentage: Joi.string().valid('40-49%','50-69%','70-100%').allow('', null),
  stateOfDomicile:  Joi.string().required(),
  district:         Joi.string().allow('', null),
  maritalStatus:    Joi.string().valid('Single','Married').required(),
  email:            Joi.string().email().required(),
  mobile:           Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required(),

  serviceBranch:    Joi.string().valid('Indian Army','Indian Navy','Indian Air Force').required(),
  armCorpsTrade:    Joi.string().required(),
  roleAppointment:  Joi.string().required(),
  totalServiceDuration: Joi.string().required(),
  militaryCourses:  Joi.array().items(Joi.string()).default([]),
  characterOnDischarge: Joi.string().valid('Exemplary','Very Good','Good').required(),
  specificSkills:   Joi.array().items(Joi.string()).default([]),

  highestQualification: Joi.string().valid('Class 10','Class 12','Graduate','Post-Graduate').required(),
  completedDuringService: Joi.boolean().default(false),
  nccCertification: Joi.string().valid('None','A Certificate','B Certificate','C Certificate').default('None'),
  sportsAchievement: Joi.string().valid('None','District','State','National','International/Services').default('None'),
  mathInClass12:    Joi.boolean().default(false),

  heightCm:         Joi.number().min(100).max(250).required(),
  weightKg:         Joi.number().min(30).max(200).allow(null),
  chestCm:          Joi.number().allow(null),
  chestExpansion:   Joi.number().allow(null),
  vision:           Joi.string().allow('', null),
  colourBlind:      Joi.boolean().default(false),
  medicalCategory:  Joi.string().default('SHAPE-1'),
  physicalProficiency: Joi.string().valid('Excellent','Good','Satisfactory').default('Good'),

  careerPreferences: Joi.array().items(Joi.string()).min(1).required(),
  relocation:       Joi.string().valid('Home District','Home State','Anywhere in India').default('Home State'),
  englishComfort:   Joi.string().valid('Basic','Intermediate','Fluent').default('Basic'),

  sewaNidhiInterests: Joi.array().items(Joi.string()).default([]),
  consent:          Joi.boolean().valid(true).required(),
});

// --- Fetch exams from Supabase with pre-filtering for scalability ---
// Cache the full exam list once per warm invocation, then JS-filter per profile.
let EXAM_CACHE = null;
let SUPABASE_CLIENT = null;

function getSupabaseClient() {
  if (SUPABASE_CLIENT) return SUPABASE_CLIENT;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  SUPABASE_CLIENT = createClient(url, key, { auth: { persistSession: false } });
  return SUPABASE_CLIENT;
}

async function loadAllExams() {
  if (EXAM_CACHE) return EXAM_CACHE;
  const client = getSupabaseClient();
  console.log('[recommend] Loading all exams from Supabase (cold start)...');
  // Unranged .select('*') is silently capped at 1,000 rows by PostgREST --
  // with 1,534 exams in the table, this was truncating the pool for any
  // profile that isn't domicile-filtered down below 1,000 (e.g. relocation
  // === 'Anywhere in India'), same bug already found/fixed for
  // AdminDashboard.jsx's resource fetch (status_report.md §4).
  let rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client.from('exams').select('*').range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to fetch exams: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  EXAM_CACHE = rows.map(row => ({
    ...(row.metadata || {}),
    exam_id:          row.exam_id,
    exam_name:        row.exam_name,
    conducting_body:  row.conducting_body,
    career_track:     row.career_track,
    state_ut:         row.state_ut,
    website:          row.base_url || row.metadata?.website || null,
    level:            row.metadata?.level || null,
    domicile_required: row.is_state_specific ?? row.metadata?.domicile_required ?? false,
  }));
  console.log(`[recommend] Cached ${EXAM_CACHE.length} exams.`);
  return EXAM_CACHE;
}

// Qualification rank map (mirrors eligibility.js QUAL_RANK)
const QUAL_RANK_MAP = { 'Class 10': 1, 'Class 12': 2, 'Graduate': 3, 'Post-Graduate': 4 };
const QUAL_DB_RANK  = { '10': 1, '12': 2, 'graduate': 3, 'post_graduate': 4 };

/**
 * Returns the subset of exams that CANNOT be ruled out by fast JS checks.
 * This is not the full eligibility logic — checkEligibility() still runs after —
 * but it drops the largest bulk of ineligible exams before the scoring loop.
 */
async function fetchPreFilteredExams(profile) {
  const allExams = await loadAllExams();
  const userQualRank = QUAL_RANK_MAP[profile.highestQualification] || 0;
  const isNonSHAPE1  = profile.medicalCategory && profile.medicalCategory !== 'SHAPE-1';
  const wantsAnyState = profile.relocation === 'Anywhere in India';
  const userState    = (profile.stateOfDomicile || '').toLowerCase().trim();

  return allExams.filter(exam => {
    // 1. Qualification pre-filter: drop exams whose requirement exceeds user's level
    const needRank = QUAL_DB_RANK[exam.min_qualification] || 0;
    if (needRank && userQualRank < needRank) return false;

    // 2. Physical pre-filter: drop physical-required exams if user is non-SHAPE-1
    if (isNonSHAPE1 && exam.physical_required) return false;

    // 3. Domicile pre-filter: drop state exams from other states (unless open to all India)
    if (!wantsAnyState && exam.domicile_required && exam.state_ut) {
      const examState = (exam.state_ut || '').toLowerCase().trim();
      if (examState && examState !== userState) return false;
    }

    return true;
  });
}

function summariseProfile(p) {
  return {
    name: p.fullName,
    branch: p.serviceBranch,
    trade: p.armCorpsTrade,
    qualification: p.highestQualification,
    domicile: p.stateOfDomicile,
    character: p.characterOnDischarge,
    preferences: p.careerPreferences,
  };
}

// Buckets checkEligibility()'s human-readable rejection reasons (which were
// previously computed and then discarded — only the count reached the
// client) into a small set of actionable "skill gap" categories for the
// results page. Real, data-derived signal from the actual exam pool, not a
// fabricated score.
function summariseSkillGaps(rejected, userQualification) {
  let qualificationCount = 0;
  let domicileCount = 0;
  let physicalCount = 0;

  for (const { reasons } of rejected) {
    for (const reason of reasons) {
      if (reason.startsWith('needs ')) qualificationCount += 1;
      else if (reason.startsWith('state-only exam') || reason === 'state of domicile missing') domicileCount += 1;
      else if (reason.startsWith('physical')) physicalCount += 1;
    }
  }

  const gaps = [];
  if (qualificationCount > 0) {
    gaps.push({
      label: 'Qualification Gap',
      detail: `${qualificationCount} exam${qualificationCount === 1 ? '' : 's'} you're currently ineligible for require a higher qualification than your ${userQualification || 'current level'} — completing the next level could open these up.`,
      blockedCount: qualificationCount,
    });
  }
  if (domicileCount > 0) {
    gaps.push({
      label: 'Relocation Opportunity',
      detail: `${domicileCount} state-specific exam${domicileCount === 1 ? '' : 's'} are outside your home state — opting into "Anywhere in India" would open these up.`,
      blockedCount: domicileCount,
    });
  }
  if (physicalCount > 0) {
    gaps.push({
      label: 'Physical Standards Gap',
      detail: `${physicalCount} exam${physicalCount === 1 ? '' : 's'} require physical/medical standards your profile doesn't currently meet.`,
      blockedCount: physicalCount,
    });
  }

  return gaps.sort((a, b) => b.blockedCount - a.blockedCount).slice(0, 3);
}

function diversify(scored, topN, capPerTrack) {
  const out = [];
  const counts = {};
  for (const row of scored) {
    const t = row.exam.career_track;
    if ((counts[t] || 0) >= capPerTrack) continue;
    out.push(row);
    counts[t] = (counts[t] || 0) + 1;
    if (out.length >= topN) break;
  }
  if (out.length < topN) {
    const chosen = new Set(out.map(r => r.exam.exam_id));
    for (const row of scored) {
      if (chosen.has(row.exam.exam_id)) continue;
      out.push(row);
      if (out.length >= topN) break;
    }
  }
  return out;
}

export default async function handler(req, res) {
  // Allow GET for health check
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      name: 'VeerNXT Profiling Engine (Vercel)',
      version: '2.0.0',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Validate profile
  const { error, value: profile } = profileSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({ ok: false, errors: error.details });
  }

  // Extract and verify Supabase authorization token
  const authHeader = req.headers.authorization;
  let userId = null;
  let supabaseAdmin = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { persistSession: false }
        }
      );
      try {
        console.log('[recommend] Verifying authorization token...');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError) {
          console.error('[recommend] Token verification failed:', authError.message);
          return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid session token' });
        }
        if (user) {
          userId = user.id;
          console.log('[recommend] Authenticated user ID:', userId);
        }
      } catch (err) {
        console.error('[recommend] Exception during token verification:', err);
        return res.status(401).json({ ok: false, error: 'Unauthorized: Failed to verify token' });
      }
    }
  }

  try {
    let topN = req.query?.topN ? parseInt(req.query.topN) : 10;
    // Bound topN to prevent memory/payload exhaustion attack vectors
    topN = Math.min(Math.max(1, topN), 50);
    const priorityTracks = req.body.priorityTracks ||
      ['POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'ENGINEERING', 'PSU'];

    // Pre-filter in JS using fast checks (qual rank, physical, domicile).
    // This replaces the blind for...of loop over all exams with a much smaller
    // candidate set before the full checkEligibility() pass.
    const preFiltered = await fetchPreFilteredExams(profile);
    console.log(`[recommend] Pre-filter: ${preFiltered.length} exams passed (from ${(await loadAllExams()).length} total).`);

    // 1. Hard eligibility filter on the pre-filtered set only
    const survivors = [];
    const rejected = [];
    for (const exam of preFiltered) {
      const e = checkEligibility(profile, exam);
      if (e.eligible) survivors.push(exam);
      else rejected.push({ exam_id: exam.exam_id, reasons: e.reasons });
    }

    // 2. Score survivors
    const scored = survivors.map(exam => {
      const { score, breakdown } = scoreExam(profile, exam, { priorityTracks });
      return { exam, score, breakdown };
    });

    // 3. Rank
    scored.sort((a, b) => b.score - a.score);

    // Calculate overall readiness (Veer Score) as average of top 3 matches
    let overall_match_score = 0;
    if (scored.length > 0) {
      const topScores = scored.slice(0, 3).map(r => r.score);
      overall_match_score = topScores.reduce((a, b) => a + b, 0) / topScores.length;
    }

    // 4. Diversify
    const diversified = diversify(scored, topN, 4);

    // 5. Build response
    const result = {
      ok: true,
      summary: {
        overall_match_score: overall_match_score
      },
      profileSummary: summariseProfile(profile),
      totalEligible: survivors.length,
      totalRejected: rejected.length,
      skillGaps: summariseSkillGaps(rejected, profile.highestQualification),
      recommendations: diversified.map((r, i) => ({
        rank: i + 1,
        exam_id:         r.exam.exam_id,
        exam_name:       r.exam.exam_name,
        conducting_body: r.exam.conducting_body,
        level:           r.exam.level,
        state_ut:        r.exam.state_ut,
        career_track:    r.exam.career_track,
        website:         r.exam.website,
        score:           Math.round(r.score * 10) / 10,
        breakdown:       r.breakdown,
        eligibilityFlags: {
          ex_servicemen_quota:  r.exam.ex_servicemen_quota,
          ncc_bonus:            r.exam.ncc_bonus,
          physical_required:    r.exam.physical_required,
          min_qualification:    r.exam.min_qualification,
          domicile_required:    r.exam.domicile_required,
        },
      })),
    };

    // 6. Write securely to database if user is authenticated
    if (userId && supabaseAdmin) {
      console.log('[recommend] Securely saving profile scoring to database for user:', userId);
      let yearsOfService = 0;
      const match = profile.totalServiceDuration ? profile.totalServiceDuration.match(/^(\d+)\s*years?/i) : null;
      if (match) {
        yearsOfService = parseInt(match[1]);
      }

      const { error: dbError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: userId,
          raw_profile_data: profile,
          recommendations: result.recommendations,
          veer_score: Math.round(overall_match_score),
          profiling_completed: true,
          updated_at: new Date().toISOString(),

          // Map profile fields to structured database columns
          full_name: profile.fullName,
          rank: profile.roleAppointment,
          service_branch: profile.serviceBranch,
          years_of_service: yearsOfService,
          education_level: profile.highestQualification,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg || null,
          chest_cm: profile.chestCm || null,
          trade: profile.armCorpsTrade,
          preferred_states: JSON.stringify([profile.stateOfDomicile]),
          preferred_sectors: JSON.stringify(profile.careerPreferences || []),
          preferred_job_types: JSON.stringify([profile.relocation]),
          skills: JSON.stringify(profile.specificSkills || []),
          consent_given: !!profile.consent,
          consent_timestamp: new Date().toISOString()
        });

      if (dbError) {
        console.error('[recommend] Secure database upsert failed:', dbError.message);
        return res.status(500).json({ ok: false, error: 'Failed to save recommendations to database' });
      }
      console.log('[recommend] Profile scoring securely updated in DB.');

      // Award profiling-completion points (idempotency key = action code
      // alone, so re-running via Dashboard's "Recalculate" doesn't re-award).
      try {
        const { data: pointsRow, error: pointsError } = await supabaseAdmin.rpc('award_points', {
          p_user_id: userId,
          p_action_code: 'PROFILING_COMPLETE',
          p_points: resolvePoints('PROFILING_COMPLETE'),
          p_idempotency_key: buildIdempotencyKey('PROFILING_COMPLETE'),
        });
        if (pointsError) {
          console.error('[recommend] award_points RPC failed:', pointsError.message);
        } else {
          const row = Array.isArray(pointsRow) ? pointsRow[0] : pointsRow;
          result.pointsAwarded = row?.awarded ? resolvePoints('PROFILING_COMPLETE') : 0;
          result.pointsBalance = row?.new_balance ?? null;
        }
      } catch (pointsErr) {
        console.error('[recommend] Exception awarding profiling points:', pointsErr);
      }
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error('Profiling engine error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
