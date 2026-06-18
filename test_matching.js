import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  'https://jtcyeufhvpieyngracpo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Y3lldWZodnBpZXluZ3JhY3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Mjk1NiwiZXhwIjoyMDkyNTM4OTU2fQ.yoV9_lKyHM5o-69k5HcOppfqIwUhNSMbtA_j2eQzL78'
);

async function main() {
  console.log("1. Replacing exam_master.json with new scraped jobs...");
  const scrapedPath = path.resolve(__dirname, '../scraper-app/scraped_sarkari_jobs.json');
  const masterPath = path.resolve(__dirname, '../engine/data/exam_master.json');
  
  const scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
  
  const newMaster = {
    version: "2.0.0",
    generated_at: new Date().toISOString(),
    total_exams: scrapedData.length,
    exams: scrapedData
  };
  
  fs.writeFileSync(masterPath, JSON.stringify(newMaster, null, 2));
  console.log(`Replaced. New total exams: ${scrapedData.length}`);

  console.log("2. Fetching existing candidates from Supabase...");
  const { data: candidates, error } = await supabase.from('user_profiles').select('*');
  
  if (error) {
    console.error("Error fetching candidates:", error);
    return;
  }
  console.log(`Found ${candidates.length} candidates in database.`);
  
  if (candidates.length === 0) return;

  console.log("3. Testing match engine against new jobs...");
  
  // We can just use dynamic import
  const { checkEligibility } = await import('../engine/src/engine/eligibility.js');
  const { scoreExam } = await import('../engine/src/engine/scoring.js');

  for (const candidate of candidates) {
    console.log(`\n--- Candidate: ${candidate.full_name || candidate.email || candidate.id} ---`);
    const profile = candidate.profile_data || candidate; // Depending on how it's stored
    
    let eligibleCount = 0;
    let topMatches = [];
    
    for (const exam of newMaster.exams) {
      // Basic mock profile if candidate is missing required fields for the engine
      const p = {
        fullName: profile.fullName || profile.full_name || "Unknown",
        dateOfBirth: profile.dateOfBirth || profile.dob || "2000-01-01",
        category: profile.category || "General",
        stateOfDomicile: profile.stateOfDomicile || profile.state || "Delhi",
        highestQualification: profile.highestQualification || profile.qualification || "graduate",
        physicalProficiency: profile.physicalProficiency || "Good",
        careerPreferences: profile.careerPreferences || ["BANKING", "SSC", "DEFENCE"],
        serviceBranch: profile.serviceBranch || "Indian Army",
        characterOnDischarge: profile.characterOnDischarge || "Exemplary",
        ...profile
      };

      try {
         const e = checkEligibility(p, exam);
         if (e.eligible) {
           eligibleCount++;
           const scored = scoreExam(p, exam, { priorityTracks: ['BANKING', 'SSC', 'DEFENCE', 'POLICE_CAPF', 'ENGINEERING'] });
           topMatches.push({ exam_name: exam.exam_name, score: scored.score });
         }
      } catch(err) {
        // console.error(err);
      }
    }
    
    topMatches.sort((a,b) => b.score - a.score);
    console.log(`Eligible for ${eligibleCount} new jobs.`);
    if (topMatches.length > 0) {
      console.log(`Top matches:`);
      topMatches.slice(0, 3).forEach((m, i) => {
         console.log(`  ${i+1}. ${m.exam_name} (Score: ${m.score.toFixed(1)})`);
      });
    } else {
      console.log("  No matches found for this candidate.");
    }
  }
}

main();
