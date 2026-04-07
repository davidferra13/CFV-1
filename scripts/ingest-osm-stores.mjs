#!/usr/bin/env node
/**
 * OSM Overpass Nationwide Store Ingestion
 *
 * Queries OpenStreetMap for all food-related retail, wholesale, farm,
 * convenience, specialty, and market locations across all 50 US states + DC.
 * Inserts into openclaw.stores and openclaw.chains.
 *
 * Usage: node scripts/ingest-osm-stores.mjs [--state MA] [--dry-run]
 */

import pg from 'postgres'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 5, idle_timeout: 30 })

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
let currentOverpassIdx = 0
const OVERPASS_TIMEOUT = 180 // seconds per query
const DELAY_BETWEEN_QUERIES_MS = 15000 // be polite to Overpass

// US state bounding boxes [south, west, north, east]
const STATE_BBOXES = {
  AL: [30.22, -88.47, 35.01, -84.89],
  AK: [51.21, -179.15, 71.39, -129.98],
  AZ: [31.33, -114.81, 37.00, -109.04],
  AR: [33.00, -94.62, 36.50, -89.64],
  CA: [32.53, -124.41, 42.01, -114.13],
  CO: [36.99, -109.06, 41.00, -102.04],
  CT: [40.95, -73.73, 42.05, -71.79],
  DE: [38.45, -75.79, 39.84, -75.05],
  DC: [38.79, -77.12, 38.99, -76.91],
  FL: [24.40, -87.63, 31.00, -80.03],
  GA: [30.36, -85.61, 35.00, -80.84],
  HI: [18.91, -160.24, 22.24, -154.81],
  ID: [41.99, -117.24, 49.00, -111.04],
  IL: [36.97, -91.51, 42.51, -87.50],
  IN: [37.77, -88.10, 41.76, -84.78],
  IA: [40.37, -96.64, 43.50, -90.14],
  KS: [36.99, -102.05, 40.00, -94.59],
  KY: [36.50, -89.57, 39.15, -81.96],
  LA: [28.93, -94.04, 33.02, -89.00],
  ME: [43.06, -71.08, 47.46, -66.95],
  MD: [37.91, -79.49, 39.72, -75.05],
  MA: [41.24, -73.51, 42.89, -69.93],
  MI: [41.70, -90.42, 48.26, -82.41],
  MN: [43.50, -97.24, 49.38, -89.49],
  MS: [30.17, -91.66, 34.99, -88.10],
  MO: [35.99, -95.77, 40.61, -89.10],
  MT: [44.36, -116.05, 49.00, -104.04],
  NE: [39.99, -104.05, 43.00, -95.31],
  NV: [35.00, -120.01, 42.00, -114.04],
  NH: [42.70, -72.56, 45.30, -70.70],
  NJ: [38.93, -75.56, 41.36, -73.89],
  NM: [31.33, -109.05, 37.00, -103.00],
  NY: [40.50, -79.76, 45.01, -71.86],
  NC: [33.84, -84.32, 36.59, -75.46],
  ND: [45.94, -104.05, 49.00, -96.55],
  OH: [38.40, -84.82, 41.98, -80.52],
  OK: [33.62, -103.00, 37.00, -94.43],
  OR: [41.99, -124.57, 46.29, -116.46],
  PA: [39.72, -80.52, 42.27, -74.69],
  RI: [41.15, -71.86, 42.02, -71.12],
  SC: [32.05, -83.35, 35.22, -78.54],
  SD: [42.48, -104.06, 45.94, -96.44],
  TN: [34.98, -90.31, 36.68, -81.65],
  TX: [25.84, -106.65, 36.50, -93.51],
  UT: [36.99, -114.05, 42.00, -109.04],
  VT: [42.73, -73.44, 45.02, -71.46],
  VA: [36.54, -83.68, 39.47, -75.24],
  WA: [45.54, -124.85, 49.00, -116.92],
  WV: [37.20, -82.64, 40.64, -77.72],
  WI: [42.49, -92.89, 47.08, -86.25],
  WY: [40.99, -111.06, 45.00, -104.05],
}

