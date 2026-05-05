#!/usr/bin/env node
/**
 * USDA SNAP Retailer Bulk Import
 *
 * Downloads and imports 250,000+ SNAP-authorized food retailers from
 * USDA FNS public data into openclaw.stores. This is the single biggest
 * store count expansion available: free, public, covers every state.
 *
 * Usage:
 *   node scripts/ingest-snap-retailers.mjs [--state MA] [--dry-run] [--resume] [--download-only]
 *
 * Data source: USDA FNS SNAP Store Locations (ArcGIS Feature Service)
 * API: https://services1.arcgis.com/RLQu0rK7h4kbsBq5/arcgis/rest/services/Store_Locations/FeatureServer/0/query
 */

import pg from 'postgres'
import { writeFileSync, readFileSync, existsSync, mkdirSync, createReadStream } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 5, idle_timeout: 30 })

const CSV_DOWNLOAD_URL = 'https://usda-snap-retailers-usda-fns.hub.arcgis.com/api/download/v1/items/8b260f9a10b0459aa441ad8588c2251c/csv?layers=0'
const DB_BATCH_SIZE = 500
const CACHE_DIR = '.openclaw-temp'
const CSV_FILE = join(CACHE_DIR, 'snap-retailers.csv')

// CLI args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const RESUME = args.includes('--resume')
const DOWNLOAD_ONLY = args.includes('--download-only')
const STATE_FILTER = args.includes('--state') ? args[args.indexOf('--state') + 1]?.toUpperCase() : null

// SNAP Store_Type -> openclaw store_type mapping
const SNAP_TYPE_MAP = {
  'Super Store': 'retail',
  'Supermarket': 'retail',
  'Large Grocery Store': 'retail',
  'Medium Grocery Store': 'retail',
  'Small Grocery Store': 'independent',
  'Convenience Store': 'convenience',
  'Combination Grocery/Other': 'retail',
  'Specialty Food Store': 'specialty',
  'Farmers Market': 'farm',
  'Wholesaler': 'wholesale',
  'Delivery Route': 'distributor',
  'Military Commissary': 'retail',
  'Direct Marketing Farmer': 'farm',
  'Meal Service': 'specialty',
}

