/**
 * POST /api/auth/register
 * 
 * Secure backend candidate registration endpoint.
 * Validates the HMAC-signed registerToken before calling Supabase Admin to create the user.
 * 
 * Body: { mobile: "9876543210", password: "...", registerToken: "..." }
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('[register] Incoming registration request for mobile:', req.body?.mobile);
  
  if (req.method !== 'POST') {
    console.error('[register] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, password, registerToken } = req.body || {};

  if (!mobile || !password || !registerToken) {
    console.error('[register] Missing required fields. mobile:', mobile, 'password:', !!password, 'registerToken:', !!registerToken);
    return res.status(400).json({ ok: false, error: 'mobile, password, and registerToken are required' });
  }

  // Normalize phone number
  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
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

  const syntheticEmail = `${fullMobile}@veernxt.in`;
  console.log('[register] Creating user with synthetic email:', syntheticEmail);

  try {
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true, // Auto-confirm email because mobile was verified via OTP
      user_metadata: {
        mobile: fullMobile,
        role: 'candidate',
      },
    });

    if (createError) {
      console.error('[register] Supabase auth.admin.createUser returned error:', createError);
      if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
        return res.status(409).json({ ok: false, error: 'This number is already registered. Please login instead.' });
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
