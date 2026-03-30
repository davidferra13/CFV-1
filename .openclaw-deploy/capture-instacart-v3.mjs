/**
 * Instacart Session Capture v3
 * Key insight: Products come via RSC stream, not GraphQL.
 * Must set delivery address first, then capture product data from responses.
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INSTACART_BASE = 'https://www.instacart.com';
const STORE_SLUG = 'market-basket';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Instacart Capture v3 (RSC + Address) ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1366,768'],
  });

  const productData = [];
  const responseCaptures = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Capture ALL responses that might contain product data
    page.on('response', async (res) => {
      const url = res.url();
      const status = res.status();
      if (status !== 200) return;

      // Capture responses from Instacart that are large (likely contain product data)
      if (url.includes('instacart.com') && !url.includes('mgs.instacart.com') &&
          !url.includes('.js') && !url.includes('.css') && !url.includes('.png') &&
          !url.includes('.jpg') && !url.includes('.svg') && !url.includes('google') &&
          !url.includes('forter') && !url.includes('branch') && !url.includes('stripe')) {
        try {
          const contentType = res.headers()['content-type'] || '';
          const body = await res.text();

          if (body.length > 5000) {
            // Check for product indicators
            const priceCount = (body.match(/\$\d+\.\d{2}/g) || []).length;
            const hasPriceKey = body.includes('"price"') || body.includes('"currentPrice"');
            const hasProducts = body.includes('"product"') || body.includes('"item"');

            if (priceCount > 3 || hasPriceKey || hasProducts) {
              console.log(`  [response] ${url.replace(INSTACART_BASE, '').substring(0, 80)} | ${body.length}b | prices:${priceCount} | type:${contentType.substring(0, 30)}`);
              responseCaptures.push({ url, body, priceCount });
            }
          }
        } catch {}
      }
    });

    // Block heavy resources
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Step 1: Load store page
    console.log('\n[1] Loading store page...');
    try {
      await page.goto(`${INSTACART_BASE}/store/${STORE_SLUG}`, {
        waitUntil: 'domcontentloaded', timeout: 45000,
      });
    } catch {}
    await sleep(5000);

    // Step 2: Set delivery address to Haverhill, MA
    console.log('\n[2] Setting delivery address...');
    try {
      // Look for address/location button
      const addressSelectors = [
        'button[aria-label*="address"]',
        'button[aria-label*="deliver"]',
        'button[aria-label*="location"]',
        '[data-testid="address-button"]',
        'button:has-text("Deliver")',
        'button:has-text("address")',
      ];

      // Try clicking on location/address elements
      const buttons = await page.$$('button');
      let addressClicked = false;
      for (const btn of buttons.slice(0, 20)) {
        try {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && (text.includes('Deliver') || text.includes('address') || text.includes('location') || text.includes('01835') || text.includes('Haverhill'))) {
            console.log(`  Found address button: "${text.substring(0, 50)}"`);
            await btn.click();
            addressClicked = true;
            await sleep(2000);
            break;
          }
        } catch {}
      }

      if (!addressClicked) {
        console.log('  No address button found, trying direct input...');
      }

      // Try to find and fill zip code input
      const zipSelectors = [
        'input[placeholder*="zip"]',
        'input[placeholder*="address"]',
        'input[name="address"]',
        'input[aria-label*="address"]',
        'input[aria-label*="zip"]',
      ];

      for (const sel of zipSelectors) {
        const input = await page.$(sel);
        if (input) {
          console.log(`  Found zip input: ${sel}`);
          await input.click({ clickCount: 3 });
          await input.type('01835', { delay: 30 });
          await sleep(1000);
          await page.keyboard.press('Enter');
          await sleep(3000);
          console.log('  Zip entered');
          break;
        }
      }
    } catch (e) {
      console.log(`  Address error: ${e.message}`);
    }

    await sleep(3000);

    // Step 3: Navigate to search page
    console.log('\n[3] Searching for "milk"...');
    try {
      await page.goto(`${INSTACART_BASE}/store/${STORE_SLUG}/search/milk`, {
        waitUntil: 'domcontentloaded', timeout: 45000,
      });
    } catch {}
    await sleep(15000);

    // Step 4: Check what's on the page
    console.log('\n[4] Checking page content...');
    const pageContent = await page.content();
    console.log(`  Page HTML: ${pageContent.length} bytes`);

    // Count visible product-like elements
    const productElements = await page.evaluate(() => {
      const items = [];
      // Look for product cards
      const cards = document.querySelectorAll('[class*="product"], [class*="item-card"], [data-testid*="product"], [data-testid*="item"]');
      for (const card of Array.from(cards).slice(0, 20)) {
        const text = card.textContent?.substring(0, 100);
        if (text) items.push(text);
      }

      // Also check for any price elements
      const prices = document.querySelectorAll('[class*="price"], [data-testid*="price"]');
      const priceTexts = Array.from(prices).slice(0, 10).map(p => p.textContent);

      // Check if there's a "set address" modal blocking
      const modals = document.querySelectorAll('[role="dialog"], [class*="modal"]');
      const modalTexts = Array.from(modals).map(m => m.textContent?.substring(0, 100));

      return { cards: items.length, priceCount: priceTexts.length, priceTexts, modalTexts };
    });

    console.log(`  Product cards: ${productElements.cards}`);
    console.log(`  Price elements: ${productElements.priceCount}`);
    if (productElements.priceTexts.length > 0) {
      console.log(`  Sample prices: ${productElements.priceTexts.slice(0, 5).join(', ')}`);
    }
    if (productElements.modalTexts.length > 0) {
      console.log(`  Modal detected: ${productElements.modalTexts[0]}`);
    }

    // Step 5: Try to screenshot
    await page.screenshot({ path: join(__dirname, 'instacart-screenshot.png'), fullPage: false });
    console.log('  Screenshot saved');

    // Step 6: Get all text content with $ prices
    const allPrices = await page.evaluate(() => {
      const text = document.body.innerText;
      const prices = text.match(/\$\d+\.\d{2}/g);
      return { totalText: text.length, prices: prices || [], priceCount: prices?.length || 0 };
    });
    console.log(`  Total page text: ${allPrices.totalText} chars`);
    console.log(`  Prices in text: ${allPrices.priceCount}`);
    if (allPrices.prices.length > 0) {
      console.log(`  Sample: ${allPrices.prices.slice(0, 10).join(', ')}`);
    }

    // Step 7: Save cookies
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`\n[7] Cookies: ${cookies.length} (sid: ${cookieStr.includes('instacart_sid')})`);

    // Save session + captured data
    const output = {
      cookies: cookieStr,
      timestamp: Date.now(),
      responseCaptures: responseCaptures.length,
      products: productData,
    };
    writeFileSync(join(__dirname, 'captured-session.json'), JSON.stringify(output, null, 2));

    // Save any captured response data
    if (responseCaptures.length > 0) {
      console.log(`\n[8] Response captures: ${responseCaptures.length}`);
      for (const rc of responseCaptures) {
        console.log(`  ${rc.url.substring(0, 80)} - ${rc.priceCount} prices`);
      }
      writeFileSync(join(__dirname, 'captured-responses.json'), JSON.stringify(responseCaptures, null, 2));
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Cookies: ${cookies.length}`);
    console.log(`Response captures with price data: ${responseCaptures.length}`);
    console.log(`Product prices visible on page: ${allPrices.priceCount}`);

  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
