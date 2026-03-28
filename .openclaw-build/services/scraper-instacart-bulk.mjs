/**
 * OpenClaw - Instacart BULK Scraper (Session Extraction + HTTP API)
 *
 * Strategy:
 * 1. Launch Puppeteer ONCE to get Instacart session cookies
 * 2. Close browser immediately (free memory)
 * 3. Use plain HTTP requests with those cookies to search their API
 * 4. Search for EVERY unpriced canonical ingredient
 *
 * This avoids heavy page rendering - the Pi can't handle Instacart's React app.
 * HTTP requests with cookies are fast and lightweight.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const INSTACART_BASE = 'https://www.instacart.com';

// Stores to search (Instacart slugs)
const STORES = [
  { slug: 'market-basket', sourceId: 'market-basket-instacart', name: 'Market Basket', markupPct: 15, tier: 'retail' },
  { slug: 'hannaford', sourceId: 'hannaford-instacart', name: 'Hannaford', markupPct: 12, tier: 'retail' },
  { slug: 'aldi', sourceId: 'aldi-instacart', name: 'Aldi', markupPct: 18, tier: 'retail' },
  { slug: 'stop-and-shop', sourceId: 'stop-shop-instacart', name: 'Stop & Shop', markupPct: 15, tier: 'retail' },
  { slug: 'shaws', sourceId: 'shaws-instacart', name: "Shaw's", markupPct: 15, tier: 'retail' },
  { slug: 'costco', sourceId: 'costco-instacart', name: 'Costco', markupPct: 20, tier: 'wholesale' },
  { slug: 'bjs-wholesale-club', sourceId: 'bjs-instacart', name: "BJ's", markupPct: 18, tier: 'wholesale' },
  { slug: 'whole-foods', sourceId: 'wholefoods-instacart', name: 'Whole Foods', markupPct: 10, tier: 'retail' },
];

function ensureSourcesExist(db) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const store of STORES) {
    stmt.run(
      store.sourceId, `${store.name} (via Instacart)`, 'retail_chain', store.slug, 'MA',
      'instacart_api', `${INSTACART_BASE}/store/${store.slug}`, 1, store.tier, 'active',
      `${INSTACART_BASE}/store/${store.slug}`,
      `Full catalog via Instacart API. ${store.markupPct}% markup adjustment applied.`
    );
  }
}

/**
 * Step 1: Use Puppeteer to get Instacart session cookies.
 * Opens a minimal page, grabs cookies, closes browser.
 */
async function getInstacartSession() {
  console.log('[session] Launching browser to get Instacart cookies...');
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Block heavy resources - we just need cookies
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'font', 'media', 'stylesheet', 'script'].includes(type)) {
        // Allow only critical scripts
        if (type === 'script' && req.url().includes('instacart')) {
          req.continue();
        } else {
          req.abort();
        }
      } else {
        req.continue();
      }
    });

    // Capture any API responses we see
    let apiHeaders = {};
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/graphql') || url.includes('/v3/')) {
        const headers = response.request().headers();
        if (headers['x-client-identifier'] || headers['authorization']) {
          apiHeaders = { ...headers };
        }
      }
    });

    // Navigate to Instacart - just the homepage
    console.log('[session] Loading Instacart homepage...');
    await page.goto(INSTACART_BASE, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for cookies to be set
    await sleep(5000);

    // Try to set location to Haverhill MA
    try {
      // Type in zip code if there's a location prompt
      const locationInput = await page.$('input[placeholder*="zip"], input[placeholder*="address"], input[aria-label*="address"]');
      if (locationInput) {
        await locationInput.type('01835');
        await sleep(1000);
        await page.keyboard.press('Enter');
        await sleep(3000);
      }
    } catch (e) {
      // Location prompt may not appear
    }

    // Extract all cookies
    const cookies = await page.cookies();
    console.log(`[session] Got ${cookies.length} cookies`);

    // Build cookie string for HTTP requests
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Get any useful headers from the page
    const clientHeaders = await page.evaluate(() => {
      // Try to find client identifiers in the page
      const meta = {};
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent || '';
        const clientIdMatch = text.match(/"clientIdentifier"\s*:\s*"([^"]+)"/);
        if (clientIdMatch) meta.clientIdentifier = clientIdMatch[1];
        const csrfMatch = text.match(/"csrfToken"\s*:\s*"([^"]+)"/);
        if (csrfMatch) meta.csrfToken = csrfMatch[1];
      }
      return meta;
    });

    console.log('[session] Client headers:', JSON.stringify(clientHeaders));

    return { cookies: cookieStr, clientHeaders, apiHeaders };
  } finally {
    await browser.close();
    console.log('[session] Browser closed. Using HTTP from here.');
  }
}

/**
 * Search Instacart's internal API for a product.
 * Uses extracted session cookies.
 */
