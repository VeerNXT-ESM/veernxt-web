import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78' // using the service role key from .env to read schema
);

async function main() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('user_profiles:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('admin_users').select('*').limit(1);
  console.log('admin_users:', d2, e2);
}

main();
