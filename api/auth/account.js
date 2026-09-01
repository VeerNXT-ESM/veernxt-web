import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * /api/auth/account
 *
 * Combines what used to be two separate serverless functions
 * (register.js, reset-password.js) into one, purely to stay under Vercel
 * Hobby's 12-function-per-deployment cap. External URLs are unchanged --
 * vercel.json rewrites /api/auth/register and /api/auth/reset-password to
 * this file with a `fn` query param, so Login.jsx needs no changes.
 * Underlying behavior of each handler is unchanged, just relocated.
 */

async function handleRegister(req, res) {
  console.log('[register] Incoming registration request for mobile:', req.body?.mobile);

  if (req.method !== 'POST') {
    console.error('[register] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, password, registerToken, role } = req.body || {};

  if (!mobile || !password || !registerToken) {
    console.error('[register] Missing required fields. mobile:', mobile, 'password:', !!password, 'registerToken:', !!registerToken, 'role:', role);
    return res.status(400).json({ ok: false, error: 'mobile, password, and registerToken are required' });
  }

  // Normalize phone number
  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = (cleanMobile.length === 10)
    ? `91${cleanMobile}`
    : (cleanMobile.startsWith('91') && cleanMobile.length === 12 ? cleanMobile : `91${cleanMobile}`);
  console.log('[register] Normalized mobile number:', fullMobile);

  if (!/^91\d{10}$/.test(fullMobile)) {
    console.error('[register] Mobile validation failed. Expected pattern mismatch on:', fullMobile);
    return res.status(400).json({ ok: false, error: 'Invalid mobile number' });
  }

  // Verify HMAC signature of the registration token
  try {
    console.log('[register] Validating registration token structure...');
    const [payloadB64, signature] = registerToken.split('.');
    if (!payloadB64 || !signature) {
      console.error('[register] Malformed registration token. Missing split parts.');
      return res.status(403).json({ ok: false, error: 'Malformed registration token structure' });
    }

    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
    console.log('[register] Decoded payload:', payload);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('[register] Signature mismatch! expected:', expectedSignature, 'received:', signature);
      return res.status(403).json({ ok: false, error: 'Invalid registration token signature. Tampering detected.' });
    }

    const [tokenMobile, tokenTime] = payload.split(':');
    console.log('[register] Signature valid. Token mobile:', tokenMobile, 'Token timestamp:', tokenTime);

    // Ensure the token belongs to this mobile number
    if (tokenMobile !== fullMobile) {
      console.error('[register] Mobile number mismatch. Token mobile:', tokenMobile, 'Expected fullMobile:', fullMobile);
      return res.status(403).json({ ok: false, error: 'Token mobile number mismatch' });
    }

    // Check token expiration (15 minutes)
    const ageMs = Date.now() - parseInt(tokenTime);
    console.log('[register] Token age (ms):', ageMs);
    if (ageMs > 15 * 60 * 1000) {
      console.error('[register] Token expired. Age exceeds 15 minutes.');
      return res.status(403).json({ ok: false, error: 'Registration token expired' });
    }
  } catch (e) {
    console.error('[register] Exception during token parsing:', e);
    return res.status(403).json({ ok: false, error: 'Failed to parse registration token' });
  }

  // Initialize Supabase Admin Client
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[register] Server missing Supabase Admin environment variables.');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: Missing Supabase keys' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Candidate and employer accounts are kept as separate Supabase Auth
  // identities even when they share the same real-world phone number --
  // Supabase requires a unique email per user, so without a role-specific
  // suffix the second registration attempt (whichever role comes second)
  // would collide with the first and get rejected as "already registered".
  // Candidate keeps the original unsuffixed format for backward
  // compatibility with every already-registered candidate account.
  const isEmployer = role === 'employer';
  const syntheticEmail = isEmployer ? `${fullMobile}+employer@veernxt.in` : `${fullMobile}@veernxt.in`;
  console.log('[register] Creating user with synthetic email:', syntheticEmail);

  try {
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true, // Auto-confirm email because mobile was verified via OTP
      user_metadata: {
        mobile: fullMobile,
        role: role === 'employer' ? 'employer' : 'candidate',
      },
    });

    if (createError) {
      console.error('[register] Supabase auth.admin.createUser returned error:', createError);
      if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
        return res.status(409).json({ ok: false, error: `This number is already registered as ${isEmployer ? 'an employer' : 'a candidate'}. Please login instead.` });
      }
      throw createError;
    }

    console.log('[register] User successfully created in Supabase Auth. synthetic email:', syntheticEmail);
    return res.status(200).json({ ok: true, message: 'Account created successfully!' });
  } catch (err) {
    console.error('[register] Exception during database/auth user creation:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error during registration' });
  }
}

