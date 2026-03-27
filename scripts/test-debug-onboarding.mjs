import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Sign in with the existing test account
await page.goto('https://cheflowhq.com/auth/signin', { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').fill('claude.test.1774576153006@testchef.com');
await page.locator('input[type="password"]').fill('TestChef2026!');
await page.click('button:has-text("Sign In")');

// Wait for hard navigation
try {
  await page.waitForURL(url => {
    const u = url.toString();
    return !u.includes('/auth/signin');
  }, { timeout: 20000 });
} catch (e) {
  console.log('Timeout waiting for redirect');
}
await page.waitForLoadState('load');
await page.waitForTimeout(5000);

console.log('URL:', page.url());

const html = await page.content();

// Check for server-side error
const hasError = html.includes('Internal Server Error') || html.includes('Application error');
console.log('Has error page:', hasError);

const portalDiv = await page.locator('[data-cf-portal]').count();
console.log('Portal div:', portalDiv);

const bodyText = await page.locator('body').innerText().catch(() => '');
console.log('Body text (first 500):', bodyText.substring(0, 500));

await page.screenshot({ path: 'screenshots/e2e-debug-server.png', fullPage: true });

// Now try a direct hard load of /onboarding
console.log('\n--- Direct load of /onboarding ---');
await page.goto('https://cheflowhq.com/onboarding', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(5000);
console.log('URL:', page.url());

const portalDiv2 = await page.locator('[data-cf-portal]').count();
console.log('Portal div:', portalDiv2);

const bodyText2 = await page.locator('body').innerText().catch(() => '');
console.log('Body text (first 500):', bodyText2.substring(0, 500));

await page.screenshot({ path: 'screenshots/e2e-debug-direct.png', fullPage: true });

await browser.close();
