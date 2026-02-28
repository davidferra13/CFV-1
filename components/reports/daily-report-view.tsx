'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { generateDailyReport, getDailyReport } from '@/lib/reports/daily-report-actions'
import type { DailyReport, DailyReportSummary } from '@/lib/reports/types'
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Target,
  Clock,
  Flame,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Gift,
  UserMinus,
  BarChart3,
} from 'lucide-react'

type Props = {
  report: DailyReport
  history: DailyReportSummary[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: string | number
  icon: typeof DollarSign
  variant?: 'default' | 'success' | 'warning' | 'error'
}) {
  const colors = {
    default: 'bg-stone-50 border-stone-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
  }
  const iconColors = {
    default: 'text-stone-500',
    success: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[variant]}`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-stone-900">{value}</p>
    </div>
  )
}

export function DailyReportView({ report: initialReport, history }: Props) {
  const [report, setReport] = useState(initialReport)
  const [selectedDate, setSelectedDate] = useState(report.reportDate)
  const [isPending, startTransition] = useTransition()

  const content = report.content

  function loadDate(date: string) {
    setSelectedDate(date)
    startTransition(async () => {
      try {
        let r = await getDailyReport(date)
        if (!r) {
          r = await generateDailyReport(date)
        }
        setReport(r)
      } catch (err) {
        toast.error('Failed to load report')
      }
    })
  }

  function navigateDay(offset: number) {
    const d = new Date(selectedDate + 'T00:00:00Z')
    d.setDate(d.getDate() + offset)
    loadDate(d.toISOString().split('T')[0])
  }

  function regenerate() {
    startTransition(async () => {
      try {
        const r = await generateDailyReport(selectedDate)
        setReport(r)
      } catch (err) {
        toast.error('Failed to regenerate report')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50"
            disabled={isPending}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-stone-800">{formatDate(selectedDate)}</h2>
          <button
            onClick={() => navigateDay(1)}
            className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50"
            disabled={isPending || selectedDate >= new Date().toISOString().split('T')[0]}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={regenerate}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {isPending && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-stone-400" />
          <span className="ml-2 text-stone-500">Loading report...</span>
        </div>
      )}

      {!isPending && (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Today's Revenue"
              value={formatCents(content.paymentsReceivedTodayCents)}
              icon={DollarSign}
              variant={content.paymentsReceivedTodayCents > 0 ? 'success' : 'default'}
            />
            <MetricCard
              label="MTD Revenue"
              value={formatCents(content.monthRevenueToDateCents)}
              icon={BarChart3}
            />
            <MetricCard
              label="vs Last Month"
              value={`${content.monthOverMonthChangePercent > 0 ? '+' : ''}${content.monthOverMonthChangePercent}%`}
              icon={content.monthOverMonthChangePercent >= 0 ? TrendingUp : TrendingDown}
              variant={content.monthOverMonthChangePercent >= 0 ? 'success' : 'warning'}
            />
            <MetricCard
              label="Outstanding"
              value={formatCents(content.outstandingBalanceCents)}
              icon={AlertTriangle}
              variant={content.outstandingBalanceCents > 0 ? 'warning' : 'default'}
            />
          </div>

          {/* Today's Schedule */}
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              <CalendarDays className="h-4 w-4" /> Today&apos;s Schedule
            </h3>
            {content.eventsToday.length > 0 ? (
              <div className="space-y-2">
                {content.eventsToday.map((event) => (
                  <div
                    key={event.eventId}
                    className="flex items-center gap-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-amber-800">
                      {event.serveTime || 'TBD'}
                    </span>
                    <span className="text-sm text-stone-700">
                      <strong>{event.occasion || 'Event'}</strong> — {event.clientName}
                      {event.guestCount ? ` (${event.guestCount} guests)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-stone-400">No events scheduled today</p>
            )}
            <p className="mt-2 text-xs text-stone-400">
              {content.upcomingEventsNext7d} event{content.upcomingEventsNext7d !== 1 ? 's' : ''} in
              the next 7 days
            </p>
          </section>

          {/* Pipeline */}
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              <Target className="h-4 w-4" /> Pipeline
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-stone-900">{content.newInquiriesToday}</p>
                <p className="text-xs text-stone-500">New Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {content.inquiryStats['new'] || 0}
                </p>
                <p className="text-xs text-stone-500">Unread</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {content.inquiryStats['awaiting_chef'] || 0}
                </p>
                <p className="text-xs text-stone-500">Awaiting Response</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{content.quotesExpiringSoon}</p>
                <p className="text-xs text-stone-500">Quotes Expiring</p>
              </div>
            </div>
            {content.staleFollowUps > 0 && (
              <p className="mt-3 text-sm text-amber-700">
                {content.staleFollowUps} stale follow-up{content.staleFollowUps !== 1 ? 's' : ''}{' '}
                need attention
              </p>
            )}
            {content.pipelineForecastCents > 0 && (
              <p className="mt-1 text-xs text-stone-400">
                Pipeline forecast: {formatCents(content.pipelineForecastCents)}
              </p>
            )}
          </section>

          {/* Operations */}
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              <Clock className="h-4 w-4" /> Operations
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {content.avgResponseTimeHours ?? '—'}h
                </p>
                <p className="text-xs text-stone-500">Avg Response Time</p>
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${content.overdueResponses > 0 ? 'text-red-600' : 'text-stone-900'}`}
                >
                  {content.overdueResponses}
                </p>
                <p className="text-xs text-stone-500">Overdue (&gt;24h)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">
                  {content.foodCostAvgPercent !== null ? `${content.foodCostAvgPercent}%` : '—'}
                </p>
                <p className="text-xs text-stone-500">
                  Food Cost{' '}
                  {content.foodCostTrending !== 'stable' &&
                    `(${content.foodCostTrending === 'rising' ? '↑' : '↓'})`}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{content.closureStreak}</p>
                <p className="text-xs text-stone-500">
                  Closure Streak
                  {content.longestStreak > content.closureStreak
                    ? ` (best: ${content.longestStreak})`
                    : ''}
                </p>
              </div>
            </div>
            {content.openClosureTasks > 0 && (
              <p className="mt-3 text-sm text-amber-700">
                {content.openClosureTasks} event{content.openClosureTasks !== 1 ? 's' : ''} with
                open closure tasks
              </p>
            )}
          </section>

          {/* Client Activity */}
          {(content.highIntentVisits.length > 0 || content.clientLoginsYesterday > 0) && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                <Users className="h-4 w-4" /> Client Activity (Yesterday)
              </h3>
              <p className="text-sm text-stone-600">
                {content.clientLoginsYesterday} client login
                {content.clientLoginsYesterday !== 1 ? 's' : ''}
              </p>
              {content.highIntentVisits.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    <Flame className="mr-1 inline h-3 w-3" />
                    High-intent signals
                  </p>
                  {content.highIntentVisits.map((v, i) => (
                    <p key={i} className="text-sm text-stone-700">
                      <strong>{v.clientName}</strong> —{' '}
                      {v.eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Schedule Conflicts */}
          {content.scheduleConflicts.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Schedule Conflicts
              </h3>
              {content.scheduleConflicts.map((c, i) => (
                <p key={i} className="text-sm text-amber-800">
                  {new Date(c.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  — {c.eventCount} events booked
                </p>
              ))}
            </section>
          )}

          {/* Milestones */}
          {content.upcomingMilestones.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                <Gift className="h-4 w-4" /> Upcoming Milestones
              </h3>
              {content.upcomingMilestones.map((m, i) => (
                <p key={i} className="text-sm text-stone-700">
                  <strong>{m.clientName}</strong> — {m.label}
                </p>
              ))}
            </section>
          )}

          {/* Dormant Clients */}
          {content.dormantClients.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                <UserMinus className="h-4 w-4" /> Re-engage These Clients
              </h3>
              {content.dormantClients.map((c, i) => (
                <p key={i} className="text-sm text-stone-700">
                  <strong>{c.clientName}</strong> — {c.daysSinceLastEvent} days since last event
                </p>
              ))}
            </section>
          )}

          {/* Next Best Actions */}
          {content.nextBestActions.length > 0 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                <Target className="h-4 w-4" /> Action Items
              </h3>
              {content.nextBestActions.map((a, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <span
                    className={`mt-1 inline-block h-2 w-2 rounded-full ${
                      a.urgency === 'critical'
                        ? 'bg-red-500'
                        : a.urgency === 'high'
                          ? 'bg-amber-500'
                          : 'bg-stone-300'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-900">{a.label}</p>
                    <p className="text-xs text-stone-500">
                      {a.clientName} — {a.description}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* History browser */}
          {history.length > 1 && (
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Past Reports
              </h3>
              <div className="space-y-1">
                {history.slice(0, 14).map((h) => (
                  <button
                    key={h.reportDate}
                    onClick={() => loadDate(h.reportDate)}
                    disabled={isPending}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-stone-50 ${
                      selectedDate === h.reportDate ? 'bg-stone-100 font-medium' : ''
                    }`}
                  >
                    <span>
                      {new Date(h.reportDate + 'T00:00:00Z').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-stone-400">
                      {h.eventsCount} events · {formatCents(h.revenueCents)} · {h.newInquiries}{' '}
                      inquiries
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
