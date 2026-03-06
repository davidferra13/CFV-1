// File AAR Button — Opens a picker of completed events without AARs
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { getEventsWithoutAAR } from '@/lib/aar/actions'
import { format } from 'date-fns'
import { ClipboardCheck } from '@/components/ui/icons'

type EventWithClient = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number | null
  client: { id: string; full_name: string } | null
}

export function FileAARButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<EventWithClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    getEventsWithoutAAR()
      .then((data) => setEvents(data as EventWithClient[]))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false))
  }, [open])

  const handleSelect = (eventId: string) => {
    setOpen(false)
    router.push(`/events/${eventId}/aar`)
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ File AAR</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-stone-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-100">File Event Review</h3>
              <button
                onClick={handleClose}
                aria-label="Close modal"
                className="text-stone-400 hover:text-stone-400 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-stone-500">
              Select a completed event to file an Event Review.
            </p>

            {error && <Alert variant="error">{error}</Alert>}

            {/* Event List */}
            <div className="max-h-72 overflow-y-auto border border-stone-700 rounded-lg divide-y divide-stone-800">
              {loading ? (
                <div className="p-8 text-center text-sm text-stone-400">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardCheck className="w-10 h-10 text-green-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-stone-300">All caught up!</p>
                  <p className="text-xs text-stone-400 mt-1">No completed events need AARs.</p>
                </div>
              ) : (
                events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleSelect(event.id)}
                    className="w-full text-left px-4 py-3 hover:bg-stone-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-stone-100 text-sm truncate">
                          {event.occasion || 'Untitled Event'}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {event.client?.full_name || 'No client'}
                          {' \u00B7 '}
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                          {event.guest_count && ` \u00B7 ${event.guest_count} guests`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
