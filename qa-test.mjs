import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' };
const SCREENSHOT_DIR = 'C:/Users/david/Documents/CFv1/qa-screenshots';

const results = [];
let page, context, browser;

async function setup() {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();

  page.consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      page.consoleErrors.push(msg.text());
    }
  });

  const resp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: CREDS,
    timeout: 30000,
  });

  if (!resp.ok()) {
    console.error('Auth failed:', resp.status(), await resp.text());
    process.exit(1);
  }
  console.log('Auth OK');

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  const url = page.url();

  if (url.includes('/sign-in') || url.includes('/login')) {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/auth-failed.png` });
    console.error('Auth failed - redirected to:', url);
    process.exit(1);
  }

  console.log('Authenticated. Starting tests.\n');
}

async function screenshot(name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function testRoute(name, route, extraChecks) {
  const test = { name, route, status: 'PASS', errors: [], consoleErrors: [], screenshots: [] };

  try {
    page.consoleErrors = [];

    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    const httpStatus = response ? response.status() : 0;
    const currentUrl = page.url();

    // Check HTTP status
    if (httpStatus === 404) {
      test.status = 'FAIL';
      test.errors.push(`HTTP 404`);
    }

    // Check redirect to login
    if (currentUrl.includes('/sign-in') || currentUrl.includes('/login')) {
      test.status = 'FAIL';
      test.errors.push(`Redirected to login: ${currentUrl}`);
    }

    // Check for Next.js error page (only the dedicated 404 page, not incidental text)
    const title = await page.title().catch(() => '');
    const has404Page = await page.locator('text="Page Not Found"').first().isVisible().catch(() => false);
    const hasAppError = await page.locator('text="Application error"').first().isVisible().catch(() => false);

    if (has404Page) {
      test.status = 'FAIL';
      test.errors.push('404 page rendered');
    }
    if (hasAppError) {
      test.status = 'FAIL';
      test.errors.push('Application error');
    }

    const ssPath = await screenshot(`${name.replace(/\s+/g, '-').toLowerCase()}`);
    test.screenshots.push(ssPath);

    if (extraChecks && test.status === 'PASS') {
      await extraChecks(test);
    }

    // Test refresh persistence
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    const afterRefresh = page.url();
    if (afterRefresh.includes('/sign-in') || afterRefresh.includes('/login')) {
      test.status = 'FAIL';
      test.errors.push('Lost auth after refresh');
    }

    if (page.consoleErrors.length > 0) {
      test.consoleErrors = [...page.consoleErrors];
    }

  } catch (err) {
    test.status = 'FAIL';
    test.errors.push(`Exception: ${err.message.split('\n')[0]}`);
    try { await screenshot(`${name.replace(/\s+/g, '-').toLowerCase()}-error`); } catch {}
  }

  results.push(test);
  const icon = test.status === 'PASS' ? 'OK  ' : 'FAIL';
  const consoleNote = test.consoleErrors.length ? ` [${test.consoleErrors.length} console errs]` : '';
  console.log(`[${icon}] ${name} (${route})${test.errors.length ? ' - ' + test.errors.join('; ') : ''}${consoleNote}`);
  return test;
}

async function run() {
  const { mkdirSync } = await import('fs');
  try { mkdirSync(SCREENSHOT_DIR, { recursive: true }); } catch {}

  await setup();

  // ========== CORE PAGES ==========
  console.log('--- Core Pages ---');
  await testRoute('Dashboard', '/dashboard', async () => {
    const cards = await page.locator('[class*="card"], [class*="Card"], .rounded-xl').count();
    console.log(`     Cards/panels: ${cards}`);
  });

  await testRoute('Events', '/events', async () => {
    const newBtn = page.locator('a:has-text("New Event"), button:has-text("New Event")').first();
    if (await newBtn.isVisible().catch(() => false)) {
      console.log('     + New Event button visible');
    }
  });

  await testRoute('Clients', '/clients', async () => {
    const addBtn = page.locator('a:has-text("Add Client"), button:has-text("Add Client")').first();
    if (await addBtn.isVisible().catch(() => false)) {
      console.log('     + Add Client button visible');
    }
  });

  await testRoute('Recipes', '/recipes');
  await testRoute('Inquiries', '/inquiries');
  await testRoute('Menus', '/menus');
  await testRoute('Documents', '/documents');
  await testRoute('Calendar', '/calendar');
  await testRoute('Inbox', '/inbox');

  // ========== RECENT FEATURES (last 2 weeks) ==========
  console.log('\n--- Recent Features ---');

  // Social links + featured chef (commit 95fce102)
  await testRoute('Settings Profile', '/settings/profile', async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot('settings-profile-bottom');
  });

  // Loyalty program (commits 97049235, 22c7e624)
  await testRoute('Loyalty Program', '/loyalty', async () => {
    const tiers = page.locator('text=Bronze, text=Silver, text=Gold, text=Platinum').first();
    if (await tiers.isVisible().catch(() => false)) {
      console.log('     + Tier breakdown visible');
    }
  });

  // Dinner Circles elevation (commit ddbfa6e8) - correct route is /circles
  await testRoute('Dinner Circles', '/circles');

  // Lifecycle Intelligence (commit 24c4eda4)
  await testRoute('Intelligence', '/intelligence');

  // Navigation overhaul (commit 95afc59a)
  await testRoute('Settings Modules', '/settings/modules');
  await testRoute('Settings Billing', '/settings/billing');
  await testRoute('Settings Embed', '/settings/embed');

  // ========== ADDITIONAL PAGES ==========
  console.log('\n--- Additional Pages ---');
  await testRoute('Staff', '/staff');
  await testRoute('Network', '/network');
  await testRoute('Prospecting', '/prospecting');
  await testRoute('Analytics', '/analytics');
  await testRoute('Tasks', '/tasks');
  await testRoute('Finance', '/finance');
  await testRoute('Culinary', '/culinary');
  await testRoute('Inventory', '/inventory');
  await testRoute('Portfolio', '/portfolio');
  await testRoute('Availability', '/availability');
  await testRoute('Social Hub', '/social/hub-overview');
  await testRoute('Community Templates', '/community/templates');
  await testRoute('Marketplace', '/marketplace');

  // ========== SETTINGS PAGES ==========
  console.log('\n--- Settings ---');
  await testRoute('Settings Main', '/settings');
  await testRoute('Settings Email', '/settings/email');
  await testRoute('Settings Notifications', '/settings/notifications');
  await testRoute('Settings Calendar Sync', '/settings/calendar-sync');
  await testRoute('Settings Contracts', '/settings/contracts');
  await testRoute('Settings Automations', '/settings/automations');

  // ========== NAVIGATION STRESS TEST ==========
  console.log('\n--- Stress Tests ---');
  try {
    page.consoleErrors = [];
    const rapidRoutes = ['/dashboard', '/events', '/clients', '/recipes', '/menus', '/loyalty', '/settings/profile', '/inquiries'];
    for (const r of rapidRoutes) {
      await page.goto(`${BASE}${r}`, { waitUntil: 'commit', timeout: 15000 });
      await page.waitForTimeout(300);
    }
    // Rapid back navigation
    for (let i = 0; i < 4; i++) {
      await page.goBack({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1500);
    const finalUrl = page.url();
    const res = { name: 'Rapid Navigation', route: 'multi', status: 'PASS', errors: [], consoleErrors: [...page.consoleErrors], screenshots: [] };
    if (finalUrl.includes('/sign-in')) { res.status = 'FAIL'; res.errors.push('Lost auth'); }
    await screenshot('rapid-nav-stress');
    res.screenshots.push(`${SCREENSHOT_DIR}/rapid-nav-stress.png`);
    results.push(res);
    console.log(`[${res.status === 'PASS' ? 'OK  ' : 'FAIL'}] Rapid Navigation`);
  } catch (err) {
    results.push({ name: 'Rapid Navigation', route: 'multi', status: 'FAIL', errors: [err.message.split('\n')[0]], consoleErrors: [], screenshots: [] });
    console.log('[FAIL] Rapid Navigation');
  }

  // Broken images check
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);
    const imgs = await page.locator('img').all();
    let broken = 0;
    for (const img of imgs) {
      const src = await img.getAttribute('src').catch(() => '');
      const nat = await img.evaluate(el => el.naturalWidth).catch(() => 0);
      if (nat === 0 && src) { broken++; console.log(`     Broken img: ${src}`); }
    }
    results.push({ name: 'Broken Images', route: '/dashboard', status: broken > 0 ? 'FAIL' : 'PASS', errors: broken > 0 ? [`${broken} broken`] : [], consoleErrors: [], screenshots: [] });
    console.log(`[${broken > 0 ? 'FAIL' : 'OK  '}] Broken Images (${broken} broken)`);
  } catch (err) {
    console.log(`[FAIL] Broken Images - ${err.message.split('\n')[0]}`);
  }

  // ========== SUMMARY ==========
  console.log('\n========================================');
  console.log('        QA TEST RESULTS SUMMARY');
  console.log('========================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed}\n`);

  if (failed > 0) {
    console.log('=== FAILURES ===');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  [FAIL] ${r.name} (${r.route}): ${r.errors.join('; ')}`);
    }
    console.log('');
  }

  console.log('=== ALL RESULTS ===');
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'OK  ' : 'FAIL';
    const extra = [];
    if (r.errors.length) extra.push(r.errors.join('; '));
    if (r.consoleErrors.length) extra.push(`${r.consoleErrors.length} console errs`);
    console.log(`  [${icon}] ${r.name} (${r.route})${extra.length ? ' - ' + extra.join(' | ') : ''}`);
  }

  console.log(`\nScreenshots: ${SCREENSHOT_DIR}`);
  console.log('========================================');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
