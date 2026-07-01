import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('[reset-password] Incoming request for mobile:', req.body?.mobile);
  
  if (req.method !== 'POST') {
    console.error('[reset-password] Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, newPassword, resetToken } = req.body || {};

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
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  const syntheticEmail = `${fullMobile}@veernxt.in`;
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
