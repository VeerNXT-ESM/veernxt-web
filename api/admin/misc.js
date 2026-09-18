/**
 * /api/admin/misc
 *
 * Combines what used to be two separate serverless functions
 * (admins.js, redemptions.js -- each already a prior consolidation of
 * three and two functions respectively) into one, purely to stay under
 * Vercel Hobby's 12-function-per-deployment cap -- dispatch logic only,
 * the underlying behavior of each is unchanged. Reached via vercel.json's
 * rewrites (?fn=admins / ?fn=redemptions), so the frontend still calls
 * /api/admin/admins and /api/admin/redemptions unchanged.
 *
 * fn=admins:
 *   GET                              -> list admins
 *   POST { action: 'invite', ... }   -> invite-admin
 *   POST { action: 'remove', email } -> remove-admin
 *
 * fn=redemptions:
 *   GET                                  -> list all redemptions
 *   POST { redemption_id, status, ... }  -> update redemption status
 */

import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------
// fn=admins
// ---------------------------------------------------------------------

async function handleAdminsList(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const admins = users.users
      .filter(u => u.user_metadata?.role && ['Super Admin', 'Content Curator', 'Employer Partner', 'Employer'].includes(u.user_metadata.role))
      .map(u => ({
        id: u.id,
        name: u.user_metadata?.name || u.email.split('@')[0],
        email: u.email,
        role: u.user_metadata?.role,
        permissions: u.user_metadata?.permissions || [],
      }));

    if (!admins.some(a => a.email === 'veernxt.esm@gmail.com')) {
      admins.unshift({
        id: 'super-admin-placeholder',
        name: 'Vivek Talwar',
        email: 'veernxt.esm@gmail.com',
        role: 'Super Admin',
        permissions: ['all']
      });
    }

    return res.status(200).json({ ok: true, admins });
  } catch (err) {
    console.error('Error fetching admins:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch admins' });
  }
}

async function handleAdminInvite(req, res) {
  const { email, name, role, permissions } = req.body || {};
  if (!email || !role) {
    return res.status(400).json({ ok: false, error: 'Email and role are required' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name, role: role, permissions: permissions || [] }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...existingUser.user_metadata,
              name: name || existingUser.user_metadata.name,
              role: role,
              permissions: permissions || []
            }
          });
          if (updateError) throw updateError;
          return res.status(200).json({ ok: true, message: 'Existing user upgraded to admin successfully', tempPassword: null });
        }
      }
      throw error;
    }

    return res.status(200).json({
      ok: true,
      message: 'Administrator created successfully',
      tempPassword: tempPassword
    });
  } catch (err) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to create administrator' });
  }
}

async function handleAdminRemove(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required' });
  }
  if (email.toLowerCase() === 'veernxt.esm@gmail.com') {
    return res.status(403).json({ ok: false, error: 'Cannot remove the primary Super Admin' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });

  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'candidate', permissions: [] }
    });
    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, message: 'Administrator privileges revoked successfully' });
  } catch (err) {
    console.error('Error removing admin:', err);
    return res.status(500).json({ ok: false, error: 'Failed to revoke privileges' });
  }
}

async function routeAdmins(req, res) {
  if (req.method === 'GET') return handleAdminsList(req, res);

  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'invite') return handleAdminInvite(req, res);
    if (action === 'remove') return handleAdminRemove(req, res);
    return res.status(400).json({ ok: false, error: "action must be 'invite' or 'remove'" });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

// ---------------------------------------------------------------------
// fn=redemptions
//
// reward_redemptions has RLS restricted to `auth.uid() = user_id` (see
// sql/rewards_system.sql), and the admin panel has no real Supabase Auth
// session to satisfy that (see AdminLogin.jsx) -- so both branches read
// through the service-role client instead, gated by the shared
// x-admin-api-secret header (not real auth -- just closes this off from
// being a fully public read/write API).
// ---------------------------------------------------------------------

const updateBodySchema = Joi.object({
  redemption_id: Joi.string().uuid().required(),
  status: Joi.string().valid('approved', 'shipped', 'delivered', 'cancelled').required(),
  tracking_number: Joi.string().max(100).allow('', null),
  courier_name: Joi.string().max(100).allow('', null),
  admin_notes: Joi.string().max(1000).allow('', null),
  cancelled_reason: Joi.string().max(500).allow('', null),
});

async function handleRedemptionsList(req, res, supabaseAdmin) {
  const { data, error } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, rewards(name, sku, image_url), user_profiles(full_name, mobile)')
    .order('requested_at', { ascending: false });

  if (error) {
    console.error('[admin/misc:redemptions:list] Query error:', error.message);
    return res.status(500).json({ ok: false, error: 'Failed to load redemptions' });
  }

  return res.status(200).json({ ok: true, redemptions: data || [] });
}

async function handleRedemptionUpdate(req, res, supabaseAdmin) {
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
    console.error('[admin/misc:redemptions:update] RPC error:', rpcError.message);
    return res.status(500).json({ ok: false, error: 'Failed to update redemption' });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return res.status(409).json({ ok: false, error: row?.message || 'Update rejected' });
  }

  return res.status(200).json({ ok: true });
}

async function routeRedemptions(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: 'Server misconfiguration' });

  if (req.method === 'GET') return handleRedemptionsList(req, res, supabaseAdmin);
  return handleRedemptionUpdate(req, res, supabaseAdmin);
}

// ---------------------------------------------------------------------

export default async function handler(req, res) {
  const fn = req.query?.fn;
  if (fn === 'admins') return routeAdmins(req, res);
  if (fn === 'redemptions') return routeRedemptions(req, res);
  return res.status(400).json({ ok: false, error: "Missing or unknown ?fn= (expected 'admins' or 'redemptions')" });
}
