// Kiosk End Session API — ends a staff session (idle timeout or manual)
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Device token required' }, { status: 401 })
    }

    const device = await validateDeviceToken(token)
    if (!device) {
      return NextResponse.json({ error: 'Invalid or inactive device' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { session_id, reason } = body

    const supabase: any = createAdminClient()
    const now = new Date().toISOString()

    if (session_id) {
      // End specific session
      await supabase
        .from('device_sessions')
        .update({ status: 'ended', ended_at: now })
        .eq('id', session_id)
        .eq('device_id', device.deviceId)
    } else {
      // End all active sessions for this device
      await supabase
        .from('device_sessions')
        .update({ status: 'ended', ended_at: now })
        .eq('device_id', device.deviceId)
        .eq('status', 'active')
    }

    // Log event
    try {
      await supabase.from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        type: 'session_ended',
        payload: {
          session_id: session_id || null,
          reason: reason || 'manual',
        },
      })
    } catch (e) {
      console.error('[kiosk/end-session] Event log failed (non-blocking):', e)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[kiosk/end-session] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
