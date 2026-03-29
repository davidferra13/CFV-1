/**
 * OpenClaw - Store Locator Runner
 * Scrapes store locations for all NE grocery chains across MA, NH, ME.
 * Populates catalog_stores table. One-time run per chain, refresh monthly.
 *
 * Usage:
 *   node scrapers/store-locator-runner.mjs              # all chains
 *   node scrapers/store-locator-runner.mjs market_basket # specific chain
 */

import { getDb } from '../lib/db.mjs';
import { initCatalogSchema, upsertStore, startScrapeRun, finishScrapeRun, getCatalogStats } from '../lib/catalog-db.mjs';
import { httpFetch, sleep, randomUserAgent } from '../lib/scrape-utils.mjs';

const TARGET_STATES = ['MA', 'NH', 'ME'];

// Chain configs with locator strategies
const CHAINS = [
  {
    slug: 'market_basket',
    name: 'Market Basket',
    locatorFn: locateMarketBasket,
  },
  {
    slug: 'stop_and_shop',
    name: 'Stop & Shop',
    locatorFn: locateStopAndShop,
  },
  {
    slug: 'hannaford',
    name: 'Hannaford',
    locatorFn: locateHannaford,
  },
  {
    slug: 'shaws',
    name: "Shaw's",
    locatorFn: locateShaws,
  },
  {
    slug: 'walmart',
    name: 'Walmart',
    locatorFn: locateWalmart,
  },
  {
    slug: 'target',
    name: 'Target',
    locatorFn: locateTarget,
  },
  {
    slug: 'whole_foods',
    name: 'Whole Foods',
    locatorFn: locateWholeFoods,
  },
  {
    slug: 'trader_joes',
    name: "Trader Joe's",
    locatorFn: locateTraderJoes,
  },
  {
    slug: 'aldi',
    name: 'Aldi',
    locatorFn: locateAldi,
  },
];

// ============================================================================
// CHAIN LOCATORS
// ============================================================================

/**
 * Market Basket: No API. Scrape their store locator page.
 * They have a simple HTML page with all stores listed.
 */
