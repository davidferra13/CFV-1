#!/usr/bin/env node

// Geofabrik Bulk Importer - Phase 1 of the two-phase acquisition strategy.
// Downloads per-state US OSM extracts from Geofabrik, streams each through
// filtering for food businesses, stores findings in the same format as
// OpenClaw's crawler, then syncs to Supabase.
//
// State-by-state approach: download one state PBF (~50-500MB each), parse it,
// save findings, delete the PBF, move to next. Resilient to network issues
// and light on disk. Resumes from where it left off.
//
// Usage:
//   node geofabrik-import.mjs              # Full run: all states + sync
//   node geofabrik-import.mjs --sync-only  # Skip download+parse, just sync
//   DRY_RUN=1 node geofabrik-import.mjs   # Parse but don't write files or sync

import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'

const __dirname = dirname(new URL(import.meta.url).pathname)
const FINDINGS_DIR = join(__dirname, 'crawler_findings')
const DATA_DIR = join(__dirname, 'data')
const PROGRESS_FILE = join(DATA_DIR, 'geofabrik-progress.json')
const LOG_FILE = join(__dirname, 'geofabrik-import.log')

const DRY_RUN = process.env.DRY_RUN === '1'
const SYNC_ONLY = process.argv.includes('--sync-only')

// Geofabrik per-state URL pattern
const GEOFABRIK_BASE = 'https://download.geofabrik.de/north-america/us'

// All 50 states + DC with Geofabrik slug names, ordered by priority
// (matches OpenClaw's regions.json priority order)
const STATES = [
  { code: 'MA', slug: 'massachusetts', name: 'Massachusetts' },
  { code: 'NH', slug: 'new-hampshire', name: 'New Hampshire' },
  { code: 'VT', slug: 'vermont', name: 'Vermont' },
  { code: 'ME', slug: 'maine', name: 'Maine' },
  { code: 'CT', slug: 'connecticut', name: 'Connecticut' },
  { code: 'RI', slug: 'rhode-island', name: 'Rhode Island' },
  { code: 'NY', slug: 'new-york', name: 'New York' },
  { code: 'NJ', slug: 'new-jersey', name: 'New Jersey' },
  { code: 'PA', slug: 'pennsylvania', name: 'Pennsylvania' },
  { code: 'DE', slug: 'delaware', name: 'Delaware' },
  { code: 'MD', slug: 'maryland', name: 'Maryland' },
  { code: 'VA', slug: 'virginia', name: 'Virginia' },
  { code: 'WV', slug: 'west-virginia', name: 'West Virginia' },
  { code: 'NC', slug: 'north-carolina', name: 'North Carolina' },
  { code: 'SC', slug: 'south-carolina', name: 'South Carolina' },
  { code: 'GA', slug: 'georgia', name: 'Georgia' },
  { code: 'FL', slug: 'florida', name: 'Florida' },
  { code: 'AL', slug: 'alabama', name: 'Alabama' },
  { code: 'MS', slug: 'mississippi', name: 'Mississippi' },
  { code: 'TN', slug: 'tennessee', name: 'Tennessee' },
  { code: 'KY', slug: 'kentucky', name: 'Kentucky' },
  { code: 'OH', slug: 'ohio', name: 'Ohio' },
  { code: 'IN', slug: 'indiana', name: 'Indiana' },
  { code: 'MI', slug: 'michigan', name: 'Michigan' },
  { code: 'IL', slug: 'illinois', name: 'Illinois' },
  { code: 'WI', slug: 'wisconsin', name: 'Wisconsin' },
  { code: 'MN', slug: 'minnesota', name: 'Minnesota' },
  { code: 'IA', slug: 'iowa', name: 'Iowa' },
  { code: 'MO', slug: 'missouri', name: 'Missouri' },
  { code: 'AR', slug: 'arkansas', name: 'Arkansas' },
  { code: 'LA', slug: 'louisiana', name: 'Louisiana' },
  { code: 'TX', slug: 'texas', name: 'Texas' },
  { code: 'OK', slug: 'oklahoma', name: 'Oklahoma' },
  { code: 'KS', slug: 'kansas', name: 'Kansas' },
  { code: 'NE', slug: 'nebraska', name: 'Nebraska' },
  { code: 'SD', slug: 'south-dakota', name: 'South Dakota' },
  { code: 'ND', slug: 'north-dakota', name: 'North Dakota' },
  { code: 'MT', slug: 'montana', name: 'Montana' },
  { code: 'WY', slug: 'wyoming', name: 'Wyoming' },
  { code: 'CO', slug: 'colorado', name: 'Colorado' },
  { code: 'NM', slug: 'new-mexico', name: 'New Mexico' },
  { code: 'AZ', slug: 'arizona', name: 'Arizona' },
  { code: 'UT', slug: 'utah', name: 'Utah' },
  { code: 'NV', slug: 'nevada', name: 'Nevada' },
  { code: 'ID', slug: 'idaho', name: 'Idaho' },
  { code: 'OR', slug: 'oregon', name: 'Oregon' },
  { code: 'WA', slug: 'washington', name: 'Washington' },
  { code: 'CA', slug: 'california', name: 'California' },
  { code: 'AK', slug: 'alaska', name: 'Alaska' },
  { code: 'HI', slug: 'hawaii', name: 'Hawaii' },
  { code: 'DC', slug: 'district-of-columbia', name: 'District of Columbia' },
]

