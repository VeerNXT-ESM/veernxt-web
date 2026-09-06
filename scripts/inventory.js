import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: resources, error: resError } = await supabase.from('resources').select('*');
  const { data: quizzes, error: quizError } = await supabase.from('quizzes').select('*');
  
  if (resError) console.error("Error fetching resources:", resError);
  if (quizError) console.error("Error fetching quizzes:", quizError);
  
  const inventory = {
    'Intro': [],
    'Guide Book': [],
    'Precis': [],
    '10 Years PYQ': [],
    'Test Series': [],
    'Other Resources': [],
    'Other Quizzes': []
  };

  resources?.forEach(r => {
    const cat = r.category || '';
    if (cat.toLowerCase().includes('intro')) inventory['Intro'].push(r.title);
    else if (cat.toLowerCase().includes('guide')) inventory['Guide Book'].push(r.title);
    else if (cat.toLowerCase().includes('precis')) inventory['Precis'].push(r.title);
    else if (cat.toLowerCase().includes('pyq')) inventory['10 Years PYQ'].push(r.title);
    else if (cat.toLowerCase().includes('test')) inventory['Test Series'].push(r.title);
    else inventory['Other Resources'].push(`${r.title} (Cat: ${cat})`);
  });

  quizzes?.forEach(q => {
    const cat = q.category || '';
    if (cat.toLowerCase().includes('intro')) inventory['Intro'].push(q.title);
    else if (cat.toLowerCase().includes('guide')) inventory['Guide Book'].push(q.title);
    else if (cat.toLowerCase().includes('precis')) inventory['Precis'].push(q.title);
    else if (cat.toLowerCase().includes('pyq')) inventory['10 Years PYQ'].push(q.title);
    else if (cat.toLowerCase().includes('test')) inventory['Test Series'].push(q.title);
    else inventory['Other Quizzes'].push(`${q.title} (Cat: ${cat})`);
  });

  let output = "# Database Inventory Report\n\n";
  for (const [cat, items] of Object.entries(inventory)) {
    output += `## ${cat} (${items.length})\n`;
    items.forEach(item => output += `- ${item}\n`);
    output += "\n";
  }
  
  fs.writeFileSync('C:/Users/mmu/.gemini/antigravity-ide/brain/999af769-9260-4776-ba57-acf63d5d1875/inventory_artifact.md', output, 'utf8');
}

run();
