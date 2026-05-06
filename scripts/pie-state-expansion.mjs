#!/usr/bin/env node
/**
 * PIE State Expansion Script
 *
 * Discovers which US states have price data on the Pi bridge (10.0.0.177:7700),
 * creates missing pricing_region entries in PostgreSQL, and seeds a sample of
 * resolved_prices for each new state.
 *
 * Usage: node scripts/pie-state-expansion.mjs [--dry-run]
 *
 * Requires:
 *   - Pi bridge running at PI_BRIDGE_URL (default http://10.0.0.177:7700)
 *   - PostgreSQL at DATABASE_URL (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)
 */

import pg from 'postgres'

const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DRY_RUN = process.argv.includes('--dry-run')
const TIMEOUT_MS = 5000

const sql = pg(DATABASE_URL, { max: 5, idle_timeout: 20, transform: pg.camel })

// All 50 US states + DC
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL',
  'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

// State names for region creation
const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DC:'District of Columbia',DE:'Delaware',FL:'Florida',
  GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',
  IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',
  MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',
  SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',
  VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
}

// Sample ingredients to probe per state (common grocery staples)
const PROBE_INGREDIENTS = [
  'chicken breast', 'ground beef', 'salmon', 'butter', 'eggs',
  'milk', 'bread', 'rice', 'pasta', 'olive oil',
  'tomatoes', 'onion', 'garlic', 'potatoes', 'lettuce',
  'cheese', 'flour', 'sugar', 'salt', 'black pepper'
]

// --- Pi Bridge helpers ---

async function piFetch(path, options) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${PI_BRIDGE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    clearTimeout(timeout)
    return null
  }
}

async function checkHealth() {
  const health = await piFetch('/health')
  if (!health || health.status !== 'ok') {
    console.error('ERROR: Pi bridge unreachable at', PI_BRIDGE_URL)
    process.exit(1)
  }
  console.log(`Pi bridge healthy: ${health.total_prices?.toLocaleString()} prices, ${health.db_size_mb}MB`)
  return health
}

/**
 * Probe a state by looking up a common ingredient.
 * Returns the number of prices found (0 = no data for this state).
 */
async function probeState(state) {
  const result = await piFetch(`/price?name=chicken+breast&state=${state}`)
  if (!result) return 0
  return result.count || 0
}

/**
 * Get a batch of prices for a state to seed resolved_prices.
 * Uses single lookups since the batch endpoint can be slow.
 */
async function getSamplePrices(state, ingredients) {
  const prices = []
  for (const name of ingredients) {
    const result = await piFetch(`/price?name=${encodeURIComponent(name)}&state=${state}`)
    if (!result || !result.prices || result.prices.length === 0) continue

    // Aggregate prices for this ingredient
    const validPrices = result.prices.filter(p => p.price_per_standard_unit_cents > 0)
    if (validPrices.length === 0) continue

    const cents = validPrices.map(p => p.price_per_standard_unit_cents)
    cents.sort((a, b) => a - b)

    prices.push({
      ingredientId: result.ingredient.id,
      ingredientName: result.ingredient.name,
      unit: result.ingredient.standard_unit || 'each',
      medianCents: cents[Math.floor(cents.length / 2)],
      minCents: cents[0],
      maxCents: cents[cents.length - 1],
      avgCents: Math.round(cents.reduce((a, b) => a + b, 0) / cents.length),
      observationCount: cents.length,
      sourceCount: new Set(validPrices.map(p => p.store)).size,
      freshest: validPrices[0]?.last_confirmed_at || null,
    })
  }
  return prices
}

// --- PostgreSQL operations ---

