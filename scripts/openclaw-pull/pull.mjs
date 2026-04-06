#!/usr/bin/env node

/**
 * OpenClaw Pull Service
 *
 * Downloads the full SQLite database from the Pi, then upserts:
 *   catalog_stores         -> openclaw.stores
 *   catalog_products       -> openclaw.products
 *   catalog_store_products -> openclaw.store_products
 *   current_prices         -> openclaw.products + store_products (bridged)
 *
 * Run manually: node scripts/openclaw-pull/pull.mjs
 * Or via Windows Scheduled Task (hourly).
 */

import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import config from './config.mjs'

let Database
try {
  const mod = await import('better-sqlite3')
  Database = mod.default
} catch {
  console.error('[openclaw-pull] better-sqlite3 not available.')
  console.error('  npm install --save-dev better-sqlite3')
  process.exit(1)
}

import postgres from 'postgres'

const BATCH_SIZE = 500

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

function timestampForFilename(date) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function persistLocalMirror(buffer, startedAt) {
  mkdirSync(config.backupDir, { recursive: true })

  const latestPath = `${config.backupDir}/${config.backups.latestFile}`
  const snapshotPath = `${config.backupDir}/${config.backups.snapshotPrefix}${timestampForFilename(startedAt)}.db`

  writeFileSync(latestPath, buffer)
  writeFileSync(snapshotPath, buffer)

  const snapshotFiles = readdirSync(config.backupDir)
    .filter(
      (name) =>
        name.startsWith(config.backups.snapshotPrefix) &&
        name.endsWith('.db') &&
        name !== config.backups.latestFile
    )
    .sort()

  const overflow = snapshotFiles.length - config.backups.maxSnapshots
  let pruned = 0

  if (overflow > 0) {
    for (const name of snapshotFiles.slice(0, overflow)) {
      unlinkSync(`${config.backupDir}/${name}`)
      pruned++
    }
  }

  return { latestPath, snapshotPath, pruned }
}

// Maps current_prices.source_id prefixes/patterns to chain slugs.
// Order matters: first match wins.
// ── DYNAMIC SOURCE-TO-CHAIN MAPPING ──
// The nationwide store registry generates source IDs in the format:
//   ic-{slug}-{state}-{zip}
// This regex-based map handles both legacy source IDs and the new format.
// Broad prefix matchers at the bottom catch any source ID that starts with
// the chain's Instacart slug, so we never drop data from a new chain.

