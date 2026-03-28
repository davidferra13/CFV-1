/**
 * OpenClaw - Instacart Scraper
 * Scrapes product prices from Instacart for stores without direct online catalogs.
 * Key target: Market Basket (user's primary store), Aldi, Trader Joe's, BJ's, Costco.
 *
 * Instacart markup is typically 15-20% above in-store prices.
 * We track the markup percentage per store and adjust.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, safeFetch, rateLimitDelay, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

// Instacart stores to scrape - New England focus
// Note: Hannaford and some others block headless browsers directly,
// so we route through Instacart with markup adjustment.
const INSTACART_STORES = [
  {
    sourceId: 'hannaford-instacart',
    name: 'Hannaford (via Instacart)',
    chain: 'hannaford',
    state: 'MA',
    instacartSlug: 'hannaford',
    markupPct: 12, // Hannaford Instacart markup is typically lower (~12%)
    categories: [
      { name: 'Meat & Seafood', path: '/store/hannaford/collections/meat-seafood' },
      { name: 'Produce', path: '/store/hannaford/collections/produce' },
      { name: 'Dairy & Eggs', path: '/store/hannaford/collections/dairy-eggs' },
      { name: 'Bakery', path: '/store/hannaford/collections/bakery' },
      { name: 'Pantry', path: '/store/hannaford/collections/pantry' },
      { name: 'Frozen', path: '/store/hannaford/collections/frozen' },
      { name: 'Deli', path: '/store/hannaford/collections/deli' },
    ],
  },
  {
    sourceId: 'market-basket-instacart',
    name: 'Market Basket (via Instacart)',
    chain: 'market-basket',
    state: 'MA',
    instacartSlug: 'market-basket',
    markupPct: 15, // Instacart typically marks up 15% over in-store
    categories: [
      { name: 'Meat & Seafood', path: '/store/market-basket/collections/meat-seafood' },
      { name: 'Produce', path: '/store/market-basket/collections/produce' },
      { name: 'Dairy & Eggs', path: '/store/market-basket/collections/dairy-eggs' },
      { name: 'Bakery', path: '/store/market-basket/collections/bakery' },
      { name: 'Pantry', path: '/store/market-basket/collections/pantry' },
      { name: 'Frozen', path: '/store/market-basket/collections/frozen' },
      { name: 'Deli', path: '/store/market-basket/collections/deli' },
    ],
  },
  {
    sourceId: 'aldi-instacart',
    name: 'Aldi (via Instacart)',
    chain: 'aldi',
    state: 'MA',
    instacartSlug: 'aldi',
    markupPct: 18,
    categories: [
      { name: 'Meat & Seafood', path: '/store/aldi/collections/meat-seafood' },
      { name: 'Produce', path: '/store/aldi/collections/produce' },
      { name: 'Dairy & Eggs', path: '/store/aldi/collections/dairy-eggs' },
      { name: 'Bakery', path: '/store/aldi/collections/bakery' },
      { name: 'Pantry', path: '/store/aldi/collections/pantry' },
      { name: 'Frozen', path: '/store/aldi/collections/frozen' },
    ],
  },
  {
    sourceId: 'costco-instacart',
    name: 'Costco (via Instacart)',
    chain: 'costco',
    state: 'MA',
    instacartSlug: 'costco',
    markupPct: 20,
    categories: [
      { name: 'Meat & Seafood', path: '/store/costco/collections/meat-seafood' },
      { name: 'Produce', path: '/store/costco/collections/produce' },
      { name: 'Dairy & Eggs', path: '/store/costco/collections/dairy-eggs' },
      { name: 'Bakery', path: '/store/costco/collections/bakery' },
      { name: 'Pantry', path: '/store/costco/collections/pantry' },
      { name: 'Frozen', path: '/store/costco/collections/frozen' },
    ],
  },
  {
    sourceId: 'bjs-instacart',
    name: "BJ's Wholesale (via Instacart)",
    chain: 'bjs',
    state: 'MA',
    instacartSlug: 'bjs-wholesale-club',
    markupPct: 18,
    categories: [
      { name: 'Meat & Seafood', path: '/store/bjs-wholesale-club/collections/meat-seafood' },
      { name: 'Produce', path: '/store/bjs-wholesale-club/collections/produce' },
      { name: 'Dairy & Eggs', path: '/store/bjs-wholesale-club/collections/dairy-eggs' },
      { name: 'Bakery', path: '/store/bjs-wholesale-club/collections/bakery' },
      { name: 'Pantry', path: '/store/bjs-wholesale-club/collections/pantry' },
      { name: 'Frozen', path: '/store/bjs-wholesale-club/collections/frozen' },
    ],
  },
];

const INSTACART_BASE = 'https://www.instacart.com';

function ensureSourceExists(db, store) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    store.sourceId, store.name, 'retail_chain', store.chain, store.state,
    'instacart', `${INSTACART_BASE}/store/${store.instacartSlug}`, 1, 'retail', 'active',
    `${INSTACART_BASE}/store/${store.instacartSlug}`,
    `Prices via Instacart (${store.markupPct}% markup adjustment applied). JS-rendered.`
  );
}

/**
 * Scrape products from an Instacart category page.
 * Instacart uses React with heavy dynamic rendering.
 */
