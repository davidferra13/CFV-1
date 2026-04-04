import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3100';
const SCREENSHOTS_DIR = path.join('C:', 'Users', 'david', 'Documents', 'CFv1', 'screenshots');
const AUTH_STATE_PATH = path.join('C:', 'Users', 'david', 'Documents', 'CFv1', '.auth', 'agent-audit.json');

async function main() {
  const storageState = JSON.parse(readFileSync(AUTH_STATE_PATH, 'utf-8'));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 900 },
    storageState
  });
  const page = await context.newPage();

  // Calendar - full page
  try { await page.goto(`${BASE_URL}/calendar`, { timeout: 60000 }); } catch(e) {}
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit-calendar-full.png'), fullPage: true });
  console.log('calendar full saved');

  // Prospecting - full page 
  try { await page.goto(`${BASE_URL}/prospecting`, { timeout: 60000 }); } catch(e) {}
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit-prospecting-full.png'), fullPage: true });
  console.log('prospecting full saved');

  // Documents full page
  try { await page.goto(`${BASE_URL}/documents`, { timeout: 60000 }); } catch(e) {}
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit-documents-full.png'), fullPage: true });
  console.log('documents full saved');

  // Settings - scroll down to see if more content
  try { await page.goto(`${BASE_URL}/settings`, { timeout: 60000 }); } catch(e) {}
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit-settings-full.png'), fullPage: true });
  console.log('settings full saved');

  await browser.close();
  console.log('Done');
}

main().catch(e => { console.error(e.message); process.exit(1); });
