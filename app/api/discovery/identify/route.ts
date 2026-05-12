import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pgClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

const MAX_ANONYMOUS_ID_LEN = 128

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ ok: true })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true })
    }

    if (!body || typeof body !== 'object') return NextResponse.json({ ok: true })
    const anonymousId = (body as Record<string, unknown>).anonymous_id
    if (typeof anonymousId !== 'string' || !anonymousId.trim()) {
      return NextResponse.json({ ok: true })
    }

    const safeAnonymousId = anonymousId.slice(0, MAX_ANONYMOUS_ID_LEN)

    await pgClient`
      UPDATE discovery_interactions
      SET auth_user_id = ${session.user.id}::uuid
      WHERE anonymous_id = ${safeAnonymousId}
        AND auth_user_id IS NULL
    `

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
