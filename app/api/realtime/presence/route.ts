import { NextRequest, NextResponse } from 'next/server'
import { trackPresence } from '@/lib/realtime/sse-server'
import { auth } from '@/lib/auth'
import { hasPersistedAdminAccessForAuthUser } from '@/lib/auth/admin-access'
import { validateRealtimeChannelAccess } from '@/lib/realtime/channel-access'

function normalizePresenceData(
  data: unknown,
  authContext: {
    email: string | null
    role: 'anonymous' | 'authenticated'
    userId: string | null
  }
) {
  const base =
    data && typeof data === 'object' && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>) }
      : {}

  return {
    ...base,
    email: authContext.email,
    role: authContext.role,
    userId: authContext.userId,
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()

  try {
    const { channel, sessionId, data } = await request.json()

    if (!channel || !sessionId) {
      return NextResponse.json({ error: 'Missing channel or sessionId' }, { status: 400 })
    }

    if (channel === 'site') {
      trackPresence(
        channel,
        sessionId,
        normalizePresenceData(data, {
          email: session?.user?.email ?? null,
          role: session?.user?.id ? 'authenticated' : 'anonymous',
          userId: session?.user?.id ?? null,
        })
      )
      return NextResponse.json({ ok: true })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await validateRealtimeChannelAccess(channel, {
      isAdmin: await hasPersistedAdminAccessForAuthUser(session.user.id),
      tenantId: session.user.tenantId ?? null,
      userId: session.user.id,
    })

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    trackPresence(
      channel,
      sessionId,
      normalizePresenceData(data, {
        email: session.user.email ?? null,
        role: 'authenticated',
        userId: session.user.id,
      })
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
