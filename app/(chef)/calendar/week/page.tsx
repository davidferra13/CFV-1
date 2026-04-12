// Week Planner Page
// Shows all events in the selected week alongside all scheduled prep blocks
// and chef calendar entries (vacation banners, market blocks, etc.).

import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { getWeekSchedule } from '@/lib/scheduling/actions'
import { getWeekPrepBlocks, getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import { getCalendarEntriesForRange } from '@/lib/calendar/entry-actions'
import { getWeatherForDateRange } from '@/lib/weather/weather-actions'
import { WeekPlannerClient } from './week-planner-client'

function liso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekBounds(offset: number): { startDate: string; endDate: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - mondayOffset + offset * 7
  )
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { startDate: liso(monday), endDate: liso(sunday) }
}

export default async function WeekPlannerPage({
  searchParams,
}: {
  searchParams: { offset?: string }
}) {
  await requireChef()

  const offset = parseInt(searchParams.offset ?? '0', 10)
  const { startDate, endDate } = getWeekBounds(offset)

  const [weekSchedule, prepBlocks, allGaps, calendarEntries, weatherByDate] = await Promise.all([
    getWeekSchedule(offset),
    getWeekPrepBlocks(offset),
    getSchedulingGaps(),
    getCalendarEntriesForRange(startDate, endDate),
    getWeatherForDateRange(startDate, endDate),
  ])

  const weekEventIds = new Set(weekSchedule.days.flatMap((d) => d.events.map((e) => e.id)))
  const weekGaps = allGaps.filter((g) => weekEventIds.has(g.event_id))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <WidgetErrorBoundary name="Week Planner">
        <Suspense fallback={null}>
          <WeekPlannerClient
            weekSchedule={weekSchedule}
            prepBlocks={prepBlocks}
            weekGaps={weekGaps}
            weekOffset={offset}
            calendarEntries={calendarEntries}
            weatherByDate={weatherByDate}
          />
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}
