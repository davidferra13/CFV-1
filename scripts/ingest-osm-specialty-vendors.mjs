/**
 * OSM Specialty Vendor Ingestion
 *
 * Pulls specialty food vendor data from OpenStreetMap Overpass API.
 * Targets: butcher, fishmonger, greengrocer, deli, seafood, cheese,
 *          farm, organic, health_food, specialty food shops.
 *
 * Writes to national_vendors table in ChefFlow PostgreSQL.
 * Idempotent: uses osm_id for dedup.
 *
 * Usage:
 *   node scripts/ingest-osm-specialty-vendors.mjs              # full USA run
 *   node scripts/ingest-osm-specialty-vendors.mjs --state MA   # one state
 *   node scripts/ingest-osm-specialty-vendors.mjs --dry-run    # count only
 */

import { fileURLToPath } from 'url'
import path from 'path'
import { config } from 'dotenv'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const STATE_ARG = process.argv.find((a) => a.startsWith('--state='))?.split('=')[1]
  || (process.argv.indexOf('--state') >= 0 ? process.argv[process.argv.indexOf('--state') + 1] : null)

const sql = postgres(process.env.DATABASE_URL, { max: 3 })

// OSM shop tags that map to chef-relevant vendor types
const SHOP_TYPE_MAP = {
  butcher: 'butcher',
  fishmonger: 'fishmonger',
  seafood: 'fishmonger',
  greengrocer: 'greengrocer',
  farm: 'farm',
  deli: 'deli',
  cheese: 'cheese',
  dairy: 'cheese',
  organic: 'organic',
  health_food: 'organic',
  wholefoods: 'specialty',
  specialty: 'specialty',
  spices: 'specialty',
  pasta: 'specialty',
  wine: 'liquor',
  alcohol: 'liquor',
  beverages: 'liquor',
  bakery: 'bakery',
  pastry: 'bakery',
  confectionery: 'bakery',
}

// US states for full-country sweep (ISO 3166-2 codes)
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]

// Use multiple mirrors - rotate on failure
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
let mirrorIdx = 0
function getOverpassURL() {
  return OVERPASS_MIRRORS[mirrorIdx % OVERPASS_MIRRORS.length]
}

// Delay between state queries to be polite to the free Overpass API
const DELAY_MS = 2000

function buildQuery(state) {
  const shopTypes = Object.keys(SHOP_TYPE_MAP).join('|')
  // Use bounding box approach per state for reliability
  // ISO3166-2 area lookup can be slow/fail on busy servers
  return `
[out:json][timeout:90];
area["ISO3166-2"="US-${state}"]->.searchArea;
(
  node["shop"~"${shopTypes}",i](area.searchArea);
  way["shop"~"${shopTypes}",i](area.searchArea);
);
out center tags;`
}

function formatPhone(raw) {
  if (!raw) return null
  // Normalize to E.164-ish: strip non-digits, add +1 for US if 10 digits
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  if (digits.length > 7) return raw.trim() // keep as-is if international format
  return null
}

function extractVendor(element, state) {
  const tags = element.tags || {}
  const shop = tags.shop || ''
  const vendorType = SHOP_TYPE_MAP[shop.toLowerCase()] || 'specialty'

  const name = tags.name || tags['name:en'] || null
  if (!name) return null

  const lat = element.lat ?? element.center?.lat ?? null
  const lng = element.lon ?? element.center?.lon ?? null

  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || null
  if (!city) return null // skip if no city

  const phone = formatPhone(tags.phone || tags['contact:phone'] || tags['phone:US'] || null)
  const website = tags.website || tags['contact:website'] || tags.url || null
  const address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null
  const zip = tags['addr:postcode'] || null
  const osmId = `${element.type}/${element.id}`

  return { name, vendor_type: vendorType, address, city, state, zip, phone, website, lat, lng, osm_id: osmId }
}

async function fetchState(state) {
  const query = buildQuery(state)
  // Try each mirror once before giving up
  for (let attempt = 0; attempt < OVERPASS_MIRRORS.length; attempt++) {
    const url = OVERPASS_MIRRORS[(mirrorIdx + attempt) % OVERPASS_MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(100000),
      })
      if (!res.ok) {
        if (attempt < OVERPASS_MIRRORS.length - 1) continue
        throw new Error(`Overpass HTTP ${res.status}`)
      }
      const data = await res.json()
      mirrorIdx++ // rotate mirror for next state
      return data.elements || []
    } catch (err) {
      if (attempt < OVERPASS_MIRRORS.length - 1) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      throw err
    }
  }
  return []
}

async function upsertBatch(vendors) {
  if (vendors.length === 0) return 0
  let inserted = 0
  for (const v of vendors) {
    try {
      const result = await sql`
        INSERT INTO national_vendors (name, vendor_type, address, city, state, zip, phone, website, lat, lng, osm_id, source)
        VALUES (${v.name}, ${v.vendor_type}, ${v.address}, ${v.city}, ${v.state}, ${v.zip}, ${v.phone}, ${v.website}, ${v.lat}, ${v.lng}, ${v.osm_id}, 'osm')
        ON CONFLICT (osm_id, source) DO UPDATE SET
          name = EXCLUDED.name,
          phone = COALESCE(EXCLUDED.phone, national_vendors.phone),
          website = COALESCE(EXCLUDED.website, national_vendors.website),
          address = COALESCE(EXCLUDED.address, national_vendors.address),
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip = COALESCE(EXCLUDED.zip, national_vendors.zip),
          updated_at = now()
        RETURNING (xmax = 0) AS inserted
      `
      if (result[0]?.inserted) inserted++
    } catch (err) {
      // Skip individual failures (bad data, constraint violations)
      if (!err.message.includes('duplicate')) {
        console.error(`  [warn] ${err.message.slice(0, 80)}`)
      }
    }
  }
  return inserted
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

const statesToRun = STATE_ARG ? [STATE_ARG.toUpperCase()] : US_STATES

console.log(`OSM Specialty Vendor Ingestion${DRY_RUN ? ' (DRY RUN)' : ''}`)
console.log(`States: ${statesToRun.length === 51 ? 'All 50 states + DC' : statesToRun.join(', ')}`)
console.log()

let totalFetched = 0
let totalInserted = 0
let totalErrors = 0

for (const state of statesToRun) {
  process.stdout.write(`[${state}] Fetching...`)
  try {
    const elements = await fetchState(state)
    const vendors = elements.map((el) => extractVendor(el, state)).filter(Boolean)

    totalFetched += vendors.length
    process.stdout.write(` ${vendors.length} vendors`)

    if (!DRY_RUN && vendors.length > 0) {
      const inserted = await upsertBatch(vendors)
      totalInserted += inserted
      process.stdout.write(` (${inserted} new)`)
    }

    console.log()
  } catch (err) {
    console.log(` ERROR: ${err.message}`)
    totalErrors++
    if (totalErrors >= 5) {
      console.log('Too many errors, stopping.')
      break
    }
  }

  if (statesToRun.length > 1) {
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }
}

await sql.end()

console.log()
console.log(`Done.`)
console.log(`  Fetched: ${totalFetched} vendors`)
if (!DRY_RUN) console.log(`  Inserted/updated: ${totalInserted} new records`)
console.log(`  Errors: ${totalErrors} states failed`)
