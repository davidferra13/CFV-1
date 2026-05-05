import { chromium } from 'playwright';
import http from 'http';
import path from 'path';

const BASE_URL = 'http://localhost:3100';
const OUT_DIR = path.join('C:', 'Users', 'david', 'Documents', 'CFv1', '.claude', 'audit');

function postAuth() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' });
    const req = http.request('http://localhost:3100/api/e2e/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let body = '';
      const cookies = [];
      const setCookies = res.headers['set-cookie'] || [];
      for (const sc of setCookies) {
        const [nameVal] = sc.split(';');
        const eqIdx = nameVal.indexOf('=');
        cookies.push({
          name: nameVal.substring(0, eqIdx).trim(),
          value: nameVal.substring(eqIdx + 1).trim(),
          domain: 'localhost',
          path: '/',
        });
      }
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, cookies, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Get auth cookies via Node http (no Playwright involvement)
  console.log('Authenticating...');
  const auth = await postAuth();
  console.log('Auth status:', auth.status, '| Cookies:', auth.cookies.map(c => c.name).join(', '));
  if (auth.status !== 200) { process.exit(1); }

  const browser = await chromium.launch({ headless: true });

  // Inject cookies before any navigation
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies(auth.cookies);
  const page = await context.newPage();

  const surfaces = [
    ['dashboard', '/dashboard'],
    ['events', '/events'],
    ['clients', '/clients'],
    ['culinary', '/culinary'],
    ['settings', '/settings'],
  ];

  for (const [name, urlPath] of surfaces) {
    console.log(`\nCapturing ${name}...`);
    try {
      const response = await page.goto(`${BASE_URL}${urlPath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      console.log(`  http: ${response?.status()}`);
    } catch(e) {
      console.log(`  timeout (continuing): ${e.message.slice(0, 80)}`);
    }
    await page.waitForTimeout(4000);
    console.log(`  url: ${page.url()}`);
    await page.screenshot({ path: `${OUT_DIR}/after-${name}.png`, fullPage: true });
    console.log(`  saved: after-${name}.png`);
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
