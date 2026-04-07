/**
 * OpenClaw - Kroger Official API Scraper
 *
 * Uses Kroger's free developer API (developer.kroger.com) to pull
 * real in-store prices for ALL Kroger-family banners:
 *   Kroger, Fry's, King Soopers, Smith's, Dillons, Mariano's,
 *   Pick 'n Save, Food 4 Less, Fred Meyer, QFC, Harris Teeter,
 *   Ralphs, City Market, Baker's, Ruler Foods, Gerbes, Jay C, Pay Less
 *
 * This is a Tier 1 data source: official API, no browser, no captcha,
 * no Instacart markup. Real shelf prices.
 *
 * Setup:
 *   1. Register at https://developer.kroger.com/
 *   2. Create an app (free tier: 5,000 calls/day, 10 calls/second)
 *   3. Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in the Pi's .env
 *
 * Usage:
 *   node services/scraper-kroger-api.mjs                    # all banners
 *   node services/scraper-kroger-api.mjs --chain kroger     # specific banner
 *   node services/scraper-kroger-api.mjs --zip 29201        # specific area
 *
 * API docs: https://developer.kroger.com/documentation/public/getting-started/api-reference
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = join(__dirname, '..', 'data', 'kroger-token.json');

// Environment
const CLIENT_ID = process.env.KROGER_CLIENT_ID;
const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;
// Certification environment (api-ce) is what our app is approved for
const API_BASE = process.env.KROGER_API_BASE || 'https://api-ce.kroger.com/v1';

// Kroger banner chain IDs (used in location search)
// Each "chain" in the Kroger API is identified by a division or banner name
const KROGER_BANNERS = [
  { slug: 'kroger', name: 'Kroger', chainSlug: 'kroger' },
  { slug: 'frys', name: "Fry's", chainSlug: 'frys_food' },
  { slug: 'kingsoopers', name: 'King Soopers', chainSlug: 'king_soopers' },
  { slug: 'smiths', name: "Smith's", chainSlug: 'smiths' },
  { slug: 'dillons', name: 'Dillons', chainSlug: 'dillons' },
  { slug: 'ralphs', name: 'Ralphs', chainSlug: 'ralphs' },
  { slug: 'fredmeyer', name: 'Fred Meyer', chainSlug: 'fred_meyer' },
  { slug: 'qfc', name: 'QFC', chainSlug: 'qfc' },
  { slug: 'harristeeter', name: 'Harris Teeter', chainSlug: 'harris_teeter' },
  { slug: 'marianos', name: "Mariano's", chainSlug: 'marianos' },
  { slug: 'picknsave', name: "Pick 'n Save", chainSlug: 'pick_n_save' },
  { slug: 'food4less', name: 'Food 4 Less', chainSlug: 'food_4_less' },
  { slug: 'citymarket', name: 'City Market', chainSlug: 'city_market' },
];

// Search terms for comprehensive food coverage
const SEARCH_TERMS = [
  // Proteins - poultry
  'chicken breast', 'chicken thigh', 'chicken wings', 'chicken drumstick',
  'whole chicken', 'ground chicken', 'ground turkey', 'turkey breast',
  'duck breast', 'cornish hen',
  // Proteins - beef
  'ground beef', 'ribeye steak', 'sirloin steak', 'strip steak',
  'beef tenderloin', 'chuck roast', 'beef stew meat', 'short ribs',
  'flank steak', 'brisket', 'skirt steak', 'ground beef 90',
  // Proteins - pork
  'pork chop', 'pork loin', 'pork tenderloin', 'pork shoulder',
  'bacon', 'sausage', 'ham', 'pork belly', 'bratwurst',
  // Proteins - seafood
  'salmon fillet', 'shrimp', 'cod fillet', 'tilapia', 'tuna steak',
  'crab', 'lobster tail', 'scallops', 'mussels', 'clams',
  'swordfish', 'halibut', 'catfish', 'haddock', 'mahi mahi',
  'canned tuna', 'canned salmon', 'smoked salmon',
  // Proteins - other
  'eggs', 'tofu', 'tempeh', 'lamb chop', 'lamb rack', 'veal',
  // Dairy
  'whole milk', '2 percent milk', 'skim milk', 'half and half',
  'heavy cream', 'sour cream', 'buttermilk',
  'butter', 'unsalted butter', 'margarine',
  'cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese',
  'cream cheese', 'goat cheese', 'feta', 'provolone', 'brie',
  'cottage cheese', 'ricotta',
  'yogurt', 'greek yogurt', 'oat milk', 'almond milk',
  // Produce - fruit
  'apple', 'banana', 'orange', 'lemon', 'lime', 'grapefruit',
  'strawberry', 'blueberry', 'raspberry', 'blackberry', 'grape',
  'avocado', 'mango', 'pineapple', 'peach', 'pear', 'plum',
  'watermelon', 'cantaloupe', 'honeydew', 'kiwi', 'coconut',
  'cherry', 'pomegranate', 'fig', 'date', 'cranberry',
  // Produce - vegetable
  'potato', 'sweet potato', 'onion', 'yellow onion', 'red onion',
  'garlic', 'shallot', 'leek', 'scallion',
  'tomato', 'roma tomato', 'cherry tomato', 'grape tomato',
  'bell pepper', 'jalapeno', 'serrano', 'habanero', 'poblano',
  'mushroom', 'portobello', 'shiitake', 'cremini',
  'lettuce', 'romaine', 'spinach', 'arugula', 'kale', 'mixed greens',
  'broccoli', 'cauliflower', 'brussels sprouts', 'cabbage',
  'carrot', 'celery', 'cucumber', 'zucchini', 'squash',
  'corn', 'green bean', 'asparagus', 'artichoke', 'beet',
  'eggplant', 'radish', 'turnip', 'parsnip', 'rutabaga',
  'edamame', 'snap pea', 'snow pea',
  // Fresh herbs
  'basil', 'cilantro', 'parsley', 'rosemary', 'thyme',
  'oregano', 'dill', 'mint', 'sage', 'chive', 'tarragon',
  // Pantry - grains
  'white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'wild rice',
  'pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine',
  'bread', 'sourdough', 'baguette', 'tortilla', 'pita',
  'flour', 'bread flour', 'cake flour', 'cornmeal', 'cornstarch',
  'oats', 'quinoa', 'couscous', 'barley', 'farro',
  // Pantry - baking
  'sugar', 'brown sugar', 'powdered sugar', 'honey', 'maple syrup',
  'baking powder', 'baking soda', 'yeast', 'vanilla extract',
  'cocoa powder', 'chocolate chips', 'condensed milk', 'evaporated milk',
  // Pantry - oils and fats
  'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil',
  'coconut oil', 'sesame oil', 'avocado oil', 'peanut oil',
  // Pantry - canned
  'canned tomato', 'tomato sauce', 'tomato paste', 'crushed tomato',
  'chicken broth', 'beef broth', 'vegetable broth', 'stock',
  'black beans', 'kidney beans', 'chickpeas', 'lentils', 'pinto beans',
  'canned corn', 'canned green beans', 'coconut milk',
  // Pantry - condiments
  'peanut butter', 'almond butter', 'jam', 'jelly',
  'vinegar', 'apple cider vinegar', 'balsamic vinegar', 'rice vinegar',
  'soy sauce', 'fish sauce', 'worcestershire', 'hot sauce',
  'ketchup', 'mustard', 'dijon mustard', 'mayonnaise',
  'salsa', 'sriracha', 'tahini', 'hoisin sauce',
  // Spices
  'salt', 'kosher salt', 'black pepper', 'white pepper',
  'garlic powder', 'onion powder', 'paprika', 'smoked paprika',
  'cumin', 'chili powder', 'cayenne', 'turmeric', 'ginger powder',
  'cinnamon', 'nutmeg', 'cloves', 'allspice', 'cardamom',
  'italian seasoning', 'bay leaves', 'red pepper flakes', 'curry powder',
  // Frozen
  'frozen vegetables', 'frozen fruit', 'frozen shrimp', 'frozen chicken',
  'ice cream', 'frozen pizza', 'frozen fries',
  // Beverages
  'coffee', 'tea', 'orange juice', 'apple juice', 'sparkling water',
];

// Every state where each banner operates, with representative zips.
// Kroger alone is in 35 states. Every state gets coverage.
const BANNER_ZIPS = {
  kroger: [
    '45201','43201','44101', // OH
    '48201','49501',         // MI
    '46201','47901',         // IN
    '60601','62701',         // IL
    '40201','40501',         // KY
    '37201','37901','38101', // TN
    '30301','31401','30901', // GA
    '35201','36101',         // AL
    '39201',                 // MS
    '29201','29401','29601', // SC
    '28202','27601','27101', // NC
    '23219','22901','23451', // VA
    '25301',                 // WV
    '75201','77001','78201','73301','79901', // TX
    '80201','80901',         // CO
    '85001','85701',         // AZ
    '89101','89501',         // NV
    '87101',                 // NM
    '97201','97401',         // OR
    '98101','99201',         // WA
    '90001','94102','92101','95814','93301', // CA
    '72201',                 // AR
    '70112','70801',         // LA
    '63101','64101',         // MO
    '67201','66101',         // KS
  ],
  frys: ['85001','85701'],
  kingsoopers: ['80201','80901'],
  smiths: ['84101','89101','89501','87101','59601','59101','83701','82001'],
  dillons: ['67201','66101'],
  ralphs: ['90001','92101','93301','95814'],
  fredmeyer: ['97201','97401','98101','99201','83701','99501'],
  qfc: ['98101','99201','97201'],
  harristeeter: [
    '29201','29401','29601', // SC
    '28202','27601','27101', // NC
    '23219','22901','23451', // VA
    '20001',                 // DC
    '21201',                 // MD
    '19801',                 // DE
    '30301','31401',         // GA
    '33101','32801',         // FL
  ],
  marianos: ['60601','62701'],
  picknsave: ['53201','53701'],
  food4less: ['90001','92101','60601','46201','44101'],
  citymarket: ['80201','80901'],
};

// ── AUTH ──

async function getAccessToken() {
  // Check cached token
  try {
    if (existsSync(TOKEN_PATH)) {
      const cached = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
      if (Date.now() < cached.expires_at - 60000) {
        return cached.access_token;
      }
    }
  } catch {}

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set.\n' +
      'Register at https://developer.kroger.com/ (free, instant).'
    );
  }

  const authBase = (process.env.KROGER_API_BASE || 'https://api-ce.kroger.com').replace('/v1', '');
  const res = await fetch(`${authBase}/v1/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kroger auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const token = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };

  writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  return token.access_token;
}

// ── LOCATION SEARCH ──

async function findStoresByZip(token, zip, chain) {
  const url = `${API_BASE}/locations?filter.zipCode.near=${zip}&filter.limit=5&filter.chain=${chain || ''}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map(loc => ({
    locationId: loc.locationId,
    name: loc.name || `Store #${loc.locationId}`,
    address: loc.address?.addressLine1 || '',
    city: loc.address?.city || '',
    state: loc.address?.state || '',
    zip: loc.address?.zipCode || zip,
    chain: loc.chain || chain || 'kroger',
  }));
}

// ── PRODUCT SEARCH ──

async function searchProducts(token, locationId, term, limit = 50) {
  const url = `${API_BASE}/products?filter.term=${encodeURIComponent(term)}&filter.locationId=${locationId}&filter.limit=${limit}&filter.fulfillment=instore`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    console.log('[rate-limit] Kroger API rate limited. Waiting 60s...');
    await new Promise(r => setTimeout(r, 60000));
    return [];
  }

  if (!res.ok) return [];
  const data = await res.json();

  return (data.data || []).map(product => {
    const item = product.items?.[0];
    const price = item?.price;
    return {
      upc: product.upc,
      name: product.description || '',
      brand: product.brand || '',
      size: item?.size || '',
      price: price?.regular,
      salePrice: price?.promo,
      pricePer: price?.regularPerUnitEstimate,
      pricePerUnit: price?.regularPerUnitEstimate ? 'lb' : null,
      imageUrl: product.images?.find(i => i.perspective === 'front')?.sizes?.find(s => s.size === 'medium')?.url || null,
      inStock: item?.inventory?.stockLevel !== 'TEMPORARILY_OUT_OF_STOCK',
      fulfillment: item?.fulfillment,
    };
  }).filter(p => p.price && p.price > 0 && p.name);
}

// ── MAIN ──

async function main() {
  console.log('=== OpenClaw Kroger API Scraper ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Parse args
  const args = process.argv.slice(2);
  const chainArg = args.find(a => a.startsWith('--chain='))?.split('=')[1];
  const zipArg = args.find(a => a.startsWith('--zip='))?.split('=')[1];

  let token;
  try {
    token = await getAccessToken();
    console.log('[auth] Token acquired');
  } catch (err) {
    console.error(`[auth] FAILED: ${err.message}`);
    console.error('\nTo set up Kroger API access:');
    console.error('  1. Go to https://developer.kroger.com/');
    console.error('  2. Create a free account and app');
    console.error('  3. Set environment variables:');
    console.error('     export KROGER_CLIENT_ID=your_client_id');
    console.error('     export KROGER_CLIENT_SECRET=your_client_secret');
    process.exit(1);
  }

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  const bannersToScrape = chainArg
    ? KROGER_BANNERS.filter(b => b.slug === chainArg)
    : KROGER_BANNERS;

  let totalStores = 0;
  let totalProducts = 0;
  let totalNew = 0;

  for (const banner of bannersToScrape) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`BANNER: ${banner.name}`);
    console.log(`${'═'.repeat(50)}`);

    const zips = zipArg ? [zipArg] : (BANNER_ZIPS[banner.slug] || ['45201']);

    for (const zip of zips) {
      // Find stores near this zip
      const stores = await findStoresByZip(token, zip, banner.slug);
      if (stores.length === 0) {
        console.log(`  [${zip}] No stores found`);
        continue;
      }

      const store = stores[0]; // Use closest store
      console.log(`  [${zip}] ${store.name} (${store.city}, ${store.state}) - ID: ${store.locationId}`);
      totalStores++;

      // Register source
      const sourceId = `kroger-api-${banner.slug}-${store.state.toLowerCase()}-${zip}`;
      db.prepare(`
        INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, has_online_pricing, pricing_tier, status, notes)
        VALUES (?, ?, 'retail_chain', ?, ?, 'official_api', 1, 'retail', 'active', 'Kroger Official API - real in-store prices, no markup')
      `).run(sourceId, `${banner.name} (${store.city}, ${store.state})`, banner.slug, store.state);

      // Search products
      let storeProducts = 0;
      for (const term of SEARCH_TERMS) {
        try {
          const products = await searchProducts(token, store.locationId, term);

          for (const product of products) {
            if (!isFoodItem(product.name)) continue;
            if (!product.price || product.price <= 0) continue;

            const priceCents = Math.round(product.price * 100);
            const saleCents = product.salePrice ? Math.round(product.salePrice * 100) : null;

            // Normalize
            const normalized = normalizeByRules(product.name, cachedMappings);
            if (normalized) {
              try {
                saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);
              } catch { /* FK constraint, non-blocking */ }
            }

            const result = upsertPrice(db, {
              sourceId,
              canonicalIngredientId: normalized?.ingredientId || null,
              variantId: normalized?.variantId || 'default',
              rawProductName: product.name,
              priceCents,
              priceUnit: product.pricePerUnit || 'each',
              pricePerStandardUnitCents: priceCents,
              standardUnit: product.pricePerUnit || 'each',
              packageSize: product.size || null,
              priceType: saleCents ? 'sale' : 'regular',
              pricingTier: 'retail',
              confidence: 'kroger_api',
              sourceUrl: `https://www.kroger.com/p/${product.upc}`,
              imageUrl: product.imageUrl,
              brand: product.brand,
              aisleCat: null,
              salePriceCents: saleCents,
            });

            if (result === 'new') totalNew++;
            totalProducts++;
            storeProducts++;
          }
        } catch (err) {
          if (err.message?.includes('429')) {
            console.log('  [rate-limit] 60s wait...');
            await new Promise(r => setTimeout(r, 60000));
          }
        }

        // Respect rate limits: 10 calls/second max
        await new Promise(r => setTimeout(r, 150));
      }

      console.log(`    ${storeProducts} products stored`);

      // 2s delay between stores
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Stores: ${totalStores}`);
  console.log(`Products: ${totalProducts} (${totalNew} new)`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
