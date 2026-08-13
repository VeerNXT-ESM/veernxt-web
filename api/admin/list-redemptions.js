/**
 * GET /api/admin/list-redemptions
 *
 * reward_redemptions has RLS restricted to `auth.uid() = user_id` (see
 * sql/rewards_system.sql), and the admin panel has no real Supabase Auth
 * session to satisfy that (see AdminLogin.jsx) — so the admin queue can't
 * read other users' redemptions through the regular anon-key client the
 * way other admin pages read open tables. This endpoint reads through the
 * service-role client instead, gated by the same shared secret as
 * api/admin/update-redemption.js.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error('[admin/list-redemptions] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { data, error } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, rewards(name, sku, image_url), user_profiles(full_name, mobile)')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[admin/list-redemptions] Query error:', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to load redemptions' });
  }

  return res.status(200).json({ ok: true, redemptions: data || [] });
}
