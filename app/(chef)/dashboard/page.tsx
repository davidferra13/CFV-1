// Chef Dashboard — Complete Command Center
// Answers: "What should I do right now?"
// Sections: Today → Next Action → Week → Queue → Prep → Quality → Business
// Protected by layout via requireChef()

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'

export const metadata: Metadata = { title: 'Dashboard - ChefFlow' }
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getAARStats } from '@/lib/aar/actions'
import { getTodaysSchedule, getAllPrepPrompts, getWeekSchedule } from '@/lib/scheduling/actions'
import { getClientsApproachingRewards } from '@/lib/loyalty/actions'
import {
  getDashboardQuoteStats,
  getDashboardEventCounts,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
  getNextUpcomingEvent,
} from '@/lib/dashboard/actions'
import { getActiveClients, getRecentActivity } from '@/lib/activity/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { TimelineView } from '@/components/scheduling/timeline-view'
import { PrepPromptsView } from '@/components/scheduling/prep-prompts-view'
import { NextActionCard } from '@/components/queue/next-action'
import { QueueList } from '@/components/queue/queue-list'
import { QueueSummaryBar } from '@/components/queue/queue-summary'
import { QueueEmpty } from '@/components/queue/queue-empty'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActiveClientsCard } from '@/components/dashboard/active-clients-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ============================================
// DASHBOARD PAGE
// ============================================

export default async function ChefDashboard() {
  const user = await requireChef()
  const currentMonthName = MONTH_NAMES[new Date().getMonth()]

  // All data fetches in parallel — each wrapped in safe() for graceful degradation
  const [
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
    loyaltyApproaching,
    nextEvent,
    activeClients,
    recentActivity,
  ] = await Promise.all([
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
    safe('loyaltyApproaching', getClientsApproachingRewards, []),
    safe('nextEvent', getNextUpcomingEvent, null),
    safe('activeClients', () => getActiveClients(15), []),
    safe('recentActivity', () => getRecentActivity(15), []),
  ])

  const activeInquiryCount = inquiryStats.new + inquiryStats.awaiting_client + inquiryStats.awaiting_chef + inquiryStats.quoted

  return (
    <div className="space-y-8">

      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-600 mt-1">Your command center - everything at a glance.</p>
        </div>
        <div className="flex gap-2">
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
      {/* SECTION 1: TODAY'S SCHEDULE                   */}
      {/* ============================================ */}
      {todaysSchedule && (
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
      )}

      {!todaysSchedule && (
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

      {/* ============================================ */}
      {/* SECTION 2: NEXT ACTION (hero card)           */}
      {/* ============================================ */}
      {queue.nextAction && (
        <NextActionCard item={queue.nextAction} />
      )}

      {/* ============================================ */}
      {/* SECTION 3: WEEK AT A GLANCE                   */}
      {/* ============================================ */}
      {weekSchedule.days.length > 0 && (
        <WeekStrip schedule={weekSchedule} />
      )}

      {/* ============================================ */}
      {/* SECTION 4: PRIORITY QUEUE                     */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* SECTION 5: PREP PROMPTS                       */}
      {/* ============================================ */}
      {prepPrompts.length > 0 && (
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
      )}

      {/* ============================================ */}
      {/* SECTION 6: SERVICE QUALITY (AAR)              */}
      {/* ============================================ */}
      {aarStats && aarStats.totalReviews > 0 && (
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
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Trending up - your dinners are getting calmer</span>
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
      )}

      {/* ============================================ */}
      {/* SECTION 7: BUSINESS SNAPSHOT                  */}
      {/* ============================================ */}
      <div className="space-y-3">
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
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${monthRevenue.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      </div>

      {/* ============================================ */}
      {/* SECTION 8: CLIENT ACTIVITY                   */}
      {/* ============================================ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Client Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActiveClientsCard clients={activeClients} />
          <ActivityFeed events={recentActivity} />
        </div>
      </div>

    </div>
  )
}
