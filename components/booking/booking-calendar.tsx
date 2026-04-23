'use client'

// BookingCalendar - Month grid for public chef booking page.
// Color-coded: green = available, gray = blocked/past, amber = unavailable (notice too short).

import { useState, useEffect } from 'react'

type DateStatus = 'available' | 'blocked' | 'unavailable' | 'loading'
type CalendarTruthMode = 'verified_external' | 'internal_only' | 'degraded'

type CalendarTruthState = {
  mode: CalendarTruthMode
  message: string
  checked_at?: string | null
}

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
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [availability, setAvailability] = useState<Record<string, DateStatus>>({})
  const [conflictDetails, setConflictDetails] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [calendarTruth, setCalendarTruth] = useState<CalendarTruthState>({
    mode: 'internal_only',
    message: 'Availability reflects confirmed ChefFlow events and chef blocked dates.',
    checked_at: null,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    fetch(`/book/${chefSlug}/availability?year=${year}&month=${month}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error((data?.error as string) || 'Availability could not be loaded')
        }
        return data
      })
      .then((data) => {
        if (cancelled) return
        setAvailability((data?.availability ?? {}) as Record<string, DateStatus>)
        setConflictDetails((data?.conflict_details ?? {}) as Record<string, string[]>)
        setCalendarTruth(
          (data?.calendar_truth as CalendarTruthState | undefined) ?? {
            mode: 'internal_only',
            message: 'Availability reflects confirmed ChefFlow events and chef blocked dates.',
            checked_at: null,
          }
        )
      })
      .catch((err) => {
        if (cancelled) return
        setAvailability({})
        setConflictDetails({})
        setCalendarTruth({
          mode: 'degraded',
          message: 'Availability could not be loaded right now. Please refresh or contact the chef.',
          checked_at: null,
        })
        setLoadError(err instanceof Error ? err.message : 'Availability could not be loaded')
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

  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-3">
      {(loadError || calendarTruth.message) && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            calendarTruth.mode === 'verified_external'
              ? 'border-emerald-800 bg-emerald-950/40 text-emerald-100'
              : calendarTruth.mode === 'degraded'
                ? 'border-amber-700 bg-amber-950/40 text-amber-100'
                : 'border-stone-700 bg-stone-900 text-stone-300'
          }`}
        >
          <p>{loadError || calendarTruth.message}</p>
          {!loadError && calendarTruth.checked_at && calendarTruth.mode === 'verified_external' && (
            <p className="mt-1 text-[11px] text-emerald-200/80">
              Checked {new Date(calendarTruth.checked_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-stone-700 text-stone-400"
          aria-label="Previous month"
        >
          {'<'}
        </button>
        <span className="text-sm font-semibold text-stone-100">
          {MONTH_NAMES[month - 1]} {year}
          {loading && <span className="ml-2 text-xs text-stone-400">Loading...</span>}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-md hover:bg-stone-700 text-stone-400"
          aria-label="Next month"
        >
          {'>'}
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {DOW.map((d) => (
          <div key={d} className="text-xs-tight font-semibold text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

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
            cls += ' bg-stone-800 text-amber-300 cursor-not-allowed'
          } else {
            cls += ' bg-stone-800 text-stone-300'
          }

          const tooltip =
            status === 'blocked' || status === 'unavailable'
              ? (conflictDetails[dateStr] || ['Not available']).join('; ')
              : undefined

          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(dateStr)}
              title={tooltip}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-200" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-700" /> Blocked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-300" /> Notice required
        </span>
      </div>
    </div>
  )
}
