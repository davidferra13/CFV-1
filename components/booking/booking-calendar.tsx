'use client'

// BookingCalendar — Month grid for the public chef booking page.
// Color-coded: green = available, gray = blocked/past, amber = unavailable (notice too short).
// On click of an available date, calls onSelectDate(dateStr).

import { useState, useEffect } from 'react'

type DateStatus = 'available' | 'blocked' | 'unavailable' | 'loading'

type Props = {
  chefSlug: string
  onSelectDate: (date: string) => void
  selectedDate: string | null
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
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BookingCalendar({ chefSlug, onSelectDate, selectedDate }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [availability, setAvailability] = useState<Record<string, DateStatus>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/book/${chefSlug}/availability?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.availability) {
          setAvailability(data.availability)
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability({})
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
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else setMonth((m) => m + 1)
  }

  // Build calendar grid
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-stone-700 text-stone-400"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-stone-100">
          {MONTH_NAMES[month - 1]} {year}
          {loading && <span className="ml-2 text-xs text-stone-400">Loading…</span>}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-md hover:bg-stone-700 text-stone-400"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {DOW.map((d) => (
          <div key={d} className="text-[11px] font-semibold text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status: DateStatus = availability[dateStr] ?? 'loading'
          const isSelected = dateStr === selectedDate

          const base =
            'aspect-square flex items-center justify-center text-sm rounded-lg transition-all font-medium'

          let cls = base
          let clickable = false

          if (isSelected) {
            cls += ' bg-brand-600 text-white ring-2 ring-brand-600'
            clickable = true
          } else if (status === 'available') {
            cls += ' bg-green-900 text-green-800 hover:bg-green-200 cursor-pointer'
            clickable = true
          } else if (status === 'blocked') {
            cls += ' bg-stone-800 text-stone-300 cursor-not-allowed'
          } else if (status === 'unavailable') {
            cls += ' bg-stone-800 text-stone-300 cursor-not-allowed'
          } else {
            // loading / unknown
            cls += ' bg-stone-800 text-stone-300'
          }

          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(dateStr)}
              title={
                status === 'unavailable'
                  ? 'Too soon — insufficient notice'
                  : status === 'blocked'
                    ? 'Not available'
                    : undefined
              }
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-700" /> Unavailable
        </span>
      </div>
    </div>
  )
}
