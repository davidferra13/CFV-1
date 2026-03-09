import type {
  DashboardInquiryBudgetMix,
  DashboardHoursCategoryEntry,
  TopProfitEvent,
} from '@/lib/dashboard/actions'
import type { FoodCostTrend } from '@/lib/analytics/cost-trends'
import type { BookingSeasonality } from '@/lib/analytics/seasonality'
import type { DormantClientEntry } from '@/lib/clients/dormancy'
import type { ClosureStreakData } from '@/lib/chefs/streaks'
import type {
  OverdueFollowUpEvent,
  WeeklyAccountabilityStats,
} from '@/lib/dashboard/accountability'
import type { PipelineRevenueForecast } from '@/lib/pipeline/forecast'
import type { YoYData } from '@/lib/analytics/year-over-year'
import type { ProspectStats } from '@/lib/prospecting/types'

// Safe wrapper
export async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Business] ${label} failed:`, err)
    return fallback
  }
}

export const MONTH_NAMES = [
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

// Empty defaults
export const emptyFinancials = {
  totalRevenueCents: 0,
  totalRefundsCents: 0,
  totalTipsCents: 0,
  netRevenueCents: 0,
  totalWithTipsCents: 0,
}
export const emptyInquiryStats = {
  new: 0,
  awaiting_client: 0,
  awaiting_chef: 0,
  quoted: 0,
  confirmed: 0,
  declined: 0,
  expired: 0,
  total: 0,
  linked: 0,
  conversionRate: 0,
}
export const emptyInquiryBudgetMix: DashboardInquiryBudgetMix = {
  exact: 0,
  range: 0,
  notSure: 0,
  unset: 0,
  known: 0,
  knownPercent: 0,
  total: 0,
  windowDays: 90,
}
export const emptyQuoteStats = {
  draft: 0,
  sent: 0,
  expiringSoon: 0,
  total: 0,
  expiringDetails: [] as { clientName: string; validUntil: string; amountCents: number }[],
}
export const emptyOutstandingPayments = {
  events: [] as any[],
  totalOutstandingCents: 0,
}
export const emptyEventCounts = {
  thisMonth: 0,
  ytd: 0,
  completedThisMonth: 0,
  completedYtd: 0,
  upcomingThisMonth: 0,
  totalGuestsThisMonth: 0,
  totalGuestsYtd: 0,
}
export const emptyMonthRevenue = {
  currentMonthRevenueCents: 0,
  previousMonthRevenueCents: 0,
  currentMonthProfitCents: 0,
  changePercent: 0,
}
export const emptyExpenses = { totalCents: 0, businessCents: 0 }
export const emptyTopEvents: TopProfitEvent[] = []
export const emptyFoodCostTrend: FoodCostTrend = {
  months: [],
  isRising: false,
  risingMonthCount: 0,
  overallAvgFoodCostPercent: null,
}
export const emptySeasonality: BookingSeasonality = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      i
    ],
    shortName: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i],
    eventCount: 0,
    avgRevenueCents: null,
  })),
  peakMonths: [],
  quietMonths: [],
  upcomingPeak: null,
  upcomingQuiet: null,
  totalEventsAnalyzed: 0,
  yearsOfData: 0,
  hasEnoughData: false,
}
export const emptyDormantClients: DormantClientEntry[] = []
export const emptyOverdueFollowUps: OverdueFollowUpEvent[] = []
export const emptyWeeklyStats: WeeklyAccountabilityStats = {
  eventsCompletedThisWeek: 0,
  followUpsSentThisWeek: 0,
  receiptsUploadedThisWeek: 0,
  overdueFollowUps: 0,
  closedOnTimeCount: 0,
}
export const emptyClosureStreak: ClosureStreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastClosureDate: null,
  milestoneMessage: null,
}
export const emptyPipelineForecast: PipelineRevenueForecast = {
  expectedCents: 0,
  bestCaseCents: 0,
  stages: [],
  computedAt: new Date().toISOString(),
}
export const emptyYoY: YoYData = {
  revenueMetric: {
    label: 'Total Revenue',
    currentYear: 0,
    previousYear: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  eventCountMetric: {
    label: 'Events',
    currentYear: 0,
    previousYear: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  avgEventValueMetric: {
    label: 'Avg Event Value',
    currentYear: 0,
    previousYear: 0,
    changePercent: null,
    changeDirection: 'flat',
  },
  currentYearLabel: String(new Date().getFullYear()),
  previousYearLabel: String(new Date().getFullYear() - 1),
}
export const emptyHoursSnapshot = {
  todayMinutes: 0,
  weekMinutes: 0,
  allTimeMinutes: 0,
  topActivity: null,
  recentEntries: [] as {
    id: string
    minutes: number
    loggedFor: string
    category: null
    note: string | null
    createdAt: string
  }[],
  trackingStreak: 0,
  todayLogged: false,
  weekCategoryBreakdown: [] as DashboardHoursCategoryEntry[],
}
export const emptyRevenueGoal = {
  enabled: false,
  nudgeLevel: 'gentle' as const,
  monthly: {
    start: '',
    end: '',
    targetCents: 0,
    realizedCents: 0,
    projectedCents: 0,
    gapCents: 0,
    progressPercent: 0,
  },
  annual: null,
  custom: [],
  avgBookingValueCents: 0,
  dinnersNeededThisMonth: 0,
  openDatesThisMonth: [],
  smartOpenDatesThisMonth: [],
  typicalBookingDays: [] as number[],
  recommendations: [],
  monthlyPaceStatus: 'on_track' as const,
  monthlyPaceRatio: 1,
  annualRunRateCents: null,
  trend: null,
  yoy: null,
  computedAt: new Date().toISOString(),
}
export const emptyJournalInsights = {
  total_journeys: 0,
  completed_journeys: 0,
  active_journeys: 0,
  total_entries: 0,
  highlights: 0,
  total_ideas: 0,
  adopted_ideas: 0,
  total_media: 0,
  total_recipe_links: 0,
  mapped_entries: 0,
  documented_mistakes: 0,
  top_destinations: [],
  top_learning_topics: [],
}
export const emptyProspectStats: ProspectStats = {
  total: 0,
  new: 0,
  queued: 0,
  called: 0,
  follow_up: 0,
  converted: 0,
  dead: 0,
  not_interested: 0,
}
export const emptyHealthScore = {
  score: 0,
  total: 0,
  percentage: 0,
}
export const emptySalesList = {
  sales: [] as any[],
  total: 0,
}
export const emptyProductList = {
  products: [] as any[],
  total: 0,
}
export const emptyStockSummary = {
  totalItems: 0,
  totalValueCents: 0,
  belowParCount: 0,
}
export const emptyWasteSummary = {
  rows: [] as any[],
  grandTotalCostCents: 0,
  grandTotalEntries: 0,
}
export const emptyCampaigns = [] as any[]
export const emptyPushDinners = [] as any[]
export const emptyPayrollRecords = [] as any[]
export const emptyContracts = [] as any[]
export const emptyProposals = [] as any[]
export const emptyCommunicationInboxStats = {
  total: 0,
  unlinked: 0,
  needs_attention: 0,
  snoozed: 0,
  resolved: 0,
}
export const emptyUnifiedInboxStats = {
  total: 0,
  unread: 0,
  bySource: {
    chat: 0,
    message: 0,
    wix: 0,
    notification: 0,
  },
}
export const emptyReviewStats = {
  total: 0,
  averageRating: 0,
  consentCount: 0,
  googleClickCount: 0,
}
export const emptyFunnelStats = {
  stages: [] as any[],
  totalProspects: 0,
}
export const emptyCollabMetrics = {
  window_days: 90,
  outgoing_total: 0,
  outgoing_open: 0,
  outgoing_closed: 0,
  outgoing_cancelled: 0,
  recipient_responses: 0,
  accepted: 0,
  rejected: 0,
  converted: 0,
  acceptance_rate_pct: null as number | null,
  conversion_rate_pct: null as number | null,
  avg_first_response_hours: null as number | null,
  incoming_total: 0,
  incoming_unread: 0,
  incoming_actionable: 0,
}
export const emptyGoalsDashboard = {
  activeGoals: [] as any[],
  categoryProgress: {} as Record<string, number>,
  enabledCategories: [] as string[],
  computedAt: new Date().toISOString(),
}
export const emptyComplianceStats = {
  onTimeStartRate: 0,
  receiptSubmissionRate: 0,
  kitchenComplianceRate: 0,
  menuDeviationRate: 0,
  tempLogComplianceRate: 0,
  dietaryAccommodationRate: 0,
}
export const emptyGuestFrequencyStats = {
  totalUniqueGuests: 0,
  repeatGuests: 0,
  avgEventsPerRepeat: 0,
}
export const emptyGuestLeadStats = {
  total: 0,
  new: 0,
  contacted: 0,
  converted: 0,
  archived: 0,
}
export const emptyPayoutSummary = {
  totalTransferredCents: 0,
  totalPlatformFeesCents: 0,
  totalNetReceivedCents: 0,
  transferCount: 0,
  pendingCount: 0,
  lastTransferDate: null as string | null,
  stripeAccountId: null as string | null,
  onboardingComplete: false,
}
export const emptyReconciliationReports = {
  reports: [] as any[],
  total: 0,
}
export const emptySocialPlannerData = {
  settings: {
    tenant_id: '',
    created_by: '',
    target_year: new Date().getUTCFullYear(),
    posts_per_week: 5,
    timezone: 'America/New_York',
    queue_days: [1, 2, 3, 4, 5],
    queue_times: ['11:00', '13:00', '11:00', '13:00', '11:00'],
    holdout_slots_per_month: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  posts: [] as any[],
  summary: {
    totalPosts: 0,
    postsPerWeek: 5,
    targetYear: new Date().getUTCFullYear(),
    byStatus: {
      idea: 0,
      draft: 0,
      approved: 0,
      queued: 0,
      published: 0,
      archived: 0,
    },
    byPillar: {
      recipe: 0,
      behind_scenes: 0,
      education: 0,
      social_proof: 0,
      offers: 0,
      seasonal: 0,
    },
    next30Days: 0,
    editableNow: 0,
    hotSwapReady: 0,
  },
  assets: [] as any[],
  links: [] as any[],
}
export const emptyWixConnection = {
  connected: false,
  webhookUrl: null as string | null,
  webhookSecret: null as string | null,
  lastSubmission: null as string | null,
  totalSubmissions: 0,
  errorCount: 0,
}
export const emptyIntegrationOverview = {
  totals: {
    connected: 0,
    disconnected: 0,
    error: 0,
    reauth_required: 0,
  },
  categorySummary: [] as any[],
  accounts: [] as any[],
}
export const emptyRemyAuditSummary = {
  windowDays: 14,
  since: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  total: 0,
  success: 0,
  blocked: 0,
  error: 0,
  started: 0,
  avgDurationMs: null as number | null,
}
export const emptyRemyMetrics = {
  totalConversations: 0,
  totalMessages: 0,
  topCategory: null as string | null,
  errorRate: 0,
  since: null as string | null,
}
