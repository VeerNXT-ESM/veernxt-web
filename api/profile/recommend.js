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
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkEligibility } from '../engine/eligibility.js';
import { scoreExam } from '../engine/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Profile validation schema ---
const profileSchema = Joi.object({
  fullName:         Joi.string().min(2).required(),
  dateOfBirth:      Joi.date().iso().required(),
  category:         Joi.string().valid('General','OBC','SC','ST','EWS').required(),
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

// --- Load exam master (cached across warm invocations) ---
let EXAM_CACHE = null;
function loadExamMaster() {
  if (EXAM_CACHE) return EXAM_CACHE;
  const masterPath = resolve(__dirname, '../engine/data/exam_master.json');
  EXAM_CACHE = JSON.parse(readFileSync(masterPath, 'utf-8'));
  return EXAM_CACHE;
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

  try {
    const topN = req.query?.topN ? parseInt(req.query.topN) : 10;
    const priorityTracks = req.body.priorityTracks ||
      ['POLICE_CAPF', 'SSC', 'BANKING', 'RAILWAYS', 'ENGINEERING', 'PSU'];

    const master = loadExamMaster();
    const exams = master.exams;

    // 1. Hard eligibility filter
    const survivors = [];
    const rejected = [];
    for (const exam of exams) {
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

    return res.status(200).json(result);
  } catch (e) {
    console.error('Profiling engine error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
