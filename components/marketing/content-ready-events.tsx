'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { ContentReadyEvent } from '@/lib/content/post-event-content-types'
import { ContentDraftEditor } from './content-draft-editor'

export function ContentReadyEvents({ events }: { events: ContentReadyEvent[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
        <p className="text-sm text-stone-400">
          No completed events with photos yet. Complete an event and add photos to start creating
          content.
        </p>
      </div>
    )
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null

  return (
    <div className="space-y-6">
      {/* Event grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => {
          const isSelected = event.id === selectedEventId
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedEventId(isSelected ? null : event.id)}
              className={`
                w-full text-left rounded-lg border p-4 transition-colors
                ${
                  isSelected
                    ? 'border-amber-600 bg-stone-800'
                    : 'border-stone-700 bg-stone-800/50 hover:bg-stone-800 hover:border-stone-600'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-stone-100 truncate">
                  {event.occasion || 'Private Event'}
                </h3>
                <div className="flex gap-1 shrink-0">
                  {event.has_nda && <Badge variant="error">NDA</Badge>}
                </div>
              </div>

              <p className="text-sm text-stone-400 mt-1">
                {format(new Date(event.event_date), 'MMM d, yyyy')}
              </p>

              <div className="flex items-center gap-3 mt-3 text-xs text-stone-500">
                <span>{event.guest_count} guests</span>
                <Badge variant="info">{event.photo_count} photos</Badge>
                {event.draft_count > 0 && (
                  <Badge variant="default">
                    {event.draft_count} draft{event.draft_count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-stone-500 mt-2 truncate">{event.client_name}</p>
            </button>
          )
        })}
      </div>

      {/* Draft editor for selected event */}
      {selectedEvent && (
        <ContentDraftEditor
          key={selectedEvent.id}
          eventId={selectedEvent.id}
          eventOccasion={selectedEvent.occasion}
          hasNda={selectedEvent.has_nda}
        />
      )}
    </div>
  )
}
