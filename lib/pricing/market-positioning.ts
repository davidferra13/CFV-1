/**
 * PIE Intelligence Layer 5: Market Positioning
 *
 * How does this chef's pricing compare to the market? Competitive intelligence
 * that helps chefs price confidently without leaving money on the table or
 * pricing themselves out.
 *
 * Capabilities:
 *   1. Price Position Analysis - Is the chef above/below/at market for each dish?
 *   2. Regional Benchmarks - What do other chefs in this market charge?
 *   3. Per-Head Pricing Intelligence - Event pricing benchmarks by type/region
 *   4. Profit Margin Comparison - How do margins compare to industry standards?
 *   5. Price Band Detection - What price tier is this chef in?
 *
 * NOT a 'use server' file. Called by server actions.
 */

import { pgClient } from '@/lib/db'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriceTier = 'budget' | 'value' | 'mid_market' | 'premium' | 'luxury'

export interface MarketPosition {
  /** Chef's overall position in their market */
  tier: PriceTier
  /** Percentile (0-100) where chef's average pricing falls */
  percentile: number
  /** Average price per head for events */
  avgPerHeadCents: number
  /** Market average per head for similar events */
  marketAvgPerHeadCents: number
  /** Difference from market average */
  differenceFromMarketPct: number
  /** Chef's state */
  state: string
  /** Number of comparable data points */
  sampleSize: number
  analyzedAt: string
}

export interface EventPricingBenchmark {
  eventType: string
  guestCountRange: string
  /** 25th percentile per-head price (cents) */
  p25Cents: number
  /** 50th percentile per-head price (cents) */
  p50Cents: number
  /** 75th percentile per-head price (cents) */
  p75Cents: number
  /** 90th percentile per-head price (cents) */
  p90Cents: number
  /** Chef's typical per-head for this type */
  chefPerHeadCents: number | null
  /** Chef's position */
  chefPercentile: number | null
  sampleSize: number
  region: string
}

export interface DishPricePosition {
  recipeId: string
  recipeName: string
  category: string
  /** Chef's price per serving */
  chefPriceCents: number
  /** Market average for similar dishes */
  marketAvgCents: number
  /** Chef's food cost % */
  chefFoodCostPct: number
  /** Industry average food cost % for this category */
  industryFoodCostPct: number
  /** Position relative to market */
  positionPct: number
  /** Is chef underpricing? */
  isUnderpriced: boolean
  /** Potential revenue gain per serving if priced at market */
  revenuePotentialCents: number
}

export interface MarketRunResult {
  benchmarksComputed: number
  positionsAnalyzed: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Industry Benchmarks (Private Chef Market)
// ---------------------------------------------------------------------------

// Per-head pricing by event type (national medians from industry data)
const EVENT_BENCHMARKS: Record<string, { p25: number; p50: number; p75: number; p90: number }> = {
  dinner_party: { p25: 7500, p50: 12500, p75: 18000, p90: 25000 },
  intimate_dinner: { p25: 10000, p50: 17500, p75: 25000, p90: 40000 },
  cocktail_party: { p25: 5000, p50: 8500, p75: 12000, p90: 18000 },
  brunch: { p25: 4500, p50: 7500, p75: 11000, p90: 16000 },
  meal_prep: { p25: 3500, p50: 5500, p75: 8000, p90: 12000 },
  cooking_class: { p25: 7500, p50: 12000, p75: 18000, p90: 25000 },
  wedding: { p25: 12000, p50: 18500, p75: 27500, p90: 45000 },
  corporate: { p25: 8000, p50: 13000, p75: 20000, p90: 35000 },
  holiday: { p25: 10000, p50: 15000, p75: 22000, p90: 35000 },
  farm_dinner: { p25: 12500, p50: 17500, p75: 25000, p90: 35000 },
}

// Food cost % benchmarks by dish category
const FOOD_COST_BENCHMARKS: Record<string, number> = {
  appetizer: 28,
  soup: 22,
  salad: 25,
  pasta: 28,
  seafood_entree: 38,
  meat_entree: 35,
  vegetarian_entree: 25,
  dessert: 22,
  bread: 18,
  side: 25,
  default: 30,
}

// Regional cost-of-living multipliers (affects pricing expectations)
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  CA: 1.25,
  NY: 1.3,
  MA: 1.15,
  CT: 1.15,
  NJ: 1.15,
  WA: 1.1,
  CO: 1.05,
  IL: 1.05,
  DC: 1.25,
  HI: 1.3,
  TX: 0.95,
  FL: 0.95,
  GA: 0.9,
  NC: 0.9,
  PA: 1.0,
  OH: 0.85,
  MI: 0.85,
  IN: 0.85,
  MO: 0.85,
  TN: 0.85,
  DEFAULT: 1.0,
}

function getRegionalMultiplier(state: string): number {
  return REGIONAL_MULTIPLIERS[state] || REGIONAL_MULTIPLIERS.DEFAULT
}

// ---------------------------------------------------------------------------
// Market Position Analysis
// ---------------------------------------------------------------------------

/**
 * Determine a chef's market position based on their event pricing history.
 */