async function searchInstacart(session, storeSlug, query) {
  // Instacart's internal search endpoint
  const searchUrl = `${INSTACART_BASE}/store/${storeSlug}/search/${encodeURIComponent(query)}`;

  // Try the search results page API
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html',
    'Cookie': session.cookies,
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (session.clientHeaders.csrfToken) {
    headers['X-CSRF-Token'] = session.clientHeaders.csrfToken;
  }
  if (session.clientHeaders.clientIdentifier) {
    headers['X-Client-Identifier'] = session.clientHeaders.clientIdentifier;
  }
  if (session.apiHeaders['x-client-identifier']) {
    headers['X-Client-Identifier'] = session.apiHeaders['x-client-identifier'];
  }

  try {
    const res = await fetch(searchUrl, { headers, redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('json')) {
      return await res.json();
    }

    // If HTML, try to extract JSON data embedded in the page
    const html = await res.text();

    // Instacart embeds initial data as JSON in script tags
    const dataMatch = html.match(/<script[^>]*>\s*window\.__INITIAL_DATA__\s*=\s*({.+?})\s*;?\s*<\/script>/s);
    if (dataMatch) {
      try {
        return JSON.parse(dataMatch[1]);
      } catch (e) {
        // Try relaxed parsing
      }
    }

    // Try another common pattern
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s);
    if (nextDataMatch) {
      try {
        return JSON.parse(nextDataMatch[1]);
      } catch (e) {}
    }

    // Look for any large JSON blob that contains product data
    const jsonBlobs = html.match(/\{[^{}]{500,}\}/g);
    if (jsonBlobs) {
      for (const blob of jsonBlobs.slice(0, 5)) {
        try {
          const parsed = JSON.parse(blob);
          if (parsed.items || parsed.products || parsed.data) {
            return parsed;
          }
        } catch (e) {}
      }
    }

    return null;
  } catch (err) {
    console.error(`[search] Error searching "${query}" at ${storeSlug}: ${err.message}`);
    return null;
  }
}

/**
 * Extract products from Instacart search results.
 * Handles multiple possible response formats.
 */
function extractProducts(data) {
  if (!data) return [];

  const products = [];

  // Format 1: Direct items array
  if (data.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.name && item.price) {
        products.push({ name: item.name, price: item.price, size: item.size || '' });
      }
    }
  }

  // Format 2: GraphQL response
  if (data.data?.search?.items) {
    for (const item of data.data.search.items) {
      const name = item.name || item.product?.name;
      const price = item.price || item.product?.price;
      if (name && price) {
        products.push({ name, price: typeof price === 'string' ? price : `$${(price/100).toFixed(2)}`, size: item.size || '' });
      }
    }
  }

  // Format 3: __NEXT_DATA__ / props
  const findProducts = (obj, depth = 0) => {
    if (depth > 8 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && typeof item === 'object' && item.name && (item.price || item.pricing)) {
          const price = item.price || item.pricing?.price || item.pricing?.currentPrice;
          if (price) {
            products.push({
              name: item.name,
              price: typeof price === 'number' ? `$${(price/100).toFixed(2)}` : String(price),
              size: item.size || item.unitSize || ''
            });
          }
        }
        findProducts(item, depth + 1);
      }
    } else {
      for (const key of Object.keys(obj)) {
        if (['items', 'products', 'modules', 'results', 'product_items'].includes(key)) {
          findProducts(obj[key], depth + 1);
        }
      }
    }
  };
  findProducts(data);

  return products;
}

function parsePriceCents(priceStr) {
  if (!priceStr) return null;
  if (typeof priceStr === 'number') return Math.round(priceStr * 100);

  const match = String(priceStr).match(/\$?([\d]+\.[\d]{2})/);
  if (match) return Math.round(parseFloat(match[1]) * 100);

  const multiMatch = String(priceStr).match(/(\d+)\s*(?:\/|for)\s*\$?([\d.]+)/);
  if (multiMatch) {
    return Math.round((parseFloat(multiMatch[2]) / parseInt(multiMatch[1])) * 100);
  }

  return null;
}

function adjustForMarkup(priceCents, markupPct) {
  return Math.round(priceCents / (1 + markupPct / 100));
}

function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal|halibut|swordfish|tuna|haddock|lobster|crab)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gal)\b/)) return 'gallon';
  if (combined.match(/\begg\b/)) return 'dozen';
  return 'each';
}

