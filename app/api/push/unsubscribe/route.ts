// POST /api/push/unsubscribe
// Called when the user revokes push permission in the settings UI.
// Marks the subscription as inactive in push_subscriptions.

import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/get-user'
import { removePushSubscription } from '@/lib/push/subscriptions'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`push-unsub:${ip}`, 10, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    await removePushSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/push/unsubscribe] Error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
