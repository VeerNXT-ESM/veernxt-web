/**
 * /api/admin/redemptions
 *
 * Combines what used to be two separate serverless functions
 * (list-redemptions.js, update-redemption.js) into one, purely to stay
 * under Vercel Hobby's 12-function-per-deployment cap — dispatch logic
 * only, the underlying behavior of each is unchanged.
 *
 * reward_redemptions has RLS restricted to `auth.uid() = user_id` (see
 * sql/rewards_system.sql), and the admin panel has no real Supabase Auth
 * session to satisfy that (see AdminLogin.jsx) — so both branches read
 * through the service-role client instead, gated by the shared
 * x-admin-api-secret header (not real auth — just closes this off from
 * being a fully public read/write API).
 *
 * GET                                  -> list all redemptions
 * POST { redemption_id, status, ... }  -> update redemption status
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';

const updateBodySchema = Joi.object({
  redemption_id: Joi.string().uuid().required(),
  status: Joi.string().valid('approved', 'shipped', 'delivered', 'cancelled').required(),
  tracking_number: Joi.string().max(100).allow('', null),
  courier_name: Joi.string().max(100).allow('', null),
  admin_notes: Joi.string().max(1000).allow('', null),
  cancelled_reason: Joi.string().max(500).allow('', null),
});

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handleList(req, res, supabaseAdmin) {
  const { data, error } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, rewards(name, sku, image_url), user_profiles(full_name, mobile)')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[admin/redemptions:list] Query error:', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to load redemptions' });
  }

  return res.status(200).json({ ok: true, redemptions: data || [] });
}

async function handleUpdate(req, res, supabaseAdmin) {
  const { error, value: body } = updateBodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  const { data, error: rpcError } = await supabaseAdmin.rpc('update_redemption_status', {
    p_redemption_id: body.redemption_id,
    p_new_status: body.status,
    p_tracking_number: body.tracking_number || null,
    p_courier_name: body.courier_name || null,
    p_admin_notes: body.admin_notes || null,
    p_cancelled_reason: body.cancelled_reason || null,
  });

  if (rpcError) {
    console.error('[admin/redemptions:update] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to update redemption' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return res.status(409).json({ ok: false, error: row?.message || 'Update rejected' });
  }

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
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
    console.error('[admin/redemptions] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  if (req.method === 'GET') return handleList(req, res, supabaseAdmin);
  return handleUpdate(req, res, supabaseAdmin);
}
