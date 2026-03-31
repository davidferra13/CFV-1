/**
 * OpenClaw - Kroger API Scraper
 *
 * Uses the Kroger Public Product API to fetch real retail prices
 * from 2,800+ Kroger-family stores across 35 states.
 *
 * Unlike other scrapers, this uses a proper OAuth2 API (no HTML parsing).
 * Kroger family includes: Kroger, Ralphs, Fred Meyer, Harris Teeter,
 * King Soopers, Fry's, Smith's, QFC, Mariano's, Pick 'n Save, and more.
 *
 * Certification environment: api-ce.kroger.com (no prices)
 * Production environment: api.kroger.com (full prices)
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings } from '../lib/normalize-rules.mjs';

// Kroger API credentials (set in environment or .env)
const CLIENT_ID = process.env.KROGER_CLIENT_ID || 'chefflow-bbcccqqv';
const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET || 'MhIBWO5HDADc5eX6Tqaz5Kqs0wL7Jke3kwLDEyDP';

// Use certification endpoint until production access is approved
const API_BASE = process.env.KROGER_API_BASE || 'https://api-ce.kroger.com';

// Target locations: zip codes across different US regions
// Kroger picks the nearest store to each zip
const TARGET_ZIPS = [
  // Midwest (Kroger heartland)
  { zip: '45202', label: 'Cincinnati, OH' },
  { zip: '43215', label: 'Columbus, OH' },
  { zip: '46204', label: 'Indianapolis, IN' },
  { zip: '48226', label: 'Detroit, MI' },
  // South
  { zip: '30303', label: 'Atlanta, GA' },
  { zip: '37203', label: 'Nashville, TN' },
  { zip: '75201', label: 'Dallas, TX' },
  { zip: '77002', label: 'Houston, TX' },
  { zip: '23219', label: 'Richmond, VA' },
  // West
  { zip: '80202', label: 'Denver, CO' },
  { zip: '97201', label: 'Portland, OR' },
  { zip: '98101', label: 'Seattle, WA' },
  { zip: '85004', label: 'Phoenix, AZ' },
  { zip: '89101', label: 'Las Vegas, NV' },
  // Mid-Atlantic
  { zip: '20001', label: 'Washington, DC' },
  { zip: '28202', label: 'Charlotte, NC' },
  { zip: '29401', label: 'Charleston, SC' },
];

// Same search terms used across all scrapers
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
  // Pantry
  'white rice', 'brown rice', 'pasta', 'spaghetti', 'penne',
  'bread', 'flour', 'sugar', 'brown sugar', 'powdered sugar',
  'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
  'canned tomato', 'tomato sauce', 'tomato paste',
  'chicken broth', 'beef broth', 'vegetable broth',
  'black beans', 'kidney beans', 'chickpeas', 'lentils',
  'peanut butter', 'honey', 'maple syrup',
  'vinegar', 'soy sauce', 'hot sauce', 'ketchup', 'mustard', 'mayonnaise',
  'salt', 'black pepper', 'garlic powder', 'onion powder', 'paprika',
  'cumin', 'chili powder', 'oregano', 'basil', 'thyme', 'cinnamon',
  'baking powder', 'baking soda', 'vanilla extract',
  'cornstarch', 'breadcrumbs',
  'tortilla', 'cereal', 'oatmeal',
  // Frozen
  'frozen vegetable', 'frozen fruit', 'frozen chicken', 'frozen shrimp',
  // Beverages
  'orange juice', 'apple juice', 'coffee', 'tea',
  // Baking & nuts
  'chocolate chips', 'cocoa powder', 'almonds', 'walnuts', 'pecans',
];

const stats = { searched: 0, products: 0, stored: 0, skipped: 0, errors: 0, noPrice: 0 };

// --- OAuth2 Token Management ---

let tokenCache = { accessToken: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const res = await fetch(`${API_BASE}/v1/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials&scope=product.compact'
  });

  if (!res.ok) {
    throw new Error('Kroger token failed: ' + res.status + ' ' + (await res.text()));
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
  return tokenCache.accessToken;
}

// --- API Helpers ---

async function searchProducts(term, locationId, limit = 20) {
  const token = await getToken();
  const params = new URLSearchParams({
    'filter.term': term,
    'filter.limit': String(limit),
  });
  if (locationId) params.set('filter.locationId', locationId);

  const res = await fetch(API_BASE + '/v1/products?' + params, {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.log('  Rate limited, waiting 30s...');
      await new Promise(r => setTimeout(r, 30000));
      return searchProducts(term, locationId, limit);
    }
    console.error('  Product search failed: ' + res.status);
    return [];
  }

  const data = await res.json();
  return data.data || [];
}

async function findNearestStore(zip) {
  const token = await getToken();
  const res = await fetch(API_BASE + '/v1/locations?filter.zipCode.near=' + zip + '&filter.limit=1', {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  if (!res.ok) return null;
  const data = await res.json();
  return (data.data && data.data[0]) || null;
}

// --- Price Extraction ---

function extractPrice(item) {
  for (const variant of (item.items || [])) {
    const price = variant.price;
    if (price && price.regular) {
      return {
        priceCents: Math.round(price.regular * 100),
        priceType: price.promo ? 'sale' : 'regular',
        salePriceCents: price.promo ? Math.round(price.promo * 100) : null,
        size: variant.size || null,
      };
    }
  }
  return null;
}

function extractSize(item) {
  for (const variant of (item.items || [])) {
    if (variant.size) return variant.size;
  }
  return null;
}

function extractImage(item) {
  for (const img of (item.images || [])) {
    for (const size of (img.sizes || [])) {
      if (size.url) return size.url;
    }
  }
  return null;
}

// --- Main Scraper ---

async function scrapeLocation(db, store, zip) {
  const sourceId = 'kroger-' + store.locationId;
  const label = store.name + ' - ' + (store.address && store.address.city || '') + ', ' + (store.address && store.address.state || '');

  // Register source
  const existing = db.prepare('SELECT source_id FROM source_registry WHERE source_id = ?').get(sourceId);
  if (!existing) {
    db.prepare(
      'INSERT INTO source_registry (source_id, name, type, chain_id, address, city, state, zip, lat, lon, scrape_method, has_online_pricing, pricing_tier, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      sourceId, label, 'retail_chain', 'kroger',
      (store.address && store.address.addressLine1) || null,
      (store.address && store.address.city) || null,
      (store.address && store.address.state) || null,
      zip,
      (store.geolocation && store.geolocation.latitude) || null,
      (store.geolocation && store.geolocation.longitude) || null,
      'api', 1, 'retail', 'active',
      'Kroger API (' + (store.chain || 'Kroger') + ') - ' + label
    );
    console.log('  Registered new source: ' + label);
  }

  // Load normalization mappings
  loadCachedMappings(db);

  let locationProducts = 0;
  let locationStored = 0;

  for (const term of SEARCH_TERMS) {
    try {
      const products = await searchProducts(term, store.locationId);
      stats.searched++;

      for (const product of products) {
        stats.products++;

        const name = product.description;
        if (!name) continue;

        // Skip non-food
        if (!isFoodItem(name)) {
          stats.skipped++;
          continue;
        }

        // Extract price
        const priceInfo = extractPrice(product);
        if (!priceInfo) {
          stats.noPrice++;
          continue;
        }

        // Normalize to canonical ingredient
        const match = normalizeByRules(name);
        if (!match) {
          stats.skipped++;
          continue;
        }

        // Upsert into database
        const result = upsertPrice(db, {
          sourceId,
          canonicalIngredientId: match.ingredientId,
          variantId: match.variantId || null,
          rawProductName: name,
          priceCents: priceInfo.priceCents,
          priceUnit: 'each',
          pricePerStandardUnitCents: null,
          standardUnit: null,
          packageSize: extractSize(product),
          priceType: priceInfo.priceType,
          pricingTier: 'retail',
          confidence: 'api_quote',
          sourceUrl: null,
          inStock: true,
          imageUrl: extractImage(product),
          locationId: store.locationId,
        });

        if (result === 'new' || result === 'changed') {
          locationStored++;
          stats.stored++;
        }
        locationProducts++;
      }

      // Respect rate limits: 1 second between searches
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error('  Error searching "' + term + '": ' + err.message);
      stats.errors++;
    }
  }

  // Update last scraped
  db.prepare('UPDATE source_registry SET last_scraped_at = datetime("now") WHERE source_id = ?').run(sourceId);

  console.log('  ' + label + ': ' + locationProducts + ' products matched, ' + locationStored + ' stored/updated');
}

// --- Entry Point ---

async function main() {
  console.log('=== Kroger API Scraper ===');
  console.log('API: ' + API_BASE);
  console.log('Locations: ' + TARGET_ZIPS.length + ' target zip codes');
  console.log('Search terms: ' + SEARCH_TERMS.length);
  console.log('');

  const db = getDb();

  // Discover nearest stores for each target zip
  console.log('Discovering stores...');
  const stores = [];
  const seenStoreIds = new Set();

  for (const { zip, label } of TARGET_ZIPS) {
    try {
      const store = await findNearestStore(zip);
      if (store && !seenStoreIds.has(store.locationId)) {
        seenStoreIds.add(store.locationId);
        stores.push({ store, zip });
        console.log('  ' + label + ' -> ' + store.name + ' (' + store.locationId + ')');
      } else if (!store) {
        console.log('  ' + label + ' -> no Kroger-family store found');
      } else {
        console.log('  ' + label + ' -> duplicate of existing store, skipping');
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('  ' + label + ' -> error: ' + err.message);
    }
  }

  console.log('');
  console.log('Found ' + stores.length + ' unique stores. Starting price collection...');
  console.log('');

  // Scrape each store
  for (const { store, zip } of stores) {
    try {
      await scrapeLocation(db, store, zip);
    } catch (err) {
      console.error('Error scraping ' + store.name + ': ' + err.message);
      stats.errors++;
    }
  }

  // Summary
  console.log('');
  console.log('=== Summary ===');
  console.log('Searches: ' + stats.searched);
  console.log('Products found: ' + stats.products);
  console.log('Stored/updated: ' + stats.stored);
  console.log('Skipped (non-food/unmapped): ' + stats.skipped);
  console.log('No price (cert env): ' + stats.noPrice);
  console.log('Errors: ' + stats.errors);

  db.close();
}

main().catch(function(err) {
  console.error('Fatal:', err);
  process.exit(1);
});
