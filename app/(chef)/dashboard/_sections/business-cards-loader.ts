import { getFoodCostTrend, type FoodCostTrend } from '@/lib/analytics/cost-trends'
import {
  getDashboardEventCounts,
  getDashboardQuoteStats,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
} from '@/lib/dashboard/actions'
import {
  getInvoicePulse,
  getStalledDrafts,
  type InvoicePulseData,
  type StalledDraft,
} from '@/lib/dashboard/widget-actions'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getProspectStats } from '@/lib/prospecting/actions'
import type { ProspectStats } from '@/lib/prospecting/types'
import { getHotPipelineCount } from '@/lib/prospecting/pipeline-actions'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import type { RevenueGoalSnapshot } from '@/lib/revenue-goals/types'
import {
  getPlatformIndependenceScore,
  type PlatformIndependenceScore,
} from '@/lib/partners/analytics'
import {
  emptyEventCounts,
  emptyExpenses,
  emptyFoodCostTrend,
  emptyInquiryStats,
  emptyMonthRevenue,
  emptyProspectStats,
  emptyQuoteStats,
  emptyRevenueGoal,
  safe,
} from './business-section-defaults'

const EMPTY_INVOICE_PULSE: InvoicePulseData = {
  invoices: [],
  monthlyStats: {
    totalSentCents: 0,
    totalPaidCents: 0,
    collectionRate: 0,
  },
}

const EMPTY_PLATFORM_SCORE: PlatformIndependenceScore = {
  directPercent: 0,
  platformPercent: 0,
  directCents: 0,
  platformCents: 0,
  totalCents: 0,
  hasData: false,
}

export type BusinessCardsData = {
  eventCounts: typeof emptyEventCounts
  foodCostTrend: FoodCostTrend
  hotPipelineCount: number
  inquiryStats: typeof emptyInquiryStats
  invoicePulse: InvoicePulseData
  monthExpenses: typeof emptyExpenses
  monthRevenue: typeof emptyMonthRevenue
  prospectStats: ProspectStats
  quoteStats: typeof emptyQuoteStats
  revenueGoal: RevenueGoalSnapshot
  platformScore: PlatformIndependenceScore
  stalledDrafts: StalledDraft[]
  failedSections: string[]
}

interface LoadBusinessCardsDataOptions {
  includeProspecting?: boolean
}

export async function loadBusinessCardsData({
  includeProspecting = false,
}: LoadBusinessCardsDataOptions = {}): Promise<BusinessCardsData> {
  const failedSections: string[] = []

  const [
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
    platformScore,
    stalledDrafts,
  ] = await Promise.all([
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts, failedSections),
    safe('foodCostTrend', () => getFoodCostTrend(6), emptyFoodCostTrend, failedSections),
    includeProspecting
      ? safe('hotPipelineCount', getHotPipelineCount, 0, failedSections)
      : Promise.resolve(0),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats, failedSections),
    safe('invoicePulse', getInvoicePulse, EMPTY_INVOICE_PULSE, failedSections),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses, failedSections),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue, failedSections),
    includeProspecting
      ? safe('prospectStats', getProspectStats, emptyProspectStats, failedSections)
      : Promise.resolve(emptyProspectStats),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats, failedSections),
    safe(
      'revenueGoal',
      getRevenueGoalSnapshot,
      emptyRevenueGoal as RevenueGoalSnapshot,
      failedSections
    ),
    safe('platformScore', getPlatformIndependenceScore, EMPTY_PLATFORM_SCORE, failedSections),
    safe('stalledDrafts', getStalledDrafts, [] as StalledDraft[], failedSections),
  ])

  return {
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
    platformScore,
    stalledDrafts,
    failedSections,
  }
}