// OSM shop/amenity tags -> our store_type classification
const TAG_TO_TYPE = {
  // Retail grocery
  'shop=supermarket': 'retail',
  'shop=grocery': 'retail',
  'shop=general': 'retail',
  'shop=wholesale': 'wholesale',
  // Convenience
  'shop=convenience': 'convenience',
  // Specialty
  'shop=greengrocer': 'specialty',
  'shop=butcher': 'specialty',
  'shop=bakery': 'specialty',
  'shop=deli': 'specialty',
  'shop=seafood': 'specialty',
  'shop=cheese': 'specialty',
  'shop=organic': 'specialty',
  'shop=health_food': 'specialty',
  'shop=spices': 'specialty',
  'shop=pasta': 'specialty',
  'shop=tea': 'specialty',
  'shop=coffee': 'specialty',
  'shop=chocolate': 'specialty',
  'shop=confectionery': 'specialty',
  'shop=wine': 'specialty',
  'shop=beverages': 'specialty',
  // Farm
  'shop=farm': 'farm',
  'amenity=marketplace': 'farm',
  // Dollar stores (identified by brand)
  'shop=variety_store': 'dollar',
  // Warehouse/club (identified by brand)
}

// Known chain brand -> slug mapping (matches existing openclaw.chains slugs)
const BRAND_TO_CHAIN_SLUG = {
  // Major grocery
  'Stop & Shop': 'stop_and_shop',
  'Walmart': 'walmart', 'Walmart Supercenter': 'walmart', 'Walmart Neighborhood Market': 'walmart',
  'Kroger': 'kroger',
  'Publix': 'publix', 'Publix Super Markets': 'publix',
  'Safeway': 'safeway',
  'Albertsons': 'albertsons',
  'H-E-B': 'heb', 'HEB': 'heb', 'H-E-B plus!': 'heb',
  'Whole Foods Market': 'whole_foods', 'Whole Foods': 'whole_foods',
  "Trader Joe's": 'trader_joes',
  'Aldi': 'aldi', 'ALDI': 'aldi',
  'Lidl': 'lidl',
  'Target': 'target',
  'Costco': 'costco', 'Costco Wholesale': 'costco',
  "Sam's Club": 'sams_club',
  "BJ's Wholesale Club": 'bjs', "BJ's": 'bjs',
  'Meijer': 'meijer',
  'WinCo Foods': 'winco', 'WinCo': 'winco',
  'Food Lion': 'food_lion',
  'Giant': 'giant_food', 'Giant Food': 'giant_food',
  'Giant Eagle': 'giant_eagle',
  'Hannaford': 'hannaford',
  'Market Basket': 'market_basket',
  "Shaw's": 'shaws',
  'Wegmans': 'wegmans',
  'Harris Teeter': 'harris_teeter',
  'Sprouts Farmers Market': 'sprouts', 'Sprouts': 'sprouts',
  'Hy-Vee': 'hy_vee',
  'Schnucks': 'schnucks',
  'Winn-Dixie': 'winn_dixie',
  'Piggly Wiggly': 'piggly_wiggly',
  'Food 4 Less': 'food_4_less',
  'Save-A-Lot': 'save_a_lot',
  'Grocery Outlet': 'grocery_outlet', 'Grocery Outlet Bargain Market': 'grocery_outlet',
  'Fresh Thyme': 'fresh_thyme', 'Fresh Thyme Farmers Market': 'fresh_thyme',
  'Natural Grocers': 'natural_grocers',
  'ShopRite': 'shoprite',
  'Jewel-Osco': 'jewel_osco',
  "Fry's Food": 'frys_food', "Fry's": 'frys_food',
  'Fred Meyer': 'fred_meyer',
  'King Soopers': 'king_soopers',
  'Ralphs': 'ralphs',
  "Smith's": 'smiths',
  'QFC': 'qfc',
  'Vons': 'vons',
  'Pavilions': 'pavilions',
  'Randalls': 'randalls',
  'Tom Thumb': 'tom_thumb',
  'Star Market': 'star_market',
  'ACME Markets': 'acme', 'ACME': 'acme',
  'Price Chopper': 'price_chopper',
  'Big Y': 'big_y', 'Big Y World Class Market': 'big_y',
  'Stater Bros': 'stater_bros', 'Stater Bros.': 'stater_bros',
  'Tops': 'tops_markets', 'Tops Markets': 'tops_markets',
  'Ingles': 'ingles', 'Ingles Markets': 'ingles',
  "Raley's": 'raley',
  'Weis Markets': 'weis_markets', 'Weis': 'weis_markets',
  'Cub Foods': 'cub_foods',
  'Fareway': 'fareway',
  'Food City': 'food_city',
  'Foodtown': 'foodtown',
  "Lowe's Foods": 'lowes_foods',
  'Save Mart': 'save_mart',
  'Dierbergs': 'dierbergs',
  "Bashas'": 'bashas',
  'Earth Fare': 'earth_fare',
  'Festival Foods': 'festival_foods',
  'Eataly': 'eataly',
  'The Fresh Market': 'the_fresh_market', 'Fresh Market': 'fresh_market',
  'Market 32': 'market_32',
  'Market District': 'market_district',
  'Market Street': 'market_street',
  'New Seasons Market': 'new_seasons',
  'Nugget Markets': 'nugget_markets',
  'Roche Bros': 'roche_bros', 'Roche Bros.': 'roche_bros',
  "Stew Leonard's": 'stew_leonards',
  'Woodmans': 'woodmans', "Woodman's": 'woodmans',
  'Harmons': 'harmons',
  // Ethnic/specialty
  'H Mart': 'hmart',
  '99 Ranch Market': '99_ranch', '99 Ranch': '99_ranch',
  'Patel Brothers': 'patel_brothers',
  "Sedano's": 'sedanos',
  'Fiesta Mart': 'fiesta_mart',
  'El Super': 'el_super',
  'Vallarta Supermarkets': 'vallarta', 'Vallarta': 'vallarta',
  'Cardenas Markets': 'cardenas', 'Cardenas': 'cardenas',
  'Northgate Market': 'northgate', 'Northgate Gonzalez Market': 'northgate',
  "Jon's Fresh Marketplace": 'jons', "Jon's": 'jons',
  'Super King Markets': 'super_king', 'Super King': 'super_king',
  'Mitsuwa Marketplace': 'mitsuwa', 'Mitsuwa': 'mitsuwa',
  'Uwajimaya': 'uwajimaya',
  'Lotte Plaza': 'lotte_plaza', 'Lotte Plaza Market': 'lotte_plaza',
  'La Michoacana': 'la_michoacana',
  // Convenience
  '7-Eleven': '7_eleven',
  'Circle K': 'circle_k',
  'Wawa': 'wawa',
  'Sheetz': 'sheetz',
  'QuikTrip': 'quiktrip', 'QT': 'quiktrip',
  "Casey's": 'caseys', "Casey's General Store": 'caseys',
  'Speedway': 'speedway',
  'Cumberland Farms': 'cumberland_farms',
  'RaceTrac': 'racetrac',
  'Kwik Trip': 'kwik_trip',
  'Pilot': 'pilot_flying_j', 'Pilot Flying J': 'pilot_flying_j', 'Flying J': 'pilot_flying_j',
  "Love's": 'loves', "Love's Travel Stops": 'loves',
  "Buc-ee's": 'buc_ees',
  'Royal Farms': 'royal_farms',
  'Walgreens': 'walgreens',
  'CVS': 'cvs', 'CVS Pharmacy': 'cvs',
  // Dollar
  'Dollar General': 'dollar_general',
  'Dollar Tree': 'dollar_tree',
  'Family Dollar': 'family_dollar',
  'Five Below': 'five_below',
  "Ollie's Bargain Outlet": 'ollies', "Ollie's": 'ollies',
  'Ocean State Job Lot': 'ocean_state',
  // Wholesale/distributor
  'Restaurant Depot': 'restaurant_depot',
  'Sysco': 'sysco',
  'US Foods': 'us_foods',
  'Gordon Food Service': 'gfs', 'GFS': 'gfs',
  'Smart & Final': 'smart_and_final',
  'Costco Business Center': 'costco',
  "Chef'Store": 'chefstore', 'ChefStore': 'chefstore',
  'Performance Food Group': 'performance_food',
}

