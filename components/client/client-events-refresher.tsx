'use client'

// ClientEventsRefresher
// Listens to the notification SSE (via NotificationContext) and calls
// router.refresh() when an event-related notification arrives.
// Used on the /my-events list page so status badges update live when
// the chef transitions any event - no second SSE connection needed.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/components/notifications/notification-provider'

const EVENT_CATEGORIES = new Set(['event', 'payment'])

export function ClientEventsRefresher() {
  const router = useRouter()
  const { addNotificationListener } = useNotifications()

  useEffect(() => {
    return addNotificationListener((notification) => {
      if (EVENT_CATEGORIES.has(notification.category)) {
        router.refresh()
      }
    })
  }, [addNotificationListener, router])

  return null
}
