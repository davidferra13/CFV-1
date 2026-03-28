/**
 * OpenClaw - Flipp VACUUM Scraper
 * Exhaustively scrapes EVERY food item from EVERY grocery store in Haverhill, MA.
 *
 * Strategy: Search every letter of the alphabet + hundreds of food terms + broad
 * category terms, paginate through ALL results, and store EVERYTHING that looks
 * like food. Items without normalization rules are stored with raw names.
 *
 * This is a data vacuum. We want thousands of prices, not hundreds.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { httpFetch } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const POSTAL_CODE = '01835'; // Haverhill, MA
const FLIPP_API_BASE = 'https://backflipp.wishabi.com/flipp';

// ALL grocery/food merchants in our area
const FLIPP_STORES = [
  // Primary grocery stores
  { merchantId: 5814, sourceId: 'market-basket-flipp', name: 'Market Basket', chain: 'market-basket', tier: 'retail' },
  { merchantId: 3533, sourceId: 'demoulas-mb-flipp', name: 'Demoulas Market Basket', chain: 'market-basket', tier: 'retail' },
  { merchantId: 2454, sourceId: 'shaws-flipp', name: "Shaw's", chain: 'shaws', tier: 'retail' },
  { merchantId: 2393, sourceId: 'stop-shop-flipp', name: 'Stop & Shop', chain: 'stop-and-shop', tier: 'retail' },
  { merchantId: 2353, sourceId: 'aldi-flipp', name: 'ALDI', chain: 'aldi', tier: 'retail' },
  { merchantId: 2483, sourceId: 'bigy-flipp', name: 'Big Y', chain: 'big-y', tier: 'retail' },
  { merchantId: 2527, sourceId: 'wegmans-flipp', name: "Wegman's", chain: 'wegmans', tier: 'retail' },
  { merchantId: 3871, sourceId: 'mckinnons-flipp', name: "McKinnon's Supermarkets", chain: 'mckinnons', tier: 'retail' },

  // Big box stores with groceries
  { merchantId: 2175, sourceId: 'walmart-flipp', name: 'Walmart', chain: 'walmart', tier: 'retail' },
  { merchantId: 2040, sourceId: 'target-flipp', name: 'Target', chain: 'target', tier: 'retail' },

  // Wholesale / club stores
  { merchantId: 2519, sourceId: 'costco-flipp', name: 'Costco', chain: 'costco', tier: 'wholesale' },
  { merchantId: 3341, sourceId: 'sams-club-flipp', name: "Sam's Club", chain: 'sams-club', tier: 'wholesale' },
  { merchantId: 4440, sourceId: 'restaurant-depot-flipp', name: 'Restaurant Depot', chain: 'restaurant-depot', tier: 'wholesale' },

  // Pharmacy/convenience with food
  { merchantId: 2264, sourceId: 'cvs-flipp', name: 'CVS Pharmacy', chain: 'cvs', tier: 'retail' },
  { merchantId: 2460, sourceId: 'walgreens-flipp', name: 'Walgreens', chain: 'walgreens', tier: 'retail' },

  // Discount stores with food
  { merchantId: 2150, sourceId: 'family-dollar-flipp', name: 'Family Dollar', chain: 'family-dollar', tier: 'retail' },
  { merchantId: 2063, sourceId: 'dollar-general-flipp', name: 'Dollar General', chain: 'dollar-general', tier: 'retail' },
  { merchantId: 3056, sourceId: 'ocean-state-flipp', name: 'Ocean State Job Lot', chain: 'ocean-state', tier: 'retail' },
];

const STORE_BY_MERCHANT = new Map(FLIPP_STORES.map(s => [s.merchantId, s]));

// EXHAUSTIVE search terms - every food category, subcategory, and common item
const FOOD_SEARCHES = [
  // Alphabet crawl - catches everything
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',

  // Empty/broad searches
  '', 'food', 'grocery', 'fresh', 'frozen', 'organic', 'natural', 'sale', 'buy',
  'meat', 'produce', 'dairy', 'deli', 'bakery', 'seafood', 'beverages', 'snacks',

  // Proteins
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'veal', 'duck', 'bison',
  'salmon', 'shrimp', 'cod', 'tuna', 'lobster', 'crab', 'scallop', 'clam',
  'tilapia', 'haddock', 'halibut', 'swordfish', 'trout', 'catfish', 'mahi',
  'ground beef', 'ground turkey', 'ground chicken', 'ground pork',
  'steak', 'roast', 'chop', 'tenderloin', 'ribeye', 'sirloin', 'filet',
  'bacon', 'sausage', 'ham', 'hot dog', 'bratwurst', 'pepperoni', 'salami',
  'chicken breast', 'chicken thigh', 'chicken wing', 'drumstick',
  'tofu', 'tempeh', 'seitan', 'beyond meat', 'impossible',

  // Dairy
  'milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg',
  'cheddar', 'mozzarella', 'parmesan', 'swiss', 'provolone', 'gouda',
  'cream cheese', 'cottage cheese', 'ricotta', 'brie', 'feta',
  'sour cream', 'half and half', 'whipping cream', 'heavy cream',
  'almond milk', 'oat milk', 'soy milk',

  // Produce - vegetables
  'tomato', 'potato', 'onion', 'garlic', 'pepper', 'mushroom',
  'carrot', 'celery', 'broccoli', 'cauliflower', 'spinach', 'kale',
  'lettuce', 'cucumber', 'zucchini', 'squash', 'corn', 'asparagus',
  'avocado', 'artichoke', 'eggplant', 'cabbage', 'brussels sprout',
  'green bean', 'pea', 'bean', 'sweet potato', 'beet', 'radish', 'turnip',
  'salad', 'coleslaw', 'herb', 'basil', 'cilantro', 'parsley', 'dill',

  // Produce - fruits
  'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berry',
  'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry',
  'watermelon', 'cantaloupe', 'honeydew', 'melon', 'pineapple', 'mango',
  'peach', 'pear', 'plum', 'nectarine', 'cherry', 'apricot', 'kiwi',
  'coconut', 'pomegranate', 'fig', 'date', 'grapefruit', 'tangerine',

  // Bakery & grains
  'bread', 'roll', 'bun', 'bagel', 'muffin', 'croissant', 'tortilla',
  'flour', 'rice', 'pasta', 'noodle', 'cereal', 'oatmeal', 'granola',
  'cake', 'pie', 'cookie', 'cracker', 'chip', 'pretzel', 'popcorn',

  // Pantry staples
  'oil', 'olive oil', 'vinegar', 'sugar', 'salt', 'pepper', 'honey',
  'maple syrup', 'vanilla', 'baking', 'yeast', 'baking powder',
  'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayo', 'mayonnaise',
  'salsa', 'bbq sauce', 'ranch', 'dressing', 'marinade',
  'peanut butter', 'jelly', 'jam', 'nutella', 'spread',
  'canned', 'tomato sauce', 'tomato paste', 'broth', 'stock', 'soup',
  'beans', 'chickpea', 'lentil', 'coconut milk',

  // Frozen
  'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen pizza', 'frozen dinner',
  'frozen chicken', 'frozen fish', 'frozen shrimp', 'frozen',
  'waffle', 'pancake',

  // Beverages
  'coffee', 'tea', 'juice', 'water', 'soda', 'seltzer', 'kombucha',
  'wine', 'beer', 'energy drink', 'protein',

  // Snacks & misc
  'nuts', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'peanut',
  'chocolate', 'candy', 'dried fruit', 'trail mix', 'granola bar',
  'hummus', 'guacamole', 'dip',

  // Spices
  'spice', 'seasoning', 'cumin', 'paprika', 'cinnamon', 'oregano', 'thyme',
  'rosemary', 'ginger', 'turmeric', 'chili', 'cayenne', 'nutmeg',

  // Condiments & sauces
  'sauce', 'pasta sauce', 'alfredo', 'pesto', 'gravy',
  'worcestershire', 'teriyaki', 'sriracha',
];

function ensureSourceExists(db, store) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    store.sourceId, `${store.name} (via Flipp)`, 'flipp_api', store.chain, 'MA',
    'flipp_api', `${FLIPP_API_BASE}/items/search?merchant_id=${store.merchantId}`,
    1, store.tier, 'active', `https://flipp.com/search?q=&merchant_id=${store.merchantId}`,
    `Prices from Flipp digital circular API.`
  );
}

/**
 * Ensure a canonical ingredient exists for an unmatched item.
 * Creates a new entry using the raw name if it doesn't match existing rules.
 */
