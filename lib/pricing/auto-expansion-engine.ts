/**
 * PIE Auto-Expansion Engine
 *
 * Autonomously expands price coverage in underserved regions by:
 *   1. Consuming expansion_targets from the Coverage Gap Detector
 *   2. Finding stores in target regions (from OSM/existing data)
 *   3. Dispatching scrape jobs to the Pi via SSH command
 *   4. Tracking expansion progress and marking targets complete
 *
 * This is the "self-healing" loop that makes PIE ACTUALLY nationwide,
 * not just architecturally nationwide.
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpansionRunResult {
  targetsProcessed: number
  storesDispatched: number
  storesFound: number
  regionsExpanded: number
  skipped: number
  errors: string[]
  durationMs: number
}

export interface StoreCandidate {
  storeId: string
  storeName: string
  chain: string | null
  state: string
  city: string | null
  lat: number | null
  lng: number | null
  hasExistingPrices: boolean
  priceCount: number
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  /** Max targets to process per run (rate limiting) */
  maxTargetsPerRun: 10,
  /** Max stores to dispatch per target */
  maxStoresPerTarget: 5,
  /** Minimum days between re-scraping same store */
  minRescrapeIntervalDays: 7,
  /** Preferred chains (prioritize these for nationwide consistency) */
  preferredChains: [
    'walmart',
    'kroger',
    'safeway',
    'albertsons',
    'publix',
    'heb',
    'wegmans',
    'stop_and_shop',
    'giant',
    'food_lion',
    'aldi',
    'lidl',
    'trader_joes',
    'whole_foods',
    'costco',
    'target',
    'meijer',
    'winco',
    'sprouts',
    'harris_teeter',
  ],
  /** Categories that matter most for chefs (scrape these first) */
  priorityCategories: ['protein', 'seafood', 'produce', 'dairy', 'oil', 'herb', 'spice'],
}

// ---------------------------------------------------------------------------
// Store discovery
// ---------------------------------------------------------------------------

/**
 * Find stores in a target state that are suitable for price scraping.
 * Prioritizes preferred chains and stores we haven't scraped recently.
 */
