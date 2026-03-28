/**
 * OpenClaw - Stop & Shop / Shaw's Scraper
 * Both are Ahold Delhaize brands and share similar website structures.
 * Scrapes product prices from stopandshop.com and shaws.com.
 * Both have full online shopping with prices, JS-rendered.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, safeFetch, rateLimitDelay, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const STORES = [
  {
    sourceId: 'stop-and-shop-new-england',
    name: 'Stop & Shop (New England)',
    chain: 'stop-and-shop',
    state: 'MA',
    baseUrl: 'https://stopandshop.com',
    categories: [
      { name: 'Meat & Seafood', path: '/shop/aisles/meat-seafood.702.html' },
      { name: 'Produce', path: '/shop/aisles/fruits-vegetables.688.html' },
      { name: 'Dairy & Eggs', path: '/shop/aisles/dairy.693.html' },
      { name: 'Bakery', path: '/shop/aisles/bakery.725.html' },
      { name: 'Pantry', path: '/shop/aisles/pantry.720.html' },
      { name: 'Frozen', path: '/shop/aisles/frozen.698.html' },
      { name: 'Deli', path: '/shop/aisles/deli.736.html' },
    ],
  },
  {
    sourceId: 'shaws-new-england',
    name: "Shaw's (New England)",
    chain: 'shaws',
    state: 'MA',
    baseUrl: 'https://www.shaws.com',
    categories: [
      { name: 'Meat & Seafood', path: '/shop/aisles/meat-seafood.702.html' },
      { name: 'Produce', path: '/shop/aisles/fruits-vegetables.688.html' },
      { name: 'Dairy & Eggs', path: '/shop/aisles/dairy.693.html' },
      { name: 'Bakery', path: '/shop/aisles/bakery.725.html' },
      { name: 'Pantry', path: '/shop/aisles/pantry.720.html' },
      { name: 'Frozen', path: '/shop/aisles/frozen.698.html' },
      { name: 'Deli', path: '/shop/aisles/deli.736.html' },
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
    store.baseUrl, `Full online catalog with prices. JS-rendered, Ahold Delhaize platform.`
  );
}

/**
 * Scrape products from an Ahold Delhaize category page (Stop & Shop, Shaw's).
 * Both use the same Peapod/Ahold platform with similar DOM structure.
 */
async function scrapeCategory(page, store, category) {
  const url = `${store.baseUrl}${category.path}`;
  console.log(`  [${store.chain}/${category.name}] Loading ${url}`);

  const loaded = await safeFetch(page, url, 45000);
  if (!loaded) {
    console.error(`  [${store.chain}/${category.name}] Failed to load page`);
    return [];
  }

  await sleep(4000);

  // Scroll to load more products
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1500);
  }

  const products = await page.evaluate(() => {
    const items = [];

    // Ahold Delhaize platform selectors
    const productCards = document.querySelectorAll(
      '[data-testid="product-cell"], .cell-content-wrapper, [class*="ProductCard"], ' +
      '[class*="product-card"], [class*="ProductCell"], article[class*="product"]'
    );

    for (const card of productCards) {
      try {
        const nameEl = card.querySelector(
          '[data-testid="product-title"], .product-title, [class*="ProductTitle"], ' +
          '[class*="product-name"], h3, h2, [class*="Title"]'
        );
        const name = nameEl?.textContent?.trim();
        if (!name) continue;

        const priceEl = card.querySelector(
          '[data-testid="product-price"], .product-price, [class*="ProductPrice"], ' +
          '[class*="price"], .price, span[class*="Price"]'
        );
        const priceText = priceEl?.textContent?.trim();
        if (!priceText) continue;

        const sizeEl = card.querySelector(
          '[data-testid="product-size"], .product-size, [class*="ProductSize"], ' +
          '[class*="size"], [class*="weight"], [class*="PackSize"]'
        );
        const size = sizeEl?.textContent?.trim() || '';

        const unitPriceEl = card.querySelector(
          '[class*="unit-price"], [class*="UnitPrice"], [class*="per-unit"], [class*="pricePerUnit"]'
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
  if (combined.includes('/each') || combined.includes('per each')) return 'each';
  if (combined.includes('/doz')) return 'dozen';
  if (combined.includes('/gal')) return 'gallon';
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

  console.log('=== OpenClaw Stop & Shop / Shaw\'s Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stores: ${storesToScrape.map(s => s.chain).join(', ')}`);

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
        const products = await scrapeCategory(page, store, category);

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
