// Pricing Recommendation Engine - Deterministic (Formula > AI)
// Combines cost-based floor pricing with historical percentile analysis.
//
// Two pricing lenses, unified:
//   1. Cost floor: "What must I charge to hit my target margin?"
//   2. Historical: "What have I charged for similar events?"
//
// The recommendation is the HIGHER of the two, ensuring the chef never
// prices below cost while staying consistent with their market position.

import {
  calculatePricingFormula,
  type CurrentEvent,
  type HistoricalEvent,
  type PricingIntelligenceResult,
} from './pricing-intelligence'
import { OPERATOR_TARGETS, type OperatorType } from '@/lib/costing/knowledge'

// ── Types ──────────────────────────────────────────────────────────────

export type CostInputs = {
  foodCostCents: number // From menu -> recipe -> ingredient costing
  laborCostCents: number // From expense category or estimate
  travelCostCents: number // Gas/mileage + vehicle
  overheadCostCents: number // Equipment, supplies, venue, etc.
  otherCostCents: number // Anything else
}

export type PricingRecommendation = {
  // Cost-based pricing
  totalCostCents: number
  breakEvenPerPersonCents: number
  costBreakdown: {
    category: string
    amountCents: number
    percentOfTotal: number
  }[]

  // Recommended prices at different margin targets
  recommendations: {
    targetMargin: number // 0.30 = 30%
    totalPriceCents: number
    perPersonCents: number
    profitCents: number
    label: string
  }[]

  // Historical comparison (if available)
  historical: PricingIntelligenceResult | null

  // Final unified recommendation
  suggestedPriceCents: number
  suggestedPerPersonCents: number
  pricingBasis: 'cost_only' | 'historical_only' | 'cost_and_historical'
  rationale: string

  // Warnings
  warnings: string[]
}

// ── Constants ──────────────────────────────────────────────────────────

const MARGIN_TIERS = [
  { target: 0.25, label: 'Conservative (25%)' },
  { target: 0.35, label: 'Standard (35%)' },
  { target: 0.45, label: 'Premium (45%)' },
  { target: 0.55, label: 'High-end (55%)' },
]

// ── Formula ────────────────────────────────────────────────────────────

/**
 * Calculate a pricing recommendation for an event.
 *
 * @param costs - Known or estimated costs for the event
 * @param guestCount - Number of guests
 * @param currentEvent - Event details for historical comparison
 * @param historicalEvents - Past events for percentile analysis
 * @param targetMargin - Desired profit margin (0.35 = 35%). Defaults to 0.35.
 * @param operatorType - Operator type for benchmark thresholds. Defaults to private_chef.
 */
