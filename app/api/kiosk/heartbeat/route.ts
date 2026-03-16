// Kiosk Heartbeat API - updates last_seen, logs events (rate-limited)
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'

const EVENT_INSERT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Device token required' }, { status: 401 })
    }

    const device = await validateDeviceToken(token)
    if (!device) {
      return NextResponse.json(
        { error: 'Invalid or inactive device', status: 'revoked' },
        { status: 401 }
      )
    }

    const supabase: any = createAdminClient()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const body = await request.json().catch(() => ({}))
    const now = new Date().toISOString()

    // Always update last_seen_at and last_ip on the device
    await supabase
      .from('devices')
      .update({
        last_seen_at: now,
        last_ip: ip,
        app_version: body.app_version || null,
      })
      .eq('id', device.deviceId)

    // DB-based rate-limited event insert (at most 1 per 5 min)
    const windowStart = new Date(Date.now() - EVENT_INSERT_INTERVAL_MS).toISOString()
    const { count: recentHeartbeats } = await supabase
      .from('device_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device.deviceId)
      .eq('type', 'heartbeat')
      .gte('created_at', windowStart)

    if ((recentHeartbeats ?? 0) === 0) {
      try {
        await supabase.from('device_events').insert({
          device_id: device.deviceId,
          tenant_id: device.tenantId,
          type: 'heartbeat',
          payload: {
            ip,
            route: body.current_route || null,
            app_version: body.app_version || null,
          },
        })
      } catch (e) {
        console.error('[kiosk/heartbeat] Event log failed (non-blocking):', e)
      }
    }

    return NextResponse.json({
      status: device.status,
      idle_timeout_seconds: device.idleTimeoutSeconds,
      require_staff_pin: device.requireStaffPin,
    })
  } catch (err) {
    console.error('[kiosk/heartbeat] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
