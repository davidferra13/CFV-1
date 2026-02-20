// Week Planner Page
// Shows all events in the selected week alongside all scheduled prep blocks
// and chef calendar entries (vacation banners, market blocks, etc.).

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getWeekSchedule } from '@/lib/scheduling/actions'
import { getWeekPrepBlocks, getSchedulingGaps } from '@/lib/scheduling/prep-block-actions'
import { getCalendarEntriesForRange } from '@/lib/calendar/entry-actions'
import { WeekPlannerClient } from './week-planner-client'

function getWeekBounds(offset: number): { startDate: string; endDate: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  }
}

export default async function WeekPlannerPage({
  searchParams,
}: {
  searchParams: { offset?: string }
}) {
  await requireChef()

  const offset = parseInt(searchParams.offset ?? '0', 10)
  const { startDate, endDate } = getWeekBounds(offset)

  const [weekSchedule, prepBlocks, allGaps, calendarEntries] = await Promise.all([
    getWeekSchedule(offset),
    getWeekPrepBlocks(offset),
    getSchedulingGaps(),
    getCalendarEntriesForRange(startDate, endDate),
  ])

  const weekEventIds = new Set(weekSchedule.days.flatMap((d) => d.events.map((e) => e.id)))
  const weekGaps = allGaps.filter((g) => weekEventIds.has(g.event_id))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <Suspense fallback={null}>
        <WeekPlannerClient
          weekSchedule={weekSchedule}
          prepBlocks={prepBlocks}
          weekGaps={weekGaps}
          weekOffset={offset}
          calendarEntries={calendarEntries}
        />
      </Suspense>
    </div>
  )
}
