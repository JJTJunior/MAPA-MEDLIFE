const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('Navigating...');
  try {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'abmaelleite1@gmail.com');
    await page.type('input[type="password"]', 'medlife2026');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.dashboard-title');
    
    const buttons = await page.$$('button.nav-btn');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Mapa Cirúrgico')) {
        await btn.click();
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
    const html = await page.content();
    console.log(html);
  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await browser.close();
  }
})();
