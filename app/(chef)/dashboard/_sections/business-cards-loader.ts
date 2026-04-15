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
}

export async function loadBusinessCardsData(): Promise<BusinessCardsData> {
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
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts),
    safe('foodCostTrend', () => getFoodCostTrend(6), emptyFoodCostTrend),
    safe('hotPipelineCount', getHotPipelineCount, 0),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats),
    safe('invoicePulse', getInvoicePulse, EMPTY_INVOICE_PULSE),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue),
    safe('prospectStats', getProspectStats, emptyProspectStats),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats),
    safe('revenueGoal', getRevenueGoalSnapshot, emptyRevenueGoal as RevenueGoalSnapshot),
    safe('platformScore', getPlatformIndependenceScore, EMPTY_PLATFORM_SCORE),
    safe('stalledDrafts', getStalledDrafts, [] as StalledDraft[]),
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
  }
}
