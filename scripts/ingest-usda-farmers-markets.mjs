#!/usr/bin/env node
/**
 * Farmers Market Ingestion via OpenStreetMap
 *
 * Queries OSM Overpass for all farmers markets, food markets, and
 * marketplace amenities across the US. Inserts into openclaw.farmers_markets
 * AND openclaw.stores for unified search.
 *
 * Usage:
 *   node scripts/ingest-usda-farmers-markets.mjs [--state MA] [--dry-run]
 */

import pg from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 5, idle_timeout: 30 })

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
let currentOverpassIdx = 0

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const STATE_FILTER = args.includes('--state') ? args[args.indexOf('--state') + 1]?.toUpperCase() : null

// US bounding box (continental + AK + HI handled per-state)
const STATE_BBOXES = {
  AL: [30.22, -88.47, 35.01, -84.89], AK: [51.21, -179.15, 71.39, -129.98],
  AZ: [31.33, -114.81, 37.00, -109.04], AR: [33.00, -94.62, 36.50, -89.64],
  CA: [32.53, -124.41, 42.01, -114.13], CO: [36.99, -109.06, 41.00, -102.04],
  CT: [40.95, -73.73, 42.05, -71.79], DE: [38.45, -75.79, 39.84, -75.05],
  DC: [38.79, -77.12, 38.99, -76.91], FL: [24.40, -87.63, 31.00, -80.03],
  GA: [30.36, -85.61, 35.00, -80.84], HI: [18.91, -160.24, 22.24, -154.81],
  ID: [41.99, -117.24, 49.00, -111.04], IL: [36.97, -91.51, 42.51, -87.50],
  IN: [37.77, -88.10, 41.76, -84.78], IA: [40.37, -96.64, 43.50, -90.14],
  KS: [36.99, -102.05, 40.00, -94.59], KY: [36.50, -89.57, 39.15, -81.96],
  LA: [28.93, -94.04, 33.02, -89.00], ME: [43.06, -71.08, 47.46, -66.95],
  MD: [37.91, -79.49, 39.72, -75.05], MA: [41.24, -73.51, 42.89, -69.93],
  MI: [41.70, -90.42, 48.26, -82.41], MN: [43.50, -97.24, 49.38, -89.49],
  MS: [30.17, -91.66, 34.99, -88.10], MO: [35.99, -95.77, 40.61, -89.10],
  MT: [44.36, -116.05, 49.00, -104.04], NE: [39.99, -104.05, 43.00, -95.31],
  NV: [35.00, -120.01, 42.00, -114.04], NH: [42.70, -72.56, 45.30, -70.70],
  NJ: [38.93, -75.56, 41.36, -73.89], NM: [31.33, -109.05, 37.00, -103.00],
  NY: [40.50, -79.76, 45.01, -71.86], NC: [33.84, -84.32, 36.59, -75.46],
  ND: [45.94, -104.05, 49.00, -96.55], OH: [38.40, -84.82, 41.98, -80.52],
  OK: [33.62, -103.00, 37.00, -94.43], OR: [41.99, -124.57, 46.29, -116.46],
  PA: [39.72, -80.52, 42.27, -74.69], RI: [41.15, -71.86, 42.02, -71.12],
  SC: [32.05, -83.35, 35.22, -78.54], SD: [42.48, -104.06, 45.94, -96.44],
  TN: [34.98, -90.31, 36.68, -81.65], TX: [25.84, -106.65, 36.50, -93.51],
  UT: [36.99, -114.05, 42.00, -109.04], VT: [42.73, -73.44, 45.02, -71.46],
  VA: [36.54, -83.68, 39.47, -75.24], WA: [45.54, -124.85, 49.00, -116.92],
  WV: [37.20, -82.64, 40.64, -77.72], WI: [42.49, -92.89, 47.08, -86.25],
  WY: [40.99, -111.06, 45.00, -104.05],
}

const VALID_STATES = new Set(Object.keys(STATE_BBOXES))

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function queryOverpass(queryStr) {
  for (let attempt = 0; attempt < OVERPASS_URLS.length; attempt++) {
    const url = OVERPASS_URLS[(currentOverpassIdx + attempt) % OVERPASS_URLS.length]
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ChefFlow-PIE-StoreIngestion/1.0 (contact: davidferra13@gmail.com)',
        },
        body: 'data=' + encodeURIComponent(queryStr),
        signal: AbortSignal.timeout(210000),
      })
      const text = await resp.text()
      if (!resp.ok || text.includes('too busy') || text.includes('Too Many Requests')) {
        console.log(`    ${url.split('/')[2]} busy (${resp.status}), trying next...`)
        continue
      }
      try {
        const json = JSON.parse(text)
        currentOverpassIdx = (currentOverpassIdx + attempt) % OVERPASS_URLS.length
        return json
      } catch {
        console.log(`    ${url.split('/')[2]} returned invalid JSON, trying next...`)
        continue
      }
    } catch (err) {
      console.log(`    ${url.split('/')[2]} error: ${err.message}`)
      continue
    }
  }
  return null
}

// Query OSM for ALL market-type locations in a state bbox
function buildMarketQuery(bbox) {
  const [s, w, n, e] = bbox
  return `[out:json][timeout:180];
(
  node["amenity"="marketplace"](${s},${w},${n},${e});
  way["amenity"="marketplace"](${s},${w},${n},${e});
  node["shop"="farm"](${s},${w},${n},${e});
  way["shop"="farm"](${s},${w},${n},${e});
  node["name"~"[Ff]armer.*[Mm]arket"](${s},${w},${n},${e});
  way["name"~"[Ff]armer.*[Mm]arket"](${s},${w},${n},${e});
  node["name"~"[Ff]ood.*[Cc]o-?op"](${s},${w},${n},${e});
  way["name"~"[Ff]ood.*[Cc]o-?op"](${s},${w},${n},${e});
);
out center;`
}

