// Real-Time Chat Subscriptions (SSE-based)
// Uses Server-Sent Events for message delivery, typing indicators, and presence
// Client-side only - used in 'use client' components

'use client'

import type { ChatMessage } from './types'

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
 * Subscribe to new messages in a specific conversation.
 * Returns an unsubscribe function.
 */
export function subscribeToChatMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  return createSSESubscription<ChatMessage>(`chat_messages:${conversationId}`, 'INSERT', onMessage)
}

/**
 * Subscribe to conversation updates (inbox reordering).
 * Fires when a conversation's last_message fields are updated.
 */
export function subscribeToInboxUpdates(
  tenantId: string,
  onUpdate: (conversation: Record<string, unknown>) => void
): () => void {
  return createSSESubscription<Record<string, unknown>>(
    `conversations:${tenantId}`,
    'UPDATE',
    onUpdate
  )
}

// ============================================
// TYPING INDICATORS (SSE + REST)
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
  onTypingChange: (state: TypingState) => void
) {
  const es = new EventSource(`/api/realtime/${encodeURIComponent(`typing:chat:${conversationId}`)}`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.event === 'typing') {
        onTypingChange(msg.data as TypingState)
      }
    } catch {
      // Ignore parse errors
    }
  }

  const sendTyping = (isTyping: boolean) => {
    fetch('/api/realtime/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: `chat:${conversationId}`,
        userId: currentUserId,
        isTyping,
      }),
    }).catch(() => {
      // Non-blocking side effect
    })
  }

  const unsubscribe = () => {
    es.close()
  }

  return { sendTyping, unsubscribe }
}

// ============================================
// PRESENCE (Online/Offline via SSE + REST)
// ============================================

/**
 * Subscribe to presence in a conversation.
 * Tracks which participants are online.
 */
export function subscribeToPresence(
  conversationId: string,
  userId: string,
  onPresenceChange: (onlineUserIds: string[]) => void
): () => void {
  const sessionId = `${userId}:${Date.now()}`
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  // POST presence heartbeat
  function sendPresence() {
    fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: `chat:${conversationId}`,
        sessionId,
        data: { userId, online_at: new Date().toISOString() },
      }),
    }).catch(() => {
      // Non-blocking side effect
    })
  }

  // Listen for presence state via SSE
  const es = new EventSource(
    `/api/realtime/${encodeURIComponent(`presence:chat:${conversationId}`)}`
  )

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (
        msg.event === 'presence_sync' ||
        msg.event === 'presence_join' ||
        msg.event === 'presence_leave'
      ) {
        const state = msg.data
        // Extract online user IDs from the presence state
        const onlineUserIds = Object.values(state)
          .map((p: any) => p?.userId as string)
          .filter(Boolean)
        onPresenceChange(onlineUserIds)
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Start heartbeat on open
  es.onopen = () => {
    sendPresence()
    heartbeatInterval = setInterval(sendPresence, 30000) // Every 30s
  }

  return () => {
    es.close()
    if (heartbeatInterval) clearInterval(heartbeatInterval)
  }
}
