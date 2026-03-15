'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { getUpcomingRecurringEvents, type Frequency } from '@/lib/scheduling/recurring-actions'

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export function RecurringPrepWidget() {
  const [events, setEvents] = useState<
    { scheduleId: string; title: string; clientName: string; date: string; frequency: Frequency }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getUpcomingRecurringEvents()
        if (!cancelled) {
          // Filter to just the next 7 days for the widget
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const weekOut = new Date(today)
          weekOut.setDate(weekOut.getDate() + 7)

          const thisWeek = data.filter((e) => {
            const d = new Date(e.date + 'T00:00:00')
            return d >= today && d < weekOut
          })
          setEvents(thisWeek)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-2">Recurring Preps This Week</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-2">Recurring Preps This Week</h3>
        <p className="text-sm text-red-600 dark:text-red-400">Could not load recurring schedules</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">Recurring Preps This Week</h3>

      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No recurring preps scheduled this week.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event, idx) => (
            <li
              key={`${event.scheduleId}-${event.date}-${idx}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{event.clientName}</span>
                <span className="text-gray-500 truncate">{event.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="default">{FREQUENCY_LABELS[event.frequency]}</Badge>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(event.date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {events.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          {events.length} recurring prep{events.length !== 1 ? 's' : ''} this week
        </p>
      )}
    </div>
  )
}
