
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3100';
const AUTH_EMAIL = 'agent@local.chefflow';
const AUTH_PASSWORD = 'CHEF.jdgyuegf9924092.FLOW';
const RECEIPT_PATH = 'C:/Users/david/AppData/Local/Temp/test-receipt-generated.png';
const SS = 'C:/tmp';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ baseURL: BASE_URL });

  console.log('=== STEP 1: AUTH ===');
  const authResp = await context.request.post('/api/e2e/auth', {
    data: { email: AUTH_EMAIL, password: AUTH_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('Auth status:', authResp.status());
  console.log('Auth body:', await authResp.text());
  const cookies = await context.cookies('http://localhost:3100');
  console.log('Cookies:', cookies.map(c => c.name + '=' + c.value.substring(0, 20)));

  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('response', r => { if (r.status() >= 400) console.log('HTTP ' + r.status() + ' ' + r.url()); });

  console.log('
=== STEP 2: NAVIGATE ===');
  try {
    await page.goto('/expenses/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch(e) { console.log('Nav err:', e.message.substring(0, 100)); }
  await sleep(2000);

  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  await page.screenshot({ path: SS + '/receipt-browser-01-initial.png', fullPage: true });

  const body1 = await page.evaluate(() => document.body.innerText);
  console.log('Body:', body1.substring(0, 600));

  if (page.url().includes('signin') || page.url().includes('sign-in')) {
    console.log('REDIRECTED TO SIGNIN - session issue');
    await browser.close(); return;
  }

  console.log('
=== STEP 3: FIND OCR TAB ===');
  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button,[role=tab]')).map(el => el.textContent?.trim()).filter(Boolean);
  });
  console.log('Clickable items:', JSON.stringify(items));

  const ocrEl = page.locator('button,[role=tab]').filter({ hasText: /ocr|scan/i });
  if (await ocrEl.count() > 0) {
    console.log('Clicking OCR/Scan tab');
    await ocrEl.first().click();
    await sleep(1000);
    await page.screenshot({ path: SS + '/receipt-browser-02-ocr-tab.png', fullPage: true });
  } else {
    console.log('No OCR tab found');
  }

  console.log('
=== STEP 4: FILE INPUT ===');
  let fi = page.locator('input[type=file]').first();
  if (await fi.count() === 0) {
    const allInputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input')).map(el => ({ type: el.type, id: el.id, name: el.name }))
    );
    console.log('All inputs:', JSON.stringify(allInputs));
    const ul = page.locator('button,label').filter({ hasText: /upload|choose|browse/i });
    if (await ul.count() > 0) { await ul.first().click(); await sleep(500); }
    fi = page.locator('input[type=file]').first();
  }

  if (await fi.count() > 0) {
    console.log('Setting file');
    await fi.setInputFiles(RECEIPT_PATH);
    await sleep(1500);
    await page.screenshot({ path: SS + '/receipt-browser-03-file-set.png', fullPage: true });
    const body2 = await page.evaluate(() => document.body.innerText);
    console.log('After file set:', body2.substring(0, 500));
  } else {
    const html = await page.evaluate(() => document.body.innerHTML.substring(0, 4000));
    console.log('NO FILE INPUT. HTML:', html);
    await page.screenshot({ path: SS + '/receipt-browser-no-input.png', fullPage: true });
    await browser.close(); return;
  }

  console.log('
=== STEP 5: SCAN BUTTON ===');
  const sb = page.locator('button').filter({ hasText: /scan receipt|scan|process/i });
  if (await sb.count() > 0) {
    console.log('Clicking:', await sb.first().textContent());
    await sb.first().click();
    await sleep(2000);
    await page.screenshot({ path: SS + '/receipt-browser-04-scanning.png', fullPage: true });
  } else {
    const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()));
    console.log('No scan btn. Buttons:', btns);
  }

  console.log('
=== STEP 6: POLL RESULTS ===');
  const t0 = Date.now();
  let found = false, poll = 0;
  while ((Date.now() - t0) < 300000) {
    await sleep(5000);
    poll++;
    const elapsed = Math.round((Date.now() - t0) / 1000);
    const bt = await page.evaluate(() => document.body.innerText);
    const kws = ['Scanned Data','Review','line items','failed','unavailable','Could not extract','Store Name','Market Basket','Total Amount','Error extracting'];
    const hits = kws.filter(k => bt.toLowerCase().includes(k.toLowerCase()));
    console.log('Poll ' + poll + ' (' + elapsed + 's): [' + hits.join(',') + ']');
    if (hits.length > 0) {
      await page.screenshot({ path: SS + '/receipt-browser-05-result.png', fullPage: true });
      found = true; break;
    }
    if (poll % 6 === 0) await page.screenshot({ path: SS + '/receipt-browser-wait-' + elapsed + '.png', fullPage: true });
  }
  if (!found) {
    await page.screenshot({ path: SS + '/receipt-browser-timeout.png', fullPage: true });
    console.log('TIMEOUT');
  }

  console.log('
=== STEP 7: FORM VALUES ===');
  await page.screenshot({ path: SS + '/receipt-browser-06-final.png', fullPage: true });
  const ft = await page.evaluate(() => document.body.innerText);
  console.log('Page text:', ft.substring(0, 5000));

  const fv = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input,textarea,select')).filter(el => el.value).map(el => {
      const lb = document.querySelector('label[for=' + JSON.stringify(el.id) + ']');
      return { id: el.id, name: el.name, type: el.type, value: el.value, label: lb ? lb.textContent.trim() : el.placeholder };
    });
  });
  console.log('Form values:', JSON.stringify(fv, null, 2));
  console.log('Console errors:', errors.join('
') || 'None');

  await browser.close();
  console.log('DONE');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
