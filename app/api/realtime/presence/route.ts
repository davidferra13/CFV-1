import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { trackPresence, toPresenceChannel } from '@/lib/realtime/sse-server'
import { auth } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/auth/admin-access'
import { validateRealtimeChannelAccess } from '@/lib/realtime/channel-access'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyCsrfOrigin } from '@/lib/security/csrf'

const presencePostSchema = z.object({
  channel: z.string().trim().min(1).max(200),
  sessionId: z.string().trim().min(1).max(120),
  data: z.object({}).passthrough().optional(),
})

function stringValue(value: unknown, fallback = '', maxLength = 300): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback
}

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
    page: stringValue(base.page, '/', 300),
    joinedAt: stringValue(base.joinedAt, new Date().toISOString(), 40),
    userAgent: stringValue(base.userAgent, '', 150),
    referrer: stringValue(base.referrer, '', 500),
    email: authContext.email,
    role: authContext.role,
    userId: authContext.userId,
  }
}

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  const session = await auth()

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    try {
      await checkRateLimit(`presence:${ip}`, 180, 60_000)
    } catch {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const parsed = presencePostSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid presence payload' }, { status: 400 })
    }

    const { channel, sessionId, data } = parsed.data
    const presenceChannel = toPresenceChannel(channel)

    if (channel === 'site') {
      trackPresence(
        presenceChannel,
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
      isAdmin: await hasAdminAccess(session.user.id),
      tenantId: session.user.tenantId ?? null,
      userId: session.user.id,
    })

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    trackPresence(
      presenceChannel,
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
