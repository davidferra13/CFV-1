// Activity Tracker — Client-side component for recording page views
// Fires a POST to /api/activity/track on mount. Non-blocking, fire-and-forget.
'use client'

import { useEffect } from 'react'
import type { ActivityEventType } from '@/lib/activity/types'

interface ActivityTrackerProps {
  eventType: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export function ActivityTracker({ eventType, entityType, entityId, metadata }: ActivityTrackerProps) {
  useEffect(() => {
    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      }),
    }).catch(() => {
      // Silently ignore tracking failures
    })
  }, [eventType, entityType, entityId, metadata])

  return null
}
