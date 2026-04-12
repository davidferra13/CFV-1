'use client'

// EventStatusWatcher
// Subscribes to the per-event SSE channel and calls router.refresh() when
// the chef transitions the event status. Gives clients a live view without
// full-page polling. Renders nothing.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function EventStatusWatcher({ eventId }: { eventId: string }) {
  const router = useRouter()

  useEffect(() => {
    const channel = encodeURIComponent(`client-event:${eventId}`)
    const es = new EventSource(`/api/realtime/${channel}`)

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'status_changed') {
          // Re-render the server component with fresh data
          router.refresh()
        }
      } catch {
        // Ignore heartbeats and parse errors
      }
    }

    return () => {
      es.close()
    }
  }, [eventId, router])

  return null
}
