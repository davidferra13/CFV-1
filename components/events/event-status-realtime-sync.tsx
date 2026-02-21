'use client'

/**
 * EventStatusRealtimeSync
 *
 * Invisible client component that subscribes to realtime event status changes
 * and refreshes the server-rendered page when the FSM state transitions.
 *
 * Because the event detail page is a Next.js server component, it can't hold
 * realtime subscriptions directly. This component is mounted inside the server
 * component and handles the subscription on the client side.
 *
 * When the event status changes (e.g., proposed → accepted via client portal),
 * the page automatically reflects the new state without a manual reload.
 */

import { useRouter } from 'next/navigation'
import { useEventStatusSubscription } from '@/lib/realtime/subscriptions'
import { useCallback } from 'react'

interface EventStatusRealtimeSyncProps {
  eventId: string
}

export function EventStatusRealtimeSync({ eventId }: EventStatusRealtimeSyncProps) {
  const router = useRouter()

  const handleStatusChange = useCallback(
    (newStatus: string, oldStatus: string) => {
      console.log(`[EventStatusRealtimeSync] ${oldStatus} → ${newStatus} (event ${eventId})`)
      // Refresh the server component tree to reflect the new status
      router.refresh()
    },
    [eventId, router]
  )

  useEventStatusSubscription(eventId, handleStatusChange)

  // Renders nothing — purely a side-effect component
  return null
}
