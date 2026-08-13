/**
 * POST /api/points/actions
 *
 * Combines what used to be two separate serverless functions
 * (points/award.js, rewards/redeem.js) into one, purely to stay under
 * Vercel Hobby's 12-function-per-deployment cap — dispatch logic only,
 * the underlying behavior of each is unchanged.
 *
 * Body: { type: 'award', action_code, ref_id?, metadata? }
 *     | { type: 'redeem', reward_id, size?, shipping }
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';
import { POINT_ACTIONS, resolvePoints, buildIdempotencyKey, refTableFor } from '../../backend/points/pointsCatalog.js';

const awardBodySchema = Joi.object({
  type: Joi.string().valid('award').required(),
  action_code: Joi.string().valid(...Object.keys(POINT_ACTIONS)).required(),
  ref_id: Joi.string().max(200).allow(null),
  metadata: Joi.object().default({}),
});

const redeemBodySchema = Joi.object({
  type: Joi.string().valid('redeem').required(),
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

const REDEEM_ERROR_STATUS = {
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

async function handleAward(req, res, user, supabaseAdmin) {
  const { error, value: body } = awardBodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  const cfg = POINT_ACTIONS[body.action_code];
  if (cfg.once === 'target' && !body.ref_id) {
    return res.status(400).json({ ok: false, error: `${body.action_code} requires ref_id` });
  }

  const points = resolvePoints(body.action_code, body.metadata);
  const idempotencyKey = buildIdempotencyKey(body.action_code, body.ref_id);

  const { data, error: rpcError } = await supabaseAdmin.rpc('award_points', {
    p_user_id: user.id,
    p_action_code: body.action_code,
    p_points: points,
    p_idempotency_key: idempotencyKey,
    p_ref_table: body.ref_id ? refTableFor(body.action_code) : null,
    p_ref_id: body.ref_id || null,
    p_metadata: body.metadata || {},
  });

  if (rpcError) {
    console.error('[points/actions:award] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to award points' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return res.status(200).json({
    ok: true,
    awarded: row?.awarded ?? false,
    points_balance: row?.new_balance ?? null,
  });
}

async function handleRedeem(req, res, user, supabaseAdmin) {
  const { error, value: body } = redeemBodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  const { data, error: rpcError } = await supabaseAdmin.rpc('redeem_reward', {
    p_user_id: user.id,
    p_reward_id: body.reward_id,
    p_size: body.size || null,
    p_shipping: body.shipping,
  });

  if (rpcError) {
    const code = (rpcError.message || '').trim();
    if (REDEEM_ERROR_STATUS[code]) {
      return res.status(REDEEM_ERROR_STATUS[code]).json({ ok: false, error: code });
    }
    console.error('[points/actions:redeem] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to redeem reward' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return res.status(200).json({
    ok: true,
    redemption_id: row?.redemption_id ?? null,
    points_balance: row?.new_balance ?? null,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const type = req.body?.type;
  if (type !== 'award' && type !== 'redeem') {
    return res.status(400).json({ ok: false, error: "type must be 'award' or 'redeem'" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Missing session token' });
  }
  const token = authHeader.substring(7);

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error('[points/actions] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid session token' });
  }

  if (type === 'award') return handleAward(req, res, user, supabaseAdmin);
  return handleRedeem(req, res, user, supabaseAdmin);
}
