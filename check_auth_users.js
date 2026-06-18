import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  '***REDACTED-ROTATED-SERVICE-ROLE-KEY***'
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
