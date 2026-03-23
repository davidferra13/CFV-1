import { NextRequest, NextResponse } from 'next/server'
import { broadcastTyping } from '@/lib/realtime/broadcast'

export async function POST(request: NextRequest) {
  try {
    const { channel, userId, isTyping } = await request.json()

    if (!channel || !userId) {
      return NextResponse.json({ error: 'Missing channel or userId' }, { status: 400 })
    }

    broadcastTyping(channel, userId, isTyping ?? false)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
