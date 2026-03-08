// Chef Dashboard — Complete Command Center
// Answers: "What should I do right now?"
// Sections: Today → Next Action → Week → Queue → Prep → Quality → Business
// Protected by layout via requireChef()

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getChefPreferences } from '@/lib/chef/actions'
import { DEFAULT_PREFERENCES, type DashboardWidgetId } from '@/lib/scheduling/types'

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
  type DashboardHoursCategoryEntry,
} from '@/lib/dashboard/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
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
import { CapacityWidget } from '@/components/dashboard/capacity-widget'
import { getCapacitySnapshot } from '@/lib/analytics/capacity-actions'
import {
  getCollaboratingOnEvents,
  getPendingCollaborationInvitations,
  getPendingRecipeShares,
} from '@/lib/collaboration/actions'
import { CollaborationInvitationCard, PendingRecipeShareCard } from '@/components/events/event-collaborators-panel'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Plus, ArrowRight, TrendingUp, TrendingDown, Minus,
  Calendar, Gift,
} from 'lucide-react'
import type { PriorityQueue } from '@/lib/queue/types'

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
    byDomain: { inquiry: 0, message: 0, quote: 0, event: 0, financial: 0, post_event: 0, client: 0, culinary: 0 },
    byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
    allCaughtUp: true,
  },
  computedAt: new Date().toISOString(),
}

const emptyInquiryStats = { new: 0, awaiting_client: 0, awaiting_chef: 0, quoted: 0, confirmed: 0, declined: 0, expired: 0 }
const emptyFinancials = { totalRevenueCents: 0, totalRefundsCents: 0, totalTipsCents: 0, netRevenueCents: 0, totalWithTipsCents: 0 }
const emptyWeekSchedule: Awaited<ReturnType<typeof getWeekSchedule>> = { weekStart: '', weekEnd: '', days: [], warnings: [] }
const emptyQuoteStats = { draft: 0, sent: 0, expiringSoon: 0, total: 0, expiringDetails: [] as { clientName: string; validUntil: string; amountCents: number }[] }
const emptyEventCounts = { thisMonth: 0, ytd: 0, completedThisMonth: 0, completedYtd: 0, upcomingThisMonth: 0, totalGuestsThisMonth: 0, totalGuestsYtd: 0 }
const emptyMonthRevenue = { currentMonthRevenueCents: 0, previousMonthRevenueCents: 0, currentMonthProfitCents: 0, changePercent: 0 }
const emptyExpenses = { totalCents: 0, businessCents: 0 }
const emptyRecipeDebt = { last7Days: 0, last30Days: 0, older: 0, total: 0, totalRecipes: 0 }

