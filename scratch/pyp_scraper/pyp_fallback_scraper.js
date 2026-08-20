const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const failedExamsFile = 'failed_exams.json';
const outputBaseDir = 'K:\\H DRIVE\\Quantum Climb\\CLIENT ASSETS\\VeerNXT\\CONTENT\\PYPs';

async function downloadPDF(url, destPath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`  [!] Failed to download PDF ${url}:`, error.message);
  }
}

function buildQuery(exam) {
  const raw = exam.raw;
  const state = raw['State'] || raw['State / UT'] || '';
  const body = raw['Conducting Body'] || '';
  const category = raw['Name of the Examination'] || raw['Category of Exam'] || raw['Category'] || '';
  
  // Combine unique parts
  const parts = [state, body, category].map(s => s.trim()).filter(s => s.length > 0);
  const uniqueParts = [...new Set(parts)];
  
  return `${uniqueParts.join(' ')} previous year question paper`.trim();
}

async function runFallbackScraper() {
  const failedExams = JSON.parse(fs.readFileSync(failedExamsFile, 'utf8'));
  console.log(`Loaded ${failedExams.length} failed exams.`);
  
  // Process all 1155 failed exams
  const batch = failedExams;
  console.log(`Starting fallback scraper for test batch of ${batch.length}...`);
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (let i = 0; i < batch.length; i++) {
    const exam = batch[i];
    const rawExamName = exam.raw['Name of the Examination'] || exam.conducting_body;
    const examName = rawExamName.trim();
    
    console.log(`\n[${i+1}/${batch.length}] Fallback Processing: ${examName}`);
    
    const examDir = path.join(outputBaseDir, examName.replace(/[<>:"/\\|?*]+/g, '_'));
    if (!fs.existsSync(examDir)) fs.mkdirSync(examDir, { recursive: true });
    
    const query = buildQuery(exam);
    console.log(`  -> Search Query: "${query}"`);
    
    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const resultLinks = await page.$$eval('.result__url', els => {
        return els.map(e => e.href).map(href => {
          const match = href.match(/uddg=([^&]+)/);
          return match ? decodeURIComponent(match[1]) : null;
        }).filter(url => url && !url.includes('duckduckgo.com')).slice(0, 2);
      });
      
      console.log(`  Found ${resultLinks.length} results to check.`);
      
      for (let j = 0; j < resultLinks.length; j++) {
        const link = resultLinks[j];
        console.log(`  Checking Link ${j+1}: ${link}`);
        
        if (link.toLowerCase().endsWith('.pdf')) {
          console.log(`    -> Direct PDF found! Downloading...`);
          await downloadPDF(link, path.join(examDir, `Fallback_Direct_${j+1}.pdf`));
          continue;
        }
        
        // Visit HTML page
        try {
          await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
          // Check for PDF links in DOM
          const pdfLinks = await page.$$eval('a', anchors => anchors.map(a => a.href).filter(h => h.toLowerCase().endsWith('.pdf')));
          
          if (pdfLinks.length > 0) {
            console.log(`    -> Found ${pdfLinks.length} PDF links in DOM. Downloading first one...`);
            await downloadPDF(pdfLinks[0], path.join(examDir, `Fallback_Extracted_${j+1}.pdf`));
          } else {
            // No PDFs! Use Readability to extract text
            console.log(`    -> No PDFs. Extracting text content...`);
            const html = await page.content();
            const doc = new JSDOM(html, { url: link }).window.document;
            const reader = new Readability(doc);
            const article = reader.parse();
            
            if (article && article.textContent && article.textContent.length > 500) {
              const textContent = `Title: ${article.title}\nSource: ${link}\n\n${article.textContent.trim()}`;
              fs.writeFileSync(path.join(examDir, `Fallback_Text_${j+1}.txt`), textContent);
              console.log(`    -> Saved text content (${textContent.length} chars).`);
            } else {
              console.log(`    -> Text too short or extraction failed.`);
            }
          }
        } catch (pageErr) {
          console.error(`    [!] Error loading page: ${pageErr.message}`);
        }
      }
      
    } catch (e) {
      console.error(`  [!] Error searching Google:`, e.message);
    }
    
    // Delay to avoid Google rate limiting
    await new Promise(r => setTimeout(r, 5000));
  }

  await browser.close();
  console.log('\nFallback test batch complete!');
}

runFallbackScraper().catch(console.error);