// Override store_type based on brand
const BRAND_TYPE_OVERRIDE = {
  'Dollar General': 'dollar', 'Dollar Tree': 'dollar', 'Family Dollar': 'dollar',
  'Five Below': 'dollar', "Ollie's Bargain Outlet": 'dollar', "Ollie's": 'dollar',
  'Ocean State Job Lot': 'dollar',
  'Costco': 'club', 'Costco Wholesale': 'club', 'Costco Business Center': 'club',
  "Sam's Club": 'club', "BJ's Wholesale Club": 'club', "BJ's": 'club',
  '7-Eleven': 'convenience', 'Circle K': 'convenience', 'Wawa': 'convenience',
  'Sheetz': 'convenience', 'QuikTrip': 'convenience', "Casey's": 'convenience',
  "Casey's General Store": 'convenience', 'Speedway': 'convenience',
  'Cumberland Farms': 'convenience', 'RaceTrac': 'convenience', 'Kwik Trip': 'convenience',
  'Royal Farms': 'convenience', 'Walgreens': 'convenience', 'CVS': 'convenience',
  'CVS Pharmacy': 'convenience',
  'Restaurant Depot': 'wholesale', 'Sysco': 'distributor', 'US Foods': 'distributor',
  'Gordon Food Service': 'distributor', 'Smart & Final': 'wholesale',
  'Performance Food Group': 'distributor', "Chef'Store": 'wholesale', 'ChefStore': 'wholesale',
  'H Mart': 'specialty', '99 Ranch Market': 'specialty', 'Patel Brothers': 'specialty',
  'Whole Foods Market': 'specialty', 'Whole Foods': 'specialty',
  'Sprouts Farmers Market': 'specialty', 'Sprouts': 'specialty',
  "Trader Joe's": 'specialty',
  'Natural Grocers': 'specialty', 'Fresh Thyme': 'specialty',
  'Eataly': 'specialty', 'Mitsuwa Marketplace': 'specialty', 'Mitsuwa': 'specialty',
  'Uwajimaya': 'specialty', 'Lotte Plaza': 'specialty',
  "Sedano's": 'specialty', 'Fiesta Mart': 'specialty', 'El Super': 'specialty',
  'Vallarta Supermarkets': 'specialty', 'Vallarta': 'specialty',
  'Cardenas Markets': 'specialty', 'Cardenas': 'specialty',
  'Northgate Market': 'specialty', 'Super King Markets': 'specialty',
  'La Michoacana': 'specialty',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function queryOverpass(queryStr) {
  // Try each Overpass mirror in rotation
  for (let attempt = 0; attempt < OVERPASS_URLS.length; attempt++) {
    const url = OVERPASS_URLS[(currentOverpassIdx + attempt) % OVERPASS_URLS.length]
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(queryStr),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT * 1000 + 30000),
      })
      const text = await resp.text()
      if (!resp.ok || text.startsWith('<?xml') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        if (text.includes('too busy') || text.includes('Too Many Requests') || resp.status === 429 || resp.status === 504 || text.includes('runtime error')) {
          console.log(`    ${url.split('/')[2]} busy (${resp.status}), trying next mirror...`)
          continue
        }
        // Likely a temporary server error - try next mirror
        console.log(`    ${url.split('/')[2]} returned non-JSON (${resp.status}), trying next mirror...`)
        continue
      }
      try {
        const json = JSON.parse(text)
        // Success - rotate to this mirror for next call
        currentOverpassIdx = (currentOverpassIdx + attempt) % OVERPASS_URLS.length
        return json
      } catch (parseErr) {
        console.log(`    ${url.split('/')[2]} returned invalid JSON, trying next mirror...`)
        continue
      }
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.log(`    ${url.split('/')[2]} timed out, trying next mirror...`)
        continue
      }
      throw err
    }
  }
  return null // all mirrors busy
}

