#!/usr/bin/env node

// Import OpenClaw crawler enriched findings into directory_listings table.
// Source: F:/Pi-Backup/home/archive/openclaw-crawler-era/openclaw-workspace.tar.gz
// Contains ~15,856 city JSON files with ~200K enriched US food business records.
//
// Usage: node scripts/import-crawler-data.mjs [--dry-run] [--limit=N] [--state=XX]
//
// Idempotent: uses osm_id for dedup (ON CONFLICT DO NOTHING).
// Safe to re-run.

import { execSync } from 'child_process'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, readdirSync, readFileSync, rmSync, existsSync } from 'fs'
import postgres from 'postgres'

// ─── Config ─────────────────────────────────────────────────────────────────

const ARCHIVE_PATH = 'F:/Pi-Backup/home/archive/openclaw-crawler-era/openclaw-workspace.tar.gz'
const BATCH_SIZE = 500
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = args.find(a => a.startsWith('--limit='))?.split('=')[1]
const STATE_FILTER = args.find(a => a.startsWith('--state='))?.split('=')[1]?.toUpperCase()

// ─── Cuisine Mapping (OSM -> ChefFlow) ──────────────────────────────────────

const CUISINE_MAP = {
  italian: 'italian',
  mexican: 'mexican', 'tex-mex': 'mexican', 'tex_mex': 'mexican',
  japanese: 'japanese', sushi: 'japanese',
  chinese: 'chinese',
  thai: 'thai',
  indian: 'indian',
  french: 'french',
  mediterranean: 'mediterranean', greek: 'mediterranean', turkish: 'mediterranean',
  korean: 'korean',
  vietnamese: 'vietnamese', pho: 'vietnamese',
  caribbean: 'caribbean', jamaican: 'caribbean', cuban: 'caribbean',
  middle_eastern: 'middle_eastern', lebanese: 'middle_eastern', persian: 'middle_eastern',
  southern: 'southern', soul_food: 'southern',
  barbecue: 'bbq', bbq: 'bbq',
  seafood: 'seafood', fish: 'seafood',
  vegan: 'vegan', vegetarian: 'vegan',
  american: 'american', burger: 'american', diner: 'american', pizza: 'american', steak: 'american',
  bakery: 'desserts', pastry: 'desserts', ice_cream: 'desserts', donut: 'desserts',
  fusion: 'fusion', international: 'fusion', regional: 'fusion',
}

// ─── Business Type Mapping (OSM -> ChefFlow) ────────────────────────────────

