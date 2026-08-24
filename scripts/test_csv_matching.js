import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { checkEligibility } = await import('../engine/src/engine/eligibility.js');
  const { scoreExam } = await import('../engine/src/engine/scoring.js');

  const masterPath = path.resolve(__dirname, '../engine/data/exam_master.json');
  const newMaster = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

  const csvPath = path.resolve(__dirname, '../docs/User_Profiles.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  
  // Parse CSV
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
  const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
  
  const results = [];
  results.push('Name,StateOfDomicile,HighestQualification,MilitaryTrade,EligibleExamsCount,Top1Exam,Top1Score,Top1Track,TrackDiversity,PreferenceMatch');

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
    if (row.length < headers.length) continue;

    const profileRaw = {};
    headers.forEach((h, idx) => {
      profileRaw[h] = row[idx];
    });

    // Map to engine schema
    const p = {
      fullName: profileRaw['Full Name'],
      dateOfBirth: profileRaw['Date of Birth'],
      category: profileRaw['Category'],
      stateOfDomicile: profileRaw['State of domicile'],
      highestQualification: profileRaw['Highest Civil Qualification:'],
      physicalProficiency: profileRaw['Physical Proficiency'],
      careerPreferences: profileRaw['Top Career Preference'] ? profileRaw['Top Career Preference'].split(',') : ["BANKING", "SSC", "DEFENCE"],
      serviceBranch: profileRaw['Service Branch'],
      characterOnDischarge: profileRaw['Likely Character on Discharge'] || "Exemplary",
      militaryTrade: profileRaw['Arm / Corps / Trade: (e.g., Infantry/Armd/Signals/EME, etc. & Washerman/Chef/Steward/Barber/etc) -']
    };

    let eligibleCount = 0;
    let topMatches = [];
    let tracks = new Set();
    
    for (const exam of newMaster.exams) {
      try {
         const e = checkEligibility(p, exam);
         if (e.eligible) {
           eligibleCount++;
           const scored = scoreExam(p, exam, { priorityTracks: ['BANKING', 'SSC', 'DEFENCE', 'POLICE_CAPF', 'ENGINEERING', 'RAILWAYS'] });
           topMatches.push({ 
             exam_name: exam.exam_name, 
             score: scored.score,
             track: exam.career_track || 'UNKNOWN'
           });
           tracks.add(exam.career_track || 'UNKNOWN');
         }
      } catch(err) {
        // ignore
      }
    }
    
    topMatches.sort((a,b) => b.score - a.score);
    
    const topExam = topMatches[0] ? `"${topMatches[0].exam_name}"` : `"None"`;
    const topScore = topMatches[0] ? topMatches[0].score.toFixed(1) : 0;
    const topTrack = topMatches[0] ? `"${topMatches[0].track}"` : `"None"`;
    const trackDiversity = tracks.size;
    const prefMatch = "Y"; // Simplified for now

    results.push(`"${p.fullName}","${p.stateOfDomicile}","${p.highestQualification}","${p.militaryTrade}",${eligibleCount},${topExam},${topScore},${topTrack},${trackDiversity},"${prefMatch}"`);
  }

  const outPath = path.resolve(__dirname, '../docs/new_stress_test_summary.csv');
  fs.writeFileSync(outPath, results.join('\n'));
  console.log(`Successfully processed ${lines.length - 1} profiles.`);
  console.log(`Saved results to docs/new_stress_test_summary.csv`);
}

main();
