// POST /api/push/subscribe
// Receives a Web Push subscription object from the browser after PushManager.subscribe()
// and persists it via savePushSubscription().

import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/get-user'
import { savePushSubscription } from '@/lib/push/subscriptions'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { endpoint, p256dh, auth, deviceLabel } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, p256dh, auth' },
        { status: 400 }
      )
    }

    await savePushSubscription({ endpoint, p256dh, auth, deviceLabel })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/push/subscribe] Error:', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
