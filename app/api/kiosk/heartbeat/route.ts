// Kiosk Heartbeat API — updates last_seen, logs events (rate-limited)
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'

// In-memory rate limiter for heartbeat event inserts (1 per 5 min per device)
const lastEventInsert = new Map<string, number>()
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

    const supabase = createAdminClient()
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

    // Rate-limited event insert (at most 1 per 5 min)
    const lastInsert = lastEventInsert.get(device.deviceId) || 0
    if (Date.now() - lastInsert > EVENT_INSERT_INTERVAL_MS) {
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
        lastEventInsert.set(device.deviceId, Date.now())
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
