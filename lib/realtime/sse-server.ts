import { EventEmitter } from 'events'

// Global event bus (single process, shared across all requests)
const eventBus = new EventEmitter()
eventBus.setMaxListeners(500) // Support many concurrent SSE connections

// Channel-scoped event broadcasting
export function broadcast(channel: string, event: string, data: any) {
  eventBus.emit(channel, { event, data, timestamp: Date.now() })
}

export function toPresenceChannel(channel: string): string {
  return channel.startsWith('presence:') ? channel : `presence:${channel}`
}

// For SSE route handlers to subscribe
export function subscribe(
  channel: string,
  listener: (msg: { event: string; data: any; timestamp: number }) => void
) {
  eventBus.on(channel, listener)
  return () => {
    eventBus.off(channel, listener)
  }
}

// Get active listener count for a channel
export function getListenerCount(channel: string): number {
  return eventBus.listenerCount(channel)
}

// Presence tracking (in-memory)
const presenceStore = new Map<string, Map<string, { data: any; lastSeen: number }>>()

export function trackPresence(channel: string, sessionId: string, data: any) {
  if (!presenceStore.has(channel)) presenceStore.set(channel, new Map())
  presenceStore.get(channel)!.set(sessionId, { data, lastSeen: Date.now() })
  broadcast(channel, 'presence_join', { sessionId, ...data })
}

export function untrackPresence(channel: string, sessionId: string) {
  const channelPresence = presenceStore.get(channel)
  if (channelPresence) {
    const data = channelPresence.get(sessionId)
    channelPresence.delete(sessionId)
    if (channelPresence.size === 0) presenceStore.delete(channel)
    if (data) broadcast(channel, 'presence_leave', { sessionId, ...data.data })
  }
}

export function getPresenceState(channel: string): Record<string, any> {
  const channelPresence = presenceStore.get(channel)
  if (!channelPresence) return {}
  const state: Record<string, any> = {}
  const now = Date.now()
  for (const [sessionId, entry] of channelPresence) {
    // Expire entries older than 2 minutes
    if (now - entry.lastSeen > 120_000) {
      channelPresence.delete(sessionId)
      continue
    }
    state[sessionId] = entry.data
  }
  return state
}

// Clean up stale presence entries periodically
const presenceCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [channel, members] of presenceStore) {
    for (const [sessionId, entry] of members) {
      if (now - entry.lastSeen > 120_000) {
        members.delete(sessionId)
        broadcast(channel, 'presence_leave', { sessionId })
      }
    }
    if (members.size === 0) presenceStore.delete(channel)
  }
}, 30_000)

presenceCleanupInterval.unref?.()
