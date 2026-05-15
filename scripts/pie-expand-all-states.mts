/**
 * PIE Expand All States - Manual Trigger
 *
 * Ensures all 50 US states have pricing_regions, seeds expansion_targets
 * for states with OSM stores but insufficient price data, then runs the
 * auto-expansion engine to dispatch scrape_jobs for the Pi.
 *
 * This is the "make it nationwide NOW" button. Run this once, then the
 * Pi's scraper cron picks up the queued jobs and prices flow in.
 *
 * Usage: npx tsx scripts/pie-expand-all-states.mts [--dry-run]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL!
const DRY_RUN = process.argv.includes('--dry-run')

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Check .env.local')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { max: 5, idle_timeout: 20 })

// All 50 US states + DC
const ALL_US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DC: 'District of Columbia', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

const PRIORITY_CATEGORIES = ['protein', 'seafood', 'produce', 'dairy', 'oil', 'herb', 'spice']
const PREFERRED_CHAINS = [
  'walmart', 'kroger', 'safeway', 'albertsons', 'publix', 'heb', 'wegmans',
  'stop_and_shop', 'giant', 'food_lion', 'aldi', 'lidl', 'trader_joes',
  'whole_foods', 'costco', 'target', 'meijer', 'winco', 'sprouts', 'harris_teeter',
]

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ---------------------------------------------------------------------------
// Step 1: Ensure all 50 states have pricing_region rows
// ---------------------------------------------------------------------------

async function ensureRegions(): Promise<{ created: number; existing: number }> {
  console.log('\n=== STEP 1: Ensure pricing_regions for all 50 states ===')

  const existing = await sql`
    SELECT DISTINCT state FROM openclaw.pricing_regions
    WHERE region_type = 'state' AND is_active = true
  `
  const existingStates = new Set(existing.map((r) => r.state as string))
  let created = 0

  for (const [code, name] of Object.entries(ALL_US_STATES)) {
    if (existingStates.has(code)) continue

    const slug = slugify(name)
    if (!DRY_RUN) {
      await sql`
        INSERT INTO openclaw.pricing_regions (name, slug, state, states, region_type, cost_index, is_active)
        VALUES (${name}, ${slug}, ${code}, ${[code]}, 'state', 1.000, true)
        ON CONFLICT (slug) DO UPDATE SET is_active = true, updated_at = now()
      `
    }
    console.log(`  + Created region: ${name} (${code})`)
    created++
  }

  console.log(`  Existing: ${existingStates.size}, Created: ${created}`)
  return { created, existing: existingStates.size }
}

// ---------------------------------------------------------------------------
// Step 2: Check OSM store coverage per state
// ---------------------------------------------------------------------------

interface StateStoreInfo {
  state: string
  storeCount: number
  chainCount: number
  hasRealPrices: boolean
  realPriceCount: number
}

async function auditStoreAndPriceCoverage(): Promise<StateStoreInfo[]> {
  console.log('\n=== STEP 2: Audit store + price coverage per state ===')

  const storeStats = await sql`
    SELECT
      s.state,
      COUNT(*) AS store_count,
      COUNT(DISTINCT s.chain) AS chain_count
    FROM openclaw.stores s
    WHERE s.is_active = true
      AND s.state IS NOT NULL
      AND s.state != ''
    GROUP BY s.state
    ORDER BY s.state
  `

  const priceStats = await sql`
    SELECT
      pr.state,
      COUNT(DISTINCT rp.canonical_ingredient_id) AS real_count
    FROM openclaw.pricing_regions pr
    JOIN openclaw.resolved_prices rp ON rp.pricing_region_id = pr.id
    WHERE rp.is_synthetic = false
    GROUP BY pr.state
  `
  const priceMap = new Map(priceStats.map((r) => [r.state as string, Number(r.real_count)]))

  const results: StateStoreInfo[] = []
  let covered = 0
  let uncovered = 0
  let noStores = 0

  for (const [code] of Object.entries(ALL_US_STATES)) {
    const storeRow = storeStats.find((r) => r.state === code)
    const storeCount = storeRow ? Number(storeRow.store_count) : 0
    const chainCount = storeRow ? Number(storeRow.chain_count) : 0
    const realPriceCount = priceMap.get(code) || 0

    results.push({
      state: code,
      storeCount,
      chainCount,
      hasRealPrices: realPriceCount > 0,
      realPriceCount,
    })

    if (realPriceCount > 10) {
      covered++
    } else if (storeCount > 0) {
      uncovered++
    } else {
      noStores++
    }
  }

  console.log(`  States with real price coverage (>10 ingredients): ${covered}`)
  console.log(`  States with stores but no/low prices (EXPANSION TARGETS): ${uncovered}`)
  console.log(`  States with no OSM stores yet: ${noStores}`)

  if (noStores > 0) {
    const missing = results.filter((s) => s.storeCount === 0).map((s) => s.state)
    console.log(`  Missing store data: ${missing.join(', ')}`)
    console.log(`  --> Run: node scripts/ingest-osm-stores.mjs --state <STATE>`)
  }

  return results
}

// ---------------------------------------------------------------------------
// Step 3: Seed expansion_targets for underserved states
// ---------------------------------------------------------------------------

async function seedExpansionTargets(stateInfos: StateStoreInfo[]): Promise<number> {
  console.log('\n=== STEP 3: Seed expansion_targets for underserved states ===')

  // Clear any stale skipped/failed targets so they can be retried
  if (!DRY_RUN) {
    const cleared = await sql`
      UPDATE openclaw.expansion_targets
      SET status = 'pending', queued_at = now(), started_at = NULL, completed_at = NULL
      WHERE status IN ('skipped') AND queued_at < now() - interval '24 hours'
      RETURNING id
    `
    if (cleared.length > 0) {
      console.log(`  Reactivated ${cleared.length} previously skipped targets`)
    }
  }

  let created = 0

  for (const info of stateInfos) {
    // Skip states that already have good coverage
    if (info.realPriceCount > 50) continue
    // Skip states with no stores (need OSM ingestion first)
    if (info.storeCount === 0) continue

    // Get the region ID
    const [region] = await sql`
      SELECT id FROM openclaw.pricing_regions
      WHERE state = ${info.state} AND is_active = true
      ORDER BY region_type = 'state' DESC
      LIMIT 1
    `
    if (!region) continue

    // Check if already has a pending target
    const [existing] = await sql`
      SELECT id FROM openclaw.expansion_targets
      WHERE pricing_region_id = ${region.id} AND status = 'pending'
    `
    if (existing) continue

    const priority = info.realPriceCount === 0 ? 95
      : info.realPriceCount < 10 ? 80
      : 60
    const reason = info.realPriceCount === 0
      ? 'critical: zero real prices, OSM stores available for scraping'
      : info.realPriceCount < 10
        ? 'high: minimal price data, stores ready for expansion'
        : 'moderate: below coverage threshold'
    const suggestedStores = Math.min(
      info.realPriceCount === 0 ? 10 : 5,
      info.storeCount
    )

    if (!DRY_RUN) {
      await sql`
        INSERT INTO openclaw.expansion_targets (
          pricing_region_id, state, priority, reason,
          suggested_store_count, suggested_categories,
          queued_at, status
        ) VALUES (
          ${region.id}, ${info.state}, ${priority}, ${reason},
          ${suggestedStores}, ${PRIORITY_CATEGORIES},
          now(), 'pending'
        )
        ON CONFLICT (pricing_region_id) WHERE status = 'pending'
        DO UPDATE SET
          priority = GREATEST(openclaw.expansion_targets.priority, EXCLUDED.priority),
          reason = EXCLUDED.reason,
          suggested_store_count = EXCLUDED.suggested_store_count,
          queued_at = now()
      `
    }
    console.log(`  + ${info.state}: priority=${priority}, stores=${suggestedStores} (${reason})`)
    created++
  }

  console.log(`  Targets created/updated: ${created}`)
  return created
}

// ---------------------------------------------------------------------------
// Step 4: Dispatch scrape_jobs from expansion_targets
// ---------------------------------------------------------------------------

async function dispatchScrapeJobs(): Promise<number> {
  console.log('\n=== STEP 4: Dispatch scrape_jobs for pending expansion_targets ===')

  // Get all pending targets
  const targets = await sql`
    SELECT id, pricing_region_id, state, priority, suggested_store_count, suggested_categories
    FROM openclaw.expansion_targets
    WHERE status = 'pending'
    ORDER BY priority DESC
  `

  if (targets.length === 0) {
    console.log('  No pending expansion targets. Pipeline is idle.')
    return 0
  }

  console.log(`  Found ${targets.length} pending targets`)
  let totalDispatched = 0

  for (const target of targets) {
    const state = target.state as string
    const limit = Number(target.suggested_store_count || 5)
    const categories = (target.suggested_categories as string[]) || PRIORITY_CATEGORIES

    // Find best store candidates in this state
    const candidates = await sql`
      WITH store_status AS (
        SELECT
          s.id AS store_id,
          s.name AS store_name,
          s.chain,
          s.state,
          s.city,
          MAX(sp.last_confirmed_at) AS last_scraped
        FROM openclaw.stores s
        LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
        WHERE s.state = ${state}
          AND s.is_active = true
        GROUP BY s.id, s.name, s.chain, s.state, s.city
      )
      SELECT store_id, store_name, chain, state, city
      FROM store_status
      WHERE last_scraped IS NULL OR last_scraped < now() - interval '7 days'
      ORDER BY
        CASE WHEN LOWER(chain) = ANY(${PREFERRED_CHAINS}) THEN 1 ELSE 2 END,
        last_scraped NULLS FIRST
      LIMIT ${limit}
    `

    if (candidates.length === 0) {
      if (!DRY_RUN) {
        await sql`
          UPDATE openclaw.expansion_targets
          SET status = 'skipped', completed_at = now(),
              notes = 'No eligible stores found (all recently scraped or none exist)'
          WHERE id = ${target.id}
        `
      }
      console.log(`  ${state}: No eligible stores, skipped`)
      continue
    }

    // Dispatch scrape jobs
    let dispatched = 0
    for (const store of candidates) {
      if (!DRY_RUN) {
        await sql`
          INSERT INTO openclaw.scrape_jobs (
            store_id, store_name, chain, state, city,
            target_categories, expansion_target_id,
            priority, status, queued_at
          ) VALUES (
            ${store.store_id}, ${store.store_name}, ${store.chain},
            ${store.state}, ${store.city},
            ${categories}, ${String(target.id)},
            'high', 'queued', now()
          )
          ON CONFLICT (store_id, status) WHERE status = 'queued'
          DO NOTHING
        `
      }
      dispatched++
    }

    if (!DRY_RUN) {
      await sql`
        UPDATE openclaw.expansion_targets
        SET status = 'in_progress', started_at = now(),
            stores_dispatched = ${dispatched},
            notes = ${'Dispatched ' + dispatched + ' stores for scraping'}
        WHERE id = ${target.id}
      `
    }

    console.log(`  ${state}: Dispatched ${dispatched} scrape jobs (${candidates.map((c) => c.store_name).join(', ')})`)
    totalDispatched += dispatched
  }

  console.log(`\n  Total scrape_jobs dispatched: ${totalDispatched}`)
  return totalDispatched
}

// ---------------------------------------------------------------------------
// Step 5: Summary report
// ---------------------------------------------------------------------------

async function printSummary() {
  console.log('\n=== FINAL STATE ===')

  const [regionCount] = await sql`
    SELECT COUNT(*) AS cnt FROM openclaw.pricing_regions WHERE is_active = true
  `
  const [storeCount] = await sql`
    SELECT COUNT(*) AS cnt FROM openclaw.stores WHERE is_active = true
  `
  const [jobCount] = await sql`
    SELECT COUNT(*) AS cnt FROM openclaw.scrape_jobs WHERE status = 'queued'
  `
  const [targetCount] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed
    FROM openclaw.expansion_targets
  `

  const statesWithJobs = await sql`
    SELECT DISTINCT state, COUNT(*) AS cnt
    FROM openclaw.scrape_jobs WHERE status = 'queued'
    GROUP BY state ORDER BY state
  `

  console.log(`  Active pricing regions: ${regionCount.cnt}`)
  console.log(`  Active stores (all states): ${storeCount.cnt}`)
  console.log(`  Queued scrape_jobs: ${jobCount.cnt}`)
  console.log(`  Expansion targets: pending=${targetCount.pending}, in_progress=${targetCount.in_progress}, completed=${targetCount.completed}`)

  if (statesWithJobs.length > 0) {
    console.log(`\n  Scrape jobs by state (${statesWithJobs.length} states queued):`)
    for (const r of statesWithJobs) {
      console.log(`    ${r.state}: ${r.cnt} jobs`)
    }
  }

  console.log('\n  When the Pi comes online, scrapers will process these jobs.')
  console.log('  Monitor progress: GET /api/cron/pie-auto-expansion')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const start = Date.now()
  console.log('='.repeat(60))
  console.log('PIE EXPAND ALL STATES')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`)
  console.log('='.repeat(60))

  // Step 1: Ensure regions
  await ensureRegions()

  // Step 2: Audit coverage
  const stateInfos = await auditStoreAndPriceCoverage()

  // Step 3: Seed expansion targets
  await seedExpansionTargets(stateInfos)

  // Step 4: Dispatch scrape jobs
  await dispatchScrapeJobs()

  // Step 5: Summary
  await printSummary()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nCompleted in ${elapsed}s`)

  await sql.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
