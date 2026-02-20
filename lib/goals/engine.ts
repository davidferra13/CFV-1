import type { GoalType, GoalProgress, PricingScenario } from './types'
import {
  computeDinnersNeeded,
  applyPipelineWeight,
} from '@/lib/revenue-goals/engine'

// Re-export for convenience so callers only need to import from lib/goals/
export { computeDinnersNeeded, applyPipelineWeight }

// ── Goal progress ─────────────────────────────────────────────────────────────

export function computeGoalProgress(input: {
  goalId: string
  goalType: GoalType
  label: string
  targetValue: number
  currentValue: number
  periodStart: string
  periodEnd: string
}): GoalProgress {
  const gap = Math.max(0, input.targetValue - input.currentValue)
  const progressPercent = input.targetValue > 0
    ? Math.min(999, Math.round((input.currentValue / input.targetValue) * 100))
    : 0
  return {
    goalId: input.goalId,
    goalType: input.goalType,
    label: input.label,
    targetValue: input.targetValue,
    currentValue: input.currentValue,
    gapValue: gap,
    progressPercent,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  }
}

// ── Pricing scenarios ─────────────────────────────────────────────────────────
// Given a revenue gap and current average booking value, compute how many
// events would be needed if the chef raised their price by each delta.

export function buildPricingScenarios(
  gapCents: number,
  currentAvgBookingCents: number,
  deltas: number[] = [0, 10000, 20000, 30000, 50000]
): PricingScenario[] {
  if (gapCents <= 0 || currentAvgBookingCents <= 0) return []
  return deltas.map((delta) => {
    const effectivePriceCents = currentAvgBookingCents + delta
    return {
      priceDeltaCents: delta,
      effectivePriceCents,
      eventsNeededAtPrice: Math.ceil(gapCents / effectivePriceCents),
    }
  })
}

// ── Value formatting ──────────────────────────────────────────────────────────

export function formatGoalValue(value: number, goalType: GoalType): string {
  if (
    goalType === 'revenue_monthly' ||
    goalType === 'revenue_annual' ||
    goalType === 'revenue_custom'
  ) {
    return `$${Math.round(value / 100).toLocaleString('en-US')}`
  }
  if (goalType === 'profit_margin' || goalType === 'expense_ratio') {
    return `${(value / 100).toFixed(1)}%`
  }
  return value.toLocaleString('en-US')
}

// ── Gap label ─────────────────────────────────────────────────────────────────

export function formatGapLabel(gapValue: number, goalType: GoalType): string {
  if (gapValue <= 0) return 'On track'
  const formatted = formatGoalValue(gapValue, goalType)
  if (
    goalType === 'revenue_monthly' ||
    goalType === 'revenue_annual' ||
    goalType === 'revenue_custom'
  ) {
    return `${formatted} to go`
  }
  if (goalType === 'booking_count') return `${gapValue} event${gapValue === 1 ? '' : 's'} to go`
  if (goalType === 'new_clients') return `${gapValue} client${gapValue === 1 ? '' : 's'} to go`
  if (goalType === 'recipe_library') return `${gapValue} recipe${gapValue === 1 ? '' : 's'} to go`
  return `${formatted} to go`
}

// ── Period display ────────────────────────────────────────────────────────────

export function formatPeriod(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const startDate = new Date(sy, (sm || 1) - 1, sd || 1)
  const endDate = new Date(ey, (em || 1) - 1, 1)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  if (sy === ey && sm === em) {
    return `${months[(sm || 1) - 1]} ${sy}`
  }
  if (sy === ey) {
    return `${months[(sm || 1) - 1]}–${months[(endDate.getMonth())]} ${ey}`
  }
  return `${months[(sm || 1) - 1]} ${sy}–${months[endDate.getMonth()]} ${ey}`
}

// ── Goal type label ───────────────────────────────────────────────────────────

export function isRevenueGoal(goalType: GoalType): boolean {
  return (
    goalType === 'revenue_monthly' ||
    goalType === 'revenue_annual' ||
    goalType === 'revenue_custom'
  )
}

// ── Basis points helpers ──────────────────────────────────────────────────────

export function decimalToBasisPoints(decimal: number): number {
  return Math.round(decimal * 10000)
}

export function basisPointsToDecimal(bp: number): number {
  return bp / 10000
}
