import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3100';
const SCREENSHOTS_DIR = path.join('C:', 'Users', 'david', 'Documents', 'CFv1', 'screenshots');
const AUTH_STATE_PATH = path.join('C:', 'Users', 'david', 'Documents', 'CFv1', '.auth', 'agent-audit.json');

async function buildAuthState() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
    timeout: 30000
  });

  const status = resp.status();
  console.log('Auth status:', status);
  if (status !== 200) {
    await browser.close();
    return null;
  }

  console.log('Navigating to dashboard...');
  try {
    await page.goto(`${BASE_URL}/dashboard`, { timeout: 120000 });
  } catch(e) {
    console.log('goto ended:', e.message.slice(0, 80));
  }
  await page.waitForTimeout(5000);
  
  const url = page.url();
  console.log('Landed at:', url);

  if (url.includes('signin') || url === 'about:blank') {
    await browser.close();
    return null;
  }

  const storageState = await context.storageState();
  writeFileSync(AUTH_STATE_PATH, JSON.stringify(storageState, null, 2));
  console.log('Auth state saved');
  await browser.close();
  return storageState;
}

async function captureScreenshots(storageState) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 900 },
    storageState
  });
  const page = await context.newPage();

  const surfaces = [
    { name: 'calendar',    url: `${BASE_URL}/calendar`,    file: 'audit-calendar.png' },
    { name: 'inbox',       url: `${BASE_URL}/inbox`,       file: 'audit-inbox.png' },
    { name: 'settings',    url: `${BASE_URL}/settings`,    file: 'audit-settings.png' },
    { name: 'prospecting', url: `${BASE_URL}/prospecting`, file: 'audit-prospecting.png' },
    { name: 'documents',   url: `${BASE_URL}/documents`,   file: 'audit-documents.png' },
  ];

  const results = {};

  for (const surface of surfaces) {
    const errors = [];
    const consoleHandler = msg => {
      if (msg.type() === 'error') errors.push(msg.text().slice(0, 300));
    };
    page.on('console', consoleHandler);

    console.log(`Navigating to ${surface.name}...`);
    try {
      await page.goto(surface.url, { timeout: 120000 });
    } catch(e) {
      console.log(`  goto ended: ${e.message.slice(0, 80)}`);
    }
    await page.waitForTimeout(5000);
    
    const landedUrl = page.url();
    const screenshotPath = path.join(SCREENSHOTS_DIR, surface.file);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    page.off('console', consoleHandler);
    results[surface.name] = { url: landedUrl, errors };
    console.log(`  Saved: ${surface.file} | URL: ${landedUrl} | errors: ${errors.length}`);
    if (errors.length > 0) errors.slice(0,3).forEach(e => console.log(`  ERR: ${e.slice(0,150)}`));
  }

  await browser.close();
  return results;
}

async function main() {
  const storageState = await buildAuthState();
  if (!storageState) { console.error('Auth failed'); process.exit(1); }
  
  const results = await captureScreenshots(storageState);
  
  console.log('\n=== SUMMARY ===');
  for (const [name, data] of Object.entries(results)) {
    console.log(`${name}: ${data.url}`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
