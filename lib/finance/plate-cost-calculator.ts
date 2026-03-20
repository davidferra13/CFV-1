// Plate Cost Calculator - pure deterministic functions (Formula > AI)
// Calculates true cost-per-plate across events, with category breakdowns.
// No server dependencies, no database calls. Pure math.

export interface PlateCostBreakdown {
  category: string
  totalCents: number
  perPlateCents: number
}

export interface PlateCostResult {
  costPerPlateCents: number
  breakdown: PlateCostBreakdown[]
  guestCount: number
  totalCostCents: number
  revenuePerPlateCents: number
  marginPercent: number
}

export interface EventExpenseRow {
  category: string
  amount_cents: number
}

// Expense category groupings for plate cost breakdown
const CATEGORY_GROUPS: Record<string, string> = {
  groceries: 'Ingredients',
  alcohol: 'Ingredients',
  specialty_items: 'Ingredients',
  food: 'Ingredients',
  labor: 'Labor',
  gas_mileage: 'Travel',
  vehicle: 'Travel',
  mileage: 'Travel',
  equipment: 'Overhead',
  supplies: 'Overhead',
  venue_rental: 'Overhead',
  uniforms: 'Overhead',
  marketing: 'Overhead',
  insurance: 'Overhead',
  subscriptions: 'Overhead',
  rent: 'Overhead',
  utilities: 'Overhead',
  professional_services: 'Overhead',
  training: 'Overhead',
  other: 'Other',
}

/**
 * Group raw expense rows into plate cost breakdown categories.
 */
export function groupExpensesByCategory(expenses: EventExpenseRow[]): Map<string, number> {
  const grouped = new Map<string, number>()

  for (const expense of expenses) {
    const group = CATEGORY_GROUPS[expense.category] || 'Other'
    grouped.set(group, (grouped.get(group) || 0) + expense.amount_cents)
  }

  return grouped
}

/**
 * Calculate plate cost from pre-grouped expense totals, guest count, and revenue.
 * All monetary values in cents.
 */
export function calculatePlateCostFromTotals(
  expensesByGroup: Map<string, number>,
  guestCount: number,
  revenueCents: number
): PlateCostResult {
  // Build breakdown
  const breakdown: PlateCostBreakdown[] = []
  let totalCostCents = 0

  for (const [category, totalCents] of expensesByGroup.entries()) {
    totalCostCents += totalCents
    breakdown.push({
      category,
      totalCents,
      perPlateCents: guestCount > 0 ? Math.round(totalCents / guestCount) : 0,
    })
  }

  // Sort by total descending
  breakdown.sort((a, b) => b.totalCents - a.totalCents)

  const costPerPlateCents = guestCount > 0 ? Math.round(totalCostCents / guestCount) : 0
  const revenuePerPlateCents = guestCount > 0 ? Math.round(revenueCents / guestCount) : 0
  const marginPercent =
    revenueCents > 0
      ? Math.round(((revenueCents - totalCostCents) / revenueCents) * 1000) / 10
      : 0

  return {
    costPerPlateCents,
    breakdown,
    guestCount,
    totalCostCents,
    revenuePerPlateCents,
    marginPercent,
  }
}

/**
 * Rate margin percentage against benchmarks.
 */
export function getMarginRating(marginPercent: number): {
  label: string
  color: string
} {
  if (marginPercent >= 50) return { label: 'Excellent', color: 'text-green-500' }
  if (marginPercent >= 35) return { label: 'Good', color: 'text-emerald-500' }
  if (marginPercent >= 20) return { label: 'Fair', color: 'text-amber-500' }
  return { label: 'Low', color: 'text-red-500' }
}
