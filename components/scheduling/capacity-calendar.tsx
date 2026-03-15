'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getMonthCapacity,
  getDateAvailability,
  type MonthDayCapacity,
  type DayAvailability,
} from '@/lib/scheduling/capacity-planning-actions'
import { Button } from '@/components/ui/button'

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  available: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  busy: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  at_capacity: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  blocked: { bg: 'bg-stone-100', text: 'text-stone-400', border: 'border-stone-200' },
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  shopping: 'bg-blue-200 text-blue-800',
  prep: 'bg-amber-200 text-amber-800',
  travel: 'bg-purple-200 text-purple-800',
  service: 'bg-emerald-200 text-emerald-800',
  cleanup: 'bg-stone-200 text-stone-700',
  buffer: 'bg-stone-100 text-stone-500',
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function CapacityCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [days, setDays] = useState<MonthDayCapacity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null)
  const [loadingDay, setLoadingDay] = useState(false)

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })

  const loadMonth = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedDay(null)
    try {
      const data = await getMonthCapacity(year, month)
      setDays(data)
    } catch (err) {
      setError('Failed to load capacity data')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  async function selectDay(dateStr: string) {
    setLoadingDay(true)
    try {
      const availability = await getDateAvailability(dateStr)
      setSelectedDay(availability)
    } catch (err) {
      setSelectedDay(null)
    } finally {
      setLoadingDay(false)
    }
  }

  // Build calendar grid: figure out which day of the week the 1st falls on
  const firstDayOfMonth = new Date(year, month - 1, 1)
  let startDow = firstDayOfMonth.getDay() // 0=Sun
  // Convert to Mon=0 system
  startDow = startDow === 0 ? 6 : startDow - 1

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-900">Capacity Calendar</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={prevMonth} className="px-2 py-1 text-sm">
            &larr;
          </Button>
          <span className="min-w-[140px] text-center font-medium text-stone-700">
            {monthName} {year}
          </span>
          <Button variant="ghost" onClick={nextMonth} className="px-2 py-1 text-sm">
            &rarr;
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-50 border border-emerald-200" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-50 border border-amber-200" />
          Busy
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-50 border border-red-200" />
          At Capacity
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-stone-100 border border-stone-200" />
          Blocked
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-64 rounded-lg bg-stone-200" />
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="rounded-lg border border-stone-200 overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200">
              {WEEKDAY_HEADERS.map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-stone-500">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Empty cells before first day */}
              {Array.from({ length: startDow }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="border-b border-r border-stone-100 p-2 min-h-[72px]"
                />
              ))}

              {days.map((day) => {
                const colors = STATUS_COLORS[day.status]
                const isSelected = selectedDay?.date === day.date
                const todayStr = today.toISOString().slice(0, 10)
                const isToday = day.date === todayStr

                return (
                  <button
                    key={day.date}
                    onClick={() => selectDay(day.date)}
                    className={`border-b border-r border-stone-100 p-2 min-h-[72px] text-left transition-colors hover:bg-stone-50 ${
                      isSelected ? 'ring-2 ring-amber-400 ring-inset' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isToday
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white'
                            : day.is_blocked
                              ? 'text-stone-400'
                              : 'text-stone-700'
                        }`}
                      >
                        {parseInt(day.date.split('-')[2], 10)}
                      </span>
                    </div>
                    {!day.is_blocked && (
                      <div
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {day.event_count}/{day.max_events}
                      </div>
                    )}
                    {day.is_blocked && <div className="text-xs text-stone-400 italic">Off</div>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Detail Panel */}
          {loadingDay && (
            <div className="rounded-lg border border-stone-200 p-4 animate-pulse">
              <div className="h-6 w-32 rounded bg-stone-200 mb-3" />
              <div className="h-20 rounded bg-stone-200" />
            </div>
          )}

          {selectedDay && !loadingDay && (
            <div className="rounded-lg border border-stone-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-stone-800">
                  {selectedDay.day_name}, {selectedDay.date}
                </h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedDay.status].bg} ${STATUS_COLORS[selectedDay.status].text}`}
                >
                  {selectedDay.status === 'at_capacity'
                    ? 'At Capacity'
                    : selectedDay.status.charAt(0).toUpperCase() + selectedDay.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-stone-50 p-2 text-center">
                  <div className="text-lg font-semibold text-stone-800">
                    {selectedDay.events_booked}
                  </div>
                  <div className="text-xs text-stone-500">of {selectedDay.max_events} events</div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 text-center">
                  <div className="text-lg font-semibold text-stone-800">
                    {selectedDay.total_committed_hours}h
                  </div>
                  <div className="text-xs text-stone-500">committed</div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 text-center">
                  <div className="text-lg font-semibold text-emerald-700">
                    {selectedDay.remaining_capacity_hours}h
                  </div>
                  <div className="text-xs text-stone-500">remaining</div>
                </div>
              </div>

              {/* Time blocks */}
              {selectedDay.time_blocks.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-sm font-medium text-stone-700">Time Blocks</h5>
                  <div className="space-y-1">
                    {selectedDay.time_blocks
                      .sort((a, b) => a.start_minutes - b.start_minutes)
                      .map((block, idx) => (
                        <div
                          key={`${block.event_id}-${block.type}-${idx}`}
                          className={`flex items-center justify-between rounded px-2 py-1 text-xs ${BLOCK_TYPE_COLORS[block.type]}`}
                        >
                          <span className="font-medium">
                            {block.label}
                            {block.event_title ? ` (${block.event_title})` : ''}
                          </span>
                          <span>
                            {minutesToTime(block.start_minutes)} -{' '}
                            {minutesToTime(block.end_minutes)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {selectedDay.conflicts.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-1">
                  <h5 className="text-sm font-medium text-red-700">Conflicts Detected</h5>
                  {selectedDay.conflicts.map((conflict, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {conflict}
                    </p>
                  ))}
                </div>
              )}

              {selectedDay.is_blocked_day && (
                <p className="text-sm text-stone-500 italic">
                  This is a blocked day. No events should be scheduled.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
