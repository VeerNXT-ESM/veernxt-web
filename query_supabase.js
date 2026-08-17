import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtcyeufhvpieyngracpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78';

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
