import type {
  EventFoodCostTruth,
  EventFoodCostTruthInput,
  FoodCostTruthDataState,
  FoodExpenseLike,
  RangeFoodCostTruth,
  RangeFoodCostTruthInput,
} from '@/lib/finance/food-cost-truth-types'

export const FOOD_EXPENSE_CATEGORIES = ['groceries', 'alcohol', 'specialty_items'] as const

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}

function positiveCentsOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function finiteCentsOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

export function calculateFoodCostPercent(
  foodCostCents: number | null | undefined,
  revenueCents: number | null | undefined
): number | null {
  const foodCost = positiveCentsOrNull(foodCostCents)
  const revenue = positiveCentsOrNull(revenueCents)
  if (foodCost == null || revenue == null) return null
  return roundOne((foodCost / revenue) * 100)
}

export function calculateFoodCostVariance(
  projectedFoodCostCents: number | null | undefined,
  actualFoodCostCents: number | null | undefined
): { varianceCents: number | null; variancePercent: number | null } {
  const projected = positiveCentsOrNull(projectedFoodCostCents)
  const actual = positiveCentsOrNull(actualFoodCostCents)
  if (projected == null || actual == null) {
    return { varianceCents: null, variancePercent: null }
  }

  const varianceCents = actual - projected
  return {
    varianceCents,
    variancePercent: roundOne((varianceCents / projected) * 100),
  }
}

export function sumFoodExpenseCents(expenses: FoodExpenseLike[]): number {
  return expenses.reduce((sum, expense) => {
    if (expense.is_business === false) return sum
    if (!FOOD_EXPENSE_CATEGORIES.includes(expense.category as any)) return sum
    const amount = typeof expense.amount_cents === 'number' ? expense.amount_cents : 0
    return amount > 0 ? sum + Math.round(amount) : sum
  }, 0)
}

function resolveDataState(input: {
  projectedFoodCostCents: number | null
  actualFoodCostCents: number | null
  revenueCents: number | null
}): { dataState: FoodCostTruthDataState; missingReasons: string[] } {
  const missingReasons: string[] = []
  if (input.projectedFoodCostCents == null) missingReasons.push('Missing projected food cost')
  if (input.actualFoodCostCents == null) missingReasons.push('Missing actual food cost')
  if (input.revenueCents == null) missingReasons.push('Missing revenue')

  if (missingReasons.length === 0) {
    return { dataState: 'complete', missingReasons }
  }
  if (input.projectedFoodCostCents == null) {
    return { dataState: 'missing_projected_cost', missingReasons }
  }
  if (input.actualFoodCostCents == null) {
    return { dataState: 'missing_actual_cost', missingReasons }
  }
  if (input.revenueCents == null) {
    return { dataState: 'missing_revenue', missingReasons }
  }
  return { dataState: 'partial', missingReasons }
}

export function buildEventFoodCostTruth(input: EventFoodCostTruthInput): EventFoodCostTruth {
  const projectedFoodCostCents = positiveCentsOrNull(input.projectedFoodCostCents)
  const actualFoodCostCents = positiveCentsOrNull(input.actualFoodCostCents)
  const netFoodCostCents = finiteCentsOrNull(input.netFoodCostCents ?? input.actualFoodCostCents)
  const revenueCents = positiveCentsOrNull(input.revenueCents)
  const { varianceCents, variancePercent } = calculateFoodCostVariance(
    projectedFoodCostCents,
    actualFoodCostCents
  )
  const { dataState, missingReasons } = resolveDataState({
    projectedFoodCostCents,
    actualFoodCostCents,
    revenueCents,
  })

  return {
    eventId: input.eventId,
    eventName: input.eventName,
    eventDate: input.eventDate,
    guestCount: input.guestCount,
    projectedFoodCostCents,
    actualFoodCostCents,
    netFoodCostCents,
    revenueCents,
    revenueBasis: revenueCents == null ? null : input.revenueBasis,
    foodCostPercent: calculateFoodCostPercent(netFoodCostCents, revenueCents),
    varianceCents,
    variancePercent,
    dataState,
    missingReasons,
    sources: Array.from(new Set(input.sources)),
  }
}

export function buildRangeFoodCostTruth(input: RangeFoodCostTruthInput): RangeFoodCostTruth {
  const actualFoodCostCents = positiveCentsOrNull(input.actualFoodCostCents)
  const revenueCents = positiveCentsOrNull(input.revenueCents)
  const missingReasons: string[] = []
  if (actualFoodCostCents == null) missingReasons.push('Missing actual food cost')
  if (revenueCents == null) missingReasons.push('Missing revenue')

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    actualFoodCostCents,
    revenueCents,
    revenueBasis: input.revenueBasis,
    foodCostPercent: calculateFoodCostPercent(actualFoodCostCents, revenueCents),
    eventCount: input.eventCount,
    completeEventCount: input.completeEventCount ?? 0,
    partialEventCount: input.partialEventCount ?? 0,
    missingReasons,
    sources: Array.from(new Set(input.sources)),
  }
}
