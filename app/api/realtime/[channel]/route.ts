import { NextRequest } from 'next/server'
import { subscribe, getPresenceState } from '@/lib/realtime/sse-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> }
) {
  const { channel } = await params

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