const BUSINESS_TYPE_MAP = {
  restaurant: 'restaurant',
  cafe: 'restaurant',
  pub: 'restaurant',
  bar: 'restaurant',
  fast_food: 'restaurant',
  food_court: 'restaurant',
  deli: 'restaurant',
  ice_cream: 'restaurant',
  bakery: 'bakery',
  pastry_shop: 'bakery',
  confectionery: 'bakery',
  catering: 'caterer',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapCuisines(record) {
  const cuisines = new Set()

  // From the cuisine field (can be semicolon or comma separated)
  if (record.cuisine) {
    const parts = record.cuisine.split(/[;,]/).map(s => s.trim().toLowerCase().replace(/\s+/g, '_'))
    for (const p of parts) {
      const mapped = CUISINE_MAP[p]
      if (mapped) cuisines.add(mapped)
    }
  }

  // From categories array
  if (record.categories && Array.isArray(record.categories)) {
    for (const cat of record.categories) {
      const key = cat.toLowerCase().replace(/\s+/g, '_')
      const mapped = CUISINE_MAP[key]
      if (mapped) cuisines.add(mapped)
    }
  }

  if (cuisines.size === 0) cuisines.add('other')
  return Array.from(cuisines)
}

function mapBusinessType(record) {
  const amenity = (record.amenity || '').toLowerCase()
  const shop = (record.shop || '').toLowerCase()
  const aiType = record.ai_classification?.business_type?.toLowerCase().replace(/\s+/g, '_') || ''

  // Try amenity first
  if (BUSINESS_TYPE_MAP[amenity]) return BUSINESS_TYPE_MAP[amenity]
  if (BUSINESS_TYPE_MAP[shop]) return BUSINESS_TYPE_MAP[shop]
  if (BUSINESS_TYPE_MAP[aiType]) return BUSINESS_TYPE_MAP[aiType]

  // AI classification keywords
  if (aiType.includes('bak')) return 'bakery'
  if (aiType.includes('cater')) return 'caterer'
  if (aiType.includes('truck')) return 'food_truck'
  if (aiType.includes('prep')) return 'meal_prep'

  return 'restaurant'
}

function buildAddress(record) {
  const parts = []
  if (record.address?.housenumber) parts.push(record.address.housenumber)
  if (record.address?.street) parts.push(record.address.street)
  return parts.join(' ') || null
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ─── Extract Archive ─────────────────────────────────────────────────────────

function extractArchive() {
  const extractDir = join(tmpdir(), 'openclaw-import-' + Date.now())
  mkdirSync(extractDir, { recursive: true })

  console.log(`Extracting enriched_findings from archive to ${extractDir}...`)

  try {
    // Convert Windows drive paths (F:/) to MSYS/Git Bash paths (/f/) for tar
    const archivePath = ARCHIVE_PATH.replace(/^([A-Z]):/i, (_, d) => '/' + d.toLowerCase()).replace(/\\/g, '/')
    const destPath = extractDir.replace(/\\/g, '/').replace(/^([A-Z]):/i, (_, d) => '/' + d.toLowerCase())
    execSync(
      `tar -xzf "${archivePath}" -C "${destPath}" "openclaw/enriched_findings/"`,
      { stdio: 'pipe', maxBuffer: 1024 * 1024 * 50, shell: 'bash' }
    )
  } catch (err) {
    console.error('Failed to extract archive:', err.message)
    process.exit(1)
  }

  const findingsDir = join(extractDir, 'openclaw', 'enriched_findings', 'US')
  if (!existsSync(findingsDir)) {
    console.error('No US enriched findings found in archive')
    rmSync(extractDir, { recursive: true, force: true })
    process.exit(1)
  }

  return { extractDir, findingsDir }
}

// ─── Collect All Records ─────────────────────────────────────────────────────

function collectRecords(findingsDir) {
  const records = []
  const states = readdirSync(findingsDir)

  for (const state of states) {
    if (STATE_FILTER && state !== STATE_FILTER) continue

    const stateDir = join(findingsDir, state)
    let files
    try {
      files = readdirSync(stateDir).filter(f => f.endsWith('.json'))
    } catch {
      continue
    }

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(stateDir, file), 'utf8'))
        const businesses = Array.isArray(data) ? data : [data]

        for (const biz of businesses) {
          if (!biz.name || !biz.name.trim()) continue

          records.push({
            name: biz.name.trim(),
            city: biz.address?.city || file.replace('.json', '').replace(/_/g, ' '),
            state: (biz.address?.state || state).replace(/^US\//, ''),
            address: buildAddress(biz),
            postcode: biz.address?.postcode || null,
            phone: biz.phone || null,
            website_url: biz.website || null,
            email: biz.email || null,
            description: biz.ai_classification?.ai_notes || biz.description || null,
            hours: biz.opening_hours ? { raw: biz.opening_hours } : null,
            cuisine_types: mapCuisines(biz),
            business_type: mapBusinessType(biz),
            lat: biz.lat || null,
            lon: biz.lon || null,
            lead_score: biz.lead_score || null,
            osm_id: biz.osm_id || null,
          })

          if (LIMIT && records.length >= parseInt(LIMIT)) {
            return records
          }
        }
      } catch (err) {
        // Skip malformed files
        console.warn(`  Skipped ${state}/${file}: ${err.message}`)
      }
    }
  }

  return records
}

// ─── Generate Unique Slugs ───────────────────────────────────────────────────

function generateSlugs(records) {
  const slugCounts = new Map()

  for (const record of records) {
    const base = slugify(`${record.name}-${record.city || 'us'}`)
    const count = slugCounts.get(base) || 0
    slugCounts.set(base, count + 1)
    record.slug = count === 0 ? base : `${base}-${count + 1}`
  }
}

// ─── Import to Database ──────────────────────────────────────────────────────

