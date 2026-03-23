// Real-Time Notification Subscriptions (SSE-based)
// Uses Server-Sent Events for live notification delivery
// Client-side only - used in 'use client' components

'use client'

import type { Notification } from './types'

/**
 * Subscribe to new notifications for a specific user.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  recipientId: string,
  onNotification: (notification: Notification) => void
): () => void {
  const es = new EventSource(`/api/realtime/${encodeURIComponent(`notifications:${recipientId}`)}`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.event === 'INSERT') {
        onNotification(msg.data?.new as Notification)
      }
    } catch {
      // Ignore parse errors (heartbeats, etc.)
    }
  }

  return () => {
    es.close()
  }
}
