// GET /api/push/vapid-public-key
// Returns the VAPID public key for use in PushManager.subscribe().
// The public key is not secret and safe to expose to the browser.

import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push/vapid'

export async function GET() {
  try {
    const key = getVapidPublicKey()
    return NextResponse.json({ key })
  } catch (err) {
    // VAPID keys not configured
    console.error('[GET /api/push/vapid-public-key] VAPID key not configured')
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 })
  }
}
