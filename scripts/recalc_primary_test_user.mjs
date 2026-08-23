#!/usr/bin/env node
/**
 * scripts/recalc_primary_test_user.mjs
 *
 * Full real-path recalculation for the primary test account (9884050857 /
 * coder123): signs in via Supabase Auth to get a real session token (same
 * as the live app would), POSTs the account's existing raw_profile_data to
 * the actual /api/profile/recommend endpoint (via the local dev server, so
 * the real handler code runs end to end -- auth verification, eligibility/
 * scoring against the rebuilt exams table, DB write-back, points RPC), and
 * prints the result. Requires `npm run dev` running on :8080 first.
 */
import fs from 'node:fs';
import path from 'node:path';
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

const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
  email: '919884050857@veernxt.in',
  password: 'coder123',
});
if (signInError) throw signInError;
console.log('Signed in as:', signInData.user.id);

const { data: profileRow } = await admin.from('user_profiles').select('raw_profile_data').eq('id', signInData.user.id).single();
const profile = profileRow.raw_profile_data;

const res = await fetch('http://localhost:8080/api/profile/recommend?topN=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signInData.session.access_token}` },
  body: JSON.stringify(profile),
});
const result = await res.json();

console.log('HTTP status:', res.status);
console.log('ok:', result.ok);
console.log('overall_match_score (Veer Score):', result.summary?.overall_match_score);
console.log('totalEligible:', result.totalEligible, '| totalRejected:', result.totalRejected);
console.log('skillGaps:', JSON.stringify(result.skillGaps));
console.log('\nTop recommendations:');
for (const r of result.recommendations || []) {
  console.log(`  ${r.rank}. ${r.exam_name} (${r.conducting_body}) | track=${r.career_track} | score=${r.score} | breakdown=${JSON.stringify(r.breakdown)}`);
}

await anon.auth.signOut();
