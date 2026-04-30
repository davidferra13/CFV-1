// Event Pricing Intelligence - pure deterministic calculations.
// No server dependencies, no database calls, no AI.

import type { NoBlankReliabilityVerdict } from '@/lib/pricing/no-blank-price-contract'

export type PricingConfidence = 'high' | 'medium' | 'low'

export type SuggestedPriceSource =
  | 'projected_food_cost'
  | 'actual_food_cost'
  | 'actual_total_cost_target_margin'
  | 'current_price'
  | 'no_cost_data'

export type EventPricingWarningSeverity = 'info' | 'warning' | 'critical'

export type EventPricingWarningType =
  | 'underpriced_event'
  | 'food_cost_above_target'
  | 'actual_margin_below_target'
  | 'estimated_actual_variance_high'
  | 'menu_needs_repricing'
  | 'ingredient_price_spike'
  | 'pricing_reliability_gate'
  | 'low_confidence_pricing'
  | 'stale_pricing'
  | 'missing_cost_data'

export interface EventPricingWarning {
  type: EventPricingWarningType
  severity: EventPricingWarningSeverity
  label: string
  message: string
  recommendation: string
}

export interface SuggestedPriceResult {
  suggestedPriceCents: number
  source: SuggestedPriceSource
  fallbackUsed: boolean
  pricingConfidence: PricingConfidence
  reason: string
}

export interface IngredientPriceSpikeSignal {
  ingredientId: string
  ingredientName: string
  currentPriceCents: number
  averagePriceCents: number
  spikePercent: number
  unit: string | null
}