async function findStoreCandidates(
  state: string,
  regionId: string,
  limit: number
): Promise<StoreCandidate[]> {
  const sql = pgClient

  // Find stores in this state, preferring:
  // 1. Preferred national chains (for consistency)
  // 2. Stores with no recent scrapes (fresh territory)
  // 3. Stores near population centers (more inventory)
  const rows = await sql`
    WITH store_scrape_status AS (
      SELECT
        s.id AS store_id,
        s.name AS store_name,
        s.chain,
        s.state,
        s.city,
        s.lat,
        s.lng,
        COUNT(sp.id) AS existing_price_count,
        MAX(sp.last_confirmed_at) AS last_scraped
      FROM openclaw.stores s
      LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
      WHERE s.state = ${state}
        AND s.is_active = true
      GROUP BY s.id, s.name, s.chain, s.state, s.city, s.lat, s.lng
    )
    SELECT
      store_id, store_name, chain, state, city, lat, lng,
      existing_price_count,
      CASE WHEN existing_price_count > 0 THEN true ELSE false END AS has_existing_prices,
      CASE
        WHEN LOWER(chain) = ANY(${CONFIG.preferredChains}) THEN 1
        ELSE 2
      END AS chain_priority,
      CASE
        WHEN last_scraped IS NULL THEN 0
        WHEN last_scraped < now() - interval '${CONFIG.minRescrapeIntervalDays} days' THEN 1
        ELSE 3
      END AS scrape_recency
    FROM store_scrape_status
    WHERE (last_scraped IS NULL OR last_scraped < now() - interval '7 days')
    ORDER BY
      chain_priority ASC,
      scrape_recency ASC,
      existing_price_count DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    storeId: r.store_id as string,
    storeName: r.store_name as string,
    chain: r.chain as string | null,
    state: r.state as string,
    city: r.city as string | null,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    hasExistingPrices: r.has_existing_prices as boolean,
    priceCount: Number(r.existing_price_count || 0),
  }))
}

// ---------------------------------------------------------------------------
// Job dispatch
// ---------------------------------------------------------------------------

/**
 * Queue a scrape job for the Pi. Writes to openclaw.scrape_jobs table
 * which the Pi's cron picks up and processes.
 */
async function dispatchScrapeJob(
  store: StoreCandidate,
  categories: string[],
  expansionTargetId: string
): Promise<boolean> {
  const sql = pgClient

  try {
    await sql`
      INSERT INTO openclaw.scrape_jobs (
        store_id, store_name, chain, state, city,
        target_categories, expansion_target_id,
        priority, status, queued_at
      ) VALUES (
        ${store.storeId}, ${store.storeName}, ${store.chain},
        ${store.state}, ${store.city},
        ${categories}, ${expansionTargetId},
        'high', 'queued', now()
      )
      ON CONFLICT (store_id, status) WHERE status = 'queued'
      DO NOTHING
    `
    return true
  } catch (err) {
    console.error(`[auto-expansion] Failed to dispatch job for ${store.storeName}:`, err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Main expansion loop
// ---------------------------------------------------------------------------

export async function runAutoExpansion(): Promise<ExpansionRunResult> {
  const start = Date.now()
  const sql = pgClient
  const errors: string[] = []
  let targetsProcessed = 0
  let storesDispatched = 0
  let storesFound = 0
  let regionsExpanded = 0
  let skipped = 0

  // 1. Fetch pending expansion targets by priority
  const targets = await sql`
    SELECT
      id, pricing_region_id, state, priority, reason,
      suggested_store_count, suggested_categories
    FROM openclaw.expansion_targets
    WHERE status = 'pending'
    ORDER BY priority DESC
    LIMIT ${CONFIG.maxTargetsPerRun}
  `

  if (targets.length === 0) {
    return {
      targetsProcessed: 0,
      storesDispatched: 0,
      storesFound: 0,
      regionsExpanded: 0,
      skipped: 0,
      errors: [],
      durationMs: Date.now() - start,
    }
  }

  // 2. Process each target
  for (const target of targets) {
    const state = target.state as string
    const regionId = target.pricing_region_id as string
    const suggestedCount = Number(target.suggested_store_count || 5)
    const categories = (target.suggested_categories as string[]) || CONFIG.priorityCategories

    // Mark as in_progress
    await sql`
      UPDATE openclaw.expansion_targets
      SET status = 'in_progress', started_at = now()
      WHERE id = ${target.id}
    `

    // 3. Find store candidates
    const candidates = await findStoreCandidates(
      state,
      regionId,
      Math.min(suggestedCount, CONFIG.maxStoresPerTarget)
    )

    storesFound += candidates.length

    if (candidates.length === 0) {
      // No stores available in this region - might need OSM expansion
      await sql`
        UPDATE openclaw.expansion_targets
        SET status = 'skipped',
            completed_at = now(),
            notes = 'No eligible stores found in region. Needs OSM ingestion.'
        WHERE id = ${target.id}
      `
      skipped++
      errors.push(`No stores found for ${state} (region ${regionId})`)
      continue
    }

    // 4. Dispatch scrape jobs for each candidate
    let dispatched = 0
    for (const store of candidates) {
      const success = await dispatchScrapeJob(store, categories, target.id as string)
      if (success) dispatched++
    }

    storesDispatched += dispatched

    if (dispatched > 0) {
      regionsExpanded++
      // Update target with dispatch count
      await sql`
        UPDATE openclaw.expansion_targets
        SET stores_dispatched = ${dispatched},
            notes = ${'Dispatched ' + dispatched + ' stores for scraping'}
        WHERE id = ${target.id}
      `
    } else {
      await sql`
        UPDATE openclaw.expansion_targets
        SET status = 'skipped',
            completed_at = now(),
            notes = 'All candidate stores failed to dispatch'
        WHERE id = ${target.id}
      `
      skipped++
    }

    targetsProcessed++
  }

  return {
    targetsProcessed,
    storesDispatched,
    storesFound,
    regionsExpanded,
    skipped,
    errors,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Completion tracking
// ---------------------------------------------------------------------------

/**
 * Called by the sync receiver when new scrape data comes in.
 * Checks if any expansion targets have been satisfied.
 */
export async function checkExpansionCompletion(): Promise<number> {
  const sql = pgClient

  // Find in_progress targets where dispatched stores now have data
  const completed = await sql`
    UPDATE openclaw.expansion_targets et
    SET status = 'completed', completed_at = now()
    WHERE et.status = 'in_progress'
      AND et.started_at < now() - interval '1 hour'
      AND EXISTS (
        SELECT 1
        FROM openclaw.scrape_jobs sj
        WHERE sj.expansion_target_id = et.id::text
          AND sj.status = 'completed'
      )
    RETURNING et.id
  `

  return completed.length
}

// ---------------------------------------------------------------------------
// Admin/dashboard queries
// ---------------------------------------------------------------------------

/** Get expansion run history */
export async function getExpansionHistory(limit = 20): Promise<
  Array<{
    targetId: string
    state: string
    priority: number
    status: string
    storesDispatched: number
    queuedAt: string
    completedAt: string | null
    notes: string | null
  }>
> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      id, state, priority, status,
      COALESCE(stores_dispatched, 0) AS stores_dispatched,
      queued_at, completed_at, notes
    FROM openclaw.expansion_targets
    ORDER BY queued_at DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    targetId: r.id as string,
    state: r.state as string,
    priority: Number(r.priority),
    status: r.status as string,
    storesDispatched: Number(r.stores_dispatched),
    queuedAt: (r.queued_at as Date).toISOString(),
    completedAt: r.completed_at ? (r.completed_at as Date).toISOString() : null,
    notes: r.notes as string | null,
  }))
}

/** Get state-level expansion progress */
export async function getStateExpansionProgress(): Promise<
  Array<{
    state: string
    totalTargets: number
    completed: number
    pending: number
    inProgress: number
    totalStoresDispatched: number
  }>
> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      state,
      COUNT(*) AS total_targets,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COALESCE(SUM(stores_dispatched), 0) AS total_stores_dispatched
    FROM openclaw.expansion_targets
    GROUP BY state
    ORDER BY COUNT(*) FILTER (WHERE status = 'pending') DESC
  `

  return rows.map((r) => ({
    state: r.state as string,
    totalTargets: Number(r.total_targets),
    completed: Number(r.completed),
    pending: Number(r.pending),
    inProgress: Number(r.in_progress),
    totalStoresDispatched: Number(r.total_stores_dispatched),
  }))
}
