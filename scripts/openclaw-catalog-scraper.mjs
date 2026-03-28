/**
 * OpenClaw - Full Catalog Scraper (API Interception)
 *
 * Uses Playwright to navigate Instacart pages, but extracts product data
 * from intercepted GraphQL API responses (not DOM scraping).
 * This is far more reliable and gets ALL products, not just visible ones.
 *
 * Runs on Windows machine, pushes to Pi database via sync API.
 *
 * Usage:
 *   node scripts/openclaw-catalog-scraper.mjs
 *   node scripts/openclaw-catalog-scraper.mjs --store=market-basket
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const PI_API = process.env.OPENCLAW_API || 'http://10.0.0.177:8081';
const INSTACART_BASE = 'https://www.instacart.com';

// Stores to scrape
const STORES = [
  { slug: 'market-basket', name: 'Market Basket', markupPct: 15, tier: 'retail' },
  { slug: 'hannaford', name: 'Hannaford', markupPct: 12, tier: 'retail' },
  { slug: 'stop-and-shop', name: 'Stop & Shop', markupPct: 15, tier: 'retail' },
  { slug: 'shaws', name: "Shaw's", markupPct: 15, tier: 'retail' },
  { slug: 'aldi', name: 'ALDI', markupPct: 18, tier: 'retail' },
  { slug: 'wegmans', name: "Wegman's", markupPct: 12, tier: 'retail' },
  { slug: 'whole-foods', name: 'Whole Foods', markupPct: 10, tier: 'retail' },
  { slug: 'costco', name: 'Costco', markupPct: 20, tier: 'wholesale' },
  { slug: 'bjs-wholesale-club', name: "BJ's", markupPct: 18, tier: 'wholesale' },
];

// Category pages to browse (each triggers API calls with product data)
// Using subcategories for deeper coverage - each loads a separate product set
const CATEGORIES = [
  // Top-level
  'meat-seafood', 'produce', 'dairy-eggs', 'frozen', 'pantry',
  'bakery-bread', 'beverages', 'deli', 'snacks', 'breakfast',
  'international', 'household', 'condiments-sauces', 'canned-goods',
  // Meat subcategories
  'beef', 'pork', 'chicken', 'turkey', 'lamb-veal', 'sausages-hot-dogs',
  // Seafood subcategories
  'fresh-fish', 'fresh-shellfish', 'frozen-seafood',
  // Produce subcategories
  'fresh-fruits', 'fresh-vegetables', 'fresh-herbs', 'organic-produce',
  'salads', 'mushrooms', 'onions-garlic', 'potatoes',
  // Dairy subcategories
  'milk', 'cheese', 'yogurt', 'butter-margarine', 'cream', 'eggs',
  // Frozen subcategories
  'frozen-meals', 'frozen-pizza', 'frozen-vegetables', 'frozen-fruits',
  'ice-cream', 'frozen-meat-seafood', 'frozen-breakfast', 'frozen-appetizers',
  // Pantry subcategories
  'pasta', 'rice-grains', 'canned-tomatoes', 'beans', 'soup', 'broth-stock',
  'cooking-oils', 'vinegar', 'flour-sugar-baking', 'spices-seasonings',
  'nuts-seeds', 'dried-fruits', 'honey-syrups',
  // Bakery subcategories
  'bread', 'rolls-buns', 'tortillas-wraps', 'bagels',
  // Beverages subcategories
  'water', 'juice', 'coffee', 'tea',
  // Deli subcategories
  'deli-meats', 'prepared-meals', 'hummus-dips',
  // Snacks subcategories
  'chips', 'crackers', 'nuts-trail-mix', 'popcorn', 'dried-fruit-snacks',
  // Condiments
  'ketchup-mustard', 'mayonnaise', 'salad-dressing', 'hot-sauce',
  'soy-sauce-teriyaki', 'bbq-sauce', 'pasta-sauce', 'salsa',
];

// Targeted search terms for items categories might miss
const SEARCH_TERMS = [
  'ribeye', 'filet mignon', 'strip steak', 'brisket', 'short ribs',
  'pork belly', 'lamb rack', 'lamb chops', 'duck breast', 'quail',
  'salmon', 'halibut', 'swordfish', 'sea bass', 'mahi mahi', 'haddock', 'trout',
  'lobster', 'scallops', 'mussels', 'clams', 'oysters', 'calamari',
  'heavy cream', 'creme fraiche', 'mascarpone', 'gruyere', 'brie',
  'goat cheese', 'burrata', 'fresh mozzarella', 'fontina', 'manchego',
  'ghee', 'cultured butter',
  'shallots', 'leeks', 'fennel', 'artichoke', 'endive', 'radicchio',
  'parsnip', 'rutabaga', 'celery root', 'jicama',
  'kabocha squash', 'delicata squash', 'spaghetti squash',
  'shiitake mushrooms', 'oyster mushrooms', 'portobello',
  'habanero', 'poblano', 'serrano pepper',
  'mango', 'papaya', 'dragon fruit', 'pomegranate', 'fig',
  'fresh basil', 'fresh dill', 'fresh rosemary', 'fresh thyme', 'lemongrass',
  'coconut milk', 'tahini', 'miso paste', 'fish sauce', 'gochujang',
  'truffle oil', 'sesame oil', 'balsamic vinegar', 'rice vinegar',
  'panko', 'cornmeal', 'polenta', 'almond flour', 'coconut flour',
  'saffron', 'sumac', 'garam masala', 'smoked paprika', 'cardamom',
  'arborio rice', 'basmati rice', 'jasmine rice', 'wild rice',
  'quinoa', 'farro', 'barley', 'couscous',
  'fresh pasta', 'rice noodles', 'udon', 'soba',
  'nori', 'rice paper', 'wonton wrappers', 'masa harina',
  'frozen shrimp', 'frozen salmon', 'frozen peas', 'frozen berries',
];

/**
 * Extract products from Instacart GraphQL API response.
 */
