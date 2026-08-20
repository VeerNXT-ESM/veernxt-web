const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const examsFile = 'official_urls.json';
const outputBaseDir = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\PYPs';

if (!fs.existsSync(outputBaseDir)) {
  fs.mkdirSync(outputBaseDir, { recursive: true });
}

async function downloadPDF(url, destPath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`  [!] Failed to download ${url}:`, error.message);
  }
}

async function runDownloader() {
  const examsData = JSON.parse(fs.readFileSync(examsFile, 'utf8'));
  console.log(`Loaded ${examsData.length} exams.`);
  
  // Processing all 1588 exams
  const batch = examsData.filter(e => e.conducting_body && e.conducting_body.length > 2);
  
  console.log(`Starting bulk download for ${batch.length} exams...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (let i = 0; i < batch.length; i++) {
    const rawExamName = batch[i].raw['Name of the Examination'] || batch[i].conducting_body;
    const examName = rawExamName.trim();
    console.log(`\n[${i+1}/${batch.length}] Processing: ${examName}`);
    
    const examDir = path.join(outputBaseDir, examName.replace(/[<>:"/\\|?*]+/g, '_'));
    if (!fs.existsSync(examDir)) fs.mkdirSync(examDir, { recursive: true });
    
    const query = encodeURIComponent(`"${examName}" previous year question paper filetype:pdf`);
    const searchUrl = `https://duckduckgo.com/html/?q=${query}`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const pdfLinks = await page.$$eval('.result__url', els => els.map(e => e.href));
      
      const realUrls = pdfLinks
        .map(href => {
          const match = href.match(/uddg=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : null;
        })
        .filter(url => url && url.toLowerCase().includes('.pdf'));
      
      console.log(`  Found ${realUrls.length} PDF links.`);
      
      // Download top 2 PDFs
      for (let j = 0; j < Math.min(2, realUrls.length); j++) {
        const targetUrl = realUrls[j];
        const fileName = `PYP_${j+1}.pdf`;
        const destPath = path.join(examDir, fileName);
        
        console.log(`  Downloading PDF ${j+1}: ${targetUrl}`);
        await downloadPDF(targetUrl, destPath);
      }
      
    } catch (e) {
      console.error(`  [!] Error searching for ${examName}:`, e.message);
    }
    
    // Delay to avoid DDG rate limiting
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
  console.log('\nBulk download complete!');
}

runDownloader().catch(console.error);
