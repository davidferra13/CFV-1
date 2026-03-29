/**
 * OpenClaw - Walmart Grocery Scraper
 *
 * Scrapes Walmart's server-rendered grocery pages for embedded product JSON.
 * Walmart uses Next.js with __NEXT_DATA__ containing full product details.
 * HTTP-only (works on Pi without Puppeteer).
 *
 * Strategy: search for grocery terms, parse SSR HTML for embedded pricing data.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings } from '../lib/normalize-rules.mjs';

const SOURCE_ID = 'walmart-methuen-ma';
const WALMART_STORE_ID = '2153'; // Methuen, MA Walmart

// Walmart search API (server-rendered, embedded JSON in HTML)
const SEARCH_BASE = 'https://www.walmart.com/search';

// Grocery search terms (what a chef would buy)
const SEARCH_TERMS = [
  // Proteins
  'chicken breast', 'chicken thigh', 'chicken wings', 'whole chicken',
  'ground beef', 'ground turkey', 'steak', 'beef roast',
  'pork chop', 'pork loin', 'pork tenderloin', 'bacon', 'sausage', 'ham',
  'salmon fillet', 'shrimp', 'tilapia', 'cod', 'canned tuna',
  'eggs', 'tofu',

  // Dairy
  'whole milk', 'butter', 'cheddar cheese', 'mozzarella cheese',
  'cream cheese', 'sour cream', 'heavy cream', 'yogurt',
  'parmesan cheese', 'cottage cheese', 'half and half',
  'oat milk', 'almond milk',

  // Produce
  'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grape',
  'avocado', 'lemon', 'lime', 'mango', 'pineapple',
  'tomato', 'potato', 'onion', 'garlic', 'bell pepper', 'mushroom',
  'lettuce', 'spinach', 'broccoli', 'carrot', 'celery', 'cucumber',
  'corn', 'green bean', 'asparagus', 'zucchini', 'sweet potato',
  'cauliflower', 'cabbage', 'kale',

  // Pantry staples
  'white rice', 'brown rice', 'pasta', 'spaghetti', 'penne',
  'bread', 'flour', 'sugar', 'brown sugar', 'powdered sugar',
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
  'canned tomato', 'tomato sauce', 'tomato paste', 'crushed tomato',
  'chicken broth', 'beef broth', 'vegetable broth',
  'black beans', 'kidney beans', 'pinto beans', 'chickpeas', 'lentils',
  'peanut butter', 'honey', 'maple syrup', 'jam',
  'vinegar', 'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayonnaise',
  'salt', 'black pepper', 'garlic powder', 'onion powder', 'paprika',
  'cumin', 'chili powder', 'oregano', 'basil', 'thyme', 'cinnamon',
  'baking powder', 'baking soda', 'vanilla extract', 'yeast',
  'cornstarch', 'breadcrumbs', 'panko',
  'tortilla', 'taco shell',
  'cereal', 'oatmeal', 'granola',

  // Frozen
  'frozen vegetable', 'frozen fruit', 'frozen chicken',
  'frozen shrimp', 'frozen fish',

  // Beverages
  'orange juice', 'apple juice', 'coffee', 'tea',

  // Baking & nuts
  'chocolate chips', 'cocoa powder', 'almonds', 'walnuts', 'pecans',
  'cashews', 'peanuts', 'dried cranberry', 'raisins',

  // Canned goods
  'canned corn', 'canned green bean', 'canned soup',
  'coconut milk', 'evaporated milk', 'condensed milk',
];

const stats = { searched: 0, products: 0, stored: 0, skipped: 0, errors: 0 };

/**
 * Extract product data from Walmart search page HTML.
 * Walmart embeds product data as JSON in script tags.
 */
