const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173');
  
  // Wait a bit for React to load
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    // Go to "surgeries" tab. There is a sidebar item probably?
    // The user clicked "Agendar Cirurgia" which is on the "Mapa Cirúrgico" grid.
    await page.evaluate(() => {
      // Find the sidebar link to surgeries
      const btns = Array.from(document.querySelectorAll('*'));
      const surgeriesLink = btns.find(b => b.textContent === 'Mapa Cirúrgico' || b.textContent === 'Cirurgias');
      if (surgeriesLink) surgeriesLink.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));

    // Find and click Agendar
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const agendar = btns.find(b => b.textContent.includes('Agendar Cirurgia'));
      if (agendar) agendar.click();
    });

    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log('Error during click attempt:', e.message);
  }

  await browser.close();
})();
