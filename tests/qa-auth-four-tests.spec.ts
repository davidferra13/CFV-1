import { test, expect } from '@playwright/test';

const SS = 'C:/Users/david/Documents/CFv1/qa-screenshots';

test.describe('QA Auth Tests', () => {

  test('Test 1: Chef signup page UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test1-signup-page.png', fullPage: true });
    const txt = await page.innerText('body');
    // Email field
    await expect(page.locator('input[type=email]').first()).toBeVisible();
    // Password field
    await expect(page.locator('input[type=password]').first()).toBeVisible();
    // Business name / text field
    await expect(page.locator('input[type=text]').first()).toBeVisible();
    // Phone field
    await expect(page.locator('input[type=tel]').first()).toBeVisible();
    // Has Sign in link
    expect(txt).toContain('Sign in');
    // No client sign up link
    expect(txt.toLowerCase()).not.toContain('client sign up');
    console.log('Test 1 console errors:', errors.length);
  });

  test('Test 2: Sign-in page UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test2-signin-page.png', fullPage: true });
    const txt = await page.innerText('body');
    // Has a generic sign up link
    expect(txt.toLowerCase()).toContain('sign up');
    // No Chef sign up label
    expect(txt.toLowerCase()).not.toContain('chef sign up');
    // No Client sign up label
    expect(txt.toLowerCase()).not.toContain('client sign up');
    console.log('Test 2 console errors:', errors.length);
  });

  test('Test 3: Standalone client signup is gated', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/auth/client-signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS + '/test3-client-signup-gated.png', fullPage: true });
    const txt = await page.innerText('body');
    const url = page.url();
    // Shows invitation message
    expect(txt.toLowerCase()).toContain('invitation');
    // Has Sign In link
    await expect(page.locator('a[href*=signin]').first()).toBeVisible();
    // Has chef signup reference
    expect(txt.toLowerCase()).toContain('chef');
    // NO form inputs
    const inputCnt = await page.locator('input:not([type=hidden])').count();
    expect(inputCnt, 'Should have no form inputs when no token').toBe(0);
    console.log('Test 3 URL:', url, 'input count:', inputCnt, 'console errors:', errors.length);
  });

  test('Test 4: Chef signup auto-login (end-to-end)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
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
    await page.locator('button[type=submit]').first().click();
    await page.waitForURL(u => \!u.includes('/auth/signup'), { timeout: 30000 });
    const finalUrl = page.url();
    await page.screenshot({ path: SS + '/test4-signup-result.png', fullPage: true });
    console.log('Test 4 final URL:', finalUrl, 'test email:', testEmail, 'console errors:', errors.length);
    expect(finalUrl, 'Should redirect to /dashboard after signup (auto-login)').toContain('/dashboard');
    expect(finalUrl).not.toContain('/auth/signin');
  });

});