export interface WarningInput {
  projectedFoodCostCents: number
  actualFoodCostCents: number
  actualTotalCostCents: number
  quoteOrRevenueCents: number
  suggestedPriceCents: number
  targetFoodCostPercent: number
  targetMarginPercent: number
  projectedFoodCostPercent: number | null
  actualFoodCostPercent: number | null
  actualMarginPercent: number | null
  estimatedVsActualPercent: number | null
  fallbackUsed: boolean
  stalePriceCount: number
  lowConfidenceIngredientCount: number
  ingredientSpikeCount?: number
  topIngredientSpikeName?: string | null
  topIngredientSpikePercent?: number | null
  pricingReliabilityVerdict?: NoBlankReliabilityVerdict | null
  pricingReliabilityPlanningOnlyCount?: number
  pricingReliabilityVerifyFirstCount?: number
  pricingReliabilityModeledCount?: number
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

export function calculateSuggestedPriceFromFoodCost(
  foodCostCents: number | null | undefined,
  targetFoodCostPercent: number | null | undefined
): number {
  const cost = positive(foodCostCents)
  const target = positive(targetFoodCostPercent)
  if (cost <= 0 || target <= 0) return 0
  return Math.ceil(cost / (target / 100))
}

export function calculateTargetFoodCostBudget(
  priceCents: number | null | undefined,
  targetFoodCostPercent: number | null | undefined
): number {
  const price = positive(priceCents)
  const target = positive(targetFoodCostPercent)
  if (price <= 0 || target <= 0) return 0
  return Math.round(price * (target / 100))
}

export function calculateProfitCents(
  revenueCents: number | null | undefined,
  costCents: number | null | undefined
): number {
  return positive(revenueCents) - positive(costCents)
}

export function calculateMarginPercent(
  revenueCents: number | null | undefined,
  costCents: number | null | undefined
): number {
  const revenue = positive(revenueCents)
  if (revenue <= 0) return 0
  return roundOne(((revenue - positive(costCents)) / revenue) * 100)
}

export function calculateFoodCostPercent(
  foodCostCents: number | null | undefined,
  revenueCents: number | null | undefined
): number | null {
  const revenue = positive(revenueCents)
  const cost = positive(foodCostCents)
  if (revenue <= 0 || cost <= 0) return null
  return roundOne((cost / revenue) * 100)
}

export function calculateEstimatedActualVariance(
  estimatedCents: number | null | undefined,
  actualCents: number | null | undefined
): { varianceCents: number; variancePercent: number | null } {
  const estimated = positive(estimatedCents)
  const actual = positive(actualCents)
  const varianceCents = actual - estimated
  return {
    varianceCents,
    variancePercent: estimated > 0 ? roundOne((varianceCents / estimated) * 100) : null,
  }
}

export function calculateIngredientSpikePercent(
  currentPriceCents: number | null | undefined,
  averagePriceCents: number | null | undefined
): number | null {
  const current = positive(currentPriceCents)
  const average = positive(averagePriceCents)
  if (current <= 0 || average <= 0) return null
  return roundOne(((current - average) / average) * 100)
}

export function isIngredientPriceSpike(
  currentPriceCents: number | null | undefined,
  averagePriceCents: number | null | undefined,
  thresholdPercent = 30
): boolean {
  const spikePercent = calculateIngredientSpikePercent(currentPriceCents, averagePriceCents)
  return spikePercent != null && spikePercent >= thresholdPercent
}

export function resolveSuggestedEventPrice(input: {
  projectedFoodCostCents?: number | null
  actualFoodCostCents?: number | null
  actualTotalCostCents?: number | null
  currentPriceCents?: number | null
  targetFoodCostPercent: number
  targetMarginPercent: number
  hasCompleteProjectedCost?: boolean | null
  stalePriceCount?: number
  lowConfidenceIngredientCount?: number
}): SuggestedPriceResult {
  const projectedFoodCostCents = positive(input.projectedFoodCostCents)
  const actualFoodCostCents = positive(input.actualFoodCostCents)
  const actualTotalCostCents = positive(input.actualTotalCostCents)
  const currentPriceCents = positive(input.currentPriceCents)
  const stalePriceCount = positive(input.stalePriceCount)
  const lowConfidenceIngredientCount = positive(input.lowConfidenceIngredientCount)

  const projectedSuggestion = calculateSuggestedPriceFromFoodCost(
    projectedFoodCostCents,
    input.targetFoodCostPercent
  )

  if (projectedSuggestion > 0) {
    const pricingConfidence =
      input.hasCompleteProjectedCost === false ||
      stalePriceCount > 0 ||
      lowConfidenceIngredientCount > 0
        ? 'medium'
        : 'high'

    return {
      suggestedPriceCents: projectedSuggestion,
      source: 'projected_food_cost',
      fallbackUsed: false,
      pricingConfidence,
      reason: 'Based on the projected menu food cost and target food cost percentage.',
    }
  }

  const actualFoodSuggestion = calculateSuggestedPriceFromFoodCost(
    actualFoodCostCents,
    input.targetFoodCostPercent
  )

  if (actualFoodSuggestion > 0) {
    return {
      suggestedPriceCents: actualFoodSuggestion,
      source: 'actual_food_cost',
      fallbackUsed: true,
      pricingConfidence: 'medium',
      reason: 'Projected menu cost is unavailable, so the suggestion uses recorded food spend.',
    }
  }

  const targetMargin = positive(input.targetMarginPercent)
  if (actualTotalCostCents > 0 && targetMargin > 0 && targetMargin < 100) {
    return {
      suggestedPriceCents: Math.ceil(actualTotalCostCents / (1 - targetMargin / 100)),
      source: 'actual_total_cost_target_margin',
      fallbackUsed: true,
      pricingConfidence: 'low',
      reason:
        'Food-cost data is unavailable, so the fallback uses actual total cost and target margin.',
    }
  }

  if (currentPriceCents > 0) {
    return {
      suggestedPriceCents: currentPriceCents,
      source: 'current_price',
      fallbackUsed: true,
      pricingConfidence: 'low',
      reason:
        'Cost data is unavailable, so the current quote or collected revenue is shown as the fallback price.',
    }
  }

  return {
    suggestedPriceCents: 0,
    source: 'no_cost_data',
    fallbackUsed: true,
    pricingConfidence: 'low',
    reason: 'Add a menu cost, quote, or expense data to generate a pricing suggestion.',
  }
}

export function generateEventPricingWarnings(input: WarningInput): EventPricingWarning[] {
  const warnings: EventPricingWarning[] = []
  const quoteOrRevenue = positive(input.quoteOrRevenueCents)
  const suggested = positive(input.suggestedPriceCents)

  if (suggested > 0 && quoteOrRevenue > 0 && quoteOrRevenue < Math.round(suggested * 0.97)) {
    const shortfallPercent = roundOne(((suggested - quoteOrRevenue) / suggested) * 100)
    warnings.push({
      type: 'underpriced_event',
      severity: shortfallPercent >= 10 ? 'critical' : 'warning',
      label: 'Underpriced event',
      message: `Current price is ${shortfallPercent}% below the target food-cost suggestion.`,
      recommendation:
        'Review quote total before confirming, or document why this event is intentionally discounted.',
    })
  }

  const foodCostPercent = input.actualFoodCostPercent ?? input.projectedFoodCostPercent
  if (foodCostPercent != null && foodCostPercent > input.targetFoodCostPercent) {
    const overBy = roundOne(foodCostPercent - input.targetFoodCostPercent)
    warnings.push({
      type: 'food_cost_above_target',
      severity: overBy >= 10 ? 'critical' : 'warning',
      label: 'Food cost above target',
      message: `Food cost is ${foodCostPercent}% against a ${input.targetFoodCostPercent}% target.`,
      recommendation: 'Recheck portions, premium ingredients, supplier prices, and quote coverage.',
    })
  }

  if (
    input.actualMarginPercent != null &&
    quoteOrRevenue > 0 &&
    input.actualMarginPercent < input.targetMarginPercent
  ) {
    const underBy = roundOne(input.targetMarginPercent - input.actualMarginPercent)
    warnings.push({
      type: 'actual_margin_below_target',
      severity: underBy >= 10 ? 'critical' : 'warning',
      label: 'Margin below target',
      message: `Actual margin is ${input.actualMarginPercent}%, below the ${input.targetMarginPercent}% target.`,
      recommendation:
        'Use the actual spend breakdown to update future pricing or menu cost assumptions.',
    })
  }

  if (input.estimatedVsActualPercent != null) {
    const absVariance = Math.abs(input.estimatedVsActualPercent)
    if (absVariance > 10) {
      warnings.push({
        type: 'estimated_actual_variance_high',
        severity: absVariance >= 20 ? 'critical' : 'warning',
        label: 'Cost variance high',
        message: `Actual cost landed ${input.estimatedVsActualPercent}% from estimate.`,
        recommendation:
          'Compare receipt line items to recipe quantities and update prices or yields.',
      })
    }
  }

  if (
    input.pricingReliabilityVerdict === 'planning_only' ||
    input.pricingReliabilityVerdict === 'verify_first'
  ) {
    const planningOnlyCount = positive(input.pricingReliabilityPlanningOnlyCount)
    const verifyFirstCount = positive(input.pricingReliabilityVerifyFirstCount)
    const modeledCount = positive(input.pricingReliabilityModeledCount)
    const pieces = []
    if (planningOnlyCount > 0) {
      pieces.push(
        `${planningOnlyCount} planning-only ingredient price${planningOnlyCount === 1 ? '' : 's'}`
      )
    }
    if (verifyFirstCount > 0) {
      pieces.push(
        `${verifyFirstCount} verify-first ingredient price${verifyFirstCount === 1 ? '' : 's'}`
      )
    }
    if (modeledCount > 0) {
      pieces.push(`${modeledCount} modeled fallback price${modeledCount === 1 ? '' : 's'}`)
    }

    warnings.push({
      type: 'pricing_reliability_gate',
      severity: input.pricingReliabilityVerdict === 'planning_only' ? 'critical' : 'warning',
      label: 'Pricing reliability gate',
      message:
        pieces.length > 0
          ? `This event includes ${pieces.join(', ')}.`
          : 'This event has ingredient prices that need verification before quoting.',
      recommendation:
        input.pricingReliabilityVerdict === 'planning_only'
          ? 'Treat this as planning guidance until stronger market proof is available.'
          : 'Verify the flagged ingredient prices before sending or confirming the quote.',
    })
  }

  if (
    input.projectedFoodCostCents > 0 &&
    suggested > 0 &&
    quoteOrRevenue > 0 &&
    (quoteOrRevenue < suggested ||
      (input.projectedFoodCostPercent ?? 0) > input.targetFoodCostPercent)
  ) {
    warnings.push({
      type: 'menu_needs_repricing',
      severity: quoteOrRevenue < Math.round(suggested * 0.9) ? 'critical' : 'warning',
      label: 'Menu needs repricing',
      message: 'The current menu cost does not protect the target food cost.',
      recommendation:
        'Raise the menu price, swap high-cost dishes, or set an explicit discount reason.',
    })
  }

  const ingredientSpikeCount = positive(input.ingredientSpikeCount)
  if (ingredientSpikeCount > 0) {
    const topSpikePercent =
      input.topIngredientSpikePercent != null
        ? `${roundOne(input.topIngredientSpikePercent)}%`
        : '30%+'
    const topSpikeName = input.topIngredientSpikeName?.trim()
    warnings.push({
      type: 'ingredient_price_spike',
      severity: ingredientSpikeCount > 2 ? 'warning' : 'info',
      label: 'Ingredient price spike',
      message: topSpikeName
        ? `${ingredientSpikeCount} event ingredient${ingredientSpikeCount === 1 ? ' is' : 's are'} at least 30% above average. ${topSpikeName} is ${topSpikePercent} above average.`
        : `${ingredientSpikeCount} event ingredient${ingredientSpikeCount === 1 ? ' is' : 's are'} at least 30% above historical average.`,
      recommendation:
        'Review current supplier pricing for affected ingredients before relying on this quote.',
    })
  }

  if (input.lowConfidenceIngredientCount > 0) {
    warnings.push({
      type: 'low_confidence_pricing',
      severity: input.lowConfidenceIngredientCount > 2 ? 'warning' : 'info',
      label: 'Low-confidence pricing',
      message: `${input.lowConfidenceIngredientCount} ingredient price${input.lowConfidenceIngredientCount === 1 ? '' : 's'} have low confidence.`,
      recommendation:
        'Refresh or confirm those ingredient prices before relying on the suggested price.',
    })
  }

  if (input.stalePriceCount > 0) {
    warnings.push({
      type: 'stale_pricing',
      severity: input.stalePriceCount > 2 ? 'warning' : 'info',
      label: 'Stale pricing',
      message: `${input.stalePriceCount} ingredient price${input.stalePriceCount === 1 ? '' : 's'} are older than 90 days.`,
      recommendation: 'Refresh ingredient costs before sending another quote with this menu.',
    })
  }

  if (input.fallbackUsed || (input.projectedFoodCostCents <= 0 && input.actualFoodCostCents <= 0)) {
    warnings.push({
      type: 'missing_cost_data',
      severity:
        input.projectedFoodCostCents <= 0 && input.actualFoodCostCents <= 0 ? 'warning' : 'info',
      label: 'Pricing confidence limited',
      message:
        'The suggested price used fallback data because complete projected food cost is unavailable.',
      recommendation: 'Attach a costed menu or complete receipt matching to improve confidence.',
    })
  }

  return warnings
}
