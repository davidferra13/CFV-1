import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';
const target = process.argv[2]; // pass page name as argument

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true
});
const page = await context.newPage();

if (target === 'landing') {
  // Public landing - no auth needed
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'screenshots/ss-landing.png', fullPage: false });
  console.log('OK: landing ->', page.url());
} else {
  // Sign in first
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"]').first().fill('agent@local.chefflow');
  await page.locator('input[type="password"]').first().fill('ChefFlowLocal!123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);

  // Dismiss overlays
  try { const b = page.locator('button:has-text("Accept")').first(); if (await b.isVisible({ timeout: 500 })) await b.click(); } catch {}
  try { const b = page.locator('text="Skip, I will explore on my own"').first(); if (await b.isVisible({ timeout: 500 })) await b.click(); } catch {}

  const urlMap = {
    finance: '/finance',
    events: '/events',
    settings: '/settings',
    operations: '/operations',
    growth: '/growth',
  };

  const url = urlMap[target] || `/${target}`;
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);

  // Dismiss overlays again
  try { const b = page.locator('button:has-text("Accept")').first(); if (await b.isVisible({ timeout: 500 })) await b.click(); } catch {}
  try { const b = page.locator('text="Skip, I will explore on my own"').first(); if (await b.isVisible({ timeout: 500 })) await b.click(); } catch {}
  try { const b = page.locator('button[aria-label="Close"]').first(); if (await b.isVisible({ timeout: 500 })) await b.click(); } catch {}

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `screenshots/ss-${target}.png`, fullPage: false });
  console.log(`OK: ${target} -> ${page.url()}`);
}

await browser.close();
console.log('Done.');