const emptyHoursSnapshot = {
  todayMinutes: 0,
  weekMinutes: 0,
  allTimeMinutes: 0,
  topActivity: null,
  recentEntries: [] as { id: string; minutes: number; loggedFor: string; category: null; note: string | null; createdAt: string }[],
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ============================================
// DASHBOARD PAGE
// ============================================

export default async function ChefDashboard() {
  const user = await requireChef()
  const currentMonthName = MONTH_NAMES[new Date().getMonth()]

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
    capacitySnapshot,
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
    safe('recentActivity', async () => (await getRecentClientActivity({ limit: 15, daysBack: 7 })).items, []),
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
    safe('capacitySnapshot', getCapacitySnapshot, { utilizationPercent: 0, weeklyHoursUsed: 0, weeklyHoursAvailable: 40, burnoutRisk: 'low' as const, canTakeMore: true, additionalEventsPerWeek: 0 }),
  ])

  const activeInquiryCount = inquiryStats.new + inquiryStats.awaiting_client + inquiryStats.awaiting_chef + inquiryStats.quoted
  const totalInquiryCount = Object.values(inquiryStats).reduce((sum, value) => sum + value, 0)
  const shouldShowOnboardingAccelerator = eventCounts.ytd === 0 && (clients.length <= 10 || totalInquiryCount <= 10)
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
  const getWidgetOrder = (widgetId: DashboardWidgetId) => widgetOrder.get(widgetId) ?? Number.MAX_SAFE_INTEGER

  return (
    <div className="flex flex-col gap-8">

      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-600 mt-1">Your command center - everything at a glance.</p>
        </div>
        <div className="flex gap-2">
          <DashboardQuickSettings initialWidgets={widgetPreferences} />
          <Link
            href="/queue"
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
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
      {/* PRIORITY BANNER — always visible, not hideable */}
      {/* ============================================ */}
      <section>
        {queue.nextAction ? (
          <Link href={queue.nextAction.href} className="block">
            <div className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:opacity-90 ${
              queue.nextAction.urgency === 'critical'
                ? 'bg-red-50 border-red-200 text-red-900'
                : queue.nextAction.urgency === 'high'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-brand-50 border-brand-200 text-brand-900'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0" aria-hidden="true">
                  {queue.nextAction.urgency === 'critical' ? '🔴' : queue.nextAction.urgency === 'high' ? '🟡' : '🟢'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{queue.nextAction.title}</p>
                  <p className="text-xs opacity-75 mt-0.5 truncate">
                    {queue.nextAction.context.primaryLabel}
                    {queue.nextAction.context.secondaryLabel ? ` · ${queue.nextAction.context.secondaryLabel}` : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium shrink-0 ml-4">Go →</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <span className="text-lg" aria-hidden="true">✅</span>
            <p className="text-sm font-medium text-green-800">All caught up — nothing urgent right now.</p>
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* SCHEDULING GAP BANNER                         */}
      {/* ============================================ */}
      {schedulingGaps.length > 0 && (
        <section>
          <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
            schedulingGaps.some((g: any) => g.severity === 'critical')
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div>
              <p className="text-sm font-semibold">
                {schedulingGaps.length} event{schedulingGaps.length !== 1 ? 's' : ''} missing prep blocks
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
                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 hover:bg-stone-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">{item.event?.occasion || 'Untitled Event'}</p>
                    <p className="text-xs text-stone-500">
                      {item.event?.event_date ? format(new Date(item.event.event_date), 'MMM d, yyyy') : 'Date TBD'}
                      {item.event?.client ? ` · ${item.event.client.full_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-brand-100 text-brand-800 font-medium capitalize">
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
      {/* SECTION 1: TODAY'S SCHEDULE                   */}
      {/* ============================================ */}
      {isWidgetEnabled('todays_schedule') && (
        <section style={{ order: getWidgetOrder('todays_schedule') }}>
          {todaysSchedule ? (
            <Card className="border-brand-200">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-brand-900">
                    Today: {todaysSchedule.event.occasion || 'Event'}
                  </CardTitle>
                  <Link
                    href={`/events/${todaysSchedule.event.id}/schedule`}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                  >
                    Full Schedule <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-stone-600">
                  {todaysSchedule.event.client?.full_name} &mdash; {todaysSchedule.event.guest_count} guests
                  {todaysSchedule.event.location_city && ` \u2014 ${todaysSchedule.event.location_city}`}
                </div>
                {todaysSchedule.dop.isCompressed && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                    <p className="text-sm font-medium text-amber-900">
                      Compressed timeline active
                    </p>
                  </div>
                )}
                <TimelineView timeline={todaysSchedule.timeline} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-stone-200 bg-stone-50">
              <CardContent className="py-8 text-center">
                <p className="text-stone-500 text-sm">No dinners on the schedule today. A quiet day to plan ahead.</p>
                {nextEvent && (
                  <Link href={`/events/${nextEvent.id}`} className="inline-block mt-3">
                    <p className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                      Next up: {nextEvent.occasion || 'Event'} &mdash; {format(new Date(nextEvent.eventDate + 'T12:00:00'), 'EEEE, MMM d')}
                      <span className="text-stone-500 font-normal ml-1">
                        ({nextEvent.clientName}, {nextEvent.guestCount} guests, {nextEvent.serveTime})
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
        <section style={{ order: getWidgetOrder('week_strip') }}>
          <WeekStrip schedule={weekSchedule} />
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 4: PRIORITY QUEUE                     */}
      {/* ============================================ */}
      {isWidgetEnabled('priority_queue') && (
        <section style={{ order: getWidgetOrder('priority_queue') }}>
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
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
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
      {/* SECTION 6: SERVICE QUALITY (AAR)              */}
      {/* ============================================ */}
      {isWidgetEnabled('service_quality') && aarStats && aarStats.totalReviews > 0 && (
        <section style={{ order: getWidgetOrder('service_quality') }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Service Quality</CardTitle>
                <Link href="/aar" className="text-sm text-brand-600 hover:text-brand-700">
                  All Reviews
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-stone-900">{aarStats.last5AvgCalm}/5</div>
                  <p className="text-sm text-stone-500">calm (last 5)</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-stone-900">{aarStats.last5AvgPrep}/5</div>
                  <p className="text-sm text-stone-500">prep (last 5)</p>
                </div>
              </div>
              {aarStats.totalReviews >= 5 && (
                <p className="text-sm mt-3 flex items-center gap-1.5">
                  {aarStats.trendDirection === 'improving' && (
                    <>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-600">Trending up - your dinners are getting calmer</span>
                    </>
                  )}
                  {aarStats.trendDirection === 'declining' && (
                    <>
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600">Trending down - review your recent prep patterns</span>
                    </>
                  )}
                  {aarStats.trendDirection === 'neutral' && (
                    <>
                      <Minus className="h-4 w-4 text-stone-500" />
                      <span className="text-stone-500">Holding steady across {aarStats.totalReviews} reviews</span>
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {aarStats.topForgottenItems.filter(i => i.count >= 2).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Frequently Forgotten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aarStats.topForgottenItems.filter(i => i.count >= 2).slice(0, 4).map(({ item, count }) => (
                    <div key={item} className="flex justify-between items-center">
                      <span className="text-sm text-stone-700 capitalize">{item}</span>
                      <span className="text-sm font-medium text-red-600">{count}x forgotten</span>
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
        <section className="space-y-3" style={{ order: getWidgetOrder('business_snapshot') }}>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Business Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Revenue — enhanced with MoM comparison */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Revenue</CardTitle>
                <Link href="/financials" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  Details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">
                {formatCurrency(financials.netRevenueCents)}
              </div>
              <p className="text-sm text-stone-500 mt-1">net revenue (all time)</p>
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
                {(monthRevenue.currentMonthRevenueCents > 0 || monthRevenue.previousMonthRevenueCents > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">
                      {currentMonthName}: {formatCurrency(monthRevenue.currentMonthRevenueCents)}
                    </span>
                    {monthRevenue.changePercent !== 0 && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${monthRevenue.changePercent > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {monthRevenue.changePercent > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {monthRevenue.changePercent > 0 ? '+' : ''}{monthRevenue.changePercent}%
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
                <Link href="/financials" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!revenueGoal.enabled ? (
                <>
                  <div className="text-lg font-semibold text-stone-900">Program Off</div>
                  <p className="text-sm text-stone-500 mt-1">
                    Enable revenue goals in Settings to get booking and calendar suggestions.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-stone-900">
                    {Math.max(0, revenueGoal.monthly.progressPercent)}%
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    projected toward {formatCurrency(revenueGoal.monthly.targetCents)} this month
                  </p>
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Projected</span>
                      <span className="text-stone-900 font-medium">{formatCurrency(revenueGoal.monthly.projectedCents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Gap</span>
                      <span className={revenueGoal.monthly.gapCents > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                        {formatCurrency(revenueGoal.monthly.gapCents)}
                      </span>
                    </div>
                    {revenueGoal.monthly.gapCents > 0 && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Dinners Needed</span>
                        <span className="text-stone-900 font-medium">{revenueGoal.dinnersNeededThisMonth}</span>
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
                <Link href="/financials" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  Details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${monthRevenue.currentMonthProfitCents >= 0 ? 'text-stone-900' : 'text-red-600'}`}>
                {formatCurrency(monthRevenue.currentMonthProfitCents)}
              </div>
              <p className="text-sm text-stone-500 mt-1">revenue minus expenses</p>
              {monthRevenue.currentMonthRevenueCents > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <span className="text-sm text-stone-600">
                    {monthRevenue.currentMonthRevenueCents > 0
                      ? `${Math.round((monthRevenue.currentMonthProfitCents / monthRevenue.currentMonthRevenueCents) * 100)}% margin`
                      : 'No revenue yet'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events — this month + YTD */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Events</CardTitle>
                <Link href="/events" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  <Calendar className="h-3.5 w-3.5" />
                  All Events <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{eventCounts.thisMonth}</div>
              <p className="text-sm text-stone-500 mt-1">
                this month
                {eventCounts.totalGuestsThisMonth > 0 && ` \u00B7 ${eventCounts.totalGuestsThisMonth} guests`}
              </p>
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
                <div className="flex gap-3 text-sm text-stone-600">
                  {eventCounts.upcomingThisMonth > 0 && (
                    <span>{eventCounts.upcomingThisMonth} upcoming</span>
                  )}
                  {eventCounts.completedThisMonth > 0 && (
                    <>
                      {eventCounts.upcomingThisMonth > 0 && <span className="text-stone-300">&middot;</span>}
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
                <Link href="/inquiries" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  Pipeline <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{activeInquiryCount}</div>
              <p className="text-sm text-stone-500 mt-1">active in pipeline</p>
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1">
                <div className="flex gap-3 text-sm text-stone-600">
                  {inquiryStats.new > 0 && <span>{inquiryStats.new} new</span>}
                  {inquiryStats.quoted > 0 && <span>{inquiryStats.quoted} quoted</span>}
                  {inquiryStats.awaiting_client > 0 && <span>{inquiryStats.awaiting_client} awaiting</span>}
                </div>
                {quoteStats.total > 0 && (
                  <div className="text-sm text-stone-500">
                    {quoteStats.sent} {quoteStats.sent === 1 ? 'quote' : 'quotes'} pending response
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clients */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Clients</CardTitle>
                <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">{clients.length}</div>
              <p className="text-sm text-stone-500 mt-1">total clients</p>
              {loyaltyApproaching.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <Link href="/loyalty" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    {loyaltyApproaching.length} near a reward
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses — this month */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Expenses ({currentMonthName})</CardTitle>
                <Link href="/expenses" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
                  Details <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-stone-900">
                {formatCurrency(monthExpenses.businessCents)}
              </div>
              <p className="text-sm text-stone-500 mt-1">business expenses</p>
              {monthExpenses.totalCents > monthExpenses.businessCents && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <span className="text-sm text-stone-600">
                    {formatCurrency(monthExpenses.totalCents)} total (incl. personal)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          </div>

          {/* Quote Performance Insights — full-width below the grid */}
          {quoteInsights && (
            <QuoteAcceptanceInsightsPanel data={quoteInsights} />
          )}
        </section>
      )}

      {/* ============================================ */}
      {/* SECTION 7.5: CHEF JOURNAL                    */}
      {/* ============================================ */}
      {isWidgetEnabled('career_growth') && (
        <section className="space-y-3" style={{ order: getWidgetOrder('career_growth') }}>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Career Growth</h2>
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
      {/* ============================================ */}
      {/* SECTION: CAPACITY PLANNING                   */}
      {/* ============================================ */}
      {isWidgetEnabled('capacity') && (
        <section style={{ order: getWidgetOrder('capacity') }}>
          <Card>
            <CardContent className="py-4">
              <CapacityWidget
                utilizationPercent={capacitySnapshot.utilizationPercent}
                weeklyHoursUsed={capacitySnapshot.weeklyHoursUsed}
                weeklyHoursAvailable={capacitySnapshot.weeklyHoursAvailable}
                burnoutRisk={capacitySnapshot.burnoutRisk}
                canTakeMore={capacitySnapshot.canTakeMore}
                additionalEventsPerWeek={capacitySnapshot.additionalEventsPerWeek}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {isWidgetEnabled('activity') && (
        <section className="space-y-3" style={{ order: getWidgetOrder('activity') }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Activity</h2>
            <Link href="/activity" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-stone-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">My Recent Activity</h3>
              <div className="max-h-64 overflow-y-auto">
                <ChefActivityFeed entries={chefActivity} compact />
              </div>
            </div>
            <LivePresencePanel tenantId={user.tenantId!} initialClients={activeClients} />
            <ActivityFeed events={recentActivity} />
          </div>
        </section>
      )}

    </div>
  )
}
