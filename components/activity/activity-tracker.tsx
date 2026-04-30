// Activity Tracker - Client-side component for recording page views
// Fires a POST to /api/activity/track on mount. Non-blocking, fire-and-forget.
'use client'

import { useEffect, useRef } from 'react'
import type { ActivityEventType } from '@/lib/activity/types'
import { buildActivityTrackPayload } from '@/lib/activity/client-payload'
import { shouldShareActivitySignal, useLivePrivacy } from './live-privacy-controls'

interface ActivityTrackerProps {
  eventType: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export function ActivityTracker({
  eventType,
  entityType,
  entityId,
  metadata,
}: ActivityTrackerProps) {
  const { state, isReady } = useLivePrivacy()
  const trackedKeyRef = useRef<string | null>(null)
  const trackKey = `${eventType}:${entityType ?? ''}:${entityId ?? ''}`

  useEffect(() => {
    if (!isReady) return
    if (!shouldShareActivitySignal(eventType, state)) return
    if (trackedKeyRef.current === trackKey) return

    trackedKeyRef.current = trackKey

    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildActivityTrackPayload({
          eventType,
          entityType,
          entityId,
          metadata,
        })
      ),
    }).catch(() => {
      // Silently ignore tracking failures
    })
  }, [eventType, entityType, entityId, metadata, isReady, state, trackKey])

  return null
}
