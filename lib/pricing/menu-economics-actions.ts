'use server'

/**
 * Menu Economics Server Actions
 *
 * Chef-facing actions that surface margin health, food cost alerts,
 * and optimization suggestions. Wraps menu-economics.ts for use in
 * server components and client-triggered mutations.
 */

import { requireChef } from '@/lib/auth/get-user'
import {
  analyzeDish,
  analyzeMenu,
  whatIfPriceChange,
  getSeasonalMenuRanking,
} from './menu-economics'
import type { DishEconomics, MenuSummary, MenuOptimization, WhatIfResult } from './menu-economics'

// ---------------------------------------------------------------------------
// Margin Alert Thresholds
// ---------------------------------------------------------------------------

const MARGIN_ALERT_THRESHOLDS = {
  /** Food cost above this % triggers a critical alert */
  criticalFoodCostPct: 45,
  /** Food cost above this % triggers a warning */
  warningFoodCostPct: 38,
  /** Margin below this % triggers a critical alert */
  criticalMarginPct: 50,
  /** Number of rising-cost ingredients that trigger an alert */
  risingCostThreshold: 3,
}

export interface MarginAlert {
  type:
    | 'critical_food_cost'
    | 'warning_food_cost'
    | 'low_margin'
    | 'rising_costs'
    | 'seasonal_opportunity'
  recipeId: string
  recipeName: string
  message: string
  value: number
  threshold: number
}

export interface MenuEconomicsSnapshot {
  summary: MenuSummary
  alerts: MarginAlert[]
  topOptimizations: MenuOptimization[]
  seasonalWins: Array<{ recipeName: string; savingsPct: number }>
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Get a complete menu economics snapshot for the dashboard.
 * Includes margin alerts, top optimizations, and seasonal opportunities.
 */
export async function getMenuEconomicsSnapshot(): Promise<MenuEconomicsSnapshot | null> {
  const user = await requireChef()
  if (!user.tenantId) return null

  const { dishes, summary, optimizations } = await analyzeMenu(user.tenantId)

  // Generate margin alerts
  const alerts: MarginAlert[] = []

  for (const dish of dishes) {
    if (
      dish.foodCostPct !== null &&
      dish.foodCostPct > MARGIN_ALERT_THRESHOLDS.criticalFoodCostPct
    ) {
      alerts.push({
        type: 'critical_food_cost',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Food cost at ${dish.foodCostPct}% (target: <32%)`,
        value: dish.foodCostPct,
        threshold: MARGIN_ALERT_THRESHOLDS.criticalFoodCostPct,
      })
    } else if (
      dish.foodCostPct !== null &&
      dish.foodCostPct > MARGIN_ALERT_THRESHOLDS.warningFoodCostPct
    ) {
      alerts.push({
        type: 'warning_food_cost',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Food cost at ${dish.foodCostPct}% approaching threshold`,
        value: dish.foodCostPct,
        threshold: MARGIN_ALERT_THRESHOLDS.warningFoodCostPct,
      })
    }

    if (
      dish.currentMarginPct !== null &&
      dish.currentMarginPct < MARGIN_ALERT_THRESHOLDS.criticalMarginPct
    ) {
      alerts.push({
        type: 'low_margin',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Margin at ${dish.currentMarginPct}% (industry min: 55%)`,
        value: dish.currentMarginPct,
        threshold: MARGIN_ALERT_THRESHOLDS.criticalMarginPct,
      })
    }

    if (dish.risingCosts.length >= MARGIN_ALERT_THRESHOLDS.risingCostThreshold) {
      alerts.push({
        type: 'rising_costs',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `${dish.risingCosts.length} ingredients rising: ${dish.risingCosts.map((r) => r.name).join(', ')}`,
        value: dish.risingCosts.length,
        threshold: MARGIN_ALERT_THRESHOLDS.risingCostThreshold,
      })
    }

    if (dish.seasonalIndex !== null && dish.seasonalIndex < 85) {
      alerts.push({
        type: 'seasonal_opportunity',
        recipeId: dish.recipeId,
        recipeName: dish.recipeName,
        message: `Ingredients ${100 - dish.seasonalIndex}% below seasonal average; great time to feature`,
        value: dish.seasonalIndex,
        threshold: 85,
      })
    }
  }

  // Sort alerts: critical first, then by value severity
  alerts.sort((a, b) => {
    const priority = {
      critical_food_cost: 0,
      low_margin: 1,
      rising_costs: 2,
      warning_food_cost: 3,
      seasonal_opportunity: 4,
    }
    return (priority[a.type] ?? 5) - (priority[b.type] ?? 5)
  })

  // Get seasonal wins
  let seasonalWins: Array<{ recipeName: string; savingsPct: number }> = []
  try {
    const rankings = await getSeasonalMenuRanking(user.tenantId)
    seasonalWins = rankings
      .filter((r) => r.seasonalSavingsPct > 5)
      .slice(0, 5)
      .map((r) => ({ recipeName: r.recipeName, savingsPct: r.seasonalSavingsPct }))
  } catch {
    // Non-blocking
  }

  return {
    summary,
    alerts: alerts.slice(0, 10),
    topOptimizations: optimizations.slice(0, 5),
    seasonalWins,
  }
}

/**
 * Get economics for a single dish (used on recipe detail pages).
 */
export async function getDishEconomics(recipeId: string): Promise<DishEconomics | null> {
  const user = await requireChef()
  if (!user.tenantId) return null
  return analyzeDish(recipeId, user.tenantId)
}

/**
 * Model a price change scenario.
 */
export async function modelPriceChange(
  ingredientId: string,
  changePct: number
): Promise<WhatIfResult[]> {
  const user = await requireChef()
  if (!user.tenantId) return []
  return whatIfPriceChange(ingredientId, changePct, user.tenantId)
}
