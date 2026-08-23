#!/usr/bin/env node
/**
 * scripts/create_test_users.mjs
 *
 * Creates a small, deliberately varied set of test candidate accounts
 * (fake mobile numbers 91900000000N, unused -- checked before writing)
 * through the REAL registration + profiling path: generates a valid
 * HMAC registerToken exactly the way api/auth/otp.js does after a real
 * OTP verify (same payload shape, same SUPABASE_JWT_SECRET), POSTs to
 * api/auth/register, signs in for a real session token, then POSTs each
 * profile to api/profile/recommend -- so this exercises the exact same
 * code path a real signup does, not a direct DB insert.
 *
 * Profiles are spread across service branch, qualification, state,
 * medical/physical standing, and career preference to exercise different
 * scoring paths (see backend/engine/scoring.js) rather than all looking
 * like the existing test accounts (which skew Navy/Graduate/Tamil Nadu).
 *
 * Requires `npm run dev` running on :8080 first.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const lines = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const BASE_URL = 'http://localhost:8080';
const PASSWORD = 'TestPass123!';

const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function makeRegisterToken(fullMobile) {
  const payload = `${fullMobile}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(payload).digest('base64');
  return `${Buffer.from(payload).toString('base64')}.${hmac}`;
}

const TEST_PROFILES = [
  {
    mobile: '9000000001',
    profile: {
      fullName: 'Priya Nair', dateOfBirth: '1992-03-15', category: 'OBC', stateOfDomicile: 'Kerala', district: 'Kochi',
      maritalStatus: 'Married', email: 'priya.nair.test@example.com', mobile: '9000000001',
      serviceBranch: 'Indian Army', armCorpsTrade: 'Army Medical Corps (Nursing Assistant)', roleAppointment: 'Havildar',
      totalServiceDuration: '8 years 0 months', militaryCourses: ['Instructor Course'], characterOnDischarge: 'Exemplary',
      specificSkills: ['Patient Care', 'First Aid'],
      highestQualification: 'Post-Graduate', completedDuringService: true, nccCertification: 'C Certificate',
      sportsAchievement: 'National', mathInClass12: true,
      heightCm: 162, weightKg: 58, chestCm: null, chestExpansion: null, vision: '6/6', colourBlind: false,
      medicalCategory: 'SHAPE-1', physicalProficiency: 'Excellent',
      careerPreferences: ['TEACHING', 'BANKING', 'CENTRAL_GOVT'], relocation: 'Anywhere in India', englishComfort: 'Fluent',
      sewaNidhiInterests: ['Skill Training'], consent: true,
    },
  },
  {
    mobile: '9000000002',
    profile: {
      fullName: 'Rakesh Yadav', dateOfBirth: '1988-11-02', category: 'General', stateOfDomicile: 'Uttar Pradesh', district: 'Lucknow',
      maritalStatus: 'Married', email: 'rakesh.yadav.test@example.com', mobile: '9000000002',
      serviceBranch: 'Indian Air Force', armCorpsTrade: 'IAF GROUP C', roleAppointment: 'Corporal',
      totalServiceDuration: '12 years 0 months', militaryCourses: [], characterOnDischarge: 'Very Good',
      specificSkills: ['Electronics', 'Radar Maintenance'],
      highestQualification: 'Class 12', completedDuringService: false, nccCertification: 'None',
      sportsAchievement: 'None', mathInClass12: true,
      heightCm: 170, weightKg: 75, chestCm: 90, chestExpansion: 5, vision: '6/9', colourBlind: false,
      medicalCategory: 'SHAPE-2', physicalProficiency: 'Good',
      careerPreferences: ['POLICE_CAPF', 'RAILWAYS', 'SSC'], relocation: 'Home State', englishComfort: 'Intermediate',
      sewaNidhiInterests: ['Security Agency'], consent: true,
    },
  },
  {
    mobile: '9000000003',
    profile: {
      fullName: 'Simran Kaur', dateOfBirth: '1995-06-20', category: 'General', stateOfDomicile: 'Punjab', district: 'Amritsar',
      maritalStatus: 'Single', email: 'simran.kaur.test@example.com', mobile: '9000000003',
      serviceBranch: 'Indian Navy', armCorpsTrade: 'Executive Branch (Logistics)', roleAppointment: 'Sub Lieutenant',
      totalServiceDuration: '5 years 0 months', militaryCourses: ['Leadership Course'], characterOnDischarge: 'Exemplary',
      specificSkills: ['Supply Chain', 'MS Excel'],
      highestQualification: 'Graduate', completedDuringService: false, nccCertification: 'B Certificate',
      sportsAchievement: 'State', mathInClass12: true,
      heightCm: 165, weightKg: 60, chestCm: null, chestExpansion: null, vision: '6/6', colourBlind: false,
      medicalCategory: 'SHAPE-1', physicalProficiency: 'Excellent',
      careerPreferences: ['BANKING', 'PRIVATE', 'ENTREPRENEURSHIP'], relocation: 'Anywhere in India', englishComfort: 'Fluent',
      sewaNidhiInterests: ['Small Business', 'Transport'], consent: true,
    },
  },
  {
    mobile: '9000000004',
    profile: {
      fullName: 'Manoj Kumar Sahu', dateOfBirth: '1985-01-10', category: 'SC', stateOfDomicile: 'Odisha', district: 'Cuttack',
      maritalStatus: 'Married', email: 'manoj.sahu.test@example.com', mobile: '9000000004',
      serviceBranch: 'Indian Army', armCorpsTrade: 'Infantry (Combat)', roleAppointment: 'Naib Subedar',
      totalServiceDuration: '18 years 0 months', militaryCourses: ['Commando Course', 'Instructor Course'], characterOnDischarge: 'Exemplary',
      specificSkills: ['Weapon Handling', 'Physical Training'],
      highestQualification: 'Class 10', completedDuringService: false, nccCertification: 'None',
      sportsAchievement: 'International/Services', mathInClass12: false,
      heightCm: 175, weightKg: 80, chestCm: 95, chestExpansion: 6, vision: '6/6', colourBlind: false,
      medicalCategory: 'SHAPE-1', physicalProficiency: 'Excellent',
      careerPreferences: ['POLICE_CAPF', 'DEFENCE', 'STATE_GOVT'], relocation: 'Home District', englishComfort: 'Basic',
      sewaNidhiInterests: ['Security Agency'], consent: true,
    },
  },
  {
    mobile: '9000000005',
    profile: {
      fullName: 'Ananya Reddy', dateOfBirth: '1998-09-05', category: 'EWS', stateOfDomicile: 'Telangana', district: 'Hyderabad',
      maritalStatus: 'Single', email: 'ananya.reddy.test@example.com', mobile: '9000000005',
      serviceBranch: 'Indian Air Force', armCorpsTrade: 'Administration & Logistics', roleAppointment: 'Flying Officer',
      totalServiceDuration: '3 years 0 months', militaryCourses: [], characterOnDischarge: 'Good',
      specificSkills: ['Data Analysis', 'Project Management'],
      highestQualification: 'Post-Graduate', completedDuringService: true, nccCertification: 'A Certificate',
      sportsAchievement: 'None', mathInClass12: true,
      heightCm: 160, weightKg: 55, chestCm: null, chestExpansion: null, vision: '6/6', colourBlind: false,
      medicalCategory: 'SHAPE-1', physicalProficiency: 'Satisfactory',
      careerPreferences: ['CENTRAL_GOVT', 'TEACHING', 'ENGINEERING'], relocation: 'Anywhere in India', englishComfort: 'Fluent',
      sewaNidhiInterests: [], consent: true,
    },
  },
];

for (const { mobile, profile } of TEST_PROFILES) {
  const fullMobile = `91${mobile}`;
  console.log(`\n=== ${profile.fullName} (${mobile}) ===`);

  const registerToken = makeRegisterToken(fullMobile);
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password: PASSWORD, registerToken, role: 'candidate' }),
  });
  const regResult = await regRes.json();
  if (!regResult.ok) {
    console.log(`  REGISTER FAILED: ${regResult.error}`);
    continue;
  }
  console.log(`  Registered.`);

  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: `${fullMobile}@veernxt.in`,
    password: PASSWORD,
  });
  if (signInError) { console.log(`  SIGN-IN FAILED: ${signInError.message}`); continue; }

  const recRes = await fetch(`${BASE_URL}/api/profile/recommend?topN=10`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signInData.session.access_token}` },
    body: JSON.stringify(profile),
  });
  const result = await recRes.json();
  if (!result.ok) {
    console.log(`  RECOMMEND FAILED (${recRes.status}): ${JSON.stringify(result.errors || result.error)}`);
    await anon.auth.signOut();
    continue;
  }

  console.log(`  user_id: ${signInData.user.id}`);
  console.log(`  Veer Score: ${Math.round(result.summary.overall_match_score)} | eligible ${result.totalEligible}/${result.totalEligible + result.totalRejected}`);
  console.log(`  Top 5:`);
  for (const r of result.recommendations.slice(0, 5)) {
    console.log(`    ${r.rank}. ${r.exam_name} (${r.conducting_body}) [${r.career_track}] score=${r.score}`);
  }

  await anon.auth.signOut();
}
