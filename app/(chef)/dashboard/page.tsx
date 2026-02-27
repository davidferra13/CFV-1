// Chef Dashboard — Complete Ask Remy
// Answers: "What should I do right now?"
// Sections: Today → Next Action → Week → Queue → Prep → Quality → Business
// Protected by layout via requireChef()

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getChefPreferences } from '@/lib/chef/actions'
import { DEFAULT_PREFERENCES, type DashboardWidgetId } from '@/lib/scheduling/types'
import SystemNerveCenter from '@/components/dashboard/system-nerve-center'

export const metadata: Metadata = { title: 'Dashboard - ChefFlow' }
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getAARStats } from '@/lib/aar/actions'
import { getTodaysSchedule, getAllPrepPrompts, getWeekSchedule } from '@/lib/scheduling/actions'
import { getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import { getClientsApproachingRewards } from '@/lib/loyalty/actions'
import {
  getDashboardQuoteStats,
  getDashboardEventCounts,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
  getNextUpcomingEvent,
  getDashboardHoursSnapshot,
  getTopEventsByProfit,
  getMonthlyAvgHourlyRate,
  type DashboardHoursCategoryEntry,
  type TopProfitEvent,
} from '@/lib/dashboard/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { getFoodCostTrend, type FoodCostTrend } from '@/lib/analytics/cost-trends'
import { getBookingSeasonality, type BookingSeasonality } from '@/lib/analytics/seasonality'
import { getDormantClients, type DormantClientEntry } from '@/lib/clients/dormancy'
import { getClosureStreak, type ClosureStreakData } from '@/lib/chefs/streaks'
import {
  getOverdueFollowUps,
  getWeeklyAccountabilityStats,
  type OverdueFollowUpEvent,
  type WeeklyAccountabilityStats,
} from '@/lib/dashboard/accountability'
import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
import { getDOPTaskDigest, type DOPTaskDigest } from '@/lib/scheduling/task-digest'
import { DOPTaskPanel } from '@/components/dashboard/dop-task-panel'
import { AccountabilityPanel } from '@/components/dashboard/accountability-panel'
import { getPipelineRevenueForecast, type PipelineRevenueForecast } from '@/lib/pipeline/forecast'
import { getUpcomingMilestones, type UpcomingMilestone } from '@/lib/clients/birthday-alerts'
import { PipelineRevenueForecast as PipelineForecastWidget } from '@/components/pipeline/revenue-forecast'
import { getStuckEvents, type StuckEvent } from '@/lib/pipeline/stuck-events'
import { StuckEventsWidget } from '@/components/pipeline/stuck-events-widget'
import { getYoYData, type YoYData } from '@/lib/analytics/year-over-year'
import { YoYCards } from '@/components/analytics/yoy-cards'
import { getMultiEventDays, type MultiEventDay } from '@/lib/scheduling/multi-event-days'
import { MultiEventDayAlert } from '@/components/scheduling/multi-event-day-alert'
import { getOnboardingProgress, type OnboardingProgress } from '@/lib/onboarding/progress-actions'
import { OnboardingChecklistWidget } from '@/components/dashboard/onboarding-checklist-widget'
import { getNextBestActions, type NextBestAction } from '@/lib/clients/next-best-action'
import { NextBestActionsWidget } from '@/components/clients/next-best-actions-widget'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import { getActiveClients, getRecentClientActivity } from '@/lib/activity/actions'
import { getChefActivitySummary } from '@/lib/activity/chef-actions'
import { getChefJourneyInsights, getChefJourneys } from '@/lib/journey/actions'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { formatCurrency } from '@/lib/utils/currency'
import { HoursLogWidget } from '@/components/dashboard/hours-log-widget'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { TimelineView } from '@/components/scheduling/timeline-view'
import { PrepPromptsView } from '@/components/scheduling/prep-prompts-view'
import { NextActionCard } from '@/components/queue/next-action'
import { QueueList } from '@/components/queue/queue-list'
import { QueueSummaryBar } from '@/components/queue/queue-summary'
import { QueueEmpty } from '@/components/queue/queue-empty'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LivePresencePanel } from '@/components/activity/live-presence-panel'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { OnboardingAccelerator } from '@/components/dashboard/onboarding-accelerator'
import { ChefJournalWidget } from '@/components/dashboard/chef-journal-widget'
import { DashboardQuickSettings } from '@/components/dashboard/dashboard-quick-settings'
import { ChefTodoWidget } from '@/components/dashboard/chef-todo-widget'
import { getTodos } from '@/lib/todos/actions'
import { getUpcomingCalls } from '@/lib/calls/actions'
import { UpcomingCallsWidget } from '@/components/calls/upcoming-calls-widget'
import { getRecipeDebt } from '@/lib/recipes/actions'
import { RecipeDebtWidget } from '@/components/dashboard/recipe-debt-widget'
import {
  getCollaboratingOnEvents,
  getPendingCollaborationInvitations,
  getPendingRecipeShares,
} from '@/lib/collaboration/actions'
import {
  CollaborationInvitationCard,
  PendingRecipeShareCard,
} from '@/components/events/event-collaborators-panel'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, Gift } from 'lucide-react'
import type { PriorityQueue } from '@/lib/queue/types'
import { MobileDashboardExpander } from '@/components/dashboard/mobile-dashboard-expander'

import { BusinessInsightsPanel } from '@/components/ai/business-insights-panel'
import { HolidayOutreachPanel } from '@/components/dashboard/holiday-outreach-panel'
import { getHolidayOutreachSuggestions } from '@/lib/holidays/outreach-data'
import { type HolidayOutreachSuggestion } from '@/lib/holidays/outreach-types'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { DailyPlanBanner } from '@/components/daily-ops/daily-plan-banner'
import {
  getResponseTimeSummary,
  type ResponseTimeSummary,
} from '@/lib/analytics/response-time-actions'
import { ResponseTimeWidget } from '@/components/dashboard/response-time-widget'
import { getStaleInquiries, type PendingFollowUp } from '@/lib/inquiries/follow-up-actions'
import { PendingFollowUpsWidget } from '@/components/inquiries/pending-follow-ups-widget'
import { getWeatherForEvents, type InlineWeather } from '@/lib/weather/open-meteo'
import { createServerClient } from '@/lib/supabase/server'
import { InviteChefCard } from '@/components/marketing/invite-chef-card'

// ============================================
// Safe wrapper — logs failures, returns fallback
// ============================================

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
}

// ============================================
// Empty defaults for each data stream
// ============================================

const emptyQueue: PriorityQueue = {
  items: [],
  nextAction: null,
  summary: {
    totalItems: 0,
    byDomain: {
      inquiry: 0,
      message: 0,
      quote: 0,
      event: 0,
      financial: 0,
      post_event: 0,
      client: 0,
      culinary: 0,
    },
    byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
    allCaughtUp: true,
  },
  computedAt: new Date().toISOString(),
}

