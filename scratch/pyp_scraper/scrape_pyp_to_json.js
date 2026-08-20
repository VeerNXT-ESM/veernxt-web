const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { delay } = require('./sources/_helpers');

async function scrapePYPToJson() {
  const sourcesConfigPath = path.join(__dirname, 'config', 'pyp_sources.json');
  let sourcesConfig;
  try {
    sourcesConfig = JSON.parse(fs.readFileSync(sourcesConfigPath, 'utf-8'));
  } catch(e) {
    console.error('[Engine] Could not load pyp_sources.json', e.message);
    process.exit(1);
  }

  const emitProgress = (msg) => console.log(msg);

  emitProgress(`[Engine] Initializing Puppeteer (Stealth) for PYP scrape...`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const enabledSources = sourcesConfig.sources.filter(s => s.enabled);
  let allPyp = [];
  const sourceResults = [];
  const totalStartTime = Date.now();

  for (let i = 0; i < enabledSources.length; i++) {
    const srcConfig = enabledSources[i];
    emitProgress(`[Engine] (${i + 1}/${enabledSources.length}) Scraping ${srcConfig.name}...`);
    
    try {
      const srcModule = require(`./sources/${srcConfig.module}`);
      const startTime = Date.now();
      const pypData = await srcModule.scrape(page);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (Array.isArray(pypData) && pypData.length > 0) {
        allPyp.push(...pypData);
        sourceResults.push({ name: srcConfig.name, count: pypData.length, status: 'ok', elapsed: `${elapsed}s` });
        emitProgress(`[Engine] ✅ ${srcConfig.name}: ${pypData.length} PYPs (${elapsed}s)`);
      } else {
        sourceResults.push({ name: srcConfig.name, count: 0, status: 'empty', elapsed: `${elapsed}s` });
        emitProgress(`[Engine] ⚠️ ${srcConfig.name}: 0 PYPs returned (${elapsed}s)`);
      }
    } catch (e) {
      sourceResults.push({ name: srcConfig.name, count: 0, status: 'error', error: e.message });
      emitProgress(`[Engine] ❌ ${srcConfig.name}: FAILED — ${e.message}`);
    }

    if (i < enabledSources.length - 1) {
      await delay(2000);
    }
  }

  await browser.close();

  const uniquePypMap = new Map();
  allPyp.forEach(pyp => {
    if (pyp && pyp.url) {
        uniquePypMap.set(pyp.url, pyp);
    } else if (pyp && pyp.title) {
        uniquePypMap.set(pyp.title, pyp);
    }
  });
  const uniquePyp = Array.from(uniquePypMap.values());

  const totalElapsed = ((Date.now() - totalStartTime) / 1000).toFixed(1);
  
  const outputPath = path.join(__dirname, 'scraped_pyp.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniquePyp, null, 2), 'utf-8');
  emitProgress(`[Engine] Scraping complete in ${totalElapsed}s. Saved to ${outputPath}`);
  
  return { results: uniquePyp, sourceResults, savedFile: outputPath };
}

if (require.main === module) {
  scrapePYPToJson().then(res => {
    console.log('\n--- Final Source Performance Summary ---');
    console.table(res.sourceResults);
    process.exit(0);
  }).catch(err => {
    console.error('[Engine] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapePYPToJson };
