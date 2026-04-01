/**
 * Multi-Zip Instacart Session Capture v3
 *
 * Strategy: Intercept Instacart's geolocation and address API calls.
 * When a fresh session loads, Instacart uses GeoIP to set location.
 * We override this by:
 * 1. Blocking the geolocation API
 * 2. Setting a fake geolocation via Chrome DevTools Protocol (CDP)
 * 3. Loading the store page, which now resolves to the target area
 *
 * This bypasses all UI interaction issues with the address modal.
 *
 * Usage:
 *   node capture-multizip-v3.mjs                    # All target zips
 *   node capture-multizip-v3.mjs 10001 60601 90001  # Specific zips
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, 'data', 'sessions');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INSTACART_BASE = 'https://www.instacart.com';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Lat/lng for each metro (city center coordinates)
const TARGET_ZIPS = [
  { zip: '10001', metro: 'NYC', state: 'NY', lat: 40.7484, lng: -73.9967 },
  { zip: '19103', metro: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { zip: '20001', metro: 'Washington DC', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { zip: '21201', metro: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { zip: '06103', metro: 'Hartford', state: 'CT', lat: 41.7658, lng: -72.6734 },
  { zip: '30303', metro: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { zip: '33131', metro: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { zip: '32801', metro: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792 },
  { zip: '28202', metro: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { zip: '37203', metro: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { zip: '60606', metro: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { zip: '48226', metro: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { zip: '55401', metro: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650 },
  { zip: '63102', metro: 'St Louis', state: 'MO', lat: 38.6270, lng: -90.1994 },
  { zip: '43215', metro: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { zip: '75201', metro: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { zip: '77010', metro: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { zip: '78205', metro: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { zip: '85003', metro: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { zip: '80202', metro: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { zip: '90012', metro: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { zip: '94102', metro: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { zip: '98104', metro: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { zip: '97204', metro: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { zip: '89101', metro: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureZipSession(browser, zipInfo) {
  const { zip, metro, state, lat, lng } = zipInfo;
  console.log(`\n--- ${zip} (${metro}, ${state}) [${lat}, ${lng}] ---`);

  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1366, height: 768 });

  // Use CDP to override geolocation
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setGeolocationOverride', {
    latitude: lat,
    longitude: lng,
    accuracy: 100,
  });

  // Grant geolocation permission so Instacart thinks it can use it
  await context.overridePermissions(INSTACART_BASE, ['geolocation']);

  // Block heavy resources
  await page.setRequestInterception(true);
  let postalCodeFromApi = null;

  page.on('request', req => {
    const type = req.resourceType();
    const url = req.url();

    // Log address/location API calls
    if (url.includes('address') || url.includes('location') || url.includes('bundle') ||
        url.includes('geocode') || url.includes('zone')) {
      const shortUrl = url.replace(/https:\/\/[^/]+/, '').substring(0, 80);
      console.log(`  [api] ${req.method()} ${shortUrl}`);
    }

    if (type === 'image' || type === 'font' || type === 'media') {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Capture responses to check what postal code Instacart resolved
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('zone') || url.includes('address') || url.includes('storefront')) {
      try {
        const text = await res.text();
        // Look for postal code in response
        const zipMatch = text.match(/"postalCode"[:\s]*"?(\d{5})"?/);
        if (zipMatch) {
          postalCodeFromApi = zipMatch[1];
          console.log(`  [api] Resolved postalCode: ${postalCodeFromApi}`);
        }
      } catch {}
    }
  });

  let result = { zip, metro, state, hasSessionId: false, cookieCount: 0 };

  try {
    // Step 1: Load store page directly (geo override active)
    console.log('  [1] Loading store with geo override...');
    try {
      await page.goto(`${INSTACART_BASE}/store/costco/storefront`, {
        waitUntil: 'domcontentloaded', timeout: 30000,
      });
    } catch {}
    await sleep(8000);

    // Step 2: Check if there's an address modal, interact with it
    console.log('  [2] Checking for address modal...');
    const modalInput = await page.$('input[placeholder*="address"], input[placeholder*="Enter"]');
    if (modalInput) {
      console.log('    Address modal found, entering address...');
      await page.evaluate((el) => { el.focus(); el.value = ''; el.dispatchEvent(new Event('focus', { bubbles: true })); }, modalInput);
      await sleep(300);

      // Type a generic address for this zip
      const addresses = {
        '10001': '350 5th Ave, New York, NY',
        '19103': '1500 Market St, Philadelphia, PA',
        '20001': '801 K St NW, Washington, DC',
        '21201': '200 E Pratt St, Baltimore, MD',
        '06103': '100 Pearl St, Hartford, CT',
        '30303': '265 Peachtree St, Atlanta, GA',
        '33131': '200 S Biscayne Blvd, Miami, FL',
        '32801': '100 S Orange Ave, Orlando, FL',
        '28202': '300 S Tryon St, Charlotte, NC',
        '37203': '525 5th Ave S, Nashville, TN',
        '60606': '233 S Wacker Dr, Chicago, IL',
        '48226': '1 Campus Martius, Detroit, MI',
        '55401': '250 Marquette Ave, Minneapolis, MN',
        '63102': '100 N Broadway, St Louis, MO',
        '43215': '1 Nationwide Blvd, Columbus, OH',
        '75201': '2200 Ross Ave, Dallas, TX',
        '77010': '1001 Avenida De Las Americas, Houston, TX',
        '78205': '300 Alamo Plaza, San Antonio, TX',
        '85003': '200 W Washington St, Phoenix, AZ',
        '80202': '1437 Bannock St, Denver, CO',
        '90012': '200 N Spring St, Los Angeles, CA',
        '94102': '1 Dr Carlton B Goodlett Pl, San Francisco, CA',
        '98104': '600 4th Ave, Seattle, WA',
        '97204': '1120 SW 5th Ave, Portland, OR',
        '89101': '495 S Main St, Las Vegas, NV',
      };

      const addr = addresses[zip] || `${zip}`;
      await page.keyboard.type(addr, { delay: 40 });
      console.log(`    Typed: "${addr}"`);
      await sleep(4000);

      // Try clicking the first autocomplete result
      const clicked = await page.evaluate(() => {
        // Look for autocomplete results (usually li, div with role=option, or pac-item)
        const selectors = [
          '[role="option"]',
          '.pac-item',
          '[data-testid*="suggestion"]',
          '[class*="suggestion"]',
          '[class*="autocomplete"] li',
          '[class*="result"]',
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            (els[0]).click();
            return { sel, count: els.length, text: els[0].textContent?.substring(0, 60) };
          }
        }
        return null;
      });

      if (clicked) {
        console.log(`    Clicked suggestion: "${clicked.text}" (${clicked.sel}, ${clicked.count} results)`);
      } else {
        console.log('    No suggestions found, trying keyboard...');
        await page.keyboard.press('ArrowDown');
        await sleep(300);
        await page.keyboard.press('Enter');
      }

      await sleep(4000);

      // Look for confirm button
      const confirmed = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          if (/^(save|done|update|continue|deliver here|save address|shop this store)$/.test(text)) {
            btn.click();
            return text;
          }
        }
        return null;
      });
      if (confirmed) {
        console.log(`    Confirmed: "${confirmed}"`);
        await sleep(4000);
      }
    } else {
      console.log('    No address modal (geo override may have worked)');
    }

    // Step 3: Reload store page to pick up new location
    console.log('  [3] Reloading store page...');
    try {
      await page.goto(`${INSTACART_BASE}/store/costco/storefront`, {
        waitUntil: 'domcontentloaded', timeout: 30000,
      });
    } catch {}
    await sleep(6000);

    // Step 4: Verify location from page content
    const pageInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const prices = (text.match(/\$\d+\.\d{2}/g) || []);
      return {
        title: document.title,
        hasPrices: prices.length > 0,
        priceCount: prices.length,
        foundZips: [...new Set((text.match(/\b\d{5}\b/g) || []))].slice(0, 10),
        textSnippet: text.substring(0, 200),
      };
    });
    console.log(`  [4] Title: ${pageInfo.title}`);
    console.log(`      Prices: ${pageInfo.priceCount}, Zips on page: ${pageInfo.foundZips.join(', ')}`);
    if (postalCodeFromApi) console.log(`      API postalCode: ${postalCodeFromApi}`);

    // Save screenshot
    await page.screenshot({ path: join(SESSIONS_DIR, `screenshot-${zip}.png`) }).catch(() => {});

    // Step 5: Extract and save cookies
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const hasSessionId = cookieStr.includes('instacart_sid');

    console.log(`  [5] Cookies: ${cookies.length}, sid: ${hasSessionId}`);

    const sessionData = {
      cookies: cookieStr,
      timestamp: Date.now(),
      zip, metro, state, lat, lng,
      resolvedPostalCode: postalCodeFromApi,
      pageTitle: pageInfo.title,
      priceCount: pageInfo.priceCount,
      foundZips: pageInfo.foundZips,
    };

    writeFileSync(join(SESSIONS_DIR, `session-${zip}.json`), JSON.stringify(sessionData, null, 2));
    console.log(`  Saved: session-${zip}.json`);

    result = { zip, metro, state, hasSessionId, cookieCount: cookies.length, resolvedPostalCode: postalCodeFromApi, priceCount: pageInfo.priceCount };

  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    result = { zip, metro, state, error: err.message };
  } finally {
    await context.close();
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  let zips = TARGET_ZIPS;
  if (args.length > 0) {
    zips = args.map(z => {
      const found = TARGET_ZIPS.find(t => t.zip === z);
      if (!found) {
        console.error(`Unknown zip: ${z}. Add it to TARGET_ZIPS with lat/lng.`);
        process.exit(1);
      }
      return found;
    });
  }

  console.log('=== Multi-Zip Session Capture v3 (CDP geo override) ===');
  console.log(`Zips: ${zips.length}`);
  mkdirSync(SESSIONS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1366,768'],
  });

  const results = [];

  try {
    for (let i = 0; i < zips.length; i++) {
      console.log(`\n[${i + 1}/${zips.length}]`);
      const result = await captureZipSession(browser, zips[i]);
      results.push(result);
      if (i < zips.length - 1) await sleep(2000);
    }
  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`${'Zip'.padEnd(8)} ${'Metro'.padEnd(16)} ${'St'.padEnd(4)} ${'SID'.padEnd(5)} ${'Resolved'.padEnd(10)} Prices`);
  console.log('-'.repeat(60));
  for (const r of results) {
    const sid = r.error ? 'ERR' : (r.hasSessionId ? 'YES' : 'NO');
    const resolved = r.resolvedPostalCode || '?';
    console.log(`${r.zip.padEnd(8)} ${r.metro.padEnd(16)} ${r.state.padEnd(4)} ${sid.padEnd(5)} ${resolved.padEnd(10)} ${r.priceCount || 0}`);
  }

  const ok = results.filter(r => r.hasSessionId && r.resolvedPostalCode && r.resolvedPostalCode !== '01906').length;
  const geoipFallback = results.filter(r => r.hasSessionId && (!r.resolvedPostalCode || r.resolvedPostalCode === '01906')).length;
  const failed = results.filter(r => r.error).length;
  console.log(`\nGeo-locked: ${ok} | GeoIP fallback (01906): ${geoipFallback} | Failed: ${failed}`);

  writeFileSync(join(SESSIONS_DIR, 'manifest.json'), JSON.stringify({
    captured: new Date().toISOString(), results,
    summary: { total: results.length, geoLocked: ok, geoipFallback, failed },
  }, null, 2));

  if (ok > 0) {
    console.log(`\nSCP to Pi: scp -r "${SESSIONS_DIR.replace(/\\/g, '/')}" davidferra@10.0.0.177:~/openclaw-prices/data/`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
