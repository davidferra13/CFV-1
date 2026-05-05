#!/usr/bin/env node
/**
 * Bridge Pi price data into local PostgreSQL OpenClaw tables.
 *
 * The Pi SQLite database is opened read-only over SSH and exported as JSONL.
 * Local checkpoint files make the import safe to resume.
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import postgres from 'postgres'

const ROOT = process.cwd()
const EXPORT_DIR = path.join(ROOT, '.openclaw-temp', 'pi-export')
const LOG_FILE = path.join(EXPORT_DIR, 'bridge.log')
const CHECKPOINT_FILE = path.join(EXPORT_DIR, 'checkpoint.json')
const LOCK_FILE = path.join(EXPORT_DIR, 'bridge.lock.json')
const STORE_MAP_FILE = path.join(EXPORT_DIR, 'store-map.jsonl')
const PRODUCT_MAP_FILE = path.join(EXPORT_DIR, 'product-map.jsonl')

const PI_SSH = process.env.PI_SSH || 'davidferra@10.0.0.177'
const PI_DB = process.env.PI_DB || '/home/davidferra/openclaw-prices/data/prices.db'
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const BATCH_SIZE = Number(process.env.BRIDGE_BATCH_SIZE || 500)
const SSH_BASE_ARGS = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=60', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3']
const FORCE_EXPORT = process.argv.includes('--force-export')
const SKIP_EXPORT = process.argv.includes('--skip-export')
const RESET_CHECKPOINT = process.argv.includes('--reset-checkpoint')
const EXPORT_ONLY = process.argv.includes('--export-only')

const EXPORTS = {
  catalog_stores: path.join(EXPORT_DIR, 'catalog_stores.jsonl'),
  canonical_ingredients: path.join(EXPORT_DIR, 'canonical_ingredients.jsonl'),
  source_registry: path.join(EXPORT_DIR, 'source_registry.jsonl'),
  current_prices: path.join(EXPORT_DIR, 'current_prices.jsonl'),
}

const VALID_STORE_TYPES = new Set([
  'retail',
  'wholesale',
  'club',
  'online',
  'farm',
  'distributor',
  'convenience',
  'specialty',
  'independent',
  'dollar',
])

const VALID_PRICE_TYPES = new Set([
  'retail',
  'wholesale',
  'commodity',
  'farm_direct',
  'club',
  'convenience',
  'estimated',
])

const SOURCE_TYPE_BY_STORE_TYPE = {
  retail: 'chain',
  wholesale: 'wholesale',
  club: 'club',
  online: 'online',
  farm: 'farm',
  distributor: 'distributor',
  convenience: 'convenience',
  specialty: 'specialty',
  independent: 'independent',
  dollar: 'dollar',
}

const CHAIN_SLUG_ALIASES = {
  '7_eleven': '7_eleven',
  '7eleven': '7_eleven',
  bjs_wholesale: 'bjs',
  bjs_wholesale_club: 'bjs',
  market_basket_weekly_flyer: 'market_basket',
  market_basket_flyer: 'market_basket',
  marketbasket: 'market_basket',
  stop_shop: 'stop_and_shop',
  stop_shop_flipp: 'stop_and_shop',
  stop_and_shop_flipp: 'stop_and_shop',
  stopandshop: 'stop_and_shop',
}

const STORE_TYPE_BY_CHAIN = {
  bjs: 'club',
  costco: 'club',
  sams_club: 'club',
  restaurant_depot: 'wholesale',
  chefstore: 'wholesale',
  sysco: 'distributor',
  us_foods: 'distributor',
  gfs: 'distributor',
  dollar_general: 'dollar',
  dollar_tree: 'dollar',
  family_dollar: 'dollar',
  seven_eleven: 'convenience',
  '7_eleven': 'convenience',
  circle_k: 'convenience',
  wawa: 'convenience',
  sheetz: 'convenience',
  walgreens: 'convenience',
  cvs: 'convenience',
  whole_foods: 'specialty',
  trader_joes: 'specialty',
  hmart: 'specialty',
  sprouts: 'specialty',
}

const REMOTE_EXPORTER = String.raw`
import sqlite3, json, sys

db_path = sys.argv[1]
export_name = sys.argv[2]

queries = {
  "catalog_stores": """
    SELECT
      id AS pi_store_id,
      chain_slug,
      external_store_id,
      name,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      phone,
      hours_json,
      source,
      brand
    FROM catalog_stores
    ORDER BY COALESCE(chain_slug, ''), COALESCE(state, ''), COALESCE(city, ''), id
  """,
  "canonical_ingredients": """
    SELECT
      ingredient_id,
      name,
      category,
      standard_unit,
      off_image_url,
      off_barcode,
      is_food
    FROM canonical_ingredients
    ORDER BY ingredient_id
  """,
  "source_registry": """
    SELECT
      source_id,
      name,
      type,
      chain_id,
      address,
      city,
      state,
      zip,
      lat,
      lon AS lng,
      phone,
      pricing_tier,
      status,
      scrape_method,
      website
    FROM source_registry
    ORDER BY COALESCE(chain_id, source_id), COALESCE(state, ''), source_id
  """,
  "current_prices": """
    SELECT
      cp.id,
      cp.source_id,
      cp.canonical_ingredient_id,
      cp.variant_id,
      cp.raw_product_name,
      cp.price_cents,
      cp.price_unit,
      cp.price_per_standard_unit_cents,
      cp.standard_unit,
      cp.package_size,
      cp.price_type AS source_price_kind,
      cp.sale_start_date,
      cp.sale_end_date,
      cp.pricing_tier AS price_tier,
      cp.confidence,
      cp.location_id,
      cp.image_url,
      cp.last_confirmed_at,
      cp.last_changed_at,
      cp.created_at,
      cp.in_stock,
      sr.name AS source_name,
      sr.type AS source_type,
      sr.chain_id AS source_chain_slug,
      sr.address AS source_address,
      sr.city AS source_city,
      sr.state AS source_state,
      sr.zip AS source_zip,
      sr.lat AS source_lat,
      sr.lon AS source_lng,
      sr.phone AS source_phone,
      sr.pricing_tier AS source_pricing_tier,
      sr.status AS source_status,
      sr.scrape_method AS source_scrape_method,
      sr.website AS source_website
    FROM current_prices cp
    LEFT JOIN source_registry sr ON sr.source_id = cp.source_id
    ORDER BY cp.source_id, COALESCE(sr.state, ''), cp.id
  """,
}

query = queries[export_name]
conn = sqlite3.connect("file:" + db_path + "?mode=ro", uri=True)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA query_only = ON")
conn.execute("BEGIN")
try:
  cur = conn.cursor()
  for row in cur.execute(query):
    sys.stdout.write(json.dumps(dict(row), ensure_ascii=False, separators=(",", ":")) + "\n")
finally:
  conn.rollback()
  conn.close()
`

let sql
let lockAcquired = false
let checkpoint = {
  completedPriceGroups: [],
  prices: {
    processed: 0,
    upserted: 0,
    skipped: 0,
  },
}
const completedPriceGroups = new Set()

async function main() {
  await fsp.mkdir(EXPORT_DIR, { recursive: true })
  await acquireLock()
  if (RESET_CHECKPOINT) await removeIfExists(CHECKPOINT_FILE)
  checkpoint = await loadCheckpoint()
  for (const group of checkpoint.completedPriceGroups || []) completedPriceGroups.add(group)

  log('=== Pi price bridge start ===')
  log(`Pi: ${PI_SSH}:${PI_DB}`)
  log(`Postgres: ${redactDbUrl(DB_URL)}`)
  log(`Batch size: ${BATCH_SIZE}`)

  sql = postgres(DB_URL, {
    max: 5,
    idle_timeout: 120,
    connect_timeout: 30,
    transform: postgres.camel,
  })

  if (!SKIP_EXPORT) await exportPiData()
  await verifyExports()
  if (EXPORT_ONLY) {
    log('Export-only mode complete')
    await sql.end()
    releaseLockSync()
    return
  }

  const chainCache = await loadChains()
  const catalogStores = await loadJsonlArray(EXPORTS.catalog_stores)
  const sourceRegistry = await loadJsonlArray(EXPORTS.source_registry)
  const sourceById = new Map(sourceRegistry.map((source) => [source.sourceId, source]))

  const storeContext = await mapStores(catalogStores, chainCache)
  const productMap = await mapProducts(chainCache)

  await importPrices({
    chainCache,
    productMap,
    sourceById,
    storeContext,
  })

  await writeSyncAudit()
  await verifyPostgres()
  await sql.end()

  log('=== Pi price bridge complete ===')
  releaseLockSync()
}

async function exportPiData() {
  for (const [exportName, filePath] of Object.entries(EXPORTS)) {
    if (!FORCE_EXPORT && (await exists(filePath)) && (await fileSize(filePath)) > 0) {
      log(`[export] ${exportName}: exists, skipping (${filePath})`)
      continue
    }

    const started = Date.now()
    await runRemoteExportWithRetry(exportName, filePath)
    const lines = await countLines(filePath)
    const sizeMb = ((await fileSize(filePath)) / 1024 / 1024).toFixed(1)
    log(`[export] ${exportName}: ${lines.toLocaleString()} rows, ${sizeMb} MB, ${elapsed(started)}`)
  }
}

async function runRemoteExportWithRetry(exportName, outputPath) {
  const attempts = 5
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await removeIfExists(outputPath)
    log(`[export] ${exportName}: streaming from Pi (attempt ${attempt}/${attempts})`)
    try {
      await runRemoteExport(exportName, outputPath)
      return
    } catch (error) {
      if (attempt === attempts) throw error
      const waitMs = attempt * 5000
      log(`[export] ${exportName}: ${error.message.split('\n')[0]}; retrying in ${waitMs / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
}

async function runRemoteExport(exportName, outputPath) {
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outputPath, { encoding: 'utf8' })
    const encodedExporter = Buffer.from(REMOTE_EXPORTER, 'utf8').toString('base64')
    const pythonCommand = `import base64; exec(base64.b64decode("${encodedExporter}").decode("utf-8"))`
    const remoteCommand = [
      'python3',
      '-c',
      remoteShellQuote(pythonCommand),
      remoteShellQuote(PI_DB),
      remoteShellQuote(exportName),
    ].join(' ')

    const child = spawn('ssh', [
      ...SSH_BASE_ARGS,
      PI_SSH,
      remoteCommand,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.stdout.pipe(out)

    child.on('error', reject)
    child.on('close', (code) => {
      out.end()
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`remote export ${exportName} failed with exit ${code}: ${stderr.trim()}`))
    })
  })
}

async function verifyExports() {
  for (const [name, filePath] of Object.entries(EXPORTS)) {
    if (!(await exists(filePath)) || (await fileSize(filePath)) === 0) {
      throw new Error(`Missing export ${name}: ${filePath}`)
    }
  }
}

async function loadChains() {
  const rows = await sql`
    SELECT id::text, slug, name, source_type
    FROM openclaw.chains
  `
  const cache = new Map()
  for (const row of rows) {
    cache.set(row.slug, row)
    cache.set(normalizeSlug(row.slug), row)
  }
  log(`[chains] loaded ${rows.length.toLocaleString()} chains`)
  return cache
}

async function ensureChain(chainCache, slugInput, nameInput, storeTypeInput = 'retail', sourceTypeInput = null) {
  const slug = normalizeSlug(slugInput || nameInput || 'pi_unknown_source')
  if (chainCache.has(slug)) return chainCache.get(slug)

  const name = cleanText(nameInput) || titleFromSlug(slug)
  const storeType = normalizeStoreType(storeTypeInput, slug, sourceTypeInput)
  const sourceType = sourceTypeInput || SOURCE_TYPE_BY_STORE_TYPE[storeType] || 'chain'

  const [row] = await sql`
    INSERT INTO openclaw.chains (slug, name, source_type)
    VALUES (${slug}, ${name}, ${sourceType})
    ON CONFLICT (slug) DO UPDATE SET
      updated_at = NOW()
    RETURNING id::text, slug, name, source_type
  `
  chainCache.set(row.slug, row)
  chainCache.set(normalizeSlug(row.slug), row)
  return row
}

async function mapStores(catalogStores, chainCache) {
  log(`[stores] mapping ${catalogStores.length.toLocaleString()} Pi catalog stores`)
  await removeIfExists(STORE_MAP_FILE)

  const mapByPiId = new Map()
  const mapByExternal = new Map()
  const catalogByChainStateCity = new Map()
  const statsByState = new Map()
  let matched = 0
  let created = 0
  let skipped = 0

  for (const store of catalogStores) {
    const state = normalizeState(store.state)
    const stat = getStateStats(statsByState, state || '??')
    const chainSlug = normalizeSlug(store.chainSlug || store.brand || store.name)
    const storeType = normalizeStoreType(null, chainSlug, store.source)
    const chain = await ensureChain(chainCache, chainSlug, store.brand || store.name, storeType)

    try {
      const existing = await findExistingStore(store, chain.id)
      let pgStoreId
      let matchedBy

      if (existing) {
        pgStoreId = existing.id
        matchedBy = existing.matchedBy
        matched++
        stat.matched++
      } else {
        const inserted = await createStore(chain.id, store, storeType)
        pgStoreId = inserted.id
        matchedBy = 'created'
        created++
        stat.created++
      }

      const record = {
        piStoreId: String(store.piStoreId),
        externalStoreId: store.externalStoreId || null,
        chainSlug,
        state,
        city: cleanText(store.city),
        pgStoreId,
        matchedBy,
      }
      await appendJsonl(STORE_MAP_FILE, record)
      mapByPiId.set(record.piStoreId, record)
      if (record.externalStoreId) mapByExternal.set(record.externalStoreId, record)
      addCatalogCityIndex(catalogByChainStateCity, record)
    } catch (error) {
      skipped++
      stat.skipped++
      log(`[stores] skip ${chainSlug}/${state}/${store.city || ''}/${store.piStoreId}: ${error.message}`)
    }

    const total = matched + created + skipped
    if (total % 1000 === 0) {
      log(`[stores] ${total.toLocaleString()}/${catalogStores.length.toLocaleString()} mapped (${matched} matched, ${created} created, ${skipped} skipped)`)
    }
  }

  log(`[stores] done: ${matched.toLocaleString()} matched, ${created.toLocaleString()} created, ${skipped.toLocaleString()} skipped`)
  for (const [state, stats] of [...statsByState.entries()].sort()) {
    log(`[stores] ${state}: ${stats.matched} matched, ${stats.created} created, ${stats.skipped} skipped`)
  }

  return {
    catalogStores,
    mapByPiId,
    mapByExternal,
    catalogByChainStateCity,
    syntheticStoreCache: new Map(),
    syntheticCreated: 0,
    syntheticMatched: 0,
  }
}

async function findExistingStore(store, chainId) {
  const externalId = cleanText(store.externalStoreId)
  if (externalId) {
    const rows = await sql`
      SELECT id::text
      FROM openclaw.stores
      WHERE chain_id = ${chainId}
        AND external_store_id = ${externalId}
      LIMIT 1
    `
    if (rows[0]) return { id: rows[0].id, matchedBy: 'external_store_id' }
  }

  const state = normalizeState(store.state)
  const lat = toNumber(store.lat)
  const lng = toNumber(store.lng)
  if (state && Number.isFinite(lat) && Number.isFinite(lng)) {
    const rows = await sql`
      SELECT id::text
      FROM openclaw.stores
      WHERE chain_id = ${chainId}
        AND state = ${state}
        AND lat BETWEEN ${lat - 0.001} AND ${lat + 0.001}
        AND lng BETWEEN ${lng - 0.0015} AND ${lng + 0.0015}
      ORDER BY
        POWER((lat::float8 - ${lat}), 2) + POWER((lng::float8 - ${lng}), 2)
      LIMIT 1
    `
    if (rows[0]) return { id: rows[0].id, matchedBy: 'geo_100m' }
  }

  const city = cleanText(store.city)
  if (state && city && city.toLowerCase() !== 'unknown') {
    const rows = await sql`
      SELECT id::text
      FROM openclaw.stores
      WHERE chain_id = ${chainId}
        AND state = ${state}
        AND LOWER(TRIM(city)) = ${normalizeName(city)}
      ORDER BY updated_at DESC
      LIMIT 1
    `
    if (rows[0]) return { id: rows[0].id, matchedBy: 'chain_city_state' }
  }

  return null
}

async function createStore(chainId, store, storeType) {
  const hours = parseJsonOrNull(store.hoursJson)
  const [row] = await sql`
    INSERT INTO openclaw.stores (
      chain_id,
      external_store_id,
      name,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      phone,
      hours_json,
      store_type,
      last_cataloged_at,
      is_active
    )
    VALUES (
      ${chainId},
      ${cleanText(store.externalStoreId) || `pi-catalog-${store.piStoreId}`},
      ${cleanText(store.name) || 'Unknown Store'},
      ${cleanText(store.address)},
      ${cleanText(store.city) || 'Unknown'},
      ${normalizeState(store.state) || 'US'},
      ${cleanZip(store.zip)},
      ${toNumberOrNull(store.lat)},
      ${toNumberOrNull(store.lng)},
      ${cleanText(store.phone)},
      ${hours ? sql.json(hours) : null},
      ${storeType},
      NOW(),
      true
    )
    ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
      name = EXCLUDED.name,
      address = COALESCE(EXCLUDED.address, openclaw.stores.address),
      city = COALESCE(NULLIF(EXCLUDED.city, 'Unknown'), openclaw.stores.city),
      state = EXCLUDED.state,
      zip = COALESCE(NULLIF(EXCLUDED.zip, '00000'), openclaw.stores.zip),
      lat = COALESCE(EXCLUDED.lat, openclaw.stores.lat),
      lng = COALESCE(EXCLUDED.lng, openclaw.stores.lng),
      phone = COALESCE(EXCLUDED.phone, openclaw.stores.phone),
      hours_json = COALESCE(EXCLUDED.hours_json, openclaw.stores.hours_json),
      store_type = EXCLUDED.store_type,
      last_cataloged_at = NOW(),
      updated_at = NOW(),
      is_active = true
    RETURNING id::text
  `
  return row
}

async function mapProducts() {
  if ((await exists(PRODUCT_MAP_FILE)) && !RESET_CHECKPOINT) {
    if (checkpoint.products?.completed) {
      const existing = await loadProductMap()
      if (existing.size > 0) {
        log(`[products] loaded ${existing.size.toLocaleString()} completed product mappings from checkpoint`)
        return existing
      }
    }
    log('[products] ignoring partial product map; rebuilding')
  }

  log('[products] mapping Pi canonical ingredients to OpenClaw products')
  await removeIfExists(PRODUCT_MAP_FILE)

  const productMap = new Map()
  let processed = 0
  let matched = 0
  let created = 0
  let skipped = 0
  let batch = []

  for await (const ingredient of readJsonl(EXPORTS.canonical_ingredients)) {
    batch.push(normalizeIngredient(ingredient))
    if (batch.length >= BATCH_SIZE) {
      const result = await mapProductBatch(batch, productMap)
      matched += result.matched
      created += result.created
      skipped += result.skipped
      processed += batch.length
      if (processed % 5000 === 0) {
        log(`[products] ${processed.toLocaleString()} mapped (${matched} matched, ${created} created, ${skipped} skipped)`)
      }
      batch = []
    }
  }

  if (batch.length > 0) {
    const result = await mapProductBatch(batch, productMap)
    matched += result.matched
    created += result.created
    skipped += result.skipped
    processed += batch.length
  }

  const priceOnlyResult = await mapPriceOnlyProducts(productMap)
  matched += priceOnlyResult.matched
  created += priceOnlyResult.created
  skipped += priceOnlyResult.skipped
  processed += priceOnlyResult.processed

  log(`[products] done: ${processed.toLocaleString()} processed, ${matched.toLocaleString()} matched, ${created.toLocaleString()} created, ${skipped.toLocaleString()} skipped`)
  checkpoint.products = {
    completed: true,
    processed,
    matched,
    created,
    skipped,
    mapped: productMap.size,
  }
  await saveCheckpoint()
  return productMap
}

async function mapPriceOnlyProducts(productMap) {
  const missingByIngredientId = new Map()
  for await (const price of readJsonl(EXPORTS.current_prices)) {
    const ingredientId = String(price.canonicalIngredientId || '')
    if (!ingredientId || productMap.has(ingredientId) || missingByIngredientId.has(ingredientId)) continue
    missingByIngredientId.set(ingredientId, normalizePriceIngredient(price))
  }

  if (missingByIngredientId.size === 0) return { processed: 0, matched: 0, created: 0, skipped: 0 }

  log(`[products] found ${missingByIngredientId.size.toLocaleString()} price-only ingredient IDs; creating fallback product mappings`)
  let processed = 0
  let matched = 0
  let created = 0
  let skipped = 0
  let batch = []

  for (const ingredient of missingByIngredientId.values()) {
    batch.push(ingredient)
    if (batch.length >= BATCH_SIZE) {
      const result = await mapProductBatch(batch, productMap)
      matched += result.matched
      created += result.created
      skipped += result.skipped
      processed += batch.length
      batch = []
    }
  }

  if (batch.length > 0) {
    const result = await mapProductBatch(batch, productMap)
    matched += result.matched
    created += result.created
    skipped += result.skipped
    processed += batch.length
  }

  log(`[products] price-only mappings: ${processed.toLocaleString()} processed, ${matched.toLocaleString()} matched, ${created.toLocaleString()} created, ${skipped.toLocaleString()} skipped`)
  return { processed, matched, created, skipped }
}

async function mapProductBatch(batch, productMap) {
  await upsertCanonicalIngredients(batch)

  const matchedRows = await lookupProducts(batch)
  const matchedByIngredient = new Map(matchedRows.map((row) => [row.ingredientId, row.productId]))
  let matched = matchedByIngredient.size
  let created = 0
  let skipped = 0

  const missing = batch.filter((ingredient) => !matchedByIngredient.has(ingredient.ingredientId))
  if (missing.length > 0) {
    const uniqueByNorm = new Map()
    for (const ingredient of missing) {
      if (ingredient.normName && !uniqueByNorm.has(ingredient.normName)) {
        uniqueByNorm.set(ingredient.normName, ingredient)
      }
    }

    if (uniqueByNorm.size > 0) {
      const rows = [...uniqueByNorm.values()].map((ingredient) => ({
        name: ingredient.name,
        image_url: ingredient.offImageUrl,
        upc: ingredient.offBarcode,
        size_unit: ingredient.standardUnit,
        is_food: ingredient.isFood,
      }))

      await sql`
        INSERT INTO openclaw.products ${sql(rows, 'name', 'image_url', 'upc', 'size_unit', 'is_food')}
        ON CONFLICT DO NOTHING
      `
      created += rows.length
    }

    const afterInsertRows = await lookupProducts(missing)
    for (const row of afterInsertRows) matchedByIngredient.set(row.ingredientId, row.productId)
  }

  for (const ingredient of batch) {
    const productId = matchedByIngredient.get(ingredient.ingredientId)
    if (!productId) {
      skipped++
      continue
    }
    productMap.set(ingredient.ingredientId, productId)
    await appendJsonl(PRODUCT_MAP_FILE, {
      piIngredientId: ingredient.ingredientId,
      pgProductId: productId,
      normName: ingredient.normName,
    })
  }

  return { matched, created, skipped }
}

async function upsertCanonicalIngredients(batch) {
  const byIngredientId = new Map()
  for (const ingredient of batch) {
    byIngredientId.set(ingredient.ingredientId, {
      ingredient_id: ingredient.ingredientId,
      name: ingredient.name,
      category: ingredient.category,
      standard_unit: ingredient.standardUnit,
      off_image_url: ingredient.offImageUrl,
      off_barcode: ingredient.offBarcode,
    })
  }
  const rows = [...byIngredientId.values()]
  if (rows.length === 0) return

  await sql`
    INSERT INTO openclaw.canonical_ingredients ${sql(
      rows,
      'ingredient_id',
      'name',
      'category',
      'standard_unit',
      'off_image_url',
      'off_barcode',
    )}
    ON CONFLICT (ingredient_id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      standard_unit = EXCLUDED.standard_unit,
      off_image_url = EXCLUDED.off_image_url,
      off_barcode = EXCLUDED.off_barcode,
      updated_at = NOW()
  `
}

async function lookupProducts(batch) {
  const ids = batch.map((ingredient) => ingredient.ingredientId)
  const norms = batch.map((ingredient) => ingredient.normName)
  const names = batch.map((ingredient) => ingredient.name)
  const upcs = batch.map((ingredient) => ingredient.offBarcode)

  return await sql`
    WITH input AS (
      SELECT *
      FROM unnest(${ids}::text[], ${norms}::text[], ${names}::text[], ${upcs}::text[]) AS i(ingredient_id, norm_name, name, upc)
    )
    SELECT
      i.ingredient_id,
      p.id::text AS product_id
    FROM input i
    JOIN LATERAL (
      SELECT id
      FROM (
        (
        SELECT p.id, 1 AS priority
        FROM openclaw.products p
        WHERE LOWER(TRIM(BOTH FROM p.name)) = i.norm_name
          AND p.is_food = true
        LIMIT 1
        )

        UNION ALL

        (
        SELECT p.id, 2 AS priority
        FROM openclaw.products p
        WHERE p.name = i.name
        LIMIT 1
        )

        UNION ALL

        (
        SELECT p.id, 3 AS priority
        FROM openclaw.products p
        WHERE i.upc IS NOT NULL
          AND p.upc = i.upc
        LIMIT 1
        )
      ) candidate
      ORDER BY priority
      LIMIT 1
    ) p ON true
  `
}

async function importPrices({ chainCache, productMap, sourceById, storeContext }) {
  log('[prices] importing current_prices into openclaw.store_products')
  const started = Date.now()
  let currentGroup = null
  let groupStats = newGroupStats()
  let batch = []
  let processed = checkpoint.prices?.processed || 0
  let upserted = checkpoint.prices?.upserted || 0
  let skipped = checkpoint.prices?.skipped || 0
  let syntheticLogged = 0

  for await (const price of readJsonl(EXPORTS.current_prices)) {
    const groupKey = priceGroupKey(price)
    if (completedPriceGroups.has(groupKey)) continue

    if (currentGroup && currentGroup !== groupKey) {
      upserted += await flushPriceBatch(batch)
      batch = []
      checkpointGroup(currentGroup, groupStats)
      await saveCheckpoint()
      groupStats = newGroupStats()
    }
    currentGroup = groupKey

    processed++
    const productId = productMap.get(price.canonicalIngredientId)
    if (!productId || !isValidPrice(price.priceCents)) {
      skipped++
      groupStats.skipped++
      continue
    }

    const storeResolution = await resolvePriceStore(price, {
      chainCache,
      sourceById,
      storeContext,
    })
    if (!storeResolution?.storeId) {
      skipped++
      groupStats.skipped++
      continue
    }

    if (storeResolution.syntheticCreated && syntheticLogged !== storeContext.syntheticCreated) {
      syntheticLogged = storeContext.syntheticCreated
      if (syntheticLogged % 100 === 0) {
        log(`[prices] synthetic stores created: ${syntheticLogged.toLocaleString()}`)
      }
    }

    groupStats.accepted++
    batch.push(toStoreProductRow(price, storeResolution.storeId, productId))
    if (batch.length >= BATCH_SIZE) {
      upserted += await flushPriceBatch(batch)
      batch = []
    }

    if (processed % 25000 === 0) {
      checkpoint.prices = { processed, upserted, skipped }
      await saveCheckpoint()
      log(`[prices] ${processed.toLocaleString()} processed, ${upserted.toLocaleString()} upserted, ${skipped.toLocaleString()} skipped, ${elapsed(started)}`)
    }
  }

  if (batch.length > 0) {
    upserted += await flushPriceBatch(batch)
  }
  if (currentGroup) {
    checkpointGroup(currentGroup, groupStats)
  }

  checkpoint.prices = { processed, upserted, skipped }
  await saveCheckpoint()
  log(`[prices] done: ${processed.toLocaleString()} processed, ${upserted.toLocaleString()} upserted, ${skipped.toLocaleString()} skipped, ${elapsed(started)}`)
  log(`[prices] synthetic stores: ${storeContext.syntheticMatched.toLocaleString()} matched, ${storeContext.syntheticCreated.toLocaleString()} created`)
}

async function flushPriceBatch(batch) {
  if (batch.length === 0) return 0
  const uniqueRows = new Map()
  for (const row of batch) {
    uniqueRows.set(`${row.store_id}|${row.product_id}`, row)
  }
  const rows = [...uniqueRows.values()]

  await sql`
    INSERT INTO openclaw.store_products ${sql(
      rows,
      'store_id',
      'product_id',
      'price_cents',
      'sale_price_cents',
      'sale_ends_at',
      'in_stock',
      'source',
      'last_seen_at',
      'price_per_standard_unit_cents',
      'price_type',
      'observation_method',
      'is_sale',
      'baseline_price_cents',
    )}
    ON CONFLICT (store_id, product_id) DO UPDATE SET
      price_cents = EXCLUDED.price_cents,
      sale_price_cents = EXCLUDED.sale_price_cents,
      sale_ends_at = EXCLUDED.sale_ends_at,
      in_stock = EXCLUDED.in_stock,
      source = EXCLUDED.source,
      last_seen_at = EXCLUDED.last_seen_at,
      price_per_standard_unit_cents = EXCLUDED.price_per_standard_unit_cents,
      price_type = EXCLUDED.price_type,
      observation_method = EXCLUDED.observation_method,
      is_sale = EXCLUDED.is_sale,
      baseline_price_cents = EXCLUDED.baseline_price_cents
  `
  return rows.length
}

async function resolvePriceStore(price, { chainCache, sourceById, storeContext }) {
  const locationId = cleanText(price.locationId)
  if (locationId) {
    const direct = storeContext.mapByExternal.get(locationId) || storeContext.mapByPiId.get(locationId)
    if (direct) return { storeId: direct.pgStoreId, matchedBy: 'catalog_location_id' }
  }

  const source = sourceById.get(price.sourceId) || {}
  const sourceChain = price.sourceChainSlug || source.chainId || source.chainSlug
  const chainSlug = normalizeSlug(sourceChain || price.sourceId)
  const state = normalizeState(price.sourceState || source.state)
  const cityFromLocation = parseCityFromLocation(locationId, price.sourceId, sourceChain)

  if (chainSlug && state && cityFromLocation) {
    const cityKey = catalogCityKey(chainSlug, state, cityFromLocation)
    const stores = storeContext.catalogByChainStateCity.get(cityKey)
    if (stores?.length > 0) {
      return { storeId: stores[0].pgStoreId, matchedBy: 'catalog_chain_state_city' }
    }
  }

  const syntheticKey = [
    price.sourceId || 'unknown-source',
    locationId || state || 'global',
  ].join('|')
  if (storeContext.syntheticStoreCache.has(syntheticKey)) {
    return {
      storeId: storeContext.syntheticStoreCache.get(syntheticKey),
      matchedBy: 'synthetic_cache',
    }
  }

  const storeType = normalizeStoreType(null, chainSlug, price.sourceType || source.type)
  const chain = await ensureChain(
    chainCache,
    chainSlug,
    price.sourceName || source.name || sourceChain || price.sourceId,
    storeType,
    sourceTypeFromPriceSource(price.sourceType || source.type, storeType),
  )

  const inserted = await createSyntheticStore(chain.id, {
    sourceId: price.sourceId,
    locationId,
    sourceName: price.sourceName || source.name,
    sourceAddress: price.sourceAddress || source.address,
    sourceCity: price.sourceCity || source.city || cityFromLocation,
    sourceState: state,
    sourceZip: price.sourceZip || source.zip,
    sourceLat: price.sourceLat || source.lat,
    sourceLng: price.sourceLng || source.lng,
    sourcePhone: price.sourcePhone || source.phone,
    storeType,
  })

  storeContext.syntheticStoreCache.set(syntheticKey, inserted.id)
  if (inserted.created) storeContext.syntheticCreated++
  else storeContext.syntheticMatched++

  return {
    storeId: inserted.id,
    matchedBy: inserted.created ? 'synthetic_created' : 'synthetic_matched',
    syntheticCreated: inserted.created,
  }
}

async function createSyntheticStore(chainId, source) {
  const externalId = `pi-source:${source.sourceId || 'unknown'}:${source.locationId || 'global'}`
  const nameSuffix = source.locationId ? ` (${source.locationId})` : ''
  const name = cleanText(source.sourceName) || source.sourceId || 'Pi price source'

  const [row] = await sql`
    INSERT INTO openclaw.stores (
      chain_id,
      external_store_id,
      name,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      phone,
      store_type,
      last_cataloged_at,
      is_active
    )
    VALUES (
      ${chainId},
      ${externalId},
      ${`${name}${nameSuffix}`.slice(0, 240)},
      ${cleanText(source.sourceAddress)},
      ${cleanText(source.sourceCity) || 'Online'},
      ${source.sourceState || 'US'},
      ${cleanZip(source.sourceZip)},
      ${toNumberOrNull(source.sourceLat)},
      ${toNumberOrNull(source.sourceLng)},
      ${cleanText(source.sourcePhone)},
      ${source.storeType},
      NOW(),
      true
    )
    ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
      name = EXCLUDED.name,
      address = COALESCE(EXCLUDED.address, openclaw.stores.address),
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      zip = COALESCE(NULLIF(EXCLUDED.zip, '00000'), openclaw.stores.zip),
      lat = COALESCE(EXCLUDED.lat, openclaw.stores.lat),
      lng = COALESCE(EXCLUDED.lng, openclaw.stores.lng),
      phone = COALESCE(EXCLUDED.phone, openclaw.stores.phone),
      store_type = EXCLUDED.store_type,
      last_cataloged_at = NOW(),
      updated_at = NOW(),
      is_active = true
    RETURNING id::text, (xmax = 0) AS created
  `
  return row
}

function toStoreProductRow(price, storeId, productId) {
  const isSale = String(price.sourcePriceKind || '').toLowerCase().includes('sale')
  const priceCents = Number(price.priceCents)
  return {
    store_id: storeId,
    product_id: productId,
    price_cents: priceCents,
    sale_price_cents: isSale ? priceCents : null,
    sale_ends_at: validTimestampOrNull(price.saleEndDate),
    in_stock: price.inStock == null ? true : Boolean(Number(price.inStock)),
    source: `pi:${price.sourceId || 'unknown'}`,
    last_seen_at: validTimestampOrNow(price.lastConfirmedAt || price.lastChangedAt || price.createdAt),
    price_per_standard_unit_cents: toIntegerOrNull(price.pricePerStandardUnitCents),
    price_type: normalizePriceType(price),
    observation_method: normalizeObservationMethod(price),
    is_sale: isSale,
    baseline_price_cents: isSale ? null : priceCents,
  }
}

function normalizePriceType(price) {
  const tier = normalizeName(price.priceTier || price.sourcePricingTier)
  if (VALID_PRICE_TYPES.has(tier)) return tier

  const sourceType = normalizeName(price.sourceType)
  const confidence = normalizeName(price.confidence)
  const chainSlug = normalizeSlug(price.sourceChainSlug)

  if (sourceType.includes('government') || confidence.includes('government')) return 'commodity'
  if (tier.includes('wholesale')) return 'wholesale'
  if (tier.includes('farm')) return 'farm_direct'
  if (STORE_TYPE_BY_CHAIN[chainSlug] === 'club') return 'club'
  if (STORE_TYPE_BY_CHAIN[chainSlug] === 'convenience') return 'convenience'
  return 'retail'
}

function normalizeObservationMethod(price) {
  const confidence = normalizeName(price.confidence)
  const method = normalizeName(price.sourceScrapeMethod)
  const sourceType = normalizeName(price.sourceType)

  if (confidence.includes('government') || sourceType.includes('government')) return 'commodity'
  if (confidence.includes('receipt')) return 'receipt'
  if (confidence.includes('manual')) return 'manual'
  if (method.includes('api')) return 'api'
  if (method.includes('direct')) return 'scrape'
  return 'scrape'
}

async function verifyPostgres() {
  log('[verify] running coverage query')
  const rows = await sql`
    SELECT
      s.state,
      COUNT(DISTINCT s.id)::int AS stores_with_prices,
      COUNT(sp.id)::bigint AS total_prices
    FROM openclaw.stores s
    JOIN openclaw.store_products sp ON sp.store_id = s.id
    GROUP BY s.state
    ORDER BY total_prices DESC
    LIMIT 25
  `

  for (const row of rows) {
    log(`[verify] ${row.state}: ${row.storesWithPrices.toLocaleString()} stores, ${Number(row.totalPrices).toLocaleString()} prices`)
  }
}

async function writeSyncAudit() {
  try {
    await sql`
      INSERT INTO openclaw.sync_audit_log (
        sync_type,
        completed_at,
        records_processed,
        records_accepted,
        records_skipped,
        metadata
      )
      VALUES (
        'pi_price_bridge',
        NOW(),
        ${checkpoint.prices?.processed || 0},
        ${checkpoint.prices?.upserted || 0},
        ${checkpoint.prices?.skipped || 0},
        ${sql.json({
          pi_ssh: PI_SSH,
          pi_db: PI_DB,
          export_dir: EXPORT_DIR,
          completed_price_groups: checkpoint.completedPriceGroups?.length || 0,
        })}
      )
    `
  } catch (error) {
    log(`[audit] sync_audit_log unavailable: ${error.message}`)
  }
}

function normalizeIngredient(raw) {
  const name = cleanText(raw.name) || raw.ingredientId
  return {
    ingredientId: String(raw.ingredientId),
    name,
    normName: normalizeName(name),
    category: cleanText(raw.category),
    standardUnit: cleanText(raw.standardUnit),
    offImageUrl: cleanText(raw.offImageUrl),
    offBarcode: cleanText(raw.offBarcode),
    isFood: raw.isFood == null ? true : Boolean(Number(raw.isFood)),
  }
}

function normalizePriceIngredient(price) {
  const ingredientId = String(price.canonicalIngredientId)
  const name = cleanText(price.rawProductName) || ingredientId
  return {
    ingredientId,
    name,
    normName: normalizeName(name),
    category: null,
    standardUnit: cleanText(price.standardUnit),
    offImageUrl: cleanText(price.imageUrl),
    offBarcode: null,
    isFood: true,
  }
}

async function loadProductMap() {
  const map = new Map()
  for await (const row of readJsonl(PRODUCT_MAP_FILE)) {
    if (row.piIngredientId && row.pgProductId) map.set(row.piIngredientId, row.pgProductId)
  }
  return map
}

function checkpointGroup(groupKey, stats) {
  if (!completedPriceGroups.has(groupKey)) {
    completedPriceGroups.add(groupKey)
    checkpoint.completedPriceGroups = [...completedPriceGroups]
  }
  log(`[prices] group ${groupKey}: ${stats.accepted} accepted, ${stats.skipped} skipped`)
}

function priceGroupKey(price) {
  const chainSlug = normalizeSlug(price.sourceId || price.sourceChainSlug)
  const state = normalizeState(price.sourceState) || 'US'
  return `${chainSlug}|${state}`
}

function newGroupStats() {
  return { accepted: 0, skipped: 0 }
}

function addCatalogCityIndex(index, record) {
  if (!record.chainSlug || !record.state || !record.city) return
  if (record.city.toLowerCase() === 'unknown') return
  const key = catalogCityKey(record.chainSlug, record.state, record.city)
  if (!index.has(key)) index.set(key, [])
  index.get(key).push(record)
}

function catalogCityKey(chainSlug, state, city) {
  return `${normalizeSlug(chainSlug)}|${normalizeState(state)}|${normalizeName(city)}`
}

function getStateStats(statsByState, state) {
  if (!statsByState.has(state)) statsByState.set(state, { matched: 0, created: 0, skipped: 0 })
  return statsByState.get(state)
}

function parseCityFromLocation(locationId, sourceId, chainSlug) {
  if (!locationId) return null
  const candidates = [
    sourceId,
    chainSlug,
    normalizeSlug(sourceId).replaceAll('_', '-'),
    normalizeSlug(chainSlug).replaceAll('_', '-'),
  ].filter(Boolean)

  let value = String(locationId).toLowerCase()
  for (const prefix of candidates) {
    const raw = String(prefix).toLowerCase()
    if (value.startsWith(`${raw}-`)) {
      value = value.slice(raw.length + 1)
      break
    }
  }

  const cleaned = value.replace(/-/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : null
}

function normalizeSlug(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!raw) return 'pi_unknown_source'
  return CHAIN_SLUG_ALIASES[raw] || raw
}

function remoteShellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function titleFromSlug(slug) {
  return normalizeSlug(slug)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase()
  if (!state) return null
  return state.slice(0, 2)
}

function normalizeStoreType(storeType, chainSlug, sourceType) {
  const normalized = normalizeName(storeType).replace(/[^a-z0-9]+/g, '_')
  if (VALID_STORE_TYPES.has(normalized)) return normalized

  const slug = normalizeSlug(chainSlug)
  if (STORE_TYPE_BY_CHAIN[slug]) return STORE_TYPE_BY_CHAIN[slug]

  const source = normalizeName(sourceType)
  if (source.includes('government')) return 'online'
  if (source.includes('farm')) return 'farm'
  if (source.includes('distributor')) return 'distributor'
  if (source.includes('wholesale')) return 'wholesale'
  if (source.includes('club')) return 'club'
  if (source.includes('convenience')) return 'convenience'
  if (source.includes('specialty')) return 'specialty'
  if (source.includes('dollar')) return 'dollar'
  return 'retail'
}

function sourceTypeFromPriceSource(sourceType, storeType) {
  const source = normalizeName(sourceType)
  if (source.includes('government')) return 'government'
  return SOURCE_TYPE_BY_STORE_TYPE[storeType] || 'chain'
}

function cleanText(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function cleanZip(value) {
  return cleanText(value) || '00000'
}

function toNumber(value) {
  return Number(value)
}

function toNumberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toIntegerOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number) : null
}

function isValidPrice(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number < 1_000_000
}

function validTimestampOrNow(value) {
  const timestamp = validTimestampOrNull(value)
  return timestamp || new Date()
}

function validTimestampOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function parseJsonOrNull(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function* readJsonl(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    yield camelizeRow(JSON.parse(line))
  }
}

function camelizeRow(row) {
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    result[camelizeKey(key)] = value
  }
  return result
}

function camelizeKey(key) {
  return key.replace(/_([a-z0-9])/g, (_match, letter) => letter.toUpperCase())
}

async function loadJsonlArray(filePath) {
  const rows = []
  for await (const row of readJsonl(filePath)) rows.push(row)
  return rows
}

async function appendJsonl(filePath, value) {
  await fsp.appendFile(filePath, JSON.stringify(value) + '\n', 'utf8')
}

async function loadCheckpoint() {
  if (!(await exists(CHECKPOINT_FILE))) return checkpoint
  const raw = await fsp.readFile(CHECKPOINT_FILE, 'utf8')
  return { ...checkpoint, ...JSON.parse(raw) }
}

async function saveCheckpoint() {
  checkpoint.completedPriceGroups = [...completedPriceGroups]
  await fsp.writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf8')
}

async function acquireLock() {
  if (await exists(LOCK_FILE)) {
    const raw = await fsp.readFile(LOCK_FILE, 'utf8').catch(() => '{}')
    const lock = JSON.parse(raw || '{}')
    if (lock.pid && isProcessRunning(Number(lock.pid))) {
      throw new Error(`Another bridge-pi-prices process is already running (pid ${lock.pid})`)
    }
    await removeIfExists(LOCK_FILE)
  }

  await fsp.writeFile(
    LOCK_FILE,
    JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }, null, 2),
    'utf8',
  )
  lockAcquired = true
  process.on('exit', releaseLockSync)
  process.on('SIGINT', () => {
    releaseLockSync()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    releaseLockSync()
    process.exit(143)
  })
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function releaseLockSync() {
  if (!lockAcquired) return
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const raw = fs.readFileSync(LOCK_FILE, 'utf8')
      const lock = JSON.parse(raw || '{}')
      if (Number(lock.pid) === process.pid) fs.unlinkSync(LOCK_FILE)
    }
  } catch {
    // Best effort; stale locks are ignored on the next run if the PID is gone.
  }
  lockAcquired = false
}

async function exists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

async function fileSize(filePath) {
  const stat = await fsp.stat(filePath)
  return stat.size
}

async function removeIfExists(filePath) {
  if (await exists(filePath)) await fsp.unlink(filePath)
}

async function countLines(filePath) {
  let count = 0
  for await (const _row of readJsonl(filePath)) count++
  return count
}

function log(message) {
  const line = `${new Date().toISOString()} ${message}`
  console.log(line)
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8')
}

function elapsed(started) {
  const seconds = Math.round((Date.now() - started) / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function redactDbUrl(url) {
  return String(url).replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
}

main().catch(async (error) => {
  try {
    log(`Fatal: ${error.stack || error.message}`)
  } catch {
    console.error(error)
  }
  releaseLockSync()
  if (sql) await sql.end({ timeout: 5 }).catch(() => {})
  process.exit(1)
})
