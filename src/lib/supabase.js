import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseAnonKey);

// Mock Session for testing
const mockUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'test@veernxt.in',
  user_metadata: { full_name: 'Test Veer' }
};

const mockSession = {
  user: mockUser,
  access_token: null,
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600
};

// Override getSession and onAuthStateChange
const originalAuth = client.auth;
client.auth = {
  ...originalAuth,
  getSession: async () => ({ data: { session: mockSession }, error: null }),
  getUser: async () => ({ data: { user: mockUser }, error: null }),
  onAuthStateChange: (callback) => {
    callback('SIGNED_IN', mockSession);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  signOut: async () => ({ error: null })
};

export const supabase = client;
