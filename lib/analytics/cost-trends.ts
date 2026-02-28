'use server'

// Food Cost Trend Analysis
// Rolling N-month food cost % trend for a chef tenant.
// Used on the dashboard Business Snapshot section and finance overview.
// Flags an amber warning if food cost % has risen for 2+ consecutive months.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type FoodCostTrendMonth = {
  month: string // 'YYYY-MM'
  label: string // 'Jan '26'
  avgFoodCostPercent: number // 0-100, 0 = no data for that month
  eventCount: number
}

export type FoodCostTrend = {
  months: FoodCostTrendMonth[]
  isRising: boolean // true = 2+ consecutive recent months of increase
  risingMonthCount: number // how many consecutive months at the tail
  overallAvgFoodCostPercent: number | null
}

const MONTH_LABELS = [
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

export async function getFoodCostTrend(months = 6): Promise<FoodCostTrend> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Compute the cutoff date: first day of the month N months ago
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - (months - 1))
  cutoff.setDate(1)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Fetch all completed events in the range
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)

  if (!events || events.length === 0) {
    return buildEmpty(months)
  }

  const eventIds = events.map((e) => e.id)
  const dateMap = new Map<string, string>(events.map((e) => [e.id, e.event_date]))

  // Fetch food_cost_percentage from the event_financial_summary view
  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, food_cost_percentage')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (!summaries || summaries.length === 0) {
    return buildEmpty(months)
  }

  // Group by 'YYYY-MM'
  const byMonth = new Map<string, { sum: number; count: number }>()

  for (const s of summaries) {
    const date = dateMap.get(s.event_id)
    if (!date) continue
    const rawFcp = parseFloat(String(s.food_cost_percentage ?? 0))
    // food_cost_percentage is stored as a 0–1 decimal in the view
    if (!isFinite(rawFcp) || rawFcp <= 0) continue
    const ym = date.substring(0, 7)
    const existing = byMonth.get(ym) ?? { sum: 0, count: 0 }
    byMonth.set(ym, { sum: existing.sum + rawFcp * 100, count: existing.count + 1 })
  }

  // Generate the full month range in chronological order
  const monthRange: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthRange.push(ym)
  }

  const result: FoodCostTrendMonth[] = monthRange.map((ym) => {
    const entry = byMonth.get(ym)
    const [year, month] = ym.split('-')
    const label = `${MONTH_LABELS[parseInt(month) - 1]} '${year.slice(2)}`
    return {
      month: ym,
      label,
      avgFoodCostPercent: entry ? parseFloat((entry.sum / entry.count).toFixed(1)) : 0,
      eventCount: entry?.count ?? 0,
    }
  })

  // Overall average across months that have data
  const withData = result.filter((m) => m.eventCount > 0)
  const overallAvgFoodCostPercent =
    withData.length > 0
      ? parseFloat(
          (withData.reduce((s, m) => s + m.avgFoodCostPercent, 0) / withData.length).toFixed(1)
        )
      : null

  // Rising trend detection: count consecutive increases at the tail (most recent months)
  let risingMonthCount = 0
  for (let i = withData.length - 1; i >= 1; i--) {
    if (withData[i].avgFoodCostPercent > withData[i - 1].avgFoodCostPercent) {
      risingMonthCount++
    } else {
      break
    }
  }

  return {
    months: result,
    isRising: risingMonthCount >= 2,
    risingMonthCount,
    overallAvgFoodCostPercent,
  }
}

function buildEmpty(months: number): FoodCostTrend {
  const monthRange: FoodCostTrendMonth[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const [year, month] = ym.split('-')
    monthRange.push({
      month: ym,
      label: `${MONTH_LABELS[parseInt(month) - 1]} '${year.slice(2)}`,
      avgFoodCostPercent: 0,
      eventCount: 0,
    })
  }
  return {
    months: monthRange,
    isRising: false,
    risingMonthCount: 0,
    overallAvgFoodCostPercent: null,
  }
}
