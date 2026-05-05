/**
 * PIE Coverage Gap Detector
 *
 * Identifies geographic regions with insufficient price observation density.
 * Scores every pricing region by freshness, source diversity, and ingredient
 * coverage relative to the Census. Produces prioritized expansion targets
 * that the Auto-Expansion Engine consumes.
 *
 * Runs on cron (every 6 hours, after census). Writes to:
 *   - openclaw.coverage_gaps (gap inventory)
 *   - openclaw.expansion_targets (prioritized queue for auto-expansion)
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CoverageGapResult {
  regionsScanned: number
  gapsIdentified: number
  expansionTargetsQueued: number
  criticalRegions: number
  durationMs: number
  topGaps: RegionGap[]
}

export interface RegionGap {
  regionId: string
  regionName: string
  state: string
  /** 0-100 coverage score. 0 = no real data, 100 = fully covered */
  coverageScore: number
  /** 0-100 freshness score. 0 = all stale, 100 = all fresh */
  freshnessScore: number
  /** 0-100 diversity score. 0 = single source, 100 = many sources */
  diversityScore: number
  /** Combined priority (lower = more urgent). 0-100, weighted composite */
  priorityScore: number
  /** Census ingredients with NO real price in this region */
  missingIngredients: number
  /** Census ingredients with ONLY synthetic prices */
  syntheticOnly: number
  /** Days since freshest real observation */
  daysSinceFreshest: number | null
  /** Number of distinct data sources active in this region */
  activeSources: number
  /** Estimated population served by this region */
  populationEstimate: number | null
}

export interface ExpansionTarget {
  regionId: string
  state: string
  priority: number
  reason: string
  suggestedStoreCount: number
  suggestedCategories: string[]
  queuedAt: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
}

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  coverage: 0.4, // How many census ingredients have real prices
  freshness: 0.25, // How recent the newest observations are
  diversity: 0.15, // How many distinct sources contribute
  population: 0.2, // How many people this region serves (proxy: store count)
}

// Freshness decay: days since last observation -> freshness score
function freshnessFromDays(days: number | null): number {
  if (days === null) return 0
  if (days <= 3) return 100
  if (days <= 7) return 85
  if (days <= 14) return 65
  if (days <= 30) return 40
  if (days <= 60) return 20
  if (days <= 90) return 10
  return 0
}

// Diversity score from source count
function diversityFromSources(sources: number): number {
  if (sources >= 5) return 100
  if (sources >= 4) return 85
  if (sources >= 3) return 65
  if (sources >= 2) return 40
  if (sources >= 1) return 20
  return 0
}

// Population proxy from store count in region
function populationFromStores(storeCount: number): number {
  // Rough proxy: more stores = more important region
  if (storeCount >= 100) return 100
  if (storeCount >= 50) return 80
  if (storeCount >= 20) return 60
  if (storeCount >= 10) return 40
  if (storeCount >= 5) return 25
  if (storeCount >= 1) return 10
  return 0
}

// ---------------------------------------------------------------------------
// Main detection pipeline
// ---------------------------------------------------------------------------

