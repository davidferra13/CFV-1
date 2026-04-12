import { chromium } from 'playwright';

const RECEIPT_PATH = 'C:/tmp/25b95abe-dbc5-4c97-8383-69dcd7f59bdc.png';
const BASE_URL = 'http://localhost:3100';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log('Step 1: Authenticate...');
    const authResp = await context.request.post(BASE_URL + '/api/e2e/auth', {
      data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Auth status:', authResp.status());
    if (!authResp.ok()) { const b = await authResp.text(); throw new Error('Auth failed: ' + b); }
    const cookies = await context.cookies(BASE_URL);
    console.log('Cookies set:', cookies.map(c => c.name).join(', '));

    console.log('Step 2: Navigate to /expenses...');
    await page.goto(BASE_URL + '/expenses', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const url1 = page.url();
    console.log('URL:', url1);
    await page.screenshot({ path: 'C:/tmp/receipt-test2-01-expenses.png', fullPage: true });
    console.log('Screenshot 1 saved');

    if (url1.includes('signin') || url1.includes('login')) {
      console.log('Redirected to login page - need direct UI login');
      await page.fill('input[name=email], input[type=email]', 'agent@local.chefflow');
      await page.fill('input[type=password]', 'CHEF.jdgyuegf9924092.FLOW');
      await page.click('button[type=submit]');
      await page.waitForTimeout(5000);
      await page.goto(BASE_URL + '/expenses', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'C:/tmp/receipt-test2-01b-after-login.png', fullPage: true });
      console.log('URL after login attempt:', page.url());
    }

    console.log('Step 3: Click Scan Receipt...');
    const scanLink = page.locator('a[href*=mode=scan]').first();
    if (await scanLink.count() > 0) {
      await scanLink.click();
      await page.waitForTimeout(3000);
    } else {
      await page.goto(BASE_URL + '/expenses/new?mode=scan', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'C:/tmp/receipt-test2-02-new-expense.png', fullPage: true });
    console.log('Screenshot 2 saved. URL:', page.url());

    const ocrBtn = page.locator('button:has-text("OCR Scan")').first();
    if (await ocrBtn.isVisible().catch(() => false)) {
      console.log('Step 4: Switching to OCR Scan mode...');
      await ocrBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'C:/tmp/receipt-test2-03-ocr-mode.png', fullPage: true });
      console.log('Screenshot 3 saved');
    }

    console.log('Step 5: Upload receipt file...');
    const fileInput = page.locator('input[type=file]').first();
    if (await fileInput.count() === 0) { throw new Error('No file input found'); }
    await fileInput.setInputFiles(RECEIPT_PATH);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'C:/tmp/receipt-test2-04-file-selected.png', fullPage: true });
    console.log('Screenshot 4 saved');

    console.log('Step 6: Trigger scan...');
    await page.waitForSelector('button:has-text("Scan Receipt")', { timeout: 10000 });
    await page.locator('button:has-text("Scan Receipt")').first().click();
    console.log('Waiting up to 90 seconds for OCR...');
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(1000);
      const t = await page.evaluate(() => document.body.innerText);
      if (!t.includes('Scanning...') && (t.includes('Scanned Data') || t.includes('Could not extract') || t.includes('Failed') || t.includes('line items'))) {
        console.log('Done after', i+1, 'seconds'); break;
      }
      if (i % 15 === 14) console.log('Still scanning...', i+1, 's');
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/tmp/receipt-test2-05-scan-result.png', fullPage: true });
    console.log('Screenshot 5 saved');

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('
=== PAGE TEXT ===');
    console.log(bodyText.substring(0, 3000));

    const storeVal = await page.locator('input[placeholder*=Store]').first().inputValue().catch(() => 'n/a');
    const amountVal = await page.locator('input[placeholder="0.00"]').first().inputValue().catch(() => 'n/a');
    const dateVal = await page.locator('input[type=date]').first().inputValue().catch(() => 'n/a');
    console.log('
=== FORM VALUES ===');
    console.log('Store:', storeVal, '| Amount:', amountVal, '| Date:', dateVal);

    await page.screenshot({ path: 'C:/tmp/receipt-test2-06-final.png', fullPage: true });
    console.log('Screenshot 6 saved. TEST COMPLETE.');

  } catch (err) {
    console.error('TEST FAILED:', err.message);
    await page.screenshot({ path: 'C:/tmp/receipt-test2-FAIL.png', fullPage: true }).catch(() => {});
    process.exit(1);
  } finally {
    if (consoleErrors.length) { console.log('
CONSOLE ERRORS:', consoleErrors); }
    await browser.close();
  }
})();