const emptyInquiryStats = {
  new: 0,
  awaiting_client: 0,
  awaiting_chef: 0,
  quoted: 0,
  confirmed: 0,
  declined: 0,
  expired: 0,
}
const emptyFinancials = {
  totalRevenueCents: 0,
  totalRefundsCents: 0,
  totalTipsCents: 0,
  netRevenueCents: 0,
  totalWithTipsCents: 0,
}
const emptyWeekSchedule: Awaited<ReturnType<typeof getWeekSchedule>> = {
  weekStart: '',
  weekEnd: '',
  days: [],
  warnings: [],
}
const emptyQuoteStats = {
  draft: 0,
  sent: 0,
  expiringSoon: 0,
  total: 0,
  expiringDetails: [] as { clientName: string; validUntil: string; amountCents: number }[],
}
const emptyEventCounts = {
  thisMonth: 0,
  ytd: 0,
  completedThisMonth: 0,
  completedYtd: 0,
  upcomingThisMonth: 0,
  totalGuestsThisMonth: 0,
  totalGuestsYtd: 0,
}
const emptyMonthRevenue = {
  currentMonthRevenueCents: 0,
  previousMonthRevenueCents: 0,
  currentMonthProfitCents: 0,
  changePercent: 0,
}
const emptyExpenses = { totalCents: 0, businessCents: 0 }
const emptyRecipeDebt = { last7Days: 0, last30Days: 0, older: 0, total: 0, totalRecipes: 0 }
const emptyTopEvents: TopProfitEvent[] = []
const emptyFoodCostTrend: FoodCostTrend = {
  months: [],
  isRising: false,
  risingMonthCount: 0,
  overallAvgFoodCostPercent: null,
}
const emptySeasonality: BookingSeasonality = {
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
const emptyDormantClients: DormantClientEntry[] = []
const emptyOverdueFollowUps: OverdueFollowUpEvent[] = []
const emptyWeeklyStats: WeeklyAccountabilityStats = {
  eventsCompletedThisWeek: 0,
  followUpsSentThisWeek: 0,
  receiptsUploadedThisWeek: 0,
  overdueFollowUps: 0,
  closedOnTimeCount: 0,
}
const emptyClosureStreak: ClosureStreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastClosureDate: null,
  milestoneMessage: null,
}
const emptyDOPDigest: DOPTaskDigest = {
  tasks: [],
  overdueCount: 0,
  dueTodayCount: 0,
  upcomingCount: 0,
  totalIncomplete: 0,
}
const emptyPipelineForecast: PipelineRevenueForecast = {
  expectedCents: 0,
  bestCaseCents: 0,
  stages: [],
  computedAt: new Date().toISOString(),
}
const emptyUpcomingMilestones: UpcomingMilestone[] = []
const emptyStuckEvents: StuckEvent[] = []
const emptyMultiEventDays: MultiEventDay[] = []
const emptyNextBestActions: NextBestAction[] = []
const emptyResponseTimeSummary: ResponseTimeSummary = {
  overdue: 0,
  urgent: 0,
  ok: 0,
  responded: 0,
  avgResponseTimeHours: null,
}
const emptyPendingFollowUps: PendingFollowUp[] = []

