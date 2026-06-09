/**
 * POST /api/auth/send-otp
 * 
 * Sends OTP via MSG91 for:
 *   - New user registration
 *   - Password reset (forgot password)
 * 
 * Body: { mobile: "919876543210", purpose: "register" | "reset" }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, purpose } = req.body || {};

  if (!mobile || !purpose) {
    return res.status(400).json({ ok: false, error: 'mobile and purpose are required' });
  }

  // Normalize: strip spaces, ensure country code
  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;

  if (!/^91\d{10}$/.test(fullMobile)) {
    return res.status(400).json({ ok: false, error: 'Invalid Indian mobile number. Format: 9876543210' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId || templateId === 'REPLACE_WITH_YOUR_DLT_TEMPLATE_ID') {
    // Dev fallback: simulate OTP send
    console.warn('[DEV MODE] MSG91 not configured. Simulating OTP send.');
    return res.status(200).json({
      ok: true,
      message: `[DEV] OTP simulated for ${fullMobile}. Use code 123456 to verify.`,
      devMode: true
    });
  }

  try {
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'authkey': authKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: fullMobile,
        otp_length: 6,
      }),
    });

    const data = await response.json();

    if (data.type === 'success' || data.type === 'otp_sent') {
      return res.status(200).json({ ok: true, message: 'OTP sent successfully' });
    } else {
      console.error('MSG91 send-otp error:', data);
      return res.status(502).json({ ok: false, error: data.message || 'Failed to send OTP via MSG91' });
    }
  } catch (err) {
    console.error('MSG91 send-otp exception:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error sending OTP' });
  }
}
