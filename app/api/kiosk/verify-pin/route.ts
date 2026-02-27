// Kiosk PIN Verification API — validates staff PIN, creates device session
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken, validateStaffPin } from '@/lib/devices/token'

const MAX_PIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

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

    const body = await request.json()
    const { pin } = body

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    // DB-based rate limit — count recent pin_failed events for this device
    const supabase = createAdminClient()
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

    const { count: failedCount } = await supabase
      .from('device_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device.deviceId)
      .eq('type', 'pin_failed')
      .gte('created_at', windowStart)

    if ((failedCount ?? 0) >= MAX_PIN_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please wait 5 minutes.' },
        { status: 429 }
      )
    }

    const staff = await validateStaffPin(device.tenantId, pin)
    if (!staff) {
      // Log failed attempt to DB (serves as rate limit counter)
      try {
        await supabase.from('device_events').insert({
          device_id: device.deviceId,
          tenant_id: device.tenantId,
          type: 'pin_failed',
          payload: { attempts_remaining: MAX_PIN_ATTEMPTS - (failedCount ?? 0) - 1 },
        })
      } catch (e) {
        console.error('[kiosk/verify-pin] Event log failed (non-blocking):', e)
      }

      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Create device session
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const sessionNow = new Date().toISOString()

    // End any existing active sessions for this device, then insert new one
    // Using a single RPC call would be ideal, but sequential ops with the same
    // admin client are safe since each device can only have one active PIN entry at a time
    await supabase
      .from('device_sessions')
      .update({ status: 'ended', ended_at: sessionNow })
      .eq('device_id', device.deviceId)
      .eq('status', 'active')

    const { data: session, error } = await supabase
      .from('device_sessions')
      .insert({
        device_id: device.deviceId,
        staff_member_id: staff.id,
        user_agent: request.headers.get('user-agent') || null,
        ip,
        last_seen_at: sessionNow,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[kiosk/verify-pin] Session creation failed:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Log successful PIN verification
    try {
      await supabase.from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        staff_member_id: staff.id,
        type: 'pin_verified',
        payload: { session_id: session.id },
      })
    } catch (e) {
      console.error('[kiosk/verify-pin] Event log failed (non-blocking):', e)
    }

    return NextResponse.json({
      staff_member_id: staff.id,
      staff_name: staff.name,
      session_id: session.id,
    })
  } catch (err) {
    console.error('[kiosk/verify-pin] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
