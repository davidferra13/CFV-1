// Dashboard Business Section — streams in independently
// Covers: financials, events, inquiries, quotes, analytics, accountability
// This is the heaviest section — streams in last

import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getAARStats } from '@/lib/aar/actions'
import { getClientsApproachingRewards } from '@/lib/loyalty/actions'
import {
  getDashboardQuoteStats,
  getDashboardEventCounts,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
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
import { getNextBestActions, type NextBestAction } from '@/lib/clients/next-best-action'
import { NextBestActionsWidget } from '@/components/clients/next-best-actions-widget'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import { getActiveClients, getRecentClientActivity } from '@/lib/activity/actions'
import { getChefActivitySummary } from '@/lib/activity/chef-actions'
import { getChefJourneyInsights, getChefJourneys } from '@/lib/journey/actions'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { HoursLogWidget } from '@/components/dashboard/hours-log-widget'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { LivePresencePanel } from '@/components/activity/live-presence-panel'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { OnboardingAccelerator } from '@/components/dashboard/onboarding-accelerator'
import { ChefJournalWidget } from '@/components/dashboard/chef-journal-widget'
import { ChefTodoWidget } from '@/components/dashboard/chef-todo-widget'
import { getTodos } from '@/lib/todos/actions'
import { ProspectingWidget } from '@/components/dashboard/prospecting-widget'
import { getProspectStats } from '@/lib/prospecting/actions'
import { getHotPipelineCount } from '@/lib/prospecting/pipeline-actions'
import type { ProspectStats } from '@/lib/prospecting/types'
import { MobileDashboardExpander } from '@/components/dashboard/mobile-dashboard-expander'
import { BusinessInsightsPanel } from '@/components/ai/business-insights-panel'
import SystemNerveCenter from '@/components/dashboard/system-nerve-center'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, Gift } from 'lucide-react'
import type { DashboardWidgetId } from '@/lib/scheduling/types'

