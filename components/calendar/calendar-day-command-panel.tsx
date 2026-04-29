'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { UnifiedCalendarItem } from '@/lib/calendar/types'
import type { CalendarConflict } from '@/lib/calendar/conflict-engine'

type Props = {
  selectedDate: string
  visibleItems: UnifiedCalendarItem[]
  waitlistMatches: UnifiedCalendarItem[]
  conflicts: CalendarConflict[]
  onAddEntry: () => void
  onClose: () => void
}

function formatSelectedDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CalendarDayCommandPanel({
  selectedDate,
  visibleItems,
  waitlistMatches,
  conflicts,
  onAddEntry,
  onClose,
}: Props) {
  const eventCount = visibleItems.filter((item) => item.type === 'event').length
  const blockingCount = visibleItems.filter((item) => item.isBlocking).length
  const prepCount = visibleItems.filter((item) => item.type === 'prep_block').length

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-100">{formatSelectedDate(selectedDate)}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={eventCount > 0 ? 'info' : 'default'}>{eventCount} events</Badge>
            <Badge variant={blockingCount > 0 ? 'warning' : 'default'}>
              {blockingCount} blocking
            </Badge>
            <Badge variant={prepCount > 0 ? 'info' : 'default'}>{prepCount} prep</Badge>
            {conflicts.length > 0 && <Badge variant="error">{conflicts.length} conflicts</Badge>}
          </div>
        </div>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-300 p-1">
          <span className="sr-only">Close day panel</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onAddEntry}>
          Add Entry
        </Button>
        <Button href={`/events/new?date=${selectedDate}`} variant="secondary" size="sm">
          Create Event
        </Button>
        <Button href={`/calendar/week?date=${selectedDate}`} variant="secondary" size="sm">
          Add Prep Block
        </Button>
        <Button href="/calls/new" variant="ghost" size="sm">
          Add Call
        </Button>
        <Button href="/calendar/week" variant="ghost" size="sm">
          Week Planner
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Conflicts</p>
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-100">{conflict.title}</p>
                <Badge variant={conflict.severity === 'critical' ? 'error' : 'warning'}>
                  {conflict.severity}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-stone-500">{conflict.description}</p>
            </div>
          ))}
        </div>
      )}

      {waitlistMatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Waitlist Matches
            </p>
            <Button href="/schedule" variant="ghost" size="sm">
              Open Waitlist
            </Button>
          </div>
          {waitlistMatches.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
              <p className="text-sm font-medium text-stone-100">{item.title}</p>
              <p className="mt-1 text-xs text-stone-500">
                Requested {item.startDate}
                {item.endDate !== item.startDate ? ` to ${item.endDate}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Day Items</p>
        {visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-700 px-3 py-4 text-sm text-stone-500">
            No visible items match the current filters for this date.
          </p>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: item.color + '18',
                borderLeft: `3px ${item.borderStyle} ${item.color}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-100 truncate">{item.title}</p>
                {item.startTime && (
                  <p className="text-xs text-stone-500">
                    {item.startTime}
                    {item.endTime ? ` - ${item.endTime}` : ''}
                  </p>
                )}
                {item.status && <p className="text-xs text-stone-500 capitalize">{item.status}</p>}
              </div>
              {item.url && (
                <a href={item.url} className="text-xs text-brand-600 hover:underline flex-shrink-0">
                  View
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
