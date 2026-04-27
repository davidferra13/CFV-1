import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

const consoleMessages = [];
const errors = [];

page.on('console', msg => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
  if (msg.type() === 'error') errors.push(msg.text());
});

page.on('pageerror', err => {
  errors.push('PAGE ERROR: ' + err.message);
});

try {
  const response = await page.goto('http://127.0.0.1:3977/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('STATUS:', response.status());
  
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'c:/Users/david/Documents/CFv1/tests/coverage/page-3977-screenshot.png', fullPage: true });
  console.log('Screenshot saved');
  
  const title = await page.title();
  console.log('TITLE:', title);
  
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 3000));
  console.log('BODY TEXT (first 3000 chars):', bodyText);
  
  const buttons = await page.$$eval('button', els => els.map(e => e.innerText?.trim()).filter(Boolean));
  console.log('BUTTONS:', JSON.stringify(buttons.slice(0, 30)));
  
  const links = await page.$$eval('a', els => els.map(e => ({ text: e.innerText?.trim(), href: e.href })).filter(e => e.text));
  console.log('LINKS:', JSON.stringify(links.slice(0, 30)));
  
  const cards = await page.$$eval('[class*="card"], [class*="Card"]', els => els.length);
  console.log('CARD ELEMENTS:', cards);
  
  const hasPersona = await page.$$eval('[class*="persona"], [class*="Persona"], [data-persona]', els => els.length);
  console.log('PERSONA ELEMENTS:', hasPersona);
  
  const hasStats = await page.$$eval('[class*="stat"], [class*="Stat"], [class*="metric"], [class*="Metric"]', els => els.length);
  console.log('STAT/METRIC ELEMENTS:', hasStats);
  
  // Check for images
  const images = await page.$$eval('img', els => els.length);
  console.log('IMAGE ELEMENTS:', images);
  
  // Check headings
  const headings = await page.$$eval('h1, h2, h3', els => els.map(e => e.innerText?.trim()).filter(Boolean));
  console.log('HEADINGS:', JSON.stringify(headings.slice(0, 20)));
  
  console.log('\n--- CONSOLE ERRORS ---');
  if (errors.length === 0) {
    console.log('No JS errors detected');
  } else {
    errors.forEach(e => console.log('ERROR:', e));
  }
  
  console.log('\n--- ALL CONSOLE MESSAGES ---');
  consoleMessages.forEach(m => console.log('[' + m.type + ']', m.text));
  
} catch (err) {
  console.log('NAVIGATION ERROR:', err.message);
}

await browser.close();
