'use client'

// EventStatusWatcher
// Subscribes to the per-event SSE channel and calls router.refresh() when
// the chef transitions the event status. Gives clients a live view without
// full-page polling. Renders nothing.

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

export function EventStatusWatcher({ eventId }: { eventId: string }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const channel = encodeURIComponent(`client-event:${eventId}`)
    const es = new EventSource(`/api/realtime/${channel}`)

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.event === 'status_changed') {
          // Re-render the server component with fresh data
          trackedRouterRefresh(router, {
            pathname,
            source: 'event-status-watcher',
            entity: 'event',
            event: 'status_changed',
            reason: `client-event:${eventId}`,
          })
        }
      } catch {
        // Ignore heartbeats and parse errors
      }
    }

    return () => {
      es.close()
    }
  }, [eventId, pathname, router])

  return null
}
