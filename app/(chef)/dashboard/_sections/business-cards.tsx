// Dashboard Business Cards - renders stat/list cards instead of accordions

import { requireChef } from '@/lib/auth/get-user'
import { getRevenueProjection, getComparativePeriods } from '@/lib/dashboard/actions'
import { getInvoicePulse } from '@/lib/dashboard/widget-actions'
import type { InvoicePulseData } from '@/lib/dashboard/widget-actions'
import type { RevenueProjection, ComparativePeriods } from '@/lib/dashboard/actions'
import { loadBusinessSectionData } from './business-section-loader'
import { buildBusinessSectionMetrics } from './business-section-metrics'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import { formatCurrency } from '@/lib/utils/currency'

const MONTH_NAMES = [
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

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/BusinessCards] ${label} failed:`, err)
    return fallback
  }
}

export async function BusinessCards() {
  const user = await requireChef()
  const now = new Date()
  const currentMonthName = MONTH_NAMES[now.getMonth()]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [data, revenueProjection, comparativePeriods, invoicePulse] = await Promise.all([
    loadBusinessSectionData({ monthEnd, monthStart, now, userId: user.id }),
    safe('revenueProjection', getRevenueProjection, null as RevenueProjection | null),
    safe('comparativePeriods', getComparativePeriods, null as ComparativePeriods | null),
    safe('invoicePulse', getInvoicePulse, {
      invoices: [],
      monthlyStats: { totalSentCents: 0, totalPaidCents: 0, collectionRate: 0 },
    } as InvoicePulseData),
  ])

  const metrics = buildBusinessSectionMetrics({ data, now })
  const { monthRevenue, monthExpenses, eventCounts, foodCostTrend, revenueGoal, quoteStats } = data

  // Revenue sparkline - not available on ComparativePeriods, skip for now
  const revenueSparkData: number[] = []

  // Revenue change percent
  const revChange = monthRevenue.changePercent
  const revDirection: 'up' | 'down' | 'flat' =
    revChange > 0 ? 'up' : revChange < 0 ? 'down' : 'flat'

  // Food cost
  const avgFoodCost = foodCostTrend.overallAvgFoodCostPercent
  const hasFoodCostData = (foodCostTrend.months ?? []).some((m: any) => m.eventCount > 0)
  const foodCostSparkData = (foodCostTrend.months ?? []).map((m: any) => m.avgFoodCostPercent || 0)

  // Revenue goal
  const goalEnabled = revenueGoal.enabled
  const goalPercent = revenueGoal.monthly?.progressPercent ?? 0

  // Lead funnel
  const { inquiryStats, prospectStats } = data
  const openInquiries = (inquiryStats.new ?? 0) + (inquiryStats.awaiting_client ?? 0)
  const hotPipeline = data.hotPipelineCount ?? 0

  // Invoice pulse
  const collectionRate = invoicePulse.monthlyStats.collectionRate

  return (
    <>
      {/* Business Snapshot - revenue this month */}
      <StatCard
        widgetId="business_snapshot"
        title={`${currentMonthName} Revenue`}
        value={formatCurrency(monthRevenue.currentMonthRevenueCents)}
        subtitle={`Expenses: ${formatCurrency(monthExpenses.businessCents)}`}
        trend={
          revChange !== 0
            ? `${revChange > 0 ? '+' : ''}${revChange.toFixed(0)}% vs last month`
            : 'Same as last month'
        }
        trendDirection={revDirection}
        sparkData={revenueSparkData.length >= 3 ? revenueSparkData : undefined}
        href="/finance/reporting"
      />

      {/* Revenue Goal */}
      {goalEnabled && (
        <StatCard
          widgetId="revenue_goal"
          title="Revenue Goal"
          value={`${Math.round(goalPercent)}%`}
          subtitle={`${formatCurrency(revenueGoal.monthly?.realizedCents ?? 0)} / ${formatCurrency(revenueGoal.monthly?.targetCents ?? 0)}`}
          trend={
            goalPercent >= 100
              ? 'Goal reached!'
              : goalPercent >= 75
                ? 'On track'
                : goalPercent >= 50
                  ? 'Behind pace'
                  : 'Needs attention'
          }
          trendDirection={goalPercent >= 75 ? 'up' : goalPercent >= 50 ? 'flat' : 'down'}
          href="/goals"
        />
      )}

      {/* Food Cost Trend */}
      {hasFoodCostData && (
        <StatCard
          widgetId="food_cost_trend"
          title="Food Cost"
          value={`${(avgFoodCost ?? 0).toFixed(1)}%`}
          subtitle="avg food cost percentage"
          trend={avgFoodCost != null && avgFoodCost > 35 ? 'Above target' : 'Healthy range'}
          trendDirection={avgFoodCost != null && avgFoodCost > 35 ? 'down' : 'up'}
          sparkData={foodCostSparkData.length >= 3 ? foodCostSparkData : undefined}
          href="/analytics"
        />
      )}

      {/* Lead Funnel */}
      {(openInquiries > 0 || hotPipeline > 0) && (
        <StatCard
          widgetId="lead_funnel_live"
          title="Lead Funnel"
          value={String(openInquiries)}
          subtitle="open inquiries"
          trend={
            hotPipeline > 0
              ? `${hotPipeline} hot leads`
              : `${prospectStats.total ?? 0} total prospects`
          }
          trendDirection={openInquiries > 0 ? 'up' : 'flat'}
          href="/inquiries"
        />
      )}

      {/* Invoice Pulse */}
      {invoicePulse.invoices.length > 0 && (
        <StatCard
          widgetId="invoice_pulse"
          title="Invoices"
          value={`${Math.round(collectionRate)}%`}
          subtitle="collection rate this month"
          trend={`${formatCurrency(invoicePulse.monthlyStats.totalPaidCents)} collected`}
          trendDirection={collectionRate >= 80 ? 'up' : collectionRate >= 50 ? 'flat' : 'down'}
          href="/invoices"
        />
      )}

      {/* Upcoming Events count */}
      <StatCard
        widgetId="upcoming_events"
        title="Upcoming Events"
        value={String(eventCounts.upcomingThisMonth ?? 0)}
        subtitle={`this month (${eventCounts.ytd ?? 0} YTD)`}
        trend={`${quoteStats.sent ?? 0} quotes pending`}
        trendDirection="flat"
        href="/events"
      />
    </>
  )
}
