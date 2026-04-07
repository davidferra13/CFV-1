/**
 * Price Intelligence Coverage Report
 *
 * Shows what data we have, where the gaps are, and how confident
 * the system is for any given state or ingredient category.
 *
 * NOT a 'use server' file. Called by server actions or API routes.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface StateCoverage {
  state: string
  chains_present: number
  chains_with_prices: number
  products_priced: number
  total_prices: number
  last_price_date: string | null
  coverage_level: 'no_data' | 'sparse' | 'partial' | 'moderate' | 'good'
}

export interface CategoryCoverage {
  category: string
  items_with_prices: number
  total_items: number
  avg_data_points: number
  coverage_pct: number
}

export interface SourceTypeCoverage {
  source_type: string
  chains: number
  avg_reliability: number
  total_prices: number
}

export interface CoverageReport {
  timestamp: string
  summary: {
    total_chains: number
    chains_with_data: number
    total_products: number
    total_prices: number
    usda_baselines: number
    states_covered: number
    states_with_data: number
    estimation_models: number
    farmers_markets: number
  }
  by_state: StateCoverage[]
  by_source_type: SourceTypeCoverage[]
  by_category: CategoryCoverage[]
  weakest_states: StateCoverage[]
  strongest_states: StateCoverage[]
}

export async function generateCoverageReport(): Promise<CoverageReport> {
  const [
    chainsResult,
    chainsWithDataResult,
    productsResult,
    pricesResult,
    usdaResult,
    statesResult,
    modelsResult,
    farmersResult,
    stateCoverage,
    sourceTypes,
    categoryCoverage,
  ] = await Promise.all([
    db.execute(sql`SELECT count(*)::int AS cnt FROM openclaw.chains WHERE is_active = true`),
    db.execute(sql`
      SELECT count(DISTINCT c.id)::int AS cnt
      FROM openclaw.chains c
      JOIN openclaw.stores s ON s.chain_id = c.id
      JOIN openclaw.store_products sp ON sp.store_id = s.id
    `),
    db.execute(sql`SELECT count(*)::int AS cnt FROM openclaw.products`),
    db.execute(sql`SELECT count(*)::int AS cnt FROM openclaw.store_products`),
    db.execute(sql`SELECT count(*)::int AS cnt FROM openclaw.usda_price_baselines`),
    db.execute(
      sql`SELECT count(DISTINCT state)::int AS cnt FROM openclaw.stores WHERE is_active = true`
    ),
    db.execute(
      sql`SELECT count(*)::int AS cnt FROM openclaw.price_estimation_models WHERE is_active = true`
    ),
    db.execute(sql`SELECT count(*)::int AS cnt FROM openclaw.farmers_markets`),

    // Per-state coverage
    db.execute(sql`
      SELECT * FROM openclaw.coverage_gaps ORDER BY COALESCE(total_prices, 0) ASC
    `),

    // Per source type
    db.execute(sql`
      SELECT
        c.source_type,
        count(DISTINCT c.id)::int AS chains,
        round(avg(c.reliability_weight)::numeric, 2) AS avg_reliability,
        count(sp.id)::int AS total_prices
      FROM openclaw.chains c
      LEFT JOIN openclaw.stores s ON s.chain_id = c.id
      LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
      WHERE c.is_active = true
      GROUP BY c.source_type
      ORDER BY total_prices DESC
    `),

    // Per ingredient category (from USDA baselines)
    db.execute(sql`
      SELECT
        ub.category,
        count(*)::int AS items_with_prices,
        count(*)::int AS total_items,
        1 AS avg_data_points,
        100.0 AS coverage_pct
      FROM openclaw.usda_price_baselines ub
      WHERE ub.region = 'us_average'
      GROUP BY ub.category
      ORDER BY ub.category
    `),
  ])

  const states = stateCoverage as unknown as StateCoverage[]
  const weakest = states.slice(0, 5)
  const strongest = [...states].reverse().slice(0, 5)

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total_chains: (chainsResult as any)[0]?.cnt ?? 0,
      chains_with_data: (chainsWithDataResult as any)[0]?.cnt ?? 0,
      total_products: (productsResult as any)[0]?.cnt ?? 0,
      total_prices: (pricesResult as any)[0]?.cnt ?? 0,
      usda_baselines: (usdaResult as any)[0]?.cnt ?? 0,
      states_covered: (statesResult as any)[0]?.cnt ?? 0,
      states_with_data: states.filter((s) => s.coverage_level !== 'no_data').length,
      estimation_models: (modelsResult as any)[0]?.cnt ?? 0,
      farmers_markets: (farmersResult as any)[0]?.cnt ?? 0,
    },
    by_state: states,
    by_source_type: sourceTypes as unknown as SourceTypeCoverage[],
    by_category: categoryCoverage as unknown as CategoryCoverage[],
    weakest_states: weakest,
    strongest_states: strongest,
  }
}

/**
 * Quick summary for dashboard display.
 */
export async function getCoverageSummary() {
  const rows = (await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM openclaw.chains WHERE is_active = true) AS total_chains,
      (SELECT count(*)::int FROM openclaw.store_products) AS total_prices,
      (SELECT count(DISTINCT state)::int FROM openclaw.stores WHERE is_active = true) AS states_with_stores,
      (SELECT count(*)::int FROM openclaw.usda_price_baselines) AS usda_baselines,
      (SELECT count(*)::int FROM openclaw.farmers_markets) AS farmers_markets,
      (SELECT count(*)::int FROM openclaw.price_estimation_models WHERE is_active = true) AS estimation_models
  `)) as unknown as Array<{
    total_chains: number
    total_prices: number
    states_with_stores: number
    usda_baselines: number
    farmers_markets: number
    estimation_models: number
  }>

  return rows[0]
}