async function scrapeInstacartCategory(page, store, category) {
  const url = `${INSTACART_BASE}${category.path}`;
  console.log(`  [${store.chain}/${category.name}] Loading ${url}`);

  const loaded = await safeFetch(page, url, 60000);
  if (!loaded) {
    console.error(`  [${store.chain}/${category.name}] Failed to load page`);
    return [];
  }

  // Instacart is very JS-heavy, give it time to render
  await sleep(5000);

  // Scroll down to trigger lazy loading of more products
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(2000);
  }

  const products = await page.evaluate(() => {
    const items = [];

    // Instacart product card selectors (they change frequently)
    const productCards = document.querySelectorAll(
      '[data-testid="product-card"], [class*="ItemCard"], [class*="product-card"], ' +
      'li[class*="Item"], div[class*="ProductCard"], a[class*="product"]'
    );

    for (const card of productCards) {
      try {
        // Product name
        const nameEl = card.querySelector(
          '[data-testid="product-title"], [class*="ItemName"], [class*="product-name"], ' +
          'h3, h2, span[class*="Name"], div[class*="title"]'
        );
        const name = nameEl?.textContent?.trim();
        if (!name) continue;

        // Price
        const priceEl = card.querySelector(
          '[data-testid="product-price"], [class*="ItemPrice"], [class*="price"], ' +
          'span[class*="Price"], div[class*="price"]'
        );
        const priceText = priceEl?.textContent?.trim();
        if (!priceText) continue;

        // Size/weight
        const sizeEl = card.querySelector(
          '[data-testid="product-size"], [class*="ItemSize"], [class*="size"], ' +
          '[class*="weight"], [class*="unit"]'
        );
        const size = sizeEl?.textContent?.trim() || '';

        // Unit price (per oz, per lb, etc.)
        const unitPriceEl = card.querySelector(
          '[class*="unit-price"], [class*="UnitPrice"], [class*="per-unit"]'
        );
        const unitPrice = unitPriceEl?.textContent?.trim() || '';

        items.push({ name, priceText, size, unitPrice });
      } catch (e) {
        // Skip individual card errors
      }
    }
    return items;
  });

  console.log(`  [${store.chain}/${category.name}] Found ${products.length} products`);
  return products;
}

/**
 * Parse price, handling Instacart formats: "$3.49", "$3.49/lb", "$12.99 each"
 */
function parsePriceCents(priceText) {
  if (!priceText) return null;

  // Handle "2/$5.00" or "2 for $5.00"
  const multiMatch = priceText.match(/(\d+)\s*(?:\/|for)\s*\$?([\d.]+)/);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseFloat(multiMatch[2]);
    if (qty > 0 && total > 0) return Math.round((total / qty) * 100);
  }

  // Standard "$X.XX"
  const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
  if (priceMatch) {
    return Math.round(parseFloat(priceMatch[1]) * 100);
  }

  return null;
}

