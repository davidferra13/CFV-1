// Activity Tracker — Client-side component for recording page views
// Fires a POST to /api/activity/track on mount. Non-blocking, fire-and-forget.
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { ActivityEventType } from '@/lib/activity/types'

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
  const pathname = usePathname()

  useEffect(() => {
    const payloadMetadata = {
      page_path: pathname || undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      ...metadata,
    }

    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        metadata: payloadMetadata,
      }),
    }).catch(() => {
      // Silently ignore tracking failures
    })
  }, [entityId, entityType, eventType, metadata, pathname])

  return null
}
