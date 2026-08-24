import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78'
);

async function checkAuthUsers() {
  console.log("Fetching users from auth.users...");
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching auth users:", error);
    return;
  }
  
  console.log(`Found ${users.users.length} users in auth.users.`);
  if (users.users.length > 0) {
    console.log("Sample of first 3 users:");
    users.users.slice(0, 3).forEach((u, i) => {
      console.log(` ${i+1}. ID: ${u.id}, Email: ${u.email}, Created: ${u.created_at}`);
    });
  }
}

checkAuthUsers();
