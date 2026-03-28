/**
 * OpenClaw - Hannaford Scraper
 * Scrapes product prices from hannaford.com using Puppeteer.
 * Hannaford has full online shopping with prices, JS-rendered.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, safeFetch, rateLimitDelay, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const SOURCE_ID = 'hannaford-new-england';
const HANNAFORD_BASE = 'https://www.hannaford.com';

// Hannaford product categories to scrape (food only)
const CATEGORIES = [
  { name: 'Meat & Seafood', path: '/shop/categories/meat-seafood/4000' },
  { name: 'Produce', path: '/shop/categories/produce/1000' },
  { name: 'Dairy & Eggs', path: '/shop/categories/dairy-eggs/2000' },
  { name: 'Bakery & Bread', path: '/shop/categories/bakery-bread/7000' },
  { name: 'Pantry', path: '/shop/categories/pantry/5000' },
  { name: 'Frozen', path: '/shop/categories/frozen/3000' },
  { name: 'Deli', path: '/shop/categories/deli/8000' },
];

function ensureSourceExists(db) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    SOURCE_ID, 'Hannaford (New England)', 'retail_chain', 'hannaford', 'MA',
    'direct_website', HANNAFORD_BASE, 1, 'retail', 'active',
    HANNAFORD_BASE, 'Full online catalog with prices. JS-rendered, needs Puppeteer.'
  );
}

/**
 * Scrape products from a single category page.
 */
async function scrapeCategory(page, category) {
  const url = `${HANNAFORD_BASE}${category.path}`;
  console.log(`  [${category.name}] Loading ${url}`);

  const loaded = await safeFetch(page, url, 45000);
  if (!loaded) {
    console.error(`  [${category.name}] Failed to load page`);
    return [];
  }

  // Wait for product elements to render
  await sleep(3000);

  // Try to extract product data from the page
  const products = await page.evaluate(() => {
    const items = [];

    // Hannaford uses various selectors - try common patterns
    const productCards = document.querySelectorAll(
      '[data-testid="product-card"], .product-card, .product-tile, [class*="ProductCard"], [class*="product-item"], article[class*="product"]'
    );

    for (const card of productCards) {
      try {
        // Try multiple selector patterns for name
        const nameEl = card.querySelector(
          '[data-testid="product-title"], .product-title, .product-name, h3, h2, [class*="productName"], [class*="ProductName"], [class*="product-title"]'
        );
        const name = nameEl?.textContent?.trim();
        if (!name) continue;

        // Try multiple selector patterns for price
        const priceEl = card.querySelector(
          '[data-testid="product-price"], .product-price, .price, [class*="price"], [class*="Price"], span[class*="price"]'
        );
        const priceText = priceEl?.textContent?.trim();
        if (!priceText) continue;

        // Try to get size/weight info
        const sizeEl = card.querySelector(
          '[data-testid="product-size"], .product-size, .size, [class*="size"], [class*="Size"], [class*="weight"]'
        );
        const size = sizeEl?.textContent?.trim() || '';

        // Try to get per-unit price
        const unitPriceEl = card.querySelector(
          '[class*="unit-price"], [class*="unitPrice"], [class*="per-unit"], .unit-price'
        );
        const unitPrice = unitPriceEl?.textContent?.trim() || '';

        items.push({ name, priceText, size, unitPrice });
      } catch (e) {
        // Skip individual card errors
      }
    }
    return items;
  });

  console.log(`  [${category.name}] Found ${products.length} products`);
  return products;
}

/**
 * Parse a price string into cents.
 * Handles: "$3.49", "$3.49/lb", "2/$5.00", "$12.99"
 */
function parsePriceCents(priceText) {
  if (!priceText) return null;

  // Handle "2/$5.00" format
  const multiMatch = priceText.match(/(\d+)\s*\/\s*\$?([\d.]+)/);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseFloat(multiMatch[2]);
    if (qty > 0 && total > 0) return Math.round((total / qty) * 100);
  }

  // Handle standard "$X.XX" format
  const priceMatch = priceText.match(/\$?([\d]+\.[\d]{2})/);
  if (priceMatch) {
    return Math.round(parseFloat(priceMatch[1]) * 100);
  }

  return null;
}

/**
 * Detect unit from product name and size.
 */
function detectUnit(name, size) {
  const combined = `${name} ${size}`.toLowerCase();

  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.includes('/each') || combined.includes('per each')) return 'each';
  if (combined.includes('/doz')) return 'dozen';
  if (combined.includes('/gal')) return 'gallon';

  // Infer from category/product type
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gallon|gal)\b/)) return 'gallon';
  if (combined.match(/\b(egg)\b/)) return 'dozen';

  return 'each'; // default
}

async function main() {
  console.log('=== OpenClaw Hannaford Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const db = getDb();
  ensureSourceExists(db);
  const cachedMappings = loadCachedMappings(db);

  let browser;
  try {
    console.log('Launching browser...');
    browser = await launchBrowser();
    const page = await newPage(browser);

    let totalNew = 0, totalChanged = 0, totalUnchanged = 0, totalSkipped = 0;

    for (const category of CATEGORIES) {
      const products = await scrapeCategory(page, category);

      for (const product of products) {
        // Filter non-food items
        if (!isFoodItem(product.name)) {
          totalSkipped++;
          continue;
        }

        // Normalize to canonical ingredient
        const normalized = normalizeByRules(product.name, cachedMappings);
        if (!normalized) {
          totalSkipped++;
          continue;
        }

        // Parse price
        const priceCents = parsePriceCents(product.priceText);
        if (!priceCents || priceCents <= 0 || priceCents > 100000) {
          totalSkipped++;
          continue;
        }

        const unit = detectUnit(product.name, product.size);

        // Save normalization mapping
        saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

        // Upsert price
        const result = upsertPrice(db, {
          sourceId: SOURCE_ID,
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
          sourceUrl: HANNAFORD_BASE,
        });

        if (result === 'new') totalNew++;
        else if (result === 'changed') totalChanged++;
        else totalUnchanged++;
      }

      // Rate limit between categories
      await rateLimitDelay();
    }

    // Update source registry
    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(SOURCE_ID);

    console.log('');
    console.log(`=== Hannaford Results ===`);
    console.log(`New: ${totalNew}, Changed: ${totalChanged}, Unchanged: ${totalUnchanged}, Skipped: ${totalSkipped}`);

  } catch (err) {
    console.error('FATAL:', err.message);
    // Update failure count
    db.prepare('UPDATE source_registry SET scrape_failures_consecutive = scrape_failures_consecutive + 1 WHERE source_id = ?').run(SOURCE_ID);
  } finally {
    if (browser) await browser.close();
  }

  console.log('=== Done ===');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
