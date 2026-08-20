const fs = require('fs');
const path = require('path');

const examsFile = 'official_urls.json';
const outputBaseDir = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\PYPs';

const examsData = JSON.parse(fs.readFileSync(examsFile, 'utf8'));

const failedExams = [];
let successCount = 0;

for (const exam of examsData) {
  const rawExamName = exam.raw['Name of the Examination'] || exam.conducting_body;
  if (!rawExamName) continue;
  
  const examName = rawExamName.trim();
  const folderName = examName.replace(/[<>:"/\\|?*]+/g, '_');
  const examDir = path.join(outputBaseDir, folderName);
  
  let hasPdf = false;
  if (fs.existsSync(examDir)) {
    const files = fs.readdirSync(examDir);
    if (files.some(f => f.toLowerCase().endsWith('.pdf'))) {
      hasPdf = true;
    }
  }
  
  if (hasPdf) {
    successCount++;
  } else {
    failedExams.push(exam);
  }
}

fs.writeFileSync('failed_exams.json', JSON.stringify(failedExams, null, 2));
console.log(`Successfully downloaded: ${successCount}`);
console.log(`Failed / Missing: ${failedExams.length}`);