async function locateMarketBasket() {
  const stores = [];
  // Market Basket store list from their website
  // They use a simple JSON endpoint behind their store locator
  const zips = getStateZipPrefixes();

  for (const zip of zips) {
    try {
      const url = `https://www.shopmarketbasket.com/store-locator?zip=${zip}&radius=50`;
      const res = await httpFetch(url);
      const html = await res.text();

      // Parse store entries from HTML
      // Market Basket uses a fairly standard store locator with structured data
      const storeMatches = html.matchAll(
        /class="store-result"[\s\S]*?data-store-id="(\d+)"[\s\S]*?class="store-name"[^>]*>([^<]+)[\s\S]*?class="store-address"[^>]*>([\s\S]*?)<\/div>/gi
      );

      for (const match of storeMatches) {
        const storeId = match[1];
        const name = match[2].trim();
        const addressBlock = match[3].replace(/<[^>]+>/g, ' ').trim();

        // Parse address components
        const parsed = parseAddressBlock(addressBlock);
        if (parsed && TARGET_STATES.includes(parsed.state)) {
          stores.push({
            chainSlug: 'market_basket',
            externalStoreId: storeId,
            name: `Market Basket #${storeId}`,
            address: parsed.address,
            city: parsed.city,
            state: parsed.state,
            zip: parsed.zip,
          });
        }
      }

      // Also try JSON in script tags
      const jsonMatch = html.match(/var\s+stores?\s*=\s*(\[[\s\S]*?\]);/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          for (const s of data) {
            const state = s.state || s.province || '';
            if (TARGET_STATES.includes(state.toUpperCase())) {
              const id = s.id || s.store_id || s.number || String(stores.length);
              if (!stores.find(x => x.externalStoreId === String(id))) {
                stores.push({
                  chainSlug: 'market_basket',
                  externalStoreId: String(id),
                  name: s.name || `Market Basket #${id}`,
                  address: s.address || s.street || '',
                  city: s.city || '',
                  state: state.toUpperCase(),
                  zip: s.zip || s.postal_code || '',
                  lat: parseFloat(s.lat || s.latitude) || null,
                  lng: parseFloat(s.lng || s.lon || s.longitude) || null,
                  phone: s.phone || null,
                });
              }
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error(`  [market_basket] Error for zip ${zip}: ${err.message}`);
    }
    await sleep(2000);
  }

  // Deduplicate by external_store_id
  return deduplicateStores(stores);
}

/**
 * Stop & Shop: Ahold Delhaize store locator API
 */
async function locateStopAndShop() {
  const stores = [];
  // Stop & Shop uses a store locator API
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://stopandshop.com/apis/store-locator/v2/stores?latitude=${point.lat}&longitude=${point.lng}&radius=50&maxResults=100&details=true`;
      const res = await httpFetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': randomUserAgent(),
        },
      });
      const data = await res.json();
      const storeList = data.stores || data.results || data.data || [];

      for (const s of storeList) {
        const state = (s.address?.state || s.state || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'stop_and_shop',
          externalStoreId: String(s.storeNumber || s.id || s.storeId),
          name: s.name || `Stop & Shop #${s.storeNumber || s.id}`,
          address: s.address?.street || s.address?.line1 || s.streetAddress || '',
          city: s.address?.city || s.city || '',
          state,
          zip: s.address?.zip || s.address?.postalCode || s.zip || '',
          lat: parseFloat(s.latitude || s.address?.latitude || s.location?.lat) || null,
          lng: parseFloat(s.longitude || s.address?.longitude || s.location?.lng) || null,
          phone: s.phone || s.phoneNumber || null,
        });
      }
    } catch (err) {
      console.error(`  [stop_and_shop] Error for point ${point.lat},${point.lng}: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

/**
 * Hannaford: Similar Ahold Delhaize pattern
 */
async function locateHannaford() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://www.hannaford.com/api/stores?lat=${point.lat}&lng=${point.lng}&radius=50&limit=100`;
      const res = await httpFetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch { continue; }

      const storeList = data.stores || data.results || data.data || (Array.isArray(data) ? data : []);
      for (const s of storeList) {
        const state = (s.state || s.address?.state || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'hannaford',
          externalStoreId: String(s.storeNumber || s.id || s.storeId),
          name: s.name || `Hannaford #${s.storeNumber || s.id}`,
          address: s.address?.street || s.streetAddress || s.address1 || '',
          city: s.city || s.address?.city || '',
          state,
          zip: s.zip || s.postalCode || s.address?.zip || '',
          lat: parseFloat(s.lat || s.latitude || s.location?.lat) || null,
          lng: parseFloat(s.lng || s.longitude || s.location?.lng) || null,
          phone: s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [hannaford] Error: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

/**
 * Shaw's: Albertsons Companies store locator API
 */
async function locateShaws() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      // Albertsons uses a unified store locator
      const url = `https://local.shaws.com/api/stores?lat=${point.lat}&lng=${point.lng}&radius=50&limit=100`;
      const res = await httpFetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch { continue; }

      const storeList = data.stores || data.results || data.response?.entities || (Array.isArray(data) ? data : []);
      for (const s of storeList) {
        const state = (s.address?.region || s.state || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'shaws',
          externalStoreId: String(s.id || s.storeNumber || s.meta?.id),
          name: s.name || s.geomodifier || `Shaw's`,
          address: s.address?.line1 || s.streetAddress || '',
          city: s.address?.city || s.city || '',
          state,
          zip: s.address?.postalCode || s.zip || '',
          lat: parseFloat(s.geocodedCoordinate?.latitude || s.displayCoordinate?.latitude || s.lat) || null,
          lng: parseFloat(s.geocodedCoordinate?.longitude || s.displayCoordinate?.longitude || s.lng) || null,
          phone: s.mainPhone?.display || s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [shaws] Error: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

/**
 * Walmart: Public store finder API
 */
async function locateWalmart() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://www.walmart.com/store/finder/electrode/api/stores?singleLineAddr=${point.lat},${point.lng}&distance=50`;
      const res = await httpFetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': randomUserAgent(),
        },
      });
      const data = await res.json();
      const storeList = data.payload?.storesData?.stores || data.stores || [];

      for (const s of storeList) {
        const state = (s.address?.state || s.stateProvCode || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'walmart',
          externalStoreId: String(s.id || s.no),
          name: s.displayName || `Walmart #${s.id || s.no}`,
          address: s.address?.streetAddress || s.streetAddress || '',
          city: s.address?.city || s.city || '',
          state,
          zip: s.address?.postalCode || s.zip || '',
          lat: parseFloat(s.geoPoint?.latitude || s.latitude) || null,
          lng: parseFloat(s.geoPoint?.longitude || s.longitude) || null,
          phone: s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [walmart] Error: ${err.message}`);
    }
    await sleep(3000);
  }

  return deduplicateStores(stores);
}

/**
 * Target: Public store API
 */
async function locateTarget() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://redsky.target.com/redsky_aggregations/v1/web/store_location_v1?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&latitude=${point.lat}&longitude=${point.lng}&radius=50&limit=100`;
      const res = await httpFetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      const storeList = data?.data?.nearby_stores?.locations || data?.locations || [];

      for (const loc of storeList) {
        const s = loc.store || loc;
        const state = (s.mailing_address?.state || s.state || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'target',
          externalStoreId: String(s.store_id || s.location_id),
          name: s.store_name || s.location_name || `Target #${s.store_id}`,
          address: s.mailing_address?.address_line1 || s.address || '',
          city: s.mailing_address?.city || s.city || '',
          state,
          zip: s.mailing_address?.postal_code || s.zip || '',
          lat: parseFloat(s.geographic_specifications?.latitude || s.lat) || null,
          lng: parseFloat(s.geographic_specifications?.longitude || s.lng) || null,
          phone: s.rolling_operating_hours?.phone_number || s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [target] Error: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

/**
 * Whole Foods: Amazon store locator
 */
async function locateWholeFoods() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://www.wholefoodsmarket.com/api/v2/stores/search?latitude=${point.lat}&longitude=${point.lng}&radius=50&size=100`;
      const res = await httpFetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      const storeList = data.stores || data.results || (Array.isArray(data) ? data : []);

      for (const s of storeList) {
        const state = (s.state || s.address?.state || s.stateProvince || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'whole_foods',
          externalStoreId: String(s.id || s.storeId || s.store_id),
          name: s.name || s.storeName || `Whole Foods`,
          address: s.address?.street || s.streetAddress || s.address1 || '',
          city: s.city || s.address?.city || '',
          state,
          zip: s.zip || s.postalCode || s.address?.postalCode || '',
          lat: parseFloat(s.latitude || s.lat || s.location?.lat) || null,
          lng: parseFloat(s.longitude || s.lng || s.location?.lng) || null,
          phone: s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [whole_foods] Error: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

/**
 * Trader Joe's: JSON store locator
 */
async function locateTraderJoes() {
  const stores = [];

  try {
    // TJ's has a single JSON endpoint with all stores
    const url = 'https://locations.traderjoes.com/api/stores';
    const res = await httpFetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    const storeList = data.stores || data.results || data.data || (Array.isArray(data) ? data : []);

    for (const s of storeList) {
      const state = (s.address?.state || s.state || s.province || '').toUpperCase();
      if (!TARGET_STATES.includes(state)) continue;

      stores.push({
        chainSlug: 'trader_joes',
        externalStoreId: String(s.id || s.storeNumber || s.code),
        name: s.name || `Trader Joe's`,
        address: s.address?.street || s.address1 || s.streetAddress || '',
        city: s.address?.city || s.city || '',
        state,
        zip: s.address?.postalCode || s.postalCode || s.zip || '',
        lat: parseFloat(s.latitude || s.lat || s.location?.lat) || null,
        lng: parseFloat(s.longitude || s.lng || s.location?.lng) || null,
        phone: s.phone || s.phoneNumber || null,
      });
    }
  } catch (err) {
    console.error(`  [trader_joes] Error: ${err.message}`);
  }

  return deduplicateStores(stores);
}

/**
 * Aldi: Store locator
 */
async function locateAldi() {
  const stores = [];
  const searchPoints = getSearchPoints();

  for (const point of searchPoints) {
    try {
      const url = `https://api.aldi.us/v1/stores?latitude=${point.lat}&longitude=${point.lng}&radius=80&limit=100`;
      const res = await httpFetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch { continue; }

      const storeList = data.stores || data.results || data.items || (Array.isArray(data) ? data : []);
      for (const s of storeList) {
        const state = (s.state || s.address?.state || s.stateCode || '').toUpperCase();
        if (!TARGET_STATES.includes(state)) continue;

        stores.push({
          chainSlug: 'aldi',
          externalStoreId: String(s.id || s.storeNumber || s.storeId),
          name: s.name || `Aldi`,
          address: s.address?.street || s.streetAddress || s.address1 || '',
          city: s.city || s.address?.city || '',
          state,
          zip: s.zip || s.postalCode || s.address?.postalCode || '',
          lat: parseFloat(s.latitude || s.lat) || null,
          lng: parseFloat(s.longitude || s.lng) || null,
          phone: s.phone || null,
        });
      }
    } catch (err) {
      console.error(`  [aldi] Error: ${err.message}`);
    }
    await sleep(2000);
  }

  return deduplicateStores(stores);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Search points covering MA, NH, ME.
 * Major metro areas + spread to catch rural stores.
 */
function getSearchPoints() {
  return [
    // Massachusetts
    { lat: 42.3601, lng: -71.0589, label: 'Boston' },
    { lat: 42.7762, lng: -71.0773, label: 'Haverhill' },
    { lat: 42.1015, lng: -72.5898, label: 'Springfield' },
    { lat: 42.2626, lng: -71.8023, label: 'Worcester' },
    { lat: 41.6362, lng: -70.9342, label: 'New Bedford' },
    { lat: 42.5195, lng: -70.8967, label: 'Salem' },
    { lat: 41.7003, lng: -71.1551, label: 'Fall River' },
    { lat: 42.4473, lng: -71.2272, label: 'Lexington' },
    { lat: 42.0834, lng: -71.0184, label: 'Brockton' },
    { lat: 41.9584, lng: -70.6673, label: 'Plymouth' },
    { lat: 42.3751, lng: -72.5199, label: 'Amherst' },
    { lat: 42.6334, lng: -71.3162, label: 'Lowell' },
    { lat: 41.5801, lng: -71.4774, label: 'Cape Cod area' },
    // New Hampshire
    { lat: 42.9956, lng: -71.4548, label: 'Manchester NH' },
    { lat: 43.2081, lng: -71.5376, label: 'Concord NH' },
    { lat: 43.0718, lng: -70.7626, label: 'Portsmouth NH' },
    { lat: 43.6590, lng: -72.2517, label: 'Lebanon NH' },
    { lat: 42.8681, lng: -71.2248, label: 'Derry NH' },
    { lat: 43.4487, lng: -71.5653, label: 'Laconia NH' },
    { lat: 44.2706, lng: -71.3033, label: 'North Conway NH' },
    // Maine
    { lat: 43.6591, lng: -70.2568, label: 'Portland ME' },
    { lat: 43.9101, lng: -69.9653, label: 'Brunswick ME' },
    { lat: 44.3106, lng: -69.7795, label: 'Augusta ME' },
    { lat: 44.8016, lng: -68.7712, label: 'Bangor ME' },
    { lat: 43.4926, lng: -70.4534, label: 'Biddeford ME' },
    { lat: 44.0939, lng: -70.2115, label: 'Lewiston ME' },
    { lat: 44.5588, lng: -67.5772, label: 'Machias ME' },
    { lat: 46.8606, lng: -68.0159, label: 'Presque Isle ME' },
  ];
}

/**
 * Zip prefixes for MA, NH, ME to seed store locator pages.
 */
function getStateZipPrefixes() {
  return [
    // MA
    '01835', '02101', '01001', '01550', '02740', '01970',
    // NH
    '03101', '03301', '03801', '03766', '03038',
    // ME
    '04101', '04011', '04330', '04401', '04005',
  ];
}

/**
 * Parse "123 Main St, Springfield, MA 01103" style address blocks.
 */
function parseAddressBlock(text) {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();

  // Try: "Street, City, ST ZIP"
  const match = clean.match(/(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
  if (match) {
    return { address: match[1].trim(), city: match[2].trim(), state: match[3], zip: match[4] };
  }

  // Try: "Street City ST ZIP" (no commas)
  const match2 = clean.match(/(.+?)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+([A-Z]{2})\s+(\d{5})/);
  if (match2) {
    return { address: match2[1].trim(), city: match2[2].trim(), state: match2[3], zip: match2[4] };
  }

  return null;
}

/**
 * Deduplicate stores by external_store_id within a chain.
 */
function deduplicateStores(stores) {
  const seen = new Set();
  return stores.filter(s => {
    const key = `${s.chainSlug}:${s.externalStoreId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== OpenClaw Store Locator Runner ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Target states: ${TARGET_STATES.join(', ')}`);

  const db = getDb();
  initCatalogSchema(db);

  const targetSlug = process.argv[2];
  const chainsToRun = targetSlug
    ? CHAINS.filter(c => c.slug === targetSlug)
    : CHAINS;

  if (chainsToRun.length === 0) {
    console.error(`Unknown chain: ${targetSlug}. Available: ${CHAINS.map(c => c.slug).join(', ')}`);
    process.exit(1);
  }

  console.log(`Chains: ${chainsToRun.map(c => c.name).join(', ')}`);
  let totalStores = 0;

  for (const chain of chainsToRun) {
    console.log(`\n--- ${chain.name} ---`);
    const runId = startScrapeRun(db, { chainSlug: chain.slug, scraperName: 'store-locator', scope: 'locator' });

    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    try {
      const stores = await chain.locatorFn();
      console.log(`  Found ${stores.length} stores in ${TARGET_STATES.join('/')}`);

      for (const store of stores) {
        // Validate minimum fields
        if (!store.city || !store.state || !store.zip) {
          console.warn(`  Skipping incomplete store: ${store.name} (missing city/state/zip)`);
          errorCount++;
          continue;
        }

        const result = upsertStore(db, store);
        if (result.isNew) newCount++;
        else updateCount++;
      }

      totalStores += newCount + updateCount;
      console.log(`  New: ${newCount} | Updated: ${updateCount} | Errors: ${errorCount}`);

      finishScrapeRun(db, runId, {
        productsFound: stores.length,
        productsNew: newCount,
        productsUpdated: updateCount,
        errors: errorCount,
      });
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      finishScrapeRun(db, runId, { errors: 1, errorDetails: err.message });
    }

    // Brief pause between chains
    await sleep(3000);
  }

  const stats = getCatalogStats(db);
  console.log(`\n=== Done ===`);
  console.log(`Total stores in DB: ${stats.stores}`);
  console.log(`By state:`);
  const byState = db.prepare('SELECT state, COUNT(*) as c FROM catalog_stores GROUP BY state ORDER BY state').all();
  byState.forEach(r => console.log(`  ${r.state}: ${r.c}`));
  const byChain = db.prepare('SELECT chain_slug, COUNT(*) as c FROM catalog_stores GROUP BY chain_slug ORDER BY c DESC').all();
  console.log('By chain:');
  byChain.forEach(r => console.log(`  ${r.chain_slug}: ${r.c}`));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
