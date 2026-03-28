/**
 * OpenClaw - Whole Foods / Amazon Fresh Scraper
 * Scrapes product prices from Amazon Fresh (which includes Whole Foods pricing).
 * Both are Amazon-owned; Amazon Fresh shows Whole Foods prices in supported areas.
 *
 * Strategy: Amazon Fresh requires location setting for accurate pricing.
 * Set to Haverhill, MA (01835) for New England prices.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, safeFetch, rateLimitDelay, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const STORES = [
  {
    sourceId: 'whole-foods-new-england',
    name: 'Whole Foods Market (New England)',
    chain: 'whole-foods',
    state: 'MA',
    baseUrl: 'https://www.wholefoodsmarket.com',
    categories: [
      { name: 'Meat', path: '/products/meat' },
      { name: 'Seafood', path: '/products/seafood' },
      { name: 'Produce', path: '/products/produce' },
      { name: 'Dairy & Eggs', path: '/products/dairy-eggs' },
      { name: 'Bakery', path: '/products/bakery' },
      { name: 'Pantry Essentials', path: '/products/pantry-essentials' },
      { name: 'Frozen', path: '/products/frozen-foods' },
    ],
  },
  {
    sourceId: 'amazon-fresh-new-england',
    name: 'Amazon Fresh (New England)',
    chain: 'amazon-fresh',
    state: 'MA',
    baseUrl: 'https://www.amazon.com/alm/category',
    categories: [
      { name: 'Meat & Seafood', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16318981' },
      { name: 'Produce', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16319041' },
      { name: 'Dairy, Cheese & Eggs', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16318991' },
      { name: 'Bread & Bakery', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16319431' },
      { name: 'Pantry Staples', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16310231' },
      { name: 'Frozen', path: '?almBrandId=QW1hem9uIEZyZXNo&node=16318961' },
    ],
  },
];

function ensureSourceExists(db, store) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    store.sourceId, store.name, 'retail_chain', store.chain, store.state,
    'direct_website', store.baseUrl, 1, 'retail', 'active',
    store.baseUrl, 'Online catalog with prices. JS-rendered.'
  );
}

/**
 * Scrape Whole Foods product page.
 * Their website uses a custom React app.
 */
async function scrapeWholeFoodsCategory(page, store, category) {
  const url = `${store.baseUrl}${category.path}`;
  console.log(`  [${store.chain}/${category.name}] Loading ${url}`);

  const loaded = await safeFetch(page, url, 45000);
  if (!loaded) {
    console.error(`  [${store.chain}/${category.name}] Failed to load`);
    return [];
  }

  await sleep(4000);

  // Scroll to trigger lazy loading
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1500);
  }

  const products = await page.evaluate(() => {
    const items = [];

    // Whole Foods / Amazon Fresh product card selectors
    const cards = document.querySelectorAll(
      '[data-testid="product-tile"], .w-pie--product-tile, [class*="ProductTile"], ' +
      '[class*="product-card"], .s-result-item, [data-component-type="s-search-result"]'
    );

    for (const card of cards) {
      try {
        const nameEl = card.querySelector(
          '[data-testid="product-tile-name"], .w-pie--product-tile__title, [class*="ProductTitle"], ' +
          'h2 a span, .a-text-normal, [class*="product-name"]'
        );
        const name = nameEl?.textContent?.trim();
        if (!name) continue;

        const priceEl = card.querySelector(
          '[data-testid="product-tile-price"], .w-pie--product-tile__price, [class*="ProductPrice"], ' +
          '.a-price .a-offscreen, [class*="price"], span[class*="Price"]'
        );
        const priceText = priceEl?.textContent?.trim();
        if (!priceText) continue;

        const sizeEl = card.querySelector(
          '[data-testid="product-tile-size"], .w-pie--product-tile__unit, [class*="size"], ' +
          '[class*="Size"], [class*="weight"]'
        );
        const size = sizeEl?.textContent?.trim() || '';

        const unitPriceEl = card.querySelector(
          '[class*="unit-price"], [class*="UnitPrice"], [class*="per-unit"]'
        );
        const unitPrice = unitPriceEl?.textContent?.trim() || '';

        items.push({ name, priceText, size, unitPrice });
      } catch (e) {
        // Skip
      }
    }
    return items;
  });

  console.log(`  [${store.chain}/${category.name}] Found ${products.length} products`);
  return products;
}

function parsePriceCents(priceText) {
  if (!priceText) return null;
  const multiMatch = priceText.match(/(\d+)\s*(?:\/|for)\s*\$?([\d.]+)/);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseFloat(multiMatch[2]);
    if (qty > 0 && total > 0) return Math.round((total / qty) * 100);
  }
  const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
  if (priceMatch) return Math.round(parseFloat(priceMatch[1]) * 100);
  return null;
}

function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gallon|gal)\b/)) return 'gallon';
  if (combined.match(/\b(egg)\b/)) return 'dozen';
  return 'each';
}

async function main() {
  const storeArgs = process.argv.slice(2);
  const storesToScrape = storeArgs.length > 0
    ? STORES.filter(s => storeArgs.includes(s.chain))
    : STORES;

  console.log('=== OpenClaw Whole Foods / Amazon Fresh Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  let browser;
  try {
    browser = await launchBrowser();

    for (const store of storesToScrape) {
      console.log(`\n--- Scraping ${store.name} ---`);
      ensureSourceExists(db, store);

      const page = await newPage(browser);
      let totalNew = 0, totalChanged = 0, totalUnchanged = 0, totalSkipped = 0;

      for (const category of store.categories) {
        const products = await scrapeWholeFoodsCategory(page, store, category);

        for (const product of products) {
          if (!isFoodItem(product.name)) { totalSkipped++; continue; }
          const normalized = normalizeByRules(product.name, cachedMappings);
          if (!normalized) { totalSkipped++; continue; }
          const priceCents = parsePriceCents(product.priceText);
          if (!priceCents || priceCents <= 0 || priceCents > 100000) { totalSkipped++; continue; }

          const unit = detectUnit(product.name, product.size);
          saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

          const result = upsertPrice(db, {
            sourceId: store.sourceId,
            canonicalIngredientId: normalized.ingredientId,
            variantId: normalized.variantId,
            rawProductName: product.name,
            priceCents,
            priceUnit: unit,
            pricePerStandardUnitCents: priceCents,
            standardUnit: unit,
            packageSize: product.size || null,
            priceType: 'regular',
            pricingTier: 'retail',
            confidence: 'direct_scrape',
            sourceUrl: store.baseUrl,
          });

          if (result === 'new') totalNew++;
          else if (result === 'changed') totalChanged++;
          else totalUnchanged++;
        }

        await rateLimitDelay();
      }

      await page.close();
      db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(store.sourceId);
      console.log(`  [${store.chain}] Results: New=${totalNew}, Changed=${totalChanged}, Unchanged=${totalUnchanged}, Skipped=${totalSkipped}`);
      await sleep(8000);
    }
  } catch (err) {
    console.error('FATAL:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n=== Done ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
