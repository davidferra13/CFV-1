// Real-Time Chat Subscriptions
// Uses Supabase Realtime for message delivery, typing indicators, and presence
// Client-side only — used in 'use client' components

import { createBrowserClient } from '@supabase/ssr'
import type { ChatMessage } from './types'

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// ============================================
// MESSAGE SUBSCRIPTIONS (postgres_changes)
// ============================================

/**
 * Subscribe to new messages in a specific conversation.
 * Returns an unsubscribe function.
 */
export function subscribeToChatMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to conversation updates (inbox reordering).
 * Fires when a conversation's last_message fields are updated.
 */
export function subscribeToInboxUpdates(
  tenantId: string,
  onUpdate: (conversation: Record<string, unknown>) => void,
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`inbox:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        onUpdate(payload.new)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// TYPING INDICATORS (Broadcast — ephemeral)
// ============================================

export interface TypingState {
  userId: string
  userName: string
  isTyping: boolean
}

/**
 * Subscribe to typing indicators in a conversation.
 * Returns controls to send typing state and unsubscribe.
 */
export function createTypingIndicator(
  conversationId: string,
  currentUserId: string,
  currentUserName: string,
  onTypingChange: (state: TypingState) => void,
) {
  const supabase = getSupabaseClient()

  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  })

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      onTypingChange(payload.payload as TypingState)
    })
    .subscribe()

  const sendTyping = (isTyping: boolean) => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: currentUserId,
        userName: currentUserName,
        isTyping,
      },
    })
  }

  const unsubscribe = () => {
    supabase.removeChannel(channel)
  }

  return { sendTyping, unsubscribe }
}

// ============================================
// PRESENCE (Online/Offline)
// ============================================

/**
 * Subscribe to presence in a conversation.
 * Tracks which participants are online.
 */
export function subscribeToPresence(
  conversationId: string,
  userId: string,
  onPresenceChange: (onlineUserIds: string[]) => void,
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase.channel(`presence:${conversationId}`)

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const onlineUserIds = Object.values(state)
      .flat()
      .map((p: any) => p.userId as string)
    onPresenceChange(onlineUserIds)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        userId,
        online_at: new Date().toISOString(),
      })
    }
  })

  return () => {
    supabase.removeChannel(channel)
  }
}
