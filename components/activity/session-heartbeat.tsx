// SessionHeartbeat - fires periodic session_heartbeat events while a client is
// actively on a high-value page. Enables time-on-page tracking for engagement scoring.
// Fire-and-forget; never blocks the UI.
'use client'

import { useEffect, useRef } from 'react'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'
import { shouldShareActivitySignal, useLivePrivacy } from './live-privacy-controls'

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
  const { state, isReady } = useLivePrivacy()

  useEffect(() => {
    if (!isReady) return
    if (!shouldShareActivitySignal('session_heartbeat', state)) return

    const interval = setInterval(() => {
      const secondsOnPage = Math.floor((Date.now() - startTime.current) / 1000)
      fetch('/api/activity/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildActivityTrackPayload({
            eventType: 'session_heartbeat',
            entityType,
            entityId,
            metadata: { seconds_on_page: secondsOnPage },
          })
        ),
      }).catch(() => {
        // Silently ignore tracking failures
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [entityType, entityId, intervalMs, isReady, state])

  return null
}
