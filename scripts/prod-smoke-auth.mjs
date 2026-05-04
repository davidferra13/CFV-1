import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];

async function check(page, name, url, assertions, timeout = 30000) {
  try {
    const start = Date.now();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const status = res?.status() ?? 0;
    const pass = await assertions(page, status);
    const tag = elapsed > 5 ? ` [SLOW ${elapsed}s]` : ` [${elapsed}s]`;
    results.push({ name, status, pass, url, elapsed: +elapsed });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name} (${status})${tag}`);
  } catch (e) {
    results.push({ name, pass: false, error: e.message.slice(0, 150), url });
    console.log(`FAIL ${name}: ${e.message.slice(0, 150)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

// Sign in via e2e endpoint
console.log('Signing in as agent...');
const authRes = await page.request.post(`${BASE}/api/e2e/auth`, {
  data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }
});
const authBody = await authRes.json();
if (!authBody.ok) {
  console.log('AUTH FAILED:', authBody);
  process.exit(1);
}
console.log('Auth OK. Testing authenticated routes...\n');

// Dashboard
await check(page, 'Dashboard', `${BASE}/dashboard`, async (p, s) => {
  if (s !== 200) return false;
  await p.waitForTimeout(2000);
  const text = await p.locator('main, [data-cf-surface]').first().textContent({ timeout: 5000 }).catch(() => '');
  return text.length > 50;
});

// Events
await check(page, 'Events list', `${BASE}/events`, async (p, s) => s === 200);

// Clients
await check(page, 'Clients', `${BASE}/clients`, async (p, s) => s === 200);

// Inbox
await check(page, 'Inbox', `${BASE}/inbox`, async (p, s) => s === 200);

// Calendar
await check(page, 'Calendar', `${BASE}/calendar`, async (p, s) => s === 200);

// Menus
await check(page, 'Menus', `${BASE}/menus`, async (p, s) => s === 200);

// Culinary
await check(page, 'Culinary', `${BASE}/culinary`, async (p, s) => s === 200);

// Finance
await check(page, 'Finance', `${BASE}/finance`, async (p, s) => s === 200);

// Settings
await check(page, 'Settings', `${BASE}/settings`, async (p, s) => s === 200);

// Vendors
await check(page, 'Vendors', `${BASE}/vendors`, async (p, s) => s === 200);

// Tasks
await check(page, 'Tasks', `${BASE}/tasks`, async (p, s) => s === 200);

// Inquiries
await check(page, 'Inquiries', `${BASE}/inquiries`, async (p, s) => s === 200);

// Remy landing (SSE stream test)
await check(page, 'Remy landing API', `${BASE}/api/remy/landing`, async (p, s) => {
  // SSE endpoint returns 200
  return s === 200;
});

// Remy health
await check(page, 'Remy health API', `${BASE}/api/remy/health`, async (p, s) => s === 200);

await browser.close();

// Summary
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const slow = results.filter(r => r.elapsed > 5);
console.log(`\n=============================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length}`);
if (slow.length > 0) {
  console.log(`\nSLOW PAGES (>5s):`);
  slow.forEach(r => console.log(`  ${r.name}: ${r.elapsed}s`));
}
if (failed > 0) {
  console.log(`\nFAILURES:`);
  results.filter(r => !r.pass).forEach(r => {
    console.log(`  ${r.name} (${r.url}) ${r.error || `status ${r.status}`}`);
  });
}
