// POST /api/push/resubscribe
// Called by the service worker's pushsubscriptionchange event handler.
// Replaces the old subscription endpoint with a freshly-rotated one.
// The browser silently rotates subscriptions without user interaction.

import { NextResponse, type NextRequest } from 'next/server'
import { resubscribePushSubscription } from '@/lib/push/subscriptions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept both camelCase (from service worker) and snake_case field names
    const oldEndpoint = body.oldEndpoint ?? body.old_endpoint ?? null
    const sub = body.subscription ?? body.new_subscription

    if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
      return NextResponse.json({ error: 'Missing subscription fields: endpoint, p256dh, auth' }, { status: 400 })
    }

    await resubscribePushSubscription(oldEndpoint, {
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/push/resubscribe] Error:', err)
    return NextResponse.json({ error: 'Failed to resubscribe' }, { status: 500 })
  }
}
