// Revenue Forecast Calculator - Pure functions for deterministic pipeline math
// Formula > AI: all calculations are pure math, zero LLM dependency.

// Pipeline probability weights by event status (deterministic, not AI)
export const STAGE_WEIGHTS: Record<string, number> = {
  draft: 0.1,
  proposed: 0.25,
  accepted: 0.5,
  paid: 0.75,
  confirmed: 0.9,
  in_progress: 0.95,
  completed: 1.0,
  cancelled: 0,
}

export const STAGE_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/**
 * Apply pipeline probability weight to revenue based on event status.
 */
export function weightByStage(revenueCents: number, status: string): number {
  const weight = STAGE_WEIGHTS[status] ?? 0
  return Math.round(revenueCents * weight)
}

export type MonthlyDataPoint = {
  month: string // "YYYY-MM"
  revenueCents: number
}

/**
 * Calculate seasonal index from historical monthly data.
 * Returns 12-element array (index 0 = January) with multipliers.
 * A multiplier of 1.2 means that month is typically 20% above average.
 */
export function calculateSeasonalIndex(monthlyData: MonthlyDataPoint[]): number[] {
  if (monthlyData.length === 0) return new Array(12).fill(1.0)

  // Group by month number (1-12)
  const byMonth: Record<number, number[]> = {}
  for (let i = 1; i <= 12; i++) byMonth[i] = []

  for (const d of monthlyData) {
    const monthNum = parseInt(d.month.split('-')[1], 10)
    if (monthNum >= 1 && monthNum <= 12) {
      byMonth[monthNum].push(d.revenueCents)
    }
  }

  // Overall average per month
  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenueCents, 0)
  const avgPerMonth = totalRevenue / monthlyData.length

  if (avgPerMonth === 0) return new Array(12).fill(1.0)

  // Seasonal index = (avg revenue for that month) / (overall avg per month)
  const indices: number[] = []
  for (let i = 1; i <= 12; i++) {
    const vals = byMonth[i]
    if (vals.length === 0) {
      indices.push(1.0)
    } else {
      const monthAvg = vals.reduce((s, v) => s + v, 0) / vals.length
      indices.push(monthAvg / avgPerMonth)
    }
  }

  return indices
}

/**
 * Project revenue for the next N months using trailing average with seasonal adjustment.
 */
export function projectNextMonths(
  historicalData: MonthlyDataPoint[],
  months: number,
  startMonth?: string // "YYYY-MM", defaults to current month + 1
): Array<{ month: string; projectedCents: number }> {
  if (historicalData.length === 0) return []

  const seasonalIndex = calculateSeasonalIndex(historicalData)

  // Trailing average (use last 6 months or all data if less)
  const sorted = [...historicalData].sort((a, b) => a.month.localeCompare(b.month))
  const trailingWindow = sorted.slice(-6)
  const trailingAvg =
    trailingWindow.reduce((sum, d) => sum + d.revenueCents, 0) / trailingWindow.length

  // Determine starting month
  const now = new Date()
  let startYear: number
  let startMonthNum: number

  if (startMonth) {
    const parts = startMonth.split('-')
    startYear = parseInt(parts[0], 10)
    startMonthNum = parseInt(parts[1], 10)
  } else {
    startYear = now.getFullYear()
    startMonthNum = now.getMonth() + 2 // next month (getMonth is 0-based, we want 1-based + 1)
    if (startMonthNum > 12) {
      startMonthNum = 1
      startYear++
    }
  }

  const result: Array<{ month: string; projectedCents: number }> = []
  let year = startYear
  let mon = startMonthNum

  for (let i = 0; i < months; i++) {
    const idx = mon - 1 // 0-based for seasonal index
    const projected = Math.round(trailingAvg * seasonalIndex[idx])
    result.push({
      month: `${year}-${String(mon).padStart(2, '0')}`,
      projectedCents: Math.max(0, projected),
    })
    mon++
    if (mon > 12) {
      mon = 1
      year++
    }
  }

  return result
}
