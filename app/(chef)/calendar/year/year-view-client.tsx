'use client'

// Year View Client
// 52-week grid showing event density and scheduling gaps.
// Month labels as section headers. Click any week → week planner.

import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import type { YearSummary, YearWeekSummary } from '@/lib/scheduling/types'

// ---- Week cell ----

function weekOffsetFromNow(weekStart: string): number {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  // Find Monday of current week
  const dayOfWeek = today.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const thisMonday = new Date(today)
  thisMonday.setUTCDate(today.getUTCDate() + mondayOffset)
  const thisMondayStr = thisMonday.toISOString().slice(0, 10)
  const diffDays = differenceInCalendarDays(parseISO(weekStart), parseISO(thisMondayStr))
  return Math.round(diffDays / 7)
}

type WeekCellProps = {
  week: YearWeekSummary
  isCurrentWeek: boolean
  onClick: () => void
}

function WeekCell({ week, isCurrentWeek, onClick }: WeekCellProps) {
  const hasEvents = week.event_count > 0
  const hasGaps = week.has_gaps

  let bg = 'bg-gray-50 hover:bg-gray-100 text-gray-400'
  if (hasEvents && hasGaps) {
    bg = 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-red-400 border-2'
  } else if (hasEvents) {
    bg = 'bg-amber-50 hover:bg-amber-100 text-amber-900'
  }

  const ring = isCurrentWeek ? 'ring-2 ring-amber-500 ring-offset-1' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Week of ${format(parseISO(week.week_start), 'MMM d')}: ${week.event_count} event${week.event_count !== 1 ? 's' : ''}${hasGaps ? `, ${week.gap_count} gap${week.gap_count !== 1 ? 's' : ''}` : ''}`}
      className={`rounded border border-gray-200 px-1 py-1.5 text-center cursor-pointer transition-colors text-xs ${bg} ${ring}`}
    >
      <div className="font-medium text-xs leading-tight">
        {format(parseISO(week.week_start), 'M/d')}
      </div>
      {hasEvents && (
        <div className="mt-0.5 space-y-0.5">
          <div className="text-xs leading-none">{week.event_count} ev</div>
          {hasGaps && (
            <div className="text-xs leading-none text-red-600 font-semibold">
              {week.gap_count}⚠
            </div>
          )}
        </div>
      )}
    </button>
  )
}

// ---- Group weeks by month ----

type MonthGroup = {
  month: string // "Jan 2026"
  weeks: YearWeekSummary[]
}

function groupByMonth(weeks: YearWeekSummary[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const week of weeks) {
    const label = format(parseISO(week.week_start), 'MMM yyyy')
    const last = groups[groups.length - 1]
    if (last && last.month === label) {
      last.weeks.push(week)
    } else {
      groups.push({ month: label, weeks: [week] })
    }
  }
  return groups
}

// ---- Main component ----

type Props = {
  summary: YearSummary
  year: number
  currentYear: number
}

export function YearViewClient({ summary, year, currentYear }: Props) {
  const router = useRouter()

  const todayMonday = (() => {
    const today = new Date()
    const dayOfWeek = today.getUTCDay()
    const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const m = new Date(today)
    m.setUTCDate(today.getUTCDate() + offset)
    return m.toISOString().slice(0, 10)
  })()

  const monthGroups = groupByMonth(summary.weeks)

  const fullyScheduledWeeks = summary.weeks.filter(
    (w) => w.event_count > 0 && !w.has_gaps
  ).length
  const eventWeeks = summary.weeks.filter((w) => w.event_count > 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Year View — {year}</h1>
          <p className="text-sm text-gray-500">Click any week to open the planner.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/calendar/year?year=${year - 1}`)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            ← {year - 1}
          </button>
          {year !== currentYear && (
            <button
              type="button"
              onClick={() => router.push(`/calendar/year?year=${currentYear}`)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              This Year
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/calendar/year?year=${year + 1}`)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            {year + 1} →
          </button>
          <button
            type="button"
            onClick={() => router.push('/calendar/week')}
            className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Week Planner
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div className="text-lg font-bold text-gray-900">{summary.total_events}</div>
          <div className="text-xs text-gray-500">Events</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <div className="text-lg font-bold text-amber-800">{fullyScheduledWeeks} / {eventWeeks}</div>
          <div className="text-xs text-amber-600">Fully Scheduled</div>
        </div>
        <div className={`border rounded-lg px-3 py-2 ${summary.total_gaps > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`text-lg font-bold ${summary.total_gaps > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {summary.total_gaps}
          </div>
          <div className={`text-xs ${summary.total_gaps > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {summary.total_gaps > 0 ? 'Events with Gaps' : 'No Gaps ✓'}
          </div>
        </div>
      </div>

      {/* Month-grouped 52-week grid */}
      <div className="space-y-4">
        {monthGroups.map((group) => (
          <div key={group.month}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {group.month}
            </div>
            <div className={`grid gap-1 ${group.weeks.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
              {group.weeks.map((week) => (
                <WeekCell
                  key={week.week_number}
                  week={week}
                  isCurrentWeek={week.week_start === todayMonday}
                  onClick={() => {
                    const offset = weekOffsetFromNow(week.week_start)
                    router.push(`/calendar/week?offset=${offset}`)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        {[
          { color: 'bg-gray-50 border-gray-200', label: 'No events' },
          { color: 'bg-amber-50 border-amber-200', label: 'Events, fully scheduled' },
          { color: 'bg-amber-50 border-red-400 border-2', label: 'Events with gaps' },
          { color: 'ring-2 ring-amber-500 bg-gray-50 border-gray-200', label: 'Current week' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
