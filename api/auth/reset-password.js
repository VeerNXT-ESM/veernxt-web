import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { mobile, newPassword, resetToken } = req.body || {};

  if (!mobile || !newPassword || !resetToken) {
    return res.status(400).json({ ok: false, error: 'mobile, newPassword, and resetToken are required' });
  }

  // Basic token validation 
  try {
    const decoded = Buffer.from(resetToken, 'base64').toString('utf-8');
    const [tokenMobile, tokenTime] = decoded.split(':');
    
    // Check if the mobile matches
    // Allow slight variations (e.g. starting with 91 or not)
    if (!tokenMobile.includes(mobile.replace(/[\s\-+]/g, '').slice(-10))) {
       return res.status(403).json({ ok: false, error: 'Invalid reset token' });
    }
    
    // Check if token expired (15 minutes)
    if (Date.now() - parseInt(tokenTime) > 15 * 60 * 1000) {
       return res.status(403).json({ ok: false, error: 'Reset token expired' });
    }
  } catch (e) {
    return res.status(403).json({ ok: false, error: 'Malformed reset token' });
  }

  // Initialize Supabase Admin
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server misconfiguration: Missing Supabase Admin keys' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const cleanMobile = mobile.replace(/[\s\-+]/g, '');
  const fullMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  const syntheticEmail = `${fullMobile}@veernxt.in`;

  try {
    // 1. Get the user ID from the email
    let userId = null;
    
    // Try to find in user_profiles first for efficiency, fallback to listUsers
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', syntheticEmail)
      .single();
      
    if (profile && profile.id) {
      userId = profile.id;
    } else {
      // Fallback: search through auth.users
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      
      const user = users.users.find(u => u.email === syntheticEmail);
      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found. Please register.' });
      }
      userId = user.id;
    }

    // 2. Update the password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error during password reset' });
  }
}
