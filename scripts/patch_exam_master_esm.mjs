import { readFileSync, writeFileSync } from 'fs';

const filePath = '/Users/souvik/Projects/VeerNext/veernxt-web/backend/engine/data/exam_master.json';
const data = JSON.parse(readFileSync(filePath, 'utf-8'));
let updatedCount = 0;

for (const exam of data.exams) {
  const name = (exam.exam_name || '').toLowerCase();
  const body = (exam.conducting_body || '').toLowerCase();

  // 1. IBPS RRB exams: set career_track to BANKING, esm to true
  if (name.includes('ibps rrb') || name.includes('ibps clerk / po / rrb') || name.includes('ibps po / clerk / rrb')) {
    if (exam.career_track === 'RAILWAYS') {
      exam.career_track = 'BANKING';
      updatedCount++;
    }
    exam.ex_servicemen_quota = true;
    if (!exam.min_qualification) {
      exam.min_qualification = name.includes('clerk') ? '12' : 'graduate';
    }
  }

  // 2. Standard Central Banking Exams: SBI, IBPS, RBI, LIC
  if (
    /^(sbi po|sbi clerk|ibps po|ibps clerk|sbi cbo|rbi assistant|lic aao|lic ado)/i.test(name) ||
    /^(sbi po \/ clerk|ibps clerk \/ po \/ rrb)$/i.test(name)
  ) {
    exam.ex_servicemen_quota = true;
    if (name.includes('lic')) {
      exam.career_track = 'BANKING'; // Group with banking/finance
      exam.min_qualification = 'graduate';
    }
    updatedCount++;
  }

  // 3. Fix Credit Officer (PGDBF) - definitely not a physical combat exam!
  if (name.includes('credit officer')) {
    exam.physical_required = false;
    updatedCount++;
  }

  // 4. Central SSC Exams with DoPT Ex-Servicemen quotas
  if (
    name.includes('ssc cgl') ||
    name.includes('ssc chsl') ||
    name.includes('ssc mts') ||
    name.includes('ssc stenographer')
  ) {
    exam.ex_servicemen_quota = true;
    updatedCount++;
  }

  // 5. Central Railways Exams with Ex-Servicemen quotas
  if (
    name.includes('rrb ntpc') ||
    name.includes('railways group d') ||
    name.includes('rrb alp') ||
    name.includes('rrb technician')
  ) {
    exam.ex_servicemen_quota = true;
    updatedCount++;
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Updated ${updatedCount} exams in exam_master.json`);