// Safe wrapper
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Business] ${label} failed:`, err)
    return fallback
  }
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

// Empty defaults
const emptyFinancials = {
  totalRevenueCents: 0,
  totalRefundsCents: 0,
  totalTipsCents: 0,
  netRevenueCents: 0,
  totalWithTipsCents: 0,
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
const emptyPipelineForecast: PipelineRevenueForecast = {
  expectedCents: 0,
  bestCaseCents: 0,
  stages: [],
  computedAt: new Date().toISOString(),
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
const emptyProspectStats: ProspectStats = {
  total: 0,
  new: 0,
  queued: 0,
  called: 0,
  follow_up: 0,
  converted: 0,
  dead: 0,
  not_interested: 0,
}

interface BusinessSectionProps {
  widgetEnabled: Record<string, boolean>
  widgetOrder: Record<string, number>
}

export async function BusinessSection({ widgetEnabled, widgetOrder }: BusinessSectionProps) {
  const user = await requireChef()
  const currentMonthName = MONTH_NAMES[new Date().getMonth()]

  const isWidgetEnabled = (id: DashboardWidgetId) => widgetEnabled[id] ?? true
  const getWidgetOrder = (id: DashboardWidgetId) => widgetOrder[id] ?? Number.MAX_SAFE_INTEGER

  const [
    clients,
    financials,
    inquiryStats,
    aarStats,
    quoteStats,
    eventCounts,
    monthRevenue,
    monthExpenses,
    revenueGoal,
    loyaltyApproaching,
    activeClients,
    recentActivity,
    chefActivity,
    hoursSnapshot,
    journalInsights,
    recentJourneys,
    todos,
    quoteInsights,
    topEvents,
    avgHourlyRate,
    foodCostTrend,
    dormantClients,
    closureStreak,
    overdueFollowUps,
    weeklyStats,
    seasonality,
    pipelineForecast,
    upcomingMilestones,
    stuckEvents,
    yoyData,
    multiEventDays,
    nextBestActions,
    prospectStats,
    hotPipelineCount,
    userIsAdmin,
  ] = await Promise.all([
    safe('clients', getClients, []),
    safe('financials', getTenantFinancialSummary, emptyFinancials),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats),
    safe('aarStats', getAARStats, null),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats),
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses),
    safe('revenueGoal', getRevenueGoalSnapshot, emptyRevenueGoal),
    safe('loyaltyApproaching', getClientsApproachingRewards, []),
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
    safe('quoteInsights', getQuoteAcceptanceInsights, null),
    safe('topEvents', getTopEventsByProfit, emptyTopEvents),
    safe('avgHourlyRate', getMonthlyAvgHourlyRate, null),
    safe('foodCostTrend', () => getFoodCostTrend(6), emptyFoodCostTrend),
    safe('dormantClients', () => getDormantClients(5), emptyDormantClients),
    safe('closureStreak', getClosureStreak, emptyClosureStreak),
    safe('overdueFollowUps', () => getOverdueFollowUps(5), emptyOverdueFollowUps),
    safe('weeklyStats', getWeeklyAccountabilityStats, emptyWeeklyStats),
    safe('seasonality', getBookingSeasonality, emptySeasonality),
    safe('pipelineForecast', getPipelineRevenueForecast, emptyPipelineForecast),
    safe('upcomingMilestones', () => getUpcomingMilestones(14), []),
    safe('stuckEvents', () => getStuckEvents(5), []),
    safe('yoyData', getYoYData, emptyYoY),
    safe('multiEventDays', () => getMultiEventDays(90), []),
    safe('nextBestActions', () => getNextBestActions(5), []),
    safe('prospectStats', getProspectStats, emptyProspectStats),
    safe('hotPipelineCount', getHotPipelineCount, 0),
    isAdmin(),
  ])

  const activeInquiryCount =
    inquiryStats.new +
    inquiryStats.awaiting_client +
    inquiryStats.awaiting_chef +
    inquiryStats.quoted
  const totalInquiryCount = Object.values(inquiryStats).reduce((sum, value) => sum + value, 0)
  const shouldShowOnboardingAccelerator =
    eventCounts.ytd === 0 && (clients.length <= 10 || totalInquiryCount <= 10)

  return (
    <>
      {/* System Nerve Center — admin-only */}
      {isWidgetEnabled('system_nerve_center') && (
        <section style={{ order: getWidgetOrder('system_nerve_center') }}>
          <CollapsibleWidget widgetId="system_nerve_center" title="System Nerve Center">
            <SystemNerveCenter />
          </CollapsibleWidget>
        </section>
      )}

      {/* Onboarding Accelerator */}
      {isWidgetEnabled('onboarding_accelerator') && shouldShowOnboardingAccelerator && (
        <section style={{ order: getWidgetOrder('onboarding_accelerator') }}>
          <CollapsibleWidget widgetId="onboarding_accelerator" title="Getting Started">
            <OnboardingAccelerator
              clientCount={clients.length}
              inquiryCount={totalInquiryCount}
              quoteCount={quoteStats.total}
              eventCount={eventCounts.ytd}
            />
          </CollapsibleWidget>
        </section>
      )}

      {/* Overdue Follow-Ups */}
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

      {/* Analytics Sections — collapsed on mobile */}
      <MobileDashboardExpander>
        {/* Service Quality */}
        {isWidgetEnabled('service_quality') && aarStats && aarStats.totalReviews > 0 && (
          <section style={{ order: getWidgetOrder('service_quality') }}>
            <CollapsibleWidget widgetId="service_quality" title="Service Quality">
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
            </CollapsibleWidget>
          </section>
        )}

        {/* Business Snapshot */}
        {isWidgetEnabled('business_snapshot') && (
          <section
            data-info="financials"
            className="space-y-3"
            style={{ order: getWidgetOrder('business_snapshot') }}
          >
            <CollapsibleWidget widgetId="business_snapshot" title="Business Snapshot">
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
                {/* Revenue */}
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

                {/* Revenue Goal */}
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

                {/* Profit */}
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

                {/* Events */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Events</CardTitle>
                      <Link
                        href="/events"
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
                      >
                        <Calendar className="h-3.5 w-3.5" /> All Events{' '}
                        <ArrowRight className="h-3.5 w-3.5" />
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

                {/* Inquiries */}
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

                {/* Prospecting — admin only */}
                {userIsAdmin && (
                  <ProspectingWidget stats={prospectStats} hotPipelineCount={hotPipelineCount} />
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
                          <Gift className="h-3.5 w-3.5" /> {loyaltyApproaching.length} near a reward
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dormant Clients */}
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

                {/* Next Best Actions */}
                <NextBestActionsWidget actions={nextBestActions} />

                {/* Birthday & Anniversary Alerts */}
                {upcomingMilestones.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-pink-500" /> Upcoming Occasions
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
                              className={`text-xs font-medium shrink-0 ml-3 ${m.daysUntil === 0 ? 'text-pink-600' : m.daysUntil <= 3 ? 'text-amber-600' : 'text-stone-500'}`}
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

                {/* Expenses */}
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

                {/* Food Cost Trend */}
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
                                Food cost rising {foodCostTrend.risingMonthCount + 1} months in a
                                row — review suppliers or portion sizes
                              </p>
                            </div>
                          )}
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
                                className={`font-semibold ${foodCostTrend.overallAvgFoodCostPercent >= 40 ? 'text-red-600' : foodCostTrend.overallAvgFoodCostPercent >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}
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

                {/* Booking Seasonality */}
                {seasonality.hasEnoughData &&
                  (() => {
                    const maxCount = Math.max(...seasonality.months.map((m) => m.eventCount), 1)
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle>Booking Seasons</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                              {seasonality.totalEventsAnalyzed} events · {seasonality.yearsOfData}{' '}
                              yr{seasonality.yearsOfData !== 1 ? 's' : ''} data
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                {/* Top Events */}
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

              {/* Accountability */}
              <AccountabilityPanel
                weeklyStats={weeklyStats}
                closureStreak={closureStreak}
                overdueFollowUpCount={weeklyStats.overdueFollowUps}
              />

              {/* Quote Insights */}
              {quoteInsights && <QuoteAcceptanceInsightsPanel data={quoteInsights} />}
            </CollapsibleWidget>
          </section>
        )}

        {/* Career Growth / Journal */}
        {isWidgetEnabled('career_growth') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('career_growth') }}>
            <CollapsibleWidget widgetId="career_growth" title="Career Growth">
              <ChefJournalWidget
                insights={journalInsights}
                latestJourney={recentJourneys[0] ?? null}
              />
            </CollapsibleWidget>
          </section>
        )}

        {/* Hours */}
        {isWidgetEnabled('hours') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('hours') }}>
            <CollapsibleWidget widgetId="hours" title="Hours">
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
            </CollapsibleWidget>
          </section>
        )}

        {/* Todo List */}
        {isWidgetEnabled('todo_list') && (
          <section style={{ order: getWidgetOrder('todo_list') }}>
            <CollapsibleWidget widgetId="todo_list" title="To-Do List">
              <ChefTodoWidget initialTodos={todos} />
            </CollapsibleWidget>
          </section>
        )}

        {/* Activity */}
        {isWidgetEnabled('activity') && (
          <section className="space-y-3" style={{ order: getWidgetOrder('activity') }}>
            <CollapsibleWidget widgetId="activity" title="Activity">
              <div className="flex items-center justify-between mb-3">
                <Link
                  href="/activity"
                  className="text-xs text-brand-600 hover:text-brand-400 font-medium ml-auto"
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
            </CollapsibleWidget>
          </section>
        )}
      </MobileDashboardExpander>

      {/* AI Business Insights */}
      <BusinessInsightsPanel />
    </>
  )
}
