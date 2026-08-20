const { delay } = require('./_helpers');

async function scrape(page) {
  console.log(`[Oliveboard PYP] Starting scrape...`);
  const items = [];
  
  try {
    await page.goto('https://www.oliveboard.in/previous-year-papers/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(5000); // Wait for React to render

    const pypElements = await page.$$eval(
      'a',
      (elements) => {
        const results = [];
        elements.forEach(el => {
          let title = el.innerText || '';
          let link = el.href;
          if (title && link && link.includes('previous-year-papers') && title.length > 5) {
            results.push({
              title: title.trim().replace(/\n/g, ' '),
              url: link,
              source: 'Oliveboard'
            });
          }
        });
        return results;
      }
    );

    pypElements.forEach(item => items.push(item));
  } catch (e) {
    console.warn(`[Oliveboard PYP] Error: ${e.message}`);
  }

  return items;
}

module.exports = { scrape };
