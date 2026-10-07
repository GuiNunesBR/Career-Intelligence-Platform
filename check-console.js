import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR: ' + err.toString());
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR: ' + msg.text());
    }
  });

  try {
    await page.goto('http://127.0.0.1:3000', {waitUntil: 'domcontentloaded'});
    console.log('Página carregada, aguardando 3s...');
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.error('Falha ao navegar', err);
  } finally {
    await browser.close();
  }
})();
