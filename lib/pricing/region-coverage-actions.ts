'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireChefAdmin } from '@/lib/auth/get-user'
import { getCoverage, type PiBridgeStateCoverage, type PiBridgeNationalCoverage } from './pi-bridge'

// ======================================================================
// Region Coverage Health (Admin)
// ======================================================================

export interface RegionCoverageRow {
  regionId: string
  regionName: string
  regionType: string
  state: string
  costIndex: number
  totalIngredients: number
  ingredientsWithPrice: number
  coveragePct: number
  avgConfidence: number
  freshestPrice: string | null
  stalestPrice: string | null
  sourceCount: number
}

export interface SourceHealthRow {
  sourceName: string
  sourceType: string
  status: string
  recordCount: number
  freshestRecordAt: string | null
  checkedAt: string
}

export interface FeedbackSummary {
  totalFeedback: number
  confirmed: number
  tooHigh: number
  tooLow: number
  wrongItem: number
  chefOverrides: number
  recentFeedback: number // last 7 days
}

export interface CoverageSummary {
  totalRegions: number
  activeRegions: number
  regionsWithPrices: number
  totalResolvedPrices: number
  avgCoverage: number
  avgConfidence: number
  sourceHealth: SourceHealthRow[]
  feedbackSummary: FeedbackSummary
  regionCoverage: RegionCoverageRow[]
}

/**
 * Get comprehensive pricing engine health dashboard data.
 * Admin-only. Returns region coverage, source health, and feedback stats.
 */
export async function getPricingEngineCoverage(): Promise<CoverageSummary> {
  await requireChefAdmin()
  // 1. Region coverage from resolved_prices
  let regionCoverage: RegionCoverageRow[] = []
  let totalRegions = 0
  let activeRegions = 0
  let regionsWithPrices = 0
  let totalResolvedPrices = 0
  let avgCoverage = 0
  let avgConfidence = 0

  try {
    const regionRows = (await db.execute(sql`
      SELECT
        pr.id AS region_id,
        pr.name AS region_name,
        pr.region_type,
        pr.state,
        pr.cost_index::float AS cost_index,
        COUNT(DISTINCT rp.canonical_ingredient_id)::int AS ingredients_with_price,
        COALESCE(AVG(rp.confidence)::float, 0) AS avg_confidence,
        MAX(rp.freshest_observation)::text AS freshest_price,
        MIN(rp.freshest_observation)::text AS stalest_price,
        COUNT(DISTINCT rp.id)::int AS source_count
      FROM openclaw.pricing_regions pr
      LEFT JOIN openclaw.resolved_prices rp ON rp.pricing_region_id = pr.id
      WHERE pr.is_active = true
      GROUP BY pr.id, pr.name, pr.region_type, pr.state, pr.cost_index
      ORDER BY COUNT(DISTINCT rp.canonical_ingredient_id) DESC
    `)) as unknown as Array<{
      region_id: string
      region_name: string
      region_type: string
      state: string
      cost_index: number
      ingredients_with_price: number
      avg_confidence: number
      freshest_price: string | null
      stalest_price: string | null
      source_count: number
    }>

    // Get total canonical ingredients for coverage percentage
    const totalIngRows = (await db.execute(sql`
      SELECT COUNT(DISTINCT canonical_ingredient_id)::int AS total
      FROM openclaw.resolved_prices
    `)) as unknown as Array<{ total: number }>
    const totalIngredients = totalIngRows[0]?.total ?? 200 // fallback to 200 as denominator

    regionCoverage = regionRows.map((r) => ({
      regionId: r.region_id,
      regionName: r.region_name,
      regionType: r.region_type,
      state: r.state,
      costIndex: r.cost_index,
      totalIngredients,
      ingredientsWithPrice: r.ingredients_with_price,
      coveragePct:
        totalIngredients > 0 ? Math.round((r.ingredients_with_price / totalIngredients) * 100) : 0,
      avgConfidence: Math.round(r.avg_confidence * 100) / 100,
      freshestPrice: r.freshest_price,
      stalestPrice: r.stalest_price,
      sourceCount: r.source_count,
    }))

    totalRegions = regionRows.length
    activeRegions = regionRows.length
    regionsWithPrices = regionRows.filter((r) => r.ingredients_with_price > 0).length
    totalResolvedPrices = regionRows.reduce((sum, r) => sum + r.source_count, 0)
    avgCoverage =
      regionCoverage.length > 0
        ? Math.round(regionCoverage.reduce((s, r) => s + r.coveragePct, 0) / regionCoverage.length)
        : 0
    avgConfidence =
      regionCoverage.length > 0
        ? Math.round(
            (regionCoverage.reduce((s, r) => s + r.avgConfidence, 0) / regionCoverage.length) * 100
          ) / 100
        : 0
  } catch {
    // Tables may not exist yet
  }

  // 2. Source health (latest check per source)
  let sourceHealth: SourceHealthRow[] = []
  try {
    const healthRows = (await db.execute(sql`
      SELECT DISTINCT ON (source_name)
        source_name, source_type, status,
        records_returned::int AS record_count,
        freshest_record_at::text AS freshest_record_at,
        check_time::text AS checked_at
      FROM openclaw.source_health_log
      ORDER BY source_name, check_time DESC
    `)) as unknown as Array<{
      source_name: string
      source_type: string
      status: string
      record_count: number
      freshest_record_at: string | null
      checked_at: string
    }>

    sourceHealth = healthRows.map((r) => ({
      sourceName: r.source_name,
      sourceType: r.source_type,
      status: r.status,
      recordCount: r.record_count,
      freshestRecordAt: r.freshest_record_at,
      checkedAt: r.checked_at,
    }))
  } catch {
    // Table may not exist yet
  }

  // 3. Feedback summary
  let feedbackSummary: FeedbackSummary = {
    totalFeedback: 0,
    confirmed: 0,
    tooHigh: 0,
    tooLow: 0,
    wrongItem: 0,
    chefOverrides: 0,
    recentFeedback: 0,
  }

  try {
    const fbRows = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE feedback = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE feedback = 'too_high')::int AS too_high,
        COUNT(*) FILTER (WHERE feedback = 'too_low')::int AS too_low,
        COUNT(*) FILTER (WHERE feedback = 'wrong_item')::int AS wrong_item,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS recent
      FROM price_feedback
    `)) as unknown as Array<{
      total: number
      confirmed: number
      too_high: number
      too_low: number
      wrong_item: number
      recent: number
    }>

    const overrideRows = (await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM chef_ingredient_prices
    `)) as unknown as Array<{ total: number }>

    if (fbRows[0]) {
      feedbackSummary = {
        totalFeedback: fbRows[0].total,
        confirmed: fbRows[0].confirmed,
        tooHigh: fbRows[0].too_high,
        tooLow: fbRows[0].too_low,
        wrongItem: fbRows[0].wrong_item,
        chefOverrides: overrideRows[0]?.total ?? 0,
        recentFeedback: fbRows[0].recent,
      }
    }
  } catch {
    // Tables may not exist yet
  }

  return {
    totalRegions,
    activeRegions,
    regionsWithPrices,
    totalResolvedPrices,
    avgCoverage,
    avgConfidence,
    sourceHealth,
    feedbackSummary,
    regionCoverage,
  }
}

/**
 * Get live Pi Bridge coverage for a specific state.
 * Returns real-time stats from the 1.1M price database.
 */
export async function getPiBridgeCoverage(
  state?: string
): Promise<PiBridgeStateCoverage | PiBridgeNationalCoverage | null> {
  await requireChefAdmin()
  return getCoverage(state)
}