async function main() {
  console.log('=== OpenClaw Instacart BULK Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  ensureSourcesExist(db);
  const cachedMappings = loadCachedMappings(db);

  // Get all unpriced canonical ingredients
  const unpriced = db.prepare(`
    SELECT ingredient_id, name, category
    FROM canonical_ingredients
    WHERE ingredient_id NOT IN (SELECT DISTINCT canonical_ingredient_id FROM current_prices)
    ORDER BY
      CASE category
        WHEN 'produce' THEN 1
        WHEN 'dairy' THEN 2
        WHEN 'beef' THEN 3
        WHEN 'poultry' THEN 4
        WHEN 'pork' THEN 5
        WHEN 'seafood' THEN 6
        WHEN 'eggs' THEN 7
        WHEN 'herbs' THEN 8
        WHEN 'pantry' THEN 9
        WHEN 'spices' THEN 10
        WHEN 'oils' THEN 11
        WHEN 'grains' THEN 12
        WHEN 'beverages' THEN 13
        WHEN 'lamb' THEN 14
        ELSE 15
      END,
      name
  `).all();

  console.log(`Found ${unpriced.length} unpriced ingredients to search for`);

  // Step 1: Get session cookies via Puppeteer
  let session;
  try {
    session = await getInstacartSession();
  } catch (err) {
    console.error(`[session] Failed to get session: ${err.message}`);
    console.log('[session] Falling back to cookie-less requests...');
    session = { cookies: '', clientHeaders: {}, apiHeaders: {} };
  }

  // Step 2: Search for each unpriced ingredient
  let totalNew = 0, totalMatched = 0, totalSkipped = 0, totalFailed = 0;
  const startTime = Date.now();

  // Pick one store to start with (Market Basket - user's primary store)
  const primaryStore = STORES[0];
  console.log(`\nSearching ${primaryStore.name} for ${unpriced.length} ingredients...\n`);

  for (let i = 0; i < unpriced.length; i++) {
    const ingredient = unpriced[i];
    const searchTerm = ingredient.name
      .replace(/,\s*(raw|cooked|roasted|grilled|baked|fried|boiled)\s*$/i, '')
      .replace(/,\s*NFS$/i, '')
      .trim();

    if (i % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`[${i}/${unpriced.length}] (${elapsed}min) Searching: "${searchTerm}" [new=${totalNew}, matched=${totalMatched}, skip=${totalSkipped}]`);
    }

    try {
      const data = await searchInstacart(session, primaryStore.slug, searchTerm);
      const products = extractProducts(data);

      if (products.length === 0) {
        totalSkipped++;
        // Rate limit
        await sleep(1500 + Math.random() * 1500);
        continue;
      }

      // Take the first product with a valid price
      let matched = false;
      for (const product of products.slice(0, 3)) {
        const priceCents = parsePriceCents(product.price);
        if (!priceCents || priceCents <= 0 || priceCents > 100000) continue;

        const adjustedPrice = adjustForMarkup(priceCents, primaryStore.markupPct);
        const unit = detectUnit(product.name, product.size);

        const result = upsertPrice(db, {
          sourceId: primaryStore.sourceId,
          canonicalIngredientId: ingredient.ingredient_id,
          variantId: null,
          rawProductName: product.name,
          priceCents: adjustedPrice,
          priceUnit: unit,
          pricePerStandardUnitCents: adjustedPrice,
          standardUnit: unit,
          packageSize: product.size || null,
          priceType: 'regular',
          pricingTier: primaryStore.tier,
          confidence: 'instacart_search',
          instacartMarkupPct: primaryStore.markupPct,
          sourceUrl: `${INSTACART_BASE}/store/${primaryStore.slug}/search/${encodeURIComponent(searchTerm)}`,
        });

        if (result === 'new') totalNew++;
        else totalMatched++;
        matched = true;
        break;
      }

      if (!matched) totalSkipped++;

    } catch (err) {
      totalFailed++;
      if (err.message?.includes('429') || err.message?.includes('rate')) {
        console.log(`[rate-limit] Hit rate limit at ingredient ${i}. Waiting 60s...`);
        await sleep(60000);
      }
    }

    // Rate limit: 1.5-3s between requests
    await sleep(1500 + Math.random() * 1500);

    // Every 200 requests, take a longer break
    if (i > 0 && i % 200 === 0) {
      console.log(`[cooldown] 30s cooldown after ${i} requests...`);
      await sleep(30000);
    }
  }

  // Update source registry
  for (const store of STORES) {
    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(store.sourceId);
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n=== Instacart Bulk Scraper Results ===`);
  console.log(`Time: ${elapsed} minutes`);
  console.log(`New prices: ${totalNew}`);
  console.log(`Already matched: ${totalMatched}`);
  console.log(`Not found: ${totalSkipped}`);
  console.log(`Failed: ${totalFailed}`);

  // Final stats
  const stats = db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as priced FROM current_prices').get();
  const total = db.prepare('SELECT COUNT(*) as total FROM canonical_ingredients').get();
  console.log(`\nCoverage: ${stats.priced}/${total.total} (${(stats.priced/total.total*100).toFixed(1)}%)`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
