'use client'

// ClientEventsRefresher
// Listens to the notification SSE (via NotificationContext) and calls
// router.refresh() when an event-related notification arrives.
// Used on the /my-events list page so status badges update live when
// the chef transitions any event - no second SSE connection needed.

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useNotifications } from '@/components/notifications/notification-provider'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'

const EVENT_CATEGORIES = new Set(['event', 'payment'])

export function ClientEventsRefresher() {
  const router = useRouter()
  const pathname = usePathname()
  const { addNotificationListener } = useNotifications()

  useEffect(() => {
    return addNotificationListener((notification) => {
      if (EVENT_CATEGORIES.has(notification.category)) {
        trackedRouterRefresh(router, {
          pathname,
          source: 'client-events-refresher',
          entity: notification.category,
          event: notification.action,
          reason: 'event-notification',
        })
      }
    })
  }, [addNotificationListener, pathname, router])

  return null
}
