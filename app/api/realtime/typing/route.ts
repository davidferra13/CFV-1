import { NextRequest, NextResponse } from 'next/server'
import { broadcastTyping } from '@/lib/realtime/broadcast'
import { auth } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/auth/admin-access'
import { validateRealtimeChannelAccess } from '@/lib/realtime/channel-access'

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

    const allowed = await validateRealtimeChannelAccess(channel, {
      isAdmin: await hasAdminAccess(userId),
      tenantId: session.user.tenantId ?? null,
      userId,
    })

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    broadcastTyping(channel, userId, isTyping ?? false)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