async function handleResetPassword(req, res) {
  console.log('[reset-password] Incoming request for mobile:', req.body?.mobile);

  if (req.method !== 'POST') {
    console.error('[reset-password] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, newPassword, resetToken, role } = req.body || {};

  if (!mobile || !newPassword || !resetToken) {
    console.error('[reset-password] Missing parameter(s). mobile:', mobile, 'newPassword:', !!newPassword, 'resetToken:', !!resetToken);
    return res.status(400).json({ ok: false, error: 'mobile, newPassword, and resetToken are required' });
  }

  // HMAC Signature Token Validation
  try {
    console.log('[reset-password] Validating token structure...');
    const [payloadB64, signature] = resetToken.split('.');
    if (!payloadB64 || !signature) {
      console.error('[reset-password] Malformed reset token structure. Missing split parts.');
      return res.status(403).json({ ok: false, error: 'Malformed reset token structure' });
    }

    // Recreate signature and compare
    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
    console.log('[reset-password] Decoded payload:', payload);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('[reset-password] Signature mismatch! expected:', expectedSignature, 'received:', signature);
      return res.status(403).json({ ok: false, error: 'Invalid reset token signature. Tampering detected.' });
    }

    const [tokenMobile, tokenTime] = payload.split(':');
    console.log('[reset-password] Signature valid. Token mobile:', tokenMobile, 'Token timestamp:', tokenTime);

    // Check if the mobile matches
    // Allow slight variations (e.g. starting with 91 or not)
    const cleanMobileInput = mobile.replace(/[\s\-+]/g, '').slice(-10);
    if (!tokenMobile.includes(cleanMobileInput)) {
      console.error('[reset-password] Mobile number mismatch. Token mobile does not contain input suffix:', cleanMobileInput);
      return res.status(403).json({ ok: false, error: 'Invalid reset token details' });
    }

    // Check if token expired (15 minutes)
    const ageMs = Date.now() - parseInt(tokenTime);
    console.log('[reset-password] Token age (ms):', ageMs);
    if (ageMs > 15 * 60 * 1000) {
      console.error('[reset-password] Token expired. Age exceeds 15 minutes.');
      return res.status(403).json({ ok: false, error: 'Reset token expired' });
    }
  } catch (e) {
    console.error('[reset-password] Exception during token parsing:', e);
    return res.status(403).json({ ok: false, error: 'Failed to parse reset token' });
  }

  // Initialize Supabase Admin
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[reset-password] Server missing Supabase Admin environment variables.');
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: Missing Supabase Admin keys' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = (cleanMobile.length === 10)
    ? `91${cleanMobile}`
    : (cleanMobile.startsWith('91') && cleanMobile.length === 12 ? cleanMobile : `91${cleanMobile}`);
  // Must match the same role-suffixed format handleRegister creates
  // the account under -- candidate and employer are separate Supabase Auth
  // identities even when they share a phone number (see above).
  const syntheticEmail = role === 'employer' ? `${fullMobile}+employer@veernxt.in` : `${fullMobile}@veernxt.in`;
  console.log('[reset-password] Connecting email to reset:', syntheticEmail);

  try {
    // 1. Get the user ID from the email
    let userId = null;
    console.log('[reset-password] Querying user_profiles for:', syntheticEmail);

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', syntheticEmail)
      .single();

    if (profileErr) {
      console.warn('[reset-password] user_profiles query returned warning/error:', profileErr.message);
    }

    if (profile && profile.id) {
      userId = profile.id;
      console.log('[reset-password] Found userId in user_profiles:', userId);
    } else {
      console.log('[reset-password] Falling back to auth.admin.listUsers() to find user...');
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('[reset-password] auth.admin.listUsers error:', listError);
        throw listError;
      }

      const user = users.users.find(u => u.email === syntheticEmail);
      if (!user) {
        console.error('[reset-password] User not found in auth list for:', syntheticEmail);
        return res.status(404).json({ ok: false, error: 'User not found. Please register.' });
      }
      userId = user.id;
      console.log('[reset-password] Found userId in auth list:', userId);
    }

    // 2. Update the password
    console.log('[reset-password] Invoking admin.updateUserById to reset password for user:', userId);
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[reset-password] admin.updateUserById failed:', updateError);
      throw updateError;
    }

    console.log('[reset-password] Password successfully updated for user:', userId);
    return res.status(200).json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[reset-password] Exception during DB/Auth password update:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error during password reset' });
  }
}

export default async function handler(req, res) {
  const { fn } = req.query || {};
  if (fn === 'register') return handleRegister(req, res);
  if (fn === 'reset-password') return handleResetPassword(req, res);
  return res.status(404).json({ ok: false, error: 'Unknown auth endpoint.' });
}
