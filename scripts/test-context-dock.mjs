import { chromium } from 'playwright';
import fs from 'fs';

const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf8'));
const menuId = 'e0a10006-0001-4000-8000-000000000001';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

// Sign in via form
console.log('Signing in...');
await page.goto('http://localhost:3100/auth/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);
await page.fill('input[name="email"]', creds.email);
await page.fill('input[name="password"]', creds.password);
await page.click('button[type="submit"]');

// Wait for URL to change or 30s
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(2000);
  if (!page.url().includes('/auth/signin')) break;
}
console.log('After login:', page.url());

// Go to editor - use page.evaluate for navigation to avoid Playwright timeout
console.log('Going to editor...');
await page.evaluate((id) => { window.location.href = `/menus/${id}/editor`; }, menuId);

// Wait for content to appear
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(3000);
  // Check for any real content
  const body = await page.evaluate(() => document.body?.innerText?.length || 0);
  const url = page.url();
  if (i % 3 === 0) console.log(`  ${(i+1)*3}s url=${url} bodyLen=${body}`);

  // If we got redirected to onboarding/signin, note it
  if (url.includes('/onboarding') || url.includes('/signin')) {
    console.log('Redirected away from editor to:', url);
    await page.screenshot({ path: 'screenshots/redirected.png' });
    break;
  }

  // If body has substantial content, we're good
  if (body > 100 && url.includes('/editor')) {
    console.log('Editor loaded with content');
    break;
  }
}

await page.screenshot({ path: 'screenshots/menu-editor-full.png' });
console.log('Editor screenshot saved');

// Now go to /menus/new
console.log('Going to create form...');
await page.evaluate(() => { window.location.href = '/menus/new'; });

for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(3000);
  const body = await page.evaluate(() => document.body?.innerText?.length || 0);
  const url = page.url();
  if (i % 3 === 0) console.log(`  ${(i+1)*3}s url=${url} bodyLen=${body}`);
  if (body > 100 && url.includes('/menus/new')) break;
  if (url.includes('/signin')) { console.log('Session lost'); break; }
}

await page.screenshot({ path: 'screenshots/menu-create-form.png' });
console.log('Create form screenshot saved');

await browser.close();
console.log('Done!');
