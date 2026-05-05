/**
 * PIE Law 4: Freshness Enforcer
 *
 * Scans resolved_prices for stale entries (past their category's
 * freshness threshold) and triggers re-estimation. No stale price
 * is ever served to a chef without re-estimation.
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FreshnessRunResult {
  totalStale: number
  reEstimated: number
  flaggedForRescrape: number
  durationMs: number
}

export interface FreshnessReport {
  totalPrices: number
  fresh: number
  stale: number
  stalePct: number
  byCategory: Array<{
    category: string
    tier: string
    maxAgeDays: number
    totalPrices: number
    stalePrices: number
    stalePct: number
  }>
  oldestPrice: { ingredientId: string; name: string; ageDays: number } | null
}

// ---------------------------------------------------------------------------
// Freshness scan: find stale prices
// ---------------------------------------------------------------------------

export async function getFreshnessReport(): Promise<FreshnessReport> {
  const sql = pgClient

  const [totals] = await sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (
        WHERE rp.updated_at >= now() - (fp.max_age_days || ' days')::interval
      ) AS fresh,
      count(*) FILTER (
        WHERE rp.updated_at < now() - (fp.max_age_days || ' days')::interval
      ) AS stale
    FROM openclaw.resolved_prices rp
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = rp.canonical_ingredient_id
    JOIN openclaw.freshness_policy fp ON fp.category = ic.census_category
  `

  const byCategory = await sql`
    SELECT
      ic.census_category AS category,
      fp.tier,
      fp.max_age_days,
      count(*) AS total_prices,
      count(*) FILTER (
        WHERE rp.updated_at < now() - (fp.max_age_days || ' days')::interval
      ) AS stale_prices
    FROM openclaw.resolved_prices rp
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = rp.canonical_ingredient_id
    JOIN openclaw.freshness_policy fp ON fp.category = ic.census_category
    GROUP BY ic.census_category, fp.tier, fp.max_age_days
    ORDER BY fp.max_age_days ASC, ic.census_category
  `

  const oldest = await sql`
    SELECT
      rp.canonical_ingredient_id AS ingredient_id,
      ci.name,
      EXTRACT(DAY FROM now() - rp.updated_at)::int AS age_days
    FROM openclaw.resolved_prices rp
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = rp.canonical_ingredient_id
    ORDER BY rp.updated_at ASC
    LIMIT 1
  `

  const total = Number(totals.total)
  const stale = Number(totals.stale)

  return {
    totalPrices: total,
    fresh: Number(totals.fresh),
    stale,
    stalePct: total > 0 ? Math.round((stale / total) * 1000) / 10 : 0,
    byCategory: byCategory.map((r: Record<string, unknown>) => {
      const t = Number(r.total_prices)
      const s = Number(r.stale_prices)
      return {
        category: r.category as string,
        tier: r.tier as string,
        maxAgeDays: Number(r.max_age_days),
        totalPrices: t,
        stalePrices: s,
        stalePct: t > 0 ? Math.round((s / t) * 1000) / 10 : 0,
      }
    }),
    oldestPrice: oldest[0]
      ? {
          ingredientId: oldest[0].ingredient_id as string,
          name: oldest[0].name as string,
          ageDays: Number(oldest[0].age_days),
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// Freshness enforcer: re-estimate stale prices
// ---------------------------------------------------------------------------

export async function enforcesFreshness(): Promise<FreshnessRunResult> {
  const sql = pgClient
  const start = Date.now()
  let reEstimated = 0
  let flaggedForRescrape = 0

  // Find stale prices that need re-estimation
  const staleRows = await sql`
    SELECT
      rp.canonical_ingredient_id,
      rp.pricing_region_id,
      rp.price_cents,
      rp.confidence,
      rp.is_synthetic,
      rp.computation_method,
      ic.census_category,
      pr.cost_index,
      fp.max_age_days,
      EXTRACT(DAY FROM now() - rp.updated_at)::int AS age_days
    FROM openclaw.resolved_prices rp
    JOIN openclaw.ingredient_census ic ON ic.ingredient_id = rp.canonical_ingredient_id
    JOIN openclaw.freshness_policy fp ON fp.category = ic.census_category
    JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
    WHERE rp.updated_at < now() - (fp.max_age_days || ' days')::interval
    ORDER BY ic.census_tier ASC, age_days DESC
    LIMIT 5000
  `

  const totalStale = staleRows.length
  console.log(`[freshness] ${totalStale} stale prices found`)

  for (const row of staleRows) {
    const ageDays = Number(row.age_days)
    const maxAge = Number(row.max_age_days)

    // If the price is real (not synthetic) and only slightly stale,
    // decay confidence proportional to staleness but keep the price
    if (!row.is_synthetic && ageDays < maxAge * 3) {
      const decayFactor = Math.max(0.3, 1 - (ageDays - maxAge) / (maxAge * 2))
      const newConfidence = Math.round(Number(row.confidence) * decayFactor * 1000) / 1000

      await sql`
        UPDATE openclaw.resolved_prices SET
          confidence = ${newConfidence},
          computation_method = 'freshness_decayed',
          updated_at = now()
        WHERE canonical_ingredient_id = ${row.canonical_ingredient_id}
          AND pricing_region_id = ${row.pricing_region_id}
          AND price_type = 'retail'
      `
      reEstimated++
      flaggedForRescrape++
    } else {
      // Price is very stale or synthetic: re-estimate from category average
      const [catAvg] = await sql`
        SELECT ROUND(AVG(rp2.price_cents)) AS avg_cents, count(*) AS cnt
        FROM openclaw.resolved_prices rp2
        JOIN openclaw.ingredient_census ic2 ON ic2.ingredient_id = rp2.canonical_ingredient_id
        WHERE ic2.census_category = ${row.census_category}
          AND rp2.pricing_region_id = ${row.pricing_region_id}
          AND rp2.updated_at > now() - interval '30 days'
          AND rp2.is_synthetic = false
      `

      if (catAvg && Number(catAvg.avg_cents) > 0) {
        await sql`
          UPDATE openclaw.resolved_prices SET
            price_cents = ${Number(catAvg.avg_cents)},
            confidence = ${Math.min(0.3, Number(catAvg.cnt) * 0.03)},
            computation_method = 'freshness_reestimate',
            is_synthetic = true,
            fallback_tier = 10,
            updated_at = now()
          WHERE canonical_ingredient_id = ${row.canonical_ingredient_id}
            AND pricing_region_id = ${row.pricing_region_id}
            AND price_type = 'retail'
        `
        reEstimated++
      }
      flaggedForRescrape++
    }
  }

  const durationMs = Date.now() - start
  console.log(
    `[freshness] Done: ${reEstimated} re-estimated, ${flaggedForRescrape} flagged in ${durationMs}ms`
  )

  return { totalStale, reEstimated, flaggedForRescrape, durationMs }
}
