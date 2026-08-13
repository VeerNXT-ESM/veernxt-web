/**
 * POST /api/points/award
 *
 * Generic points-award endpoint for once-per-target actions (opening a
 * resource, completing a quiz). One-time-per-user actions with their own
 * richer flow (profiling completion) award inline in their own handler
 * instead of round-tripping here — see api/profile/recommend.js.
 *
 * Body: { action_code: string, ref_id?: uuid, metadata?: object }
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';
import { POINT_ACTIONS, resolvePoints, buildIdempotencyKey, refTableFor } from '../../backend/points/pointsCatalog.js';

const bodySchema = Joi.object({
  action_code: Joi.string().valid(...Object.keys(POINT_ACTIONS)).required(),
  ref_id: Joi.string().max(200).allow(null),
  metadata: Joi.object().default({}),
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

  const { error, value: body } = bodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) return res.status(400).json({ ok: false, errors: error.details });

  const cfg = POINT_ACTIONS[body.action_code];
  if (cfg.once === 'target' && !body.ref_id) {
    return res.status(400).json({ ok: false, error: `${body.action_code} requires ref_id` });
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
    console.error('[points/award] Config error:', err.message);
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: Invalid session token' });
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
    console.error('[points/award] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to award points' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return res.status(200).json({
    ok: true,
    awarded: row?.awarded ?? false,
    points_balance: row?.new_balance ?? null,
  });
}
