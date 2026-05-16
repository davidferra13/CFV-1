'use client'

import { useState, useTransition, useCallback } from 'react'
import type { DayLoad } from '@/lib/intelligence/operational-load'
import { LoadDayDetail } from './load-day-detail'
import { LoadLegend } from './load-legend'
import { WeekLoadBar } from './week-load-bar'
import { getMonthLoad, getWeekLoad } from '@/lib/intelligence/operational-load-actions'
import type { WeekLoadSummary } from '@/lib/intelligence/operational-load'

// ---- Helpers ---------------------------------------------------------------

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cellColor(level: string): string {
  switch (level) {
    case 'overloaded':
      return 'bg-red-500/80 hover:bg-red-500'
    case 'heavy':
      return 'bg-orange-500/80 hover:bg-orange-500'
    case 'moderate':
      return 'bg-yellow-500/70 hover:bg-yellow-500'
    case 'light':
      return 'bg-emerald-600/70 hover:bg-emerald-600'
    default:
      return 'bg-stone-800/60 hover:bg-stone-800'
  }
}

function textColor(level: string): string {
  switch (level) {
    case 'overloaded':
      return 'text-red-100'
    case 'heavy':
      return 'text-orange-100'
    case 'moderate':
      return 'text-yellow-100'
    case 'light':
      return 'text-emerald-100'
    default:
      return 'text-stone-500'
  }
}

function getMonthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

// ---- Types -----------------------------------------------------------------

type ViewMode = 'month' | 'fourweek'

// ---- Component -------------------------------------------------------------

