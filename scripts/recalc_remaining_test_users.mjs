#!/usr/bin/env node
/**
 * scripts/recalc_remaining_test_users.mjs
 *
 * Recalculates recommendations for every profiling_completed user (except
 * the primary test account, already done for real via
 * scripts/recalc_primary_test_user.mjs, which has a real password to sign
 * in with). No passwords are known for these other accounts, so this POSTs
 * each one's raw_profile_data to /api/profile/recommend WITHOUT an auth
 * header -- the handler still runs the real eligibility/scoring pipeline
 * and returns a full result, it just skips its own DB write when
 * unauthenticated (see api/profile/recommend.js:334, `if (userId &&
 * supabaseAdmin)`). This script does that write itself afterward, using
 * the identical shape the endpoint would have written, via service role.
 *
 * Requires `npm run dev` running on :8080 first.
 *
 * Usage:
 *   node scripts/recalc_remaining_test_users.mjs            # dry run (prints only)
 *   node scripts/recalc_remaining_test_users.mjs --execute  # writes
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

const EXECUTE = process.argv.includes('--execute');
const PRIMARY_TEST_ID = '002a2151-e697-453a-b84e-941bb83bf0c4';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: profiles, error } = await admin
  .from('user_profiles')
  .select('id,full_name,veer_score,raw_profile_data')
  .eq('profiling_completed', true)
  .neq('id', PRIMARY_TEST_ID);
if (error) throw error;

console.log(`Recalculating ${profiles.length} profiles...\n`);

for (const p of profiles) {
  if (!p.raw_profile_data || !p.raw_profile_data.consent) {
    console.log(`${p.full_name || p.id}: SKIPPED (no usable raw_profile_data)`);
    continue;
  }

  const res = await fetch('http://localhost:8080/api/profile/recommend?topN=10', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p.raw_profile_data),
  });
  const result = await res.json();

  if (!result.ok) {
    console.log(`${p.full_name || p.id}: FAILED (${res.status}) ${JSON.stringify(result.errors || result.error)}`);
    continue;
  }

  const newScore = Math.round(result.summary.overall_match_score);
  console.log(`${p.full_name || p.id} (${p.id}): veer_score ${p.veer_score} -> ${newScore} | eligible ${result.totalEligible}/${result.totalEligible + result.totalRejected} | top: ${result.recommendations[0]?.exam_name || 'none'}`);

  if (!EXECUTE) continue;

  let yearsOfService = 0;
  const m = p.raw_profile_data.totalServiceDuration ? p.raw_profile_data.totalServiceDuration.match(/^(\d+)\s*years?/i) : null;
  if (m) yearsOfService = parseInt(m[1]);

  const { error: upErr } = await admin.from('user_profiles').update({
    recommendations: result.recommendations,
    veer_score: newScore,
    updated_at: new Date().toISOString(),
  }).eq('id', p.id);
  if (upErr) console.error(`  FAILED to persist: ${upErr.message}`);
}

if (!EXECUTE) console.log('\nDry run only -- no writes made. Re-run with --execute to apply.');
