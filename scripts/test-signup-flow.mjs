import { chromium } from 'playwright';

const testEmail = 'claude.test.' + Date.now() + '@testchef.com';
const testPassword = 'TestChef2026!';
const testName = 'Claude Test Kitchen';

console.log('=== FULL END-TO-END: SIGNUP -> SIGNIN -> ONBOARDING ===');
console.log('Email:', testEmail);
console.log('');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ===== STEP 1: LANDING PAGE =====
console.log('1. Landing page...');
await page.goto('https://cheflowhq.com', { waitUntil: 'networkidle', timeout: 30000 });
await page.screenshot({ path: 'screenshots/e2e-01-landing.png' });
console.log('   OK:', page.url());

// ===== STEP 2: SIGNUP =====
console.log('2. Navigate to signup...');
await page.click('text=Get Started Free');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);
console.log('   OK:', page.url());

console.log('3. Fill signup form...');
await page.locator('input[type="email"]').fill(testEmail);
await page.locator('input[type="password"]').fill(testPassword);
await page.locator('input[type="text"]').fill(testName);
await page.locator('input[type="tel"]').fill('5551234567');
await page.screenshot({ path: 'screenshots/e2e-02-signup-filled.png' });

console.log('4. Submit signup...');
await page.click('text=Create Account');
try {
  await page.waitForURL(url => !url.toString().includes('/auth/signup'), { timeout: 15000 });
} catch { /* ok */ }
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshots/e2e-03-after-signup.png' });
console.log('   URL:', page.url());
console.log('   On cheflowhq.com:', page.url().includes('cheflowhq.com'));

// ===== STEP 3: SIGNIN =====
console.log('5. Sign in...');
if (!page.url().includes('/auth/signin')) {
  await page.goto('https://cheflowhq.com/auth/signin', { waitUntil: 'networkidle' });
}
await page.locator('input[type="email"]').fill(testEmail);
await page.locator('input[type="password"]').fill(testPassword);
await page.screenshot({ path: 'screenshots/e2e-04-signin-filled.png' });

console.log('6. Submit signin...');
await page.click('button:has-text("Sign In")');

// Wait for hard navigation (window.location.href)
try {
  await page.waitForURL(url => !url.toString().includes('/auth/signin'), { timeout: 20000 });
} catch { /* check below */ }
await page.waitForLoadState('load');
await page.waitForTimeout(5000);
await page.screenshot({ path: 'screenshots/e2e-05-after-signin.png' });
console.log('   URL:', page.url());
console.log('   On cheflowhq.com:', page.url().includes('cheflowhq.com'));
console.log('   On localhost:', page.url().includes('localhost'));

// ===== STEP 4: VERIFY ONBOARDING =====
console.log('7. Checking destination...');
const portalDiv = await page.locator('[data-cf-portal="chef"]').count();
const wizardText = await page.locator('text=ChefFlow Setup').count();
const bodyText = await page.locator('body').innerText().catch(() => '');
const hasWizardContent = bodyText.includes('ChefFlow Setup') || bodyText.includes('Tell us about') || bodyText.includes('Welcome to ChefFlow');

console.log('   Chef portal rendered:', portalDiv > 0);
console.log('   Wizard visible:', wizardText > 0);
console.log('   Has wizard content:', hasWizardContent);

await page.screenshot({ path: 'screenshots/e2e-06-final.png', fullPage: true });

// ===== SUMMARY =====
const finalUrl = page.url();
const allGood = finalUrl.includes('cheflowhq.com') && !finalUrl.includes('localhost') && (portalDiv > 0 || hasWizardContent);

console.log('\n=== RESULT ===');
console.log('Final URL:', finalUrl);
console.log('Domain preserved:', !finalUrl.includes('localhost'));
console.log('Content rendered:', portalDiv > 0 || hasWizardContent);
console.log('PASS:', allGood ? 'YES' : 'NO');

await browser.close();
process.exit(allGood ? 0 : 1);
