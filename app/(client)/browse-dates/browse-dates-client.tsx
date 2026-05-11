'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CalendarPlus, Check, X } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import {
  getChefAvailability,
  type AvailableDate,
} from '@/lib/availability/client-browse-dates-actions'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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

export function BrowseDatesClient({
  initialDates,
  chefName,
}: {
  initialDates: AvailableDate[]
  chefName: string | null
}) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dates, setDates] = useState(initialDates)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function navigateMonth(direction: -1 | 1) {
    let newMonth = month + direction
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    }
    if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    setMonth(newMonth)
    setYear(newYear)
    setSelectedDate(null)
    startTransition(async () => {
      try {
        const { dates: newDates } = await getChefAvailability(newMonth, newYear)
        setDates(newDates)
      } catch {
        toast.error('Failed to load availability')
      }
    })
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const dateMap = new Map(dates.map((d) => [d.date, d]))

  const today = now.toISOString().split('T')[0]
  const selected = selectedDate ? dateMap.get(selectedDate) : null
  const isAvailable = selected && !selected.isBlocked && !selected.hasEvent
  const isPast = selectedDate ? selectedDate < today : false

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          disabled={isPending}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className={`text-lg font-medium ${isPending ? 'text-stone-500' : 'text-stone-100'}`}>
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          disabled={isPending}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="pt-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_HEADERS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-stone-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const info = dateMap.get(dateStr)
              const isToday = dateStr === today
              const isPastDay = dateStr < today
              const blocked = info?.isBlocked
              const hasEvent = info?.hasEvent
              const isSelected = dateStr === selectedDate

              let bgColor = 'bg-stone-800/50 hover:bg-stone-700/50'
              if (blocked) bgColor = 'bg-red-950/30'
              else if (hasEvent) bgColor = 'bg-blue-950/30'
              else if (!isPastDay) bgColor = 'bg-emerald-950/20 hover:bg-emerald-950/40'

              if (isSelected) bgColor = 'bg-brand-600/30 ring-2 ring-brand-500'

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  disabled={isPastDay}
                  className={`h-12 rounded-lg flex flex-col items-center justify-center text-sm transition-all ${bgColor} ${
                    isPastDay ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span className={`${isToday ? 'text-brand-400 font-bold' : 'text-stone-200'}`}>
                    {day}
                  </span>
                  {blocked && <X className="w-3 h-3 text-red-400" />}
                  {hasEvent && !blocked && <Check className="w-3 h-3 text-blue-400" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-950/40 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-950/40 inline-block" /> Booked/Blocked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-950/40 inline-block" /> Your Event
        </span>
      </div>

      {/* Selected Date Actions */}
      {selectedDate && !isPast && (
        <Card className={isAvailable ? 'border-emerald-800/50' : 'border-stone-700'}>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-100">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAvailable
                  ? `${chefName || 'Your chef'} is available`
                  : selected?.hasEvent
                    ? 'You already have an event this day'
                    : 'Not available'}
              </p>
            </div>
            {isAvailable && (
              <Link
                href={`/book-now?date=${selectedDate}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Book This Date
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
