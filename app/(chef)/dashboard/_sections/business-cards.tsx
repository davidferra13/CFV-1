// Dashboard Business Cards - renders stat/list cards instead of accordions

import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { formatCurrency } from '@/lib/utils/currency'
import { getTargetsForArchetype } from '@/lib/costing/knowledge'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { requireChef } from '@/lib/auth/get-user'
import { MONTH_NAMES } from './business-section-defaults'
import { loadBusinessCardsData } from './business-cards-loader'

export async function BusinessCards() {
  const chef = await requireChef()
  const archetype = await getCachedChefArchetype(chef.entityId)
  const now = new Date()
  const currentMonthName = MONTH_NAMES[now.getMonth()]
  const {
    eventCounts,
    foodCostTrend,
    hotPipelineCount,
    inquiryStats,
    invoicePulse,
    monthExpenses,
    monthRevenue,
    prospectStats,
    quoteStats,
    revenueGoal,
  } = await loadBusinessCardsData()

  const revenueSparkData: number[] = []
  const revChange = monthRevenue.changePercent
  const revDirection: 'up' | 'down' | 'flat' =
    revChange > 0 ? 'up' : revChange < 0 ? 'down' : 'flat'

  const avgFoodCost = foodCostTrend.overallAvgFoodCostPercent
  const hasFoodCostData = foodCostTrend.months.some((month) => month.eventCount > 0)
  const foodCostSparkData = foodCostTrend.months.map((month) => month.avgFoodCostPercent || 0)

  // Use operator-specific targets based on chef's actual archetype
  const targets = getTargetsForArchetype(archetype)
  const foodCostHigh = targets.foodCostPctHigh
  const foodCostLow = targets.foodCostPctLow

  const goalEnabled = revenueGoal.enabled
  const goalPercent = revenueGoal.monthly.progressPercent ?? 0

  const openInquiries = (inquiryStats.new ?? 0) + (inquiryStats.awaiting_client ?? 0)
  const hotPipeline = hotPipelineCount ?? 0
  const collectionRate = invoicePulse.monthlyStats.collectionRate

  return (
    <>
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

      {goalEnabled && (
        <StatCard
          widgetId="revenue_goal"
          title="Revenue Goal"
          value={`${Math.round(goalPercent)}%`}
          subtitle={`${formatCurrency(revenueGoal.monthly.realizedCents ?? 0)} / ${formatCurrency(revenueGoal.monthly.targetCents ?? 0)}`}
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

      {hasFoodCostData && (
        <StatCard
          widgetId="food_cost_trend"
          title="Food Cost"
          value={`${(avgFoodCost ?? 0).toFixed(1)}%`}
          subtitle="avg food cost percentage"
          trend={
            avgFoodCost != null && avgFoodCost > foodCostHigh
              ? `Above ${foodCostLow}-${foodCostHigh}% target`
              : avgFoodCost != null && avgFoodCost < foodCostLow
                ? `Below ${foodCostLow}-${foodCostHigh}% range`
                : `Within ${foodCostLow}-${foodCostHigh}% target`
          }
          trendDirection={avgFoodCost != null && avgFoodCost > foodCostHigh ? 'down' : 'up'}
          sparkData={foodCostSparkData.length >= 3 ? foodCostSparkData : undefined}
          href="/analytics"
        />
      )}

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
