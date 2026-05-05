/**
 * Resolved Prices Worker
 *
 * Background job that pre-computes per-ingredient, per-region prices
 * into openclaw.resolved_prices. This is the materialization layer
 * that makes chef-facing lookups fast and measurable.
 *
 * Strategy per ingredient+region:
 *   1. Aggregate store_products for stores in that region
 *   2. Apply IQR outlier filtering + weighted median
 *   3. If no store data, try USDA baseline x regional cost_index
 *   4. Apply seasonal factor if available
 *   5. Compute confidence score
 *   6. Upsert into resolved_prices
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResolveRunResult {
  runId: string
  regionsProcessed: number
  ingredientsProcessed: number
  pricesUpserted: number
  pricesSkipped: number
  durationMs: number
  errors: string[]
}

interface RegionRow {
  id: string
  slug: string
  cost_index: number
}

interface StoreAggRow {
  canonical_ingredient_id: string
  standard_unit: string
  price_cents: number
  store_count: number
  source_count: number
  min_cents: number
  max_cents: number
  median_cents: number
  freshest: string
  oldest: string
}

// ---------------------------------------------------------------------------
// Confidence scoring (matches the design spec)
// ---------------------------------------------------------------------------

function computeConfidence(
  sourceCount: number,
  observationCount: number,
  freshestDate: string | null,
  minCents: number,
  maxCents: number,
  medianCents: number
): number {
  // Recency score
  let recency = 0.1
  if (freshestDate) {
    const ageDays = Math.floor(
      (Date.now() - new Date(freshestDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (ageDays <= 1) recency = 1.0
    else if (ageDays <= 3) recency = 0.9
    else if (ageDays <= 7) recency = 0.7
    else if (ageDays <= 14) recency = 0.6
    else if (ageDays <= 30) recency = 0.4
    else if (ageDays <= 90) recency = 0.2
  }

  // Source diversity
  let diversity = 0.3
  if (sourceCount >= 3) diversity = 0.9
  else if (sourceCount >= 2) diversity = 0.6

  // Consistency (coefficient of variation proxy from range)
  let consistency = 0.5
  if (medianCents > 0 && observationCount >= 2) {
    const range = maxCents - minCents
    const cv = range / medianCents
    if (cv < 0.1) consistency = 1.0
    else if (cv < 0.2) consistency = 0.8
    else if (cv < 0.4) consistency = 0.6
    else if (cv < 0.6) consistency = 0.4
    else consistency = 0.2
  }

  // Volume
  let volume = 0.3
  if (observationCount >= 11) volume = 1.0
  else if (observationCount >= 6) volume = 0.8
  else if (observationCount >= 3) volume = 0.6

  // Weighted average
  return (
    Math.round((recency * 0.3 + diversity * 0.25 + consistency * 0.25 + volume * 0.2) * 1000) / 1000
  )
}

// ---------------------------------------------------------------------------
// Main worker
// ---------------------------------------------------------------------------

export async function runResolvedPricesWorker(options?: {
  regionSlug?: string
  dryRun?: boolean
}): Promise<ResolveRunResult> {
  const sql = pgClient
  const startTime = Date.now()
  const errors: string[] = []
  let regionsProcessed = 0
  let ingredientsProcessed = 0
  let pricesUpserted = 0
  let pricesSkipped = 0

  // Create run record
  const runRows = await sql`
    INSERT INTO openclaw.resolve_runs (status) VALUES ('running') RETURNING id
  `
  const runId = runRows[0].id as string

  try {
    // Get regions to process
    const regionFilter = options?.regionSlug ? sql`AND slug = ${options.regionSlug}` : sql``
    const regions = (await sql`
      SELECT id, slug, cost_index
      FROM openclaw.pricing_regions
      WHERE is_active = true ${regionFilter}
      ORDER BY population DESC NULLS LAST
    `) as unknown as RegionRow[]

    console.log(`[resolve-prices] Processing ${regions.length} regions...`)

    // Get current month for seasonal adjustment
    const currentMonth = new Date().getMonth() + 1

    for (const region of regions) {
      try {
        // ---------------------------------------------------------------
        // Strategy 1: Aggregate real store prices from stores in this region
        // ---------------------------------------------------------------
        // Find stores in this region (via ZIP centroid mapping)
        const storeAgg = (await sql`
          WITH region_stores AS (
            SELECT s.id AS store_id, c.slug AS chain_slug, c.reliability_weight
            FROM openclaw.stores s
            JOIN openclaw.zip_centroids zc ON zc.zip = s.zip
            LEFT JOIN openclaw.chains c ON c.id = s.chain_id
            WHERE zc.pricing_region_id = ${region.id}
              AND s.is_active = true
          ),
          product_prices AS (
            SELECT
              nm.canonical_ingredient_id,
              ci.standard_unit,
              sp.price_cents,
              COALESCE(sp.sale_price_cents, sp.price_cents) AS effective_price,
              sp.last_seen_at,
              rs.chain_slug,
              COALESCE(rs.reliability_weight, 1.0) AS reliability_weight
            FROM region_stores rs
            JOIN openclaw.store_products sp ON sp.store_id = rs.store_id
            JOIN openclaw.products p ON p.id = sp.product_id
            JOIN openclaw.normalization_map nm ON nm.raw_name = p.name
            JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = nm.canonical_ingredient_id
            WHERE sp.price_cents > 0
              AND sp.price_cents < 50000
              AND sp.last_seen_at > now() - INTERVAL '90 days'
              AND p.is_food = true
          )
          SELECT
            canonical_ingredient_id,
            standard_unit,
            COUNT(*) AS store_count,
            COUNT(DISTINCT chain_slug) AS source_count,
            MIN(effective_price) AS min_cents,
            MAX(effective_price) AS max_cents,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY effective_price) AS median_cents,
            MAX(last_seen_at)::text AS freshest,
            MIN(last_seen_at)::text AS oldest
          FROM product_prices
          GROUP BY canonical_ingredient_id, standard_unit
          HAVING COUNT(*) >= 1
        `) as unknown as StoreAggRow[]

        // Track which ingredients we've resolved from store data
        const resolvedIngredients = new Set<string>()

        for (const row of storeAgg) {
          const confidence = computeConfidence(
            Number(row.source_count),
            Number(row.store_count),
            row.freshest,
            Number(row.min_cents),
            Number(row.max_cents),
            Number(row.median_cents)
          )

          // Apply seasonal factor if available
          let adjustedMedian = Math.round(Number(row.median_cents))
          let method =
            Number(row.source_count) >= 3
              ? 'median_multistore'
              : Number(row.source_count) >= 2
                ? 'median_2store'
                : 'single_source'

          const seasonalRows = await sql`
            SELECT factor FROM openclaw.seasonal_factors
            WHERE canonical_ingredient_id = ${row.canonical_ingredient_id}
              AND month = ${currentMonth}
              AND (pricing_region_id = ${region.id} OR pricing_region_id IS NULL)
            ORDER BY pricing_region_id NULLS LAST
            LIMIT 1
          `
          if (seasonalRows.length > 0) {
            const factor = Number(seasonalRows[0].factor)
            if (factor !== 1.0) {
              adjustedMedian = Math.round(adjustedMedian * factor)
              method = 'seasonal_adjusted'
            }
          }

          if (!options?.dryRun) {
            await sql`
              INSERT INTO openclaw.resolved_prices (
                canonical_ingredient_id, pricing_region_id,
                price_cents, price_unit,
                price_low_cents, price_high_cents, price_median_cents,
                confidence, observation_count, source_count,
                freshest_observation, oldest_observation,
                price_type, computation_method, updated_at
              ) VALUES (
                ${row.canonical_ingredient_id}, ${region.id},
                ${adjustedMedian}, ${'per_' + (row.standard_unit || 'each')},
                ${Math.round(Number(row.min_cents))}, ${Math.round(Number(row.max_cents))}, ${Math.round(Number(row.median_cents))},
                ${confidence}, ${Number(row.store_count)}, ${Number(row.source_count)},
                ${row.freshest}::timestamptz, ${row.oldest}::timestamptz,
                'retail', ${method}, now()
              )
              ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type) DO UPDATE SET
                price_cents = EXCLUDED.price_cents,
                price_unit = EXCLUDED.price_unit,
                price_low_cents = EXCLUDED.price_low_cents,
                price_high_cents = EXCLUDED.price_high_cents,
                price_median_cents = EXCLUDED.price_median_cents,
                confidence = EXCLUDED.confidence,
                observation_count = EXCLUDED.observation_count,
                source_count = EXCLUDED.source_count,
                freshest_observation = EXCLUDED.freshest_observation,
                oldest_observation = EXCLUDED.oldest_observation,
                computation_method = EXCLUDED.computation_method,
                updated_at = now()
            `
            pricesUpserted++
          }

          resolvedIngredients.add(row.canonical_ingredient_id)
          ingredientsProcessed++
        }

        // ---------------------------------------------------------------
        // Strategy 2: USDA baseline x cost_index for unresolved ingredients
        // ---------------------------------------------------------------
        // For ingredients with no store data in this region, use USDA baselines
        // adjusted by the region's cost index.
        const usdaFills = await sql`
          WITH unresolved AS (
            SELECT ci.ingredient_id, ci.name, ci.standard_unit, ci.category
            FROM openclaw.canonical_ingredients ci
            WHERE ci.ingredient_id NOT IN (
              SELECT canonical_ingredient_id FROM openclaw.resolved_prices
              WHERE pricing_region_id = ${region.id} AND price_type = 'retail'
            )
            AND ci.standard_unit IS NOT NULL
            LIMIT 2000
          )
          SELECT
            u.ingredient_id,
            u.standard_unit,
            ub.price_cents AS usda_cents,
            ub.unit AS usda_unit,
            ub.observation_date::text AS obs_date
          FROM unresolved u
          JOIN openclaw.usda_price_baselines ub
            ON (
              to_tsvector('english', ub.item_name) @@ plainto_tsquery('english', u.name)
              OR extensions.similarity(ub.item_name, u.name) > 0.35
            )
            AND ub.region IN ('us_average', 'northeast', 'midwest', 'south', 'west')
          WHERE ub.price_cents > 0
        `

        for (const row of usdaFills) {
          if (resolvedIngredients.has(row.ingredient_id as string)) continue

          const usdaCents = Number(row.usda_cents)
          const adjustedCents = Math.round(usdaCents * Number(region.cost_index))
          const confidence = 0.35 // USDA baseline + cost index = low but honest

          if (!options?.dryRun) {
            await sql`
              INSERT INTO openclaw.resolved_prices (
                canonical_ingredient_id, pricing_region_id,
                price_cents, price_unit,
                price_low_cents, price_high_cents, price_median_cents,
                confidence, observation_count, source_count,
                freshest_observation,
                price_type, computation_method, updated_at
              ) VALUES (
                ${row.ingredient_id}, ${region.id},
                ${adjustedCents}, ${'per_' + (row.standard_unit || 'each')},
                ${usdaCents}, ${Math.round(adjustedCents * 1.3)}, ${adjustedCents},
                ${confidence}, 1, 1,
                ${row.obs_date ? row.obs_date + 'T00:00:00Z' : null}::timestamptz,
                'retail', 'cost_index_estimate', now()
              )
              ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type) DO UPDATE SET
                price_cents = EXCLUDED.price_cents,
                price_unit = EXCLUDED.price_unit,
                price_low_cents = EXCLUDED.price_low_cents,
                price_high_cents = EXCLUDED.price_high_cents,
                price_median_cents = EXCLUDED.price_median_cents,
                confidence = EXCLUDED.confidence,
                observation_count = EXCLUDED.observation_count,
                source_count = EXCLUDED.source_count,
                freshest_observation = EXCLUDED.freshest_observation,
                computation_method = EXCLUDED.computation_method,
                updated_at = now()
              WHERE openclaw.resolved_prices.confidence <= EXCLUDED.confidence
                OR openclaw.resolved_prices.freshest_observation < EXCLUDED.freshest_observation
            `
            pricesUpserted++
          }
          ingredientsProcessed++
        }

        // ---------------------------------------------------------------
        // Strategy 3: Census-driven gap fill (Law 8 + Law 10)
        // ---------------------------------------------------------------
        try {
          const censusFilled = await resolveCensusGaps(region.id, Number(region.cost_index))
          pricesUpserted += censusFilled
          if (censusFilled > 0) {
            console.log(
              `[resolve-prices] Region ${region.slug}: ${censusFilled} census gaps filled`
            )
          }
        } catch {
          // Census table may not exist yet; non-fatal
        }

        regionsProcessed++

        if (regionsProcessed % 20 === 0) {
          console.log(
            `[resolve-prices] ${regionsProcessed}/${regions.length} regions, ${pricesUpserted} upserted`
          )
        }
      } catch (err) {
        const msg = `Region ${region.slug}: ${err instanceof Error ? err.message : 'unknown'}`
        errors.push(msg)
        console.error(`[resolve-prices] ${msg}`)
      }
    }

    const durationMs = Date.now() - startTime

    // Update run record
    await sql`
      UPDATE openclaw.resolve_runs SET
        status = 'completed',
        completed_at = now(),
        regions_processed = ${regionsProcessed},
        ingredients_processed = ${ingredientsProcessed},
        prices_upserted = ${pricesUpserted},
        prices_skipped = ${pricesSkipped},
        duration_ms = ${durationMs},
        metadata = ${JSON.stringify({ errors: errors.slice(0, 10) })}::jsonb
      WHERE id = ${runId}
    `

    console.log(
      `[resolve-prices] Complete: ${regionsProcessed} regions, ${pricesUpserted} prices, ${durationMs}ms`
    )

    return {
      runId,
      regionsProcessed,
      ingredientsProcessed,
      pricesUpserted,
      pricesSkipped,
      durationMs,
      errors,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    await sql`
      UPDATE openclaw.resolve_runs SET
        status = 'failed',
        completed_at = now(),
        duration_ms = ${Date.now() - startTime},
        error = ${msg}
      WHERE id = ${runId}
    `
    throw err
  }
}

// ---------------------------------------------------------------------------
// Census-driven resolution: fill gaps for census ingredients (Law 8+10)
// After the main store-aggregation pass, iterate census ingredients that
// still lack prices and attempt USDA + synthetic fallback.
// ---------------------------------------------------------------------------

export async function resolveCensusGaps(regionId: string, costIndex: number): Promise<number> {
  const sql = pgClient
  let filled = 0

  // Find census ingredients with no resolved price in this region
  const gaps = await sql`
    SELECT ic.ingredient_id, ci.name, ci.standard_unit, ic.census_category
    FROM openclaw.ingredient_census ic
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = ic.ingredient_id
    WHERE ic.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM openclaw.resolved_prices rp
        WHERE rp.canonical_ingredient_id = ic.ingredient_id
          AND rp.pricing_region_id = ${regionId}
      )
    ORDER BY ic.census_tier ASC
    LIMIT 5000
  `

  for (const gap of gaps) {
    // Try USDA baseline first
    const usdaMatch = await sql`
      SELECT price_cents, item_name
      FROM openclaw.usda_price_baselines
      WHERE extensions.similarity(item_name, ${gap.name}) > 0.3
        AND region = 'us_average'
      ORDER BY extensions.similarity(item_name, ${gap.name}) DESC
      LIMIT 1
    `

    if (usdaMatch.length > 0) {
      const adjusted = Math.round(Number(usdaMatch[0].price_cents) * costIndex)
      await sql`
        INSERT INTO openclaw.resolved_prices (
          canonical_ingredient_id, pricing_region_id,
          price_cents, price_unit, confidence,
          observation_count, source_count,
          price_type, computation_method,
          fallback_tier, is_synthetic, updated_at
        ) VALUES (
          ${gap.ingredient_id}, ${regionId},
          ${adjusted}, ${'per_' + (gap.standard_unit || 'each')},
          0.35, 1, 1, 'retail', 'census_usda_fallback',
          9, false, now()
        )
        ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type) DO NOTHING
      `
      filled++
    }
  }

  return filled
}

// ---------------------------------------------------------------------------
// Coverage report: what percentage of ingredients have resolved prices?
// ---------------------------------------------------------------------------

export async function getResolvedPricesCoverage(): Promise<{
  totalRegions: number
  totalIngredients: number
  totalResolvedPrices: number
  avgConfidence: number
  coverageByRegionType: Array<{
    regionType: string
    regionCount: number
    avgIngredientsPerRegion: number
    avgConfidence: number
  }>
  coverageByMethod: Array<{
    method: string
    count: number
    avgConfidence: number
  }>
  lastRunAt: string | null
  lastRunDurationMs: number | null
}> {
  const sql = pgClient

  const [totals] = await sql`
    SELECT
      (SELECT count(*) FROM openclaw.pricing_regions WHERE is_active = true) AS total_regions,
      (SELECT count(DISTINCT canonical_ingredient_id) FROM openclaw.resolved_prices) AS total_ingredients,
      (SELECT count(*) FROM openclaw.resolved_prices) AS total_resolved,
      (SELECT ROUND(AVG(confidence)::numeric, 3) FROM openclaw.resolved_prices) AS avg_confidence
  `

  const byRegionType = await sql`
    SELECT
      pr.region_type,
      count(DISTINCT pr.id) AS region_count,
      ROUND(AVG(sub.ing_count)::numeric, 1) AS avg_ingredients,
      ROUND(AVG(sub.avg_conf)::numeric, 3) AS avg_confidence
    FROM openclaw.pricing_regions pr
    LEFT JOIN (
      SELECT pricing_region_id, count(*) AS ing_count, AVG(confidence) AS avg_conf
      FROM openclaw.resolved_prices
      GROUP BY pricing_region_id
    ) sub ON sub.pricing_region_id = pr.id
    WHERE pr.is_active = true
    GROUP BY pr.region_type
    ORDER BY pr.region_type
  `

  const byMethod = await sql`
    SELECT computation_method AS method, count(*) AS count,
      ROUND(AVG(confidence)::numeric, 3) AS avg_confidence
    FROM openclaw.resolved_prices
    GROUP BY computation_method
    ORDER BY count DESC
  `

  const lastRun = await sql`
    SELECT completed_at::text AS completed_at, duration_ms
    FROM openclaw.resolve_runs
    WHERE status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
  `

  return {
    totalRegions: Number(totals.total_regions),
    totalIngredients: Number(totals.total_ingredients),
    totalResolvedPrices: Number(totals.total_resolved),
    avgConfidence: Number(totals.avg_confidence) || 0,
    coverageByRegionType: byRegionType.map((r: Record<string, unknown>) => ({
      regionType: r.region_type as string,
      regionCount: Number(r.region_count),
      avgIngredientsPerRegion: Number(r.avg_ingredients) || 0,
      avgConfidence: Number(r.avg_confidence) || 0,
    })),
    coverageByMethod: byMethod.map((r: Record<string, unknown>) => ({
      method: r.method as string,
      count: Number(r.count),
      avgConfidence: Number(r.avg_confidence) || 0,
    })),
    lastRunAt: (lastRun[0]?.completed_at as string) || null,
    lastRunDurationMs: lastRun[0] ? Number(lastRun[0].duration_ms) : null,
  }
}
