/**
 * OpenClaw - Target Redsky API Scraper
 *
 * Uses Target's public Redsky API to pull full grocery catalog with real-time pricing.
 * No auth required. HTTP-only (works on Pi without Puppeteer).
 *
 * The `page` parameter is required (Target's GraphQL schema mandates it).
 * Prices come as dollar amounts in `current_retail` / `reg_retail`.
 * Unit prices in `formatted_unit_price` with suffix like "/lb".
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch, sleep } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings } from '../lib/normalize-rules.mjs';

// Target store near Haverhill, MA (Methuen Target)
const TARGET_STORE_ID = '1290';
const SOURCE_ID = 'target-methuen-ma';

const REDSKY_BASE = 'https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2';
const REDSKY_KEY = '9f36aeafbe60771e321a7cc95a78140772ab3e96';
const VISITOR_ID = 'openclaw-price-intel';
const PAGE_SIZE = 24;

// Comprehensive grocery search terms
const GROCERY_SEARCHES = [
  // Proteins
  'chicken breast', 'chicken thigh', 'chicken wings', 'whole chicken',
  'ground beef', 'ground turkey', 'steak', 'beef roast', 'beef stew',
  'pork chop', 'pork tenderloin', 'bacon', 'sausage', 'ham',
  'salmon', 'shrimp', 'tilapia', 'cod', 'tuna', 'crab',
  'tofu', 'eggs', 'hot dog',

  // Dairy
  'milk gallon', 'butter', 'cheddar cheese', 'mozzarella',
  'cream cheese', 'sour cream', 'heavy cream', 'yogurt', 'greek yogurt',
  'parmesan', 'cottage cheese', 'half and half',
  'oat milk', 'almond milk',

  // Produce
  'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'grape',
  'avocado', 'lemon', 'lime', 'mango', 'pineapple', 'watermelon',
  'tomato', 'potato', 'onion', 'garlic', 'bell pepper', 'mushroom',
  'lettuce', 'spinach', 'broccoli', 'carrot', 'celery', 'cucumber',
  'corn', 'green bean', 'asparagus', 'zucchini', 'sweet potato',
  'kale', 'cauliflower', 'cabbage',

  // Pantry
  'rice', 'pasta', 'spaghetti', 'penne', 'bread',
  'flour', 'sugar', 'brown sugar', 'powdered sugar',
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
  'canned tomato', 'tomato sauce', 'tomato paste',
  'chicken broth', 'beef broth', 'vegetable broth',
  'black beans', 'kidney beans', 'pinto beans', 'chickpeas', 'lentils',
  'peanut butter', 'honey', 'maple syrup', 'jam jelly',
  'vinegar', 'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayonnaise',
  'salt', 'black pepper', 'garlic powder', 'onion powder', 'paprika',
  'cumin', 'chili powder', 'oregano', 'basil', 'thyme', 'cinnamon',
  'baking powder', 'baking soda', 'vanilla extract', 'yeast',
  'cornstarch', 'breadcrumbs', 'panko',
  'tortilla', 'taco', 'cereal', 'oatmeal', 'granola',
  'coconut milk', 'evaporated milk', 'condensed milk',
  'salad dressing', 'worcestershire', 'teriyaki', 'bbq sauce',

  // Frozen
  'frozen vegetable', 'frozen fruit', 'frozen chicken',
  'frozen shrimp', 'frozen fish', 'ice cream',

  // Beverages
  'orange juice', 'apple juice', 'coffee', 'tea',

  // Baking & nuts
  'chocolate chips', 'cocoa powder', 'almonds', 'walnuts', 'pecans',
  'cashews', 'peanuts', 'raisins', 'dried cranberry',
  'cake mix', 'brownie mix',

  // Canned goods
  'canned corn', 'canned green bean', 'canned soup', 'canned tuna',
  'canned chicken', 'canned salmon',
];

const stats = { searched: 0, products: 0, stored: 0, skipped: 0, errors: 0 };

async function searchTarget(keyword, pageOffset = 0) {
  // The `page` param is REQUIRED by Target's GraphQL schema
  const pageParam = `/s/${keyword}`;

  const params = new URLSearchParams({
    key: REDSKY_KEY,
    channel: 'WEB',
    keyword,
    count: String(PAGE_SIZE),
    offset: String(pageOffset * PAGE_SIZE),
    pricing_store_id: TARGET_STORE_ID,
    store_ids: TARGET_STORE_ID,
    visitor_id: VISITOR_ID,
    default_purchasability_filter: 'true',
    include_sponsored: 'false',
    page: pageParam,
  });

  const url = `${REDSKY_BASE}?${params}`;

  try {
    const res = await httpFetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    return await res.json();
  } catch (err) {
    if (err.message?.includes('429')) {
      console.log('  [rate-limited] Waiting 30s...');
      await sleep(30000);
      try {
        const res = await httpFetch(url, { headers: { 'Accept': 'application/json' } });
        return await res.json();
      } catch {
        stats.errors++;
        return null;
      }
    }
    console.error(`  [error] Search "${keyword}" p${pageOffset}: ${err.message}`);
    stats.errors++;
    return null;
  }
}

function extractProducts(data) {
  const products = [];
  try {
    const results = data?.data?.search?.products || [];
    for (const item of results) {
      const rawName = item?.item?.product_description?.title;
      if (!rawName) continue;

      // Decode HTML entities
      const name = rawName.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      const price = item?.price;
      if (!price) continue;

      // Target returns prices as dollar amounts (e.g., 2.69)
      const currentRetail = price.current_retail || price.reg_retail;
      if (!currentRetail || currentRetail <= 0 || currentRetail > 500) continue;

      const priceCents = Math.round(currentRetail * 100);

      // Parse unit price and unit
      let priceUnit = 'each';
      let standardUnit = 'each';
      let pricePerStdUnit = priceCents;

      const unitSuffix = price.formatted_unit_price_suffix || '';
      const unitPrice = price.formatted_unit_price;

      if (unitSuffix.includes('/lb')) {
        priceUnit = 'lb';
        standardUnit = 'lb';
        // formatted_unit_price is like "$2.69"
        if (unitPrice) {
          const m = String(unitPrice).match(/\$?([\d.]+)/);
          if (m) pricePerStdUnit = Math.round(parseFloat(m[1]) * 100);
        }
      } else if (unitSuffix.includes('/oz')) {
        priceUnit = 'oz';
        standardUnit = 'oz';
        if (unitPrice) {
          const m = String(unitPrice).match(/\$?([\d.]+)/);
          if (m) pricePerStdUnit = Math.round(parseFloat(m[1]) * 100);
        }
      }

      // Extract package size from name
      const weightMatch = name.match(/([\d.]+)\s*(oz|lb|fl\s*oz|gal|qt|pt|ct|count|pack|lbs)/i);
      const packageSize = weightMatch ? `${weightMatch[1]} ${weightMatch[2]}` : null;

      products.push({ name: name.trim(), priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize });
    }
  } catch (err) {
    console.error(`  [extract] Error: ${err.message}`);
  }
  return products;
}

// Composite/prepared products that should NOT map to raw ingredients
const COMPOSITE_PATTERNS = [
  /\bsoup\b/i, /\bpizza\b/i, /\bdinner\b/i, /\bmeal\b/i, /\bentr[eé]e\b/i,
  /\bburrito\b/i, /\btaco kit\b/i, /\bsamosa\b/i, /\begg roll\b/i,
  /\bprotein shake\b/i, /\bprotein bar\b/i, /\bprotein meal\b/i,
  /\bgranola\b/i, /\bcereal\b/i, /\boatmeal\b/i, /\boats\b/i,
  /\bpasta sauce\b/i, /\bsalsa\b/i, /\bmarinade\b/i, /\bdressing\b/i,
  /\bsnack\b/i, /\bchip[s]?\b/i, /\bcracker\b/i, /\bcookie\b/i,
  /\bcake\b/i, /\bbrownie\b/i, /\bmuffin\b/i, /\bpastry\b/i,
  /\bpierog/i, /\bravioli\b/i, /\btortellini\b/i, /\bgnocchi\b/i,
  /\bnugget\b/i, /\bpatties\b/i, /\bfrankfurt/i, /\bfranks\b/i,
  /\blunch meat\b/i, /\bdeli\s+(fresh|meat)/i, /\bsliced\b.*\bmeat\b/i,
  /\bseasoning\s+mix\b/i, /\bspice\s+blend\b/i,
  /\bready.to.(eat|drink)\b/i, /\bhuel\b/i, /\bsoylent\b/i,
  /\bice cream\b/i, /\bgelato\b/i, /\bsorbet\b/i, /\bpopsicle\b/i,
  /\bcouscous\b/i, /\bnoodle bowl\b/i, /\bstir fry kit\b/i,
  /\bwrap[s]?\b.*\b(bacon|turkey|chicken)\b/i,
  /\b(bacon|turkey|chicken)\b.*\bwrap[s]?\b/i,
  // Frozen prepared meals
  /\bfrozen\b.*\b(chicken|beef|pork|turkey|shrimp)\b.*\b(with|&)\b/i,
  /\b(chicken|beef|pork)\b.*\b(with|&)\b.*\b(rice|pasta|broccoli|vegetable)\b/i,
  /\bcaf[eé]\s+steamers?\b/i, /\bhealthy choice\b/i, /\bmarie callender/i,
  /\bbanquet\b/i, /\bstouffer/i, /\blean cuisine\b/i,
  /\bpopcorn chicken\b/i, /\bboneless.*bites\b/i,
  /\bhot wings?\b/i, /\bbuffalo.*chicken\b/i,
  /\bchicken parm/i, /\bchicken marsala\b/i, /\bchicken tikka\b/i,
  /\borange chicken\b/i, /\bsesame chicken\b/i, /\bteriyaki chicken\b/i,
  /\bbutter chicken\b/i, /\bcilantro lime chicken\b/i,
  /\bham\b/i, /\bpepperoni\b/i, /\bsalami\b/i, /\bbologna\b/i,
  /\bbeef sticks?\b/i, /\bbeef jerky\b/i, /\bslim jim\b/i,
  /\bhard.cooked egg/i, /\bdeviled egg/i,
  /\bbone broth\b/i,
  /\bfettucin/i, /\bpesto pasta\b/i, /\bcavattappi\b/i,
  /\bmashed potato\b/i, /\bpotato bowl\b/i,
  /\boven roasted\b/i, /\bhoney roasted\b/i, /\brotisserie\b/i,
  /\bultra thin\b/i, /\bthin sliced\b/i,
  /\bapplegate\b/i, /\bhillshire\b/i, /\boscar mayer\b/i, /\bboar.s head\b/i,
  /\bjohnsonville\b/i, /\btyson any.tizer/i,
  /\binnovasian\b/i, /\bkevin.s\b/i, /\bdeep indian\b/i,
];

function isCompositeProduct(name) {
  const lower = name.toLowerCase();
  // Products priced per lb are almost always raw ingredients
  if (/price per lb/i.test(name)) return false;
  // "Fresh" at the start usually means raw produce/meat
  if (/^fresh\s+(usda|all natural|boneless|organic)/i.test(name)) return false;
  return COMPOSITE_PATTERNS.some(p => p.test(lower));
}

function processProduct(db, product) {
  const { name, priceCents, priceUnit, pricePerStdUnit, standardUnit, packageSize } = product;

  if (!isFoodItem(name)) {
    stats.skipped++;
    return;
  }

  // Skip composite/prepared products that would map incorrectly to raw ingredients
  if (isCompositeProduct(name)) {
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
    confidence: 'api_direct',
    sourceUrl: `https://www.target.com/s?searchTerm=${encodeURIComponent(name)}`,
    inStock: true,
    imageUrl: null,
    brand: null,
    aisleCat: null,
  });
}

async function main() {
  console.log('=== OpenClaw Target Redsky Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Store: Target Methuen, MA (#${TARGET_STORE_ID})`);

  const db = getDb();
  loadCachedMappings(db);

  // Register source
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (
      source_id, name, type, chain_id, city, state, zip, website,
      scrape_method, has_online_pricing, pricing_tier, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(SOURCE_ID, 'Target (Methuen, MA)', 'retail_chain', 'target', 'Methuen', 'MA', '01844',
    'https://www.target.com', 'api_direct', 1, 'retail', 'active',
    'Full grocery catalog via Redsky API. No auth required.', now, now);

  const seen = new Set();

  for (let i = 0; i < GROCERY_SEARCHES.length; i++) {
    const keyword = GROCERY_SEARCHES[i];
    stats.searched++;

    let pageOffset = 0;
    let termTotal = 0;

    while (pageOffset < 5) {
      const data = await searchTarget(keyword, pageOffset);
      if (!data) break;

      const products = extractProducts(data);
      if (products.length === 0) break;

      for (const p of products) {
        const key = `${p.name}:${p.priceCents}`;
        if (seen.has(key)) continue;
        seen.add(key);
        processProduct(db, p);
        termTotal++;
        stats.products++;
      }

      if (products.length < PAGE_SIZE) break;
      pageOffset++;
      await sleep(2000 + Math.random() * 2000);
    }

    if (i % 15 === 0) {
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`  [${i}/${GROCERY_SEARCHES.length}] (${elapsed}min) "${keyword}" | new=${termTotal} | total stored=${stats.stored}`);
    }

    await sleep(1500 + Math.random() * 1500);
  }

  db.prepare('UPDATE source_registry SET last_scraped_at = ? WHERE source_id = ?')
    .run(new Date().toISOString(), SOURCE_ID);

  console.log('\n=== Target Scraper Results ===');
  console.log(`  Searches: ${stats.searched}`);
  console.log(`  Products found: ${stats.products}`);
  console.log(`  Stored: ${stats.stored}`);
  console.log(`  Skipped (non-food/no match): ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`=== Done (${new Date().toISOString()}) ===`);
}

const startTime = Date.now();
main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
