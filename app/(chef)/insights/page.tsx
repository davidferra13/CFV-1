// Clientele Intelligence Page
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
  getTakeAChefROI,
} from '@/lib/analytics/insights-actions'
import { InsightsClient } from '@/components/analytics/insights-client'

export const metadata: Metadata = { title: 'Clientele Intelligence - ChefFlow' }

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
    getTakeAChefROI(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Clientele Intelligence</h1>
        <p className="text-stone-600 mt-1">
          Patterns from your events, clients, and history — so you can work smarter
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
        tacROI={tacROI}
      />
    </div>
  )
}
