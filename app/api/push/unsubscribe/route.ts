// POST /api/push/unsubscribe
// Called when the user revokes push permission in the settings UI.
// Marks the subscription as inactive in push_subscriptions.

import { NextResponse, type NextRequest } from 'next/server'
import { removePushSubscription } from '@/lib/push/subscriptions'

export async function POST(request: NextRequest) {
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
