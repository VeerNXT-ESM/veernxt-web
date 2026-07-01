/**
 * POST /api/auth/verify-otp
 * 
 * Verifies the OTP code submitted by the user.
 * Since the backend generates and signs the OTP on dispatch (using Flow API),
 * this endpoint validates the cryptographic signature of the otpToken without hitting a DB.
 * 
 * Body: { mobile: "919876543210", otp: "123456", purpose: "register" | "reset", otpToken: "..." }
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('[verify-otp] Incoming request body:', req.body);
  
  if (req.method !== 'POST') {
    console.error('[verify-otp] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, otp, purpose, otpToken } = req.body || {};

  if (!mobile || !otp || !purpose || !otpToken) {
    console.error('[verify-otp] Missing parameters. mobile:', mobile, 'otp:', otp, 'purpose:', purpose, 'otpToken:', !!otpToken);
    return res.status(400).json({ ok: false, error: 'mobile, otp, purpose, and otpToken are required' });
  }

  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  console.log('[verify-otp] Normalized mobile:', fullMobile, 'Purpose:', purpose);

  // --- Step 1: Verify OTP using the cryptographic token ---
  let otpVerified = false;

  try {
    console.log('[verify-otp] Starting signature verification for token:', otpToken);
    const [payloadB64, signature] = otpToken.split('.');
    if (!payloadB64 || !signature) {
      console.error('[verify-otp] Malformed otpToken. Missing dot separator.');
      return res.status(400).json({ ok: false, error: 'Malformed verification token' });
    }

    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const [tokenMobile, tokenTime] = payload.split(':');
    console.log('[verify-otp] Decoded token payload mobile:', tokenMobile, 'timestamp:', tokenTime);

    // Ensure the token belongs to this mobile number
    if (tokenMobile !== fullMobile) {
      console.error('[verify-otp] Mobile number mismatch. Token mobile:', tokenMobile, 'Request mobile:', fullMobile);
      return res.status(400).json({ ok: false, error: 'Invalid verification token details' });
    }

    // Verify time limit (e.g. 5 minutes)
    const ageMs = Date.now() - parseInt(tokenTime);
    console.log('[verify-otp] Token age (ms):', ageMs);
    if (ageMs > 5 * 60 * 1000) {
      console.error('[verify-otp] Token expired. Age exceeds 5 minutes.');
      return res.status(400).json({ ok: false, error: 'OTP code has expired' });
    }

    // Recreate expected signature
    const signaturePayload = `${fullMobile}:${otp}:${tokenTime}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(signaturePayload)
      .digest('base64');

    if (signature === expectedSignature) {
      otpVerified = true;
      console.log('[verify-otp] OTP signature matched successfully!');
    } else {
      console.error('[verify-otp] Signature mismatch! expected:', expectedSignature, 'received:', signature);
      return res.status(400).json({ ok: false, error: 'Invalid OTP code' });
    }
  } catch (err) {
    console.error('[verify-otp] Exception during cryptographic OTP verification:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error verifying OTP' });
  }

  if (!otpVerified) {
    console.error('[verify-otp] Verification failed. otpVerified was false.');
    return res.status(400).json({ ok: false, error: 'OTP verification failed' });
  }

  // --- Step 2: Generate Purpose Token (Valid for 15 minutes) ---
  if (purpose === 'register') {
    const payload = `${fullMobile}:${Date.now()}`;
    const hmac = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(payload)
      .digest('base64');
    const registerToken = `${Buffer.from(payload).toString('base64')}.${hmac}`;
    console.log('[verify-otp] Generated signed registerToken for registration payload:', payload);

    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'Mobile number verified. Proceed to set password.',
      mobile: fullMobile,
      registerToken: registerToken,
    });
  }

  if (purpose === 'reset') {
    const payload = `${fullMobile}:${Date.now()}`;
    const hmac = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(payload)
      .digest('base64');
    const resetToken = `${Buffer.from(payload).toString('base64')}.${hmac}`;
    console.log('[verify-otp] Generated signed resetToken for reset payload:', payload);

    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'OTP verified. You can now reset your password.',
      mobile: fullMobile,
      resetToken: resetToken,
    });
  }

  console.error('[verify-otp] Invalid purpose requested:', purpose);
  return res.status(400).json({ ok: false, error: 'Invalid purpose' });
}