function extractMarket(element, assignedState) {
  const tags = element.tags || {}
  const lat = element.lat || element.center?.lat
  const lon = element.lon || element.center?.lon
  if (!lat || !lon) return null

  const name = tags.name || tags.brand || tags.operator
  if (!name) return null

  let rawState = tags['addr:state']?.toUpperCase()?.trim()?.slice(0, 2) || null
  if (rawState && !VALID_STATES.has(rawState)) rawState = null
  const state = rawState || assignedState

  // Parse opening hours for schedule
  const schedule = tags.opening_hours || null

  // Parse season from opening_hours if available (e.g., "May-Oct: Sa 08:00-13:00")
  let seasonStart = null
  let seasonEnd = null
  if (schedule) {
    const seasonMatch = schedule.match(/(\w{3})-(\w{3})/)
    if (seasonMatch) {
      const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }
      seasonStart = months[seasonMatch[1]] || null
      seasonEnd = months[seasonMatch[2]] || null
    }
  }

  return {
    osmId: String(element.id),
    osmType: element.type,
    name: name.trim(),
    address: tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : null,
    city: tags['addr:city'] || '',
    state,
    zip: tags['addr:postcode'] || null,
    lat,
    lng: lon,
    website: tags.website || tags['contact:website'] || null,
    schedule,
    seasonStart,
    seasonEnd,
    productsAvailable: null, // OSM doesn't have this
    usdaId: null,
  }
}

async function insertMarkets(markets) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would insert ${markets.length} markets`)
    return { inserted: 0 }
  }

  let inserted = 0

  // Ensure chain for farmers markets in stores table
  const [chain] = await sql`
    INSERT INTO openclaw.chains (slug, name, source_type, is_active)
    VALUES ('osm_farmers_market', 'Farmers Market (OSM)', 'farm', true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `

  for (const m of markets) {
    try {
      // Insert into farmers_markets (use osm ID as usda_id field for dedup)
      const fmUsdaId = `osm-${m.osmType}-${m.osmId}`
      await sql`
        INSERT INTO openclaw.farmers_markets (
          name, address, city, state, zip, lat, lng,
          website, schedule, season_start, season_end,
          products_available, usda_id, is_active
        ) VALUES (
          ${m.name}, ${m.address}, ${m.city || 'Unknown'}, ${m.state}, ${m.zip},
          ${m.lat}, ${m.lng}, ${m.website}, ${m.schedule},
          ${m.seasonStart}, ${m.seasonEnd},
          ${m.productsAvailable}, ${fmUsdaId}, true
        )
        ON CONFLICT (usda_id) DO UPDATE SET
          name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          website = EXCLUDED.website, schedule = EXCLUDED.schedule,
          updated_at = now()
      `

      // Also insert into stores
      await sql`
        INSERT INTO openclaw.stores (
          chain_id, external_store_id, name, address, city, state, zip,
          lat, lng, store_type, is_active
        ) VALUES (
          ${chain.id}, ${fmUsdaId}, ${m.name},
          ${m.address}, ${m.city || 'Unknown'}, ${m.state}, ${m.zip},
          ${m.lat}, ${m.lng}, 'farm', true
        )
        ON CONFLICT (chain_id, external_store_id) DO UPDATE SET
          name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          updated_at = now()
      `
      inserted++
    } catch (err) {
      // skip errors silently
    }
  }
  return { inserted }
}

async function main() {
  console.log('=== Farmers Market Ingestion (OSM) ===')
  console.log(`State filter: ${STATE_FILTER || 'ALL'}`)
  console.log(`Dry run: ${DRY_RUN}\n`)

  const states = STATE_FILTER ? [STATE_FILTER] : Object.keys(STATE_BBOXES)
  const allMarkets = []

  for (const state of states) {
    const bbox = STATE_BBOXES[state]
    if (!bbox) { console.log(`  Unknown state: ${state}`); continue }

    process.stdout.write(`  ${state}... `)
    const query = buildMarketQuery(bbox)
    const result = await queryOverpass(query)

    if (!result) {
      console.log('FAILED (all mirrors busy)')
      await sleep(30000)
      continue
    }

    const elements = result.elements || []
    const markets = elements.map(e => extractMarket(e, state)).filter(Boolean)

    // Deduplicate by OSM ID
    const seen = new Set()
    const unique = markets.filter(m => {
      const key = `${m.osmType}-${m.osmId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    allMarkets.push(...unique)
    console.log(`${unique.length} markets`)

    await sleep(10000) // be polite to Overpass
  }

  console.log(`\nTotal: ${allMarkets.length} farmers markets found`)

  const byState = {}
  for (const m of allMarkets) {
    byState[m.state] = (byState[m.state] || 0) + 1
  }
  const sorted = Object.entries(byState).sort((a, b) => b[1] - a[1])
  console.log('\nBy state:')
  for (const [st, cnt] of sorted) {
    console.log(`  ${st}: ${cnt}`)
  }

  const { inserted } = await insertMarkets(allMarkets)
  console.log(`\nInserted: ${inserted} markets (into both farmers_markets and stores)`)

  if (!DRY_RUN) {
    const [fm] = await sql`SELECT count(*)::int as total FROM openclaw.farmers_markets`
    const [st] = await sql`SELECT count(*)::int as total FROM openclaw.stores WHERE is_active`
    console.log(`Farmers markets table: ${fm.total}`)
    console.log(`Total stores: ${st.total}`)
  }

  await sql.end()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