const SOURCE_TO_CHAIN = [
  // ── Legacy exact-match sources (backward compat with existing Pi data) ──
  [/^ic-hannaford$/,              'hannaford'],
  [/^hannaford-instacart$/,       'hannaford'],
  [/^ic-market-basket$/,          'market_basket'],
  [/^market-basket-instacart$/,   'market_basket'],
  [/^ic-star-market$/,            'star_market'],
  [/^ic-price-chopper$/,          'price_chopper'],
  [/^ic-roche-bros$/,             'roche_bros'],
  [/^wegmans-instacart$/,         'wegmans'],
  [/^ic-aldi$/,                   'aldi'],
  [/^aldi-instacart$/,            'aldi'],
  [/^ic-restaurant-depot$/,       'restaurant_depot'],
  [/^ic-stop-and-shop$/,          'stop_and_shop'],
  [/^ic-bjs$/,                    'bjs'],
  [/^ic-big-y$/,                  'big_y'],
  [/^ic-eataly$/,                 'eataly'],
  [/^ic-price-rite$/,             'price_rite'],
  [/^ic-seven-eleven$/,           'seven_eleven'],
  [/^ic-publix$/,                 'publix'],
  [/^publix-instacart$/,          'publix'],
  [/^ic-the-fresh-market$/,       'the_fresh_market'],
  [/^stop-shop-instacart$/,       'stop_and_shop'],

  // ── Flipp (weekly flyer) sources ──
  [/^shaws-flipp$/,               'shaws'],
  [/^bigy-flipp$/,                'bigy'],
  [/^stop-shop-flipp$/,           'stop_and_shop'],
  [/^target-flipp$/,              'target'],
  [/^dollar-general-flipp$/,      'dollar_general'],
  [/^restaurant-depot-flipp$/,    'restaurant_depot'],
  [/^costco-flipp$/,              'costco'],
  [/^ocean-state-flipp$/,         'ocean_state'],
  [/^wegmans-flipp$/,             'wegmans'],
  [/^aldi-flipp$/,                'aldi'],
  [/^cvs-flipp$/,                 'cvs'],
  [/^family-dollar-flipp$/,       'family_dollar'],
  [/^sams-club-flipp$/,           'sams_club'],
  [/^walmart-flipp$/,             'walmart'],
  [/^walgreens-flipp$/,           'walgreens'],
  [/^harris-teeter-flipp$/,       'harris_teeter'],
  [/^publix-flipp$/,              'publix'],
  [/^food-lion-flipp$/,           'food_lion'],
  [/^ingles-flipp$/,              'ingles'],
  [/^lowes-foods-flipp$/,         'lowes_foods'],
  [/^meijer-flipp$/,              'meijer'],
  [/^heb-flipp$/,                 'heb'],
  [/^safeway-flipp$/,             'safeway'],
  [/^albertsons-flipp$/,          'albertsons'],
  [/^sprouts-flipp$/,             'sprouts'],
  [/^kroger-flipp$/,              'kroger'],
  [/^giant-flipp$/,               'giant_food'],
  [/^giant-eagle-flipp$/,         'giant_eagle'],
  [/^shoprite-flipp$/,            'shoprite'],
  [/^acme-flipp$/,                'acme'],
  [/^jewel-osco-flipp$/,          'jewel_osco'],
  [/^schnucks-flipp$/,            'schnucks'],
  [/^hy-vee-flipp$/,              'hy_vee'],
  [/^winn-dixie-flipp$/,          'winn_dixie'],
  [/^piggly-wiggly-flipp$/,       'piggly_wiggly'],
  [/^food-city-flipp$/,           'food_city'],

  // ── Wholesale sources ──
  [/^us-foods-/,                  'us_foods'],
  [/^chefstore-/,                 'chefstore'],
  [/^sysco-/,                     'sysco'],
  [/^gfs-/,                       'gfs'],
  [/^trader-joes-/,               'trader_joes'],

  // ── BROAD PREFIX MATCHERS ──
  // These catch ALL source IDs from the nationwide scraper (ic-{slug}-{state}-{zip})
  // and any legacy format. KEEP LAST - first match wins.
  // Sorted alphabetically for maintainability.

  [/^ic-99-ranch-/,               '99_ranch'],
  [/^ic-acme-/,                   'acme'],
  [/^ic-albertsons-/,             'albertsons'],
  [/^ic-aldi-/,                   'aldi'],
  [/^ic-bakers-/,                 'bakers'],
  [/^ic-bashas-/,                 'bashas'],
  [/^ic-big-y-/,                  'big_y'],
  [/^ic-bjs-/,                    'bjs'],
  [/^ic-bristol-farms-/,          'bristol_farms'],
  [/^ic-brookshires-/,            'brookshires'],
  [/^ic-brothers-marketplace-/,   'brothers_marketplace'],
  [/^ic-cardenas-/,               'cardenas'],
  [/^ic-carrs-/,                  'carrs'],
  [/^ic-central-market-/,         'central_market'],
  [/^ic-city-market-/,            'city_market'],
  [/^ic-coborns-/,                'coborns'],
  [/^ic-compare-foods-/,          'compare_foods'],
  [/^ic-costco-/,                 'costco'],
  [/^ic-cub-/,                    'cub_foods'],
  [/^ic-dierbergs-/,              'dierbergs'],
  [/^ic-dillons-/,                'dillons'],
  [/^ic-dollar-general-/,         'dollar_general'],
  [/^ic-dollar-tree-/,            'dollar_tree'],
  [/^ic-earth-fare-/,             'earth_fare'],
  [/^ic-el-super-/,               'el_super'],
  [/^ic-fareway-/,                'fareway'],
  [/^ic-festival-foods-/,         'festival_foods'],
  [/^ic-fiesta-mart-/,            'fiesta_mart'],
  [/^ic-food-4-less-/,            'food_4_less'],
  [/^ic-food-bazaar-/,            'food_bazaar'],
  [/^ic-food-city-/,              'food_city'],
  [/^ic-food-lion-/,              'food_lion'],
  [/^ic-foodland-/,               'foodland_hawaii'],
  [/^ic-foodtown-/,               'foodtown'],
  [/^ic-fred-meyer-/,             'fred_meyer'],
  [/^ic-fresco-y-mas-/,           'fresco_y_mas'],
  [/^ic-fresh-market-/,           'fresh_market'],
  [/^ic-fresh-thyme-/,            'fresh_thyme'],
  [/^ic-frys-food-/,              'frys_food'],
  [/^ic-gelsons-/,                'gelsons'],
  [/^ic-gerbes-/,                 'gerbes'],
  [/^ic-giant-eagle-/,            'giant_eagle'],
  [/^ic-giant-martins-/,          'giant_martins'],
  [/^ic-giant-/,                  'giant_food'],
  [/^ic-grocery-outlet-/,         'grocery_outlet'],
  [/^ic-haggen-/,                 'haggen'],
  [/^ic-hannaford-/,              'hannaford'],
  [/^ic-harris-teeter-/,          'harris_teeter'],
  [/^ic-harveys-/,                'harveys'],
  [/^ic-heb-/,                    'heb'],
  [/^ic-hmart-/,                  'hmart'],
  [/^ic-hy-vee-/,                 'hy_vee'],
  [/^ic-ingles-/,                 'ingles'],
  [/^ic-jay-c-/,                  'jay_c'],
  [/^ic-jewel-osco-/,             'jewel_osco'],
  [/^ic-key-food-/,               'key_food'],
  [/^ic-king-soopers-/,           'king_soopers'],
  [/^ic-kroger-/,                 'kroger'],
  [/^ic-lidl-/,                   'lidl'],
  [/^ic-lotte-plaza-/,            'lotte_plaza'],
  [/^ic-lowes-foods-/,            'lowes_foods'],
  [/^ic-lucky-/,                  'lucky'],
  [/^ic-marianos-/,               'marianos'],
  [/^ic-market-basket-/,          'market_basket'],
  [/^ic-market-district-/,        'market_district'],
  [/^ic-meijer-/,                 'meijer'],
  [/^ic-mitsuwa-/,                'mitsuwa'],
  [/^ic-natural-grocers-/,        'natural_grocers'],
  [/^ic-new-seasons-/,            'new_seasons'],
  [/^ic-northgate-/,              'northgate'],
  [/^ic-patel-brothers-/,         'patel_brothers'],
  [/^ic-pavilions-/,              'pavilions'],
  [/^ic-pay-less-/,               'pay_less'],
  [/^ic-pcc-/,                    'pcc'],
  [/^ic-pick-n-save-/,            'pick_n_save'],
  [/^ic-piggly-wiggly-/,          'piggly_wiggly'],
  [/^ic-price-chopper-/,          'price_chopper'],
  [/^ic-price-rite-/,             'price_rite'],
  [/^ic-publix-/,                 'publix'],
  [/^ic-qfc-/,                    'qfc'],
  [/^ic-raleys-/,                 'raley'],
  [/^ic-ralphs-/,                 'ralphs'],
  [/^ic-randalls-/,               'randalls'],
  [/^ic-restaurant-depot-/,       'restaurant_depot'],
  [/^ic-ruler-foods-/,            'ruler_foods'],
  [/^ic-safeway-/,                'safeway'],
  [/^ic-sams-club-/,              'sams_club'],
  [/^ic-save-mart-/,              'save_mart'],
  [/^ic-schnucks-/,               'schnucks'],
  [/^ic-sedanos-/,                'sedanos'],
  [/^ic-shoprite-/,               'shoprite'],
  [/^ic-smart-and-final-/,        'smart_and_final'],
  [/^ic-smiths-/,                 'smiths'],
  [/^ic-sprouts-/,                'sprouts'],
  [/^ic-star-market-/,            'star_market'],
  [/^ic-stater-bros-/,            'stater_bros'],
  [/^ic-stew-leonards-/,          'stew_leonards'],
  [/^ic-stop-and-shop-/,          'stop_and_shop'],
  [/^ic-super-g-mart-/,           'super_g_mart'],
  [/^ic-target-/,                 'target'],
  [/^ic-the-fresh-market-/,       'the_fresh_market'],
  [/^ic-times-supermarket-/,      'times_supermarket'],
  [/^ic-tom-thumb-/,              'tom_thumb'],
  [/^ic-tops-/,                   'tops_markets'],
  [/^ic-united-supermarkets-/,    'united_supermarkets'],
  [/^ic-uwajimaya-/,              'uwajimaya'],
  [/^ic-vallarta-/,               'vallarta'],
  [/^ic-vons-/,                   'vons'],
  [/^ic-walmart-/,                'walmart'],
  [/^ic-wegmans-/,                'wegmans'],
  [/^ic-weis-markets-/,           'weis_markets'],
  [/^ic-whole-foods-/,            'whole_foods'],
  [/^ic-winco-/,                  'winco'],
  [/^ic-winn-dixie-/,             'winn_dixie'],
  [/^ic-woodmans-/,               'woodmans'],

  // Ultra-broad fallbacks for non-ic prefixed sources
  [/^whole-foods-/,               'whole_foods'],
  [/^kroger-/,                    'kroger'],
  [/^target-/,                    'target'],
  [/^walmart-/,                   'walmart'],
  [/^harris-teeter-/,             'harris_teeter'],
  [/^publix-/,                    'publix'],
  [/^food-lion-/,                 'food_lion'],
  [/^safeway-/,                   'safeway'],
  [/^albertsons-/,                'albertsons'],
  [/^heb-/,                       'heb'],
  [/^meijer-/,                    'meijer'],
  [/^ingles-/,                    'ingles'],
  [/^lowes-foods-/,               'lowes_foods'],
  [/^sprouts-/,                   'sprouts'],
  [/^hy-vee-/,                    'hy_vee'],
  [/^lidl-/,                      'lidl'],
  [/^winn-dixie-/,                'winn_dixie'],
  [/^fred-meyer-/,                'fred_meyer'],
  [/^giant-eagle-/,               'giant_eagle'],
  [/^giant-/,                     'giant_food'],
  [/^shoprite-/,                  'shoprite'],
  [/^jewel-osco-/,                'jewel_osco'],
  [/^vons-/,                      'vons'],
  [/^ralphs-/,                    'ralphs'],
  [/^king-soopers-/,              'king_soopers'],
  [/^frys-food-/,                 'frys_food'],
  [/^smiths-/,                    'smiths'],
  [/^qfc-/,                       'qfc'],
  [/^winco-/,                     'winco'],
  [/^stater-bros-/,               'stater_bros'],
  [/^costco-/,                    'costco'],
  [/^bjs-/,                       'bjs'],
  [/^sams-club-/,                 'sams_club'],
  [/^hmart-/,                     'hmart'],
  [/^99-ranch-/,                  '99_ranch'],
  [/^aldi-/,                      'aldi'],
]

