import { chromium } from 'playwright';

const BETA_URL = 'https://beta.cheflowhq.com';
const EMAIL = 'agent@chefflow.test';
const PASSWORD = 'AgentChefFlow!2026';

async function login() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to beta site...');
  await page.goto(BETA_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Take a screenshot to see what we're looking at
  await page.screenshot({ path: 'test-screenshots/beta-landing.png', fullPage: false });
  console.log('Landing page screenshot saved');

  // Look for the sign-in link/button
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Try to navigate to sign in page
  const signInLink = page.locator('a:has-text("Sign"), a:has-text("Log"), button:has-text("Sign"), button:has-text("Log")').first();
  if (await signInLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Found sign-in link, clicking...');
    await signInLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Try navigating directly to sign-in
    console.log('No sign-in link found, navigating to /sign-in...');
    await page.goto(`${BETA_URL}/sign-in`, { waitUntil: 'networkidle', timeout: 30000 });
  }

  await page.screenshot({ path: 'test-screenshots/beta-signin-page.png', fullPage: false });
  console.log('Sign-in page screenshot saved. URL:', page.url());

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Filling credentials...');
    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    await page.screenshot({ path: 'test-screenshots/beta-filled.png', fullPage: false });

    // Click submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first();
    await submitBtn.click();

    console.log('Submitted login, waiting for navigation...');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    console.log('Post-login URL:', page.url());
    await page.screenshot({ path: 'test-screenshots/beta-post-login.png', fullPage: false });
  } else {
    console.log('Could not find email input on sign-in page');
  }

  // Keep browser open for inspection
  console.log('Browser open. Press Ctrl+C to close.');
  await page.waitForTimeout(300000); // 5 min
  await browser.close();
}

login().catch(console.error);
