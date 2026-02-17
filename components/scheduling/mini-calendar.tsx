// Mini Calendar — small month grid for quick date navigation
// Like Google Calendar's left sidebar calendar.

'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@/lib/scheduling/actions'

interface MiniCalendarProps {
  events: CalendarEvent[]
  selectedDate?: string
  onDateSelect: (date: string) => void
  onMonthChange?: (year: number, month: number) => void
}

export function MiniCalendar({ events, selectedDate, onDateSelect, onMonthChange }: MiniCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayStr = today.toISOString().split('T')[0]

  // Dates that have events
  const eventDates = useMemo(() => {
    const dates = new Set<string>()
    for (const event of events) {
      dates.add(event.start.split('T')[0])
    }
    return dates
  }, [events])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)

    // Start from Monday (adjust Sunday from 0 to 7)
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6

    const days: { date: string; dayNum: number; isCurrentMonth: boolean }[] = []

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i)
      days.push({
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        isCurrentMonth: false,
      })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(viewYear, viewMonth, i)
      days.push({
        date: d.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: true,
      })
    }

    // Next month fill (to complete last row)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(viewYear, viewMonth + 1, i)
        days.push({
          date: d.toISOString().split('T')[0],
          dayNum: i,
          isCurrentMonth: false,
        })
      }
    }

    return days
  }, [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const goPrevMonth = () => {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear
    setViewMonth(newMonth)
    setViewYear(newYear)
    onMonthChange?.(newYear, newMonth)
  }

  const goNextMonth = () => {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear
    setViewMonth(newMonth)
    setViewYear(newYear)
    onMonthChange?.(newYear, newMonth)
  }

  const goToToday = () => {
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
    onDateSelect(todayStr)
  }

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goPrevMonth}
          className="p-1 rounded hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-semibold text-stone-700 hover:text-brand-600 transition-colors"
        >
          {monthLabel}
        </button>
        <button
          onClick={goNextMonth}
          className="p-1 rounded hover:bg-stone-100 text-stone-500 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-stone-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const isToday = day.date === todayStr
          const isSelected = day.date === selectedDate
          const hasEvent = eventDates.has(day.date)

          return (
            <button
              key={i}
              onClick={() => onDateSelect(day.date)}
              className={`
                relative w-full aspect-square flex items-center justify-center text-xs rounded-full
                transition-all
                ${!day.isCurrentMonth ? 'text-stone-300' : 'text-stone-700'}
                ${isToday && !isSelected ? 'text-brand-600 font-bold' : ''}
                ${isSelected ? 'bg-brand-500 text-white font-bold' : 'hover:bg-stone-100'}
              `}
            >
              {day.dayNum}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
