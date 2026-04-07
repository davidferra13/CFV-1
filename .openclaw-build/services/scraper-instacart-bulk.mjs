/**
 * OpenClaw - Instacart BULK Scraper v2 (Category Crawl + GraphQL Intercept)
 *
 * Strategy:
 * 1. Launch Puppeteer to get session cookies + intercept GraphQL query template
 * 2. Use HTTP GraphQL requests to search broad food terms per store
 * 3. Falls back to Puppeteer category browsing if GraphQL fails
 *
 * CLI flags:
 *   --stores market-basket,aldi    Select specific stores (comma-separated slugs)
 *   --max 300                       Cap products per store
 *   --force                         Ignore session cache, get fresh cookies
 *
 * Runs sequentially: one store at a time to protect Pi RAM.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, sleep, randomUserAgent } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = join(__dirname, '..', 'data', 'instacart-session.json');
const INSTACART_BASE = 'https://www.instacart.com';

// ── NATIONWIDE STORE REGISTRY ──
// Import from the central registry. Every major US chain, every region.
import { NATIONWIDE_STORES, getFlatStoreList } from './nationwide-stores.mjs';

// Legacy format for backward compatibility + new nationwide coverage
const STORES_LEGACY = [
  { slug: 'market-basket', sourceId: 'market-basket-instacart', name: 'Market Basket', markupPct: 15, tier: 'retail' },
  { slug: 'hannaford', sourceId: 'hannaford-instacart', name: 'Hannaford', markupPct: 12, tier: 'retail' },
  { slug: 'aldi', sourceId: 'aldi-instacart', name: 'Aldi', markupPct: 18, tier: 'retail' },
  { slug: 'stop-and-shop', sourceId: 'stop-shop-instacart', name: 'Stop & Shop', markupPct: 15, tier: 'retail' },
  { slug: 'shaws', sourceId: 'shaws-instacart', name: "Shaw's", markupPct: 15, tier: 'retail' },
  { slug: 'costco', sourceId: 'costco-instacart', name: 'Costco', markupPct: 20, tier: 'wholesale' },
  { slug: 'bjs-wholesale-club', sourceId: 'bjs-instacart', name: "BJ's", markupPct: 18, tier: 'wholesale' },
  { slug: 'whole-foods', sourceId: 'wholefoods-instacart', name: 'Whole Foods', markupPct: 10, tier: 'retail' },
];

// Build the full STORES array from the nationwide registry
// Each region becomes its own "store" entry for scraping
const STORES = getFlatStoreList().map(s => ({
  slug: s.slug,
  sourceId: s.sourceId,
  name: s.name,
  markupPct: s.markupPct,
  tier: s.tier,
  zip: s.zip,
  state: s.state,
}));

// Broad search terms that return many products per search (~80 terms)
const SEARCH_TERMS = [
  // Produce
  'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry',
  'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'celery', 'broccoli',
  'cauliflower', 'spinach', 'kale', 'lettuce', 'cucumber', 'mushroom', 'pepper',
  'corn', 'asparagus', 'zucchini', 'sweet potato', 'green bean',
  // Meat
  'chicken breast', 'chicken thigh', 'ground beef', 'steak', 'pork chop',
  'bacon', 'sausage', 'ground turkey', 'salmon', 'shrimp', 'cod', 'tilapia',
  'lamb', 'pork tenderloin', 'ribs', 'ham', 'turkey breast',
  // Dairy
  'milk', 'butter', 'eggs', 'cheese', 'yogurt', 'cream cheese', 'sour cream',
  'heavy cream', 'cottage cheese', 'mozzarella', 'cheddar',
  // Pantry
  'rice', 'pasta', 'bread', 'flour', 'sugar', 'olive oil', 'vegetable oil',
  'canned tomato', 'broth', 'beans', 'peanut butter', 'cereal', 'oatmeal',
  'honey', 'maple syrup', 'vinegar', 'soy sauce', 'hot sauce',
  // Spices & herbs
  'salt', 'pepper', 'garlic powder', 'onion powder', 'paprika', 'cumin',
  'oregano', 'basil', 'thyme', 'rosemary', 'cinnamon',
  // Frozen
  'frozen vegetables', 'frozen fruit', 'ice cream',
  // Beverages
  'coffee', 'tea', 'juice', 'water',
];

// Instacart category slugs for fallback Puppeteer browsing
const IC_CATEGORIES = [
  'produce', 'dairy-eggs', 'meat-seafood', 'bakery-desserts',
  'deli', 'frozen', 'pantry', 'snacks-candy', 'beverages',
];

function ensureSourcesExist(db) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const store of STORES) {
    stmt.run(
      store.sourceId, store.name, 'retail_chain', store.slug, store.state || 'MA',
      'instacart_api', `${INSTACART_BASE}/store/${store.slug}`, 1, store.tier, 'active',
      `${INSTACART_BASE}/store/${store.slug}`,
      `Full catalog via Instacart API. ${store.markupPct}% markup adjustment applied. Zip: ${store.zip || 'default'}`
    );
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function loadCachedSession(requiredZip) {
  try {
    if (!existsSync(SESSION_PATH)) return null;
    const data = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
    // Session must match the required zip code (nationwide support)
    if (requiredZip && data.zip && data.zip !== requiredZip) {
      console.log(`[session] Cached session is for zip ${data.zip}, need ${requiredZip}. Getting fresh session.`);
      return null;
    }
    if (Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
      console.log('[session] Using cached session (age: ' + Math.round((Date.now() - data.timestamp) / 60000) + 'min, zip: ' + (data.zip || 'unknown') + ')');
      return data;
    }
    console.log('[session] Cached session expired');
  } catch {}
  return null;
}

function saveSession(session) {
  try {
    writeFileSync(SESSION_PATH, JSON.stringify({ ...session, timestamp: Date.now() }, null, 2));
  } catch (err) {
    console.warn('[session] Failed to cache:', err.message);
  }
}

/**
 * Get Instacart session via Puppeteer.
 * Captures cookies AND intercepts a real GraphQL search request.
 * @param {string} storeSlug - Instacart store slug
 * @param {string} [zipCode='01835'] - Zip code for location (nationwide support)
 */