export async function detectCoverageGaps(): Promise<CoverageGapResult> {
  const start = Date.now()
  const sql = pgClient
  const gaps: RegionGap[] = []

  // 1. Get all active pricing regions with their coverage stats
  const regionStats = await sql`
    WITH census_total AS (
      SELECT COUNT(*) AS total FROM openclaw.ingredient_census
      WHERE census_tier IN ('core', 'extended')
    ),
    region_coverage AS (
      SELECT
        pr.id AS region_id,
        pr.name AS region_name,
        pr.state,
        COUNT(DISTINCT rp.canonical_ingredient_id) FILTER (
          WHERE rp.is_synthetic = false
        ) AS real_prices,
        COUNT(DISTINCT rp.canonical_ingredient_id) FILTER (
          WHERE rp.is_synthetic = true AND NOT EXISTS (
            SELECT 1 FROM openclaw.resolved_prices rp2
            WHERE rp2.canonical_ingredient_id = rp.canonical_ingredient_id
              AND rp2.pricing_region_id = pr.id
              AND rp2.is_synthetic = false
          )
        ) AS synthetic_only,
        COUNT(DISTINCT rp.source_type) AS source_count,
        EXTRACT(EPOCH FROM (now() - MAX(rp.freshest_observation))) / 86400.0
          AS days_since_freshest,
        COUNT(DISTINCT sp.store_id) AS store_count
      FROM openclaw.pricing_regions pr
      LEFT JOIN openclaw.resolved_prices rp ON rp.pricing_region_id = pr.id
      LEFT JOIN openclaw.store_products sp ON sp.store_id IN (
        SELECT s.id FROM openclaw.stores s WHERE s.state = pr.state
      )
      WHERE pr.is_active = true
      GROUP BY pr.id, pr.name, pr.state
    )
    SELECT
      rc.*,
      ct.total AS census_total
    FROM region_coverage rc
    CROSS JOIN census_total ct
  `

  const censusTotal = Number(regionStats[0]?.census_total || 1)

  for (const row of regionStats) {
    const realPrices = Number(row.real_prices || 0)
    const syntheticOnly = Number(row.synthetic_only || 0)
    const sourceCount = Number(row.source_count || 0)
    const daysSince = row.days_since_freshest != null ? Number(row.days_since_freshest) : null
    const storeCount = Number(row.store_count || 0)

    const coverageScore = Math.min(100, Math.round((realPrices / censusTotal) * 100))
    const freshnessScore = freshnessFromDays(daysSince)
    const diversityScore = diversityFromSources(sourceCount)
    const populationScore = populationFromStores(storeCount)

    // Priority: inverse of weighted composite (lower = more urgent to fix)
    const compositeHealth =
      coverageScore * WEIGHTS.coverage +
      freshnessScore * WEIGHTS.freshness +
      diversityScore * WEIGHTS.diversity +
      populationScore * WEIGHTS.population

    const priorityScore = Math.round(100 - compositeHealth)

    gaps.push({
      regionId: row.region_id as string,
      regionName: row.region_name as string,
      state: row.state as string,
      coverageScore,
      freshnessScore,
      diversityScore,
      priorityScore,
      missingIngredients: censusTotal - realPrices - syntheticOnly,
      syntheticOnly,
      daysSinceFreshest: daysSince != null ? Math.round(daysSince) : null,
      activeSources: sourceCount,
      populationEstimate: storeCount * 5000, // very rough proxy
    })
  }

  // Sort by priority (highest priority = highest score = most urgent)
  gaps.sort((a, b) => b.priorityScore - a.priorityScore)

  // 2. Write gaps to database
  const BATCH = 100
  for (let i = 0; i < gaps.length; i += BATCH) {
    const batch = gaps.slice(i, i + BATCH)
    for (const gap of batch) {
      await sql`
        INSERT INTO openclaw.coverage_gaps (
          pricing_region_id, state, coverage_score, freshness_score,
          diversity_score, priority_score, missing_ingredients,
          synthetic_only, days_since_freshest, active_sources,
          population_estimate, detected_at
        ) VALUES (
          ${gap.regionId}, ${gap.state}, ${gap.coverageScore},
          ${gap.freshnessScore}, ${gap.diversityScore}, ${gap.priorityScore},
          ${gap.missingIngredients}, ${gap.syntheticOnly},
          ${gap.daysSinceFreshest}, ${gap.activeSources},
          ${gap.populationEstimate}, now()
        )
        ON CONFLICT (pricing_region_id) DO UPDATE SET
          coverage_score = EXCLUDED.coverage_score,
          freshness_score = EXCLUDED.freshness_score,
          diversity_score = EXCLUDED.diversity_score,
          priority_score = EXCLUDED.priority_score,
          missing_ingredients = EXCLUDED.missing_ingredients,
          synthetic_only = EXCLUDED.synthetic_only,
          days_since_freshest = EXCLUDED.days_since_freshest,
          active_sources = EXCLUDED.active_sources,
          population_estimate = EXCLUDED.population_estimate,
          detected_at = now()
      `
    }
  }

  // 3. Generate expansion targets for critical gaps (priority > 60)
  const criticalGaps = gaps.filter((g) => g.priorityScore > 60)
  let targetsQueued = 0

  for (const gap of criticalGaps) {
    const suggestedStores = gap.coverageScore < 20 ? 10 : gap.coverageScore < 50 ? 5 : 3

    // Determine which food categories are most underrepresented
    const missingCats = await sql`
      SELECT ic.census_category, COUNT(*) AS gap_count
      FROM openclaw.ingredient_census ic
      WHERE ic.ingredient_id NOT IN (
        SELECT rp.canonical_ingredient_id
        FROM openclaw.resolved_prices rp
        WHERE rp.pricing_region_id = ${gap.regionId}
          AND rp.is_synthetic = false
      )
      AND ic.census_tier IN ('core', 'extended')
      GROUP BY ic.census_category
      ORDER BY gap_count DESC
      LIMIT 5
    `

    const categories = missingCats.map((r) => r.census_category as string)

    const reason =
      gap.coverageScore < 10
        ? 'critical: near-zero real price coverage'
        : gap.coverageScore < 30
          ? 'high: minimal real price observations'
          : gap.freshnessScore < 30
            ? 'stale: data older than 30 days'
            : 'moderate: below acceptable coverage threshold'

    await sql`
      INSERT INTO openclaw.expansion_targets (
        pricing_region_id, state, priority, reason,
        suggested_store_count, suggested_categories,
        queued_at, status
      ) VALUES (
        ${gap.regionId}, ${gap.state}, ${gap.priorityScore}, ${reason},
        ${suggestedStores}, ${categories},
        now(), 'pending'
      )
      ON CONFLICT (pricing_region_id) WHERE status = 'pending'
      DO UPDATE SET
        priority = EXCLUDED.priority,
        reason = EXCLUDED.reason,
        suggested_store_count = EXCLUDED.suggested_store_count,
        suggested_categories = EXCLUDED.suggested_categories,
        queued_at = now()
    `
    targetsQueued++
  }

  return {
    regionsScanned: gaps.length,
    gapsIdentified: gaps.filter((g) => g.priorityScore > 40).length,
    expansionTargetsQueued: targetsQueued,
    criticalRegions: criticalGaps.length,
    durationMs: Date.now() - start,
    topGaps: gaps.slice(0, 20),
  }
}

