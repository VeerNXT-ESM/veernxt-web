import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
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

    // Filter to only users who have an admin-related role
    const admins = users.users
      .filter(u => u.user_metadata?.role && ['Super Admin', 'Content Curator', 'Employer Partner', 'Employer'].includes(u.user_metadata.role))
      .map(u => ({
        id: u.id,
        name: u.user_metadata?.name || u.email.split('@')[0],
        email: u.email,
        role: u.user_metadata?.role,
        permissions: u.user_metadata?.permissions || [],
      }));

    // Ensure the super admin exists in the list (fallback if not registered yet)
    if (!admins.some(a => a.email === 'veernxt.esm@gmail.com')) {
      admins.unshift({
        id: 'super-admin-placeholder',
        name: 'Vivek Talwar',
        email: 'veernxt.esm@gmail.com',
        role: 'Super Admin',
        permissions: ['all']
      });
    }

    return res.status(200).json({ ok: true, admins });
  } catch (err) {
    console.error('Error fetching admins:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch admins' });
  }
}
