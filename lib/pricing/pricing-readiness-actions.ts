'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

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
  } else if (
    input.greenDaysLast7 === 7 &&
    input.statesCovered === 50 &&
    input.storeZipCount >= 5000 &&
    input.foodProducts >= 600000 &&
    (input.freshPricePct ?? 0) >= 50
  ) {
    status = 'nationwide_ready'
    label = 'Nationwide ready'
    guidance =
      'National market thresholds are met and the pricing foundation can be presented as nationwide-ready.'
  } else if (input.greenDaysLast7 < 7) {
    guidance =
      'Regional coverage is live, but the last 7 days are not yet fully green. Treat nationwide readiness as still in progress.'
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
    const [syncRows, storeRows, productRows, priceRows, centroidRows] = await Promise.all([
      pgClient`
        SELECT
          COUNT(DISTINCT started_at::date)::int AS green_days_last_7,
          MAX(finished_at) AS last_healthy_sync_at
        FROM openclaw.sync_runs
        WHERE started_at > NOW() - INTERVAL '7 days'
          AND finished_at IS NOT NULL
          AND COALESCE(errors, 0) = 0
      `,
      pgClient`
        SELECT
          COUNT(*)::int AS stores,
          COUNT(DISTINCT state)::int AS states_covered,
          COUNT(DISTINCT zip)::int AS store_zip_count
        FROM openclaw.stores
        WHERE is_active = true
      `,
      pgClient`
        SELECT COUNT(*)::int AS food_products
        FROM openclaw.products
        WHERE is_food = true
      `,
      pgClient`
        SELECT
          COUNT(*)::int AS price_records,
          COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days')::int AS fresh_price_records
        FROM openclaw.store_products
      `,
      pgClient`
        SELECT COUNT(*)::int AS zip_centroid_count
        FROM openclaw.zip_centroids
      `,
    ])

    const priceRecords = toInt(priceRows[0]?.price_records)
    const freshPriceRecords = toInt(priceRows[0]?.fresh_price_records)

    market = buildMarketSection({
      lastHealthySyncAt: toIso(syncRows[0]?.last_healthy_sync_at),
      greenDaysLast7: toInt(syncRows[0]?.green_days_last_7),
      stores: toInt(storeRows[0]?.stores),
      statesCovered: toInt(storeRows[0]?.states_covered),
      storeZipCount: toInt(storeRows[0]?.store_zip_count),
      foodProducts: toInt(productRows[0]?.food_products),
      priceRecords,
      freshPricePct: toPct(freshPriceRecords, priceRecords),
      zipCentroidsLoaded: toInt(centroidRows[0]?.zip_centroid_count) > 0,
    })
  } catch {
    market = marketFallback
  }

  return {
    checkedAt,
    chef,
    market,
  }
}