function extractProductsFromAPI(data) {
  const products = [];

  function processItem(item) {
    if (!item || !item.name) return;

    const priceSection = item.price?.viewSection;
    if (!priceSection) return;

    const priceValue = priceSection.priceValueString || priceSection.priceString;
    if (!priceValue) return;

    const priceCents = Math.round(parseFloat(priceValue.replace('$', '')) * 100);
    if (isNaN(priceCents) || priceCents <= 0 || priceCents > 100000) return;

    const perUnit = priceSection.itemDetails?.pricePerUnitString || '';
    const pricingUnit = priceSection.itemDetails?.pricingUnitString || priceSection.itemCard?.pricingUnitString || '';

    products.push({
      name: item.name,
      priceCents,
      size: item.size || '',
      perUnit,
      pricingUnit,
      productId: item.productId || '',
      brandName: item.brandName || '',
      onSale: priceSection.trackingProperties?.on_sale_ind?.loyalty === true,
    });
  }

  // Recursively find items in the response
  function findItems(obj, depth = 0) {
    if (depth > 10 || !obj) return;

    if (typeof obj === 'object' && obj !== null) {
      // Direct item with name + price
      if (obj.name && obj.price && obj.__typename?.includes('Item')) {
        processItem(obj);
      }

      if (Array.isArray(obj)) {
        for (const item of obj) {
          findItems(item, depth + 1);
        }
      } else {
        for (const key of Object.keys(obj)) {
          if (['items', 'nodes', 'products', 'data', 'placements', 'modules',
               'banners', 'contentItems', 'sectionItems', 'featuredProducts'].includes(key)) {
            findItems(obj[key], depth + 1);
          }
          // Also check the 'data' key at root level
          if (key === 'data' && depth === 0) {
            findItems(obj[key], depth + 1);
          }
        }
      }
    }
  }

  findItems(data);
  return products;
}

function adjustPrice(priceCents, markupPct) {
  return Math.round(priceCents / (1 + markupPct / 100));
}

