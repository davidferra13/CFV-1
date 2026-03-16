// SessionHeartbeat - fires periodic session_heartbeat events while a client is
// actively on a high-value page. Enables time-on-page tracking for engagement scoring.
// Fire-and-forget; never blocks the UI.
'use client'

import { useEffect, useRef } from 'react'

interface SessionHeartbeatProps {
  entityType?: string
  entityId?: string
  /** How often to fire the heartbeat. Defaults to 60 seconds. */
  intervalMs?: number
}

export function SessionHeartbeat({
  entityType,
  entityId,
  intervalMs = 60_000,
}: SessionHeartbeatProps) {
  const startTime = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsOnPage = Math.floor((Date.now() - startTime.current) / 1000)
      fetch('/api/activity/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'session_heartbeat',
          entity_type: entityType,
          entity_id: entityId,
          metadata: { seconds_on_page: secondsOnPage },
        }),
      }).catch(() => {
        // Silently ignore tracking failures
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [entityType, entityId, intervalMs])

  return null
}
