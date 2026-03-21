'use client'

// AAR Prompt Banner
// Displays a nudge to create an After Action Review for recently completed events.
// Shows event name and date with a link to AAR creation and a dismiss button.
// Dismissed state is local only (per-session, not persisted).

import { useEffect, useState, useTransition } from 'react'
import { getEventsNeedingAAR, type EventNeedingAAR } from '@/lib/events/aar-prompt-actions'

interface Props {
  tenantId: string
}

export function AARPromptBanner({ tenantId }: Props) {
  const [events, setEvents] = useState<EventNeedingAAR[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getEventsNeedingAAR(tenantId)
        setEvents(result)
        setError(false)
      } catch {
        setEvents([])
        setError(true)
      }
    })
  }, [tenantId])

  const visibleEvents = events.filter((e) => !dismissed.has(e.eventId))

  if (isPending || error || visibleEvents.length === 0) return null

  const handleDismiss = (eventId: string) => {
    setDismissed((prev) => new Set([...prev, eventId]))
  }

  return (
    <div className="space-y-2">
      {visibleEvents.map((event) => {
        const formattedDate = new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

        const eventLabel = event.occasion
          ? `${event.occasion} for ${event.clientName}`
          : `Event for ${event.clientName}`

        const urgency =
          event.daysSinceEvent >= 5
            ? 'border-amber-700 bg-amber-950/30'
            : 'border-brand-700 bg-brand-950/30'

        return (
          <div
            key={event.eventId}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${urgency}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200">
                You completed <span className="font-semibold text-zinc-100">{eventLabel}</span> on{' '}
                {formattedDate}.{' '}
                {event.daysSinceEvent <= 2
                  ? 'Capture your thoughts while they are fresh.'
                  : `It has been ${event.daysSinceEvent} days. Don't let the details fade.`}
              </p>
            </div>

            <a
              href={`/events/${event.eventId}/aar`}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors whitespace-nowrap"
            >
              Create AAR
            </a>

            <button
              onClick={() => handleDismiss(event.eventId)}
              className="text-zinc-500 hover:text-zinc-300 text-xs whitespace-nowrap transition-colors"
              title="Dismiss this reminder"
            >
              Dismiss
            </button>
          </div>
        )
      })}
    </div>
  )
}