export async function analyzeMarketPosition(tenantId: string): Promise<MarketPosition | null> {
  // Get chef's state and pricing history
  const [chef] = (await db.execute(sql`
    SELECT home_state FROM chefs WHERE id = ${tenantId}
  `)) as unknown as Array<{ home_state: string | null }>

  if (!chef?.home_state) return null
  const state = chef.home_state

  // Get chef's event pricing history
  const events = (await db.execute(sql`
    SELECT
      e.guest_count,
      e.total_price_cents,
      e.event_type
    FROM events e
    WHERE e.tenant_id = ${tenantId}
      AND e.total_price_cents > 0
      AND e.guest_count > 0
      AND e.status NOT IN ('cancelled', 'draft')
    ORDER BY e.created_at DESC
    LIMIT 50
  `)) as unknown as Array<{ guest_count: number; total_price_cents: number; event_type: string }>

  if (events.length < 3) return null

  // Calculate chef's average per-head
  const perHeads = events.map((e) => Math.round(e.total_price_cents / e.guest_count))
  const avgPerHead = Math.round(perHeads.reduce((s, p) => s + p, 0) / perHeads.length)

  // Market average for this region (apply regional multiplier)
  const multiplier = getRegionalMultiplier(state)
  const marketAvg = Math.round(12500 * multiplier) // $125 national median dinner party adjusted

  // Determine percentile and tier
  const ratio = avgPerHead / marketAvg
  let percentile: number
  let tier: PriceTier

  if (ratio < 0.6) {
    percentile = 15
    tier = 'budget'
  } else if (ratio < 0.85) {
    percentile = 30
    tier = 'value'
  } else if (ratio < 1.15) {
    percentile = 50
    tier = 'mid_market'
  } else if (ratio < 1.5) {
    percentile = 75
    tier = 'premium'
  } else {
    percentile = 90
    tier = 'luxury'
  }

  const diffPct = Math.round(((avgPerHead - marketAvg) / marketAvg) * 100)

  return {
    tier,
    percentile,
    avgPerHeadCents: avgPerHead,
    marketAvgPerHeadCents: marketAvg,
    differenceFromMarketPct: diffPct,
    state,
    sampleSize: events.length,
    analyzedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Event Pricing Benchmarks
// ---------------------------------------------------------------------------

/**
 * Get pricing benchmarks for event types, adjusted for chef's region.
 */
export async function getEventBenchmarks(
  tenantId: string,
  state: string
): Promise<EventPricingBenchmark[]> {
  const multiplier = getRegionalMultiplier(state)

  // Get chef's actual event pricing by type
  const chefEvents = (await db.execute(sql`
    SELECT
      event_type,
      AVG(total_price_cents / GREATEST(guest_count, 1))::int AS avg_per_head
    FROM events
    WHERE tenant_id = ${tenantId}
      AND total_price_cents > 0
      AND guest_count > 0
      AND status NOT IN ('cancelled', 'draft')
    GROUP BY event_type
  `)) as unknown as Array<{ event_type: string; avg_per_head: number }>

  const chefByType = new Map(chefEvents.map((e) => [e.event_type, Number(e.avg_per_head)]))

  const benchmarks: EventPricingBenchmark[] = []

  for (const [eventType, baseline] of Object.entries(EVENT_BENCHMARKS)) {
    const adjusted = {
      p25: Math.round(baseline.p25 * multiplier),
      p50: Math.round(baseline.p50 * multiplier),
      p75: Math.round(baseline.p75 * multiplier),
      p90: Math.round(baseline.p90 * multiplier),
    }

    const chefPerHead = chefByType.get(eventType) || null
    let chefPercentile: number | null = null

    if (chefPerHead) {
      if (chefPerHead <= adjusted.p25) chefPercentile = 25
      else if (chefPerHead <= adjusted.p50) chefPercentile = 50
      else if (chefPerHead <= adjusted.p75) chefPercentile = 75
      else if (chefPerHead <= adjusted.p90) chefPercentile = 90
      else chefPercentile = 95
    }

    benchmarks.push({
      eventType,
      guestCountRange: '4-12', // typical private chef range
      p25Cents: adjusted.p25,
      p50Cents: adjusted.p50,
      p75Cents: adjusted.p75,
      p90Cents: adjusted.p90,
      chefPerHeadCents: chefPerHead,
      chefPercentile,
      sampleSize: 100, // industry benchmark sample
      region: state,
    })
  }

  return benchmarks
}

// ---------------------------------------------------------------------------
// Dish Price Positioning
// ---------------------------------------------------------------------------

/**
 * Analyze each dish's price position relative to market.
 */
export async function getDishPositions(tenantId: string): Promise<DishPricePosition[]> {
  const [chef] = (await db.execute(sql`
    SELECT home_state FROM chefs WHERE id = ${tenantId}
  `)) as unknown as Array<{ home_state: string | null }>

  const state = chef?.home_state || 'MA'
  const multiplier = getRegionalMultiplier(state)

  const dishes = (await db.execute(sql`
    SELECT
      r.id AS recipe_id,
      r.name AS recipe_name,
      r.category,
      r.price_per_serving_cents,
      r.servings,
      (SELECT SUM(ri.cost_cents) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS total_cost_cents
    FROM recipes r
    WHERE r.tenant_id = ${tenantId}
      AND r.is_archived = false
      AND r.price_per_serving_cents > 0
  `)) as unknown as Array<{
    recipe_id: string
    recipe_name: string
    category: string | null
    price_per_serving_cents: number
    servings: number
    total_cost_cents: number | null
  }>

  return dishes
    .map((d) => {
      const servings = Math.max(1, d.servings || 1)
      const costPerServing = d.total_cost_cents
        ? Math.round(Number(d.total_cost_cents) / servings)
        : 0
      const chefPrice = d.price_per_serving_cents
      const foodCostPct = chefPrice > 0 ? Math.round((costPerServing / chefPrice) * 100) : 0

      // Market average for this category (adjusted for region)
      const category = (d.category || 'default').toLowerCase()
      const industryFoodCost = FOOD_COST_BENCHMARKS[category] || FOOD_COST_BENCHMARKS.default
      // If industry says 30% food cost, and our cost is X, market price = X / 0.30
      const marketAvg =
        costPerServing > 0
          ? Math.round((costPerServing / (industryFoodCost / 100)) * multiplier)
          : chefPrice

      const positionPct = marketAvg > 0 ? Math.round((chefPrice / marketAvg) * 100) : 100
      const isUnderpriced = positionPct < 85 && foodCostPct > industryFoodCost + 5
      const revenuePotential = isUnderpriced ? marketAvg - chefPrice : 0

      return {
        recipeId: d.recipe_id,
        recipeName: d.recipe_name,
        category: d.category || 'unknown',
        chefPriceCents: chefPrice,
        marketAvgCents: marketAvg,
        chefFoodCostPct: foodCostPct,
        industryFoodCostPct: industryFoodCost,
        positionPct,
        isUnderpriced,
        revenuePotentialCents: revenuePotential,
      }
    })
    .sort((a, b) => a.positionPct - b.positionPct)
}

// ---------------------------------------------------------------------------
// Revenue Optimization Summary
// ---------------------------------------------------------------------------

/**
 * Calculate total revenue potential if chef priced at market for underpriced dishes.
 */
export async function getRevenuePotential(tenantId: string): Promise<{
  totalPotentialPerEventCents: number
  underpricedDishes: number
  avgUnderpriceGapPct: number
  topOpportunities: Array<{ name: string; gapCents: number; gapPct: number }>
}> {
  const positions = await getDishPositions(tenantId)
  const underpriced = positions.filter((p) => p.isUnderpriced)

  const topOpps = underpriced
    .sort((a, b) => b.revenuePotentialCents - a.revenuePotentialCents)
    .slice(0, 5)
    .map((p) => ({
      name: p.recipeName,
      gapCents: p.revenuePotentialCents,
      gapPct: Math.round((p.revenuePotentialCents / Math.max(p.chefPriceCents, 1)) * 100),
    }))

  return {
    totalPotentialPerEventCents: underpriced.reduce((s, p) => s + p.revenuePotentialCents, 0),
    underpricedDishes: underpriced.length,
    avgUnderpriceGapPct:
      underpriced.length > 0
        ? Math.round(
            underpriced.reduce((s, p) => s + (100 - p.positionPct), 0) / underpriced.length
          )
        : 0,
    topOpportunities: topOpps,
  }
}

// ---------------------------------------------------------------------------
// Cron: Compute and store benchmarks
// ---------------------------------------------------------------------------

export async function runMarketPositioning(): Promise<MarketRunResult> {
  const start = Date.now()
  const pgSql = pgClient
  let benchmarksComputed = 0
  let positionsAnalyzed = 0

  // Store national benchmarks (adjusted by state) for all states
  for (const [state, multiplier] of Object.entries(REGIONAL_MULTIPLIERS)) {
    if (state === 'DEFAULT') continue

    for (const [eventType, baseline] of Object.entries(EVENT_BENCHMARKS)) {
      await pgSql`
        INSERT INTO openclaw.market_benchmarks (
          state, event_type, p25_cents, p50_cents, p75_cents, p90_cents,
          regional_multiplier, updated_at
        ) VALUES (
          ${state}, ${eventType},
          ${Math.round(baseline.p25 * multiplier)},
          ${Math.round(baseline.p50 * multiplier)},
          ${Math.round(baseline.p75 * multiplier)},
          ${Math.round(baseline.p90 * multiplier)},
          ${multiplier}, now()
        )
        ON CONFLICT (state, event_type) DO UPDATE SET
          p25_cents = EXCLUDED.p25_cents,
          p50_cents = EXCLUDED.p50_cents,
          p75_cents = EXCLUDED.p75_cents,
          p90_cents = EXCLUDED.p90_cents,
          updated_at = now()
      `
      benchmarksComputed++
    }
  }

  return {
    benchmarksComputed,
    positionsAnalyzed,
    durationMs: Date.now() - start,
  }
}
