'use client'

import { useEffect, useState, useTransition } from 'react'
import { getYearOverview } from '@/lib/scheduling/seasonal-availability-actions'
import type { SeasonalPeriod } from '@/lib/scheduling/seasonal-availability-actions'

type YearOverviewPeriod = SeasonalPeriod & { color: string }

type Props = {
  onPeriodClick?: (period: SeasonalPeriod) => void
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function dateToDay(dateStr: string): { month: number; day: number } {
  const d = new Date(dateStr + 'T00:00:00')
  return { month: d.getMonth(), day: d.getDate() }
}

export default function SeasonalCalendar({ onPeriodClick }: Props) {
  const [periods, setPeriods] = useState<YearOverviewPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const year = new Date().getFullYear()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getYearOverview()
        if (!cancelled) {
          setPeriods(data as YearOverviewPeriod[])
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load seasonal calendar')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Build a lookup: for each month/day, which period covers it?
  function getPeriodForDay(month: number, day: number): YearOverviewPeriod | null {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    for (const p of periods) {
      if (dateStr >= p.start_date && dateStr <= p.end_date) {
        return p
      }
    }
    return null
  }

  // Find current active period
  const today = new Date().toISOString().split('T')[0]
  const activePeriod = periods.find(
    (p) => today >= p.start_date && today <= p.end_date
  )

  if (loading || isPending) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        {error}
      </div>
    )
  }

  // Unique locations for legend
  const uniqueLocations = [...new Set(periods.map((p) => p.location))]

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {year} Seasonal Calendar
        </h3>
        {activePeriod && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: activePeriod.color }}
          >
            📍 {activePeriod.location}
          </span>
        )}
      </div>

      {/* Legend */}
      {uniqueLocations.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {uniqueLocations.map((loc) => {
            const p = periods.find((pp) => pp.location === loc)
            return (
              <div key={loc} className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: p?.color ?? '#888' }}
                />
                {loc}
              </div>
            )
          })}
        </div>
      )}

      {/* Month grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {MONTH_NAMES.map((name, monthIdx) => {
          const days = daysInMonth(year, monthIdx)
          return (
            <div key={monthIdx} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{name}</div>
              <div className="grid grid-cols-7 gap-px">
                {/* Day-of-week offset for the first day */}
                {Array.from({ length: new Date(year, monthIdx, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-3 w-3" />
                ))}
                {Array.from({ length: days }).map((_, dayIdx) => {
                  const day = dayIdx + 1
                  const period = getPeriodForDay(monthIdx, day)
                  const isToday =
                    today ===
                    `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                  return (
                    <button
                      key={day}
                      className={`h-3 w-3 rounded-sm transition-colors ${
                        isToday ? 'ring-1 ring-foreground ring-offset-1' : ''
                      } ${period ? 'cursor-pointer hover:opacity-80' : 'bg-muted/50'}`}
                      style={period ? { backgroundColor: period.color } : undefined}
                      title={
                        period
                          ? `${period.period_name} (${period.location}) - Day ${day}`
                          : `${name} ${day}`
                      }
                      onClick={() => {
                        if (period && onPeriodClick) onPeriodClick(period)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {periods.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No seasonal periods configured. Add one to manage location-based availability.
        </p>
      )}
    </div>
  )
}
