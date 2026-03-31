// Comprehensive Analytics Hub
// All statistics tracked by ChefFlow - 9 tabs covering every business and chef metric

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'

const AnalyticsHub = dynamic(
  () => import('@/components/analytics/analytics-hub-client').then((m) => m.AnalyticsHub),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

// ─── Server Action Imports ────────────────────────────────────────────────────

// Existing
import {
  getSourceDistribution,
  getConversionRatesBySource,
  getRevenueBySource,
} from '@/lib/partners/analytics'
import { getMonthOverMonthRevenue, getDashboardEventCounts } from '@/lib/dashboard/actions'

// New analytics actions
import {
  getClientRetentionStats,
  getClientChurnStats,
  getRevenueConcentration,
  getClientAcquisitionStats,
  getReferralConversionStats,
  getNpsStats,
} from '@/lib/analytics/client-analytics'
import {
  getInquiryFunnelStats,
  getQuoteAcceptanceStats,
  getGhostRateStats,
  getLeadTimeStats,
  getDeclineReasonStats,
  getNegotiationStats,
  getAvgInquiryResponseTime,
} from '@/lib/analytics/pipeline-analytics'
import {
  getRevenuePerUnitStats,
  getRevenueByDayOfWeek,
  getRevenueByEventType,
  getRevenueBySeason,
  getTrueLaborCostStats,
  getCapacityStats,
  getCarryForwardStats,
  getBreakEvenStats,
} from '@/lib/analytics/revenue-analytics'
import {
  getComplianceStats,
  getTimePhaseStats,
  getWasteStats,
  getCulinaryOperationsStats,
} from '@/lib/analytics/operations-analytics'
import {
  getCampaignEmailStats,
  getMarketingSpendByChannel,
  getReviewStats,
  getWebsiteStats,
} from '@/lib/analytics/marketing-analytics'
import {
  getSocialConnectionStatuses,
  getSocialGrowthTrend,
  getGoogleReviewStats,
} from '@/lib/analytics/social-analytics'
import {
  getRecipeUsageStats,
  getDishPerformanceStats,
  getMenuApprovalStats,
} from '@/lib/analytics/culinary-analytics'

export const metadata: Metadata = { title: 'Analytics Hub' }

// Date helpers
function periodDates(monthsBack: number = 12): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - monthsBack)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export default async function AnalyticsHubPage() {
  await requireChef()

  const { start, end } = periodDates(12)
  const thisMonth = currentMonth()

  // Fetch all analytics in parallel - each fetch is independent.
  // Promise.allSettled ensures one failure doesn't crash the page.
  // No .catch() wrappers - let allSettled handle failures so val() can
  // distinguish "rejected" (load failed) from "fulfilled with zeros" (no data).
  const [
    // Overview / existing
    monthRevenue,
    eventCounts,
    sourceDistribution,
    sourceConversions,
    sourceRevenue,

    // Client
    clientRetention,
    clientChurn,
    revenueConcentration,
    clientAcquisition,
    referralConversion,
    npsStats,

    // Pipeline
    inquiryFunnel,
    quoteAcceptance,
    ghostRate,
    leadTime,
    declineReasons,
    negotiation,
    responseTime,

    // Revenue
    revenuePerUnit,
    revenueByDayOfWeek,
    revenueByEventType,
    revenueBySeason,
    trueLaborCost,
    capacity,
    carryForward,
    breakEven,

    // Operations
    compliance,
    timePhases,
    waste,
    culinaryOps,

    // Marketing
    emailStats,
    marketingSpend,
    reviewStats,
    websiteStats,

    // Social
    socialConnections,
    instagramTrend,
    googleReviews,

    // Culinary
    recipeUsage,
    dishPerformance,
    menuApproval,
  ] = await Promise.allSettled([
    getMonthOverMonthRevenue(),
    getDashboardEventCounts(),
    getSourceDistribution(),
    getConversionRatesBySource(),
    getRevenueBySource(),

    getClientRetentionStats(),
    getClientChurnStats(),
    getRevenueConcentration(),
    getClientAcquisitionStats(start, end),
    getReferralConversionStats(),
    getNpsStats(),

    getInquiryFunnelStats(),
    getQuoteAcceptanceStats(),
    getGhostRateStats(),
    getLeadTimeStats(),
    getDeclineReasonStats(),
    getNegotiationStats(),
    getAvgInquiryResponseTime(),

    getRevenuePerUnitStats(start, end),
    getRevenueByDayOfWeek(start, end),
    getRevenueByEventType(start, end),
    getRevenueBySeason(),
    getTrueLaborCostStats(start, end),
    getCapacityStats(thisMonth),
    getCarryForwardStats(start, end),
    getBreakEvenStats(),

    getComplianceStats(start, end),
    getTimePhaseStats(start, end),
    getWasteStats(start, end),
    getCulinaryOperationsStats(),

    getCampaignEmailStats(),
    getMarketingSpendByChannel(start, end),
    getReviewStats(),
    getWebsiteStats(),

    getSocialConnectionStatuses(),
    getSocialGrowthTrend('instagram', 6),
    getGoogleReviewStats(),

    getRecipeUsageStats(),
    getDishPerformanceStats(),
    getMenuApprovalStats(),
  ])

  function val<T>(result: PromiseSettledResult<T>, fallback: T): T {
    if (result.status === 'fulfilled') return result.value
    // Log the failure - don't silently swallow it
    console.error('[AnalyticsHub] Fetch failed:', result.reason)
    return fallback
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Analytics Hub</h1>
        <p className="text-stone-400 mt-1">
          Every metric that matters - business, operations, clients, marketing, social, and culinary
        </p>
      </div>

      <AnalyticsHub
        monthRevenue={val(monthRevenue, null)}
        eventCounts={val(eventCounts, null)}
        sourceDistribution={val(sourceDistribution, [])}
        sourceConversions={val(sourceConversions, [])}
        sourceRevenue={val(sourceRevenue, [])}
        clientRetention={val(clientRetention, {
          activeClients: 0,
          repeatClients: 0,
          repeatBookingRate: 0,
          retentionRate: 0,
        })}
        clientChurn={val(clientChurn, {
          totalAtRisk: 0,
          dormantCount: 0,
          churnRate: 0,
          avgDaysSinceLastEvent: 0,
        })}
        revenueConcentration={val(revenueConcentration, {
          top5Clients: [],
          top5SharePercent: 0,
          herfindahlIndex: 0,
        })}
        clientAcquisition={val(clientAcquisition, {
          newClientsThisPeriod: 0,
          totalMarketingSpendCents: 0,
          cacCents: 0,
          cacRatio: 0,
        })}
        referralConversion={val(referralConversion, {
          referredInquiries: 0,
          referredConversions: 0,
          referralConversionRate: 0,
          referralRevenueCents: 0,
        })}
        npsStats={val(npsStats, {
          npsScore: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          totalResponses: 0,
          avgOverallRating: 0,
          avgFoodQualityRating: 0,
          avgServiceRating: 0,
          avgValueRating: 0,
          avgPresentationRating: 0,
          wouldRebookPercent: 0,
          responseRate: 0,
        })}
        inquiryFunnel={val(inquiryFunnel, {
          totalInquiries: 0,
          quotedCount: 0,
          confirmedCount: 0,
          completedCount: 0,
          declinedCount: 0,
          expiredCount: 0,
          quoteRate: 0,
          confirmRate: 0,
          completionRate: 0,
          overallConversionRate: 0,
        })}
        quoteAcceptance={val(quoteAcceptance, {
          totalSent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
          acceptanceRate: 0,
          rejectionRate: 0,
          expiryRate: 0,
          avgValueCents: 0,
        })}
        ghostRate={val(ghostRate, {
          totalInquiries: 0,
          ghosted: 0,
          ghostRate: 0,
          avgDaysToGhost: 0,
        })}
        leadTime={val(leadTime, {
          avgLeadTimeDays: 0,
          avgSalesCycleDays: 0,
          buckets: { under2weeks: 0, twoTo4weeks: 0, oneToThreeMonths: 0, over3months: 0 },
          bucketPercents: { under2weeks: 0, twoTo4weeks: 0, oneToThreeMonths: 0, over3months: 0 },
        })}
        declineReasons={val(declineReasons, { reasons: [], totalDeclined: 0 })}
        negotiation={val(negotiation, {
          totalQuotes: 0,
          negotiatedCount: 0,
          negotiationRate: 0,
          avgOriginalCents: 0,
          avgFinalCents: 0,
          avgDiscountPercent: 0,
          avgDiscountCents: 0,
        })}
        responseTime={val(responseTime, {
          avgHoursToFirstResponse: 0,
          under1hour: 0,
          under4hours: 0,
          under24hours: 0,
          over24hours: 0,
          under1hourPercent: 0,
          under4hoursPercent: 0,
        })}
        revenuePerUnit={val(revenuePerUnit, {
          revenuePerGuestCents: 0,
          revenuePerHourCents: 0,
          revenuePerMileCents: 0,
          totalGuestsServed: 0,
          totalHoursWorked: 0,
          totalMilesDriven: 0,
          netRevenueCents: 0,
        })}
        revenueByDayOfWeek={val(revenueByDayOfWeek, [])}
        revenueByEventType={val(revenueByEventType, [])}
        revenueBySeason={val(revenueBySeason, [])}
        trueLaborCost={val(trueLaborCost, {
          ownerHoursCents: 0,
          staffCostCents: 0,
          totalLaborCents: 0,
          laborAsPercentOfRevenue: 0,
          trueNetProfitCents: 0,
          trueNetMarginPercent: 0,
        })}
        capacity={val(capacity, {
          maxEventsPerMonth: null,
          bookedThisMonth: 0,
          utilization: 0,
          demandOverflow: 0,
        })}
        carryForward={val(carryForward, {
          totalSavingsCents: 0,
          avgSavingsPerEvent: 0,
          eventsWithCarryForward: 0,
          savingsAsPercentOfFoodCost: 0,
        })}
        breakEven={val(breakEven, {
          estimatedFixedMonthlyCents: 0,
          avgEventsPerMonth: 0,
          breakEvenEventsPerMonth: 0,
          breakEvenRevenuePerEventCents: 0,
        })}
        compliance={val(compliance, {
          onTimeStartRate: 0,
          receiptSubmissionRate: 0,
          kitchenComplianceRate: 0,
          menuDeviationRate: 0,
          tempLogComplianceRate: 0,
          dietaryAccommodationRate: 0,
        })}
        timePhases={val(timePhases, [])}
        waste={val(waste, {
          totalFoodSpendCents: 0,
          leftoverCarriedForwardCents: 0,
          netFoodCostCents: 0,
          wastePercent: 0,
          eventsWithLeftovers: 0,
        })}
        culinaryOps={val(culinaryOps, {
          avgCoursesPerEvent: 0,
          avgGuestsPerEvent: 0,
          mostCommonOccasion: 'N/A',
          dietaryRestrictionFrequency: [],
        })}
        emailStats={val(emailStats, {
          totalCampaigns: 0,
          totalRecipients: 0,
          totalSent: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          spamRate: 0,
          unsubscribeRate: 0,
          bestCampaign: null,
        })}
        marketingSpend={val(marketingSpend, [])}
        reviewStats={val(reviewStats, {
          totalReviews: 0,
          avgRating: 0,
          reviewRate: 0,
          ratingDistribution: [],
          recentReviews: [],
        })}
        websiteStats={val(websiteStats, {
          snapshotMonth: '',
          uniqueVisitors: null,
          pageviews: null,
          bounceRatePercent: null,
          avgSessionSeconds: null,
          topSource: null,
          inquiryConversionRatePercent: null,
          previousMonth: null,
        })}
        socialConnections={val(socialConnections, [])}
        instagramTrend={val(instagramTrend, [])}
        googleReviews={val(googleReviews, null)}
        recipeUsage={val(recipeUsage, {
          totalRecipes: 0,
          recipesUsedInEvents: 0,
          recipeReuseRate: 0,
          avgTimesCooked: 0,
          neverCookedCount: 0,
          topRecipes: [],
        })}
        dishPerformance={val(dishPerformance, {
          newDishesThisMonth: 0,
          newDishesThisYear: 0,
          menuModificationRate: 0,
          avgDishesSentPerMenu: 0,
        })}
        menuApproval={val(menuApproval, {
          totalSent: 0,
          approved: 0,
          revisionRequested: 0,
          pending: 0,
          approvalRate: 0,
          revisionRate: 0,
          avgResponseHours: 0,
        })}
      />
    </div>
  )
}