const emptyOnboardingProgress: OnboardingProgress = {
  profile: false,
  clients: { done: false, count: 0 },
  loyalty: { done: false },
  recipes: { done: false, count: 0 },
  staff: { done: false, count: 0 },
  completedPhases: 0,
  totalPhases: 5,
}
const emptyYoY: YoYData = {
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

const emptyHoursSnapshot = {
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
const emptyRevenueGoal = {
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
  recommendations: [],
  computedAt: new Date().toISOString(),
}
const emptyJournalInsights = {
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

// ============================================
// DASHBOARD PAGE
// ============================================

export default async function ChefDashboard() {
  const user = await requireChef()
  const currentMonthName = MONTH_NAMES[new Date().getMonth()]
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  // All data fetches in parallel — each wrapped in safe() for graceful degradation
  const [
    preferences,
    queue,
    clients,
    financials,
    inquiryStats,
    aarStats,
    todaysSchedule,
    prepPrompts,
    weekSchedule,
    quoteStats,
    eventCounts,
    monthRevenue,
    monthExpenses,
    revenueGoal,
    loyaltyApproaching,
    nextEvent,
    activeClients,
    recentActivity,
    chefActivity,
    hoursSnapshot,
    journalInsights,
    recentJourneys,
    todos,
    upcomingCalls,
    recipeDebt,
    schedulingGaps,
    collaboratingOnEvents,
    pendingCollabInvitations,
    pendingRecipeShares,
    quoteInsights,
    topEvents,
    avgHourlyRate,
    foodCostTrend,
    dormantClients,
    closureStreak,
    overdueFollowUps,
    weeklyStats,
    dopTaskDigest,
    seasonality,
    pipelineForecast,
    upcomingMilestones,
    stuckEvents,
    yoyData,
    multiEventDays,
  ] = await Promise.all([
    safe('preferences', getChefPreferences, {
      id: '',
      chef_id: user.entityId,
      ...DEFAULT_PREFERENCES,
    }),
    safe('queue', getPriorityQueue, emptyQueue),
    safe('clients', getClients, []),
    safe('financials', getTenantFinancialSummary, emptyFinancials),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats),
    safe('aarStats', getAARStats, null),
    safe('todaysSchedule', getTodaysSchedule, null),
    safe('prepPrompts', getAllPrepPrompts, []),
    safe('weekSchedule', () => getWeekSchedule(0), emptyWeekSchedule),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats),
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses),
    safe('revenueGoal', getRevenueGoalSnapshot, emptyRevenueGoal),
    safe('loyaltyApproaching', getClientsApproachingRewards, []),
    safe('nextEvent', getNextUpcomingEvent, null),
    safe('activeClients', () => getActiveClients(30), []),
    safe(
      'recentActivity',
      async () => (await getRecentClientActivity({ limit: 15, daysBack: 7 })).items,
      []
    ),
    safe('chefActivity', () => getChefActivitySummary(5), []),
    safe('hoursSnapshot', getDashboardHoursSnapshot, emptyHoursSnapshot),
    safe('journalInsights', getChefJourneyInsights, emptyJournalInsights),
    safe('recentJourneys', () => getChefJourneys({ status: 'all', limit: 1 }), []),
    safe('todos', getTodos, []),
    safe('upcomingCalls', () => getUpcomingCalls(5), []),
    safe('recipeDebt', getRecipeDebt, emptyRecipeDebt),
    safe('schedulingGaps', getSchedulingGaps, []),
    safe('collaboratingOnEvents', getCollaboratingOnEvents, []),
    safe('pendingCollabInvitations', getPendingCollaborationInvitations, []),
    safe('pendingRecipeShares', getPendingRecipeShares, []),
    safe('quoteInsights', getQuoteAcceptanceInsights, null),
    safe('topEvents', getTopEventsByProfit, emptyTopEvents),
    safe('avgHourlyRate', getMonthlyAvgHourlyRate, null),
    safe('foodCostTrend', () => getFoodCostTrend(6), emptyFoodCostTrend),
    safe('dormantClients', () => getDormantClients(5), emptyDormantClients),
    safe('closureStreak', getClosureStreak, emptyClosureStreak),
    safe('overdueFollowUps', () => getOverdueFollowUps(5), emptyOverdueFollowUps),
    safe('weeklyStats', getWeeklyAccountabilityStats, emptyWeeklyStats),
    safe('dopTaskDigest', getDOPTaskDigest, emptyDOPDigest),
    safe('seasonality', getBookingSeasonality, emptySeasonality),
    safe('pipelineForecast', getPipelineRevenueForecast, emptyPipelineForecast),
    safe('upcomingMilestones', () => getUpcomingMilestones(14), emptyUpcomingMilestones),
    safe('stuckEvents', () => getStuckEvents(5), emptyStuckEvents),
    safe('yoyData', getYoYData, emptyYoY),
    safe('multiEventDays', () => getMultiEventDays(90), emptyMultiEventDays),
  ])

  // Fetched separately — TypeScript's Promise.all tuple inference caps at 44 elements.
  // Still parallelized via their own Promise.all to avoid sequential round-trips.
  const [
    onboardingProgress,
    nextBestActions,
    holidayOutreachSuggestions,
    dailyPlanStats,
    responseTimeSummary,
    pendingFollowUps,
    chefProfile,
  ] = await Promise.all([
    safe('onboardingProgress', getOnboardingProgress, emptyOnboardingProgress),
    safe('nextBestActions', () => getNextBestActions(5), emptyNextBestActions),
    safe('holidayOutreach', getHolidayOutreachSuggestions, [] as HolidayOutreachSuggestion[]),
    safe('dailyPlanStats', getDailyPlanStats, null),
    safe('responseTimeSummary', getResponseTimeSummary, emptyResponseTimeSummary),
    safe('pendingFollowUps', () => getStaleInquiries(3), emptyPendingFollowUps),
    safe(
      'chefProfile',
      async () => {
        const supabase = await createServerClient()
        const { data } = await supabase
          .from('chefs')
          .select('slug, display_name')
          .eq('id', user.entityId)
          .single()
        return data as { slug: string | null; display_name: string | null } | null
      },
      null
    ),
  ])

  // ============================================
  // WEATHER — fetch for today's event + DOP task events
  // ============================================
  const weatherByEventId = await safe<Record<string, InlineWeather>>(
    'weather',
    async () => {
      // Collect event IDs that need weather
      const eventIds = new Set<string>()
      if (todaysSchedule) eventIds.add(todaysSchedule.event.id)
      for (const task of dopTaskDigest.tasks) eventIds.add(task.eventId)

      if (eventIds.size === 0) return {}

      // Fetch coordinates for these events from the database
      const supabase = createServerClient()
      const { data: eventCoords } = await supabase
        .from('events')
        .select('id, event_date, location_lat, location_lng')
        .in('id', Array.from(eventIds))

      if (!eventCoords || eventCoords.length === 0) return {}

      // Filter to events that have coordinates
      const withCoords = eventCoords
        .filter((e: any) => e.location_lat != null && e.location_lng != null)
        .map((e: any) => ({
          id: e.id,
          lat: e.location_lat as number,
          lng: e.location_lng as number,
          eventDate: e.event_date,
        }))

      if (withCoords.length === 0) return {}

      return getWeatherForEvents(withCoords)
    },
    {}
  )

  const activeInquiryCount =
    inquiryStats.new +
    inquiryStats.awaiting_client +
    inquiryStats.awaiting_chef +
    inquiryStats.quoted
  const totalInquiryCount = Object.values(inquiryStats).reduce((sum, value) => sum + value, 0)
  const shouldShowOnboardingAccelerator =
    eventCounts.ytd === 0 && (clients.length <= 10 || totalInquiryCount <= 10)
  const widgetPreferences = preferences.dashboard_widgets?.length
    ? preferences.dashboard_widgets
    : DEFAULT_PREFERENCES.dashboard_widgets
  const widgetEnabled = new Map<DashboardWidgetId, boolean>()
  const widgetOrder = new Map<DashboardWidgetId, number>()

  for (const [index, widget] of widgetPreferences.entries()) {
    widgetEnabled.set(widget.id, widget.enabled)
    widgetOrder.set(widget.id, index)
  }

  const isWidgetEnabled = (widgetId: DashboardWidgetId) => widgetEnabled.get(widgetId) ?? true
  const getWidgetOrder = (widgetId: DashboardWidgetId) =>
    widgetOrder.get(widgetId) ?? Number.MAX_SAFE_INTEGER
  const serializableHolidayOutreachSuggestions = holidayOutreachSuggestions.map((suggestion) => ({
    upcoming: {
      holiday: {
        key: suggestion.upcoming.holiday.key,
        name: suggestion.upcoming.holiday.name,
      },
      date:
        typeof suggestion.upcoming.date === 'string'
          ? suggestion.upcoming.date
          : new Date(suggestion.upcoming.date).toISOString(),
      daysUntil: suggestion.upcoming.daysUntil,
      inOutreachWindow: suggestion.upcoming.inOutreachWindow,
      isUrgent: suggestion.upcoming.isUrgent,
    },
    pastClients: suggestion.pastClients,
    premiumPricing: suggestion.premiumPricing,
    outreachHook: suggestion.outreachHook,
    menuNotes: suggestion.menuNotes,
  }))

  return (
    <div className="flex flex-col gap-8">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Dashboard</h1>
          <p className="text-sm text-stone-300 mt-0.5">
            Good {timeOfDay}
            {firstName ? `, ${firstName}` : ''}.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <DashboardQuickSettings initialWidgets={widgetPreferences} />
          <Link
            href="/queue"
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Full Queue
          </Link>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* DAILY OPS BANNER                              */}
      {/* ============================================ */}
      {dailyPlanStats && dailyPlanStats.totalItems > 0 && (
        <section>
          <DailyPlanBanner stats={dailyPlanStats} />
        </section>
      )}

      {/* ============================================ */}
      {/* PRIORITY BANNER — always visible, not hideable */}
      {/* ============================================ */}
      <section data-info="next-action">
        {queue.nextAction ? (
          <Link href={queue.nextAction.href} className="block">
            <div
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:opacity-90 ${
                queue.nextAction.urgency === 'critical'
                  ? 'bg-red-950 border-red-200 text-red-900'
                  : queue.nextAction.urgency === 'high'
                    ? 'bg-amber-950 border-amber-200 text-amber-900'
                    : 'bg-brand-950 border-brand-700 text-brand-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      queue.nextAction.urgency === 'critical'
                        ? '#ef4444'
                        : queue.nextAction.urgency === 'high'
                          ? '#f59e0b'
                          : '#e88f47',
                  }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{queue.nextAction.title}</p>
                  <p className="text-xs opacity-75 mt-0.5 truncate">
                    {queue.nextAction.context.primaryLabel}
                    {queue.nextAction.context.secondaryLabel
                      ? ` · ${queue.nextAction.context.secondaryLabel}`
                      : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium shrink-0 ml-4">Go →</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-950 px-4 py-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: '#10b981' }}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-green-800">
              All caught up — nothing urgent right now.
            </p>
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* SCHEDULING GAP BANNER                         */}
      {/* ============================================ */}
      {schedulingGaps.length > 0 && (
        <section>
          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              schedulingGaps.some((g: any) => g.severity === 'critical')
                ? 'bg-red-950 border-red-200 text-red-900'
                : 'bg-amber-950 border-amber-200 text-amber-900'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">
                {schedulingGaps.length} event{schedulingGaps.length !== 1 ? 's' : ''} missing prep
                blocks
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {schedulingGaps.some((g: any) => g.severity === 'critical')
                  ? 'Some events are less than 48 hours away with no prep scheduled.'
                  : 'Upcoming events need grocery runs, prep sessions, and packing scheduled.'}
              </p>
            </div>
            <Link href="/calendar/week">
              <span className="text-xs font-medium underline">Plan Week →</span>
            </Link>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* RESPONSE TIME SLA                              */}
      {/* ============================================ */}
      {(responseTimeSummary.overdue > 0 ||
        responseTimeSummary.urgent > 0 ||
        responseTimeSummary.ok > 0) && (
        <section>
          <ResponseTimeWidget summary={responseTimeSummary} />
        </section>
      )}

      {/* ============================================ */}
      {/* PENDING FOLLOW-UPS                             */}
      {/* ============================================ */}
      {pendingFollowUps.length > 0 && (
        <section>
          <PendingFollowUpsWidget followUps={pendingFollowUps} />
        </section>
      )}

      {/* ============================================ */}
      {/* HOLIDAY OUTREACH PANEL                        */}
      {/* ============================================ */}
      {serializableHolidayOutreachSuggestions.length > 0 && (
        <section>
          <HolidayOutreachPanel suggestions={serializableHolidayOutreachSuggestions} />
        </section>
      )}

      {/* System Nerve Center — admin-only health monitor + self-healing */}
      {isWidgetEnabled('system_nerve_center') && (
        <section style={{ order: getWidgetOrder('system_nerve_center') }}>
          <SystemNerveCenter />
        </section>
      )}

      {/* Onboarding Checklist — shown until all 5 setup phases are complete */}
      {onboardingProgress.completedPhases < onboardingProgress.totalPhases && (
        <section>
          <OnboardingChecklistWidget progress={onboardingProgress} />
        </section>
      )}

      {isWidgetEnabled('onboarding_accelerator') && shouldShowOnboardingAccelerator && (
        <section style={{ order: getWidgetOrder('onboarding_accelerator') }}>
          <OnboardingAccelerator
            clientCount={clients.length}
            inquiryCount={totalInquiryCount}
            quoteCount={quoteStats.total}
            eventCount={eventCounts.ytd}
          />
        </section>
      )}

      {/* ============================================ */}
      {/* UPCOMING CALLS WIDGET                         */}
      {/* ============================================ */}
      {upcomingCalls.length > 0 && (
        <section>
          <UpcomingCallsWidget calls={upcomingCalls} />
        </section>
      )}

      {/* ============================================ */}
      {/* PENDING COLLABORATION INVITATIONS             */}
      {/* ============================================ */}
      {(pendingCollabInvitations as any[]).length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Collaboration Invitations ({(pendingCollabInvitations as any[]).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(pendingCollabInvitations as any[]).map((inv: any) => (
                <CollaborationInvitationCard key={inv.id} collab={inv} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* PENDING RECIPE SHARES                         */}
      {/* ============================================ */}
      {(pendingRecipeShares as any[]).length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recipe Shares ({(pendingRecipeShares as any[]).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(pendingRecipeShares as any[]).map((share: any) => (
                <PendingRecipeShareCard key={share.id} share={share} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* COLLABORATING ON (shown when chef has accepted collaborations) */}
      {/* ============================================ */}
      {(collaboratingOnEvents as any[]).length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Collaborating On</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(collaboratingOnEvents as any[]).map((item: any) => (
                <Link
                  key={item.event?.id}
                  href={`/events/${item.event?.id}`}
                  className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 hover:bg-stone-700 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      {item.event?.occasion || 'Untitled Event'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {item.event?.event_date
                        ? format(new Date(item.event.event_date), 'MMM d, yyyy')
                        : 'Date TBD'}
                      {item.event?.client ? ` · ${item.event.client.full_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-brand-900 text-brand-300 font-medium capitalize">
                    {item.role.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* RECIPE DEBT (always visible when debt > 0)   */}
      {/* ============================================ */}
      <RecipeDebtWidget debt={recipeDebt} />

      {/* ============================================ */}
      {/* INVITE A CHEF — referral card                */}
      {/* ============================================ */}
      <InviteChefCard
        chefSlug={chefProfile?.slug}
        chefName={chefProfile?.display_name ?? undefined}
      />

      {/* ============================================ */}
      {/* SECTION 1: TODAY'S SCHEDULE                   */}
      {/* ============================================ */}
      {isWidgetEnabled('todays_schedule') && (
        <section style={{ order: getWidgetOrder('todays_schedule') }}>
          {todaysSchedule ? (
            <Card className="border-brand-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-brand-200">
                    Today: {todaysSchedule.event.occasion || 'Event'}
                  </CardTitle>
                  <Link
                    href={`/events/${todaysSchedule.event.id}/schedule`}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                  >
                    Full Schedule <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-stone-300">
                  {todaysSchedule.event.client?.full_name} &mdash;{' '}
                  {todaysSchedule.event.guest_count} guests
                  {todaysSchedule.event.location_city &&
                    ` \u2014 ${todaysSchedule.event.location_city}`}
                  {/* Inline weather indicator */}
                  {weatherByEventId[todaysSchedule.event.id] &&
                    (() => {
                      const w = weatherByEventId[todaysSchedule.event.id]
                      return (
                        <span
                          className="ml-2 inline-flex items-center gap-1 text-sky-400"
                          title={w.description}
                        >
                          <span>{w.emoji}</span>
                          <span>
                            {w.tempMinF}–{w.tempMaxF}°F
                          </span>
                          {w.precipitationMm > 0.5 && (
                            <span className="text-amber-400 ml-0.5">💧</span>
                          )}
                        </span>
                      )
                    })()}
                </div>
                {todaysSchedule.dop.isCompressed && (
                  <div className="bg-amber-950 border border-amber-200 rounded-lg p-2 mb-4">
                    <p className="text-sm font-medium text-amber-900">Compressed timeline active</p>
                  </div>
                )}
                <TimelineView timeline={todaysSchedule.timeline} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-stone-700 bg-stone-800">
              <CardContent className="py-8 text-center">
                <p className="text-stone-500 text-sm">
                  No dinners on the schedule today. A quiet day to plan ahead.
                </p>
                {nextEvent && (
                  <Link href={`/events/${nextEvent.id}`} className="inline-block mt-3">
                    <p className="text-sm text-brand-600 hover:text-brand-400 font-medium">
                      Next up: {nextEvent.occasion || 'Event'} &mdash;{' '}
                      {format(new Date(nextEvent.eventDate + 'T12:00:00'), 'EEEE, MMM d')}
                      <span className="text-stone-500 font-normal ml-1">
                        ({nextEvent.clientName}, {nextEvent.guestCount} guests,{' '}
                        {nextEvent.serveTime})
                      </span>
                    </p>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 2: NEXT ACTION (hero card)           */}
      {/* ============================================ */}
      {isWidgetEnabled('next_action') && queue.nextAction && (
        <section style={{ order: getWidgetOrder('next_action') }}>
          <NextActionCard item={queue.nextAction} />
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 3: WEEK AT A GLANCE                   */}
      {/* ============================================ */}
      {isWidgetEnabled('week_strip') && weekSchedule.days.length > 0 && (
        <section data-info="week-strip" style={{ order: getWidgetOrder('week_strip') }}>
          <WeekStrip schedule={weekSchedule} />
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 4: PRIORITY QUEUE                     */}
      {/* ============================================ */}
      {isWidgetEnabled('priority_queue') && (
        <section data-info="queue" style={{ order: getWidgetOrder('priority_queue') }}>
          {queue.summary.allCaughtUp ? (
            <QueueEmpty />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                  Priority Queue ({queue.summary.totalItems})
                </h2>
                <Link
                  href="/queue"
                  className="text-sm text-brand-600 hover:text-brand-400 font-medium"
                >
                  View all <ArrowRight className="h-3.5 w-3.5 inline" />
                </Link>
              </div>
              <QueueSummaryBar summary={queue.summary} />
              <QueueList items={queue.items} limit={20} showFilters={true} />
            </div>
          )}
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 4.5: FOLLOW-UP & ACCOUNTABILITY        */}
      {/* ============================================ */}
      {overdueFollowUps.length > 0 && (
        <section>
          <Card className="border-amber-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-amber-900">
                  Follow-Ups Overdue ({overdueFollowUps.length})
                </CardTitle>
                <Link
                  href="/events?status=completed"
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
                >
                  All Events
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueFollowUps.map((e) => (
                <div key={e.eventId} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/events/${e.eventId}`}
                      className="text-sm font-medium text-stone-100 hover:text-brand-600 truncate block"
                    >
                      {e.occasion || 'Event'} — {e.clientName}
                    </Link>
                    <p className="text-xs text-amber-600">{e.hoursOverdue}h overdue</p>
                  </div>
                  <Link
                    href={`/clients/${e.clientId}#messages`}
                    className="text-xs text-brand-600 hover:underline shrink-0 ml-3"
                  >
                    Send message →
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 4.6: DOP TASK DIGEST                  */}
      {/* ============================================ */}
      {(dopTaskDigest.totalIncomplete > 0 || dopTaskDigest.overdueCount > 0) && (
        <section>
          <DOPTaskPanel digest={dopTaskDigest} weatherByEventId={weatherByEventId} />
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 5: PREP PROMPTS                       */}
      {/* ============================================ */}
      {isWidgetEnabled('prep_prompts') && prepPrompts.length > 0 && (
        <section style={{ order: getWidgetOrder('prep_prompts') }}>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Preparation Prompts</CardTitle>
                <span className="text-sm text-stone-500">{prepPrompts.length} active</span>
              </div>
            </CardHeader>
            <CardContent>
              <PrepPromptsView prompts={prepPrompts} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* ============================================ */}
      {/* ANALYTICS SECTIONS — collapsed on mobile     */}
      {/* ============================================ */}
      <MobileDashboardExpander>
        {/* ============================================ */}
        {/* SECTION 6: SERVICE QUALITY (AAR)              */}
        {/* ============================================ */}
        {isWidgetEnabled('service_quality') && aarStats && aarStats.totalReviews > 0 && (
          <section style={{ order: getWidgetOrder('service_quality') }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Service Quality</CardTitle>
                    <Link href="/aar" className="text-sm text-brand-600 hover:text-brand-400">
                      All Reviews
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-2xl font-bold text-stone-100">
                        {aarStats.last5AvgCalm}/5
                      </div>
                      <p className="text-sm text-stone-500">calm (last 5)</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-stone-100">
                        {aarStats.last5AvgPrep}/5
                      </div>
                      <p className="text-sm text-stone-500">prep (last 5)</p>
                    </div>
                  </div>
                  {aarStats.totalReviews >= 5 && (
                    <p className="text-sm mt-3 flex items-center gap-1.5">
                      {aarStats.trendDirection === 'improving' && (
                        <>
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">
                            Trending up - your dinners are getting calmer
                          </span>
                        </>
                      )}
                      {aarStats.trendDirection === 'declining' && (
                        <>
                          <TrendingDown className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-600">
                            Trending down - review your recent prep patterns
                          </span>
                        </>
                      )}
                      {aarStats.trendDirection === 'neutral' && (
                        <>
                          <Minus className="h-4 w-4 text-stone-500" />
                          <span className="text-stone-500">
                            Holding steady across {aarStats.totalReviews} reviews
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>

              {aarStats.topForgottenItems.filter((i) => i.count >= 2).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Forgotten</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {aarStats.topForgottenItems
                        .filter((i) => i.count >= 2)
                        .slice(0, 4)
                        .map(({ item, count }) => (
                          <div key={item} className="flex justify-between items-center">
                            <span className="text-sm text-stone-300 capitalize">{item}</span>
                            <span className="text-sm font-medium text-red-600">
                              {count}x forgotten
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-stone-500 mt-3">
                      These items have been auto-added to your pre-event checklist
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 7: BUSINESS SNAPSHOT                  */}
        {/* ============================================ */}
        {isWidgetEnabled('business_snapshot') && (
          <section
            data-info="financials"
            className="space-y-3"
            style={{ order: getWidgetOrder('business_snapshot') }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Business Snapshot
              </h2>
              {closureStreak.currentStreak >= 2 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">🔥</span>
                  <span className="font-semibold text-stone-200">
                    {closureStreak.currentStreak} events closed on time in a row
                  </span>
                  {closureStreak.milestoneMessage && (
                    <span className="text-xs text-emerald-600 font-medium hidden sm:inline">
                      — {closureStreak.milestoneMessage}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Revenue — enhanced with MoM comparison */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Revenue</CardTitle>
                    <Link
                      href="/financials"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-100">
                    {formatCurrency(financials.netRevenueCents)}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">net revenue (all time)</p>
                  <div className="mt-3 pt-3 border-t border-stone-800 space-y-1">
                    {(monthRevenue.currentMonthRevenueCents > 0 ||
                      monthRevenue.previousMonthRevenueCents > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-300">
                          {currentMonthName}:{' '}
                          {formatCurrency(monthRevenue.currentMonthRevenueCents)}
                        </span>
                        {monthRevenue.changePercent !== 0 && (
                          <span
                            className={`text-xs font-medium flex items-center gap-0.5 ${monthRevenue.changePercent > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            {monthRevenue.changePercent > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {monthRevenue.changePercent > 0 ? '+' : ''}
                            {monthRevenue.changePercent}%
                          </span>
                        )}
                      </div>
                    )}
                    {financials.totalTipsCents > 0 && (
                      <p className="text-sm text-stone-500">
                        + {formatCurrency(financials.totalTipsCents)} in tips
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Revenue Goal</CardTitle>
                    <Link
                      href="/financials"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {!revenueGoal.enabled ? (
                    <>
                      <div className="text-lg font-semibold text-stone-100">Program Off</div>
                      <p className="text-sm text-stone-500 mt-1">
                        Enable revenue goals in Settings to get booking and calendar suggestions.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-stone-100">
                        {Math.max(0, revenueGoal.monthly.progressPercent)}%
                      </div>
                      <p className="text-sm text-stone-500 mt-1">
                        projected toward {formatCurrency(revenueGoal.monthly.targetCents)} this
                        month
                      </p>
                      <div className="mt-3 pt-3 border-t border-stone-800 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Projected</span>
                          <span className="text-stone-100 font-medium">
                            {formatCurrency(revenueGoal.monthly.projectedCents)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Gap</span>
                          <span
                            className={
                              revenueGoal.monthly.gapCents > 0
                                ? 'text-amber-600 font-medium'
                                : 'text-emerald-600 font-medium'
                            }
                          >
                            {formatCurrency(revenueGoal.monthly.gapCents)}
                          </span>
                        </div>
                        {revenueGoal.monthly.gapCents > 0 && (
                          <div className="flex justify-between">
                            <span className="text-stone-500">Dinners Needed</span>
                            <span className="text-stone-100 font-medium">
                              {revenueGoal.dinnersNeededThisMonth}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Profit — this month with margin */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Profit ({currentMonthName})</CardTitle>
                    <Link
                      href="/financials"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold ${monthRevenue.currentMonthProfitCents >= 0 ? 'text-stone-100' : 'text-red-600'}`}
                  >
                    {formatCurrency(monthRevenue.currentMonthProfitCents)}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">revenue minus expenses</p>
                  {monthRevenue.currentMonthRevenueCents > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-800 space-y-1">
                      <span className="text-sm text-stone-300">
                        {monthRevenue.currentMonthRevenueCents > 0
                          ? `${Math.round((monthRevenue.currentMonthProfitCents / monthRevenue.currentMonthRevenueCents) * 100)}% margin`
                          : 'No revenue yet'}
                      </span>
                      {avgHourlyRate !== null && (
                        <div className="text-sm text-stone-500">
                          Avg {formatCurrency(avgHourlyRate)}/hr this month
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events — this month + YTD */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Events</CardTitle>
                    <Link
                      href="/events"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      All Events <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-100">{eventCounts.thisMonth}</div>
                  <p className="text-sm text-stone-500 mt-1">
                    this month
                    {eventCounts.totalGuestsThisMonth > 0 &&
                      ` \u00B7 ${eventCounts.totalGuestsThisMonth} guests`}
                  </p>
                  <div className="mt-3 pt-3 border-t border-stone-800 space-y-1">
                    <div className="flex gap-3 text-sm text-stone-300">
                      {eventCounts.upcomingThisMonth > 0 && (
                        <span>{eventCounts.upcomingThisMonth} upcoming</span>
                      )}
                      {eventCounts.completedThisMonth > 0 && (
                        <>
                          {eventCounts.upcomingThisMonth > 0 && (
                            <span className="text-stone-300">&middot;</span>
                          )}
                          <span>{eventCounts.completedThisMonth} completed</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 text-sm text-stone-500">
                      <span>{eventCounts.ytd} YTD</span>
                      {eventCounts.totalGuestsYtd > 0 && (
                        <>
                          <span className="text-stone-300">&middot;</span>
                          <span>{eventCounts.totalGuestsYtd} guests served</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiries — enhanced with quote pipeline */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Inquiries</CardTitle>
                    <Link
                      href="/inquiries"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      Pipeline <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-100">{activeInquiryCount}</div>
                  <p className="text-sm text-stone-500 mt-1">active in pipeline</p>
                  <div className="mt-3 pt-3 border-t border-stone-800 space-y-1">
                    <div className="flex gap-3 text-sm text-stone-300">
                      {inquiryStats.new > 0 && <span>{inquiryStats.new} new</span>}
                      {inquiryStats.quoted > 0 && <span>{inquiryStats.quoted} quoted</span>}
                      {inquiryStats.awaiting_client > 0 && (
                        <span>{inquiryStats.awaiting_client} awaiting</span>
                      )}
                    </div>
                    {quoteStats.total > 0 && (
                      <div className="text-sm text-stone-500">
                        {quoteStats.sent} {quoteStats.sent === 1 ? 'quote' : 'quotes'} pending
                        response
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Year-over-Year */}
              {(yoyData.revenueMetric.currentYear > 0 ||
                yoyData.revenueMetric.previousYear > 0) && (
                <Card>
                  <CardContent className="pt-4">
                    <YoYCards data={yoyData} />
                  </CardContent>
                </Card>
              )}

              {/* Pipeline Forecast */}
              <PipelineForecastWidget forecast={pipelineForecast} />

              {/* Stuck Events */}
              <StuckEventsWidget events={stuckEvents} />

              {/* Multi-Event Day Warnings */}
              {multiEventDays.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <MultiEventDayAlert days={multiEventDays} />
                  </CardContent>
                </Card>
              )}

              {/* Clients */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Clients</CardTitle>
                    <Link
                      href="/clients"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-100">{clients.length}</div>
                  <p className="text-sm text-stone-500 mt-1">total clients</p>
                  {loyaltyApproaching.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-800">
                      <Link
                        href="/loyalty"
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        {loyaltyApproaching.length} near a reward
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dormant Clients — re-engagement prompt */}
              {dormantClients.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Re-Engage Clients</CardTitle>
                      <Link
                        href="/clients"
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                      >
                        All Clients <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dormantClients.map((c) => (
                        <Link
                          key={c.clientId}
                          href={`/clients/${c.clientId}`}
                          className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-100 truncate">
                              {c.clientName}
                            </p>
                            <p className="text-xs text-amber-600">
                              {c.daysSinceLastEvent}+ days quiet
                            </p>
                          </div>
                          <span className="text-xs text-brand-600 hover:underline shrink-0 ml-3">
                            Reach out →
                          </span>
                        </Link>
                      ))}
                    </div>
                    <p className="text-xs text-stone-300 mt-3">
                      {dormantClients.length} client{dormantClients.length !== 1 ? 's' : ''}{' '}
                      haven&apos;t booked in 90+ days
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Next Best Actions per Client */}
              <NextBestActionsWidget actions={nextBestActions} />

              {/* Birthday & Anniversary Alerts — 14-day lookahead */}
              {upcomingMilestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-500" />
                        Upcoming Occasions
                      </CardTitle>
                      <Link
                        href="/clients"
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                      >
                        All Clients <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingMilestones.map((m, i) => (
                        <Link
                          key={`${m.clientId}-${i}`}
                          href={`/clients/${m.clientId}`}
                          className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-100 truncate">
                              {m.clientName}
                            </p>
                            <p className="text-xs text-stone-500">{m.label}</p>
                          </div>
                          <span
                            className={`text-xs font-medium shrink-0 ml-3 ${
                              m.daysUntil === 0
                                ? 'text-pink-600'
                                : m.daysUntil <= 3
                                  ? 'text-amber-600'
                                  : 'text-stone-500'
                            }`}
                          >
                            {m.daysUntil === 0
                              ? 'Today!'
                              : m.daysUntil === 1
                                ? 'Tomorrow'
                                : `in ${m.daysUntil}d`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expenses — this month */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Expenses ({currentMonthName})</CardTitle>
                    <Link
                      href="/expenses"
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                    >
                      Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-stone-100">
                    {formatCurrency(monthExpenses.businessCents)}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">business expenses</p>
                  {monthExpenses.totalCents > monthExpenses.businessCents && (
                    <div className="mt-3 pt-3 border-t border-stone-800">
                      <span className="text-sm text-stone-300">
                        {formatCurrency(monthExpenses.totalCents)} total (incl. personal)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Food Cost Trend — 6-month rolling sparkline */}
              {foodCostTrend.months.some((m) => m.eventCount > 0) &&
                (() => {
                  const hasData = foodCostTrend.months.filter((m) => m.eventCount > 0)
                  const maxVal = Math.max(...hasData.map((m) => m.avgFoodCostPercent), 1)
                  return (
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Food Cost Trend</CardTitle>
                          <Link
                            href="/finance/reporting"
                            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                          >
                            Details <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {foodCostTrend.isRising && (
                          <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-950 border border-amber-200 px-3 py-2">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-800 font-medium">
                              Food cost rising {foodCostTrend.risingMonthCount + 1} months in a row
                              — review suppliers or portion sizes
                            </p>
                          </div>
                        )}
                        {/* Sparkline bar chart */}
                        <div className="flex items-end gap-1 h-10 mb-2">
                          {foodCostTrend.months.map((m) => {
                            if (m.eventCount === 0) {
                              return (
                                <div
                                  key={m.month}
                                  className="flex-1 flex flex-col items-center justify-end gap-0.5"
                                >
                                  <div className="w-full h-1 bg-stone-800 rounded-sm" />
                                </div>
                              )
                            }
                            const ratio = m.avgFoodCostPercent / maxVal
                            const heightClass =
                              ratio >= 0.9
                                ? 'h-10'
                                : ratio >= 0.75
                                  ? 'h-8'
                                  : ratio >= 0.6
                                    ? 'h-7'
                                    : ratio >= 0.5
                                      ? 'h-6'
                                      : ratio >= 0.4
                                        ? 'h-5'
                                        : ratio >= 0.3
                                          ? 'h-4'
                                          : ratio >= 0.15
                                            ? 'h-3'
                                            : 'h-2'
                            const barColor =
                              m.avgFoodCostPercent >= 40
                                ? 'bg-red-400'
                                : m.avgFoodCostPercent >= 30
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                            return (
                              <div
                                key={m.month}
                                className="flex-1 flex flex-col items-center justify-end gap-0.5"
                              >
                                <div
                                  className={`w-full rounded-t-sm ${heightClass} ${barColor}`}
                                  title={`${m.label}: ${m.avgFoodCostPercent}%`}
                                />
                              </div>
                            )
                          })}
                        </div>
                        {/* Month labels */}
                        <div className="flex gap-1">
                          {foodCostTrend.months.map((m) => (
                            <div
                              key={m.month}
                              className="flex-1 text-center text-[10px] text-stone-300 leading-none"
                            >
                              {m.label.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                        {foodCostTrend.overallAvgFoodCostPercent !== null && (
                          <p className="text-sm text-stone-500 mt-3">
                            Avg food cost:{' '}
                            <span
                              className={`font-semibold ${
                                foodCostTrend.overallAvgFoodCostPercent >= 40
                                  ? 'text-red-600'
                                  : foodCostTrend.overallAvgFoodCostPercent >= 30
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                              }`}
                            >
                              {foodCostTrend.overallAvgFoodCostPercent}%
                            </span>
                            <span className="ml-2 text-xs text-stone-300">
                              {foodCostTrend.overallAvgFoodCostPercent < 30
                                ? '✓ on target'
                                : foodCostTrend.overallAvgFoodCostPercent < 40
                                  ? '↑ watch this'
                                  : '⚠ above target'}
                            </span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })()}

              {/* Booking Seasonality — peak/quiet month patterns */}
              {seasonality.hasEnoughData &&
                (() => {
                  const maxCount = Math.max(...seasonality.months.map((m) => m.eventCount), 1)
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle>Booking Seasons</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Upcoming season signal */}
                        {seasonality.upcomingPeak && seasonality.upcomingPeak.monthsAway <= 3 && (
                          <div className="mb-3 flex items-center gap-2 rounded-md bg-brand-950 border border-brand-700 px-3 py-2">
                            <TrendingUp className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                            <p className="text-xs text-brand-300 font-medium">
                              Busy season in{' '}
                              {seasonality.upcomingPeak.monthsAway === 1
                                ? 'next month'
                                : `${seasonality.upcomingPeak.monthsAway} months`}{' '}
                              ({seasonality.upcomingPeak.monthName}) — book clients now
                            </p>
                          </div>
                        )}
                        {!seasonality.upcomingPeak &&
                          seasonality.upcomingQuiet &&
                          seasonality.upcomingQuiet.monthsAway <= 3 && (
                            <div className="mb-3 flex items-center gap-2 rounded-md bg-stone-800 border border-stone-700 px-3 py-2">
                              <TrendingDown className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                              <p className="text-xs text-stone-300">
                                Quiet period coming in{' '}
                                {seasonality.upcomingQuiet.monthsAway === 1
                                  ? 'next month'
                                  : `${seasonality.upcomingQuiet.monthsAway} months`}{' '}
                                ({seasonality.upcomingQuiet.monthName}) — good time to take on new
                                clients
                              </p>
                            </div>
                          )}
                        {/* Month bar chart */}
                        <div className="flex items-end gap-0.5 h-10 mb-1">
                          {seasonality.months.map((m) => {
                            const ratio = m.eventCount / maxCount
                            const heightClass =
                              ratio >= 0.9
                                ? 'h-10'
                                : ratio >= 0.7
                                  ? 'h-8'
                                  : ratio >= 0.55
                                    ? 'h-7'
                                    : ratio >= 0.4
                                      ? 'h-6'
                                      : ratio >= 0.25
                                        ? 'h-4'
                                        : ratio >= 0.1
                                          ? 'h-3'
                                          : ratio > 0
                                            ? 'h-2'
                                            : 'h-1'
                            const isPeak = seasonality.peakMonths.includes(m.month)
                            const isQuiet = seasonality.quietMonths.includes(m.month)
                            const barColor = isPeak
                              ? 'bg-brand-500'
                              : isQuiet
                                ? 'bg-stone-700'
                                : 'bg-brand-800'
                            const emptyColor = m.eventCount === 0 ? 'bg-stone-800' : barColor
                            return (
                              <div
                                key={m.month}
                                className="flex-1 flex flex-col items-center justify-end"
                                title={`${m.monthName}: ${m.eventCount} event${m.eventCount !== 1 ? 's' : ''}${isPeak ? ' (peak)' : isQuiet ? ' (quiet)' : ''}`}
                              >
                                <div
                                  className={`w-full rounded-t-sm ${heightClass} ${m.eventCount === 0 ? emptyColor : barColor}`}
                                />
                              </div>
                            )
                          })}
                        </div>
                        {/* Month labels */}
                        <div className="flex gap-0.5">
                          {seasonality.months.map((m) => (
                            <div
                              key={m.month}
                              className="flex-1 text-center text-[9px] text-stone-300 leading-none"
                            >
                              {m.shortName}
                            </div>
                          ))}
                        </div>
                        {/* Legend */}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                          {seasonality.peakMonths.length > 0 && (
                            <span>
                              Peak:{' '}
                              <span className="text-brand-400 font-medium">
                                {seasonality.peakMonths
                                  .sort((a, b) => a - b)
                                  .map(
                                    (m) =>
                                      [
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
                                      ][m - 1]
                                  )
                                  .join(', ')}
                              </span>
                            </span>
                          )}
                          {seasonality.quietMonths.length > 0 && (
                            <span>
                              Quiet:{' '}
                              <span className="text-stone-300 font-medium">
                                {seasonality.quietMonths
                                  .sort((a, b) => a - b)
                                  .map(
                                    (m) =>
                                      [
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
                                      ][m - 1]
                                  )
                                  .join(', ')}
                              </span>
                            </span>
                          )}
                          <span className="text-stone-300">
                            {seasonality.totalEventsAnalyzed} events · {seasonality.yearsOfData}yr
                            {seasonality.yearsOfData !== 1 ? 's' : ''} data
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

              {/* Top Events This Month — profitability leaders */}
              {topEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Top Events ({currentMonthName})</CardTitle>
                      <Link
                        href="/finance/reporting/profit-by-event"
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                      >
                        All <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topEvents.map((event) => {
                        const marginColor =
                          event.profitMarginPercent >= 30
                            ? 'text-emerald-600'
                            : event.profitMarginPercent >= 15
                              ? 'text-amber-600'
                              : 'text-red-600'
                        return (
                          <Link
                            key={event.eventId}
                            href={`/events/${event.eventId}`}
                            className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-0.5 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-stone-100 truncate">
                                {event.occasion || 'Event'} — {event.clientName}
                              </p>
                              <p className="text-xs text-stone-500">{event.eventDate}</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-sm font-semibold text-stone-100">
                                {formatCurrency(event.profitCents)}
                              </p>
                              <p className={`text-xs font-medium ${marginColor}`}>
                                {event.profitMarginPercent}% margin
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Weekly Accountability — extracted into reusable component */}
            <AccountabilityPanel
              weeklyStats={weeklyStats}
              closureStreak={closureStreak}
              overdueFollowUpCount={weeklyStats.overdueFollowUps}
            />

            {/* Quote Performance Insights — full-width below the grid */}
            {quoteInsights && <QuoteAcceptanceInsightsPanel data={quoteInsights} />}
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 7.5: CHEF JOURNAL                    */}
        {/* ============================================ */}
        {isWidgetEnabled('career_growth') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('career_growth') }}>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
              Career Growth
            </h2>
            <ChefJournalWidget
              insights={journalInsights}
              latestJourney={recentJourneys[0] ?? null}
            />
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 8: HOURS                              */}
        {/* ============================================ */}
        {isWidgetEnabled('hours') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('hours') }}>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Hours</h2>
            <HoursLogWidget
              todayMinutes={hoursSnapshot.todayMinutes}
              weekMinutes={hoursSnapshot.weekMinutes}
              allTimeMinutes={hoursSnapshot.allTimeMinutes}
              topActivity={hoursSnapshot.topActivity}
              recentEntries={hoursSnapshot.recentEntries}
              trackingStreak={hoursSnapshot.trackingStreak}
              todayLogged={hoursSnapshot.todayLogged}
              weekCategoryBreakdown={hoursSnapshot.weekCategoryBreakdown}
            />
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 9: TO DO LIST                         */}
        {/* ============================================ */}
        {isWidgetEnabled('todo_list') && (
          <section style={{ order: getWidgetOrder('todo_list') }}>
            <ChefTodoWidget initialTodos={todos} />
          </section>
        )}

        {/* ============================================ */}
        {/* SECTION 10: ACTIVITY                          */}
        {/* ============================================ */}
        {isWidgetEnabled('activity') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('activity') }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                Activity
              </h2>
              <Link
                href="/activity"
                className="text-xs text-brand-600 hover:text-brand-400 font-medium"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-stone-300 mb-3">My Recent Activity</h3>
                <div className="max-h-64 overflow-y-auto">
                  <ChefActivityFeed entries={chefActivity} compact />
                </div>
              </div>
              <LivePresencePanel tenantId={user.tenantId!} initialClients={activeClients} />
              <ActivityFeed events={recentActivity} />
            </div>
          </section>
        )}
      </MobileDashboardExpander>

      {/* AI Business Insights — revenue patterns, profitability, seasonal trends */}
      <BusinessInsightsPanel />
    </div>
  )
}