function extractProductsFromHtml(html) {
  const products = [];

  // Method 1: Look for __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const searchResult = data?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items
        || data?.props?.pageProps?.initialData?.searchResult?.items
        || [];

      for (const item of searchResult) {
        if (!item?.name || item?.type === 'AD') continue;

        const priceCents = item?.priceInfo?.currentPrice?.price
          ? Math.round(item.priceInfo.currentPrice.price * 100)
          : null;

        const unitPriceStr = item?.priceInfo?.unitPrice?.priceString || '';
        const name = item.name;

        if (!priceCents || priceCents <= 0 || priceCents > 50000) continue;

        let priceUnit = 'each';
        let standardUnit = 'each';
        let pricePerStdUnit = priceCents;

        // Parse unit price (e.g., "$2.47/lb", "$0.12/oz")
        const unitMatch = unitPriceStr.match(/\$?([\d.]+)\s*\/\s*(lb|oz|fl oz|count|each)/i);
        if (unitMatch) {
          const unitPrice = Math.round(parseFloat(unitMatch[1]) * 100);
          const unit = unitMatch[2].toLowerCase();
          if (unit === 'lb') { priceUnit = 'lb'; standardUnit = 'lb'; pricePerStdUnit = unitPrice; }
          else if (unit === 'oz') { priceUnit = 'oz'; standardUnit = 'oz'; pricePerStdUnit = unitPrice * 16; }
        }

        // Package size from name
        const weightMatch = name.match(/(\d+\.?\d*)\s*(oz|lb|fl\s*oz|gal|qt|pt|ct|count|pack)/i);
        const packageSize = weightMatch ? `${weightMatch[1]} ${weightMatch[2]}` : null;

        products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize });
      }
    } catch (err) {
      // __NEXT_DATA__ parse failed, try method 2
    }
  }

  // Method 2: Regex for priceInfo patterns in inline scripts
  if (products.length === 0) {
    const pricePattern = /"name"\s*:\s*"([^"]+)"[\s\S]*?"currentPrice"\s*:\s*\{\s*"price"\s*:\s*([\d.]+)/g;
    let match;
    while ((match = pricePattern.exec(html)) !== null) {
      const name = match[1];
      const priceCents = Math.round(parseFloat(match[2]) * 100);
      if (priceCents > 0 && priceCents < 50000) {
        products.push({ name, priceCents, priceUnit: 'each', pricePerStdUnit: priceCents, standardUnit: 'each', packageSize: null });
      }
    }
  }

  return products;
}

async function searchWalmart(keyword) {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(keyword)}&cat_id=976759&sort=best_match&affinityOverride=default`;

  try {
    const res = await httpFetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    const html = await res.text();
    return extractProductsFromHtml(html);
  } catch (err) {
    if (err.message?.includes('403') || err.message?.includes('429')) {
      console.log(`  [blocked] ${keyword} - waiting 60s...`);
      await sleep(60000);
      // Single retry
      try {
        const res = await httpFetch(url);
        const html = await res.text();
        return extractProductsFromHtml(html);
      } catch {
        stats.errors++;
        return [];
      }
    }
    console.error(`  [error] "${keyword}": ${err.message}`);
    stats.errors++;
    return [];
  }
}

function processProduct(db, product, mappings) {
  const { name, priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize } = product;

  if (!isFoodItem(name)) {
    stats.skipped++;
    return;
  }

  const normalized = normalizeByRules(name);
  if (!normalized) {
    stats.skipped++;
    return;
  }

  stats.stored++;
  upsertPrice(db, {
    sourceId: SOURCE_ID,
    canonicalIngredientId: normalized.ingredientId,
    variantId: normalized.variantId || null,
    rawProductName: name,
    priceCents,
    priceUnit,
    pricePerStandardUnitCents: pricePerStdUnit,
    standardUnit,
    packageSize,
    priceType: 'regular',
    pricingTier: 'retail',
    confidence: 'ssr_extract',
    sourceUrl: `https://www.walmart.com/search?q=${encodeURIComponent(name)}`,
    inStock: true,
    imageUrl: null,
    brand: null,
    aisleCat: null,
  });
}

async function main() {
  console.log('=== OpenClaw Walmart Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Store: Walmart Methuen, MA (#${WALMART_STORE_ID})`);

  const db = getDb();
  const mappings = loadCachedMappings(db);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (
      source_id, name, type, chain_id, city, state, zip, website,
      scrape_method, has_online_pricing, pricing_tier, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(SOURCE_ID, 'Walmart (Methuen, MA)', 'retail_chain', 'walmart', 'Methuen', 'MA', '01844',
    'https://www.walmart.com', 'ssr_extract', 1, 'retail', 'active',
    'Grocery prices extracted from server-rendered HTML pages.', now, now);

  const seen = new Set();

  for (let i = 0; i < SEARCH_TERMS.length; i++) {
    const keyword = SEARCH_TERMS[i];
    stats.searched++;

    const products = await searchWalmart(keyword);

    let termNew = 0;
    for (const p of products) {
      const key = `${p.name}:${p.priceCents}`;
      if (seen.has(key)) continue;
      seen.add(key);
      processProduct(db, p, mappings);
      termNew++;
      stats.products++;
    }

    if (i % 15 === 0) {
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`  [${i}/${SEARCH_TERMS.length}] (${elapsed}min) "${keyword}" | found=${products.length} new=${termNew} | total stored=${stats.stored}`);
    }

    // Walmart is more aggressive about rate limiting
    await sleep(3000 + Math.random() * 4000);
  }

  db.prepare('UPDATE source_registry SET last_scraped_at = ? WHERE source_id = ?')
    .run(new Date().toISOString(), SOURCE_ID);

  console.log('\n=== Walmart Scraper Results ===');
  console.log(`  Searches: ${stats.searched}`);
  console.log(`  Products found: ${stats.products}`);
  console.log(`  Stored: ${stats.stored}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`=== Done (${new Date().toISOString()}) ===`);
}

const startTime = Date.now();
main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