function sourceIdToChainSlug(sourceId) {
  for (const [pattern, slug] of SOURCE_TO_CHAIN) {
    if (pattern.test(sourceId)) return slug
  }
  return null
}

// Categories that are definitively non-food. Used to override the Pi's
// unreliable is_food flag during ingest.
const NON_FOOD_CATEGORY_SLUGS = new Set([
  'personal-care',
  'household',
  'pets',
  'pet',
  'health-care',
  'baby',
  'kitchen-supplies',
])

// Keyword patterns for non-food products that slip into food categories
// (e.g., dog treats in "Other", paper towels miscategorized)
const NON_FOOD_KEYWORDS = [
  /dog treat/i, /cat treat/i, /dog food/i, /cat food/i,
  /pet food/i, /cat litter/i, /puppy.chow/i, /kitten.chow/i,
  /flea /i, /tick.collar/i,
  /paper towel/i, /toilet paper/i, /trash bag/i, /garbage bag/i,
  /laundry detergent/i, /fabric softener/i, /dishwasher detergent/i,
  /dish soap/i, /bleach.cleaner/i, /toilet.cleaner/i,
  /floor cleaner/i, /all-purpose cleaner/i, /swiffer/i, /windex/i,
  /toothpaste/i, /toothbrush/i, /shampoo/i, /body wash/i,
  /deodorant/i, /diaper/i, /baby wipe/i, /bandage/i, /band-aid/i,
  /ibuprofen/i, /acetaminophen/i, /melatonin/i,
  /ipad/i, /iphone/i, /battery/i, /charger/i,
  /light bulb/i, /lawn mower/i,
]

