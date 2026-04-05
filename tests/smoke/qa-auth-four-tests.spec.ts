import { test, expect } from '@playwright/test';

const SS = 'C:/Users/david/Documents/CFv1/qa-screenshots';

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  // Pre-set localStorage to dismiss cookie consent banner (key from cookie-consent.tsx)
  await page.addInitScript(() => {
    const FAR_FUTURE = String(Date.now() + 1000 * 60 * 60 * 24 * 365);
    window.localStorage.setItem('cf-cookie-consent-dismissed-until', FAR_FUTURE);
  });
}

test.describe('QA Auth Tests', () => {

  test('Test 1: Chef signup page UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await dismissCookieBanner(page);
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test1-signup-page.png', fullPage: true });
    const txt = await page.innerText('body');
    await expect(page.locator('input[type=email]').first()).toBeVisible();
    await expect(page.locator('input[type=password]').first()).toBeVisible();
    await expect(page.locator('input[type=text]').first()).toBeVisible();
    await expect(page.locator('input[type=tel]').first()).toBeVisible();
    expect(txt).toContain('Sign in');
    expect(txt.toLowerCase()).not.toContain('client sign up');
    console.log('T1 console errors:', errors.length);
  });

  test('Test 2: Sign-in page UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await dismissCookieBanner(page);
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test2-signin-page.png', fullPage: true });
    const txt = await page.innerText('body');
    expect(txt.toLowerCase()).toContain('sign up');
    expect(txt.toLowerCase()).not.toContain('chef sign up');
    expect(txt.toLowerCase()).not.toContain('client sign up');
    console.log('T2 console errors:', errors.length);
  });

  test('Test 3: Standalone client signup is gated', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await dismissCookieBanner(page);
    await page.goto('/auth/client-signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test3-client-signup-gated.png', fullPage: true });
    const txt = await page.innerText('body');
    const url = page.url();
    expect(txt.toLowerCase()).toContain('invitation');
    await expect(page.locator('a[href*=signin]').first()).toBeVisible();
    expect(txt.toLowerCase()).toContain('chef');
    const inputCnt = await page.locator('input:not([type=hidden])').count();
    expect(inputCnt, 'Should have no form inputs when no token').toBe(0);
    console.log('T3 URL:', url, 'inputs:', inputCnt, 'errors:', errors.length);
  });

  test('Test 4: Chef signup auto-login (end-to-end)', async ({ page }) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await dismissCookieBanner(page);
    const testEmail = 'test-autologin-' + Date.now() + '@chefflow.test';
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type=email]', testEmail);
    await page.fill('input[type=password]', 'TestPass123\!');
    const txtInputs = await page.locator('input[type=text]').all();
    if (txtInputs.length > 0) await txtInputs[0].fill('Auto Login Test');
    const telInp = page.locator('input[type=tel]').first();
    if (await telInp.isVisible().catch(() => false)) await telInp.fill('555-555-5555');
    await page.screenshot({ path: SS + '/test4-signup-form-filled.png', fullPage: true });
    await page.locator('button[type=submit]').first().scrollIntoViewIfNeeded();
    await page.locator('button[type=submit]').first().click();
    await page.waitForURL(u => u.href.indexOf('/auth/signup') === -1, { timeout: 45000 });
    const finalUrl = page.url();
    await page.screenshot({ path: SS + '/test4-signup-result.png', fullPage: true });
    console.log('T4 final URL:', finalUrl, 'email:', testEmail, 'errors:', errors.length);
    expect(finalUrl, 'Should redirect to /dashboard after signup (auto-login)').toContain('/dashboard');
    expect(finalUrl).not.toContain('/auth/signin');
  });

});
