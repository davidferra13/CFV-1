/**
 * Multi-Zip Instacart Session Capture v2
 *
 * Strategy: Instead of fighting Instacart's address UI, we:
 * 1. Launch browser with NO existing cookies (fresh session per zip)
 * 2. Navigate directly to Instacart with zip in the initial address modal
 * 3. The first-visit flow asks for delivery address before showing any store
 * 4. Each browser context = one zip = one session
 *
 * This is more reliable than trying to change address on an existing session.
 *
 * Usage:
 *   node capture-multizip-v2.mjs                    # All target zips
 *   node capture-multizip-v2.mjs 10001 90210        # Specific zips
 *   node capture-multizip-v2.mjs --headed           # With visible browser (debug)
 *
 * Output: data/sessions/session-{zip}.json
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

// Full addresses for reliable autocomplete (one per metro)
const TARGET_ZIPS = [
  // Northeast
  { zip: '10001', metro: 'NYC', state: 'NY', address: '350 5th Ave, New York, NY 10001' },
  { zip: '19103', metro: 'Philadelphia', state: 'PA', address: '1500 Market St, Philadelphia, PA 19103' },
  { zip: '20001', metro: 'Washington DC', state: 'DC', address: '801 K St NW, Washington, DC 20001' },
  { zip: '21201', metro: 'Baltimore', state: 'MD', address: '200 E Pratt St, Baltimore, MD 21201' },
  { zip: '06103', metro: 'Hartford', state: 'CT', address: '100 Pearl St, Hartford, CT 06103' },
  // Southeast
  { zip: '30301', metro: 'Atlanta', state: 'GA', address: '265 Peachtree St, Atlanta, GA 30303' },
  { zip: '33101', metro: 'Miami', state: 'FL', address: '200 S Biscayne Blvd, Miami, FL 33131' },
  { zip: '32801', metro: 'Orlando', state: 'FL', address: '100 S Orange Ave, Orlando, FL 32801' },
  { zip: '28201', metro: 'Charlotte', state: 'NC', address: '300 S Tryon St, Charlotte, NC 28202' },
  { zip: '37201', metro: 'Nashville', state: 'TN', address: '525 5th Ave S, Nashville, TN 37203' },
  // Midwest
  { zip: '60601', metro: 'Chicago', state: 'IL', address: '233 S Wacker Dr, Chicago, IL 60606' },
  { zip: '48201', metro: 'Detroit', state: 'MI', address: '1 Campus Martius, Detroit, MI 48226' },
  { zip: '55401', metro: 'Minneapolis', state: 'MN', address: '250 Marquette Ave, Minneapolis, MN 55401' },
  { zip: '63101', metro: 'St Louis', state: 'MO', address: '100 N Broadway, St Louis, MO 63102' },
  { zip: '43201', metro: 'Columbus', state: 'OH', address: '1 Nationwide Blvd, Columbus, OH 43215' },
  // South/Southwest
  { zip: '75201', metro: 'Dallas', state: 'TX', address: '2200 Ross Ave, Dallas, TX 75201' },
  { zip: '77001', metro: 'Houston', state: 'TX', address: '1001 Avenida De Las Americas, Houston, TX 77010' },
  { zip: '78201', metro: 'San Antonio', state: 'TX', address: '300 Alamo Plaza, San Antonio, TX 78205' },
  { zip: '85001', metro: 'Phoenix', state: 'AZ', address: '200 W Washington St, Phoenix, AZ 85003' },
  { zip: '80201', metro: 'Denver', state: 'CO', address: '1437 Bannock St, Denver, CO 80202' },
  // West
  { zip: '90001', metro: 'Los Angeles', state: 'CA', address: '200 N Spring St, Los Angeles, CA 90012' },
  { zip: '94102', metro: 'San Francisco', state: 'CA', address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102' },
  { zip: '98101', metro: 'Seattle', state: 'WA', address: '600 4th Ave, Seattle, WA 98104' },
  { zip: '97201', metro: 'Portland', state: 'OR', address: '1120 SW 5th Ave, Portland, OR 97204' },
  { zip: '89101', metro: 'Las Vegas', state: 'NV', address: '495 S Main St, Las Vegas, NV 89101' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureZipSession(browser, zipInfo, headed) {
  const { zip, metro, state } = zipInfo;
  console.log(`\n--- ${zip} (${metro}, ${state}) ---`);

  // Fresh incognito context = fresh cookies = new location
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1366, height: 768 });

  // Block heavy resources
  await page.setRequestInterception(true);
  let addressApiCaptured = null;

  page.on('request', req => {
    const type = req.resourceType();
    const url = req.url();

    // Capture address-related API calls
    if (url.includes('/v3/bundle') || url.includes('/address') || url.includes('/location')) {
      try {
        console.log(`  [api] ${req.method()} ${url.replace(INSTACART_BASE, '').substring(0, 80)}`);
        if (req.method() === 'PUT' || req.method() === 'POST') {
          addressApiCaptured = { url, method: req.method(), body: req.postData() };
        }
      } catch {}
    }

    if (type === 'image' || type === 'font' || type === 'media') {
      req.abort();
    } else {
      req.continue();
    }
  });

  let result = { zip, metro, state, hasSessionId: false, cookieCount: 0 };

  try {
    // Step 1: Load Instacart homepage (fresh session = address prompt)
    console.log('  [1] Loading Instacart (fresh context)...');
    try {
      await page.goto(INSTACART_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {}
    await sleep(5000);

    // Step 2: Find and interact with the address/zip input
    console.log('  [2] Setting delivery address...');

    // On first visit, Instacart shows an address entry. Look for it.
    // Try multiple strategies:

    // Strategy A: Find input field directly (first-visit modal)
    let addressSet = false;
    const inputs = await page.$$('input');
    for (const input of inputs) {
      const attrs = await page.evaluate(el => ({
        placeholder: el.placeholder || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        type: el.type,
        id: el.id,
        name: el.name,
      }), input);

      const isAddressInput = attrs.placeholder.toLowerCase().includes('address') ||
                              attrs.placeholder.toLowerCase().includes('zip') ||
                              attrs.placeholder.toLowerCase().includes('enter') ||
                              attrs.ariaLabel.toLowerCase().includes('address') ||
                              attrs.ariaLabel.toLowerCase().includes('zip');

      if (isAddressInput) {
        console.log(`    Found: placeholder="${attrs.placeholder}", aria="${attrs.ariaLabel}"`);

        // Use evaluate to focus and set value (avoids "not clickable" on overlays)
        await page.evaluate((el) => {
          el.focus();
          el.value = '';
          el.dispatchEvent(new Event('focus', { bubbles: true }));
        }, input);
        await sleep(500);

        // Type the full address (triggers React onChange + geocoding autocomplete)
        const query = zipInfo.address || zip;
        await page.keyboard.type(query, { delay: 60 });
        console.log(`    Typed: "${query}"`);
        await sleep(4000);

        // Use keyboard to select suggestion
        await page.keyboard.press('ArrowDown');
        await sleep(500);
        await page.keyboard.press('Enter');
        console.log('    Selected suggestion via keyboard');
        addressSet = true;
        await sleep(4000);
        break;
      }
    }

    if (!addressSet) {
      // Strategy B: Click "Get Started" or "Continue" first, then look for input
      console.log('    No input found, looking for CTA button...');
      const buttons = await page.$$('button, a[role="button"]');
      for (const btn of buttons.slice(0, 15)) {
        const text = await page.evaluate(el => el.textContent?.trim() || '', btn);
        if (/get started|continue|shop now|start shopping|see stores/i.test(text)) {
          console.log(`    Clicking: "${text}"`);
          await btn.click();
          await sleep(3000);
          break;
        }
      }

      // Try finding input again after CTA
      const inputs2 = await page.$$('input');
      for (const input of inputs2) {
        const ph = await page.evaluate(el => el.placeholder || '', input);
        if (ph) {
          console.log(`    Found input after CTA: "${ph}"`);
          await input.click({ clickCount: 3 });
          const q = zipInfo.address || zip;
          await input.type(q, { delay: 60 });
          await sleep(4000);
          await page.keyboard.press('ArrowDown');
          await sleep(500);
          await page.keyboard.press('Enter');
          addressSet = true;
          await sleep(4000);
          break;
        }
      }
    }

    // Step 3: Look for "Save" / "Done" / "Deliver here" confirmation
    if (addressSet) {
      const confirmButtons = await page.$$('button');
      for (const btn of confirmButtons) {
        const text = await page.evaluate(el => el.textContent?.trim().toLowerCase() || '', btn);
        if (/^(save|done|update|continue|deliver here|save address|shop this store)$/.test(text)) {
          console.log(`    Confirming: "${text}"`);
          await btn.click();
          await sleep(3000);
          break;
        }
      }
    }

    // Step 4: Navigate to a store page to lock the session to this area
    console.log('  [3] Navigating to store to lock session context...');
    try {
      // Use a chain that exists everywhere (market-basket is NE only)
      // Try a national chain first
      for (const store of ['costco', 'walmart', 'target', 'aldi']) {
        try {
          const res = await page.goto(`${INSTACART_BASE}/store/${store}/storefront`, {
            waitUntil: 'domcontentloaded', timeout: 20000,
          });
          if (res && res.status() < 400) {
            console.log(`    Loaded ${store} storefront`);
            break;
          }
        } catch {}
      }
    } catch {}
    await sleep(5000);

    // Step 5: Verify location
    const pageInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        title: document.title,
        hasProducts: text.includes('$'),
        textLength: text.length,
        // Look for zip codes on page
        foundZips: [...new Set((text.match(/\b\d{5}\b/g) || []))].slice(0, 10),
      };
    });
    console.log(`  [4] Title: ${pageInfo.title}`);
    console.log(`      Products visible: ${pageInfo.hasProducts}, Zips on page: ${pageInfo.foundZips.join(', ')}`);

    // Step 6: Extract cookies
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const hasSessionId = cookieStr.includes('instacart_sid');

    console.log(`  [5] Cookies: ${cookies.length}, has sid: ${hasSessionId}`);

    // Save screenshot for debugging
    await page.screenshot({ path: join(SESSIONS_DIR, `screenshot-${zip}.png`) }).catch(() => {});

    // Save session
    const sessionData = {
      cookies: cookieStr,
      timestamp: Date.now(),
      zip, metro, state,
      addressSet,
      pageTitle: pageInfo.title,
      foundZips: pageInfo.foundZips,
    };

    const sessionPath = join(SESSIONS_DIR, `session-${zip}.json`);
    writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log(`  Saved: session-${zip}.json`);

    result = { zip, metro, state, hasSessionId, cookieCount: cookies.length, addressSet, foundZips: pageInfo.foundZips };

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
  const headed = args.includes('--headed');
  const zipArgs = args.filter(a => a !== '--headed');

  let zips = TARGET_ZIPS;
  if (zipArgs.length > 0) {
    zips = zipArgs.map(z => {
      const found = TARGET_ZIPS.find(t => t.zip === z);
      return found || { zip: z, metro: 'Custom', state: '??' };
    });
  }

  console.log('=== Multi-Zip Session Capture v2 (fresh contexts) ===');
  console.log(`Zips: ${zips.length}, Headed: ${headed}`);
  mkdirSync(SESSIONS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: headed ? false : 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1366,768'],
  });

  const results = [];

  try {
    for (let i = 0; i < zips.length; i++) {
      console.log(`\n[${i + 1}/${zips.length}]`);
      const result = await captureZipSession(browser, zips[i], headed);
      results.push(result);

      // Brief pause between captures
      if (i < zips.length - 1) await sleep(2000);
    }
  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`${'Zip'.padEnd(8)} ${'Metro'.padEnd(18)} ${'St'.padEnd(4)} ${'SID'.padEnd(5)} ${'Addr'.padEnd(5)} Zips on page`);
  console.log('-'.repeat(75));
  for (const r of results) {
    const sid = r.error ? 'ERR' : (r.hasSessionId ? 'YES' : 'NO');
    const addr = r.addressSet ? 'YES' : 'NO';
    const zips = r.foundZips?.join(',') || '';
    console.log(`${r.zip.padEnd(8)} ${r.metro.padEnd(18)} ${r.state.padEnd(4)} ${sid.padEnd(5)} ${addr.padEnd(5)} ${zips}`);
  }

  const ok = results.filter(r => r.hasSessionId).length;
  const failed = results.filter(r => r.error).length;
  console.log(`\nOK: ${ok} | Failed: ${failed} | Total: ${results.length}`);

  // Save manifest
  writeFileSync(join(SESSIONS_DIR, 'manifest.json'), JSON.stringify({
    captured: new Date().toISOString(),
    results,
    summary: { total: results.length, ok, failed },
  }, null, 2));

  if (ok > 0) {
    console.log(`\nSCP to Pi:`);
    console.log(`  scp -r "${SESSIONS_DIR.replace(/\\/g, '/')}" davidferra@10.0.0.177:~/openclaw-prices/data/`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
