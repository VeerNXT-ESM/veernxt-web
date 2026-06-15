import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { email, name, role, permissions } = req.body || {};

  if (!email || !role) {
    return res.status(400).json({ ok: false, error: 'Email and role are required' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase Admin keys' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Generate a secure random password for the admin
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    // Try to create the user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: role,
        permissions: permissions || []
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        // If user exists, just update their metadata to make them an admin
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...existingUser.user_metadata,
              name: name || existingUser.user_metadata.name,
              role: role,
              permissions: permissions || []
            }
          });
          if (updateError) throw updateError;
          return res.status(200).json({ ok: true, message: 'Existing user upgraded to admin successfully', tempPassword: null });
        }
      }
      throw error;
    }

    // In a production scenario, you would email this tempPassword to the user.
    // For this implementation, we will return it so the super admin can copy it.
    return res.status(200).json({ 
      ok: true, 
      message: 'Administrator created successfully',
      tempPassword: tempPassword 
    });
  } catch (err) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to create administrator' });
  }
}
