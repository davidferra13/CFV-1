/**
 * Multi-Zip Instacart Session Capture
 *
 * Launches a single browser, sets delivery address to each target zip code,
 * and captures session cookies per zip. Outputs one session file per zip.
 *
 * Usage:
 *   node capture-multizip.mjs                    # All target zips
 *   node capture-multizip.mjs 10001 90210 60601  # Specific zips
 *
 * Output: data/sessions/session-{zip}.json (one per zip)
 * Then SCP the data/sessions/ folder to Pi:
 *   scp -r data/sessions/ davidferra@10.0.0.177:~/openclaw-prices/data/sessions/
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, 'data', 'sessions');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INSTACART_BASE = 'https://www.instacart.com';
const STORE_SLUG = 'market-basket'; // starting store, will vary by region

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Top US metro zips for geographic expansion (one per metro)
// Chosen for Instacart coverage + population density
const TARGET_ZIPS = [
  // Northeast (already have NE, but add NYC, Philly, DC)
  { zip: '10001', metro: 'NYC', state: 'NY' },
  { zip: '19103', metro: 'Philadelphia', state: 'PA' },
  { zip: '20001', metro: 'Washington DC', state: 'DC' },
  { zip: '21201', metro: 'Baltimore', state: 'MD' },
  { zip: '06103', metro: 'Hartford', state: 'CT' },
  // Southeast
  { zip: '30301', metro: 'Atlanta', state: 'GA' },
  { zip: '33101', metro: 'Miami', state: 'FL' },
  { zip: '32801', metro: 'Orlando', state: 'FL' },
  { zip: '28201', metro: 'Charlotte', state: 'NC' },
  { zip: '37201', metro: 'Nashville', state: 'TN' },
  // Midwest
  { zip: '60601', metro: 'Chicago', state: 'IL' },
  { zip: '48201', metro: 'Detroit', state: 'MI' },
  { zip: '55401', metro: 'Minneapolis', state: 'MN' },
  { zip: '63101', metro: 'St Louis', state: 'MO' },
  { zip: '43201', metro: 'Columbus', state: 'OH' },
  // South/Southwest
  { zip: '75201', metro: 'Dallas', state: 'TX' },
  { zip: '77001', metro: 'Houston', state: 'TX' },
  { zip: '78201', metro: 'San Antonio', state: 'TX' },
  { zip: '85001', metro: 'Phoenix', state: 'AZ' },
  { zip: '80201', metro: 'Denver', state: 'CO' },
  // West
  { zip: '90001', metro: 'Los Angeles', state: 'CA' },
  { zip: '94102', metro: 'San Francisco', state: 'CA' },
  { zip: '98101', metro: 'Seattle', state: 'WA' },
  { zip: '97201', metro: 'Portland', state: 'OR' },
  { zip: '89101', metro: 'Las Vegas', state: 'NV' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findAndClickElement(page, predicateFn, label) {
  const elements = await page.$$('button, a, [role="button"]');
  for (const el of elements.slice(0, 30)) {
    try {
      const match = await page.evaluate(predicateFn, el);
      if (match) {
        console.log(`    Found ${label}`);
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
}

async function changeDeliveryAddress(page, zip) {
  console.log(`  [address] Changing to ${zip}...`);

  // Strategy 1: Click the delivery address element in the header
  const clicked = await findAndClickElement(
    page,
    (el) => {
      const text = (el.textContent || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      return text.includes('deliver') || text.includes('address') ||
             ariaLabel.includes('deliver') || ariaLabel.includes('address') ||
             /\b\d{5}\b/.test(text); // any 5-digit zip in button text
    },
    'address button'
  );

  if (!clicked) {
    // Strategy 2: Try the address bar/header area directly
    const headerBtn = await page.$('[data-testid="address-button"], [data-testid="delivery-address"]');
    if (headerBtn) {
      await headerBtn.click();
      console.log('    Clicked header address button');
    } else {
      console.log('    No address button found, trying URL approach...');
      // Strategy 3: Navigate to address page directly
      try {
        await page.goto(`${INSTACART_BASE}/store/${STORE_SLUG}/storefront?zipCode=${zip}`, {
          waitUntil: 'domcontentloaded', timeout: 30000,
        });
        await sleep(5000);
        return true;
      } catch {}
    }
  }

  await sleep(2000);

  // Look for the address input field
  const inputSelectors = [
    'input[placeholder*="address"]',
    'input[placeholder*="zip"]',
    'input[placeholder*="Enter"]',
    'input[name="address"]',
    'input[aria-label*="address"]',
    'input[aria-label*="zip"]',
    'input[aria-label*="Enter"]',
    'input[data-testid*="address"]',
  ];

  for (const sel of inputSelectors) {
    const input = await page.$(sel);
    if (input) {
      console.log(`    Found input: ${sel}`);
      // Clear existing text
      await input.click({ clickCount: 3 });
      await sleep(200);
      await input.type(zip, { delay: 50 });
      await sleep(2000);

      // Look for the first suggestion/result and click it
      const suggestion = await page.$('[data-testid*="suggestion"], [role="option"], [class*="suggestion"], [class*="result"]');
      if (suggestion) {
        await suggestion.click();
        console.log('    Clicked address suggestion');
      } else {
        // Try pressing Enter
        await page.keyboard.press('Enter');
        console.log('    Pressed Enter on zip input');
      }
      await sleep(3000);

      // Look for a "Save" or "Done" or "Update" button to confirm
      await findAndClickElement(
        page,
        (el) => {
          const text = (el.textContent || '').trim().toLowerCase();
          return text === 'save' || text === 'done' || text === 'update' ||
                 text === 'save address' || text === 'continue' ||
                 text === 'deliver here';
        },
        'confirm button'
      );
      await sleep(3000);
      return true;
    }
  }

  console.log('    Could not find address input');
  return false;
}

async function captureSessionForZip(page, zipInfo) {
  const { zip, metro, state } = zipInfo;
  console.log(`\n--- Capturing session for ${zip} (${metro}, ${state}) ---`);

  // Navigate to store page first
  try {
    await page.goto(`${INSTACART_BASE}/store/${STORE_SLUG}`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
  } catch {}
  await sleep(5000);

  // Change delivery address
  const addressChanged = await changeDeliveryAddress(page, zip);

  // Wait for page to reload with new location context
  await sleep(5000);

  // Verify by checking the page for zip/location indicators
  const pageInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const zipMatch = text.match(/\b\d{5}\b/g);
    return {
      title: document.title,
      foundZips: [...new Set(zipMatch || [])].slice(0, 10),
      textLength: text.length,
    };
  });
  console.log(`  Page title: ${pageInfo.title}`);
  console.log(`  Zips found on page: ${pageInfo.foundZips.join(', ')}`);

  // Extract cookies
  const cookies = await page.cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const hasSessionId = cookieStr.includes('instacart_sid');

  console.log(`  Cookies: ${cookies.length}, has sid: ${hasSessionId}`);

  if (!hasSessionId) {
    console.log(`  WARNING: No instacart_sid cookie for ${zip}. Session may not work.`);
  }

  // Save session file
  const sessionData = {
    cookies: cookieStr,
    timestamp: Date.now(),
    zip,
    metro,
    state,
    addressChanged,
    pageTitle: pageInfo.title,
  };

  const sessionPath = join(SESSIONS_DIR, `session-${zip}.json`);
  writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log(`  Saved: ${sessionPath}`);

  return { zip, metro, state, hasSessionId, cookieCount: cookies.length };
}

async function main() {
  // Determine which zips to capture
  const args = process.argv.slice(2);
  let zips = TARGET_ZIPS;
  if (args.length > 0) {
    zips = args.map(z => {
      const found = TARGET_ZIPS.find(t => t.zip === z);
      return found || { zip: z, metro: 'Custom', state: '??' };
    });
  }

  console.log('=== Multi-Zip Instacart Session Capture ===');
  console.log(`Target zips: ${zips.length}`);
  console.log(`Output: ${SESSIONS_DIR}/`);
  console.log();

  // Create output directory
  mkdirSync(SESSIONS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,768',
    ],
  });

  const results = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1366, height: 768 });

    // Block heavy resources to speed things up
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Initial load to get base cookies
    console.log('[init] Loading Instacart...');
    try {
      await page.goto(INSTACART_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {}
    await sleep(5000);

    // Capture session for each zip
    for (let i = 0; i < zips.length; i++) {
      console.log(`\n[${i + 1}/${zips.length}]`);
      try {
        const result = await captureSessionForZip(page, zips[i]);
        results.push(result);
      } catch (err) {
        console.error(`  FAILED for ${zips[i].zip}: ${err.message}`);
        results.push({ zip: zips[i].zip, metro: zips[i].metro, state: zips[i].state, error: err.message });
      }

      // Brief pause between zips to avoid rate limiting
      if (i < zips.length - 1) {
        await sleep(3000);
      }
    }

  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`${'Zip'.padEnd(8)} ${'Metro'.padEnd(18)} ${'State'.padEnd(5)} ${'Status'.padEnd(12)} Cookies`);
  console.log('-'.repeat(65));
  for (const r of results) {
    const status = r.error ? 'FAILED' : (r.hasSessionId ? 'OK' : 'NO SID');
    console.log(`${r.zip.padEnd(8)} ${r.metro.padEnd(18)} ${r.state.padEnd(5)} ${status.padEnd(12)} ${r.cookieCount || 0}`);
  }

  const ok = results.filter(r => r.hasSessionId).length;
  const failed = results.filter(r => r.error).length;
  const noSid = results.filter(r => !r.error && !r.hasSessionId).length;
  console.log(`\nTotal: ${results.length} | OK: ${ok} | No SID: ${noSid} | Failed: ${failed}`);

  // Save manifest
  const manifest = {
    captured: new Date().toISOString(),
    results,
    summary: { total: results.length, ok, noSid, failed },
  };
  writeFileSync(join(SESSIONS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${SESSIONS_DIR}/manifest.json`);

  if (ok > 0) {
    console.log(`\nNext step: SCP sessions to Pi:`);
    console.log(`  scp -r "${SESSIONS_DIR.replace(/\\/g, '/')}" davidferra@10.0.0.177:~/openclaw-prices/data/sessions/`);
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
