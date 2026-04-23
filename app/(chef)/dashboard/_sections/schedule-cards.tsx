// Dashboard Schedule Cards - renders stat/list cards instead of accordions
// Data fetching is identical to schedule-section.tsx

import {
  getTodaysScheduleEnriched,
  getWeekSchedule,
} from '@/lib/scheduling/actions'
import { getNextUpcomingEvent } from '@/lib/dashboard/actions'
import { getDOPTaskDigest, type DOPTaskDigest } from '@/lib/scheduling/task-digest'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { getWeatherForEvents, type InlineWeather } from '@/lib/weather/open-meteo'
import { createServerClient } from '@/lib/db/server'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { format } from 'date-fns'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/ScheduleCards] ${label} failed:`, err)
    return fallback
  }
}

const emptyWeekSchedule: Awaited<ReturnType<typeof getWeekSchedule>> = {
  weekStart: '',
  weekEnd: '',
  days: [],
  warnings: [],
}
const emptyDOPDigest: DOPTaskDigest = {
  tasks: [],
  overdueCount: 0,
  dueTodayCount: 0,
  upcomingCount: 0,
  totalIncomplete: 0,
}

export async function ScheduleCards() {
  const [weekSchedule, nextEvent, dopTaskDigest] = await Promise.all([
    safe('weekSchedule', () => getWeekSchedule(0), emptyWeekSchedule),
    safe('nextEvent', getNextUpcomingEvent, null),
    safe('dopTaskDigest', getDOPTaskDigest, emptyDOPDigest),
  ])

  // Weather fetch
  const weatherByEventId = await safe<Record<string, InlineWeather>>(
    'weather',
    async () => {
      const eventIds = new Set<string>()
      for (const task of dopTaskDigest.tasks) eventIds.add(task.eventId)
      if (eventIds.size === 0) return {}
      const db: any = createServerClient()
      const { data: eventCoords } = await db
        .from('events')
        .select('id, event_date, location_lat, location_lng')
        .in('id', Array.from(eventIds))
      if (!eventCoords || eventCoords.length === 0) return {}
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

  const todaysSchedule = await safe(
    'todaysScheduleEnriched',
    () => getTodaysScheduleEnriched(weatherByEventId),
    null
  )
  const todaysReadiness =
    todaysSchedule?.event?.id
      ? await safe(
          'todaysServiceReadiness',
          () => loadEventServiceSimulationPanelState(todaysSchedule.event.id),
          null
        )
      : null

  // Build list items for today's schedule
  const scheduleItems: ListCardItem[] = []
  if (todaysSchedule) {
    const e = todaysSchedule.event
    const weather = weatherByEventId[e.id]
    scheduleItems.push({
      id: e.id,
      label: `${e.serve_time || 'TBD'} - ${e.occasion || 'Event'}`,
      sublabel: `${e.client?.full_name || 'Client'} - ${e.guest_count ?? '?'} guests${weather ? ` - ${weather.emoji} ${weather.tempMaxF}\u00B0F` : ''}${todaysReadiness ? ` - ${todaysReadiness.simulation.readiness.overallScore}% confidence` : ''}`,
      href: `/events/${e.id}`,
      status: 'green',
    })
  }

  // Build DOP task count
  const taskCount = dopTaskDigest.totalIncomplete
  const overdueCount = dopTaskDigest.overdueCount

  return (
    <>
      {/* Event Day Quick-Actions - surfaces when chef has an event today */}
      {todaysSchedule && (
        <div className="col-span-full">
          <Card className="p-4 bg-amber-950/40 border-amber-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-0.5">
                  Tonight
                </p>
                <p className="text-stone-100 font-semibold">
                  {todaysSchedule.event.occasion || 'Event'}{' '}
                  {todaysSchedule.event.serve_time ? `at ${todaysSchedule.event.serve_time}` : ''}
                </p>
                <p className="text-stone-400 text-sm">
                  {(todaysSchedule.event as any).client?.full_name || 'Client'}{' '}
                  {todaysSchedule.event.guest_count
                    ? `· ${todaysSchedule.event.guest_count} guests`
                    : ''}
                </p>
                {todaysReadiness ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Confidence {todaysReadiness.simulation.readiness.overallScore}% ·{' '}
                    {todaysReadiness.simulation.readiness.counts.blockers} blockers ·{' '}
                    {todaysReadiness.simulation.readiness.counts.risks} risks ·{' '}
                    {todaysReadiness.simulation.readiness.counts.stale} stale
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/events/${todaysSchedule.event.id}/pack`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors"
                >
                  Pack List
                </Link>
                <Link
                  href={`/events/${todaysSchedule.event.id}/grocery-quote`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors"
                >
                  Grocery List
                </Link>
                <Link
                  href="/briefing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors"
                >
                  Briefing
                </Link>
                <Link
                  href={`/events/${todaysSchedule.event.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-900/60 hover:bg-amber-900/80 text-amber-200 text-sm font-medium transition-colors"
                >
                  Full Event
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Today's Schedule - list card */}
      <ListCard
        widgetId="todays_schedule"
        title="Today's Schedule"
        count={scheduleItems.length}
        items={scheduleItems}
        href="/calendar"
        emptyMessage={
          nextEvent
            ? `No events today. Next: ${nextEvent.occasion || 'Event'} on ${format(new Date(nextEvent.eventDate + 'T12:00:00'), 'MMM d')}`
            : 'No events scheduled yet. Create your first one to get started.'
        }
        emptyActionLabel={nextEvent ? 'View Calendar' : 'Create Event'}
        emptyActionHref={nextEvent ? '/calendar' : '/events/new'}
      />

      {/* Week Strip - special widget */}
      {weekSchedule.days.length > 0 && (
        <WidgetCardShell widgetId="week_strip" title="This Week" size="md" href="/calendar/week">
          <WeekStrip schedule={weekSchedule} />
        </WidgetCardShell>
      )}

      {/* Weekly Ops Aggregate (FC-G23) */}
      {weekSchedule.days.length > 0 &&
        (() => {
          const weekEvents = weekSchedule.days.flatMap((d) => d.events)
          const totalEvents = weekEvents.length
          const totalGuests = weekEvents.reduce((sum, e) => sum + (e.guestCount ?? 0), 0)
          const prepDays = weekSchedule.days.filter((d) => d.dayType === 'prep').length
          if (totalEvents === 0) return null
          return (
            <StatCard
              widgetId="weekly_ops"
              title="This Week"
              value={`${totalEvents} event${totalEvents !== 1 ? 's' : ''}`}
              subtitle={`${totalGuests} guests${prepDays > 0 ? ` · ${prepDays} prep day${prepDays !== 1 ? 's' : ''}` : ''}`}
              trend={weekSchedule.warnings.length > 0 ? weekSchedule.warnings[0] : 'On track'}
              trendDirection={weekSchedule.warnings.length > 0 ? 'down' : 'up'}
              href="/calendar/week"
            />
          )
        })()}

      {/* DOP Tasks - stat card */}
      {taskCount > 0 && (
        <StatCard
          widgetId="dop_tasks"
          title="Tasks"
          value={String(taskCount)}
          subtitle={`${dopTaskDigest.dueTodayCount} due today`}
          trend={overdueCount > 0 ? `${overdueCount} overdue` : 'On track'}
          trendDirection={overdueCount > 0 ? 'down' : 'up'}
          href="/daily-ops"
        />
      )}

    </>
  )
}

