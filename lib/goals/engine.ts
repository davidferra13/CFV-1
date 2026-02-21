import type { GoalType, GoalProgress, PricingScenario, TrackingMethod } from './types'
import { computeDinnersNeeded, applyPipelineWeight } from '@/lib/revenue-goals/engine'

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
  const progressPercent =
    input.targetValue > 0
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

// ── Goal type helpers ─────────────────────────────────────────────────────────

export function isRevenueGoal(goalType: GoalType): boolean {
  return (
    goalType === 'revenue_monthly' || goalType === 'revenue_annual' || goalType === 'revenue_custom'
  )
}

export function isManualGoal(trackingMethod: TrackingMethod): boolean {
  return trackingMethod === 'manual_count'
}

// ── Value formatting ──────────────────────────────────────────────────────────

export function formatGoalValue(value: number, goalType: GoalType): string {
  // Revenue goals → dollars
  if (
    goalType === 'revenue_monthly' ||
    goalType === 'revenue_annual' ||
    goalType === 'revenue_custom'
  ) {
    return `$${Math.round(value / 100).toLocaleString('en-US')}`
  }

  // Basis-point percentages
  if (
    goalType === 'profit_margin' ||
    goalType === 'expense_ratio' ||
    goalType === 'repeat_booking_rate'
  ) {
    return `${(value / 100).toFixed(1)}%`
  }

  // Star rating stored as basis points (450 → 4.50 ★)
  if (goalType === 'review_average') {
    return `${(value / 100).toFixed(2)} ★`
  }

  // Hours (stored as whole hours)
  if (goalType === 'staff_training_hours') {
    return `${value.toLocaleString('en-US')}h`
  }

  // Everything else is a plain count
  return value.toLocaleString('en-US')
}

// ── Gap label ─────────────────────────────────────────────────────────────────

export function formatGapLabel(gapValue: number, goalType: GoalType): string {
  if (gapValue <= 0) return 'On track'
  const formatted = formatGoalValue(gapValue, goalType)

  switch (goalType) {
    case 'revenue_monthly':
    case 'revenue_annual':
    case 'revenue_custom':
      return `${formatted} to go`
    case 'booking_count':
      return `${gapValue} event${gapValue === 1 ? '' : 's'} to go`
    case 'new_clients':
      return `${gapValue} client${gapValue === 1 ? '' : 's'} to go`
    case 'recipe_library':
      return `${gapValue} recipe${gapValue === 1 ? '' : 's'} to go`
    case 'repeat_booking_rate':
    case 'profit_margin':
    case 'expense_ratio':
      return `${formatted} to go`
    case 'referrals_received':
      return `${gapValue} referral${gapValue === 1 ? '' : 's'} to go`
    case 'dishes_created':
      return `${gapValue} dish${gapValue === 1 ? '' : 'es'} to go`
    case 'cuisines_explored':
      return `${gapValue} cuisine${gapValue === 1 ? '' : 's'} to go`
    case 'workshops_attended':
      return `${gapValue} workshop${gapValue === 1 ? '' : 's'} to go`
    case 'review_average':
      return `${(gapValue / 100).toFixed(2)}★ to go`
    case 'total_reviews':
      return `${gapValue} review${gapValue === 1 ? '' : 's'} to go`
    case 'staff_training_hours':
      return `${gapValue}h to go`
    case 'vendor_relationships':
      return `${gapValue} vendor${gapValue === 1 ? '' : 's'} to go`
    case 'books_read':
      return `${gapValue} book${gapValue === 1 ? '' : 's'} to go`
    case 'courses_completed':
      return `${gapValue} course${gapValue === 1 ? '' : 's'} to go`
    case 'weekly_workouts':
      return `${gapValue} workout${gapValue === 1 ? '' : 's'} to go`
    case 'rest_days_taken':
      return `${gapValue} rest day${gapValue === 1 ? '' : 's'} to go`
    case 'family_dinners':
      return `${gapValue} dinner${gapValue === 1 ? '' : 's'} to go`
    case 'vacation_days':
      return `${gapValue} day${gapValue === 1 ? '' : 's'} to go`
    case 'charity_events':
      return `${gapValue} event${gapValue === 1 ? '' : 's'} to go`
    case 'meals_donated':
      return `${gapValue} meal${gapValue === 1 ? '' : 's'} to go`
    default:
      return `${formatted} to go`
  }
}

// ── Goal unit label (for nudge messages and display) ──────────────────────────

export function formatGoalUnit(goalType: GoalType): string {
  switch (goalType) {
    case 'booking_count':
      return 'event'
    case 'new_clients':
      return 'client'
    case 'recipe_library':
      return 'recipe'
    case 'referrals_received':
      return 'referral'
    case 'dishes_created':
      return 'dish'
    case 'cuisines_explored':
      return 'cuisine'
    case 'workshops_attended':
      return 'workshop'
    case 'total_reviews':
      return 'review'
    case 'staff_training_hours':
      return 'hour'
    case 'vendor_relationships':
      return 'vendor'
    case 'books_read':
      return 'book'
    case 'courses_completed':
      return 'course'
    case 'weekly_workouts':
      return 'workout'
    case 'rest_days_taken':
      return 'rest day'
    case 'family_dinners':
      return 'dinner'
    case 'vacation_days':
      return 'vacation day'
    case 'charity_events':
      return 'charity event'
    case 'meals_donated':
      return 'meal'
    default:
      return 'unit'
  }
}

// ── Period display ────────────────────────────────────────────────────────────

export function formatPeriod(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const startDate = new Date(sy, (sm || 1) - 1, sd || 1)
  const endDate = new Date(ey, (em || 1) - 1, 1)

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  if (sy === ey && sm === em) {
    return `${months[(sm || 1) - 1]} ${sy}`
  }
  if (sy === ey) {
    return `${months[(sm || 1) - 1]}–${months[endDate.getMonth()]} ${ey}`
  }
  return `${months[(sm || 1) - 1]} ${sy}–${months[endDate.getMonth()]} ${ey}`
}

// ── Basis points helpers ──────────────────────────────────────────────────────

export function decimalToBasisPoints(decimal: number): number {
  return Math.round(decimal * 10000)
}

export function basisPointsToDecimal(bp: number): number {
  return bp / 10000
}
