import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('tests/screenshots', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// Sign in via the sign-in page form
console.log('Navigating to sign-in...');
await page.goto('http://localhost:3100/sign-in', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

// Fill credentials
await page.fill('input[name="email"], input[type="email"]', 'agent@local.chefflow');
await page.fill('input[name="password"], input[type="password"]', 'CHEF.jdgyuegf9924092.FLOW');
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);

const afterLoginUrl = page.url();
console.log('After login URL:', afterLoginUrl);
console.log('AUTH: proceeding');

// Test Golden Path routes - increased timeout for list pages
const routes = [
  ['/recipes/new', 'recipes-new'],
  ['/recipes', 'recipes'],
  ['/recipes/ingredients', 'recipes-ingredients'],
  ['/culinary/costing', 'culinary-costing'],
  ['/menus/new', 'menus-new'],
  ['/menus', 'menus'],
  ['/culinary/dish-index', 'dish-index'],
];

// Also test P0 #2 routes (Pricing Override)
const pricingRoutes = [
  ['/settings/pricing', 'settings-pricing'],
  ['/quotes/new', 'quotes-new'],
  ['/quotes', 'quotes'],
];

// P0 #3 routes (CPA Tax)
const taxRoutes = [
  ['/finance/year-end', 'finance-year-end'],
  ['/finance/invoices/sent', 'finance-invoices-sent'],
];

// P0 #4 routes (AI Runtime)
const aiRoutes = [
  ['/settings/ai-privacy', 'settings-ai-privacy'],
  ['/for-operators', 'for-operators'],
  ['/recipes/import', 'recipes-import'],
];

// P1 routes (quick smoke)
const p1Routes = [
  ['/network', 'network'],
  ['/culinary/dish-index', 'dish-index-2'],
  ['/settings/credentials', 'settings-credentials'],
  ['/tasks', 'tasks'],
];

const allRoutes = [
  ...routes.map(r => [...r, 'P0-Golden']),
  ...pricingRoutes.map(r => [...r, 'P0-Pricing']),
  ...taxRoutes.map(r => [...r, 'P0-Tax']),
  ...aiRoutes.map(r => [...r, 'P0-AI']),
  ...p1Routes.map(r => [...r, 'P1-Smoke']),
];

const results = [];

for (const [route, name, spec] of allRoutes) {
  try {
    const resp = await page.goto('http://localhost:3100' + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const status = resp?.status() || 'unknown';
    const errorCount = await page.locator('text=Something went wrong').count();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasContent = bodyText.length > 50;
    const result = errorCount > 0 ? 'FAIL(error)' : hasContent ? 'PASS' : 'FAIL(blank)';
    console.log(`[${spec}] ${name}: status=${status} result=${result}`);
    results.push({ name, spec, status, result });
    await page.screenshot({ path: `tests/screenshots/verify-${name}.png` });
  } catch (e) {
    console.log(`[${spec}] ${name}: FAIL(timeout) - ${e.message.substring(0, 100)}`);
    results.push({ name, spec, status: 'error', result: 'FAIL(timeout)' });
  }
}

await browser.close();

// Summary by spec
console.log('\n--- VERIFICATION SUMMARY ---');
const specs = [...new Set(results.map(r => r.spec))];
for (const spec of specs) {
  const specResults = results.filter(r => r.spec === spec);
  const p = specResults.filter(r => r.result === 'PASS').length;
  const f = specResults.filter(r => r.result !== 'PASS').length;
  console.log(`\n${spec}: ${p}/${specResults.length} PASS`);
  for (const r of specResults) {
    console.log(`  ${r.result === 'PASS' ? 'PASS' : 'FAIL'} ${r.name} (${r.result})`);
  }
}

const totalPassed = results.filter(r => r.result === 'PASS').length;
const totalFailed = results.filter(r => r.result !== 'PASS').length;
console.log(`\nTOTAL: ${totalPassed}/${results.length} PASS, ${totalFailed} FAIL`);
