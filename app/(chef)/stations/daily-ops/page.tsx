// Daily Ops Command Center - The ONE page the chef opens every morning.
// Shows full kitchen state: stations, tasks, orders, alerts - all at a glance.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getDailyOpsData } from '@/lib/stations/daily-ops-actions'
import type { StationSnapshot, AlertItem } from '@/lib/stations/daily-ops-actions'
import { DailyOpsActionsBar } from '@/components/stations/daily-ops-actions-bar'
import { ShiftNotesSection } from '@/components/briefing/shift-notes-section'
import { PrepTimerForm } from '@/components/briefing/prep-timer-form'
import { getShiftNotes } from '@/lib/shifts/actions'
import { getActivePrepTimers } from '@/lib/prep/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Daily Ops | ChefFlow' }

// ============================================
// HELPERS
// ============================================

function getShiftLabel(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

function getShiftEmoji(): string {
  const hour = new Date().getHours()
  if (hour < 12) return ''
  if (hour < 17) return ''
  return ''
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function parBadgeVariant(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 80) return 'success'
  if (percent >= 50) return 'warning'
  return 'error'
}

function alertBadgeVariant(type: AlertItem['type']): 'error' | 'warning' | 'info' {
  if (type === '86d') return 'error'
  if (type === 'expiring') return 'warning'
  return 'info'
}

function alertLabel(type: AlertItem['type']): string {
  if (type === '86d') return "86'd"
  if (type === 'expiring') return 'Expiring'
  return 'Low Stock'
}

// ============================================
// STATION CARD
// ============================================

function StationCard({ station }: { station: StationSnapshot }) {
  return (
    <Link href={`/stations/${station.id}/clipboard`}>
      <Card interactive className="h-full">
        <CardContent className="pt-5 pb-5 space-y-3">
          {/* Station name */}
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-stone-100 text-base">{station.name}</h3>
            {station.eightySixCount > 0 && (
              <Badge variant="error">{station.eightySixCount} 86'd</Badge>
            )}
          </div>

          {/* Stock at par */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-stone-400">Stock at par</span>
              <Badge variant={parBadgeVariant(station.parPercent)} className="text-xxs">
                {station.parPercent}%
              </Badge>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  station.parPercent >= 80
                    ? 'bg-emerald-500'
                    : station.parPercent >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${station.parPercent}%` }}
              />
            </div>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {station.checkedInStaff ? (
                <span className="text-emerald-400">{station.checkedInStaff}</span>
              ) : (
                <span className="text-stone-600">No one checked in</span>
              )}
            </span>
            <span>{station.lastUpdated ? formatTimeAgo(station.lastUpdated) : 'No entries'}</span>
          </div>

          {/* Component count */}
          <div className="text-xs text-stone-600">
            {station.totalComponents} component{station.totalComponents !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ============================================
// PAGE
// ============================================

export default async function DailyOpsPage() {
  await requireChef()
  const today = new Date().toISOString().split('T')[0]
  const [data, shiftNotes, activePrepTimers] = await Promise.all([
    getDailyOpsData(),
    getShiftNotes(today),
    getActivePrepTimers(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div>
        <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
          <Link href="/stations" className="hover:text-stone-300 transition-colors">
            Stations
          </Link>
          <span className="text-stone-600">/</span>
          <span className="text-stone-300">Daily Ops</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">Daily Ops Command Center</h1>
            <p className="mt-1 text-sm text-stone-400">
              {formatDate()} &middot; {getShiftLabel()} shift
            </p>
          </div>
          <div className="text-sm text-stone-500">
            {getShiftEmoji()} {getShiftLabel()}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* QUICK ACTION BAR */}
      {/* ============================================ */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <DailyOpsActionsBar openingTemplateId={data.openingTemplateId} />
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* ALL STATIONS AT A GLANCE */}
      {/* ============================================ */}
      <section>
        <h2 className="text-lg font-semibold text-stone-100 mb-4">All Stations</h2>
        {data.stations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-stone-500 text-sm">
                No stations set up yet.{' '}
                <Link href="/stations" className="text-brand-400 hover:text-brand-300 underline">
                  Create your first station
                </Link>{' '}
                to start tracking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.stations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        )}
      </section>

      {/* ============================================ */}
      {/* TODAY'S TASKS + PENDING ORDERS (side by side) */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Tasks</CardTitle>
              <Link
                href="/tasks"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tasks.total === 0 ? (
              <p className="text-sm text-stone-500">No tasks scheduled for today.</p>
            ) : (
              <>
                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-stone-300">
                    <span className="font-semibold text-stone-100">{data.tasks.completed}</span> /{' '}
                    {data.tasks.total} done
                  </span>
                  <Badge
                    variant={
                      data.tasks.completionPercent >= 80
                        ? 'success'
                        : data.tasks.completionPercent >= 40
                          ? 'warning'
                          : 'error'
                    }
                  >
                    {data.tasks.completionPercent}%
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.tasks.completionPercent >= 80
                        ? 'bg-emerald-500'
                        : data.tasks.completionPercent >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${data.tasks.completionPercent}%` }}
                  />
                </div>

                {/* Breakdown */}
                <div className="flex gap-4 text-xs text-stone-500">
                  <span>{data.tasks.pending} pending</span>
                  <span>{data.tasks.inProgress} in progress</span>
                  <span>{data.tasks.completed} completed</span>
                </div>

                {/* Overdue tasks */}
                {data.tasks.overdueTasks.length > 0 && (
                  <div className="border-t border-stone-800 pt-3 space-y-2">
                    <p className="text-xs font-medium text-red-400 uppercase tracking-wide">
                      Overdue ({data.tasks.overdueTasks.length})
                    </p>
                    {data.tasks.overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-stone-200">{task.title}</p>
                          {task.assignedTo && (
                            <p className="text-xs text-stone-500">{task.assignedTo}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="error" className="text-xxs">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-red-400">
                            Due{' '}
                            {task.dueTime
                              ? new Date(`2000-01-01T${task.dueTime}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Orders</CardTitle>
              <Link
                href="/stations/orders"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                View full sheet
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.orders.totalPending === 0 ? (
              <p className="text-sm text-stone-500">No pending orders. All stations stocked.</p>
            ) : (
              <>
                <p className="text-sm text-stone-300">
                  <span className="font-semibold text-stone-100">{data.orders.totalPending}</span>{' '}
                  item{data.orders.totalPending !== 1 ? 's' : ''} need ordering
                </p>

                {/* Top 5 items */}
                <div className="space-y-2">
                  {data.orders.topItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-stone-800/50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-stone-200">{item.componentName}</p>
                        <p className="text-xs text-stone-500">{item.stationName}</p>
                      </div>
                      <span className="text-sm font-medium text-amber-400">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>

                {data.orders.totalPending > 5 && (
                  <Link
                    href="/stations/orders"
                    className="block text-sm text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    + {data.orders.totalPending - 5} more items...
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* SHIFT HANDOFF NOTES (Phase 2) */}
      {/* ============================================ */}
      <ShiftNotesSection
        todayNotes={shiftNotes.todayNotes}
        pinnedNotes={shiftNotes.pinnedNotes}
        yesterdayClosingNotes={shiftNotes.yesterdayClosingNotes}
        compact
      />

      {/* ============================================ */}
      {/* ACTIVE PREP TIMERS (Phase 5) */}
      {/* ============================================ */}
      {activePrepTimers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-4">
            Active Prep Timers{' '}
            <Badge variant="info" className="ml-1">
              {activePrepTimers.length}
            </Badge>
          </h2>
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              {activePrepTimers.map((timer) => {
                const endTime = new Date(timer.end_at)
                const now = new Date()
                const diffMs = endTime.getTime() - now.getTime()
                const isReady = diffMs <= 0
                const isApproaching = diffMs > 0 && diffMs <= 30 * 60 * 1000
                const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
                const minutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)))

                return (
                  <div
                    key={timer.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      isReady
                        ? 'bg-emerald-950/30 border border-emerald-900/40'
                        : isApproaching
                          ? 'bg-amber-950/30 border border-amber-900/40'
                          : 'bg-stone-800/50 border border-stone-700'
                    }`}
                  >
                    <div>
                      <p className="text-sm text-stone-200">{timer.title}</p>
                      <p className="text-xs text-stone-500">
                        {timer.station?.name ?? ''}
                        {timer.station?.name && timer.event?.title ? ' / ' : ''}
                        {timer.event?.title ?? ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${isReady ? 'text-emerald-400' : isApproaching ? 'text-amber-400' : 'text-stone-300'}`}
                      >
                        {isReady ? 'Ready now' : `${hours}h ${minutes}m`}
                      </p>
                      {isReady && (
                        <Badge variant="success" className="text-xxs">
                          Done
                        </Badge>
                      )}
                      {isApproaching && !isReady && (
                        <Badge variant="warning" className="text-xxs">
                          Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>
      )}
      <PrepTimerForm />

      {/* ============================================ */}
      {/* ALERTS */}
      {/* ============================================ */}
      {data.alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-100 mb-4">
            Alerts{' '}
            <Badge variant="error" className="ml-2">
              {data.alerts.length}
            </Badge>
          </h2>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {data.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      alert.type === '86d'
                        ? 'bg-red-950/30 border border-red-900/40'
                        : alert.type === 'expiring'
                          ? 'bg-amber-950/30 border border-amber-900/40'
                          : 'bg-sky-950/20 border border-sky-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={alertBadgeVariant(alert.type)} className="text-xxs">
                        {alertLabel(alert.type)}
                      </Badge>
                      <div>
                        <p className="text-sm text-stone-200">{alert.componentName}</p>
                        <p className="text-xs text-stone-500">{alert.stationName}</p>
                      </div>
                    </div>
                    <p className="text-xs text-stone-400 text-right max-w-[200px]">
                      {alert.detail}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* No alerts - all clear */}
      {data.alerts.length === 0 && data.stations.length > 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-emerald-400 font-medium">All clear - no alerts today</p>
            <p className="text-sm text-stone-500 mt-1">
              No 86'd items, no expirations, and all stock levels are healthy.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
