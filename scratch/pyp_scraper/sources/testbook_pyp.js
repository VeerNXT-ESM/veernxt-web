const { delay } = require('./_helpers');
const fs = require('fs');

async function scrape(page) {
  console.log(`[Testbook PYP] Starting scrape...`);
  const items = [];
  
  try {
    await page.goto('https://testbook.com/previous-year-papers', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(5000); // Wait for React to render
    
    const html = await page.content();
    fs.writeFileSync('testbook_debug.html', html);
    await page.screenshot({ path: 'testbook_debug.png' });

    const pypElements = await page.$$eval(
      'a',
      (elements) => {
        const results = [];
        elements.forEach(el => {
          let title = el.innerText || '';
          let link = el.href;
          if (title && link && link.includes('previous-year') && link.includes('testbook.com')) {
            results.push({
              title: title.trim().replace(/\n/g, ' '),
              url: link,
              source: 'Testbook'
            });
          }
        });
        return results;
      }
    );

    pypElements.forEach(item => items.push(item));
  } catch (e) {
    console.warn(`[Testbook PYP] Error: ${e.message}`);
  }

  return items;
}

module.exports = { scrape };
