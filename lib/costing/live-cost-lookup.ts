'use server'

// Live Cost Lookup
// Lightweight server action for on-demand cost resolution of recipe IDs.
// Designed for debounced calls from the menu editor cost ticker.
// Single query against recipe_cost_summary view; no N+1.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CostConfidenceLevel } from './recipe-cost-provenance'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipeCostSummary = {
  recipeId: string
  recipeName: string
  totalCostCents: number | null
  ingredientCount: number
  hasAllPrices: boolean
  avgPriceConfidence: number | null
  lowConfidenceCount: number
  confidenceLevel: CostConfidenceLevel
}

export type LiveCostResult = {
  recipes: RecipeCostSummary[]
  // Aggregates
  totalCostCents: number | null
  totalIngredients: number
  pricedIngredients: number
  overallConfidence: CostConfidenceLevel
  overallConfidenceScore: number
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function lookupRecipeCosts(recipeIds: string[]): Promise<LiveCostResult> {
  const user = await requireChef()

  if (!recipeIds.length) {
    return {
      recipes: [],
      totalCostCents: null,
      totalIngredients: 0,
      pricedIngredients: 0,
      overallConfidence: 'insufficient',
      overallConfidenceScore: 0,
    }
  }

  // Deduplicate
  const uniqueIds = [...new Set(recipeIds)]

  const db: any = createServerClient()

  const { data: rows, error } = await db
    .from('recipe_cost_summary')
    .select(
      'recipe_id, recipe_name, total_ingredient_cost_cents, ingredient_count, has_all_prices, avg_price_confidence, low_confidence_count'
    )
    .in('recipe_id', uniqueIds)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[live-cost-lookup] Query failed:', error)
    throw new Error('Failed to look up recipe costs')
  }

  const resultMap = new Map<string, any>()
  for (const row of rows ?? []) {
    resultMap.set(row.recipe_id, row)
  }

  let aggTotalCents = 0
  let aggHasAnyCost = false
  let aggTotalIngredients = 0
  let aggPricedIngredients = 0
  let weightedConfidenceSum = 0
  let weightTotal = 0

  const recipes: RecipeCostSummary[] = uniqueIds.map((id) => {
    const row = resultMap.get(id)
    if (!row) {
      return {
        recipeId: id,
        recipeName: 'Unknown',
        totalCostCents: null,
        ingredientCount: 0,
        hasAllPrices: false,
        avgPriceConfidence: null,
        lowConfidenceCount: 0,
        confidenceLevel: 'insufficient' as CostConfidenceLevel,
      }
    }

    const costCents = row.total_ingredient_cost_cents ?? null
    const ingCount = Number(row.ingredient_count) || 0
    const hasAll = row.has_all_prices ?? false
    const avgConf = row.avg_price_confidence != null ? Number(row.avg_price_confidence) : null
    const lowConf = Number(row.low_confidence_count) || 0

    // Determine confidence level for this recipe
    let confLevel: CostConfidenceLevel = 'insufficient'
    if (ingCount > 0) {
      // Simple score: coverage (60%) + avg confidence (40%)
      const coveragePct = hasAll ? 100 : costCents != null ? 50 : 0
      const confPct = avgConf != null ? avgConf * 100 : 50
      const score = coveragePct * 0.6 + confPct * 0.4

      if (score >= 75) confLevel = 'high'
      else if (score >= 45) confLevel = 'moderate'
      else confLevel = 'low'

      weightedConfidenceSum += score * ingCount
      weightTotal += ingCount
    }

    if (costCents != null) {
      aggTotalCents += costCents
      aggHasAnyCost = true
    }
    aggTotalIngredients += ingCount
    if (hasAll) {
      aggPricedIngredients += ingCount
    }

    return {
      recipeId: id,
      recipeName: row.recipe_name ?? 'Unknown',
      totalCostCents: costCents,
      ingredientCount: ingCount,
      hasAllPrices: hasAll,
      avgPriceConfidence: avgConf,
      lowConfidenceCount: lowConf,
      confidenceLevel: confLevel,
    }
  })

  // Overall confidence
  const overallScore = weightTotal > 0 ? Math.round(weightedConfidenceSum / weightTotal) : 0
  let overallConfidence: CostConfidenceLevel = 'insufficient'
  if (weightTotal > 0) {
    if (overallScore >= 75) overallConfidence = 'high'
    else if (overallScore >= 45) overallConfidence = 'moderate'
    else overallConfidence = 'low'
  }

  return {
    recipes,
    totalCostCents: aggHasAnyCost ? aggTotalCents : null,
    totalIngredients: aggTotalIngredients,
    pricedIngredients: aggPricedIngredients,
    overallConfidence,
    overallConfidenceScore: overallScore,
  }
}
