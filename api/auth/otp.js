/**
 * POST /api/auth/otp
 *
 * Combines what used to be two separate serverless functions
 * (send-otp.js, verify-otp.js) into one, purely to stay under Vercel
 * Hobby's 12-function-per-deployment cap — dispatch logic only, the
 * underlying send/verify behavior is unchanged.
 *
 * Body: { action: 'send', mobile, purpose: 'register' | 'reset' }
 *     | { action: 'verify', mobile, otp, purpose, otpToken }
 */

import crypto from 'crypto';

function normalizeMobile(mobile) {
  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  return (cleanMobile.length === 10)
    ? `91${cleanMobile}`
    : (cleanMobile.startsWith('91') && cleanMobile.length === 12 ? cleanMobile : `91${cleanMobile}`);
}

async function handleSend(req, res) {
  const { mobile, purpose } = req.body || {};

  if (!mobile || !purpose) {
    return res.status(400).json({ ok: false, error: 'mobile and purpose are required' });
  }

  const fullMobile = normalizeMobile(mobile);
  if (!/^91\d{10}$/.test(fullMobile)) {
    return res.status(400).json({ ok: false, error: 'Invalid Indian mobile number. Format: 9876543210' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const isDev = !authKey || !templateId || templateId === 'REPLACE_WITH_YOUR_DLT_TEMPLATE_ID';

  const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

  const time = Date.now();
  const signaturePayload = `${fullMobile}:${otp}:${time}`;
  const hmac = crypto
    .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
    .update(signaturePayload)
    .digest('base64');
  const otpToken = `${Buffer.from(`${fullMobile}:${time}`).toString('base64')}.${hmac}`;

  if (isDev) {
    console.warn('[auth/otp:send] [DEV MODE ACTIVE] MSG91 is not configured. Simulating OTP send to:', fullMobile);
    return res.status(200).json({
      ok: true,
      message: `[DEV] OTP simulated for ${fullMobile}. Use code 123456 to verify.`,
      devMode: true,
      otpToken: otpToken
    });
  }

  try {
    const payload = {
      template_id: templateId,
      recipients: [{ mobiles: fullMobile, var1: otp }],
    };

    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.type === 'success') {
      return res.status(200).json({ ok: true, message: 'OTP sent successfully', otpToken: otpToken });
    }
    console.error('[auth/otp:send] MSG91 Flow API returned error response:', data);
    return res.status(502).json({ ok: false, error: data.message || 'Failed to send OTP via MSG91 Flow API' });
  } catch (err) {
    console.error('[auth/otp:send] Exception occurred while sending SMS via Flow API:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error sending OTP' });
  }
}

async function handleVerify(req, res) {
  const { mobile, otp, purpose, otpToken } = req.body || {};

  if (!mobile || !otp || !purpose || !otpToken) {
    return res.status(400).json({ ok: false, error: 'mobile, otp, purpose, and otpToken are required' });
  }

  const fullMobile = normalizeMobile(mobile);

  let otpVerified = false;
  try {
    const [payloadB64, signature] = otpToken.split('.');
    if (!payloadB64 || !signature) {
      return res.status(400).json({ ok: false, error: 'Malformed verification token' });
    }

    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const [tokenMobile, tokenTime] = payload.split(':');

    if (tokenMobile !== fullMobile) {
      return res.status(400).json({ ok: false, error: 'Invalid verification token details' });
    }

    const ageMs = Date.now() - parseInt(tokenTime);
    if (ageMs > 5 * 60 * 1000) {
      return res.status(400).json({ ok: false, error: 'OTP code has expired' });
    }

    const signaturePayload = `${fullMobile}:${otp}:${tokenTime}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
      .update(signaturePayload)
      .digest('base64');

    if (signature === expectedSignature) {
      otpVerified = true;
    } else {
      return res.status(400).json({ ok: false, error: 'Invalid OTP code' });
    }
  } catch (err) {
    console.error('[auth/otp:verify] Exception during cryptographic OTP verification:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error verifying OTP' });
  }

  if (!otpVerified) {
    return res.status(400).json({ ok: false, error: 'OTP verification failed' });
  }

  if (purpose === 'register') {
    const payload = `${fullMobile}:${Date.now()}`;
    const hmac = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(payload).digest('base64');
    const registerToken = `${Buffer.from(payload).toString('base64')}.${hmac}`;

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
    const hmac = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(payload).digest('base64');
    const resetToken = `${Buffer.from(payload).toString('base64')}.${hmac}`;

    return res.status(200).json({
      ok: true,
      verified: true,
      message: 'OTP verified. You can now reset your password.',
      mobile: fullMobile,
      resetToken: resetToken,
    });
  }

  return res.status(400).json({ ok: false, error: 'Invalid purpose' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { action } = req.body || {};
  if (action === 'send') return handleSend(req, res);
  if (action === 'verify') return handleVerify(req, res);
  return res.status(400).json({ ok: false, error: "action must be 'send' or 'verify'" });
}
