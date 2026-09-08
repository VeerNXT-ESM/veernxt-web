import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSupabase() {
  console.log('Querying Supabase resources...');
  
  const { count, error } = await supabase
    .from('resources')
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
