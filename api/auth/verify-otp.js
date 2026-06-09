/**
 * POST /api/auth/verify-otp
 * 
 * Verifies OTP via MSG91 and either:
 *   - Creates a new Supabase user (purpose: "register")
 *   - Returns a reset token (purpose: "reset")
 * 
 * Body: { mobile: "919876543210", otp: "123456", purpose: "register" | "reset" }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, otp, purpose } = req.body || {};

  if (!mobile || !otp || !purpose) {
    return res.status(400).json({ ok: false, error: 'mobile, otp, and purpose are required' });
  }

  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  // --- Step 1: Verify OTP with MSG91 ---
  let otpVerified = false;

  if (!authKey || !templateId || templateId === 'REPLACE_WITH_YOUR_DLT_TEMPLATE_ID') {
    // Dev fallback: accept 123456
    if (otp === '123456') {
      otpVerified = true;
      console.warn('[DEV MODE] OTP verified with dev code 123456');
    } else {
      return res.status(400).json({ ok: false, error: '[DEV] Invalid OTP. Use 123456 in dev mode.' });
    }
  } else {
    try {
      const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${fullMobile}`;
      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: { 'authkey': authKey },
      });
      const data = await response.json();

      if (data.type === 'success') {
        otpVerified = true;
      } else {
        return res.status(400).json({ ok: false, error: data.message || 'Invalid or expired OTP' });
      }
    } catch (err) {
      console.error('MSG91 verify-otp exception:', err);
      return res.status(500).json({ ok: false, error: 'Internal server error verifying OTP' });
    }
  }

  if (!otpVerified) {
    return res.status(400).json({ ok: false, error: 'OTP verification failed' });
  }

  // --- Step 2: Handle based on purpose ---
  if (purpose === 'register') {
    // OTP verified → return success. The frontend will now show the
    // password creation form, then call Supabase signUp directly.
    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'Mobile number verified. Proceed to set password.',
      mobile: fullMobile,
    });
  }

  if (purpose === 'reset') {
    // OTP verified → return a reset token. Frontend will prompt new password.
    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'OTP verified. You can now reset your password.',
      mobile: fullMobile,
      resetToken: Buffer.from(`${fullMobile}:${Date.now()}`).toString('base64'),
    });
  }

  return res.status(400).json({ ok: false, error: 'Invalid purpose' });
}
