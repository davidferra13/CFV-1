import { NextRequest, NextResponse } from 'next/server'
import { broadcastTyping } from '@/lib/realtime/broadcast'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Require authentication - typing indicators are tenant-scoped
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { channel, isTyping } = await request.json()

    if (!channel) {
      return NextResponse.json({ error: 'Missing channel' }, { status: 400 })
    }

    // Use the authenticated user's ID (never trust client-supplied userId)
    const userId = session.user.id

    // Verify the channel contains the user's tenant ID
    const tenantId = session.user.tenantId
    if (!tenantId || !channel.includes(tenantId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    broadcastTyping(channel, userId, isTyping ?? false)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
