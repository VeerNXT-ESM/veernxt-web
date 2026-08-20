const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const examListDir = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\1. EXAM LIST';
const files = [
  'Central_Exams_Subject_Wise.xlsx',
  'State_Exams_Subject_Wisex.xlsx',
  'UT_Exams_Subject_Wise_FULL.xlsx'
];

let allData = [];

files.forEach(file => {
  const filePath = path.join(examListDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`Parsing ${file}...`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    if (data.length > 0) {
      console.log(`Headers for ${file}:`, Object.keys(data[0]));
    }
    allData = allData.concat(data);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log(`Total rows extracted: ${allData.length}`);

// Try to find the URL column
const urlColumns = ['url', 'website', 'link', 'official site', 'official website', 'web site'];
let urlCol = null;
let bodyCol = null;

if (allData.length > 0) {
  const keys = Object.keys(allData[0]);
  urlCol = keys.find(k => urlColumns.some(u => k.toLowerCase().includes(u)));
  bodyCol = keys.find(k => k.toLowerCase().includes('conducting body') || k.toLowerCase().includes('board') || k.toLowerCase().includes('commission'));
  
  console.log(`Found URL Column: ${urlCol}`);
  console.log(`Found Conducting Body Column: ${bodyCol}`);
}

const parsedExams = allData.map(row => ({
  conducting_body: row[bodyCol] || row['Conducting Body'] || row['Board'] || row['Exam Name'],
  url: row[urlCol] || row['Website'] || row['Official Link'],
  raw: row
}));

fs.writeFileSync('official_urls.json', JSON.stringify(parsedExams, null, 2));
console.log('Saved to official_urls.json');
