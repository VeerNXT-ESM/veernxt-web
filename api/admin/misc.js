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
 *
 * fn=content-writes  (lc_subjects / pyq_questions have RLS on with public read only,
 *                     so admin edits go through the service role here):
 *   POST { action: 'subject-thumbnail', key, label, color_family, thumbnail_url }
 *   POST { action: 'pyq-questions-replace', paper_id, questions: [...] }
 *   POST { action: 'table-write', table, op, values, options, filters, select }
 *        generic insert/update/upsert/delete for the lc_* catalogue tables + pyq_papers
 *        (see WRITABLE_TABLES); reached from the browser via src/lib/adminDb.js
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
// fn=content-writes
//
// lc_subjects and pyq_questions have RLS enabled with a public-read policy only
// (sql/lc_subjects_pyq_questions_rls.sql), so the anon key can no longer write
// them. The two admin pages that edit them post here instead. Gated by the same
// shared x-admin-api-secret header as fn=redemptions (not real auth).
// ---------------------------------------------------------------------

const subjectSchema = Joi.object({
  action: Joi.string().valid('subject-thumbnail').required(),
  key: Joi.string().max(100).required(),
  label: Joi.string().max(200).required(),
  color_family: Joi.string().max(100).allow('', null),
  thumbnail_url: Joi.string().max(2000).allow('', null),
});

const pyqSchema = Joi.object({
  action: Joi.string().valid('pyq-questions-replace').required(),
  paper_id: Joi.string().uuid().required(),
  questions: Joi.array().max(2000).items(Joi.object({
    question_number: Joi.number().integer().required(),
    question_text: Joi.string().allow('').required(),
    options: Joi.object().required(),
    correct_answer: Joi.string().allow('', null),
    explanation: Joi.string().allow('', null),
  })).required(),
});

// Tables the admin panel edits from the browser. RLS is on for all of them with a public-read policy
// only (sql/lc_tables_rls.sql), so every write goes through this route with the service role.
const WRITABLE_TABLES = [
  'lc_conducting_bodies', 'lc_exam_categories', 'lc_exam_intro', 'lc_exam_quiz_map', 'lc_exam_resource_map',
  'lc_exam_tags', 'lc_exams', 'lc_reader_themes', 'lc_regions', 'lc_tags', 'lc_thumbnail_templates', 'pyq_papers',
];
const IDENT = /^[a-z_][a-z0-9_]*$/;
const tableWriteSchema = Joi.object({
  action: Joi.string().valid('table-write').required(),
  table: Joi.string().valid(...WRITABLE_TABLES).required(),
  op: Joi.string().valid('insert', 'update', 'upsert', 'delete').required(),
  values: Joi.alternatives(Joi.object(), Joi.array().max(5000).items(Joi.object())).when('op', { is: 'delete', then: Joi.forbidden(), otherwise: Joi.required() }),
  options: Joi.object({ onConflict: Joi.string().pattern(/^[a-z_][a-z0-9_,]*$/) }).default({}),
  filters: Joi.array().max(10).items(Joi.object({
    type: Joi.string().valid('eq', 'in').required(),
    column: Joi.string().pattern(IDENT).required(),
    value: Joi.when('type', { is: 'in', then: Joi.array().max(20000).items(Joi.alternatives(Joi.string(), Joi.number())).required(), otherwise: Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean()).required() }),
  })).default([]),
  select: Joi.string().pattern(/^[a-z0-9_,*\s]+$/i).allow(null),
});

