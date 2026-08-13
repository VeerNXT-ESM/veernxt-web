/**
 * /api/admin/admins
 *
 * Combines what used to be three separate serverless functions
 * (list-admins.js, invite-admin.js, remove-admin.js) into one, purely to
 * stay under Vercel Hobby's 12-function-per-deployment cap — dispatch
 * logic only, the underlying behavior of each is unchanged.
 *
 * GET                              -> list admins
 * POST { action: 'invite', ... }   -> invite-admin
 * POST { action: 'remove', email } -> remove-admin
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function handleList(req, res) {
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

async function handleInvite(req, res) {
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

async function handleRemove(req, res) {
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

export default async function handler(req, res) {
  if (req.method === 'GET') return handleList(req, res);

  if (req.method === 'POST') {
    const { action } = req.body || {};
    if (action === 'invite') return handleInvite(req, res);
    if (action === 'remove') return handleRemove(req, res);
    return res.status(400).json({ ok: false, error: "action must be 'invite' or 'remove'" });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
