/**
 * POST /api/rewards/redeem
 *
 * Body: { reward_id: uuid, size?: string, shipping: { name, phone, line1, line2?, city, state, pincode } }
 *
 * The reward's points_cost is looked up server-side inside the
 * redeem_reward() RPC — the client never supplies a point value.
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';

const bodySchema = Joi.object({
  reward_id: Joi.string().uuid().required(),
  size: Joi.string().max(20).allow('', null),
  shipping: Joi.object({
    name: Joi.string().min(2).max(120).required(),
    phone: Joi.string().pattern(/^[0-9+\-\s]{7,15}$/).required(),
    line1: Joi.string().min(3).max(200).required(),
    line2: Joi.string().max(200).allow('', null),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    pincode: Joi.string().pattern(/^[0-9]{4,10}$/).required(),
  }).required(),
});

const ERROR_STATUS = {
  REWARD_NOT_FOUND: 404,
  REWARD_INACTIVE: 410,
  OUT_OF_STOCK: 409,
  INSUFFICIENT_POINTS: 402,
};

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

  const { error, value: body } = bodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Missing session token' });
  }
  const token = authHeader.substring(7);

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error('[rewards/redeem] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid session token' });
  }

  const { data, error: rpcError } = await supabaseAdmin.rpc('redeem_reward', {
    p_user_id: user.id,
    p_reward_id: body.reward_id,
    p_size: body.size || null,
    p_shipping: body.shipping,
  });

  if (rpcError) {
    const code = (rpcError.message || '').trim();
    if (ERROR_STATUS[code]) {
      return res.status(ERROR_STATUS[code]).json({ ok: false, error: code });
    }
    console.error('[rewards/redeem] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to redeem reward' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return res.status(200).json({
    ok: true,
    redemption_id: row?.redemption_id ?? null,
    points_balance: row?.new_balance ?? null,
  });
}
