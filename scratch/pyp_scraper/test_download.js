const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { delay } = require('./sources/_helpers');

async function testDownload() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to Testbook SSC CGL PYP page...');
  await page.goto('https://testbook.com/ssc-cgl-previous-year-papers', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  // Find download buttons or PDF links
  const links = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText, href: a.href })).filter(a => a.text.toLowerCase().includes('pdf') || a.text.toLowerCase().includes('download') || a.href.includes('.pdf')));
  
  const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText).filter(t => t.toLowerCase().includes('pdf') || t.toLowerCase().includes('download')));

  console.log('Found Links:', links.slice(0, 5));
  console.log('Found Buttons:', buttons.slice(0, 5));

  await browser.close();
}

testDownload().catch(console.error);
