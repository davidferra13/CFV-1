import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

try {
  await page.goto('http://localhost:3100/auth/signin', { waitUntil: 'commit', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });

  await page.fill('input[type="email"]', 'susanloop36@gmail.com');
  await page.fill('input[type="password"]', 'TempTest!2026');
  await page.screenshot({ path: 'C:/Users/david/AppData/Local/Temp/before-submit.png' });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'C:/Users/david/AppData/Local/Temp/after-submit.png' });
  console.log('URL after submit:', page.url());

  // Get any error text
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('Page text snippet:', bodyText.replace(/\s+/g, ' ').trim().slice(0, 500));

} catch(e) {
  console.log('Error:', e.message.slice(0, 200));
  await page.screenshot({ path: 'C:/Users/david/AppData/Local/Temp/error.png' }).catch(() => {});
}

await browser.close();
