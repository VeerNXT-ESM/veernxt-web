/**
 * POST /api/auth/send-otp
 * 
 * Sends OTP via MSG91 Flow API for:
 *   - New user registration
 *   - Password reset (forgot password)
 * 
 * Body: { mobile: "919876543210", purpose: "register" | "reset" }
 */

import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('[send-otp] Incoming request body:', req.body);
  
  if (req.method !== 'POST') {
    console.error('[send-otp] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, purpose } = req.body || {};

  if (!mobile || !purpose) {
    console.error('[send-otp] Missing required parameters. mobile:', mobile, 'purpose:', purpose);
    return res.status(400).json({ ok: false, error: 'mobile and purpose are required' });
  }

  // Normalize: strip spaces, ensure country code
  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  console.log('[send-otp] Normalized mobile number:', fullMobile);

  if (!/^91\d{10}$/.test(fullMobile)) {
    console.error('[send-otp] Mobile number validation failed. pattern mismatch on:', fullMobile);
    return res.status(400).json({ ok: false, error: 'Invalid Indian mobile number. Format: 9876543210' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  console.log('[send-otp] Configuration check. authKey present:', !!authKey, 'templateId:', templateId);

  const isDev = !authKey || !templateId || templateId === 'REPLACE_WITH_YOUR_DLT_TEMPLATE_ID';
  
  // Generate random 6-digit OTP
  const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  console.log('[send-otp] Generated OTP:', isDev ? '123456 (DEV)' : 'XXXXXX (PROD)');

  // Cryptographically sign the OTP to create a verification token
  const time = Date.now();
  const signaturePayload = `${fullMobile}:${otp}:${time}`;
  const hmac = crypto
    .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
    .update(signaturePayload)
    .digest('base64');
  const otpToken = `${Buffer.from(`${fullMobile}:${time}`).toString('base64')}.${hmac}`;
  console.log('[send-otp] Created signed otpToken for signature validation.');

  if (isDev) {
    console.warn('[send-otp] [DEV MODE ACTIVE] MSG91 is not configured. Simulating OTP send to:', fullMobile);
    return res.status(200).json({
      ok: true,
      message: `[DEV] OTP simulated for ${fullMobile}. Use code 123456 to verify.`,
      devMode: true,
      otpToken: otpToken
    });
  }

  try {
    // Construct the payload for the MSG91 Flow API as specified in documentation:
    // POST https://control.msg91.com/api/v5/flow
    const payload = {
      template_id: templateId,
      recipients: [
        {
          mobiles: fullMobile,
          var1: otp
        }
      ]
    };
    
    console.log('[send-otp] Dispatching request to MSG91 Flow API with payload template_id:', templateId, 'recipient:', fullMobile);

    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[send-otp] MSG91 Flow API response status:', response.status, 'data:', data);

    // MSG91 Flow API returns data.type === 'success' on success
    if (data.type === 'success') {
      console.log('[send-otp] OTP SMS successfully sent via Flow API to:', fullMobile);
      return res.status(200).json({ ok: true, message: 'OTP sent successfully', otpToken: otpToken });
    } else {
      console.error('[send-otp] MSG91 Flow API returned error response:', data);
      return res.status(502).json({ ok: false, error: data.message || 'Failed to send OTP via MSG91 Flow API' });
    }
  } catch (err) {
    console.error('[send-otp] Exception occurred while sending SMS via Flow API:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error sending OTP' });
  }
}