// Known chain name patterns -> slug
const SNAP_BRAND_PATTERNS = [
  [/walmart|wal-mart/i, 'walmart'],
  [/kroger/i, 'kroger'],
  [/publix/i, 'publix'],
  [/safeway/i, 'safeway'],
  [/albertsons/i, 'albertsons'],
  [/h-e-b|heb\b/i, 'heb'],
  [/whole foods/i, 'whole_foods'],
  [/trader joe/i, 'trader_joes'],
  [/\baldi\b/i, 'aldi'],
  [/\blidl\b/i, 'lidl'],
  [/\btarget\b/i, 'target'],
  [/costco/i, 'costco'],
  [/sam'?s club/i, 'sams_club'],
  [/bj'?s/i, 'bjs'],
  [/food lion/i, 'food_lion'],
  [/giant eagle/i, 'giant_eagle'],
  [/giant food|giant\b/i, 'giant_food'],
  [/hannaford/i, 'hannaford'],
  [/market basket/i, 'market_basket'],
  [/shaw'?s/i, 'shaws'],
  [/wegmans/i, 'wegmans'],
  [/stop.{0,3}shop/i, 'stop_and_shop'],
  [/harris teeter/i, 'harris_teeter'],
  [/sprouts/i, 'sprouts'],
  [/hy-?vee/i, 'hy_vee'],
  [/winn.?dixie/i, 'winn_dixie'],
  [/piggly wiggly/i, 'piggly_wiggly'],
  [/save.?a.?lot/i, 'save_a_lot'],
  [/grocery outlet/i, 'grocery_outlet'],
  [/shoprite/i, 'shoprite'],
  [/food 4 less/i, 'food_4_less'],
  [/meijer/i, 'meijer'],
  [/winco/i, 'winco'],
  [/7-?eleven|7-?11/i, '7_eleven'],
  [/circle k/i, 'circle_k'],
  [/wawa\b/i, 'wawa'],
  [/sheetz/i, 'sheetz'],
  [/dollar general/i, 'dollar_general'],
  [/dollar tree/i, 'dollar_tree'],
  [/family dollar/i, 'family_dollar'],
  [/h.?mart/i, 'hmart'],
  [/99 ranch/i, '99_ranch'],
  [/restaurant depot/i, 'restaurant_depot'],
  [/smart.{0,3}final/i, 'smart_and_final'],
  [/price chopper/i, 'price_chopper'],
  [/big y/i, 'big_y'],
  [/food city/i, 'food_city'],
  [/cumberland farms/i, 'cumberland_farms'],
  [/royal farms/i, 'royal_farms'],
  [/walgreens/i, 'walgreens'],
  [/cvs/i, 'cvs'],
  [/casey'?s/i, 'caseys'],
]

// Brand -> store_type override
const BRAND_TYPE_OVERRIDE = {
  'walmart': 'retail',
  'costco': 'club', 'sams_club': 'club', 'bjs': 'club',
  'dollar_general': 'dollar', 'dollar_tree': 'dollar', 'family_dollar': 'dollar',
  '7_eleven': 'convenience', 'circle_k': 'convenience', 'wawa': 'convenience',
  'sheetz': 'convenience', 'cumberland_farms': 'convenience', 'royal_farms': 'convenience',
  'walgreens': 'convenience', 'cvs': 'convenience', 'caseys': 'convenience',
  'whole_foods': 'specialty', 'trader_joes': 'specialty', 'sprouts': 'specialty',
  'hmart': 'specialty', '99_ranch': 'specialty',
  'restaurant_depot': 'wholesale', 'smart_and_final': 'wholesale',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function matchChainSlug(storeName) {
  for (const [pattern, slug] of SNAP_BRAND_PATTERNS) {
    if (pattern.test(storeName)) return slug
  }
  return null
}

function getStoreType(snapType, chainSlug) {
  if (chainSlug && BRAND_TYPE_OVERRIDE[chainSlug]) return BRAND_TYPE_OVERRIDE[chainSlug]
  return SNAP_TYPE_MAP[snapType] || 'independent'
}

// ---------------------------------------------------------------------------
// Download CSV from USDA Hub
// ---------------------------------------------------------------------------

async function downloadCsv() {
  console.log('Downloading SNAP retailer CSV from USDA FNS Hub...')
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })

  const resp = await fetch(CSV_DOWNLOAD_URL, { signal: AbortSignal.timeout(120000) })
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`)

  const buffer = Buffer.from(await resp.arrayBuffer())
  writeFileSync(CSV_FILE, buffer)
  console.log(`  Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB to ${CSV_FILE}`)
}

// ---------------------------------------------------------------------------
// Parse CSV into records
// ---------------------------------------------------------------------------

function parseCsvLine(line, headers) {
  // Handle quoted fields with commas
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
    current += ch
  }
  fields.push(current.trim())

  const obj = {}
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = fields[i] || ''
  }
  return obj
}

async function loadCsvRecords() {
  if (!existsSync(CSV_FILE)) {
    await downloadCsv()
  }

  console.log(`  Parsing ${CSV_FILE}...`)
  const records = []
  const rl = createInterface({ input: createReadStream(CSV_FILE, 'utf-8'), crlfDelay: Infinity })

  let headers = null
  let lineNum = 0

  for await (const rawLine of rl) {
    lineNum++
    // Strip BOM from first line
    const line = lineNum === 1 ? rawLine.replace(/^\uFEFF/, '') : rawLine
    if (!line.trim()) continue

    if (!headers) {
      headers = line.split(',').map(h => h.trim())
      continue
    }

    const row = parseCsvLine(line, headers)

    // Apply state filter
    if (STATE_FILTER && row.State !== STATE_FILTER) continue

    records.push({
      record_id: row.Record_ID || row.ObjectId,
      name: row.Store_Name,
      address: row.Store_Street_Address,
      city: row.City,
      state: row.State,
      zip: row.Zip_Code,
      county: row.County,
      store_type: row.Store_Type,
      lat: parseFloat(row.Latitude) || null,
      lng: parseFloat(row.Longitude) || null,
    })
  }

  console.log(`  Parsed ${records.length} records${STATE_FILTER ? ` (filtered: ${STATE_FILTER})` : ''}`)
  return records
}

// ---------------------------------------------------------------------------
// Import to database
// ---------------------------------------------------------------------------

async function importToDatabase(records) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would import ${records.length} SNAP retailers`)
    const byState = {}
    for (const r of records) {
      byState[r.state] = (byState[r.state] || 0) + 1
    }
    console.log('  By state:')
    for (const [st, count] of Object.entries(byState).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${st}: ${count.toLocaleString()}`)
    }
    console.log(`\n  Total: ${records.length.toLocaleString()} stores across ${Object.keys(byState).length} states`)
    await sql.end()
    return
  }

  console.log(`Importing ${records.length.toLocaleString()} SNAP retailers into openclaw.stores...`)

  // Load existing chains
  const existingChains = await sql`SELECT id, slug FROM openclaw.chains`
  const chainMap = new Map(existingChains.map(c => [c.slug, c.id]))

  // Track what we already have for resume
  let existingSnapIds = new Set()
  if (RESUME) {
    const existing = await sql`
      SELECT external_store_id FROM openclaw.stores
      WHERE external_store_id LIKE 'snap-fns-%'
    `
    existingSnapIds = new Set(existing.map(r => r.external_store_id))
    console.log(`  Resume mode: ${existingSnapIds.size} SNAP stores already imported`)
  }

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < records.length; i += DB_BATCH_SIZE) {
    const batch = records.slice(i, i + DB_BATCH_SIZE)
    const rows = []

    for (const rec of batch) {
      if (!rec.record_id) { skipped++; continue }

      const externalId = `snap-fns-${rec.record_id}`
      if (RESUME && existingSnapIds.has(externalId)) { skipped++; continue }

      const storeName = rec.name?.trim()
      if (!storeName) { skipped++; continue }

      const state = rec.state?.trim().toUpperCase()
      if (!state || state.length !== 2) { skipped++; continue }

      const chainSlug = matchChainSlug(storeName)
      const storeType = getStoreType(rec.store_type, chainSlug)

      // Get or create chain
      let chainId
      if (chainSlug && chainMap.has(chainSlug)) {
        chainId = chainMap.get(chainSlug)
      } else {
        const indSlug = chainSlug || `independent_${state.toLowerCase()}`
        if (!chainMap.has(indSlug)) {
          const [newChain] = await sql`
            INSERT INTO openclaw.chains (slug, name, source_type, is_active)
            VALUES (${indSlug}, ${chainSlug ? storeName.split(/\s+/).slice(0, 2).join(' ') : `Independent (${state})`}, 'snap_fns', true)
            ON CONFLICT (slug) DO UPDATE SET updated_at = now()
            RETURNING id
          `
          chainMap.set(indSlug, newChain.id)
        }
        chainId = chainMap.get(indSlug)
      }

      rows.push({
        chain_id: chainId,
        external_store_id: externalId,
        name: storeName,
        address: rec.address?.trim() || null,
        city: rec.city?.trim() || 'Unknown',
        state: state,
        zip: rec.zip?.trim() || '00000',
        lat: rec.lat,
        lng: rec.lng,
        store_type: storeType,
        is_active: true,
      })
    }

    if (rows.length === 0) continue

    try {
      await sql`
        INSERT INTO openclaw.stores ${sql(rows, 'chain_id', 'external_store_id', 'name', 'address', 'city', 'state', 'zip', 'lat', 'lng', 'store_type', 'is_active')}
        ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, openclaw.stores.name),
          address = COALESCE(EXCLUDED.address, openclaw.stores.address),
          city = COALESCE(EXCLUDED.city, openclaw.stores.city),
          lat = COALESCE(EXCLUDED.lat, openclaw.stores.lat),
          lng = COALESCE(EXCLUDED.lng, openclaw.stores.lng),
          store_type = COALESCE(EXCLUDED.store_type, openclaw.stores.store_type),
          updated_at = now()
      `
      inserted += rows.length
    } catch (err) {
      errors += rows.length
      console.error(`  Error at batch ${i}: ${err.message}`)
    }

    if ((i + DB_BATCH_SIZE) % 10000 === 0 || i + DB_BATCH_SIZE >= records.length) {
      console.log(`  Progress: ${Math.min(i + DB_BATCH_SIZE, records.length).toLocaleString()}/${records.length.toLocaleString()} (inserted: ${inserted.toLocaleString()}, skipped: ${skipped.toLocaleString()}, errors: ${errors})`)
    }
  }

  console.log('\n--- SNAP Import Complete ---')
  console.log(`  Total records:  ${records.length.toLocaleString()}`)
  console.log(`  Inserted/Updated: ${inserted.toLocaleString()}`)
  console.log(`  Skipped:        ${skipped.toLocaleString()}`)
  console.log(`  Errors:         ${errors}`)

  // State coverage report
  const stateCounts = await sql`
    SELECT state, COUNT(*) as count
    FROM openclaw.stores
    WHERE external_store_id LIKE 'snap-fns-%'
    GROUP BY state ORDER BY count DESC
  `
  console.log(`\n  Coverage: ${stateCounts.length} states with SNAP retailer data`)
  const totalStores = await sql`SELECT COUNT(*) as count FROM openclaw.stores WHERE is_active = true`
  console.log(`  Total active stores in openclaw: ${totalStores[0].count.toLocaleString()}`)

  await sql.end()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== USDA SNAP Retailer Bulk Import ===')
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : DOWNLOAD_ONLY ? 'DOWNLOAD ONLY' : 'FULL IMPORT'}`)
  if (STATE_FILTER) console.log(`  State filter: ${STATE_FILTER}`)
  if (RESUME) console.log(`  Resume mode: ON`)
  console.log('')

  // Download CSV if not cached
  if (!existsSync(CSV_FILE) || args.includes('--force-download')) {
    await downloadCsv()
  } else {
    console.log(`  Using cached CSV: ${CSV_FILE}`)
  }

  if (DOWNLOAD_ONLY) {
    console.log('Download complete. Use without --download-only to import.')
    await sql.end()
    return
  }

  const records = await loadCsvRecords()
  await importToDatabase(records)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