export function calculatePricingRecommendation(
  costs: CostInputs,
  guestCount: number,
  currentEvent?: CurrentEvent | null,
  historicalEvents?: HistoricalEvent[] | null,
  targetMargin: number = 0.35,
  operatorType: OperatorType = 'private_chef'
): PricingRecommendation {
  const warnings: string[] = []

  // ── 1. Total cost and breakdown ─────────────────────────────────────

  const totalCostCents =
    costs.foodCostCents +
    costs.laborCostCents +
    costs.travelCostCents +
    costs.overheadCostCents +
    costs.otherCostCents

  const breakdownRaw = [
    { category: 'Food', amountCents: costs.foodCostCents },
    { category: 'Labor', amountCents: costs.laborCostCents },
    { category: 'Travel', amountCents: costs.travelCostCents },
    { category: 'Overhead', amountCents: costs.overheadCostCents },
    { category: 'Other', amountCents: costs.otherCostCents },
  ].filter((b) => b.amountCents > 0)

  const costBreakdown = breakdownRaw.map((b) => ({
    ...b,
    percentOfTotal: totalCostCents > 0 ? Math.round((b.amountCents / totalCostCents) * 100) : 0,
  }))

  const effectiveGuests = Math.max(guestCount, 1)
  const breakEvenPerPersonCents = Math.round(totalCostCents / effectiveGuests)

  // ── 2. Margin-based recommendations ──────────────────────────────────

  const recommendations = MARGIN_TIERS.map((tier) => {
    // price = cost / (1 - margin)
    const totalPriceCents = Math.round(totalCostCents / (1 - tier.target))
    return {
      targetMargin: tier.target,
      totalPriceCents,
      perPersonCents: Math.round(totalPriceCents / effectiveGuests),
      profitCents: totalPriceCents - totalCostCents,
      label: tier.label,
    }
  })

  // The chef's preferred margin recommendation
  const preferredRec = recommendations.find((r) => r.targetMargin === targetMargin)
  const costBasedPriceCents = preferredRec
    ? preferredRec.totalPriceCents
    : Math.round(totalCostCents / (1 - targetMargin))

  // ── 3. Historical analysis ──────────────────────────────────────────

  let historical: PricingIntelligenceResult | null = null
  if (currentEvent && historicalEvents && historicalEvents.length >= 3) {
    historical = calculatePricingFormula(currentEvent, historicalEvents)
  }

  // ── 4. Unified recommendation ───────────────────────────────────────

  let suggestedPriceCents: number
  let pricingBasis: PricingRecommendation['pricingBasis']
  const rationaleParts: string[] = []

  if (totalCostCents === 0 && historical) {
    // No cost data, use historical only
    suggestedPriceCents = historical.suggestedPerHeadCents * effectiveGuests
    pricingBasis = 'historical_only'
    rationaleParts.push('No cost data available for this event.')
    rationaleParts.push(historical.rationale)
  } else if (!historical || historical.confidence === 'low') {
    // No historical data (or too little), use cost-based only
    suggestedPriceCents = costBasedPriceCents
    pricingBasis = 'cost_only'
    rationaleParts.push(
      `Based on estimated costs of $${(totalCostCents / 100).toFixed(0)} with a ${Math.round(targetMargin * 100)}% target margin.`
    )
    if (totalCostCents > 0) {
      const foodPct = Math.round((costs.foodCostCents / totalCostCents) * 100)
      rationaleParts.push(`Food is ${foodPct}% of total cost.`)
    }
  } else {
    // Both available: use the HIGHER of cost-based and historical median
    const historicalMidpoint = Math.round(
      (historical.suggestedMinCents + historical.suggestedMaxCents) / 2
    )
    suggestedPriceCents = Math.max(costBasedPriceCents, historicalMidpoint)
    pricingBasis = 'cost_and_historical'

    if (costBasedPriceCents > historicalMidpoint) {
      rationaleParts.push(
        `Cost-based price ($${(costBasedPriceCents / 100).toFixed(0)}) exceeds your historical range ($${(historical.suggestedMinCents / 100).toFixed(0)} - $${(historical.suggestedMaxCents / 100).toFixed(0)}).`
      )
      rationaleParts.push(
        'This event costs more than your typical events. Pricing adjusted to maintain your target margin.'
      )
      warnings.push(
        'Cost exceeds historical pricing range. Consider adjusting menu or discussing with client.'
      )
    } else {
      rationaleParts.push(
        `Historical pricing ($${(historicalMidpoint / 100).toFixed(0)}) is above your cost floor ($${(costBasedPriceCents / 100).toFixed(0)}).`
      )
      rationaleParts.push(historical.rationale)
    }
  }

  // ── 5. Warnings ─────────────────────────────────────────────────────

  if (costs.foodCostCents === 0 && totalCostCents > 0) {
    warnings.push(
      'Food cost is $0. Add a menu with priced ingredients for accurate recommendations.'
    )
  }

  if (costs.laborCostCents === 0 && totalCostCents > 0) {
    warnings.push('No labor cost included. Consider adding labor to get a complete picture.')
  }

  if (totalCostCents > 0 && costs.foodCostCents > 0) {
    const targets = OPERATOR_TARGETS[operatorType] ?? OPERATOR_TARGETS.private_chef
    const foodPct = (costs.foodCostCents / totalCostCents) * 100
    if (foodPct > 50) {
      warnings.push(
        `Food is ${Math.round(foodPct)}% of total cost. Target for your operation type is ${targets.foodCostPctLow}-${targets.foodCostPctHigh}%. Consider menu adjustments.`
      )
    }
  }

  if (historical?.underbiddingWarning) {
    warnings.push(historical.underbiddingWarning)
  }

  const suggestedPerPersonCents = Math.round(suggestedPriceCents / effectiveGuests)

  return {
    totalCostCents,
    breakEvenPerPersonCents,
    costBreakdown,
    recommendations,
    historical,
    suggestedPriceCents,
    suggestedPerPersonCents,
    pricingBasis,
    rationale: rationaleParts.join(' '),
    warnings,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Quick break-even check: does this price cover costs?
 */
export function isPriceAboveCost(priceCents: number, costs: CostInputs): boolean {
  const total =
    costs.foodCostCents +
    costs.laborCostCents +
    costs.travelCostCents +
    costs.overheadCostCents +
    costs.otherCostCents
  return priceCents >= total
}

/**
 * Calculate the actual margin for a given price and cost set.
 */
export function calculateActualMargin(priceCents: number, costs: CostInputs): number {
  const total =
    costs.foodCostCents +
    costs.laborCostCents +
    costs.travelCostCents +
    costs.overheadCostCents +
    costs.otherCostCents
  if (priceCents <= 0) return 0
  return Math.round(((priceCents - total) / priceCents) * 1000) / 10
}
