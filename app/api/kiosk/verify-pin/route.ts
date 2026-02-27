// Kiosk PIN Verification API — validates staff PIN, creates device session
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken, validateStaffPin } from '@/lib/devices/token'

// Rate limiter: max 5 failed PIN attempts per device per 5 minutes
const failedAttempts = new Map<string, { count: number; resetAt: number }>()

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

    // Rate limit check
    const now = Date.now()
    const bucket = failedAttempts.get(device.deviceId) || { count: 0, resetAt: now + 300000 }
    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + 300000
    }
    if (bucket.count >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please wait 5 minutes.' },
        { status: 429 }
      )
    }

    const staff = await validateStaffPin(device.tenantId, pin)
    if (!staff) {
      // Track failed attempt
      bucket.count++
      failedAttempts.set(device.deviceId, bucket)

      // Log failed attempt (non-blocking)
      const supabase = createAdminClient()
      try {
        await supabase.from('device_events').insert({
          device_id: device.deviceId,
          tenant_id: device.tenantId,
          type: 'pin_failed',
          payload: { attempts_remaining: 5 - bucket.count },
        })
      } catch (e) {
        console.error('[kiosk/verify-pin] Event log failed (non-blocking):', e)
      }

      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Clear failed attempts on success
    failedAttempts.delete(device.deviceId)

    // Create device session
    const supabase = createAdminClient()
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
