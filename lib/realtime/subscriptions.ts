/**
 * Supabase Realtime subscription hooks
 * Item #46: Realtime Subscriptions / WebSockets
 *
 * Provides React hooks for live data updates via Supabase Realtime.
 * Uses Supabase's Postgres Changes API (Broadcast + Presence available for chat).
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

import { useEffect, useRef, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Supabase browser client (singleton per page) ────────────────────────────

function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ─── Event status subscription ───────────────────────────────────────────────

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
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onStatusChange)
  callbackRef.current = onStatusChange

  useEffect(() => {
    if (!eventId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`event-status:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const newRecord = payload.new as { status?: string }
          const oldRecord = payload.old as { status?: string }
          if (newRecord.status && newRecord.status !== oldRecord.status) {
            callbackRef.current(newRecord.status, oldRecord.status ?? '')
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [eventId])
}

// ─── Notification subscription ────────────────────────────────────────────────

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

  useEffect(() => {
    if (!tenantId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`notifications:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as RealtimeNotification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])
}

// ─── Chat message subscription ────────────────────────────────────────────────

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

  useEffect(() => {
    if (!conversationId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as RealtimeMessage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])
}

// ─── Activity feed subscription ───────────────────────────────────────────────

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

  useEffect(() => {
    if (!tenantId) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`activity:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chef_activity_log',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          callbackRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])
}

// ─── Generic table subscription ───────────────────────────────────────────────

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Low-level hook for subscribing to any Postgres Changes event.
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

  const stableOptions = useCallback(
    () => options,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channelName, options.event, options.table, options.schema, options.filter]
  )

  useEffect(() => {
    const opts = stableOptions()
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: opts.event as '*',
          schema: opts.schema ?? 'public',
          table: opts.table,
          ...(opts.filter ? { filter: opts.filter } : {}),
        },
        (payload) => {
          callbackRef.current({
            new: payload.new as T,
            old: payload.old as Partial<T>,
            eventType: payload.eventType as RealtimeEvent,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, stableOptions])
}
