import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    page.on('requestfailed', request => console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure()?.errorText));

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err);
  }
})();
