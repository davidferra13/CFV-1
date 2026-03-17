import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to real-time message updates for a specific entity.
 * Uses Supabase Realtime (no separate WebSocket server needed).
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
  const supabase = createClient()

  const channel = supabase
    .channel(`messages:${filterColumn}:${filterValue}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `${filterColumn}=eq.${filterValue}`,
      },
      onMessage
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to real-time notification events for a chef.
 * Listens for new messages across all entities.
 */
export function subscribeToChefNotifications(
  tenantId: string,
  onNotification: (payload: { new: Record<string, unknown> }) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`notifications:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      onNotification
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
