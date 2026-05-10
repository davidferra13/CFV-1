'use client'

// Content Calendar
// Simple month grid showing scheduled content drafts by date.

import { useState, useEffect, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Calendar } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type ContentDraft, getScheduledDrafts } from '@/lib/content/post-event-content-actions'

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

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-900/50 text-yellow-400',
  review: 'bg-blue-900/50 text-blue-400',
  approved: 'bg-emerald-900/50 text-emerald-400',
  scheduled: 'bg-purple-900/50 text-purple-400',
  posted: 'bg-green-900/50 text-green-400',
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export default function ContentCalendar() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, startLoading] = useTransition()

  const loadDrafts = useCallback(() => {
    startLoading(async () => {
      try {
        const result = await getScheduledDrafts(month, year)
        setDrafts(result)
      } catch {
        toast.error('Failed to load scheduled drafts')
      }
    })
  }, [month, year])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
    setSelectedDay(null)
  }

  // Group drafts by day number
  const draftsByDay: Record<number, ContentDraft[]> = {}
  for (const draft of drafts) {
    if (draft.scheduled_for) {
      const day = new Date(draft.scheduled_for + 'T00:00:00').getDate()
      if (!draftsByDay[day]) draftsByDay[day] = []
      draftsByDay[day].push(draft)
    }
  }

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfWeek(month, year)
  const selectedDrafts = selectedDay ? (draftsByDay[selectedDay] ?? []) : []

  // Build calendar grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayDay = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : null

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold text-stone-200">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-stone-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-stone-800">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-stone-500 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const count = day ? (draftsByDay[day]?.length ?? 0) : 0
            const isToday = day === todayDay
            const isSelected = day === selectedDay

            return (
              <button
                key={i}
                disabled={day === null}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={[
                  'relative h-14 border-t border-r border-stone-700 text-sm transition-colors',
                  day === null
                    ? 'bg-stone-900/50 cursor-default'
                    : 'hover:bg-stone-700/50 cursor-pointer',
                  isSelected ? 'bg-stone-700' : 'bg-stone-800/50',
                  isToday ? 'ring-1 ring-inset ring-stone-500' : '',
                ].join(' ')}
              >
                {day !== null && (
                  <>
                    <span
                      className={`absolute top-1 left-2 text-xs ${isToday ? 'text-stone-100 font-bold' : 'text-stone-400'}`}
                    >
                      {day}
                    </span>
                    {count > 0 && (
                      <span className="absolute bottom-1 right-1">
                        <Badge
                          variant="default"
                          className="text-[10px] px-1.5 py-0 bg-stone-600 text-stone-200"
                        >
                          {count}
                        </Badge>
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading && <div className="text-center text-xs text-stone-500 py-2">Loading...</div>}

      {/* Selected Day Detail */}
      {selectedDay !== null && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-stone-300">
            {MONTH_NAMES[month - 1]} {selectedDay}, {year}
          </h4>
          {selectedDrafts.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              No drafts scheduled for this day.
            </p>
          ) : (
            selectedDrafts.map((draft) => (
              <Card key={draft.id} className="bg-stone-800 border-stone-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium text-stone-300 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-stone-500" />
                      {draft.platform.charAt(0).toUpperCase() + draft.platform.slice(1)}
                    </CardTitle>
                    <Badge
                      variant="default"
                      className={`text-[10px] ${STATUS_COLORS[draft.status] ?? ''}`}
                    >
                      {draft.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {draft.title && (
                    <p className="text-xs font-medium text-stone-200 mb-1">{draft.title}</p>
                  )}
                  <p className="text-xs text-stone-400 line-clamp-3 whitespace-pre-wrap">
                    {draft.draft_text}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && drafts.length === 0 && selectedDay === null && (
        <div className="text-center py-8">
          <Calendar className="mx-auto h-8 w-8 text-stone-500 mb-3" />
          <p className="text-stone-400">No scheduled content this month.</p>
          <p className="text-sm text-stone-500 mt-1">
            Schedule drafts to see them on the calendar.
          </p>
        </div>
      )}
    </div>
  )
}
