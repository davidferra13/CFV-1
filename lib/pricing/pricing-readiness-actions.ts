'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { getOpenClawRuntimeHealth } from '@/lib/openclaw/health-contract'
import { getLatestGeographicPricingProof } from '@/lib/pricing/geographic-proof-query'

export type ChefPricingReadinessStatus = 'unknown' | 'not_ready' | 'usable_with_caveats' | 'ready'
export type MarketPricingReadinessStatus =
  | 'unknown'
  | 'no_live_data'
  | 'regional_in_progress'
  | 'nationwide_ready'

export interface PricingReadinessSummary {
  checkedAt: string
  chef: {
    totalIngredients: number
    pricedIngredients: number
    freshIngredients: number
    ingredientCoveragePct: number | null
    totalRecipes: number
    pricedRecipes: number
    freshRecipes: number
    recipeCoveragePct: number | null
    status: ChefPricingReadinessStatus
    label: string
    guidance: string
  }
  market: {
    lastHealthySyncAt: string | null
    greenDaysLast7: number
    stores: number
    statesCovered: number
    storeZipCount: number
    foodProducts: number
    priceRecords: number
    freshPricePct: number | null
    zipCentroidsLoaded: boolean
    status: MarketPricingReadinessStatus
    label: string
    guidance: string
  }
}

function toInt(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const text = String(value)
  return text === 'null' || text === 'undefined' ? null : text
}

function toPct(part: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((part / total) * 100)
}

function buildChefSection(input: {
  totalIngredients: number
  pricedIngredients: number
  freshIngredients: number
  totalRecipes: number
  pricedRecipes: number
  freshRecipes: number
}): PricingReadinessSummary['chef'] {
  const ingredientCoveragePct = toPct(input.pricedIngredients, input.totalIngredients)
  const recipeCoveragePct = toPct(input.pricedRecipes, input.totalRecipes)

  let status: ChefPricingReadinessStatus = 'not_ready'
  let label = 'Not ready'
  let guidance =
    'More ingredient and recipe pricing coverage is needed before menu costing is reliable.'

  if (input.totalIngredients === 0 && input.totalRecipes === 0) {
    guidance = 'Add ingredients or recipes to measure your personal pricing readiness.'
  } else {
    const ingredientReady = (ingredientCoveragePct ?? 0) >= 90
    const ingredientUsable = (ingredientCoveragePct ?? 0) >= 60
    const recipesRequired = input.totalRecipes > 0
    const recipeReady = !recipesRequired || (recipeCoveragePct ?? 0) >= 90
    const recipeUsable = !recipesRequired || (recipeCoveragePct ?? 0) >= 60

    if (ingredientReady && recipeReady) {
      status = 'ready'
      label = 'Ready now'
      guidance =
        input.totalRecipes > 0
          ? 'Your current ingredient and recipe coverage is strong enough for day-to-day menu costing.'
          : 'Ingredient coverage is strong. Add recipes to confirm full menu-cost readiness.'
    } else if (ingredientUsable && recipeUsable) {
      status = 'usable_with_caveats'
      label = 'Usable with caveats'
      guidance =
        input.totalRecipes > 0
          ? 'You can use pricing now, but some ingredients or recipes still rely on partial coverage.'
          : 'Ingredient coverage is usable, but recipe readiness is not established yet.'
    } else if (input.totalRecipes === 0 && input.totalIngredients > 0) {
      guidance = 'Ingredient pricing has started, but recipe readiness is not established yet.'
    }
  }

  return {
    ...input,
    ingredientCoveragePct,
    recipeCoveragePct,
    status,
    label,
    guidance,
  }
}

function buildMarketSection(input: {
  lastHealthySyncAt: string | null
  greenDaysLast7: number
  stores: number
  statesCovered: number
  storeZipCount: number
  foodProducts: number
  priceRecords: number
  freshPricePct: number | null
  zipCentroidsLoaded: boolean
}): PricingReadinessSummary['market'] {
  let status: MarketPricingReadinessStatus = 'regional_in_progress'
  let label = 'Regional today'
  let guidance =
    'Useful pricing exists where local market coverage is present, but nationwide completion is still in progress.'

  if (input.stores === 0 || input.priceRecords === 0) {
    status = 'no_live_data'
    label = 'No live market data yet'
    guidance =
      'The local market mirror does not have enough store-price data yet to support live readiness.'
  } else if (input.greenDaysLast7 < 7) {
    guidance =
      'Regional coverage is live, but the last 7 days are not yet fully green. Nationwide readiness requires a complete geographic pricing proof run.'
  }

  if (!input.zipCentroidsLoaded) {
    guidance += ' ZIP-based nationwide lookup still depends on the centroid table being loaded.'
  }

  return {
    ...input,
    status,
    label,
    guidance,
  }
}