async function getInstacartSession(storeSlug, zipCode = '01835') {
  console.log('[session] Launching browser...');
  const browser = await launchBrowser();
  let graphqlTemplate = null;
  let capturedHeaders = {};

  try {
    const page = await browser.newPage();
    const ua = randomUserAgent();
    await page.setUserAgent(ua);
    await page.setViewport({ width: 1366, height: 768 });

    // Block heavy resources
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      const url = req.url();
      if (type === 'document' || type === 'xhr' || type === 'fetch') {
        // Capture GraphQL search requests
        if (url.includes('/graphql') && req.method() === 'POST') {
          try {
            const pd = req.postData();
            if (pd && (pd.includes('earch') || pd.includes('items'))) {
              graphqlTemplate = pd;
              capturedHeaders = { ...req.headers() };
              console.log('[session] Captured GraphQL template');
            }
          } catch {}
        }
        req.continue();
      } else if (type === 'script' && url.includes('instacart')) {
        req.continue();
      } else {
        req.abort();
      }
    });

    // Navigate to store
    console.log('[session] Loading store page...');
    await page.goto(`${INSTACART_BASE}/store/${storeSlug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await sleep(5000);

    // Set location to the target zip code (nationwide support)
    try {
      const locBtns = await page.$$('button');
      for (const btn of locBtns.slice(0, 10)) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes('address') || text.includes('zip') || text.includes('location') || text.includes('Deliver'))) {
          await btn.click();
          await sleep(2000);
          break;
        }
      }
      const zipInput = await page.$('input[placeholder*="zip"], input[placeholder*="address"], input[name="address"]');
      if (zipInput) {
        await zipInput.click({ clickCount: 3 });
        await zipInput.type(zipCode, { delay: 30 });
        await sleep(1000);
        await page.keyboard.press('Enter');
        await sleep(3000);
      }
    } catch {}

    // Trigger a search to capture GraphQL template
    try {
      const searchInput = await page.$('input[aria-label*="earch"], input[placeholder*="earch"], input[role="combobox"]');
      if (searchInput) {
        await searchInput.click();
        await sleep(500);
        await searchInput.type('chicken', { delay: 50 });
        await sleep(2000);
        await page.keyboard.press('Enter');
        await sleep(5000);
      }
    } catch {}

    // Get cookies
    const cookies = await page.cookies();
    console.log(`[session] Got ${cookies.length} cookies`);
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Extract client identifiers
    const clientData = await page.evaluate(() => {
      const meta = {};
      for (const s of document.querySelectorAll('script')) {
        const text = s.textContent || '';
        const cid = text.match(/"clientIdentifier"\s*:\s*"([^"]+)"/);
        if (cid) meta.clientIdentifier = cid[1];
        const csrf = text.match(/"csrfToken"\s*:\s*"([^"]+)"/);
        if (csrf) meta.csrfToken = csrf[1];
      }
      return meta;
    });

    const session = {
      cookies: cookieStr,
      clientData,
      graphqlTemplate,
      capturedHeaders: Object.fromEntries(
        Object.entries(capturedHeaders).filter(([k]) =>
          ['x-client-identifier', 'x-csrf-token', 'x-request-id', 'x-page-view-id'].includes(k.toLowerCase())
        )
      ),
      ua,
    };

    saveSession(session);
    return session;
  } finally {
    await browser.close();
    console.log('[session] Browser closed.');
  }
}

// ============================================================================
// SEARCH (HTTP-only with session cookies)
// ============================================================================

async function searchStore(session, storeSlug, query) {
  // Attempt 1: GraphQL
  const gqlProducts = await tryGraphQL(session, storeSlug, query);
  if (gqlProducts && gqlProducts.length > 0) return gqlProducts;

  // Attempt 2: HTML search page
  const htmlProducts = await tryHTMLSearch(session, storeSlug, query);
  if (htmlProducts && htmlProducts.length > 0) return htmlProducts;

  return [];
}

async function tryGraphQL(session, storeSlug, query) {
  const headers = {
    'User-Agent': session.ua || randomUserAgent(),
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cookie': session.cookies,
    'Origin': INSTACART_BASE,
    'Referer': `${INSTACART_BASE}/store/${storeSlug}/search/${encodeURIComponent(query)}`,
  };

  // Add captured headers
  if (session.clientData?.csrfToken) headers['X-CSRF-Token'] = session.clientData.csrfToken;
  if (session.clientData?.clientIdentifier) headers['X-Client-Identifier'] = session.clientData.clientIdentifier;
  Object.assign(headers, session.capturedHeaders || {});

  // If we captured a real GraphQL template, replay it with modified query
  let body;
  if (session.graphqlTemplate) {
    try {
      const template = JSON.parse(session.graphqlTemplate);
      if (template.variables) template.variables.query = query;
      if (template.variables?.pageViewId) template.variables.pageViewId = crypto.randomUUID();
      body = JSON.stringify(template);
    } catch {
      body = null;
    }
  }

  // Fallback: construct a generic search body
  if (!body) {
    body = JSON.stringify({
      operationName: 'SearchResultsPlacements',
      variables: {
        query,
        pageViewId: crypto.randomUUID(),
        first: 30,
        storeSlug,
      },
    });
  }

  try {
    const res = await fetch(`${INSTACART_BASE}/graphql`, { method: 'POST', headers, body });
    if (res.status === 429) {
      console.log('[graphql] Rate limited, waiting 60s...');
      await sleep(60000);
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    return extractProducts(data);
  } catch {
    return null;
  }
}

async function tryHTMLSearch(session, storeSlug, query) {
  const url = `${INSTACART_BASE}/store/${storeSlug}/search/${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': session.ua || randomUserAgent(),
        'Accept': 'text/html',
        'Cookie': session.cookies,
      },
      redirect: 'follow',
    });
    const html = await res.text();

    // Try embedded JSON
    for (const pattern of [
      /<script[^>]*id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s,
      /window\.__INITIAL_DATA__\s*=\s*({.+?});?\s*<\/script>/s,
    ]) {
      const match = html.match(pattern);
      if (match) {
        try {
          const found = extractProducts(JSON.parse(match[1]));
          if (found.length > 0) return found;
        } catch {}
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Walk any JSON structure and extract things that look like products.
 */
function extractProducts(data) {
  const products = [];
  const seen = new Set();

  const walk = (obj, depth = 0) => {
    if (depth > 12 || !obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item, depth + 1);
      return;
    }

    // Does this object look like a product?
    const name = obj.name || obj.productName || obj.title;
    const price = obj.price || obj.currentPrice || obj.pricing?.price || obj.viewSection?.itemImage?.price;
    if (name && price && typeof name === 'string' && name.length > 2) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          name,
          price: typeof price === 'number' ? `$${(price / 100).toFixed(2)}` : String(price),
          size: obj.size || obj.unitSize || '',
        });
      }
    }

    for (const key of Object.keys(obj)) {
      walk(obj[key], depth + 1);
    }
  };

  walk(data);
  return products;
}

