import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = '***REDACTED-ROTATED-SERVICE-ROLE-KEY***';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabase() {
  console.log('Querying Supabase resources_v2...');
  
  const { count, error } = await supabase
    .from('resources_v2')
    .select('*', { count: 'exact', head: true })
    .eq('conducting_body', 'CENTRAL EXAMS')
    .eq('status', 'Published');
    
  if (error) {
    console.error('Error fetching from Supabase:', error);
  } else {
    console.log(`Total Published Central Exams found: ${count}`);
  }
}

checkSupabase();