function detectUnit(name, size, perUnit) {
  const combined = `${name} ${size} ${perUnit}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal|halibut|swordfish|tuna|haddock|lobster|crab|scallop|duck|brisket|tenderloin)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gal|gallon)\b/)) return 'gallon';
  if (combined.match(/\begg\b/)) return 'dozen';
  return 'each';
}

async function main() {
  const args = process.argv.slice(2);
  const storeFilter = args.find(a => a.startsWith('--store='))?.split('=')[1];

  const storesToScrape = storeFilter
    ? STORES.filter(s => s.slug === storeFilter)
    : STORES;

  if (storesToScrape.length === 0) {
    console.error('Store not found. Available:', STORES.map(s => s.slug).join(', '));
    process.exit(1);
  }

  console.log('=== OpenClaw Full Catalog Scraper (API Interception) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stores: ${storesToScrape.map(s => s.name).join(', ')}`);
  console.log(`Pi API: ${PI_API}`);

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    geolocation: { latitude: 42.7762, longitude: -71.0773 },
    permissions: ['geolocation'],
  });

  // Block images to speed things up
  await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot}', route => route.abort());

  let allPrices = [];
  let totalImported = 0;

  for (const store of storesToScrape) {
    console.log(`\n========== ${store.name} (${store.slug}) ==========`);
    const sourceId = `${store.slug}-instacart`;
    const seenProducts = new Map(); // productId -> product
    let capturedProducts = [];

    // Create a page with API interception
    const page = await context.newPage();

    // Intercept GraphQL responses containing product data
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('graphql')) return;

      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;

        const body = await response.json();
        const products = extractProductsFromAPI(body);

        for (const p of products) {
          const key = p.productId || p.name;
          if (!seenProducts.has(key)) {
            seenProducts.set(key, p);
            capturedProducts.push(p);
          }
        }

        if (products.length > 0) {
          // Get operation name from URL
          const opMatch = url.match(/operationName=([^&]+)/);
          const op = opMatch ? opMatch[1] : 'unknown';
          process.stdout.write(`  [API:${op}] +${products.length} products (${seenProducts.size} total)\n`);
        }
      } catch (e) {
        // Skip non-JSON or errors
      }
    });

    // Phase 1: Browse categories
    console.log(`\n  Phase 1: Browsing ${CATEGORIES.length} categories...`);
    for (const cat of CATEGORIES) {
      const url = `${INSTACART_BASE}/store/${store.slug}/collections/${cat}`;
      process.stdout.write(`  [${cat}] Loading... `);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(3000);

        // Scroll to trigger lazy-loaded product batches
        for (let i = 0; i < 20; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(800);
        }
        console.log(`done (${seenProducts.size} total)`);
      } catch (err) {
        console.log(`timeout (${seenProducts.size} total)`);
      }

      // Brief pause between categories
      await page.waitForTimeout(1000);
    }

    // Phase 2: Targeted searches
    console.log(`\n  Phase 2: ${SEARCH_TERMS.length} targeted searches...`);
    for (let i = 0; i < SEARCH_TERMS.length; i++) {
      const term = SEARCH_TERMS[i];
      const url = `${INSTACART_BASE}/store/${store.slug}/search/${encodeURIComponent(term)}`;

      if (i % 10 === 0) {
        console.log(`  [search ${i+1}/${SEARCH_TERMS.length}] "${term}" (${seenProducts.size} total)`);
      }

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2500);
        // Quick scroll for search results
        for (let s = 0; s < 5; s++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(600);
        }
      } catch (e) {
        // Timeout OK, we still captured API responses
      }

      await page.waitForTimeout(800);
    }

    await page.close();

    // Process and push this store's products immediately
    console.log(`\n  ${store.name}: ${seenProducts.size} unique products captured`);

    const storePrices = [];
    for (const [key, p] of seenProducts) {
      const adjustedPrice = adjustPrice(p.priceCents, store.markupPct);
      const unit = detectUnit(p.name, p.size, p.perUnit);

      storePrices.push({
        sourceId,
        rawProductName: p.name,
        priceCents: adjustedPrice,
        priceUnit: unit,
        packageSize: p.size || null,
        priceType: p.onSale ? 'sale' : 'regular',
        pricingTier: store.tier,
        confidence: 'instacart_catalog',
        instacartMarkupPct: store.markupPct,
      });
    }

    allPrices.push(...storePrices);

    // Push THIS store to Pi immediately (don't wait for all stores)
    console.log(`  Pushing ${storePrices.length} prices to Pi...`);
    const BATCH_SIZE = 200;
    let storeImported = 0;

    for (let i = 0; i < storePrices.length; i += BATCH_SIZE) {
      const batch = storePrices.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(`${PI_API}/api/prices/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prices: batch }),
        });

        if (res.ok) {
          const result = await res.json();
          storeImported += result.imported || 0;
        } else {
          console.log(`  Batch error: HTTP ${res.status}`);
        }
      } catch (err) {
        console.log(`  Batch error: ${err.message}`);
      }
    }

    totalImported += storeImported;
    console.log(`  ${store.name}: ${storeImported} imported to Pi (${totalImported} total across all stores)`);

    // Check Pi stats after each store
    try {
      const stats = await (await fetch(`${PI_API}/api/stats`)).json();
      console.log(`  Pi database: ${stats.currentPrices} prices, ${stats.canonicalIngredients} ingredients`);
    } catch (e) {}
  }

  await browser.close();
  console.log('\nBrowser closed.');

  // Save full local JSON backup
  const outFile = './scripts/openclaw-scraped-prices.json';
  writeFileSync(outFile, JSON.stringify(allPrices, null, 2));
  console.log(`\nSaved ${allPrices.length} prices to ${outFile}`);

  console.log(`\n=== DONE ===`);
  console.log(`Total products scraped: ${allPrices.length}`);
  console.log(`Total imported to Pi: ${totalImported}`);
  console.log(`Stores completed: ${storesToScrape.length}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
