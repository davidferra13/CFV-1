// Real-Time Message Subscriptions (SSE-based)
// Uses Server-Sent Events instead of SSE realtime
// Client-side only - used in 'use client' components

'use client'

/**
 * Subscribe to real-time message updates for a specific entity.
 * Uses SSE (no SSE realtime needed).
 *
 * Usage:
 *   const unsub = subscribeToMessages('inquiry_id', inquiryId, (msg) => { ... })
 *   // later: unsub()
 */
export function subscribeToMessages(
  filterColumn: 'inquiry_id' | 'event_id' | 'client_id',
  filterValue: string,
  onMessage: (payload: { new: Record<string, unknown> }) => void
) {
  const channel = `messages:${filterValue}`
  const es = new EventSource(`/api/realtime/${encodeURIComponent(channel)}`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.event === 'INSERT') {
        onMessage({ new: msg.data?.new as Record<string, unknown> })
      }
    } catch {
      // Ignore parse errors (heartbeats, etc.)
    }
  }

  return () => {
    es.close()
  }
}

/**
 * Subscribe to real-time notification events for a chef.
 * Listens for new messages across all entities.
 */
export function subscribeToChefNotifications(
  recipientId: string,
  onNotification: (payload: { new: Record<string, unknown> }) => void
) {
  const channel = `notifications:${recipientId}`
  const es = new EventSource(`/api/realtime/${encodeURIComponent(channel)}`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.event === 'INSERT') {
        onNotification({ new: msg.data?.new as Record<string, unknown> })
      }
    } catch {
      // Ignore parse errors (heartbeats, etc.)
    }
  }

  return () => {
    es.close()
  }
}