// Same food tags as OpenClaw's Overpass queries
const FOOD_AMENITIES = new Set([
  'restaurant', 'cafe', 'fast_food', 'ice_cream',
  'bar', 'pub', 'food_court', 'biergarten'
])
const FOOD_SHOPS = new Set([
  'bakery', 'pastry', 'confectionery', 'deli', 'butcher',
  'cheese', 'chocolate', 'coffee', 'tea', 'seafood', 'farm'
])

// Same type mapping as sync.mjs
const TYPE_MAP = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  fast_food: 'fast_food',
  ice_cream: 'dessert',
  bar: 'bar',
  pub: 'bar',
  food_court: 'restaurant',
  biergarten: 'bar',
  bakery: 'bakery',
  pastry: 'bakery',
  confectionery: 'dessert',
  deli: 'deli',
  butcher: 'butcher',
  cheese: 'specialty',
  chocolate: 'dessert',
  coffee: 'cafe',
  tea: 'cafe',
  seafood: 'seafood',
  farm: 'farm',
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }) } catch {}
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

// ─── Progress tracking ──────────────────────────────────────────────────────

function loadProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    }
  } catch {}
  return {
    startedAt: new Date().toISOString(),
    completedStates: [],
    stateResults: {},
    totalBusinesses: 0,
    lastUpdated: new Date().toISOString(),
  }
}