function buildQuery(bbox, tags) {
  const [south, west, north, east] = bbox
  const tagFilters = tags.map(t => {
    const [k, v] = t.split('=')
    return `  node["${k}"="${v}"](${south},${west},${north},${east});\n  way["${k}"="${v}"](${south},${west},${north},${east});`
  }).join('\n')

  return `[out:json][timeout:${OVERPASS_TIMEOUT}];
(
${tagFilters}
);
out center;`
}

function extractStoreData(element) {
  const tags = element.tags || {}
  const lat = element.lat || element.center?.lat
  const lon = element.lon || element.center?.lon
  if (!lat || !lon) return null

  const name = tags.name || tags.brand || tags.operator
  if (!name) return null

  // Determine store type from OSM tags
  let storeType = 'retail'
  for (const [tagPair, type] of Object.entries(TAG_TO_TYPE)) {
    const [k, v] = tagPair.split('=')
    if (tags[k] === v) {
      storeType = type
      break
    }
  }

  // Brand-based type override
  const brand = tags.brand || tags.operator || name
  if (BRAND_TYPE_OVERRIDE[brand]) storeType = BRAND_TYPE_OVERRIDE[brand]

  // Chain slug
  const chainSlug = BRAND_TO_CHAIN_SLUG[brand] ||
                    BRAND_TO_CHAIN_SLUG[tags.brand] ||
                    BRAND_TO_CHAIN_SLUG[tags.operator] ||
                    null

  return {
    osmId: String(element.id),
    osmType: element.type,
    name,
    brand: tags.brand || null,
    operator: tags.operator || null,
    lat,
    lon,
    street: tags['addr:street'] || null,
    houseNumber: tags['addr:housenumber'] || null,
    city: tags['addr:city'] || null,
    state: tags['addr:state'] || null,
    zip: tags['addr:postcode'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    storeType,
    chainSlug,
    shopTag: tags.shop || tags.amenity || null,
  }
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

// Cache of chain slug -> chain ID
const chainCache = new Map()

async function loadExistingChains() {
  const rows = await sql`SELECT id, slug FROM openclaw.chains`
  for (const r of rows) chainCache.set(r.slug, r.id)
  console.log(`  Loaded ${chainCache.size} existing chains`)
}

async function getOrCreateChain(name, slug, storeType) {
  if (chainCache.has(slug)) return chainCache.get(slug)

  // Check for existing chain by slug-like name match
  const normalizedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')

  if (chainCache.has(normalizedSlug)) return chainCache.get(normalizedSlug)

  // Determine source_type based on store type
  const sourceType = storeType === 'convenience' ? 'convenience'
    : storeType === 'dollar' ? 'dollar'
    : storeType === 'wholesale' || storeType === 'distributor' ? 'wholesale'
    : storeType === 'club' ? 'club'
    : storeType === 'farm' ? 'farm'
    : storeType === 'specialty' ? 'specialty'
    : 'chain'

  // Create new chain
  const [row] = await sql`
    INSERT INTO openclaw.chains (name, slug, source_type)
    VALUES (${name}, ${normalizedSlug}, ${sourceType})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  chainCache.set(normalizedSlug, row.id)
  return row.id
}

async function ensureIndependentChain(storeType) {
  const slug = `independent_${storeType}`
  const name = `Independent ${storeType.charAt(0).toUpperCase() + storeType.slice(1)}`
  return getOrCreateChain(name, slug, storeType)
}

async function insertStores(stores, stateName) {
  if (stores.length === 0) return { inserted: 0, skipped: 0 }

  let inserted = 0
  let skipped = 0

  // Process in batches of 500
  for (let i = 0; i < stores.length; i += 500) {
    const batch = stores.slice(i, i + 500)

    for (const store of batch) {
      try {
        // Determine chain ID
        let chainId
        if (store.chainSlug) {
          const brandName = store.brand || store.operator || store.name
          chainId = await getOrCreateChain(brandName, store.chainSlug, store.storeType)
        } else {
          chainId = await ensureIndependentChain(store.storeType)
        }

        // Build address from parts
        const address = [store.houseNumber, store.street].filter(Boolean).join(' ') || null

        // Use state from OSM tags or fall back to the state we're querying
        const storeState = store.state || stateName

        // Skip if no city and no zip (too incomplete)
        const city = store.city || 'Unknown'
        const zip = store.zip || '00000'

        const externalId = `osm-${store.osmType}-${store.osmId}`

        await sql`
          INSERT INTO openclaw.stores (
            chain_id, external_store_id, name, address, city, state, zip,
            lat, lng, phone, store_type, last_cataloged_at
          ) VALUES (
            ${chainId}, ${externalId}, ${store.name}, ${address},
            ${city}, ${storeState}, ${zip},
            ${store.lat}, ${store.lon}, ${store.phone},
            ${store.storeType}, NOW()
          )
          ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
            name = EXCLUDED.name,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            address = COALESCE(EXCLUDED.address, openclaw.stores.address),
            city = CASE WHEN EXCLUDED.city = 'Unknown' THEN openclaw.stores.city ELSE EXCLUDED.city END,
            zip = CASE WHEN EXCLUDED.zip = '00000' THEN openclaw.stores.zip ELSE EXCLUDED.zip END,
            phone = COALESCE(EXCLUDED.phone, openclaw.stores.phone),
            last_cataloged_at = NOW(),
            updated_at = NOW()
        `
        inserted++
      } catch (err) {
        if (err.code === '23505') { // unique violation
          skipped++
        } else {
          console.error(`    Error inserting ${store.name}: ${err.message}`)
          skipped++
        }
      }
    }
  }

  return { inserted, skipped }
}

// ---------------------------------------------------------------------------
// Main ingestion
// ---------------------------------------------------------------------------

const ALL_FOOD_TAGS = [
  'shop=supermarket',
  'shop=grocery',
  'shop=convenience',
  'shop=greengrocer',
  'shop=butcher',
  'shop=bakery',
  'shop=deli',
  'shop=seafood',
  'shop=cheese',
  'shop=organic',
  'shop=health_food',
  'shop=farm',
  'shop=wholesale',
  'shop=general',
  'shop=variety_store',
  'shop=confectionery',
  'shop=spices',
  'shop=pasta',
  'shop=tea',
  'shop=coffee',
  'shop=chocolate',
  'shop=beverages',
  'shop=wine',
  'amenity=marketplace',
]

async function ingestState(stateCode) {
  const bbox = STATE_BBOXES[stateCode]
  if (!bbox) throw new Error(`Unknown state: ${stateCode}`)

  // Split into two queries to avoid Overpass timeouts on big states
  const retailTags = ALL_FOOD_TAGS.slice(0, 12)
  const otherTags = ALL_FOOD_TAGS.slice(12)

  let allElements = []

  // Query 1: retail/grocery/convenience/specialty
  console.log(`  [${stateCode}] Query 1/2: retail + specialty...`)
  let retries = 0
  while (retries < 5) {
    const result = await queryOverpass(buildQuery(bbox, retailTags))
    if (result === null) {
      retries++
      const waitSec = 30 + retries * 15
      console.log(`  [${stateCode}] All mirrors busy, retry ${retries}/5 in ${waitSec}s...`)
      await sleep(waitSec * 1000)
      continue
    }
    allElements.push(...(result.elements || []))
    break
  }
  if (retries >= 5) {
    console.log(`  [${stateCode}] FAILED query 1 after 5 retries, skipping`)
    return { state: stateCode, stores: 0, error: 'overpass_busy' }
  }

  await sleep(DELAY_BETWEEN_QUERIES_MS)

  // Query 2: other tags
  console.log(`  [${stateCode}] Query 2/2: other food tags...`)
  retries = 0
  while (retries < 5) {
    const result = await queryOverpass(buildQuery(bbox, otherTags))
    if (result === null) {
      retries++
      const waitSec = 30 + retries * 15
      console.log(`  [${stateCode}] All mirrors busy, retry ${retries}/5 in ${waitSec}s...`)
      await sleep(waitSec * 1000)
      continue
    }
    allElements.push(...(result.elements || []))
    break
  }
  if (retries >= 5) {
    console.log(`  [${stateCode}] FAILED query 2 after 5 retries`)
  }

  // Deduplicate by OSM ID
  const seen = new Set()
  const uniqueElements = allElements.filter(e => {
    const key = `${e.type}-${e.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`  [${stateCode}] ${uniqueElements.length} unique elements from OSM`)

  // Extract structured data
  const stores = uniqueElements.map(extractStoreData).filter(Boolean)
  console.log(`  [${stateCode}] ${stores.length} valid stores extracted`)

  // Insert
  const { inserted, skipped } = await insertStores(stores, stateCode)
  console.log(`  [${stateCode}] Inserted: ${inserted}, Skipped: ${skipped}`)

  return { state: stateCode, stores: inserted, skipped, total_osm: uniqueElements.length }
}

async function main() {
  const args = process.argv.slice(2)
  const singleState = args.includes('--state') ? args[args.indexOf('--state') + 1]?.toUpperCase() : null
  const dryRun = args.includes('--dry-run')
  const resume = args.includes('--resume')

  console.log('=== OSM Nationwide Store Ingestion ===')
  console.log(`Mode: ${singleState ? `Single state (${singleState})` : 'All 50 states + DC'}${resume ? ' (RESUME)' : ''}`)
  if (dryRun) console.log('DRY RUN - no database writes')

  // Verify chains table has slug column
  const [schemaCheck] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'openclaw' AND table_name = 'chains' AND column_name = 'slug'
  `
  if (!schemaCheck) {
    throw new Error('openclaw.chains is missing the slug column - cannot proceed')
  }

  await loadExistingChains()

  // If resuming, check which states already have OSM data
  let completedStates = new Set()
  if (resume) {
    const existing = await sql`
      SELECT DISTINCT state FROM openclaw.stores
      WHERE external_store_id LIKE 'osm-%'
      GROUP BY state HAVING COUNT(*) > 50
    `
    completedStates = new Set(existing.map(r => r.state))
    console.log(`Resuming - skipping ${completedStates.size} already-ingested states: ${[...completedStates].join(', ')}`)
  }

  const states = singleState ? [singleState] : Object.keys(STATE_BBOXES)
  const results = []
  let totalStores = 0

  for (const state of states) {
    if (resume && completedStates.has(state)) {
      console.log(`\n--- Skipping ${state} (already ingested) ---`)
      continue
    }
    console.log(`\n--- Processing ${state} ---`)
    try {
      const result = await ingestState(state)
      results.push(result)
      totalStores += result.stores || 0
      console.log(`  Running total: ${totalStores} stores ingested`)
    } catch (err) {
      console.error(`  [${state}] ERROR: ${err.message}`)
      results.push({ state, stores: 0, error: err.message })
    }

    // Rate limit between states
    if (states.indexOf(state) < states.length - 1) {
      await sleep(DELAY_BETWEEN_QUERIES_MS)
    }
  }

  // Summary
  console.log('\n\n=== INGESTION COMPLETE ===')
  console.log(`Total stores ingested: ${totalStores}`)
  console.log('\nPer-state breakdown:')
  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `${r.stores} inserted, ${r.skipped || 0} skipped (${r.total_osm} from OSM)`
    console.log(`  ${r.state}: ${status}`)
  }

  // Final DB count
  const [count] = await sql`SELECT COUNT(*) as cnt FROM openclaw.stores`
  console.log(`\nTotal stores in database: ${count.cnt}`)

  const typeCounts = await sql`SELECT store_type, COUNT(*) as cnt FROM openclaw.stores GROUP BY store_type ORDER BY cnt DESC`
  console.log('\nBy type:')
  for (const r of typeCounts) console.log(`  ${r.store_type}: ${r.cnt}`)

  const stateCounts = await sql`SELECT state, COUNT(*) as cnt FROM openclaw.stores GROUP BY state ORDER BY cnt DESC LIMIT 10`
  console.log('\nTop 10 states:')
  for (const r of stateCounts) console.log(`  ${r.state}: ${r.cnt}`)

  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
