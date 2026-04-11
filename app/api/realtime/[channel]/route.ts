import { NextRequest } from 'next/server'
import { subscribe, getPresenceState } from '@/lib/realtime/sse-server'
import { auth } from '@/lib/auth'
import { hasPersistedAdminAccessForAuthUser } from '@/lib/auth/admin-access'
import { validateRealtimeChannelAccess } from '@/lib/realtime/channel-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Validate that the authenticated user owns or has access to the requested channel.
 *
 * Channel naming convention:
 *   notifications:{userId}        - recipient-scoped notification feed
 *   activity:{tenantId}           - tenant-scoped activity feed
 *   activity_events:{tenantId}    - legacy tenant-scoped activity alias
 *   conversations:{tenantId}      - tenant-scoped inbox ordering updates
 *   events:{eventId}              - event status updates (verified by tenant ownership)
 *   chat:{conversationId}         - conversation updates (verified by tenant ownership)
 *   chat_messages:{conversationId}- legacy conversation alias
 *   typing:{innerChannel}         - typing indicators (validates the inner channel recursively)
 *   presence:{innerChannel}       - presence tracking (validates the inner channel recursively)
 *   presence:site                 - admin-only sitewide presence stream
 *
 * Security: fails closed. Unknown prefixes are denied. substring matching is not used.
 */
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
  const allowed = await validateRealtimeChannelAccess(channel, {
    isAdmin: await hasPersistedAdminAccessForAuthUser(session.user.id),
    tenantId: session.user.tenantId ?? null,
    userId: session.user.id,
  })
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
