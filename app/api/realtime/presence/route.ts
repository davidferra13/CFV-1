import { NextRequest, NextResponse } from 'next/server'
import { trackPresence } from '@/lib/realtime/sse-server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Require authentication - presence data is tenant-scoped
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { channel, sessionId, data } = await request.json()

    if (!channel || !sessionId) {
      return NextResponse.json({ error: 'Missing channel or sessionId' }, { status: 400 })
    }

    // Verify the channel is tenant-scoped using structured parsing (not substring match)
    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const colonIdx = channel.indexOf(':')
    const channelTenantId = colonIdx !== -1 ? channel.substring(colonIdx + 1) : null
    if (channelTenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    trackPresence(channel, sessionId, data ?? {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
