'use client'

// BookingDatePicker - Step 2 of the booking flow.
// Calendar grid showing available dates. Fetches availability from the API.
// Green = available, gray = blocked, amber = notice required.

import { useState, useEffect, useMemo } from 'react'
import type { PublicEventType } from '@/lib/booking/event-types-actions'

type DateStatus = 'available' | 'blocked' | 'unavailable' | 'loading'

type Props = {
  chefSlug: string
  onSelectDate: (date: string) => void
  onBack?: () => void
  selectedEventType: PublicEventType | null
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BookingDatePicker({ chefSlug, onSelectDate, onBack, selectedEventType }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [availability, setAvailability] = useState<Record<string, DateStatus>>({})
  const [loading, setLoading] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/book/${chefSlug}/availability?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setAvailability((data?.availability ?? {}) as Record<string, DateStatus>)
      })
      .catch(() => {
        if (cancelled) return
        setAvailability({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [chefSlug, year, month])

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
      return
    }
    setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
      return
    }
    setMonth((m) => m + 1)
  }

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const result: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [year, month])

  // Detect the user's timezone for display
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return null
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Pick a date</h2>
          {selectedEventType && (
            <p className="text-sm text-stone-500 mt-0.5">for {selectedEventType.name}</p>
          )}
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="bg-stone-800 rounded-xl border border-stone-700 p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Previous month"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-stone-100">
            {MONTH_NAMES[month - 1]} {year}
            {loading && (
              <span className="ml-2 text-xs text-stone-500 animate-pulse">Loading...</span>
            )}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Next month"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {DOW_LABELS.map((d) => (
            <div key={d} className="text-[11px] font-semibold text-stone-500 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const status: DateStatus = availability[dateStr] ?? 'loading'
            const isHovered = dateStr === hoverDate
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() + 1 &&
              year === today.getFullYear()

            let className =
              'aspect-square flex items-center justify-center text-sm rounded-lg transition-all font-medium relative'
            let clickable = false

            if (status === 'available') {
              className += isHovered
                ? ' bg-green-600 text-white cursor-pointer ring-2 ring-green-500'
                : ' bg-green-900/40 text-green-300 hover:bg-green-600 hover:text-white cursor-pointer'
              clickable = true
            } else if (status === 'blocked') {
              className += ' text-stone-600 cursor-not-allowed'
            } else if (status === 'unavailable') {
              className += ' text-stone-600 cursor-not-allowed'
            } else {
              className += ' text-stone-600'
            }

            return (
              <button
                key={i}
                type="button"
                className={className}
                disabled={!clickable}
                onClick={() => clickable && onSelectDate(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
              >
                {day}
                {isToday && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-stone-500 pt-3 mt-2 border-t border-stone-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-600" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-stone-700" /> Not available
          </span>
          {timezone && <span className="ml-auto text-stone-600">{timezone.replace('_', ' ')}</span>}
        </div>
      </div>
    </div>
  )
}
