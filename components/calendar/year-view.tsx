'use client'

import { useMemo } from 'react'

// ============================================
// TYPES
// ============================================

interface EventDot {
  date: string // YYYY-MM-DD
  status: string
  occasion: string | null
}

interface YearViewProps {
  year: number
  events: EventDot[]
  onMonthClick?: (month: number) => void
  onDateClick?: (date: string) => void
}

// ============================================
// HELPERS
// ============================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-500'
    case 'confirmed':
    case 'paid': return 'bg-blue-500'
    case 'in_progress': return 'bg-yellow-500'
    case 'proposed':
    case 'accepted': return 'bg-purple-400'
    case 'cancelled': return 'bg-red-400'
    case 'draft': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

// ============================================
// COMPONENT
// ============================================

export function YearView({ year, events, onMonthClick, onDateClick }: YearViewProps) {
  // Index events by date for O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventDot[]>()
    for (const e of events) {
      const existing = map.get(e.date) ?? []
      existing.push(e)
      map.set(e.date, existing)
    }
    return map
  }, [events])

  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-4">
      {MONTH_NAMES.map((name, monthIdx) => (
        <MonthGrid
          key={monthIdx}
          year={year}
          month={monthIdx}
          monthName={name}
          eventsByDate={eventsByDate}
          onMonthClick={onMonthClick}
          onDateClick={onDateClick}
        />
      ))}
    </div>
  )
}

// ============================================
// MONTH GRID
// ============================================

interface MonthGridProps {
  year: number
  month: number
  monthName: string
  eventsByDate: Map<string, EventDot[]>
  onMonthClick?: (month: number) => void
  onDateClick?: (date: string) => void
}

function MonthGrid({ year, month, monthName, eventsByDate, onMonthClick, onDateClick }: MonthGridProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = today.getDate()

  // Build grid cells: empty cells for offset, then day cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
      <button
        type="button"
        className="mb-1 w-full text-left text-sm font-semibold text-zinc-800 hover:text-orange-600 dark:text-zinc-200 dark:hover:text-orange-400"
        onClick={() => onMonthClick?.(month)}
      >
        {monthName}
      </button>

      {/* Day headers */}
      <div className="mb-0.5 grid grid-cols-7 gap-0">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-5" />
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate.get(dateStr) ?? []
          const isToday = isCurrentMonth && day === todayDate
          const hasEvents = dayEvents.length > 0

          return (
            <button
              key={dateStr}
              type="button"
              className={`
                relative flex h-5 items-center justify-center text-[10px]
                ${isToday ? 'font-bold text-orange-600 dark:text-orange-400' : 'text-zinc-600 dark:text-zinc-400'}
                ${hasEvents ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700' : ''}
                rounded
              `}
              onClick={() => hasEvents && onDateClick?.(dateStr)}
              title={hasEvents ? `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : undefined}
            >
              {day}
              {hasEvents && (
                <span className="absolute -bottom-0.5 left-1/2 flex -translate-x-1/2 gap-px">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <span
                      key={idx}
                      className={`inline-block h-1 w-1 rounded-full ${getStatusColor(e.status)}`}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
