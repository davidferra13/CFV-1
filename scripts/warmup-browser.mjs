#!/usr/bin/env node
// warmup-browser.mjs - Launch authenticated Playwright browser from warmup state
// Usage: node scripts/warmup-browser.mjs [state-file]
//   state-file: path to warmup-state.json (default: tmp-warmup/warmup-state.json)

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const stateFile = process.argv[2] || 'tmp-warmup/warmup-state.json';
let state;
try {
  state = JSON.parse(readFileSync(stateFile, 'utf8'));
} catch (err) {
  console.error(`[warmup-browser] Cannot read state file: ${stateFile}`);
  console.error(`  Run 'bash scripts/warmup.sh' first to generate it.`);
  process.exit(1);
}

const { base, sessionToken, account, port } = state;

console.log(`[warmup-browser] Launching for ${account} on ${base}`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Inject session cookie
await context.addCookies([{
  name: 'authjs.session-token',
  value: sessionToken,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  sameSite: 'Lax',
}]);

const page = await context.newPage();

// Navigate to dashboard
await page.goto(`${base}/dashboard`);
console.log('[warmup-browser] Navigating to dashboard...');

// Wait for page to settle
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(2000);

console.log(`[warmup-browser] URL: ${page.url()}`);

// Screenshot proof
const screenshotDir = stateFile.replace('/warmup-state.json', '').replace('\\warmup-state.json', '');
await page.screenshot({ path: `${screenshotDir}/dashboard.png`, fullPage: false });
console.log(`[warmup-browser] Screenshot saved`);

// Keep open
console.log('[warmup-browser] Browser open and interactive. Ctrl+C to close.');
await new Promise(() => {});
