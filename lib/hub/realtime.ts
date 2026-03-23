// =============================================================================
// Social Event Hub - Realtime Subscriptions (SSE-based)
// Client-side only - used in 'use client' components
// Uses SSE infrastructure instead of Supabase Realtime
// =============================================================================

'use client'

import type { HubMessage } from './types'

// ============================================
// Helper: create an EventSource subscription
// ============================================

function createSSESubscription<T>(
  channel: string,
  eventFilter: string,
  onData: (record: T) => void
): () => void {
  const es = new EventSource(`/api/realtime/${encodeURIComponent(channel)}`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.event === eventFilter) {
        onData(msg.data?.new as T)
      }
    } catch {
      // Ignore parse errors (heartbeats, etc.)
    }
  }

  return () => {
    es.close()
  }
}

// ============================================
// MESSAGE SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to new messages in a hub group.
 * Returns an unsubscribe function.
 */
export function subscribeToHubMessages(
  groupId: string,
  onMessage: (message: HubMessage) => void
): () => void {
  return createSSESubscription<HubMessage>(`hub_messages:${groupId}`, 'INSERT', onMessage)
}

/**
 * Subscribe to message updates (edits, pins, reactions, deletes).
 */
export function subscribeToHubMessageUpdates(
  groupId: string,
  onUpdate: (message: HubMessage) => void
): () => void {
  return createSSESubscription<HubMessage>(`hub_messages_updates:${groupId}`, 'UPDATE', onUpdate)
}

// ============================================
// TYPING INDICATORS (SSE + REST)
// ============================================

/**
 * Create a typing indicator channel for a hub group.
 * Returns { sendTyping, subscribe, unsubscribe }.
 */
export function createHubTypingIndicator(groupId: string) {
  let es: EventSource | null = null

  return {
    /**
     * Broadcast that this user is typing.
     */
    sendTyping: (profileId: string, displayName: string) => {
      fetch('/api/realtime/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `hub:${groupId}`,
          userId: profileId,
          isTyping: true,
        }),
      }).catch(() => {
        // Non-blocking side effect
      })
    },

    /**
     * Subscribe to typing events from other users.
     */
    subscribe: (onTyping: (data: { profileId: string; displayName: string }) => void) => {
      es = new EventSource(`/api/realtime/${encodeURIComponent(`typing:hub:${groupId}`)}`)

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.event === 'typing') {
            onTyping(msg.data as { profileId: string; displayName: string })
          }
        } catch {
          // Ignore parse errors
        }
      }
    },

    /**
     * Clean up the channel.
     */
    unsubscribe: () => {
      if (es) {
        es.close()
        es = null
      }
    },
  }
}

// ============================================
// MEMBER UPDATES (new members joining)
// ============================================

/**
 * Subscribe to new members joining a group.
 */
export function subscribeToGroupMembers(
  groupId: string,
  onMemberJoined: (member: { profile_id: string }) => void
): () => void {
  return createSSESubscription<{ profile_id: string }>(
    `hub_group_members:${groupId}`,
    'INSERT',
    onMemberJoined
  )
}
