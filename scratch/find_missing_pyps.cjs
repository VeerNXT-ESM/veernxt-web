const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('exam-logos/manifest.json', 'utf8'));
const pypData = JSON.parse(fs.readFileSync('scratch/pyp_scraper/scraped_pyp.json', 'utf8'));

// Clean and normalize the scraped PYP exam names
const scrapedExams = pypData.map(p => 
  p.title.replace(/previous year.*/i, '')
         .replace(/question paper.*/i, '')
         .trim()
         .toLowerCase()
).filter(e => e.length > 2); // Avoid empty or 1-char matching everything

const missing = [];
const found = [];

manifest.forEach(m => {
  const bodyName = m.conducting_body.toLowerCase();
  
  // A match happens if the scraped exam name includes the conducting body (e.g. "SSC CGL" includes "SSC")
  // OR the conducting body includes the scraped exam name (e.g. "Staff Selection Commission (SSC)" includes "SSC")
  // We need to be careful with short acronyms.
  const isFound = scrapedExams.some(e => {
    // Exact word match or strong substring match
    const wordsE = e.split(/\s+/);
    const wordsB = bodyName.split(/\s+/);
    
    // Simple heuristic: if any word > 2 chars matches exactly
    const hasWordMatch = wordsE.some(we => we.length > 2 && wordsB.includes(we));
    
    return hasWordMatch || e === bodyName;
  });

  if (!isFound) {
    missing.push(m);
  } else {
    found.push(m);
  }
});

console.log('Total bodies:', manifest.length);
console.log('Found bodies:', found.length);
console.log('Missing bodies:', missing.length);

const sortedMissing = missing.sort((a,b) => b.exam_count - a.exam_count);
console.log('\nTop 10 Missing Conducting Bodies:');
sortedMissing.slice(0, 10).forEach(m => console.log(`- ${m.conducting_body} (${m.exam_count} exams)`));