// ============================================================================
// PUPPETEER CATEGORY BROWSE (fallback)
// ============================================================================

async function browseStoreCategories(store, db, cachedMappings, maxProducts) {
  console.log(`[browse] Puppeteer fallback for ${store.name}`);
  const browser = await launchBrowser();
  let totalStored = 0;

  try {
    for (const catSlug of IC_CATEGORIES) {
      if (totalStored >= maxProducts) break;

      const page = await browser.newPage();
      await page.setUserAgent(randomUserAgent());
      await page.setViewport({ width: 1366, height: 768 });
      await page.setRequestInterception(true);
      page.on('request', req => {
        const type = req.resourceType();
        if (['image', 'font', 'media', 'stylesheet'].includes(type)) req.abort();
        else req.continue();
      });

      const url = `${INSTACART_BASE}/store/${store.slug}/collections/${catSlug}`;
      console.log(`  [${catSlug}] Loading...`);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);

        // Scroll to load products
        for (let i = 0; i < 8; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          await sleep(1500);
        }

        // Extract from DOM
        const products = await page.evaluate(() => {
          const items = [];
          const seen = new Set();

          for (const sel of [
            '[data-testid="product-card"]', '[class*="ProductCard"]',
            '[class*="product-card"]', 'li[class*="Item"]', 'a[href*="/products/"]',
          ]) {
            for (const card of document.querySelectorAll(sel)) {
              const nameEl = card.querySelector('[class*="name" i], [class*="title" i], h2, h3');
              const priceEl = card.querySelector('[class*="price" i]');
              if (!nameEl || !priceEl) continue;
              const name = nameEl.textContent?.trim();
              const priceText = priceEl.textContent?.trim();
              if (!name || !priceText || seen.has(name)) continue;
              seen.add(name);
              const sizeEl = card.querySelector('[class*="size" i], [class*="weight" i]');
              items.push({ name, price: priceText, size: sizeEl?.textContent?.trim() || '' });
            }
            if (items.length > 0) break;
          }
          return items;
        });

        console.log(`  [${catSlug}] Found ${products.length} products`);

        for (const product of products) {
          if (totalStored >= maxProducts) break;
          const result = processProduct(db, cachedMappings, store, product);
          if (result) totalStored++;
        }
      } catch (err) {
        console.error(`  [${catSlug}] Error: ${err.message}`);
      } finally {
        try { await page.close(); } catch {}
      }

      await sleep(3000 + Math.random() * 2000);
    }
  } finally {
    await browser.close();
  }

  return totalStored;
}

