// Dashboard Schedule Section - streams in independently
// Covers: today's schedule, week strip, prep prompts, DOP tasks

import { requireChef } from '@/lib/auth/get-user'
import {
  getTodaysScheduleEnriched,
  getAllPrepPrompts,
  getWeekSchedule,
} from '@/lib/scheduling/actions'
import { getNextUpcomingEvent } from '@/lib/dashboard/actions'
import { getDOPTaskDigest, type DOPTaskDigest } from '@/lib/scheduling/task-digest'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'
import { getWeatherForEvents, type InlineWeather } from '@/lib/weather/open-meteo'
import { createServerClient } from '@/lib/supabase/server'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { PrepPromptsView } from '@/components/scheduling/prep-prompts-view'
import { DOPTaskPanel } from '@/components/dashboard/dop-task-panel'
import { DailyPlanBanner } from '@/components/daily-ops/daily-plan-banner'
import { ShoppingWindowWidget } from '@/components/dashboard/shopping-window-widget'
import { TodaysScheduleWidget } from '@/components/dashboard/todays-schedule-widget'
import { ShoppingListWidget } from '@/components/dashboard/shopping-list-widget'
import { getShoppingWindowItems, getActiveShoppingList } from '@/lib/dashboard/widget-actions'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { format } from 'date-fns'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { widgetGridClass } from '@/lib/scheduling/types'

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

  const emptyShoppingList = { items: [], eventLabel: '', consolidatedEvents: [] as string[] }

  const [
    prepPrompts,
    weekSchedule,
    nextEvent,
    dopTaskDigest,
    dailyPlanStats,
    shoppingWindow,
    shoppingList,
  ] = await Promise.all([
    safe('prepPrompts', getAllPrepPrompts, []),
    safe('weekSchedule', () => getWeekSchedule(0), emptyWeekSchedule),
    safe('nextEvent', getNextUpcomingEvent, null),
    safe('dopTaskDigest', getDOPTaskDigest, emptyDOPDigest),
    safe('dailyPlanStats', getDailyPlanStats, null),
    safe('shoppingWindow', () => getShoppingWindowItems(3), []),
    safe('shoppingList', () => getActiveShoppingList(5), emptyShoppingList),
  ])

  // Weather fetch - collects event IDs from DOP tasks
  const weatherByEventId = await safe<Record<string, InlineWeather>>(
    'weather',
    async () => {
      const eventIds = new Set<string>()
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

  // Enriched today's schedule (includes client context, prep gate, phase detection)
  const todaysSchedule = await safe(
    'todaysScheduleEnriched',
    () => getTodaysScheduleEnriched(weatherByEventId),
    null
  )

  return (
    <>
      {/* Daily Ops Banner */}
      {isWidgetEnabled('daily_plan') && dailyPlanStats && dailyPlanStats.totalItems > 0 && (
        <section
          className={widgetGridClass('daily_plan')}
          style={{ order: getWidgetOrder('daily_plan') }}
        >
          <CollapsibleWidget widgetId="daily_plan" title="Daily Plan">
            <DailyPlanBanner stats={dailyPlanStats} />
          </CollapsibleWidget>
        </section>
      )}

      {/* Today's Schedule */}
      {isWidgetEnabled('todays_schedule') && (
        <section
          className={widgetGridClass('todays_schedule')}
          style={{ order: getWidgetOrder('todays_schedule') }}
        >
          <CollapsibleWidget widgetId="todays_schedule" title="Today's Schedule">
            {todaysSchedule ? (
              <TodaysScheduleWidget
                schedule={todaysSchedule}
                weather={weatherByEventId[todaysSchedule.event.id] ?? null}
              />
            ) : (
              <Card className="border-stone-700 bg-stone-800">
                <CardContent className="py-8 text-center">
                  <p className="text-stone-500 text-sm">
                    No dinners on the schedule today. A quiet day to plan ahead.
                  </p>
                  {nextEvent && (
                    <Link href={`/events/${nextEvent.id}`} className="inline-block mt-3">
                      <p className="text-sm text-brand-600 hover:text-brand-400 font-medium">
                        Next up: {nextEvent.occasion || 'Event'} -{' '}
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
        <section
          data-info="week-strip"
          className={widgetGridClass('week_strip')}
          style={{ order: getWidgetOrder('week_strip') }}
        >
          <CollapsibleWidget widgetId="week_strip" title="This Week">
            <WeekStrip schedule={weekSchedule} />
          </CollapsibleWidget>
        </section>
      )}

      {/* DOP Task Digest */}
      {isWidgetEnabled('dop_tasks') &&
        (dopTaskDigest.totalIncomplete > 0 || dopTaskDigest.overdueCount > 0) && (
          <section
            className={widgetGridClass('dop_tasks')}
            style={{ order: getWidgetOrder('dop_tasks') }}
          >
            <CollapsibleWidget widgetId="dop_tasks" title="DOP Tasks">
              <DOPTaskPanel digest={dopTaskDigest} weatherByEventId={weatherByEventId} />
            </CollapsibleWidget>
          </section>
        )}

      {/* Prep Prompts */}
      {isWidgetEnabled('prep_prompts') && prepPrompts.length > 0 && (
        <section
          className={widgetGridClass('prep_prompts')}
          style={{ order: getWidgetOrder('prep_prompts') }}
        >
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

      {/* Shopping Window */}
      {isWidgetEnabled('shopping_window') && shoppingWindow.length > 0 && (
        <section
          className={widgetGridClass('shopping_window')}
          style={{ order: getWidgetOrder('shopping_window') }}
        >
          <CollapsibleWidget widgetId="shopping_window" title="Shopping Window">
            <ShoppingWindowWidget items={shoppingWindow} />
          </CollapsibleWidget>
        </section>
      )}

      {/* Active Shopping List */}
      {isWidgetEnabled('active_shopping_list') && shoppingList.items.length > 0 && (
        <section
          className={widgetGridClass('active_shopping_list')}
          style={{ order: getWidgetOrder('active_shopping_list') }}
        >
          <CollapsibleWidget widgetId="active_shopping_list" title="Shopping List">
            <ShoppingListWidget
              items={shoppingList.items}
              eventLabel={shoppingList.eventLabel}
              consolidatedEvents={shoppingList.consolidatedEvents}
            />
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
