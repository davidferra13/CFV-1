/**
 * Realtime subscription hooks (SSE-based)
 * Item #46: Realtime Subscriptions
 *
 * Provides React hooks for live data updates via Server-Sent Events.
 * Replaces Supabase Realtime postgres_changes with SSE infrastructure.
 *
 * Key events supported:
 *   - Event status changes (FSM transitions)
 *   - New notifications
 *   - New chat messages
 *   - Activity feed updates
 *
 * Usage:
 *   // In a client component:
 *   useEventStatusSubscription(eventId, (newStatus) => {
 *     router.refresh()
 *   })
 */

'use client'

import { useRef } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'

// ---- Event status subscription ----

/**
 * Subscribes to realtime status changes for a specific event.
 * Calls onStatusChange whenever the event's status column is updated.
 *
 * @example
 * useEventStatusSubscription(eventId, (newStatus) => {
 *   setCurrentStatus(newStatus)
 *   router.refresh()
 * })
 */
export function useEventStatusSubscription(
  eventId: string | null,
  onStatusChange: (newStatus: string, oldStatus: string) => void
) {
  const callbackRef = useRef(onStatusChange)
  callbackRef.current = onStatusChange

  useSSE(`events:${eventId}`, {
    enabled: !!eventId,
    onMessage: (msg) => {
      if (msg.event === 'UPDATE') {
        const newRecord = msg.data?.new as { status?: string } | undefined
        const oldRecord = msg.data?.old as { status?: string } | undefined
        if (newRecord?.status && newRecord.status !== oldRecord?.status) {
          callbackRef.current(newRecord.status, oldRecord?.status ?? '')
        }
      }
    },
  })
}

// ---- Notification subscription ----

export interface RealtimeNotification {
  id: string
  title: string
  body: string
  action_url: string | null
  category: string
  created_at: string
}

/**
 * Subscribes to new notifications for the current chef.
 * Calls onNotification for each new notification row.
 *
 * @example
 * useNotificationSubscription(tenantId, (n) => {
 *   toast(n.title)
 *   setUnreadCount(c => c + 1)
 * })
 */
export function useNotificationSubscription(
  tenantId: string | null,
  onNotification: (notification: RealtimeNotification) => void
) {
  const callbackRef = useRef(onNotification)
  callbackRef.current = onNotification

  useSSE(`notifications:${tenantId}`, {
    enabled: !!tenantId,
    onMessage: (msg) => {
      if (msg.event === 'INSERT') {
        callbackRef.current(msg.data?.new as RealtimeNotification)
      }
    },
  })
}

// ---- Chat message subscription ----

export interface RealtimeMessage {
  id: string
  content: string
  sender_role: string
  sender_id: string | null
  created_at: string
  message_type: string
}

/**
 * Subscribes to new chat messages in a conversation.
 * Calls onMessage for each new message, filtered by conversation_id.
 *
 * @example
 * useChatMessageSubscription(conversationId, (msg) => {
 *   setMessages(prev => [...prev, msg])
 * })
 */
export function useChatMessageSubscription(
  conversationId: string | null,
  onMessage: (message: RealtimeMessage) => void
) {
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useSSE(`chat:${conversationId}`, {
    enabled: !!conversationId,
    onMessage: (msg) => {
      if (msg.event === 'INSERT') {
        callbackRef.current(msg.data?.new as RealtimeMessage)
      }
    },
  })
}

// ---- Activity feed subscription ----

/**
 * Subscribes to new chef activity log entries for a tenant.
 * Useful for live activity feeds on the dashboard.
 *
 * @example
 * useActivityFeedSubscription(tenantId, () => {
 *   router.refresh() // Refresh the activity list
 * })
 */
export function useActivityFeedSubscription(tenantId: string | null, onActivity: () => void) {
  const callbackRef = useRef(onActivity)
  callbackRef.current = onActivity

  useSSE(`activity:${tenantId}`, {
    enabled: !!tenantId,
    onMessage: (msg) => {
      if (msg.event === 'INSERT') {
        callbackRef.current()
      }
    },
  })
}

// ---- Generic table subscription ----

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Low-level hook for subscribing to any table change event via SSE.
 * Prefer the typed hooks above for specific use cases.
 */
export function useTableSubscription<T extends Record<string, unknown>>(
  channelName: string,
  options: {
    event: RealtimeEvent | '*'
    table: string
    schema?: string
    filter?: string
    onData: (payload: { new: T; old: Partial<T>; eventType: RealtimeEvent }) => void
  }
) {
  const callbackRef = useRef(options.onData)
  callbackRef.current = options.onData

  // Derive channel from filter value if present, otherwise use channelName
  const filterValue = options.filter?.split('=eq.')[1]
  const sseChannel = filterValue ? `${options.table}:${filterValue}` : channelName

  useSSE(sseChannel, {
    onMessage: (msg) => {
      const eventType = msg.event as RealtimeEvent
      if (options.event === '*' || eventType === options.event) {
        callbackRef.current({
          new: msg.data?.new as T,
          old: (msg.data?.old ?? {}) as Partial<T>,
          eventType,
        })
      }
    },
  })
}
