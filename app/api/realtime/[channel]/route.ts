import { NextRequest } from 'next/server'
import { subscribe, getPresenceState } from '@/lib/realtime/sse-server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { events, conversations } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Validate that the authenticated user owns or has access to the requested channel.
 *
 * Channel naming convention:
 *   notifications:{tenantId}  - chef's notification feed
 *   activity:{tenantId}       - chef's activity feed
 *   events:{eventId}          - event status updates (verified via tenant_id on events table)
 *   chat:{conversationId}     - chat messages (verified via tenant_id on conversations table)
 *   presence:{innerChannel}   - presence tracking (validates the inner channel recursively)
 *
 * Security: fails closed. Unknown prefixes are denied. substring matching is not used.
 */
async function validateChannelAccess(channel: string, tenantId: string | null): Promise<boolean> {
  const colonIdx = channel.indexOf(':')
  if (colonIdx === -1) return false
  const prefix = channel.substring(0, colonIdx)
  const id = channel.substring(colonIdx + 1)
  if (!id) return false

  switch (prefix) {
    case 'notifications':
    case 'activity':
      // Tenant-scoped channels: ID must exactly match the user's tenant
      return !!tenantId && id === tenantId

    case 'events': {
      // Event channels: verify the event belongs to this tenant
      if (!tenantId) return false
      const [event] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.id, id), eq(events.tenantId, tenantId)))
        .limit(1)
      return !!event
    }

    case 'chat': {
      // Chat channels: verify the conversation belongs to this tenant
      if (!tenantId) return false
      const [convo] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
        .limit(1)
      return !!convo
    }

    case 'presence':
      // Presence channels wrap another channel (e.g., presence:chat:abc)
      return validateChannelAccess(id, tenantId)

    default:
      // Unknown channel prefix: deny by default (fail closed)
      return false
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  // Require authentication - SSE channels contain tenant-scoped private data
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { channel } = await params

  // Verify the user has access to this specific channel (not just any channel)
  const tenantId = session.user.tenantId ?? null
  const allowed = await validateChannelAccess(channel, tenantId)
  if (!allowed) {
    return new Response('Forbidden', { status: 403 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ event: 'connected', data: { channel }, timestamp: Date.now() })}\n\n`
        )
      )

      // If this is a presence channel, send current state
      if (channel.startsWith('presence:')) {
        const state = getPresenceState(channel)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ event: 'presence_sync', data: state, timestamp: Date.now() })}\n\n`
          )
        )
      }

      // Subscribe to channel events
      unsubscribe = subscribe(channel, (msg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        } catch {
          // Stream closed
        }
      })

      // Heartbeat every 30 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          // Stream closed
        }
      }, 30_000)
    },
    cancel() {
      if (unsubscribe) unsubscribe()
      if (heartbeatInterval) clearInterval(heartbeatInterval)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