/**
 * Adjust Instacart price down by the store's known markup percentage.
 * Returns estimated in-store price.
 */
function adjustForMarkup(priceCents, markupPct) {
  return Math.round(priceCents / (1 + markupPct / 100));
}

/**
 * Detect unit from product name and size info.
 */
function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();

  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.includes('/each') || combined.includes('per each')) return 'each';
  if (combined.includes('/doz')) return 'dozen';
  if (combined.includes('/gal')) return 'gallon';

  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gallon|gal)\b/)) return 'gallon';
  if (combined.match(/\b(egg)\b/)) return 'dozen';

  return 'each';
}

async function main() {
  const storeSlugs = process.argv.slice(2);
  const storesToScrape = storeSlugs.length > 0
    ? INSTACART_STORES.filter(s => storeSlugs.includes(s.chain))
    : INSTACART_STORES;

  if (storesToScrape.length === 0) {
    console.error('No matching stores found. Available:', INSTACART_STORES.map(s => s.chain).join(', '));
    process.exit(1);
  }

  console.log('=== OpenClaw Instacart Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stores: ${storesToScrape.map(s => s.chain).join(', ')}`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  let browser;
  try {
    console.log('Launching browser...');
    browser = await launchBrowser();

    for (const store of storesToScrape) {
      console.log(`\n--- Scraping ${store.name} ---`);
      ensureSourceExists(db, store);

      const page = await newPage(browser);
      let totalNew = 0, totalChanged = 0, totalUnchanged = 0, totalSkipped = 0;

      // Set location to Haverhill, MA for accurate store availability
      try {
        await page.setGeolocation({ latitude: 42.7762, longitude: -71.0773 });
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'geolocation', {
            value: {
              getCurrentPosition: (cb) => cb({ coords: { latitude: 42.7762, longitude: -71.0773 } }),
            },
          });
        });
      } catch (e) {
        // Geolocation may not be available, continue anyway
      }

      for (const category of store.categories) {
        const products = await scrapeInstacartCategory(page, store, category);

        for (const product of products) {
          if (!isFoodItem(product.name)) {
            totalSkipped++;
            continue;
          }

          const normalized = normalizeByRules(product.name, cachedMappings);
          if (!normalized) {
            totalSkipped++;
            continue;
          }

          const instacartPriceCents = parsePriceCents(product.priceText);
          if (!instacartPriceCents || instacartPriceCents <= 0 || instacartPriceCents > 100000) {
            totalSkipped++;
            continue;
          }

          // Adjust for Instacart markup to estimate in-store price
          const estimatedStorePriceCents = adjustForMarkup(instacartPriceCents, store.markupPct);
          const unit = detectUnit(product.name, product.size);

          saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

          const result = upsertPrice(db, {
            sourceId: store.sourceId,
            canonicalIngredientId: normalized.ingredientId,
            variantId: normalized.variantId,
            rawProductName: product.name,
            priceCents: estimatedStorePriceCents,
            priceUnit: unit,
            pricePerStandardUnitCents: estimatedStorePriceCents,
            standardUnit: unit,
            packageSize: product.size || null,
            priceType: 'regular',
            pricingTier: 'retail',
            confidence: 'instacart_adjusted',
            instacartMarkupPct: store.markupPct,
            sourceUrl: `${INSTACART_BASE}/store/${store.instacartSlug}`,
          });

          if (result === 'new') totalNew++;
          else if (result === 'changed') totalChanged++;
          else totalUnchanged++;
        }

        await rateLimitDelay();
      }

      await page.close();

      // Update source registry
      db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(store.sourceId);

      console.log(`  [${store.chain}] Results: New=${totalNew}, Changed=${totalChanged}, Unchanged=${totalUnchanged}, Skipped=${totalSkipped}`);

      // Longer delay between stores
      await sleep(10000);
    }
  } catch (err) {
    console.error('FATAL:', err.message);
    for (const store of storesToScrape) {
      db.prepare('UPDATE source_registry SET scrape_failures_consecutive = scrape_failures_consecutive + 1 WHERE source_id = ?').run(store.sourceId);
    }
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n=== Instacart Scraper Done ===');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