function saveProgress(progress) {
  progress.lastUpdated = new Date().toISOString()
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ─── Download one state PBF ─────────────────────────────────────────────────

function downloadState(state) {
  const url = `${GEOFABRIK_BASE}/${state.slug}-latest.osm.pbf`
  const pbfFile = join(__dirname, `${state.slug}-latest.osm.pbf`)

  log(`Downloading ${state.name} from Geofabrik...`)

  try {
    execSync(
      `wget -c -q --show-progress -O "${pbfFile}" "${url}"`,
      { stdio: 'inherit', timeout: 1800000 } // 30 min max per state
    )
  } catch (err) {
    // wget might exit non-zero even on success in some cases
    if (existsSync(pbfFile) && statSync(pbfFile).size > 1000) {
      log(`wget exited with error but file exists, continuing`)
    } else {
      throw new Error(`Failed to download ${state.name}: ${err.message}`)
    }
  }

  const size = statSync(pbfFile).size
  log(`Downloaded ${state.name}: ${formatBytes(size)}`)
  return pbfFile
}

// ─── Parse PBF ──────────────────────────────────────────────────────────────

function isFoodBusiness(tags) {
  if (!tags || !tags.name || tags.name.trim().length < 2) return false
  if (tags.amenity && FOOD_AMENITIES.has(tags.amenity)) return true
  if (tags.shop && FOOD_SHOPS.has(tags.shop)) return true
  return false
}

function parseOSMElement(type, id, tags, lat, lon) {
  return {
    osm_id: `${type}/${id}`,
    name: tags.name?.trim(),
    amenity: tags.amenity || null,
    shop: tags.shop || null,
    cuisine: tags.cuisine || null,
    address: {
      street: tags['addr:street'] || null,
      housenumber: tags['addr:housenumber'] || null,
      city: tags['addr:city'] || tags['addr:suburb'] || null,
      state: tags['addr:state'] || null,
      postcode: tags['addr:postcode'] || null,
      country: tags['addr:country'] || null,
    },
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || tags.url || null,
    email: tags['contact:email'] || tags.email || null,
    opening_hours: tags.opening_hours || null,
    wheelchair: tags.wheelchair || null,
    outdoor_seating: tags.outdoor_seating || null,
    takeaway: tags.takeaway || null,
    delivery: tags.delivery || null,
    diet_vegan: tags['diet:vegan'] || null,
    diet_vegetarian: tags['diet:vegetarian'] || null,
    diet_gluten_free: tags['diet:gluten_free'] || null,
    stars: tags.stars || null,
    capacity: tags.capacity || null,
    description: tags.description || null,
    lat: lat || null,
    lon: lon || null,
  }
}

async function parsePBF(pbfFile, stateCode) {
  // Dynamic import of the parser
  let createParser
  try {
    const mod = await import('osm-pbf-parser')
    createParser = mod.default || mod
  } catch (err) {
    log(`ERROR: osm-pbf-parser not installed. Run: npm install osm-pbf-parser`)
    throw err
  }

  const parser = createParser()
  const fileStream = createReadStream(pbfFile)

  const byCityMap = {} // { city: [businesses] }
  let totalFound = 0
  let totalNodes = 0
  let lastLogTime = Date.now()

  return new Promise((resolve, reject) => {
    fileStream
      .pipe(parser)
      .on('data', (items) => {
        for (const item of items) {
          if (item.type === 'node') {
            totalNodes++
            const tags = item.tags || {}

            if (isFoodBusiness(tags)) {
              const biz = parseOSMElement('node', item.id, tags, item.lat, item.lon)
              // Override state to the known state code for this file
              biz.address.state = biz.address.state || stateCode
              const city = biz.address.city || '_unknown'
              if (!byCityMap[city]) byCityMap[city] = []
              byCityMap[city].push(biz)
              totalFound++
            }
          }

          // Log progress every 30s
          const now = Date.now()
          if (now - lastLogTime > 30000) {
            log(`  ...parsed ${(totalNodes / 1e6).toFixed(1)}M nodes, ${totalFound.toLocaleString()} food businesses`)
            lastLogTime = now
          }
        }
      })
      .on('end', () => {
        log(`  Parsed ${(totalNodes / 1e6).toFixed(1)}M nodes, found ${totalFound.toLocaleString()} food businesses`)
        resolve({ byCityMap, totalFound, totalNodes })
      })
      .on('error', (err) => {
        log(`  Parse error: ${err.message}`)
        reject(err)
      })
  })
}

// ─── Save findings for one state ────────────────────────────────────────────

function saveStateFindings(stateCode, byCityMap) {
  if (DRY_RUN) {
    const count = Object.values(byCityMap).reduce((sum, arr) => sum + arr.length, 0)
    log(`  [DRY RUN] Would save ${count} businesses for ${stateCode}`)
    return 0
  }

  const stateDir = join(FINDINGS_DIR, 'US', stateCode)
  mkdirSync(stateDir, { recursive: true })

  let totalNew = 0

  for (const [city, businesses] of Object.entries(byCityMap)) {
    const safeCity = city.replace(/[^a-zA-Z0-9 .-]/g, '').replace(/\s+/g, '_').toLowerCase()
    const filePath = join(stateDir, `${safeCity}.json`)

    // Merge with existing (OpenClaw may have already crawled some)
    let existing = []
    try {
      if (existsSync(filePath)) {
        existing = JSON.parse(readFileSync(filePath, 'utf-8'))
      }
    } catch { existing = [] }

    const existingIds = new Set(existing.map((b) => b.osm_id))
    const newBiz = businesses.filter((b) => !existingIds.has(b.osm_id))

    if (newBiz.length > 0) {
      const merged = [...existing, ...newBiz]
      writeFileSync(filePath, JSON.stringify(merged, null, 2))
      totalNew += newBiz.length
    }
  }

  log(`  Saved ${totalNew.toLocaleString()} new businesses to disk`)
  return totalNew
}

// ─── Sync to Supabase ───────────────────────────────────────────────────────

async function syncFindings() {
  if (DRY_RUN) {
    log('[DRY RUN] Would sync to Supabase')
    return
  }

  log('Syncing all findings to Supabase...')
  const { syncToSupabase } = await import('./lib/sync.mjs')
  const result = await syncToSupabase()
  log(`Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()

  log('='.repeat(60))
  log('Geofabrik Bulk Import - Phase 1 Acquisition')
  log('State-by-state: download, parse, save, delete, next')
  log('='.repeat(60))
  if (DRY_RUN) log('*** DRY RUN MODE ***')
  if (SYNC_ONLY) log('*** SYNC ONLY ***')
  log('')

  try {
    if (!SYNC_ONLY) {
      const progress = loadProgress()
      const completedSet = new Set(progress.completedStates)

      log(`${completedSet.size}/${STATES.length} states already done`)

      for (const state of STATES) {
        if (completedSet.has(state.code)) {
          continue
        }

        log('')
        log(`--- ${state.name} (${state.code}) ---`)
        const stateStart = Date.now()

        let pbfFile
        try {
          // Download
          pbfFile = downloadState(state)

          // Parse
          const { byCityMap, totalFound } = await parsePBF(pbfFile, state.code)

          // Save
          const saved = saveStateFindings(state.code, byCityMap)

          // Record progress
          progress.completedStates.push(state.code)
          progress.stateResults[state.code] = {
            completedAt: new Date().toISOString(),
            businessesFound: totalFound,
            newBusinessesSaved: saved,
            duration: formatDuration(Date.now() - stateStart),
          }
          progress.totalBusinesses += saved
          saveProgress(progress)

          // Clean up PBF to save disk
          try { unlinkSync(pbfFile) } catch {}

          log(`  Done in ${formatDuration(Date.now() - stateStart)} [${progress.completedStates.length}/${STATES.length}]`)

        } catch (err) {
          log(`  ERROR on ${state.name}: ${err.message}`)
          log(`  Skipping to next state...`)
          // Clean up partial download
          if (pbfFile) try { unlinkSync(pbfFile) } catch {}
          // Save progress so we can resume
          saveProgress(progress)
          continue
        }
      }

      log('')
      log(`All states processed. ${progress.completedStates.length}/${STATES.length} succeeded.`)
    }

    // Final sync
    await syncFindings()

    const elapsed = Date.now() - startTime
    log('')
    log('='.repeat(60))
    log(`Geofabrik import complete in ${formatDuration(elapsed)}`)
    log('='.repeat(60))
    log('')
    log('Restart OpenClaw for ongoing long-tail refresh:')
    log('  sudo systemctl start openclaw')

  } catch (err) {
    log(`FATAL: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

main()
