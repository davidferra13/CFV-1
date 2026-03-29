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

    // Verify the channel contains the user's tenant ID (presence channels are tenant-scoped)
    const tenantId = session.user.tenantId
    if (!tenantId || !channel.includes(tenantId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    trackPresence(channel, sessionId, data ?? {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
