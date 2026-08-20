const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const https = require('https');

async function searchAndDownloadPDF(examName) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const query = encodeURIComponent(`"${examName}" previous year question paper filetype:pdf`);
  const searchUrl = `https://duckduckgo.com/html/?q=${query}`;
  
  console.log(`Searching for: ${examName}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  
  const pdfLinks = await page.$$eval('.result__url', els => els.map(e => e.href).filter(href => href && href.toLowerCase().includes('.pdf')));
  
  console.log(`Found ${pdfLinks.length} PDF links for ${examName}.`);
  
  if (pdfLinks.length > 0) {
    const targetUrl = pdfLinks[0];
    console.log(`Downloading: ${targetUrl}`);
    // Download logic here... (skipping for this test to just verify we find links)
  }

  await browser.close();
}

searchAndDownloadPDF('SSC CGL').catch(console.error);
