// Clientele Insights Page
// Comprehensive statistics about the chef's events, clients, and business patterns

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getDinnerTimeDistribution,
  getOccasionStats,
  getServiceStyleDistribution,
  getGuestCountDistribution,
  getDietaryRestrictionFrequency,
  getMonthlyEventVolume,
  getDayOfWeekDistribution,
  getMonthlyRevenueTrend,
  getClientAcquisitionStats,
  getRetentionStats,
  getClientLTVDistribution,
  getPhaseTimeStats,
  getAARRatingTrends,
  getFinancialIntelligenceStats,
  getCulinaryUsageStats,
  getTakeAChefROI,
} from '@/lib/analytics/insights-actions'
import { METRIC_DEFINITIONS, getMetricCoverageSummary } from '@/lib/analytics/metric-registry'
import dynamic from 'next/dynamic'

const InsightsClient = dynamic(
  () => import('@/components/analytics/insights-client').then((m) => m.InsightsClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Clientele Insights' }

export default async function InsightsPage() {
  await requireChef()

  const [
    dinnerTime,
    occasions,
    serviceStyles,
    guestCounts,
    dietary,
    monthlyVolume,
    dayOfWeek,
    revenueTrend,
    acquisitionStats,
    retention,
    ltvDistribution,
    phaseStats,
    aarTrends,
    financialStats,
    culinaryUsage,
    tacROI,
  ] = await Promise.all([
    getDinnerTimeDistribution(),
    getOccasionStats(),
    getServiceStyleDistribution(),
    getGuestCountDistribution(),
    getDietaryRestrictionFrequency(),
    getMonthlyEventVolume(),
    getDayOfWeekDistribution(),
    getMonthlyRevenueTrend(18),
    getClientAcquisitionStats(),
    getRetentionStats(),
    getClientLTVDistribution(),
    getPhaseTimeStats(),
    getAARRatingTrends(12),
    getFinancialIntelligenceStats(),
    getCulinaryUsageStats(),
    getTakeAChefROI(),
  ])
  const metricCoverage = getMetricCoverageSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Clientele Insights</h1>
        <p className="text-stone-400 mt-1">
          Patterns from your events, clients, and history - so you can work smarter
        </p>
      </div>

      <InsightsClient
        dinnerTime={dinnerTime}
        occasions={occasions}
        serviceStyles={serviceStyles}
        guestCounts={guestCounts}
        dietary={dietary}
        monthlyVolume={monthlyVolume}
        dayOfWeek={dayOfWeek}
        revenueTrend={revenueTrend}
        acquisitionStats={acquisitionStats}
        retention={retention}
        ltvDistribution={ltvDistribution}
        phaseStats={phaseStats}
        aarTrends={aarTrends}
        financialStats={financialStats}
        culinaryUsage={culinaryUsage}
        tacROI={tacROI}
        metricDefinitions={METRIC_DEFINITIONS}
        metricCoverage={metricCoverage}
      />
    </div>
  )
}