function applyGeographicProofToMarketSection(
  market: PricingReadinessSummary['market'],
  proof: Awaited<ReturnType<typeof getLatestGeographicPricingProof>>
): PricingReadinessSummary['market'] {
  if (!proof.run) {
    return {
      ...market,
      status: market.status === 'no_live_data' ? 'no_live_data' : 'regional_in_progress',
      label: market.status === 'no_live_data' ? market.label : 'Proof missing',
      guidance:
        market.status === 'no_live_data'
          ? market.guidance
          : 'Raw product, ZIP, and state counts are not enough for nationwide pricing. Run the geographic pricing proof harness before claiming nationwide readiness.',
    }
  }

  const complete = proof.run.actualResultRows === proof.run.expectedResultRows
  const blockingGeographies = proof.geographySummaries.filter(
    (row) => row.planningOnlyCount > 0 || row.notUsableCount > 0
  ).length
  const verifyFirstGeographies = proof.geographySummaries.filter(
    (row) => row.verifyFirstCount > 0
  ).length

  if (complete && blockingGeographies === 0 && verifyFirstGeographies === 0) {
    return {
      ...market,
      status: 'nationwide_ready',
      label: 'Nationwide proof ready',
      guidance:
        'The latest geographic pricing proof run completed without blocked or verify-first geographies.',
    }
  }

  return {
    ...market,
    status: 'regional_in_progress',
    label: complete ? 'Proof requires review' : 'Proof incomplete',
    guidance: complete
      ? `${blockingGeographies} geographies are blocked and ${verifyFirstGeographies} require verification. Do not claim nationwide quote safety.`
      : `The latest geographic pricing proof run has ${proof.run.actualResultRows}/${proof.run.expectedResultRows} rows. Do not claim nationwide readiness.`,
  }
}

export async function getPricingReadinessSummary(): Promise<PricingReadinessSummary> {
  const user = await requireChef()
  const checkedAt = new Date().toISOString()

  const chefFallback = buildChefSection({
    totalIngredients: 0,
    pricedIngredients: 0,
    freshIngredients: 0,
    totalRecipes: 0,
    pricedRecipes: 0,
    freshRecipes: 0,
  })

  const marketFallback: PricingReadinessSummary['market'] = {
    lastHealthySyncAt: null,
    greenDaysLast7: 0,
    stores: 0,
    statesCovered: 0,
    storeZipCount: 0,
    foodProducts: 0,
    priceRecords: 0,
    freshPricePct: null,
    zipCentroidsLoaded: false,
    status: 'unknown',
    label: 'Unknown',
    guidance: 'Market readiness could not be verified right now.',
  }

  let chef = chefFallback
  let market = marketFallback

  try {
    const [ingredientRows, recipeRows] = await Promise.all([
      pgClient`
        SELECT
          COUNT(*)::int AS total_ingredients,
          COUNT(*) FILTER (
            WHERE COALESCE(cost_per_unit_cents, last_price_cents) IS NOT NULL
              AND COALESCE(cost_per_unit_cents, last_price_cents) > 0
          )::int AS priced_ingredients,
          COUNT(*) FILTER (
            WHERE last_price_date >= CURRENT_DATE - INTERVAL '7 days'
              AND COALESCE(cost_per_unit_cents, last_price_cents) IS NOT NULL
              AND COALESCE(cost_per_unit_cents, last_price_cents) > 0
          )::int AS fresh_ingredients
        FROM ingredients
        WHERE tenant_id = ${user.entityId}
          AND archived = false
      `,
      pgClient`
        SELECT
          COUNT(*) FILTER (WHERE ingredient_count > 0)::int AS total_recipes,
          COUNT(*) FILTER (WHERE ingredient_count > 0 AND has_all_prices = true)::int AS priced_recipes,
          COUNT(*) FILTER (
            WHERE ingredient_count > 0
              AND has_all_prices = true
              AND last_price_updated_at >= CURRENT_DATE - INTERVAL '7 days'
          )::int AS fresh_recipes
        FROM recipe_cost_summary
        WHERE tenant_id = ${user.entityId}
      `,
    ])

    chef = buildChefSection({
      totalIngredients: toInt(ingredientRows[0]?.total_ingredients),
      pricedIngredients: toInt(ingredientRows[0]?.priced_ingredients),
      freshIngredients: toInt(ingredientRows[0]?.fresh_ingredients),
      totalRecipes: toInt(recipeRows[0]?.total_recipes),
      pricedRecipes: toInt(recipeRows[0]?.priced_recipes),
      freshRecipes: toInt(recipeRows[0]?.fresh_recipes),
    })
  } catch {
    chef = {
      ...chefFallback,
      status: 'unknown',
      label: 'Unknown',
      guidance: 'Your pricing readiness could not be verified right now.',
    }
  }

  try {
    const health = await getOpenClawRuntimeHealth()

    market = buildMarketSection({
      lastHealthySyncAt: health.mirror.lastHealthySyncAt,
      greenDaysLast7: health.mirror.greenDaysLast7,
      stores: health.mirror.stores,
      statesCovered: health.mirror.statesCovered,
      storeZipCount: health.mirror.storeZipCount,
      foodProducts: health.coverage.foodProducts,
      priceRecords: health.mirror.priceRecords,
      freshPricePct: health.mirror.freshPricePct,
      zipCentroidsLoaded: health.mirror.zipCentroidsLoaded,
    })

    const geographicProof = await getLatestGeographicPricingProof()
    market = applyGeographicProofToMarketSection(market, geographicProof)
  } catch {
    market = marketFallback
  }

  return {
    checkedAt,
    chef,
    market,
  }
}
