const { delay } = require('./_helpers');

async function scrape(page) {
  console.log(`[Adda247 PYP] Starting scrape...`);
  const items = [];
  
  try {
    await page.goto('https://www.adda247.com/jobs/previous-year-question-papers/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(5000); // Wait for React to render

    const pypElements = await page.$$eval(
      'a, article h2 a, .entry-title a',
      (elements) => {
        const results = [];
        elements.forEach(el => {
          let title = el.innerText || '';
          let link = el.href;
          if (title && link && title.toLowerCase().includes('previous year') && link.includes('adda247.com')) {
            results.push({
              title: title.trim().replace(/\n/g, ' '),
              url: link,
              source: 'Adda247'
            });
          }
        });
        return results;
      }
    );

    pypElements.forEach(item => items.push(item));
  } catch (e) {
    console.warn(`[Adda247 PYP] Error: ${e.message}`);
  }

  return items;
}

module.exports = { scrape };
