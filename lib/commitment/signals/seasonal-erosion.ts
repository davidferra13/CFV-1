import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'

// ── Compound Signal: Seasonal Erosion Detector ──────────────────────────────
// Override frequency mapped to calendar. Pre-warns before historically
// weak periods by analyzing month-over-month override patterns from
// the chef's own history.

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface MonthlyErosionProfile {
  month: number // 0-11
  monthName: string
  overrideCount: number
  year: number
}

export interface SeasonalErosionResult {
  detected: boolean
  upcomingWeakMonth: string | null
  historicalAvg: number
  currentMonthCount: number
  monthlyProfile: MonthlyErosionProfile[]
}

/**
 * Build a 12-month override frequency profile from historical data.
 * Looks at up to 2 years of override history to identify seasonal patterns.
 */
export async function buildSeasonalProfile(
  tenantId: string
): Promise<MonthlyErosionProfile[]> {
  const client = createServerClient()
  const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('commitment_overrides' as any)
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', twoYearsAgo.toISOString())

  if (!overrides || overrides.length === 0) return []

  // Group by month
  const monthCounts = new Map<string, { month: number; year: number; count: number }>()

  for (const o of overrides) {
    const date = new Date(o.created_at as string)
    const month = date.getMonth()
    const year = date.getFullYear()
    const key = `${year}-${month}`

    if (!monthCounts.has(key)) {
      monthCounts.set(key, { month, year, count: 0 })
    }
    monthCounts.get(key)!.count++
  }

  return [...monthCounts.values()]
    .map((entry) => ({
      month: entry.month,
      monthName: MONTH_NAMES[entry.month] ?? 'Unknown',
      overrideCount: entry.count,
      year: entry.year,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
}

/**
 * Detect seasonal erosion: identify if the upcoming month has historically
 * been a weak period for commitment adherence.
 */
export async function detectSeasonalErosion(
  tenantId: string
): Promise<SeasonalErosionResult> {
  const profile = await buildSeasonalProfile(tenantId)

  if (profile.length === 0) {
    return {
      detected: false,
      upcomingWeakMonth: null,
      historicalAvg: 0,
      currentMonthCount: 0,
      monthlyProfile: [],
    }
  }

  // Calculate average overrides per month across all history
  const totalOverrides = profile.reduce((sum, p) => sum + p.overrideCount, 0)
  const avgPerMonth = totalOverrides / Math.max(profile.length, 1)

  // Get next month's historical data
  const now = new Date()
  const nextMonth = (now.getMonth() + 1) % 12
  const nextMonthEntries = profile.filter((p) => p.month === nextMonth)
  const nextMonthAvg = nextMonthEntries.length > 0
    ? nextMonthEntries.reduce((sum, p) => sum + p.overrideCount, 0) / nextMonthEntries.length
    : 0

  // Current month count
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentMonthEntries = profile.filter(
    (p) => p.month === currentMonth && p.year === currentYear
  )
  const currentMonthCount = currentMonthEntries.reduce((sum, p) => sum + p.overrideCount, 0)

  // Detect if next month is historically 50%+ above average
  const detected = nextMonthAvg > avgPerMonth * 1.5 && nextMonthEntries.length >= 1

  return {
    detected,
    upcomingWeakMonth: detected ? MONTH_NAMES[nextMonth] ?? null : null,
    historicalAvg: Math.round(avgPerMonth * 10) / 10,
    currentMonthCount,
    monthlyProfile: profile,
  }
}

/**
 * Analyze for seasonal erosion patterns and emit CIL proactive signals.
 */
export async function analyzeSeasonalErosionSignals(
  tenantId: string
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = []
  const now = Date.now()

  const erosion = await detectSeasonalErosion(tenantId)
  if (!erosion.detected || !erosion.upcomingWeakMonth) return signals

  // Also check if current month is already trending high
  const currentTrending = erosion.currentMonthCount > erosion.historicalAvg * 1.2

  const urgency: 1 | 2 | 3 | 4 | 5 = currentTrending ? 4 : 3

  signals.push({
    id: generateId(),
    domain: 'commitment',
    urgency,
    confidence: 0.7,
    title: `Seasonal erosion warning: ${erosion.upcomingWeakMonth}`,
    detail: currentTrending
      ? `${erosion.upcomingWeakMonth} has historically been a weak period for commitment adherence, and this month is already trending above average (${erosion.currentMonthCount} overrides vs ${erosion.historicalAvg} avg).`
      : `${erosion.upcomingWeakMonth} has historically been a weak period for commitment adherence. Average overrides per month: ${erosion.historicalAvg}. Prepare now to maintain standards.`,
    suggestedAction: 'Review upcoming bookings for the weak period. Consider reducing event count or pre-scheduling rest days.',
    actionType: 'navigate',
    actionPayload: { path: '/calendar' },
    entityIds: [],
    source: 'commitment.seasonalErosion',
    createdAt: now,
  })

  return signals
}
