// Warning Generator - converts recipe/menu cost data into CostingWarning[]
// Pure function. No server calls, no database, no AI.
// Consumes the same data shapes already present in recipe detail and menu detail pages.

import type { CostingWarning, OperatorType } from './knowledge'
import { OPERATOR_TARGETS } from './knowledge'

// ---------------------------------------------------------------------------
// Input shapes (match what recipe/menu pages already have)
// ---------------------------------------------------------------------------

export interface RecipeCostInput {
  totalCostCents: number | null
  costPerPortionCents: number | null
  ingredientCount: number
  hasAllPrices: boolean
  /** From costIssues in recipe detail */
  missingPrices: number
  unitMismatches: number
  stalePrices: number
}

export interface MenuCostInput {
  totalRecipeCostCents: number | null
  costPerGuestCents: number | null
  foodCostPercentage: number | null
  totalComponentCount: number | null
  hasAllRecipeCosts: boolean | null
}

// ---------------------------------------------------------------------------
// Recipe warnings
// ---------------------------------------------------------------------------

export function generateRecipeWarnings(
  input: RecipeCostInput,
  operatorType: OperatorType = 'private_chef'
): CostingWarning[] {
  const warnings: CostingWarning[] = []
  const targets = OPERATOR_TARGETS[operatorType]

  // Missing prices
  if (input.missingPrices > 0) {
    const ratio = input.ingredientCount > 0 ? input.missingPrices / input.ingredientCount : 0
    warnings.push({
      type: 'missing_price',
      message: `${input.missingPrices} ingredient${input.missingPrices > 1 ? 's' : ''} missing price data${ratio > 0.5 ? ' (majority unpriced)' : ''}`,
      severity: ratio > 0.5 ? 'red' : 'amber',
    })
  }

  // Low coverage (more than half unpriced)
  if (input.ingredientCount > 0) {
    const coverage = (input.ingredientCount - input.missingPrices) / input.ingredientCount
    if (coverage < 0.5 && coverage > 0) {
      warnings.push({
        type: 'low_coverage',
        message: `Only ${Math.round(coverage * 100)}% of ingredients are priced. Total cost is unreliable.`,
        severity: 'red',
      })
    }
  }

  // Stale prices
  if (input.stalePrices > 0) {
    warnings.push({
      type: 'stale_price',
      message: `${input.stalePrices} ingredient${input.stalePrices > 1 ? 's' : ''} with stale pricing (90+ days old)`,
      severity: input.stalePrices > 2 ? 'amber' : 'info',
    })
  }

  // Unit mismatches (estimated costs)
  if (input.unitMismatches > 0) {
    warnings.push({
      type: 'default_yield',
      message: `${input.unitMismatches} ingredient${input.unitMismatches > 1 ? 's' : ''} with unit mismatch (cost is estimated)`,
      severity: 'info',
    })
  }

  return warnings
}

// ---------------------------------------------------------------------------
// Menu warnings
// ---------------------------------------------------------------------------

export function generateMenuWarnings(
  input: MenuCostInput,
  operatorType: OperatorType = 'private_chef'
): CostingWarning[] {
  const warnings: CostingWarning[] = []
  const targets = OPERATOR_TARGETS[operatorType]

  // Food cost percentage warnings
  if (input.foodCostPercentage != null && input.foodCostPercentage > 0) {
    if (input.foodCostPercentage > 50) {
      warnings.push({
        type: 'critical_food_cost',
        message: `Food cost is ${input.foodCostPercentage.toFixed(1)}%, critically above the ${targets.foodCostPctLow}-${targets.foodCostPctHigh}% target range`,
        severity: 'red',
      })
    } else if (input.foodCostPercentage > targets.foodCostPctHigh) {
      warnings.push({
        type: 'high_food_cost',
        message: `Food cost is ${input.foodCostPercentage.toFixed(1)}%, above your ${targets.foodCostPctHigh}% target. Review portion sizes and ingredient costs.`,
        severity: 'amber',
      })
    }
  }

  // Incomplete recipe coverage
  if (
    input.hasAllRecipeCosts === false &&
    input.totalComponentCount &&
    input.totalComponentCount > 0
  ) {
    warnings.push({
      type: 'low_coverage',
      message: 'Not all menu components have recipe costs. Total cost is partial.',
      severity: 'amber',
    })
  }

  return warnings
}