export function LoadHeatmapCalendar({
  initialDays,
  initialMonth,
  initialYear,
  initialWeekSummary,
}: {
  initialDays: DayLoad[]
  initialMonth: number
  initialYear: number
  initialWeekSummary: WeekLoadSummary
}) {
  const [days, setDays] = useState<DayLoad[]>(initialDays)
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [selectedDay, setSelectedDay] = useState<DayLoad | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isPending, startTransition] = useTransition()
  const [weekSummary, setWeekSummary] = useState<WeekLoadSummary>(initialWeekSummary)
  const [error, setError] = useState<string | null>(null)

  const loadMonth = useCallback((m: number, y: number) => {
    startTransition(async () => {
      try {
        const result = await getMonthLoad(m, y)
        setDays(result)
        setMonth(m)
        setYear(y)
        setSelectedDay(null)
        setError(null)
      } catch {
        setError('Failed to load month data.')
      }
    })
  }, [])

  const navigateMonth = useCallback(
    (direction: 1 | -1) => {
      let newMonth = month + direction
      let newYear = year
      if (newMonth > 12) {
        newMonth = 1
        newYear++
      }
      if (newMonth < 1) {
        newMonth = 12
        newYear--
      }
      loadMonth(newMonth, newYear)
    },
    [month, year, loadMonth]
  )

  const loadFourWeeks = useCallback(() => {
    startTransition(async () => {
      try {
        const now = new Date()
        const dayOfWeek = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

        const weekStart = [
          monday.getFullYear(),
          String(monday.getMonth() + 1).padStart(2, '0'),
          String(monday.getDate()).padStart(2, '0'),
        ].join('-')

        // Get 4 weeks of data (28 days)
        const allDays: DayLoad[] = []
        for (let w = 0; w < 4; w++) {
          const ws = new Date(monday)
          ws.setDate(monday.getDate() + w * 7)
          const wsStr = [
            ws.getFullYear(),
            String(ws.getMonth() + 1).padStart(2, '0'),
            String(ws.getDate()).padStart(2, '0'),
          ].join('-')
          const weekResult = await getWeekLoad(wsStr)
          allDays.push(...weekResult.days)
          // Use first week as summary
          if (w === 0) setWeekSummary(weekResult)
        }
        setDays(allDays)
        setSelectedDay(null)
        setError(null)
      } catch {
        setError('Failed to load forecast data.')
      }
    })
  }, [])

  // Build the calendar grid
  const firstDay = new Date(year, month - 1, 1)
  // Monday = 0 in our grid (ISO week)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const daysInMonth = new Date(year, month, 0).getDate()
  const dayMap = new Map(days.map((d) => [d.date, d]))
  const todayStr = new Date().toISOString().slice(0, 10)

  // Build cells
  const cells: (DayLoad | null)[] = []
  // Leading empty cells
  for (let i = 0; i < startOffset; i++) cells.push(null)
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(
      dayMap.get(dateStr) ?? {
        date: dateStr,
        score: 0,
        level: 'empty' as const,
        breakdown: {
          events: 0,
          prepTasks: 0,
          components: 0,
          staffGap: 0,
          travelMinutes: 0,
          shoppingTasks: 0,
          weatherRisk: 0,
        },
      }
    )
  }
  // Trailing empty cells
  while (cells.length % 7 !== 0) cells.push(null)

  // Stats for the month
  const nonEmptyDays = days.filter((d) => d.score > 0)
  const avgScore =
    nonEmptyDays.length > 0
      ? Math.round(nonEmptyDays.reduce((s, d) => s + d.score, 0) / nonEmptyDays.length)
      : 0
  const heavyDayCount = days.filter((d) => d.level === 'heavy' || d.level === 'overloaded').length
  const totalEvents = days.reduce((s, d) => s + d.breakdown.events, 0)
  const totalComponents = days.reduce((s, d) => s + d.breakdown.components, 0)

  return (
    <div className="space-y-6">
      {/* Header: month nav + view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth(-1)}
            disabled={isPending}
            className="p-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-stone-100 min-w-[160px] text-center">
            {viewMode === 'month' ? `${getMonthName(month)} ${year}` : 'Next 4 Weeks'}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            disabled={isPending || viewMode === 'fourweek'}
            className="p-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-stone-700 overflow-hidden">
          <button
            onClick={() => {
              setViewMode('month')
              loadMonth(month, year)
            }}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => {
              setViewMode('fourweek')
              loadFourWeeks()
            }}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'fourweek'
                ? 'bg-stone-700 text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Next 4 Weeks
          </button>
        </div>
      </div>

      {/* Legend */}
      <LoadLegend />

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <div className="h-3 w-3 animate-spin rounded-full border border-brand-500 border-t-transparent" />
          Loading...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-3 overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-stone-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`empty-${i}`} className="aspect-square rounded-md bg-stone-900/30" />
            }

            const isToday = cell.date === todayStr
            const isSelected = selectedDay?.date === cell.date
            const dayNum = parseInt(cell.date.split('-')[2], 10)

            return (
              <button
                key={cell.date}
                onClick={() => setSelectedDay(isSelected ? null : cell)}
                className={`aspect-square rounded-md flex flex-col items-center justify-center transition-all cursor-pointer ${cellColor(cell.level)} ${
                  isToday ? 'ring-2 ring-brand-400 ring-offset-1 ring-offset-stone-900' : ''
                } ${isSelected ? 'ring-2 ring-stone-300 ring-offset-1 ring-offset-stone-900' : ''}`}
                title={`${cell.date}: ${cell.score}/100`}
              >
                <span className={`text-xs font-medium leading-none ${textColor(cell.level)}`}>
                  {dayNum}
                </span>
                {cell.score > 0 && (
                  <span
                    className={`text-[9px] leading-none mt-0.5 ${textColor(cell.level)} opacity-70`}
                  >
                    {cell.score}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && <LoadDayDetail day={selectedDay} onClose={() => setSelectedDay(null)} />}

      {/* Week summary bar */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
        <h3 className="text-sm font-semibold text-stone-200 mb-3">This Week</h3>
        <WeekLoadBar summary={weekSummary} />
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg load" value={`${avgScore}/100`} />
        <StatCard label="Total events" value={String(totalEvents)} />
        <StatCard label="Total components" value={String(totalComponents)} />
        <StatCard
          label="Heavy/overloaded days"
          value={String(heavyDayCount)}
          highlight={heavyDayCount > 3}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-amber-400' : 'text-stone-100'}`}>
        {value}
      </p>
    </div>
  )
}
