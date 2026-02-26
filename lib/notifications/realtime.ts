// Real-Time Notification Subscriptions
// Uses Supabase Realtime postgres_changes for live delivery
// Client-side only - used in 'use client' components

import { createBrowserClient } from '@supabase/ssr'
import type { Notification } from './types'

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Subscribe to new notifications for a specific user.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  recipientId: string,
  onNotification: (notification: Notification) => void
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`notifications:${recipientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
