import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAnon() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ALLOWED_ADMIN_ROLES = ['Super Admin', 'Admin', 'Content Curator', 'Employer Partner', 'Employer'];

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  let cleaned = email.trim().toLowerCase();
  // Handle user typo: admin@gargee@veernxt.in -> admin.gargee@veernxt.in
  if (cleaned.includes('admin@gargee@veernxt.in') || cleaned.includes('admin@gargee')) {
    cleaned = cleaned.replace(/admin@gargee(@veernxt\.in)?/g, 'admin.gargee@veernxt.in');
  }
  // If multiple @ symbols exist, keep first part and domain
  const atParts = cleaned.split('@');
  if (atParts.length > 2) {
    cleaned = atParts.slice(0, atParts.length - 1).join('.') + '@' + atParts[atParts.length - 1];
  }
  return cleaned;
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

async function verifyAdminToken(token, supabaseAdmin) {
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const role = user.user_metadata?.role;
  if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) return null;
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const supabaseAdmin = getSupabaseAdmin();
  const supabaseAnon = getSupabaseAnon();

  if (!supabaseAdmin || !supabaseAnon) {
    return res.status(500).json({ ok: false, error: 'Database / Auth configuration missing' });
  }

  const action = req.body?.action || req.query?.action || (req.method === 'GET' ? 'me' : null);

  // ---------------------------------------------------------
  // 1. LOGIN
  // ---------------------------------------------------------
  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' });
    }

    const cleanEmail = normalizeEmail(email);

    // Authenticate credentials against Supabase Auth
    let { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password),
    });

    // Handle both 123456789 (standard 1-9) and 1234556789 (double-5 typo variant)
    if (authError && (password === '123456789' || password === '1234556789')) {
      const altPassword = password === '123456789' ? '1234556789' : '123456789';
      const retry = await supabaseAnon.auth.signInWithPassword({
        email: cleanEmail,
        password: altPassword,
      });
      if (!retry.error && retry.data?.user) {
        authData = retry.data;
        authError = null;
      }
    }

    if (authError || !authData?.user) {
      console.warn('[admin/auth:login] Authentication failed for email:', cleanEmail, authError?.message);
      return res.status(401).json({ ok: false, error: 'Invalid administrator email or password' });
    }

    const user = authData.user;
    const role = user.user_metadata?.role;

    if (!role || !ALLOWED_ADMIN_ROLES.includes(role)) {
      return res.status(403).json({
        ok: false,
        error: 'Access denied: Administrative privileges required.',
      });
    }

    const isFirstLogin = user.user_metadata?.is_first_login === true;
    const mustChangePassword = user.user_metadata?.must_change_password === true;
    const mustChangeName = user.user_metadata?.must_change_name === true;

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email.split('@')[0],
      role: role,
      permissions: user.user_metadata?.permissions || (role === 'Super Admin' ? ['all'] : ['create_content', 'edit_quizzes', 'manage_users']),
      phone: user.user_metadata?.phone || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      is_first_login: isFirstLogin,
      must_change_password: mustChangePassword,
      must_change_name: mustChangeName,
      last_sign_in_at: user.last_sign_in_at || new Date().toISOString(),
    };

    return res.status(200).json({
      ok: true,
      session: {
        token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        user: userPayload,
      },
    });
  }

  // ---------------------------------------------------------
  // 2. ME (Session Verification)
  // ---------------------------------------------------------
  if (action === 'me') {
    const token = extractBearerToken(req);
    const user = await verifyAdminToken(token, supabaseAdmin);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized or expired session' });
    }

    const role = user.user_metadata?.role;
    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email.split('@')[0],
      role: role,
      permissions: user.user_metadata?.permissions || (role === 'Super Admin' ? ['all'] : ['create_content', 'edit_quizzes', 'manage_users']),
      phone: user.user_metadata?.phone || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      is_first_login: user.user_metadata?.is_first_login === true,
      must_change_password: user.user_metadata?.must_change_password === true,
      must_change_name: user.user_metadata?.must_change_name === true,
      last_sign_in_at: user.last_sign_in_at || new Date().toISOString(),
    };

    return res.status(200).json({ ok: true, user: userPayload });
  }

  // ---------------------------------------------------------
  // 3. FIRST LOGIN SETUP (Mandatory edit name & change password)
  // ---------------------------------------------------------
  if (action === 'first-login-setup') {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const token = extractBearerToken(req);
    const user = await verifyAdminToken(token, supabaseAdmin);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized admin session' });
    }

    const { newName, currentPassword, newPassword } = req.body || {};

    if (!newName || typeof newName !== 'string' || newName.trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid administrator name (min 2 characters)' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters long' });
    }

    if (newPassword === '123456789' || newPassword === '1234556789') {
      return res.status(400).json({ ok: false, error: 'New password cannot be the temporary default password' });
    }

    // Optional verification of current password if provided
    if (currentPassword) {
      let { error: testErr } = await supabaseAnon.auth.signInWithPassword({
        email: user.email,
        password: String(currentPassword),
      });

      if (testErr && (currentPassword === '123456789' || currentPassword === '1234556789')) {
        const alt = currentPassword === '123456789' ? '1234556789' : '123456789';
        const retryTest = await supabaseAnon.auth.signInWithPassword({
          email: user.email,
          password: alt,
        });
        if (!retryTest.error) testErr = null;
      }

      if (testErr) {
        return res.status(400).json({ ok: false, error: 'Current temporary password is incorrect' });
      }
    }

    // Update user in Supabase
    const updatedMetadata = {
      ...user.user_metadata,
      name: newName.trim(),
      is_first_login: false,
      must_change_password: false,
      must_change_name: false,
      first_login_completed_at: new Date().toISOString(),
    };

    const { data: updatedUserData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: updatedMetadata,
    });

    if (updateErr) {
      console.error('[admin/auth:first-login-setup] Update failed:', updateErr);
      return res.status(500).json({ ok: false, error: 'Failed to update credentials. Please try again.' });
    }

    // Generate new session token with new password
    const { data: newAuthData } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: newPassword,
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: newName.trim(),
      role: user.user_metadata?.role,
      permissions: user.user_metadata?.permissions || ['all'],
      phone: user.user_metadata?.phone || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      is_first_login: false,
      must_change_password: false,
      must_change_name: false,
    };

    return res.status(200).json({
      ok: true,
      message: 'Name and password successfully initialized',
      session: {
        token: newAuthData?.session?.access_token || token,
        refresh_token: newAuthData?.session?.refresh_token || '',
        user: userPayload,
      },
    });
  }

  // ---------------------------------------------------------
  // 4. UPDATE PROFILE DETAILS (Profile Section)
  // ---------------------------------------------------------
  if (action === 'update-profile') {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const token = extractBearerToken(req);
    const user = await verifyAdminToken(token, supabaseAdmin);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized admin session' });
    }

    const { name, phone, avatar_url } = req.body || {};

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ ok: false, error: 'Name must be at least 2 characters' });
    }

    const updatedMetadata = {
      ...user.user_metadata,
      ...(name ? { name: name.trim(), must_change_name: false } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
      ...(avatar_url !== undefined ? { avatar_url: String(avatar_url).trim() } : {}),
      profile_updated_at: new Date().toISOString(),
    };

    const { data: updatedUserData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: updatedMetadata,
    });

    if (updateErr) {
      console.error('[admin/auth:update-profile] Error:', updateErr);
      return res.status(500).json({ ok: false, error: 'Failed to update profile' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      name: updatedMetadata.name,
      role: user.user_metadata?.role,
      permissions: user.user_metadata?.permissions || ['all'],
      phone: updatedMetadata.phone || '',
      avatar_url: updatedMetadata.avatar_url || '',
      is_first_login: updatedMetadata.is_first_login === true,
      must_change_password: updatedMetadata.must_change_password === true,
      must_change_name: updatedMetadata.must_change_name === true,
    };

    return res.status(200).json({
      ok: true,
      message: 'Admin profile updated successfully',
      user: userPayload,
    });
  }

  // ---------------------------------------------------------
  // 5. CHANGE PASSWORD (Profile Section)
  // ---------------------------------------------------------
  if (action === 'change-password') {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const token = extractBearerToken(req);
    const user = await verifyAdminToken(token, supabaseAdmin);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized admin session' });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword) {
      return res.status(400).json({ ok: false, error: 'Current password is required' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const { error: testErr } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: String(currentPassword),
    });

    if (testErr) {
      return res.status(400).json({ ok: false, error: 'Incorrect current password' });
    }

    const updatedMetadata = {
      ...user.user_metadata,
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: updatedMetadata,
    });

    if (updateErr) {
      console.error('[admin/auth:change-password] Error:', updateErr);
      return res.status(500).json({ ok: false, error: 'Failed to update password' });
    }

    return res.status(200).json({
      ok: true,
      message: 'Password changed successfully',
    });
  }

  return res.status(400).json({ ok: false, error: `Unsupported action: '${action}'` });
}
