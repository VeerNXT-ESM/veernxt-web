/**
 * POST /api/admin/update-redemption
 *
 * Gated by a shared secret (`x-admin-api-secret` header, must match
 * ADMIN_API_SECRET). This is NOT real authentication — the admin panel
 * has no Supabase Auth session to verify (see AdminLogin.jsx, which is a
 * hardcoded client-side password check with no backend session at all).
 * The secret only raises the bar from "fully public write endpoint" to
 * "requires the value embedded in the admin bundle" — it does not stop
 * someone who has already loaded the admin panel. Fixing that properly
 * means moving AdminLogin.jsx onto real Supabase Auth sessions with a
 * role check, which is a separate, larger change.
 *
 * Body: { redemption_id: uuid, status: 'approved'|'shipped'|'delivered'|'cancelled',
 *         tracking_number?, courier_name?, admin_notes?, cancelled_reason? }
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';

const bodySchema = Joi.object({
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { error, value: body } = bodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error('[admin/update-redemption] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { data, error: rpcError } = await supabaseAdmin.rpc('update_redemption_status', {
    p_redemption_id: body.redemption_id,
    p_new_status: body.status,
    p_tracking_number: body.tracking_number || null,
    p_courier_name: body.courier_name || null,
    p_admin_notes: body.admin_notes || null,
    p_cancelled_reason: body.cancelled_reason || null,
  });

  if (rpcError) {
    console.error('[admin/update-redemption] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to update redemption' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return res.status(409).json({ ok: false, error: row?.message || 'Update rejected' });
  }

  return res.status(200).json({ ok: true });
}