// ============================================================================
// PRODUCT PROCESSING
// ============================================================================

function parsePriceCents(priceStr) {
  if (!priceStr) return null;
  if (typeof priceStr === 'number') return Math.round(priceStr * 100);
  const match = String(priceStr).match(/\$?([\d,]+\.[\d]{2})/);
  if (match) return Math.round(parseFloat(match[1].replace(',', '')) * 100);
  return null;
}

function adjustForMarkup(priceCents, markupPct) {
  return Math.round(priceCents / (1 + markupPct / 100));
}

function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal|halibut|swordfish|tuna|haddock|lobster|crab)\b/.test(combined)) return 'lb';
  if (/\b(milk|cream)\b.*\b(gal)\b/.test(combined)) return 'gallon';
  if (/\begg\b/.test(combined)) return 'dozen';
  return 'each';
}

function processProduct(db, cachedMappings, store, product) {
  if (!isFoodItem(product.name)) return null;

  const priceCents = parsePriceCents(product.price);
  if (!priceCents || priceCents <= 0 || priceCents > 100000) return null;

  const normalized = normalizeByRules(product.name, cachedMappings);
  if (!normalized) return null;

  const adjustedPrice = adjustForMarkup(priceCents, store.markupPct);
  const unit = detectUnit(product.name, product.size || '');

  saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

  return upsertPrice(db, {
    sourceId: store.sourceId,
    canonicalIngredientId: normalized.ingredientId,
    variantId: normalized.variantId,
    rawProductName: product.name,
    priceCents: adjustedPrice,
    priceUnit: unit,
    pricePerStandardUnitCents: adjustedPrice,
    standardUnit: unit,
    packageSize: product.size || null,
    priceType: 'regular',
    pricingTier: store.tier,
    confidence: 'instacart_search',
    instacartMarkupPct: store.markupPct,
    sourceUrl: `${INSTACART_BASE}/store/${store.slug}`,
    imageUrl: null,
    brand: null,
    aisleCat: null,
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== OpenClaw Instacart BULK Scraper v2 ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const args = process.argv.slice(2);
  const storesArg = args.find(a => a.startsWith('--stores='))?.split('=')[1];
  const maxArg = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '500');
  const forceSession = args.includes('--force');

  let storesToScrape = STORES;
  if (storesArg) {
    const slugs = storesArg.split(',');
    storesToScrape = STORES.filter(s => slugs.includes(s.slug));
  }

  console.log(`Stores: ${storesToScrape.map(s => s.name).join(', ')}`);
  console.log(`Max per store: ${maxArg}`);

  const db = getDb();
  ensureSourcesExist(db);
  const cachedMappings = loadCachedMappings(db);
  const startTime = Date.now();

  for (const store of storesToScrape) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`STORE: ${store.name} (${store.slug})`);
    console.log(`${'='.repeat(50)}`);

    // Get or reuse session (new session per zip code for nationwide coverage)
    const storeZip = store.zip || '01835';
    let session = forceSession ? null : loadCachedSession(storeZip);
    if (!session) {
      try {
        session = await getInstacartSession(store.slug, storeZip);
        if (session) session.zip = storeZip;
      } catch (err) {
        console.error(`[session] Failed: ${err.message}`);
        console.log('[fallback] Trying Puppeteer category browse...');
        const count = await browseStoreCategories(store, db, cachedMappings, maxArg);
        console.log(`[browse] Stored ${count} products for ${store.name}`);
        db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now'), scrape_failures_consecutive = 0 WHERE source_id = ?").run(store.sourceId);
        continue;
      }
    }

    // Search phase
    let totalNew = 0, totalChanged = 0, totalUnchanged = 0, totalSkipped = 0;
    let httpWorking = false;
    let totalStored = 0;

    for (let i = 0; i < SEARCH_TERMS.length && totalStored < maxArg; i++) {
      const term = SEARCH_TERMS[i];

      if (i % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`  [${i}/${SEARCH_TERMS.length}] (${elapsed}min) "${term}" | stored=${totalStored}`);
      }

      try {
        const products = await searchStore(session, store.slug, term);

        if (products.length > 0) {
          httpWorking = true;
          for (const product of products) {
            if (totalStored >= maxArg) break;
            const result = processProduct(db, cachedMappings, store, product);
            if (result === 'new') { totalNew++; totalStored++; }
            else if (result === 'changed') { totalChanged++; totalStored++; }
            else if (result === 'unchanged') { totalUnchanged++; totalStored++; }
            else totalSkipped++;
          }
        } else {
          totalSkipped++;
        }
      } catch (err) {
        if (err.message?.includes('429')) {
          console.log('[rate-limit] 60s wait...');
          await sleep(60000);
        }
        totalSkipped++;
      }

      await sleep(2000 + Math.random() * 2000);
      if (i > 0 && i % 25 === 0) {
        console.log('  [cooldown] 15s...');
        await sleep(15000);
      }
    }

    // Fallback if HTTP search yielded nothing
    if (!httpWorking && totalStored === 0) {
      console.log(`[${store.name}] HTTP search empty. Puppeteer fallback...`);
      const count = await browseStoreCategories(store, db, cachedMappings, maxArg);
      totalNew = count;
      totalStored = count;
    }

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now'), scrape_failures_consecutive = 0 WHERE source_id = ?").run(store.sourceId);

    console.log(`\n--- ${store.name} ---`);
    console.log(`  New: ${totalNew} | Changed: ${totalChanged} | Unchanged: ${totalUnchanged} | Skipped: ${totalSkipped}`);
    console.log(`  Total stored: ${totalStored}`);

    if (storesToScrape.indexOf(store) < storesToScrape.length - 1) {
      console.log('\n--- 30s cooldown ---');
      await sleep(30000);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n=== Complete (${elapsed} min) ===`);

  const stats = db.prepare('SELECT COUNT(DISTINCT canonical_ingredient_id) as priced FROM current_prices').get();
  const total = db.prepare('SELECT COUNT(*) as total FROM canonical_ingredients').get();
  console.log(`Coverage: ${stats.priced}/${total.total} (${(stats.priced / total.total * 100).toFixed(1)}%)`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
