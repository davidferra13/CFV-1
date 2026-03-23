import { NextRequest, NextResponse } from 'next/server'
import { trackPresence } from '@/lib/realtime/sse-server'

export async function POST(request: NextRequest) {
  try {
    const { channel, sessionId, data } = await request.json()

    if (!channel || !sessionId) {
      return NextResponse.json({ error: 'Missing channel or sessionId' }, { status: 400 })
    }

    trackPresence(channel, sessionId, data ?? {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