function isNonFoodProduct(productName) {
  return NON_FOOD_KEYWORDS.some(pattern => pattern.test(productName))
}

// Wholesale chains - price_type = 'wholesale' for products from these chains.
// Club stores (Costco, BJ's, Sam's) use 'retail' price_type (consumer-facing).
const WHOLESALE_CHAIN_SLUGS = new Set([
  'restaurant_depot',
  'restaurant-depot',
  'jetro',
  'sysco',
  'us_foods',
  'us-foods',
  'gfs',
  'webstaurantstore',
  'food-service-direct',
  'foodservicedirect',
])

// Club stores - separate store_type but consumer-retail pricing
const CLUB_STORE_SLUGS = new Set([
  'costco',
  'bjs',
  'bjs_wholesale_club',
  'bjs-wholesale-club',
  'sams_club',
  'sams-club',
])

/**
 * Determine price_type for a given chain slug.
 * Default: 'retail'. Wholesale distributors get 'wholesale'.
 */
function getPriceType(chainSlug) {
  if (!chainSlug) return 'retail'
  const slug = chainSlug.toLowerCase()
  return WHOLESALE_CHAIN_SLUGS.has(slug) ? 'wholesale' : 'retail'
}

/**
 * Determine store_type for a given chain slug.
 * Default: 'retail'. Club stores and wholesale distributors differ.
 */
function getStoreType(chainSlug) {
  if (!chainSlug) return 'retail'
  const slug = chainSlug.toLowerCase()
  if (WHOLESALE_CHAIN_SLUGS.has(slug)) return 'wholesale'
  if (CLUB_STORE_SLUGS.has(slug)) return 'club'
  return 'retail'
}