async function getExistingRegions() {
  const rows = await sql`
    SELECT id, state, slug, name FROM openclaw.pricing_regions
    WHERE region_type = 'state'
    ORDER BY state
  `
  return new Map(rows.map(r => [r.state, r]))
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function createRegion(state) {
  const name = STATE_NAMES[state] || state
  const slug = slugify(name)

  const [row] = await sql`
    INSERT INTO openclaw.pricing_regions (name, slug, state, states, region_type, cost_index)
    VALUES (${name}, ${slug}, ${state}, ${[state]}, 'state', 1.000)
    ON CONFLICT (slug) DO UPDATE SET updated_at = now()
    RETURNING id, slug
  `
  return row
}

async function upsertResolvedPrices(regionId, prices) {
  let upserted = 0
  for (const p of prices) {
    await sql`
      INSERT INTO openclaw.resolved_prices (
        canonical_ingredient_id, pricing_region_id,
        price_cents, price_unit,
        price_low_cents, price_high_cents, price_median_cents,
        confidence, observation_count, source_count,
        freshest_observation, price_type, computation_method
      ) VALUES (
        ${p.ingredientId}, ${regionId},
        ${p.medianCents}, ${p.unit},
        ${p.minCents}, ${p.maxCents}, ${p.medianCents},
        ${Math.min(0.999, p.observationCount / 100)}, ${p.observationCount}, ${p.sourceCount},
        ${p.freshest ? new Date(p.freshest) : null}, 'retail', 'median_multistore'
      )
      ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type)
      DO UPDATE SET
        price_cents = EXCLUDED.price_cents,
        price_low_cents = EXCLUDED.price_low_cents,
        price_high_cents = EXCLUDED.price_high_cents,
        price_median_cents = EXCLUDED.price_median_cents,
        confidence = EXCLUDED.confidence,
        observation_count = EXCLUDED.observation_count,
        source_count = EXCLUDED.source_count,
        freshest_observation = EXCLUDED.freshest_observation,
        computation_method = EXCLUDED.computation_method,
        updated_at = now()
    `
    upserted++
  }
  return upserted
}

// --- Main ---

async function main() {
  console.log('PIE State Expansion')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Pi bridge: ${PI_BRIDGE_URL}`)
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`)
  console.log('')

  await checkHealth()
  console.log('')

  // Step 1: Get existing regions from PostgreSQL
  const existing = await getExistingRegions()
  console.log(`Existing state-level regions in PostgreSQL: ${existing.size}`)
  if (existing.size > 0) {
    console.log(`  States: ${[...existing.keys()].join(', ')}`)
  }
  console.log('')

  // Step 2: Probe each state on Pi bridge
  console.log('Probing states on Pi bridge...')
  const statesWithData = []
  const statesEmpty = []

  for (const state of ALL_STATES) {
    const count = await probeState(state)
    if (count > 0) {
      statesWithData.push({ state, sampleCount: count })
      process.stdout.write(`  ${state}: ${count} prices (has data)\n`)
    } else {
      statesEmpty.push(state)
      process.stdout.write(`  ${state}: no data\n`)
    }
  }

  console.log('')
  console.log(`States with price data: ${statesWithData.length}`)
  console.log(`States without data: ${statesEmpty.length} (${statesEmpty.join(', ')})`)
  console.log('')

  // Step 3: Identify missing states (have Pi data but no PostgreSQL region)
  const missing = statesWithData.filter(s => !existing.has(s.state))
  console.log(`States needing region creation: ${missing.length}`)
  if (missing.length === 0) {
    console.log('All states with Pi data already have PostgreSQL regions. Nothing to do.')
    await sql.end()
    return
  }
  console.log(`  ${missing.map(s => s.state).join(', ')}`)
  console.log('')

  if (DRY_RUN) {
    console.log('[DRY RUN] Would create regions and seed prices for the above states.')
    await sql.end()
    return
  }

  // Step 4: Create regions and seed prices
  let totalRegions = 0
  let totalPrices = 0

  for (const { state } of missing) {
    console.log(`\nProcessing ${state} (${STATE_NAMES[state]})...`)

    // Create region
    const region = await createRegion(state)
    totalRegions++
    console.log(`  Created region: ${region.slug} (${region.id})`)

    // Get sample prices
    console.log(`  Fetching sample prices (${PROBE_INGREDIENTS.length} ingredients)...`)
    const prices = await getSamplePrices(state, PROBE_INGREDIENTS)
    console.log(`  Got ${prices.length} ingredients with prices`)

    if (prices.length > 0) {
      const upserted = await upsertResolvedPrices(region.id, prices)
      totalPrices += upserted
      console.log(`  Seeded ${upserted} resolved prices`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('EXPANSION COMPLETE')
  console.log(`  Regions created: ${totalRegions}`)
  console.log(`  Prices seeded: ${totalPrices}`)
  console.log('='.repeat(60))

  await sql.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