function ensureRawIngredient(db, rawName) {
  // Generate a slug ID from the raw name
  const id = rawName.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);

  if (!id) return null;

  // Try to insert (IGNORE if exists)
  db.prepare(`
    INSERT OR IGNORE INTO canonical_ingredients (ingredient_id, name, category, standard_unit)
    VALUES (?, ?, ?, ?)
  `).run(id, rawName.substring(0, 100), 'uncategorized', 'each');

  return id;
}

/**
 * Search Flipp with pagination to get ALL results for a query.
 */
async function searchFlippExhaustive(query) {
  const allItems = [];
  let offset = 0;
  const limit = 200; // Max per request

  // Fetch up to 3 pages per query (600 items max)
  for (let page = 0; page < 3; page++) {
    const url = `${FLIPP_API_BASE}/items/search?locale=en-us&postal_code=${POSTAL_CODE}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;

    try {
      const res = await httpFetch(url);
      const data = await res.json();

      const items = data.items || [];
      if (items.length === 0) break; // No more results

      for (const item of items) {
        if (!item.name || !item.current_price) continue;
        if (item.current_price <= 0) continue;

        // Only include merchants we track
        const store = STORE_BY_MERCHANT.get(item.merchant_id);
        if (!store) continue;

        allItems.push({
          name: item.name,
          priceCents: Math.round(item.current_price * 100),
          description: item.description || '',
          priceType: item.valid_from ? 'sale' : 'regular',
          validFrom: item.valid_from || null,
          validTo: item.valid_to || null,
          confidence: 'flyer_scrape',
          merchantId: item.merchant_id,
          sourceId: store.sourceId,
          store: store,
        });
      }

      if (items.length < limit) break; // Last page
      offset += limit;
    } catch (err) {
      console.error(`  [Flipp] Page ${page} failed for "${query}": ${err.message}`);
      break;
    }
  }

  return allItems;
}

function detectPackageSize(name, description) {
  const combined = `${name} ${description}`.toLowerCase();
  const lbMatch = combined.match(/(\d+\.?\d*)\s*(?:lbs?\.?|pounds?)\b/);
  if (lbMatch) return { weight: parseFloat(lbMatch[1]), unit: 'lb' };
  const ozMatch = combined.match(/(\d+\.?\d*)\s*(?:oz\.?|ounces?)\b/);
  if (ozMatch) return { weight: parseFloat(ozMatch[1]), unit: 'oz' };
  const galMatch = combined.match(/(\d+\.?\d*)\s*(?:gal\.?|gallons?)\b/);
  if (galMatch) return { weight: parseFloat(galMatch[1]), unit: 'gallon' };
  const ctMatch = combined.match(/(\d+)\s*(?:ct\.?|count|pack)\b/);
  if (ctMatch) return { weight: parseInt(ctMatch[1]), unit: 'count' };
  return null;
}

function detectUnit(name, description) {
  const combined = `${name} ${description}`.toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz')) return 'oz';
  if (combined.includes('/each') || combined.includes('per each')) return 'each';
  if (combined.includes('/doz')) return 'dozen';
  if (combined.includes('/gal')) return 'gallon';
  if (combined.match(/\b(chicken|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|lamb|veal|ground)\b/)) return 'lb';
  if (combined.match(/\b(milk|cream)\b.*\b(gallon|gal)\b/)) return 'gallon';
  if (combined.match(/\b(egg)\b/)) return 'dozen';
  return 'each';
}

function computePerUnitPrice(priceCents, packageSize, baseUnit) {
  if (!packageSize) return { perUnitCents: priceCents, standardUnit: baseUnit, pkgSize: null };
  if (packageSize.unit === 'lb' && baseUnit === 'lb' && packageSize.weight > 1) {
    return { perUnitCents: Math.round(priceCents / packageSize.weight), standardUnit: 'lb', pkgSize: `${packageSize.weight} lb` };
  }
  if (packageSize.unit === 'oz' && baseUnit === 'lb') {
    const lbs = packageSize.weight / 16;
    if (lbs > 0) return { perUnitCents: Math.round(priceCents / lbs), standardUnit: 'lb', pkgSize: `${packageSize.weight} oz` };
  }
  if (packageSize.unit === 'count' && packageSize.weight > 1) {
    return { perUnitCents: Math.round(priceCents / packageSize.weight), standardUnit: 'each', pkgSize: `${packageSize.weight} ct` };
  }
  return { perUnitCents: priceCents, standardUnit: baseUnit, pkgSize: packageSize ? `${packageSize.weight} ${packageSize.unit}` : null };
}

async function main() {
  const chainArgs = process.argv.slice(2);
  const activeStores = chainArgs.length > 0
    ? FLIPP_STORES.filter(s => chainArgs.includes(s.chain))
    : FLIPP_STORES;
  const activeSourceIds = new Set(activeStores.map(s => s.sourceId));

  console.log('=== OpenClaw Flipp VACUUM Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Postal code: ${POSTAL_CODE}`);
  console.log(`Active stores: ${activeStores.length}`);
  console.log(`Search terms: ${FOOD_SEARCHES.length}`);
  console.log(`Mode: EXHAUSTIVE - every item, every store, with pagination`);

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  // Register all sources
  for (const store of activeStores) {
    ensureSourceExists(db, store);
  }

  // Global dedup across ALL searches
  const globalSeen = new Set();

  // Track results per store
  const storeStats = new Map();
  for (const store of activeStores) {
    storeStats.set(store.sourceId, { new: 0, changed: 0, unchanged: 0, skipped: 0, unmatched: 0, total: 0 });
  }

  let totalSearches = 0;
  let totalRawItems = 0;

  for (const query of FOOD_SEARCHES) {
    const items = await searchFlippExhaustive(query);
    totalRawItems += items.length;
    totalSearches++;

    for (const item of items) {
      if (!activeSourceIds.has(item.sourceId)) continue;

      const stats = storeStats.get(item.sourceId);

      // Global dedup by name + merchant + price
      const key = `${item.name}|${item.merchantId}|${item.priceCents}`;
      if (globalSeen.has(key)) continue;
      globalSeen.add(key);

      stats.total++;

      // Filter non-food
      if (!isFoodItem(item.name)) { stats.skipped++; continue; }
      if (item.priceCents <= 0 || item.priceCents > 500000) { stats.skipped++; continue; }

      const unit = detectUnit(item.name, item.description);
      const pkgSize = detectPackageSize(item.name, item.description);
      const { perUnitCents, standardUnit, pkgSize: pkgLabel } = computePerUnitPrice(item.priceCents, pkgSize, unit);

      // Try rule-based normalization first
      let normalized = normalizeByRules(item.name, cachedMappings);
      let ingredientId;

      if (normalized) {
        ingredientId = normalized.ingredientId;
        saveMapping(db, item.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);
      } else {
        // NO MATCH? Store it anyway with a generated ingredient ID.
        // This is the key change - we don't throw away data.
        ingredientId = ensureRawIngredient(db, item.name);
        if (!ingredientId) { stats.skipped++; continue; }
        stats.unmatched++;
      }

      const result = upsertPrice(db, {
        sourceId: item.sourceId,
        canonicalIngredientId: ingredientId,
        variantId: normalized?.variantId || null,
        rawProductName: item.name,
        priceCents: perUnitCents,
        priceUnit: standardUnit,
        pricePerStandardUnitCents: perUnitCents,
        standardUnit: standardUnit,
        packageSize: pkgLabel,
        priceType: item.priceType,
        saleDates: { start: item.validFrom, end: item.validTo },
        pricingTier: item.store.tier,
        confidence: item.confidence,
        sourceUrl: `https://flipp.com/search?q=${encodeURIComponent(item.name)}&merchant_id=${item.merchantId}`,
      });

      if (result === 'new') stats.new++;
      else if (result === 'changed') stats.changed++;
      else stats.unchanged++;
    }

    // Progress logging every 25 searches
    if (totalSearches % 25 === 0) {
      console.log(`  Progress: ${totalSearches}/${FOOD_SEARCHES.length} searches, ${globalSeen.size} unique items found`);
    }

    // Light rate limiting
    await new Promise(r => setTimeout(r, 250));
  }

  // Update timestamps and print results
  console.log(`\n=== Results by Store ===`);
  let grandNew = 0, grandChanged = 0, grandUnchanged = 0, grandSkipped = 0, grandUnmatched = 0;

  for (const store of activeStores) {
    const stats = storeStats.get(store.sourceId);
    if (stats.total === 0) continue; // Skip stores with no data

    db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(store.sourceId);
    const stored = stats.new + stats.changed + stats.unchanged;
    console.log(`  ${store.name}: ${stored} stored (${stats.new} new, ${stats.changed} changed, ${stats.unchanged} unchanged) | ${stats.skipped} filtered | ${stats.unmatched} auto-categorized | ${stats.total} total`);
    grandNew += stats.new;
    grandChanged += stats.changed;
    grandUnchanged += stats.unchanged;
    grandSkipped += stats.skipped;
    grandUnmatched += stats.unmatched;
  }

  const totalStored = grandNew + grandChanged + grandUnchanged;
  console.log(`\n=== VACUUM Complete ===`);
  console.log(`Searches: ${totalSearches}`);
  console.log(`Raw items found: ${totalRawItems}`);
  console.log(`Unique items after dedup: ${globalSeen.size}`);
  console.log(`Stored: ${totalStored} (${grandNew} new, ${grandChanged} changed, ${grandUnchanged} unchanged)`);
  console.log(`Filtered (non-food): ${grandSkipped}`);
  console.log(`Auto-categorized (no rule match): ${grandUnmatched}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
