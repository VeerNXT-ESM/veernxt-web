import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required' });
  }

  if (email.toLowerCase() === 'veernxt.esm@gmail.com') {
    return res.status(403).json({ ok: false, error: 'Cannot remove the primary Super Admin' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Downgrade the user's role by removing admin permissions
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: 'candidate',
        permissions: []
      }
    });

    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, message: 'Administrator privileges revoked successfully' });
  } catch (err) {
    console.error('Error removing admin:', err);
    return res.status(500).json({ ok: false, error: 'Failed to revoke privileges' });
  }
}
