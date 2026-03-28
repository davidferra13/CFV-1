/**
 * OpenClaw - Scrape Remaining Stores (runs after Market Basket completes)
 *
 * Identical logic to openclaw-catalog-scraper.mjs but:
 * - Skips Market Basket (already done or in progress)
 * - Flushes to Pi every 500 products (crash-safe)
 * - Faster scroll timing for throughput
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PI_API = process.env.OPENCLAW_API || 'http://10.0.0.177:8081';
const INSTACART_BASE = 'https://www.instacart.com';
const FLUSH_EVERY = 500; // Push to Pi every N new products

const STORES = [
  { slug: 'hannaford', name: 'Hannaford', markupPct: 12, tier: 'retail' },
  { slug: 'stop-and-shop', name: 'Stop & Shop', markupPct: 15, tier: 'retail' },
  { slug: 'shaws', name: "Shaw's", markupPct: 15, tier: 'retail' },
  { slug: 'aldi', name: 'ALDI', markupPct: 18, tier: 'retail' },
  { slug: 'wegmans', name: "Wegman's", markupPct: 12, tier: 'retail' },
  { slug: 'whole-foods', name: 'Whole Foods', markupPct: 10, tier: 'retail' },
  { slug: 'costco', name: 'Costco', markupPct: 20, tier: 'wholesale' },
  { slug: 'bjs-wholesale-club', name: "BJ's", markupPct: 18, tier: 'wholesale' },
];

// Full category list - top level + subcategories for deep coverage
const CATEGORIES = [
  'meat-seafood', 'produce', 'dairy-eggs', 'frozen', 'pantry',
  'bakery-bread', 'beverages', 'deli', 'snacks', 'breakfast',
  'international', 'household', 'condiments-sauces', 'canned-goods',
  'beef', 'pork', 'chicken', 'turkey', 'lamb-veal', 'sausages-hot-dogs',
  'fresh-fish', 'fresh-shellfish', 'frozen-seafood',
  'fresh-fruits', 'fresh-vegetables', 'fresh-herbs', 'organic-produce',
  'salads', 'mushrooms', 'onions-garlic', 'potatoes',
  'milk', 'cheese', 'yogurt', 'butter-margarine', 'cream', 'eggs',
  'frozen-meals', 'frozen-pizza', 'frozen-vegetables', 'frozen-fruits',
  'ice-cream', 'frozen-meat-seafood', 'frozen-breakfast', 'frozen-appetizers',
  'pasta', 'rice-grains', 'canned-tomatoes', 'beans', 'soup', 'broth-stock',
  'cooking-oils', 'vinegar', 'flour-sugar-baking', 'spices-seasonings',
  'nuts-seeds', 'dried-fruits', 'honey-syrups',
  'bread', 'rolls-buns', 'tortillas-wraps', 'bagels',
  'water', 'juice', 'coffee', 'tea',
  'deli-meats', 'prepared-meals', 'hummus-dips',
  'chips', 'crackers', 'nuts-trail-mix', 'popcorn', 'dried-fruit-snacks',
  'ketchup-mustard', 'mayonnaise', 'salad-dressing', 'hot-sauce',
  'soy-sauce-teriyaki', 'bbq-sauce', 'pasta-sauce', 'salsa',
];

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

    products.push({
      name: item.name,
      priceCents,
      size: item.size || '',
      perUnit: priceSection.itemDetails?.pricePerUnitString || '',
      pricingUnit: priceSection.itemDetails?.pricingUnitString || priceSection.itemCard?.pricingUnitString || '',
      productId: item.productId || '',
      brandName: item.brandName || '',
      onSale: priceSection.trackingProperties?.on_sale_ind?.loyalty === true,
    });
  }

  function findItems(obj, depth = 0) {
    if (depth > 10 || !obj) return;
    if (typeof obj === 'object' && obj !== null) {
      if (obj.name && obj.price && obj.__typename?.includes('Item')) {
        processItem(obj);
      }
      if (Array.isArray(obj)) {
        for (const item of obj) findItems(item, depth + 1);
      } else {
        for (const key of Object.keys(obj)) {
          if (['items', 'nodes', 'products', 'data', 'placements', 'modules',
               'banners', 'contentItems', 'sectionItems', 'featuredProducts'].includes(key)) {
            findItems(obj[key], depth + 1);
          }
          if (key === 'data' && depth === 0) findItems(obj[key], depth + 1);
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

async function pushToPi(prices, label) {
  if (prices.length === 0) return 0;
  let imported = 0;
  const BATCH_SIZE = 200;
  for (let i = 0; i < prices.length; i += BATCH_SIZE) {
    const batch = prices.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(`${PI_API}/api/prices/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: batch }),
      });
      if (res.ok) {
        const result = await res.json();
        imported += result.imported || 0;
      } else {
        console.log(`  [${label}] Batch error: HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`  [${label}] Batch error: ${err.message}`);
    }
  }
  return imported;
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

  console.log('=== OpenClaw Catalog Scraper (Remaining Stores) ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Stores: ${storesToScrape.map(s => s.name).join(', ')}`);
  console.log(`Pi API: ${PI_API}`);
  console.log(`Flush interval: every ${FLUSH_EVERY} products`);

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

  // Block heavy assets
  await context.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot,mp4,webm}', route => route.abort());

  let grandTotal = 0;
  let grandImported = 0;

  for (const store of storesToScrape) {
    console.log(`\n========== ${store.name} (${store.slug}) ==========`);
    const sourceId = `${store.slug}-instacart`;
    const seenProducts = new Map();
    let unflushed = []; // products not yet pushed to Pi
    let storeImported = 0;

    const page = await context.newPage();

    // Flush helper - converts raw products to price records and pushes
    async function flushIfNeeded(force = false) {
      if (unflushed.length < FLUSH_EVERY && !force) return;
      if (unflushed.length === 0) return;

      const prices = unflushed.map(p => ({
        sourceId,
        rawProductName: p.name,
        priceCents: adjustPrice(p.priceCents, store.markupPct),
        priceUnit: detectUnit(p.name, p.size, p.perUnit),
        packageSize: p.size || null,
        priceType: p.onSale ? 'sale' : 'regular',
        pricingTier: store.tier,
        confidence: 'instacart_catalog',
        instacartMarkupPct: store.markupPct,
      }));

      const count = await pushToPi(prices, store.name);
      storeImported += count;
      console.log(`  >> Flushed ${prices.length} to Pi (+${count} imported, ${storeImported} store total)`);
      unflushed = [];
    }

    // Intercept GraphQL responses
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('graphql')) return;
      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const body = await response.json();
        const products = extractProductsFromAPI(body);
        let newCount = 0;
        for (const p of products) {
          const key = p.productId || p.name;
          if (!seenProducts.has(key)) {
            seenProducts.set(key, p);
            unflushed.push(p);
            newCount++;
          }
        }
        if (newCount > 0) {
          process.stdout.write(`  [API] +${newCount} new (${seenProducts.size} total)\n`);
        }
      } catch (e) {}
    });

    // Phase 1: Browse categories
    console.log(`\n  Phase 1: ${CATEGORIES.length} categories...`);
    for (let ci = 0; ci < CATEGORIES.length; ci++) {
      const cat = CATEGORIES[ci];
      const url = `${INSTACART_BASE}/store/${store.slug}/collections/${cat}`;
      process.stdout.write(`  [${ci+1}/${CATEGORIES.length} ${cat}] `);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2500);
        for (let i = 0; i < 15; i++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(600);
        }
        console.log(`(${seenProducts.size} total)`);
      } catch (err) {
        console.log(`timeout (${seenProducts.size} total)`);
      }

      await page.waitForTimeout(500);

      // Flush periodically
      await flushIfNeeded();
    }

    // Phase 2: Targeted searches
    console.log(`\n  Phase 2: ${SEARCH_TERMS.length} searches...`);
    for (let i = 0; i < SEARCH_TERMS.length; i++) {
      const term = SEARCH_TERMS[i];
      const url = `${INSTACART_BASE}/store/${store.slug}/search/${encodeURIComponent(term)}`;

      if (i % 20 === 0) {
        console.log(`  [search ${i+1}/${SEARCH_TERMS.length}] "${term}" (${seenProducts.size} total)`);
      }

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await page.waitForTimeout(2000);
        for (let s = 0; s < 4; s++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(500);
        }
      } catch (e) {}

      await page.waitForTimeout(500);

      // Flush periodically
      if (i % 20 === 0) await flushIfNeeded();
    }

    await page.close();

    // Final flush for this store
    await flushIfNeeded(true);

    grandTotal += seenProducts.size;
    grandImported += storeImported;
    console.log(`\n  ${store.name} DONE: ${seenProducts.size} products, ${storeImported} imported`);
    console.log(`  Running total: ${grandTotal} products, ${grandImported} imported`);

    try {
      const stats = await (await fetch(`${PI_API}/api/stats`)).json();
      console.log(`  Pi: ${stats.currentPrices} prices, ${stats.canonicalIngredients} ingredients`);
    } catch (e) {}
  }

  await browser.close();
  console.log('\n=== ALL STORES DONE ===');
  console.log(`Total scraped: ${grandTotal}`);
  console.log(`Total imported: ${grandImported}`);
  console.log(`Time: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
