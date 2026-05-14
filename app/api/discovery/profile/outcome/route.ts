import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  recordCulinaryProfileOutcome,
  sanitizeCulinaryOutcomeInput,
} from '@/lib/discovery/culinary-profile-persistence'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUserId = await requireDiscoveryAuthUserId()
    if (!authUserId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 })
    }

    const body = await safeJson(request)
    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
    }

    const outcome = sanitizeCulinaryOutcomeInput(body)
    if (!outcome) {
      return NextResponse.json({ ok: false, error: 'invalid_outcome' }, { status: 400 })
    }

    const result = await recordCulinaryProfileOutcome({
      ownerId: authUserId,
      actorId: authUserId,
      outcome,
    })

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      signalCount: result.signalCount,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'outcome_not_recorded' }, { status: 500 })
  }
}

async function requireDiscoveryAuthUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

async function safeJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