async function handleTableWrite(req, res, supabaseAdmin) {
  const { error, value } = tableWriteSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ ok: false, error: { message: error.message } });
  // A bare update/delete would hit every row -- always require at least one filter.
  if ((value.op === 'update' || value.op === 'delete') && value.filters.length === 0) {
    return res.status(400).json({ ok: false, error: { message: `${value.op} requires at least one filter` } });
  }
  let q = supabaseAdmin.from(value.table);
  if (value.op === 'insert') q = q.insert(value.values);
  else if (value.op === 'update') q = q.update(value.values);
  else if (value.op === 'upsert') q = q.upsert(value.values, value.options?.onConflict ? { onConflict: value.options.onConflict } : undefined);
  else q = q.delete();
  for (const f of value.filters) q = f.type === 'in' ? q.in(f.column, f.value) : q.eq(f.column, f.value);
  if (value.select) q = q.select(value.select);
  const { data, error: dbErr } = await q;
  if (dbErr) {
    console.error(`[admin/misc:table-write:${value.table}.${value.op}]`, dbErr.message);
    return res.status(200).json({ ok: true, data: null, error: { message: dbErr.message, code: dbErr.code, details: dbErr.details } });
  }
  return res.status(200).json({ ok: true, data: data ?? null, error: null });
}

async function routeContentWrites(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const expectedSecret = process.env.ADMIN_API_SECRET;
  if (!expectedSecret || req.headers['x-admin-api-secret'] !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return res.status(500).json({ ok: false, error: 'Server misconfiguration' });

  const action = req.body?.action;

  if (action === 'table-write') return handleTableWrite(req, res, supabaseAdmin);

  if (action === 'subject-thumbnail') {
    const { error, value } = subjectSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ ok: false, error: error.message });
    const { error: dbErr } = await supabaseAdmin.from('lc_subjects').upsert({
      key: value.key, label: value.label, color_family: value.color_family || null, thumbnail_url: value.thumbnail_url || null,
    }, { onConflict: 'key' });
    if (dbErr) { console.error('[admin/misc:content-writes:subject]', dbErr.message); return res.status(500).json({ ok: false, error: 'Failed to save subject' }); }
    return res.status(200).json({ ok: true });
  }

  if (action === 'pyq-questions-replace') {
    const { error, value } = pyqSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ ok: false, error: error.message });
    try {
      // Insert the new rows first and delete the old ones only after that succeeded,
      // so a failed insert can never leave the paper with no questions.
      const { data: old, error: oldErr } = await supabaseAdmin.from('pyq_questions').select('id').eq('paper_id', value.paper_id);
      if (oldErr) throw oldErr;
      const rows = value.questions.map((q) => ({
        paper_id: value.paper_id, question_number: q.question_number, question_text: q.question_text,
        options: q.options, correct_answer: q.correct_answer || null, explanation: q.explanation || null,
      }));
      if (rows.length) { const { error: insErr } = await supabaseAdmin.from('pyq_questions').insert(rows); if (insErr) throw insErr; }
      const oldIds = (old || []).map((r) => r.id);
      for (let i = 0; i < oldIds.length; i += 200) {
        const { error: delErr } = await supabaseAdmin.from('pyq_questions').delete().in('id', oldIds.slice(i, i + 200)); if (delErr) throw delErr;
      }
      const { error: cErr } = await supabaseAdmin.from('pyq_papers').update({ total_questions: rows.length }).eq('id', value.paper_id);
      if (cErr) throw cErr;
      return res.status(200).json({ ok: true, total_questions: rows.length });
    } catch (err) {
      console.error('[admin/misc:content-writes:pyq]', err.message);
      return res.status(500).json({ ok: false, error: 'Failed to save questions' });
    }
  }

  return res.status(400).json({ ok: false, error: "action must be 'subject-thumbnail', 'pyq-questions-replace' or 'table-write'" });
}

// ---------------------------------------------------------------------

export default async function handler(req, res) {
  const fn = req.query?.fn;
  if (fn === 'admins') return routeAdmins(req, res);
  if (fn === 'redemptions') return routeRedemptions(req, res);
  if (fn === 'content-writes') return routeContentWrites(req, res);
  return res.status(400).json({ ok: false, error: "Missing or unknown ?fn= (expected 'admins', 'redemptions' or 'content-writes')" });
}
