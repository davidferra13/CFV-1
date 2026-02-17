// Chef Dashboard — Complete Command Center
// Answers: "What needs my attention right now?"
// Sections: Today → Week → Alerts → Prep → Outreach → Work Surface → Closure → Quality → Business
// Protected by layout via requireChef()

import { requireChef } from '@/lib/auth/get-user'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getEventsNeedingClosure } from '@/lib/events/actions'
import { getAARStats } from '@/lib/aar/actions'
import { getTodaysSchedule, getAllPrepPrompts, getWeekSchedule } from '@/lib/scheduling/actions'
import { getMilestoneOutreachSuggestions } from '@/lib/clients/milestones'
import { getClientsApproachingRewards } from '@/lib/loyalty/actions'
import {
  getOutstandingPayments,
  getDashboardQuoteStats,
  getDashboardEventCounts,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
  getNextUpcomingEvent,
} from '@/lib/dashboard/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { DashboardWorkSurfaceView } from '@/components/dashboard/work-surface'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { TimelineView } from '@/components/scheduling/timeline-view'
import { PrepPromptsView } from '@/components/scheduling/prep-prompts-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Plus, ArrowRight, TrendingUp, TrendingDown, Minus,
  AlertCircle, DollarSign, FileText, Calendar, Gift,
} from 'lucide-react'

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

const emptyWorkSurface: Awaited<ReturnType<typeof getDashboardWorkSurface>> = {
  blocked: [], preparable: [], optionalEarly: [], fragile: [], byEvent: [],
  summary: { totalActiveEvents: 0, totalPreparableActions: 0, totalBlockedActions: 0, totalFragileActions: 0 },
}