async function importToDatabase(records) {
  const sql = postgres(DATABASE_URL, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
  })

  console.log(`\nConnected to database. Importing ${records.length} records in batches of ${BATCH_SIZE}...`)

  let imported = 0
  let skipped = 0
  const startTime = Date.now()

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)

    const values = batch.map(r => ({
      name: r.name,
      slug: r.slug,
      city: r.city,
      state: r.state,
      address: r.address,
      postcode: r.postcode,
      phone: r.phone,
      website_url: r.website_url,
      email: r.email,
      description: r.description,
      hours: r.hours ? JSON.stringify(r.hours) : null,
      cuisine_types: r.cuisine_types,
      business_type: r.business_type,
      lat: r.lat,
      lon: r.lon,
      lead_score: r.lead_score,
      osm_id: r.osm_id,
      status: 'discovered',
      source: 'openstreetmap',
      source_id: r.osm_id,
      photo_urls: '{}',
      featured: false,
    }))

    try {
      // Build multi-row VALUES clause for true bulk insert
      const cols = [
        'name', 'slug', 'city', 'state', 'address', 'postcode', 'phone', 'website_url', 'email',
        'description', 'hours', 'cuisine_types', 'business_type', 'lat', 'lon', 'lead_score',
        'osm_id', 'status', 'source', 'source_id', 'photo_urls', 'featured',
      ]
      const placeholders = []
      const flatParams = []
      let pIdx = 1

      for (const v of values) {
        const hoursVal = v.hours ? JSON.parse(v.hours) : null
        placeholders.push(
          `($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8}, $${pIdx+9}, $${pIdx+10}::jsonb, $${pIdx+11}::text[], $${pIdx+12}, $${pIdx+13}, $${pIdx+14}, $${pIdx+15}, $${pIdx+16}, $${pIdx+17}, $${pIdx+18}, $${pIdx+19}, $${pIdx+20}::text[], $${pIdx+21})`
        )
        flatParams.push(
          v.name, v.slug, v.city, v.state, v.address, v.postcode, v.phone, v.website_url, v.email,
          v.description, hoursVal ? JSON.stringify(hoursVal) : null, v.cuisine_types, v.business_type,
          v.lat, v.lon, v.lead_score, v.osm_id, v.status, v.source, v.source_id,
          v.photo_urls === '{}' ? [] : v.photo_urls, v.featured,
        )
        pIdx += 22
      }

      const query = `INSERT INTO directory_listings (${cols.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (slug) DO NOTHING`
      const result = await sql.unsafe(query, flatParams)
      imported += batch.length
    } catch (err) {
      console.error(`  Batch error at offset ${i}:`, err.message)
      skipped += batch.length
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const rate = Math.round((i + batch.length) / (elapsed || 1))
    process.stdout.write(`\r  Progress: ${Math.min(i + batch.length, records.length).toLocaleString()} / ${records.length.toLocaleString()} (${elapsed}s, ~${rate}/s)`)
  }

  console.log('')

  // Verify
  const [{ count }] = await sql`SELECT count(*) as count FROM directory_listings WHERE source = 'openstreetmap'`
  console.log(`\nImport complete.`)
  console.log(`  Inserted: ${imported.toLocaleString()}`)
  console.log(`  Skipped (errors/dupes): ${skipped.toLocaleString()}`)
  console.log(`  Total OSM listings in DB: ${parseInt(count).toLocaleString()}`)

  await sql.end()
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('OpenClaw Crawler Data Import')
  console.log('============================')
  console.log(`Archive: ${ARCHIVE_PATH}`)
  console.log(`Database: ${DATABASE_URL.replace(/:[^@]+@/, ':***@')}`)
  if (DRY_RUN) console.log('MODE: DRY RUN (no database writes)')
  if (STATE_FILTER) console.log(`Filter: ${STATE_FILTER} only`)
  if (LIMIT) console.log(`Limit: ${LIMIT} records`)
  console.log('')

  // Step 1: Extract
  const { extractDir, findingsDir } = extractArchive()

  try {
    // Step 2: Collect records
    console.log('Reading enriched findings...')
    const records = collectRecords(findingsDir)
    console.log(`  Found ${records.length.toLocaleString()} valid business records`)

    if (records.length === 0) {
      console.log('No records to import.')
      return
    }

    // Show distribution
    const stateDistrib = {}
    for (const r of records) {
      stateDistrib[r.state] = (stateDistrib[r.state] || 0) + 1
    }
    const topStates = Object.entries(stateDistrib)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    console.log('\n  Top 10 states:')
    for (const [st, ct] of topStates) {
      console.log(`    ${st}: ${ct.toLocaleString()}`)
    }

    // Step 3: Generate slugs
    console.log('\nGenerating unique slugs...')
    generateSlugs(records)

    // Step 4: Import
    if (DRY_RUN) {
      console.log('\nDry run complete. Would have imported:')
      console.log(`  ${records.length.toLocaleString()} records`)
      console.log(`  ${Object.keys(stateDistrib).length} states`)
      console.log('\nSample record:')
      console.log(JSON.stringify(records[0], null, 2))
    } else {
      await importToDatabase(records)
    }
  } finally {
    // Cleanup temp dir
    console.log('\nCleaning up temp files...')
    rmSync(extractDir, { recursive: true, force: true })
  }

  console.log('Done.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
