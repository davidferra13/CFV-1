// CIL Observer - Taps into the SSE EventEmitter bus
// Extracts tenant ID and entity IDs from broadcast channels
// and forwards as CIL signals.

let subscribed = false

// Channel patterns that carry CIL-relevant data
const CHANNEL_PATTERNS = [
  /^client-event:(.+)$/, // event status changes seen by client
  /^chef-dashboard:(.+)$/, // dashboard updates for a tenant
  /^event-collab:(.+)$/, // collaborator activity on events
]

export function subscribeToEvents(): void {
  if (subscribed) return
  subscribed = true

  // Monkey-patch broadcast to observe all events without knowing channels upfront.
  // This avoids needing to register listeners for every possible channel.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sse = require('@/lib/realtime/sse-server')
    const originalBroadcast = sse.broadcast

    sse.broadcast = function cilObservedBroadcast(channel: string, event: string, data: any) {
      // Call original first (CIL must not delay broadcasts)
      originalBroadcast(channel, event, data)

      // Fire-and-forget CIL observation
      observeBroadcast(channel, event, data).catch(() => {})
    }

    console.log('[CIL] SSE observer subscribed')
  } catch {
    console.warn('[CIL] SSE observer: could not subscribe (non-fatal)')
  }
}

async function observeBroadcast(channel: string, event: string, data: any): Promise<void> {
  // Extract entity IDs from channel name
  const entityIds: string[] = []
  let tenantId: string | null = null

  for (const pattern of CHANNEL_PATTERNS) {
    const match = channel.match(pattern)
    if (match) {
      const id = match[1]
      if (channel.startsWith('client-event:')) {
        entityIds.push(`event_${id}`)
      } else if (channel.startsWith('chef-dashboard:')) {
        tenantId = id
        entityIds.push(`chef_${id}`)
      } else if (channel.startsWith('event-collab:')) {
        entityIds.push(`event_${id}`)
      }
      break
    }
  }

  // Need at least a tenant ID to store
  if (!tenantId && data?.tenantId) tenantId = data.tenantId
  if (!tenantId && data?.tenant_id) tenantId = data.tenant_id
  if (!tenantId) return // Can't store without tenant

  if (entityIds.length === 0) return // Nothing to observe

  const { notifyCIL } = await import('./notify')
  await notifyCIL({
    tenantId,
    source: 'sse',
    entityIds,
    payload: {
      event_type: event,
      channel,
      ...(typeof data === 'object' && data !== null ? data : {}),
    },
  })
}
