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
  if (res.status === 204) return null;
  return res.json();
}

async function run() {
  console.log('Fetching questions...');
  let offset = 0;
  let allQuestions = [];
  
  while (true) {
    const questions = await querySupabase(`questions?select=id,options,correct_answer,explanation&limit=1000&offset=${offset}`);
    if (questions.length === 0) break;
    allQuestions = allQuestions.concat(questions);
    offset += 1000;
  }
  
  let updatedCount = 0;

  for (const q of allQuestions) {
    if (!q.options || !q.options.D) continue;
    const textD = q.options.D;
    
    const ansIdx = textD.indexOf('Answer:');
    if (ansIdx === -1) continue;
    
    const explIdx = textD.indexOf('Explanation:');
    
    let cleanOptionD = textD.substring(0, ansIdx).trim();
    cleanOptionD = cleanOptionD.replace(/(?:<[^>]*>|\\s|&nbsp;|✓|Correct)*$/i, '').trim();
    
    const middlePart = textD.substring(ansIdx, explIdx === -1 ? textD.length : explIdx);
    const letterMatch = middlePart.match(/([A-D])/);
    if (!letterMatch) continue;
    const correctAnswer = letterMatch[1];
    
    let explanation = '';
    if (explIdx !== -1) {
      explanation = textD.substring(explIdx + 12).trim();
      explanation = explanation.replace(/^(?:<[^>]*>|\\s|&nbsp;)*/i, '').trim();
    }
      
    const newOptions = { ...q.options, D: cleanOptionD };
    
    await querySupabase(`questions?id=eq.${q.id}`, 'PATCH', {
      options: newOptions,
      correct_answer: correctAnswer,
      explanation: explanation
    });
    
    updatedCount++;
    if (updatedCount % 50 === 0) {
      console.log(`Updated ${updatedCount} questions...`);
    }
  }
  
  console.log(`\\nDone. Updated ${updatedCount} total questions.`);
}

run().catch(console.error);