// ---------------------------------------------------------------------------
// Query helpers (for dashboard/admin)
// ---------------------------------------------------------------------------

/** Get current gap status for all regions, sorted by priority */
export async function getGapsByPriority(limit = 50): Promise<RegionGap[]> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      pricing_region_id AS region_id,
      cg.state,
      pr.name AS region_name,
      coverage_score, freshness_score, diversity_score,
      priority_score, missing_ingredients, synthetic_only,
      days_since_freshest, active_sources, population_estimate
    FROM openclaw.coverage_gaps cg
    JOIN openclaw.pricing_regions pr ON pr.id = cg.pricing_region_id
    ORDER BY priority_score DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    regionId: r.region_id as string,
    regionName: r.region_name as string,
    state: r.state as string,
    coverageScore: Number(r.coverage_score),
    freshnessScore: Number(r.freshness_score),
    diversityScore: Number(r.diversity_score),
    priorityScore: Number(r.priority_score),
    missingIngredients: Number(r.missing_ingredients),
    syntheticOnly: Number(r.synthetic_only),
    daysSinceFreshest: r.days_since_freshest != null ? Number(r.days_since_freshest) : null,
    activeSources: Number(r.active_sources),
    populationEstimate: r.population_estimate != null ? Number(r.population_estimate) : null,
  }))
}

/** Get pending expansion targets */
export async function getPendingExpansionTargets(): Promise<ExpansionTarget[]> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      pricing_region_id AS region_id,
      state, priority, reason,
      suggested_store_count, suggested_categories,
      queued_at, status
    FROM openclaw.expansion_targets
    WHERE status = 'pending'
    ORDER BY priority DESC
  `

  return rows.map((r) => ({
    regionId: r.region_id as string,
    state: r.state as string,
    priority: Number(r.priority),
    reason: r.reason as string,
    suggestedStoreCount: Number(r.suggested_store_count),
    suggestedCategories: r.suggested_categories as string[],
    queuedAt: (r.queued_at as Date).toISOString(),
    status: r.status as ExpansionTarget['status'],
  }))
}

/** Get state-level coverage summary (for heatmap) */
export async function getStateCoverageSummary(): Promise<
  Array<{
    state: string
    regionCount: number
    avgCoverage: number
    avgFreshness: number
    avgPriority: number
    worstRegion: string | null
  }>
> {
  const sql = pgClient
  const rows = await sql`
    SELECT
      cg.state,
      COUNT(*) AS region_count,
      ROUND(AVG(coverage_score))::int AS avg_coverage,
      ROUND(AVG(freshness_score))::int AS avg_freshness,
      ROUND(AVG(priority_score))::int AS avg_priority,
      (
        SELECT pr2.name FROM openclaw.coverage_gaps cg2
        JOIN openclaw.pricing_regions pr2 ON pr2.id = cg2.pricing_region_id
        WHERE cg2.state = cg.state
        ORDER BY cg2.priority_score DESC
        LIMIT 1
      ) AS worst_region
    FROM openclaw.coverage_gaps cg
    GROUP BY cg.state
    ORDER BY AVG(priority_score) DESC
  `

  return rows.map((r) => ({
    state: r.state as string,
    regionCount: Number(r.region_count),
    avgCoverage: Number(r.avg_coverage),
    avgFreshness: Number(r.avg_freshness),
    avgPriority: Number(r.avg_priority),
    worstRegion: r.worst_region as string | null,
  }))
}
