// Dashboard Schedule Section — streams in independently
// Covers: today's schedule, week strip, prep prompts, DOP tasks

import { requireChef } from '@/lib/auth/get-user'
import { getTodaysSchedule, getAllPrepPrompts, getWeekSchedule } from '@/lib/scheduling/actions'
import { getNextUpcomingEvent } from '@/lib/dashboard/actions'
import { getDOPTaskDigest, type DOPTaskDigest } from '@/lib/scheduling/task-digest'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { getWeatherForEvents, type InlineWeather } from '@/lib/weather/open-meteo'
import { createServerClient } from '@/lib/supabase/server'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { TimelineView } from '@/components/scheduling/timeline-view'
import { PrepPromptsView } from '@/components/scheduling/prep-prompts-view'
import { DOPTaskPanel } from '@/components/dashboard/dop-task-panel'
import { DailyPlanBanner } from '@/components/daily-ops/daily-plan-banner'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import type { DashboardWidgetId } from '@/lib/scheduling/types'

// Safe wrapper
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/Schedule] ${label} failed:`, err)
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

interface ScheduleSectionProps {
  widgetEnabled: Record<string, boolean>
  widgetOrder: Record<string, number>
}

export async function ScheduleSection({ widgetEnabled, widgetOrder }: ScheduleSectionProps) {
  const isWidgetEnabled = (id: DashboardWidgetId) => widgetEnabled[id] ?? true
  const getWidgetOrder = (id: DashboardWidgetId) => widgetOrder[id] ?? Number.MAX_SAFE_INTEGER

  const [todaysSchedule, prepPrompts, weekSchedule, nextEvent, dopTaskDigest, dailyPlanStats] =
    await Promise.all([
      safe('todaysSchedule', getTodaysSchedule, null),
      safe('prepPrompts', getAllPrepPrompts, []),
      safe('weekSchedule', () => getWeekSchedule(0), emptyWeekSchedule),
      safe('nextEvent', getNextUpcomingEvent, null),
      safe('dopTaskDigest', getDOPTaskDigest, emptyDOPDigest),
      safe('dailyPlanStats', getDailyPlanStats, null),
    ])

  // Weather fetch — depends on schedule data, so sequential is correct here
  const weatherByEventId = await safe<Record<string, InlineWeather>>(
    'weather',
    async () => {
      const eventIds = new Set<string>()
      if (todaysSchedule) eventIds.add(todaysSchedule.event.id)
      for (const task of dopTaskDigest.tasks) eventIds.add(task.eventId)
      if (eventIds.size === 0) return {}

      const supabase: any = createServerClient()
      const { data: eventCoords } = await supabase
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

  return (
    <>
      {/* Daily Ops Banner */}
      {isWidgetEnabled('daily_plan') && dailyPlanStats && dailyPlanStats.totalItems > 0 && (
        <section style={{ order: getWidgetOrder('daily_plan') }}>
          <CollapsibleWidget widgetId="daily_plan" title="Daily Plan">
            <DailyPlanBanner stats={dailyPlanStats} />
          </CollapsibleWidget>
        </section>
      )}

      {/* Today's Schedule */}
      {isWidgetEnabled('todays_schedule') && (
        <section style={{ order: getWidgetOrder('todays_schedule') }}>
          <CollapsibleWidget widgetId="todays_schedule" title="Today's Schedule">
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
                      <p className="text-sm font-medium text-amber-900">
                        Compressed timeline active
                      </p>
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
          </CollapsibleWidget>
        </section>
      )}

      {/* Week Strip */}
      {isWidgetEnabled('week_strip') && weekSchedule.days.length > 0 && (
        <section data-info="week-strip" style={{ order: getWidgetOrder('week_strip') }}>
          <CollapsibleWidget widgetId="week_strip" title="This Week">
            <WeekStrip schedule={weekSchedule} />
          </CollapsibleWidget>
        </section>
      )}

      {/* DOP Task Digest */}
      {isWidgetEnabled('dop_tasks') &&
        (dopTaskDigest.totalIncomplete > 0 || dopTaskDigest.overdueCount > 0) && (
          <section style={{ order: getWidgetOrder('dop_tasks') }}>
            <CollapsibleWidget widgetId="dop_tasks" title="DOP Tasks">
              <DOPTaskPanel digest={dopTaskDigest} weatherByEventId={weatherByEventId} />
            </CollapsibleWidget>
          </section>
        )}

      {/* Prep Prompts */}
      {isWidgetEnabled('prep_prompts') && prepPrompts.length > 0 && (
        <section style={{ order: getWidgetOrder('prep_prompts') }}>
          <CollapsibleWidget widgetId="prep_prompts" title="Prep Prompts">
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
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