const emptyInquiryStats = { new: 0, awaiting_client: 0, awaiting_chef: 0, quoted: 0, confirmed: 0, declined: 0, expired: 0 }
const emptyFinancials = { totalRevenueCents: 0, totalRefundsCents: 0, totalTipsCents: 0, netRevenueCents: 0, totalWithTipsCents: 0 }
const emptyWeekSchedule: Awaited<ReturnType<typeof getWeekSchedule>> = { weekStart: '', weekEnd: '', days: [], warnings: [] }
const emptyOutstandingPayments = { events: [] as { eventId: string; occasion: string | null; eventDate: string; clientName: string; outstandingCents: number }[], totalOutstandingCents: 0 }
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
    // Existing streams
    workSurface,
    clients,
    financials,
    inquiryStats,
    eventsNeedingClosure,
    aarStats,
    todaysSchedule,
    prepPrompts,
    milestoneOutreach,
    // New streams
    weekSchedule,
    outstandingPayments,
    quoteStats,
    eventCounts,
    monthRevenue,
    monthExpenses,
    loyaltyApproaching,
    nextEvent,
  ] = await Promise.all([
    safe('workSurface', getDashboardWorkSurface, emptyWorkSurface),
    safe('clients', getClients, []),
    safe('financials', getTenantFinancialSummary, emptyFinancials),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats),
    safe('eventsNeedingClosure', getEventsNeedingClosure, []),
    safe('aarStats', getAARStats, null),
    safe('todaysSchedule', getTodaysSchedule, null),
    safe('prepPrompts', getAllPrepPrompts, []),
    safe('milestoneOutreach', getMilestoneOutreachSuggestions, []),
    safe('weekSchedule', () => getWeekSchedule(0), emptyWeekSchedule),
    safe('outstandingPayments', getOutstandingPayments, emptyOutstandingPayments),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats),
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses),
    safe('loyaltyApproaching', getClientsApproachingRewards, []),
    safe('nextEvent', getNextUpcomingEvent, null),
  ])

  const needsResponseCount = inquiryStats.new + inquiryStats.awaiting_chef
  const activeInquiryCount = inquiryStats.new + inquiryStats.awaiting_client + inquiryStats.awaiting_chef + inquiryStats.quoted
  const hasAttentionItems = needsResponseCount > 0 || outstandingPayments.totalOutstandingCents > 0 || quoteStats.total > 0
  const hasOutreachItems = milestoneOutreach.length > 0 || loyaltyApproaching.length > 0

  return (
    <div className="space-y-8">

      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-600 mt-1">Your command center — everything at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
          >
            Weekly View
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
      {/* SECTION 2: WEEK AT A GLANCE                   */}
      {/* ============================================ */}
      {weekSchedule.days.length > 0 && (
        <WeekStrip schedule={weekSchedule} />
      )}

      {/* ============================================ */}
      {/* SECTION 3: ATTENTION NEEDED                   */}
      {/* ============================================ */}
      {hasAttentionItems && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Needs Attention</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Inquiries Needing Response */}
            {needsResponseCount > 0 && (
              <Link href="/inquiries" className="block">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors h-full">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900">
                        {needsResponseCount} {needsResponseCount === 1 ? 'inquiry needs' : 'inquiries need'} your response
                      </p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        {inquiryStats.new > 0 && `${inquiryStats.new} new`}
                        {inquiryStats.new > 0 && inquiryStats.awaiting_chef > 0 && ' · '}
                        {inquiryStats.awaiting_chef > 0 && `${inquiryStats.awaiting_chef} awaiting your reply`}
                        {activeInquiryCount > needsResponseCount && ` · ${activeInquiryCount} total in pipeline`}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Outstanding Payments — with event detail */}
            {outstandingPayments.totalOutstandingCents > 0 && (
              <Link href="/financials" className="block">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 hover:bg-rose-100 transition-colors h-full">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-rose-900">
                        {formatCurrency(outstandingPayments.totalOutstandingCents)} outstanding
                      </p>
                      <div className="text-sm text-rose-700 mt-0.5 space-y-0.5">
                        {outstandingPayments.events.slice(0, 3).map(evt => (
                          <p key={evt.eventId}>
                            {evt.clientName}{evt.occasion ? ` — ${evt.occasion}` : ''}: {formatCurrency(evt.outstandingCents)}
                          </p>
                        ))}
                        {outstandingPayments.events.length > 3 && (
                          <p className="text-rose-500">+{outstandingPayments.events.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Pending Quotes — with expiring client names */}
            {quoteStats.total > 0 && (
              <Link href="/quotes" className="block">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors h-full">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">
                        {quoteStats.sent} {quoteStats.sent === 1 ? 'quote' : 'quotes'} awaiting response
                      </p>
                      <div className="text-sm text-blue-700 mt-0.5">
                        {quoteStats.expiringDetails.length > 0 ? (
                          <div className="space-y-0.5">
                            {quoteStats.expiringDetails.slice(0, 2).map((q, i) => (
                              <p key={i}>{q.clientName} — {formatCurrency(q.amountCents)} expiring soon</p>
                            ))}
                          </div>
                        ) : quoteStats.draft > 0 ? (
                          <p>{quoteStats.draft} still in draft</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 4: PREP PROMPTS                       */}
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
      {/* SECTION 5: OUTREACH OPPORTUNITIES             */}
      {/* ============================================ */}
      {hasOutreachItems && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outreach Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Milestone outreach */}
              {milestoneOutreach.slice(0, 5).map((item, idx) => (
                <div key={`milestone-${idx}`} className="flex items-start justify-between py-2 border-b border-stone-100 last:border-0">
                  <div>
                    <p className="text-sm text-stone-900">{item.suggestion}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.daysUntil === 0 ? 'Today' : `In ${item.daysUntil} days`}
                    </p>
                  </div>
                  <Link
                    href={`/clients/${item.clientId}`}
                    className="text-xs text-brand-600 hover:text-brand-700 whitespace-nowrap ml-4"
                  >
                    View Client
                  </Link>
                </div>
              ))}

              {/* Loyalty approaching rewards */}
              {loyaltyApproaching.map((client, idx) => (
                <div key={`loyalty-${idx}`} className="flex items-start justify-between py-2 border-b border-stone-100 last:border-0">
                  <div className="flex items-start gap-2">
                    <Gift className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-stone-900">
                        {client.clientName} is close to earning a reward
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {client.approachingRewards[0]?.pointsNeeded} points away from {client.approachingRewards[0]?.rewardName}
                        {client.approachingRewards[0]?.guestsNeeded
                          ? ` (${client.approachingRewards[0].guestsNeeded} more guests)`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/clients/${client.clientId}`}
                    className="text-xs text-brand-600 hover:text-brand-700 whitespace-nowrap ml-4"
                  >
                    View Client
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* SECTION 6: WORK SURFACE (core engine)         */}
      {/* ============================================ */}
      <DashboardWorkSurfaceView surface={workSurface} />

      {/* ============================================ */}
      {/* SECTION 7: EVENTS NEEDING CLOSURE             */}
      {/* ============================================ */}
      {eventsNeedingClosure.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Events Needing Closure</CardTitle>
              <span className="text-sm text-stone-500">{eventsNeedingClosure.length} pending</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventsNeedingClosure.map((event) => {
                const pendingItems: string[] = [
                  !event.aar_filed ? 'AAR' : '',
                  !event.reset_complete ? 'Reset' : '',
                  !event.follow_up_sent ? 'Follow-up' : '',
                  !event.financially_closed ? 'Financial' : '',
                ].filter(Boolean)

                return (
                  <Link key={event.id} href={`/events/${event.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors">
                      <div>
                        <span className="font-medium text-stone-900">
                          {event.occasion || 'Untitled Event'}
                        </span>
                        <span className="text-sm text-stone-500 ml-2">
                          {event.client?.full_name}
                        </span>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {pendingItems.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-red-100 text-red-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* SECTION 8: SERVICE QUALITY (AAR)              */}
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
                      <span className="text-green-600">Trending up — your dinners are getting calmer</span>
                    </>
                  )}
                  {aarStats.trendDirection === 'declining' && (
                    <>
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600">Trending down — review your recent prep patterns</span>
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
      {/* SECTION 9: BUSINESS SNAPSHOT                  */}
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

    </div>
  )
}
