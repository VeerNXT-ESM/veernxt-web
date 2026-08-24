const { Client } = require('pg');

const connectionString = "postgresql://postgres:5Rw-uJ2Xkadc$4,@db.jtcyeufhvpieyngracpo.supabase.co:5432/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to Supabase PostgreSQL database.");

  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    console.log("Columns in messages table:");
    console.log(JSON.stringify(res.rows, null, 2));

    const policiesRes = await client.query(`
      SELECT policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'messages'
    `);
    console.log("Policies on messages table:");
    console.log(JSON.stringify(policiesRes.rows, null, 2));

  } catch (err) {
    console.error("Error fetching schema:", err);
  } finally {
    await client.end();
    console.log("Connection closed.");
  }
}

main();
