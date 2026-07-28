import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5175/');
  
  try {
    await page.waitForSelector('input[type="email"]', { timeout: 2000 });
    await page.type('input[type="email"]', 'ti@medlifebrasil.com');
    await page.type('input[type="password"]', 'Junior03#');
    await page.click('button[type="submit"]');
  } catch(e) {}
  
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
