import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  '***REDACTED-ROTATED-SERVICE-ROLE-KEY***' // using the service role key from .env to read schema
);

async function main() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('user_profiles:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('admin_users').select('*').limit(1);
  console.log('admin_users:', d2, e2);
}

main();
