// =============================================================================
// Social Event Hub - Realtime Subscriptions
// Client-side only - used in 'use client' components
// Mirrors the pattern from lib/chat/realtime.ts
// =============================================================================

import { createClient } from '@/lib/supabase/client'
import type { HubMessage } from './types'

function getSupabaseClient() {
  return createClient()
}

// ============================================
// MESSAGE SUBSCRIPTIONS (postgres_changes)
// ============================================

/**
 * Subscribe to new messages in a hub group.
 * Returns an unsubscribe function.
 */
export function subscribeToHubMessages(
  groupId: string,
  onMessage: (message: HubMessage) => void
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`hub:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hub_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onMessage(payload.new as HubMessage)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to message updates (edits, pins, reactions, deletes).
 */
export function subscribeToHubMessageUpdates(
  groupId: string,
  onUpdate: (message: HubMessage) => void
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`hub-updates:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hub_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onUpdate(payload.new as HubMessage)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// TYPING INDICATORS (broadcast)
// ============================================

/**
 * Create a typing indicator channel for a hub group.
 * Returns { sendTyping, subscribe, unsubscribe }.
 */
export function createHubTypingIndicator(groupId: string) {
  const supabase = getSupabaseClient()

  const channel = supabase.channel(`hub-typing:${groupId}`)

  return {
    /**
     * Broadcast that this user is typing.
     */
    sendTyping: (profileId: string, displayName: string) => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { profileId, displayName, timestamp: Date.now() },
      })
    },

    /**
     * Subscribe to typing events from other users.
     */
    subscribe: (onTyping: (data: { profileId: string; displayName: string }) => void) => {
      channel
        .on('broadcast', { event: 'typing' }, (payload) => {
          onTyping(payload.payload as { profileId: string; displayName: string })
        })
        .subscribe()
    },

    /**
     * Clean up the channel.
     */
    unsubscribe: () => {
      supabase.removeChannel(channel)
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
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`hub-members:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hub_group_members',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onMemberJoined(payload.new as { profile_id: string })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