async function main() {
  const startedAt = new Date()
  log('Starting OpenClaw pull...')

  mkdirSync(config.tempDir, { recursive: true })

  // ── Step 1: Download SQLite ────────────────────────────────────────────
  log(`Fetching SQLite from http://${config.pi.host}:${config.pi.port}${config.pi.dbEndpoint}`)
  let buffer
  try {
    const res = await fetch(
      `http://${config.pi.host}:${config.pi.port}${config.pi.dbEndpoint}`,
      { signal: AbortSignal.timeout(config.pi.timeoutMs) }
    )
    if (!res.ok) throw new Error(`Pi returned ${res.status}: ${res.statusText}`)
    buffer = Buffer.from(await res.arrayBuffer())
  } catch (err) {
    log(`ERROR: Pi unreachable - ${err.message}`)
    process.exit(1)
  }

  const dbPath = `${config.tempDir}/openclaw-latest.db`
  writeFileSync(dbPath, buffer)
  const fileSize = statSync(dbPath).size
  log(`Downloaded ${(fileSize / 1024 / 1024).toFixed(1)}MB SQLite database`)

  if (buffer.length < 100 || buffer.toString('utf8', 0, 16) !== 'SQLite format 3\0') {
    log('ERROR: Downloaded file is not a valid SQLite database')
    process.exit(1)
  }

  // ── Step 2: Open SQLite ────────────────────────────────────────────────
  const sqlite = new Database(dbPath, { readonly: true })
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name)
  log(`SQLite tables: ${tables.join(', ')}`)

  // ── Step 3: Connect to PostgreSQL ──────────────────────────────────────
  const sql = postgres(config.pg.connectionString)

  let storesSynced = 0
  let productsSynced = 0
  let pricesSynced = 0
  let errors = 0
  const errorDetails = []

  // ID maps: SQLite integer ID -> PostgreSQL UUID
  const storeIdMap = new Map()   // sqlite store.id -> pg store uuid
  const productIdMap = new Map() // sqlite product.id -> pg product uuid

  // ── Step 4: Sync chains from source_registry ───────────────────────────
  // Load chain slug -> PG UUID mapping (seeded by migration)
  const pgChains = await sql`SELECT id, slug FROM openclaw.chains`
  const chainSlugToUuid = new Map()
  for (const c of pgChains) chainSlugToUuid.set(c.slug, c.id)
  log(`PG chains loaded: ${chainSlugToUuid.size}`)

  // ── Step 5: Sync stores ────────────────────────────────────────────────
  if (tables.includes('catalog_stores')) {
    const stores = sqlite.prepare('SELECT * FROM catalog_stores WHERE is_active = 1').all()
    log(`Found ${stores.length} active stores in SQLite`)

    for (const store of stores) {
      try {
        const chainId = chainSlugToUuid.get(store.chain_slug)
        if (!chainId) {
          log(`  WARN: Unknown chain "${store.chain_slug}", skipping "${store.name}"`)
          continue
        }

        const rows = await sql`
          INSERT INTO openclaw.stores (
            chain_id, external_store_id, name, address, city, state, zip,
            lat, lng, phone, hours_json, last_cataloged_at
          ) VALUES (
            ${chainId}, ${store.external_store_id || String(store.id)},
            ${store.name}, ${store.address},
            ${store.city || 'Unknown'}, ${store.state || 'MA'}, ${store.zip || '00000'},
            ${store.lat}, ${store.lng}, ${store.phone},
            ${store.hours_json ? JSON.parse(store.hours_json) : null},
            ${store.last_cataloged_at ? new Date(store.last_cataloged_at) : null}
          )
          ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip = EXCLUDED.zip,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            phone = EXCLUDED.phone,
            hours_json = EXCLUDED.hours_json,
            last_cataloged_at = EXCLUDED.last_cataloged_at,
            updated_at = now()
          RETURNING id
        `
        storeIdMap.set(store.id, rows[0].id)
        storesSynced++
      } catch (err) {
        errors++
        if (errorDetails.length < 20) errorDetails.push(`Store "${store.name}": ${err.message}`)
      }
    }
    log(`Synced ${storesSynced} stores, mapped ${storeIdMap.size} IDs`)
  } else {
    log('WARN: No catalog_stores table in SQLite')
  }

  // ── Step 6: Sync products ──────────────────────────────────────────────
  if (tables.includes('catalog_products')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_products').get().cnt
    log(`Found ${total} products in SQLite, syncing in batches of ${BATCH_SIZE}...`)

    // Category cache: slug -> PG UUID
    const categoryCache = new Map()

    let offset = 0
    while (offset < total) {
      const products = sqlite
        .prepare(`SELECT * FROM catalog_products LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all()

      for (const product of products) {
        try {
          // Resolve category
          let categoryId = null
          if (product.category) {
            const catSlug = product.category
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')

            if (categoryCache.has(catSlug)) {
              categoryId = categoryCache.get(catSlug)
            } else {
              // Override Pi's unreliable is_food flag with our known non-food list
              const isFood = !NON_FOOD_CATEGORY_SLUGS.has(catSlug)
              const catRows = await sql`
                INSERT INTO openclaw.product_categories (name, slug, department, is_food)
                VALUES (${product.category}, ${catSlug}, ${product.department || product.category}, ${isFood})
                ON CONFLICT (slug) DO UPDATE SET
                  name = EXCLUDED.name,
                  department = EXCLUDED.department,
                  is_food = EXCLUDED.is_food
                RETURNING id
              `
              categoryId = catRows[0]?.id ?? null
              if (categoryId) categoryCache.set(catSlug, categoryId)
            }
          }

          // Upsert product. Use UPC as conflict key when available, else name+brand.
          let pgProductId = null

          // Determine if this product is food: check category first, then keyword patterns
          const categoryIsFood = categoryId ? !NON_FOOD_CATEGORY_SLUGS.has(
            product.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ''
          ) : true
          const productIsFood = categoryIsFood && !isNonFoodProduct(product.name)

          if (product.upc) {
            const rows = await sql`
              INSERT INTO openclaw.products (
                name, brand, upc, size, size_value, size_unit,
                category_id, image_url, is_organic, is_store_brand, is_food
              ) VALUES (
                ${product.name}, ${product.brand}, ${product.upc},
                ${product.size}, ${product.size_value}, ${product.size_unit},
                ${categoryId}, ${product.image_url},
                ${product.is_organic === 1}, ${product.is_store_brand === 1},
                ${productIsFood}
              )
              ON CONFLICT (upc) WHERE upc IS NOT NULL DO UPDATE SET
                name = EXCLUDED.name,
                brand = EXCLUDED.brand,
                size = EXCLUDED.size,
                size_value = EXCLUDED.size_value,
                size_unit = EXCLUDED.size_unit,
                category_id = EXCLUDED.category_id,
                image_url = EXCLUDED.image_url,
                is_organic = EXCLUDED.is_organic,
                is_store_brand = EXCLUDED.is_store_brand,
                is_food = EXCLUDED.is_food,
                updated_at = now()
              RETURNING id
            `
            pgProductId = rows[0]?.id
          }

          if (!pgProductId) {
            // No UPC or conflict on UPC didn't fire. Insert with gen UUID.
            const rows = await sql`
              INSERT INTO openclaw.products (
                name, brand, upc, size, size_value, size_unit,
                category_id, image_url, is_organic, is_store_brand, is_food
              ) VALUES (
                ${product.name}, ${product.brand}, ${product.upc},
                ${product.size}, ${product.size_value}, ${product.size_unit},
                ${categoryId}, ${product.image_url},
                ${product.is_organic === 1}, ${product.is_store_brand === 1},
                ${productIsFood}
              )
              ON CONFLICT DO NOTHING
              RETURNING id
            `
            pgProductId = rows[0]?.id

            // If DO NOTHING fired (duplicate), look it up
            if (!pgProductId && product.upc) {
              const existing = await sql`
                SELECT id FROM openclaw.products WHERE upc = ${product.upc} LIMIT 1
              `
              pgProductId = existing[0]?.id
            }
            if (!pgProductId) {
              // Last resort: match by name+brand
              const existing = await sql`
                SELECT id FROM openclaw.products
                WHERE name = ${product.name}
                  AND (brand = ${product.brand} OR (brand IS NULL AND ${product.brand} IS NULL))
                LIMIT 1
              `
              pgProductId = existing[0]?.id
            }
          }

          if (pgProductId) {
            productIdMap.set(product.id, pgProductId)
            productsSynced++
          }
        } catch (err) {
          errors++
          if (errorDetails.length < 20) errorDetails.push(`Product "${product.name}": ${err.message}`)
        }
      }

      offset += BATCH_SIZE
      if (offset % 5000 === 0) log(`  Products: ${offset}/${total}...`)
    }
    log(`Synced ${productsSynced} products, mapped ${productIdMap.size} IDs`)
  } else {
    log('WARN: No catalog_products table in SQLite')
  }

  // ── Step 7: Sync store_products (prices) ───────────────────────────────
  if (tables.includes('catalog_store_products')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_store_products').get().cnt
    log(`Found ${total} store_products in SQLite, syncing...`)

    let skippedNoMap = 0
    let skippedZero = 0
    let offset = 0

    while (offset < total) {
      let rows
      try {
        rows = sqlite
          .prepare(`SELECT * FROM catalog_store_products LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
          .all()
      } catch (sqliteErr) {
        log(`  WARN: SQLite read error at offset ${offset}: ${sqliteErr.message}. Skipping batch.`)
        offset += BATCH_SIZE
        continue
      }

      // Collect valid rows for bulk upsert
      const batch = []
      for (const sp of rows) {
        if (!sp.price_cents || sp.price_cents <= 0) {
          skippedZero++
          continue
        }
        const pgStoreId = storeIdMap.get(sp.store_id)
        const pgProductId = productIdMap.get(sp.product_id)
        if (!pgStoreId || !pgProductId) {
          skippedNoMap++
          continue
        }
        batch.push({
          store_id: pgStoreId,
          product_id: pgProductId,
          price_cents: sp.price_cents,
          sale_price_cents: sp.sale_price_cents || null,
          sale_ends_at: sp.sale_ends_at ? new Date(sp.sale_ends_at) : null,
          in_stock: sp.in_stock === 1,
          aisle: sp.aisle,
          source: sp.source || 'pull',
          last_seen_at: sp.last_seen_at ? new Date(sp.last_seen_at) : new Date(),
          price_type: getPriceType(sp.chain_slug || null),
        })
      }

      // Bulk upsert: one query per batch instead of one per row
      for (let i = 0; i < batch.length; i += 50) {
        const chunk = batch.slice(i, i + 50)
        try {
          await sql`
            INSERT INTO openclaw.store_products ${sql(chunk,
              'store_id', 'product_id', 'price_cents', 'sale_price_cents', 'sale_ends_at',
              'in_stock', 'aisle', 'source', 'last_seen_at', 'price_type'
            )}
            ON CONFLICT (store_id, product_id) DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              sale_price_cents = EXCLUDED.sale_price_cents,
              sale_ends_at = EXCLUDED.sale_ends_at,
              in_stock = EXCLUDED.in_stock,
              aisle = EXCLUDED.aisle,
              source = EXCLUDED.source,
              last_seen_at = EXCLUDED.last_seen_at,
              price_type = EXCLUDED.price_type
          `
          pricesSynced += chunk.length
        } catch (err) {
          // Fallback: insert one-by-one on chunk failure
          for (const r of chunk) {
            try {
              await sql`
                INSERT INTO openclaw.store_products (
                  store_id, product_id, price_cents, sale_price_cents, sale_ends_at,
                  in_stock, aisle, source, last_seen_at, price_type
                ) VALUES (
                  ${r.store_id}, ${r.product_id}, ${r.price_cents}, ${r.sale_price_cents},
                  ${r.sale_ends_at}, ${r.in_stock}, ${r.aisle}, ${r.source},
                  ${r.last_seen_at}, ${r.price_type}
                )
                ON CONFLICT (store_id, product_id) DO UPDATE SET
                  price_cents = EXCLUDED.price_cents,
                  sale_price_cents = EXCLUDED.sale_price_cents,
                  sale_ends_at = EXCLUDED.sale_ends_at,
                  in_stock = EXCLUDED.in_stock,
                  aisle = EXCLUDED.aisle,
                  source = EXCLUDED.source,
                  last_seen_at = EXCLUDED.last_seen_at,
                  price_type = EXCLUDED.price_type
              `
              pricesSynced++
            } catch (rowErr) {
              errors++
              if (errorDetails.length < 20) errorDetails.push(`Price store=${r.store_id} prod=${r.product_id}: ${rowErr.message}`)
            }
          }
        }
      }

      offset += BATCH_SIZE
      if (offset % 10000 === 0) log(`  Prices: ${offset}/${total}...`)
    }

    log(`Synced ${pricesSynced} prices (skipped: ${skippedNoMap} unmapped, ${skippedZero} zero-price)`)
  } else {
    log('WARN: No catalog_store_products table in SQLite')
  }

  // ── Step 7b: Sync current_prices (the other data path) ─────────────────
  // current_prices is populated by ALL scrapers (Walmart API, Target API,
  // Whole Foods, Flipp, government, etc). The catalog_* tables above only
  // cover Instacart catalog walkers. This step bridges the gap.
  let currentPricesSynced = 0
  if (tables.includes('current_prices')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM current_prices').get().cnt
    log(`Found ${total} current_prices rows in SQLite, syncing...`)

    // Build a source_id -> virtual store mapping
    // Each unique source_id gets one virtual store in openclaw.stores
    const sourceStoreMap = new Map() // source_id -> pg store uuid

    const distinctSources = sqlite
      .prepare('SELECT DISTINCT source_id FROM current_prices ORDER BY source_id')
      .all()

    for (const { source_id } of distinctSources) {
      const chainSlug = sourceIdToChainSlug(source_id)
      if (!chainSlug) {
        log(`  WARN: No chain mapping for source_id "${source_id}", skipping`)
        continue
      }
      const chainId = chainSlugToUuid.get(chainSlug)
      if (!chainId) {
        log(`  WARN: Chain slug "${chainSlug}" not in PG chains, skipping source "${source_id}"`)
        continue
      }

      try {
        // Upsert a virtual store for this source_id
        const rows = await sql`
          INSERT INTO openclaw.stores (
            chain_id, external_store_id, name, city, state, zip
          ) VALUES (
            ${chainId}, ${source_id},
            ${source_id}, 'Regional', 'MA', '00000'
          )
          ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
            updated_at = now()
          RETURNING id
        `
        sourceStoreMap.set(source_id, rows[0].id)
      } catch (err) {
        errors++
        if (errorDetails.length < 20) errorDetails.push(`Virtual store "${source_id}": ${err.message}`)
      }
    }
    log(`  Mapped ${sourceStoreMap.size}/${distinctSources.length} source_ids to stores`)

    // Now sync each current_price row as a product + store_product
    let offset = 0
    let skippedNoStore = 0
    let skippedNonFood = 0

    while (offset < total) {
      const rows = sqlite
        .prepare(`SELECT * FROM current_prices LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all()

      for (const cp of rows) {
        if (!cp.price_cents || cp.price_cents <= 0) continue

        const pgStoreId = sourceStoreMap.get(cp.source_id)
        if (!pgStoreId) {
          skippedNoStore++
          continue
        }

        // Skip obvious non-food items
        if (cp.raw_product_name && isNonFoodProduct(cp.raw_product_name)) {
          skippedNonFood++
          continue
        }

        try {
          // Upsert product by name (current_prices rarely has UPC)
          const productRows = await sql`
            INSERT INTO openclaw.products (
              name, size, is_food
            ) VALUES (
              ${cp.raw_product_name || 'Unknown'},
              ${cp.package_size || null},
              true
            )
            ON CONFLICT DO NOTHING
            RETURNING id
          `
          let pgProductId = productRows[0]?.id

          // If DO NOTHING fired, look up by exact name
          if (!pgProductId) {
            const existing = await sql`
              SELECT id FROM openclaw.products
              WHERE name = ${cp.raw_product_name || 'Unknown'}
              LIMIT 1
            `
            pgProductId = existing[0]?.id
          }

          if (!pgProductId) continue

          // Determine if this is a sale price
          const isSale = cp.price_type === 'sale'
          const priceCents = cp.price_cents
          const salePriceCents = isSale ? cp.price_cents : null
          const regularPrice = isSale ? null : cp.price_cents

          // Determine source label
          let source = 'current_prices'
          if (cp.pricing_tier) source = cp.pricing_tier
          if (cp.source_id?.includes('flipp')) source = 'flipp'

          // Derive price_type from source_id (maps to chain slug)
          const cpChainSlug = sourceIdToChainSlug(cp.source_id || '') || null
          const cpPriceType = getPriceType(cpChainSlug)

          await sql`
            INSERT INTO openclaw.store_products (
              store_id, product_id, price_cents, sale_price_cents,
              sale_ends_at, in_stock, source, last_seen_at, price_type
            ) VALUES (
              ${pgStoreId}, ${pgProductId},
              ${regularPrice || priceCents},
              ${salePriceCents},
              ${cp.sale_end_date ? new Date(cp.sale_end_date) : null},
              ${cp.in_stock !== 0},
              ${source},
              ${cp.last_confirmed_at ? new Date(cp.last_confirmed_at) : new Date()},
              ${cpPriceType}
            )
            ON CONFLICT (store_id, product_id) DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              sale_price_cents = EXCLUDED.sale_price_cents,
              sale_ends_at = EXCLUDED.sale_ends_at,
              in_stock = EXCLUDED.in_stock,
              source = EXCLUDED.source,
              last_seen_at = EXCLUDED.last_seen_at,
              price_type = EXCLUDED.price_type
          `
          currentPricesSynced++
        } catch (err) {
          errors++
          if (errorDetails.length < 20) errorDetails.push(`current_price "${cp.raw_product_name}": ${err.message}`)
        }
      }

      offset += BATCH_SIZE
      if (offset % 10000 === 0) log(`  current_prices: ${offset}/${total}...`)
    }

    log(`Synced ${currentPricesSynced} current_prices (skipped: ${skippedNoStore} no store, ${skippedNonFood} non-food)`)
  }

  // ── Step 7c: Sync canonical_ingredients ────────────────────────────────
  // The Pi maintains a master ingredient dictionary (48K+ entries from
  // OpenFoodFacts, USDA, and curated sources). Sync them so ChefFlow can
  // display the full ingredient count and enable future search/matching.
  let ingredientsSynced = 0
  if (tables.includes('canonical_ingredients')) {
    const total = sqlite.prepare('SELECT COUNT(*) as cnt FROM canonical_ingredients').get().cnt
    log(`Found ${total} canonical ingredients in SQLite, syncing...`)

    let offset = 0
    while (offset < total) {
      const rows = sqlite
        .prepare(`SELECT * FROM canonical_ingredients LIMIT ${BATCH_SIZE} OFFSET ${offset}`)
        .all()

      for (const ing of rows) {
        try {
          await sql`
            INSERT INTO openclaw.canonical_ingredients (
              ingredient_id, name, category, standard_unit,
              off_image_url, off_barcode, off_nutrition_json
            ) VALUES (
              ${ing.ingredient_id}, ${ing.name}, ${ing.category || null},
              ${ing.standard_unit || null}, ${ing.off_image_url || null},
              ${ing.off_barcode || null},
              ${ing.off_nutrition_json ? JSON.parse(ing.off_nutrition_json) : null}
            )
            ON CONFLICT (ingredient_id) DO UPDATE SET
              name = EXCLUDED.name,
              category = EXCLUDED.category,
              standard_unit = EXCLUDED.standard_unit,
              off_image_url = EXCLUDED.off_image_url,
              off_barcode = EXCLUDED.off_barcode,
              off_nutrition_json = EXCLUDED.off_nutrition_json,
              updated_at = now()
          `
          ingredientsSynced++
        } catch (err) {
          errors++
          if (errorDetails.length < 20) errorDetails.push(`Ingredient "${ing.name}": ${err.message}`)
        }
      }

      offset += BATCH_SIZE
      if (offset % 5000 === 0) log(`  Ingredients: ${offset}/${total}...`)
    }
    log(`Synced ${ingredientsSynced} canonical ingredients`)
  } else {
    log('WARN: No canonical_ingredients table in SQLite')
  }

  // ── Step 8: Log sync run ───────────────────────────────────────────────
  const finishedAt = new Date()
  const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)

  await sql`
    INSERT INTO openclaw.sync_runs (
      started_at, finished_at, sqlite_size_bytes,
      stores_synced, products_synced, prices_synced,
      errors, error_details, duration_seconds
    ) VALUES (
      ${startedAt}, ${finishedAt}, ${fileSize},
      ${storesSynced}, ${productsSynced}, ${pricesSynced + currentPricesSynced},
      ${errors}, ${errorDetails.length > 0 ? errorDetails.join('\n') : null},
      ${durationSeconds}
    )
  `

  log(`\nDone in ${durationSeconds}s`)
  log(`  Stores:   ${storesSynced}`)
  log(`  Products: ${productsSynced}`)
  log(`  Prices (catalog):  ${pricesSynced}`)
  log(`  Prices (current):  ${currentPricesSynced}`)
  log(`  Prices (total):    ${pricesSynced + currentPricesSynced}`)
  log(`  Errors:   ${errors}`)
  if (errorDetails.length > 0) {
    log(`  First errors:`)
    errorDetails.slice(0, 5).forEach((e) => log(`    ${e}`))
  }

  // Post-sync validation: compare source vs destination counts
  log(`\n  Post-sync validation:`)
  const srcStores = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_stores').get().cnt
  const srcProducts = sqlite.prepare('SELECT COUNT(*) as cnt FROM catalog_products').get().cnt
  const [dstStores] = await sql`SELECT COUNT(*) as cnt FROM openclaw.stores`
  const [dstProducts] = await sql`SELECT COUNT(*) as cnt FROM openclaw.products`

  const storeDelta = Math.abs(srcStores - Number(dstStores.cnt))
  const productDelta = Math.abs(srcProducts - Number(dstProducts.cnt))

  log(`    Stores:   SQLite=${srcStores} PG=${dstStores.cnt} delta=${storeDelta}`)
  log(`    Products: SQLite=${srcProducts} PG=${dstProducts.cnt} delta=${productDelta}`)

  if (storeDelta > 10 || productDelta > 1000) {
    log(`    WARNING: Large count divergence detected. Investigate sync integrity.`)
  } else {
    log(`    OK: Counts within expected tolerance.`)
  }

  await sql.end()
  sqlite.close()
}

main().catch((err) => {
  console.error('[openclaw-pull] Fatal:', err.message)
  process.exit(1)
})
