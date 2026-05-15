/**
 * Ensure All 50 US States Have Pricing Regions
 *
 * The coverage gap detector and auto-expansion engine can only target states
 * that have a row in openclaw.pricing_regions. This module ensures every US
 * state (+ DC) has at least a state-level pricing region, so the expansion
 * pipeline can detect gaps and queue scrape jobs for stores in ALL states.
 *
 * Called before gap detection runs. Idempotent (ON CONFLICT DO NOTHING).
 *
 * NOT a 'use server' file. Called by cron endpoints and manual scripts.
 */

import { pgClient } from '@/lib/db'

// All 50 US states + DC
export const ALL_US_STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DC: 'District of Columbia',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export interface EnsureRegionsResult {
  existingCount: number
  createdCount: number
  totalStates: number
}

/**
 * Ensures every US state has at least one pricing_region row of type 'state'.
 * Creates missing ones. Returns counts for logging.
 */
export async function ensureAllStateRegions(): Promise<EnsureRegionsResult> {
  const sql = pgClient
  let createdCount = 0

  // Get existing state-level regions
  const existing = await sql`
    SELECT DISTINCT state FROM openclaw.pricing_regions
    WHERE region_type = 'state' AND is_active = true
  `
  const existingStates = new Set(existing.map((r) => r.state as string))

  // Also check for states that have ANY region (metro/micro/rural)
  const anyRegion = await sql`
    SELECT DISTINCT state FROM openclaw.pricing_regions
    WHERE is_active = true
  `
  const statesWithAnyRegion = new Set(anyRegion.map((r) => r.state as string))

  // Create state-level regions for missing states
  for (const [code, name] of Object.entries(ALL_US_STATES)) {
    if (existingStates.has(code)) continue

    // If state has metro/micro regions but no state-level, still create one
    // because the gap detector needs a state-level entry to aggregate
    const slug = slugify(name)

    await sql`
      INSERT INTO openclaw.pricing_regions (name, slug, state, states, region_type, cost_index, is_active)
      VALUES (${name}, ${slug}, ${code}, ${[code]}, 'state', 1.000, true)
      ON CONFLICT (slug) DO UPDATE SET
        is_active = true,
        updated_at = now()
    `
    createdCount++
  }

  return {
    existingCount: existingStates.size,
    createdCount,
    totalStates: Object.keys(ALL_US_STATES).length,
  }
}

/**
 * For states that have OSM stores but zero or very few expansion_targets,
 * directly seed expansion_targets so the auto-expansion engine can dispatch
 * scrape jobs immediately (without waiting for the gap detector's priority
 * threshold to trigger).
 *
 * This bridges the gap: stores exist in the DB, but no scrape_jobs are queued
 * because no expansion_targets exist for those states.
 */
export async function seedExpansionTargetsForAllStates(): Promise<{
  statesSeeded: number
  targetsCreated: number
  statesWithStores: number
  statesWithoutStores: number
}> {
  const sql = pgClient
  let targetsCreated = 0
  let statesWithStores = 0
  let statesWithoutStores = 0

  // Find states that have OSM stores but no pending expansion_targets
  const storesByState = await sql`
    SELECT
      s.state,
      COUNT(*) AS store_count,
      COUNT(DISTINCT s.chain) AS chain_count
    FROM openclaw.stores s
    WHERE s.is_active = true
      AND s.state IS NOT NULL
      AND s.state != ''
    GROUP BY s.state
  `

  // Get states that already have pending expansion targets
  const pendingTargets = await sql`
    SELECT DISTINCT state FROM openclaw.expansion_targets
    WHERE status IN ('pending', 'in_progress')
  `
  const statesWithPendingTargets = new Set(pendingTargets.map((r) => r.state as string))

  // Get states with real price data (these are the "covered" 16)
  const statesWithPrices = await sql`
    SELECT DISTINCT pr.state, COUNT(DISTINCT rp.canonical_ingredient_id) AS real_count
    FROM openclaw.pricing_regions pr
    JOIN openclaw.resolved_prices rp ON rp.pricing_region_id = pr.id AND rp.is_synthetic = false
    GROUP BY pr.state
  `
  const coveredStates = new Map(
    statesWithPrices.map((r) => [r.state as string, Number(r.real_count)])
  )

  // Priority categories for expansion
  const priorityCategories = ['protein', 'seafood', 'produce', 'dairy', 'oil', 'herb', 'spice']

  for (const row of storesByState) {
    const state = row.state as string
    const storeCount = Number(row.store_count)

    // Skip if not a valid US state
    if (!ALL_US_STATES[state]) continue

    statesWithStores++

    // Skip if already has pending targets
    if (statesWithPendingTargets.has(state)) continue

    // Determine priority based on existing coverage
    const realPriceCount = coveredStates.get(state) || 0
    let priority: number
    let reason: string
    let suggestedStores: number

    if (Number(realPriceCount) === 0) {
      priority = 95 // Critical: zero real data
      reason = 'critical: zero real price coverage, OSM stores available'
      suggestedStores = Math.min(10, storeCount)
    } else if (Number(realPriceCount) < 10) {
      priority = 80 // High: minimal data
      reason = 'high: minimal real price observations, expansion needed'
      suggestedStores = Math.min(8, storeCount)
    } else if (Number(realPriceCount) < 50) {
      priority = 60 // Moderate
      reason = 'moderate: below acceptable coverage threshold'
      suggestedStores = Math.min(5, storeCount)
    } else {
      // State has decent coverage, skip
      continue
    }

    // Find the pricing region for this state
    const [region] = await sql`
      SELECT id FROM openclaw.pricing_regions
      WHERE state = ${state} AND is_active = true
      ORDER BY region_type = 'state' DESC
      LIMIT 1
    `

    if (!region) continue // Should not happen after ensureAllStateRegions

    await sql`
      INSERT INTO openclaw.expansion_targets (
        pricing_region_id, state, priority, reason,
        suggested_store_count, suggested_categories,
        queued_at, status
      ) VALUES (
        ${region.id}, ${state}, ${priority}, ${reason},
        ${suggestedStores}, ${priorityCategories},
        now(), 'pending'
      )
      ON CONFLICT (pricing_region_id) WHERE status = 'pending'
      DO UPDATE SET
        priority = GREATEST(openclaw.expansion_targets.priority, EXCLUDED.priority),
        reason = EXCLUDED.reason,
        suggested_store_count = EXCLUDED.suggested_store_count,
        suggested_categories = EXCLUDED.suggested_categories,
        queued_at = now()
    `
    targetsCreated++
  }

  // Count states without any stores
  const allStateCodes = Object.keys(ALL_US_STATES)
  const statesInDb = new Set(storesByState.map((r) => r.state as string))
  statesWithoutStores = allStateCodes.filter((s) => !statesInDb.has(s)).length

  return {
    statesSeeded: targetsCreated,
    targetsCreated,
    statesWithStores,
    statesWithoutStores,
  }
}
