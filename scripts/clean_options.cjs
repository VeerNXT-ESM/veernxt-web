const fs = require('fs');

const SUPABASE_URL = 'https://jtcyeufhvpieyngracpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78';

async function querySupabase(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  // 204 No Content for PATCH without return=representation sometimes, but we requested it
  if (res.status === 204) return null;
  return res.json();
}

async function run() {
  console.log('Fetching questions...');
  const questions = await querySupabase('questions?select=id,options,correct_answer,explanation');
  
  let updatedCount = 0;

  for (const q of questions) {
    if (!q.options || !q.options.D) continue;
    const textD = q.options.D;
    
    // Look for Correct Answer: and Explanation:
    const regex = /(.*?)[\n\s]*[✓✔]?\s*Correct Answer:\s*Option\s*\(([A-D])\)(?:[^\n💡]*?)[\n\s]*[💡]?\s*Explanation:\s*(.*)/is;
    const match = textD.match(regex);
    
    if (match) {
      const cleanOptionD = match[1].trim();
      const correctAnswer = match[2];
      const explanation = match[3].trim();
      
      console.log(`\n--- Updating Question ${q.id} ---`);
      console.log('Old D:', textD.substring(0, 50) + '...');
      console.log('New D:', cleanOptionD);
      console.log('Correct Answer:', correctAnswer);
      console.log('Explanation:', explanation.substring(0, 50) + '...');
      
      const newOptions = { ...q.options, D: cleanOptionD };
      
      await querySupabase(`questions?id=eq.${q.id}`, 'PATCH', {
        options: newOptions,
        correct_answer: correctAnswer,
        explanation: explanation
      });
      
      updatedCount++;
    } else {
      // Sometimes it might not have an explanation or slightly different format
      const regexAlt = /(.*?)[\n\s]*[✓✔]?\s*Correct Answer:\s*Option\s*\(([A-D])\)(.*)/is;
      const matchAlt = textD.match(regexAlt);
      if (matchAlt && matchAlt[1].trim() !== textD.trim()) {
         const cleanOptionD = matchAlt[1].trim();
         const correctAnswer = matchAlt[2];
         const explanation = matchAlt[3].trim();
         
         console.log(`\n--- Updating Question (Alt Format) ${q.id} ---`);
         console.log('Correct Answer:', correctAnswer);
         
         const newOptions = { ...q.options, D: cleanOptionD };
         await querySupabase(`questions?id=eq.${q.id}`, 'PATCH', {
           options: newOptions,
           correct_answer: correctAnswer,
           explanation: explanation || q.explanation
         });
         updatedCount++;
      }
    }
  }
  
  console.log(`\nDone. Updated ${updatedCount} questions.`);
}

run().catch(console.error);
