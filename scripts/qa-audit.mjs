import { chromium } from 'playwright';
import http from 'http';

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, cookies }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Getting auth cookies...');
  const authResp = await makeRequest(
    'http://localhost:3100/api/e2e/auth',
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' })
  );
  console.log('Auth status:', authResp.status);

  const playwrightCookies = authResp.cookies.map(cookieStr => {
    const parts = cookieStr.split(';').map(p => p.trim());
    const eqIdx = parts[0].indexOf('=');
    const name = parts[0].substring(0, eqIdx);
    const value = parts[0].substring(eqIdx + 1);
    const cookie = { name: decodeURIComponent(name), value: decodeURIComponent(value), domain: 'localhost', path: '/' };
    parts.slice(1).forEach(part => {
      const eqI = part.indexOf('=');
      const k = eqI >= 0 ? part.substring(0, eqI).toLowerCase() : part.toLowerCase();
      const v = eqI >= 0 ? part.substring(eqI + 1) : '';
      if (k === 'path') cookie.path = v || '/';
      if (k === 'expires') cookie.expires = Math.floor(new Date(v).getTime() / 1000);
      if (k === 'httponly') cookie.httpOnly = true;
      if (k === 'secure') cookie.secure = true;
      if (k === 'samesite') cookie.sameSite = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    });
    return cookie;
  });
  console.log('Cookies prepared:', playwrightCookies.length);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addCookies(playwrightCookies);
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // 1. CLIENTS LIST
  console.log('--- Navigating to /clients ---');
  await page.goto('http://localhost:3100/clients', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'screenshots/audit-clients-list.png', fullPage: false });
  await page.screenshot({ path: 'screenshots/audit-clients-list-full.png', fullPage: true });

  // Find a client detail link
  const clientLinks = await page.locator('a[href*="/clients/"]').all();
  console.log('Client links found:', clientLinks.length);
  let clientDetailUrl = null;
  for (const link of clientLinks) {
    const href = await link.getAttribute('href');
    if (href && href.match(/\/clients\/[a-f0-9-]{36}/i)) {
      clientDetailUrl = href;
      break;
    }
  }
  console.log('Client detail URL:', clientDetailUrl);

  // 2. CLIENT DETAIL
  if (clientDetailUrl) {
    console.log('--- Navigating to client detail ---');
    await page.goto('http://localhost:3100' + clientDetailUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/audit-client-detail.png', fullPage: false });
    await page.screenshot({ path: 'screenshots/audit-client-detail-full.png', fullPage: true });
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/audit-client-detail-scrolled.png', fullPage: false });
  }

  // 3. QUOTES
  console.log('--- Navigating to /quotes ---');
  await page.goto('http://localhost:3100/quotes', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'screenshots/audit-quotes.png', fullPage: false });
  await page.screenshot({ path: 'screenshots/audit-quotes-full.png', fullPage: true });

  // 4. RECIPES LIST
  console.log('--- Navigating to /recipes ---');
  await page.goto('http://localhost:3100/recipes', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'screenshots/audit-recipes-list.png', fullPage: false });
  await page.screenshot({ path: 'screenshots/audit-recipes-list-full.png', fullPage: true });

  // Find a recipe detail link
  const recipeLinks = await page.locator('a[href*="/recipes/"]').all();
  console.log('Recipe links found:', recipeLinks.length);
  let recipeDetailUrl = null;
  for (const link of recipeLinks) {
    const href = await link.getAttribute('href');
    if (href && href.includes('/recipes/') && !href.includes('/new') && !href.endsWith('/recipes/')) {
      const parts = href.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length > 5) {
        recipeDetailUrl = href;
        break;
      }
    }
  }
  console.log('Recipe detail URL:', recipeDetailUrl);

  // 5. RECIPE DETAIL
  if (recipeDetailUrl) {
    console.log('--- Navigating to recipe detail ---');
    await page.goto('http://localhost:3100' + recipeDetailUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/audit-recipe-detail.png', fullPage: false });
    await page.screenshot({ path: 'screenshots/audit-recipe-detail-full.png', fullPage: true });
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/audit-recipe-detail-scrolled.png', fullPage: false });
  }

  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(' -', e));
  console.log('Total errors:', consoleErrors.length);

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
