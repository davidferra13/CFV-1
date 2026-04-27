// Kiosk Check-In API - fetches today's events and handles guest check-in
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'
import { getKioskEvents, checkInGuest, addWalkInGuest } from '@/lib/devices/kiosk-checkin-actions'
import { PUBLIC_INTAKE_JSON_BODY_MAX_BYTES, readJsonBodyWithLimit } from '@/lib/api/request-body'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const MAX_CHECKINS = 30
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

const CheckInSchema = z.object({
  event_id: z.string().uuid(),
  name_or_email: z.string().min(1, 'Name or email is required').max(200),
  is_walk_in: z.boolean().optional().default(false),
  walk_in_email: z.string().email().optional(),
})

// GET - fetch today's events for this device's chef
export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Device token required' }, { status: 401 })
    }

    const device = await validateDeviceToken(token)
    if (!device) {
      return NextResponse.json({ error: 'Invalid or inactive device' }, { status: 401 })
    }

    const result = await getKioskEvents(device.tenantId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ events: result.data })
  } catch (err) {
    console.error('[kiosk/checkin] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - check in a guest or add a walk-in
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

    const db: any = createAdminClient()

    // Rate limit check
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count: recentCount } = await db
      .from('device_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device.deviceId)
      .eq('type', 'guest_checkin')
      .gte('created_at', windowStart)

    if ((recentCount ?? 0) >= MAX_CHECKINS) {
      return NextResponse.json({ error: 'Too many check-ins. Please wait.' }, { status: 429 })
    }

    const bodyResult = await readJsonBodyWithLimit(request, {
      maxBytes: PUBLIC_INTAKE_JSON_BODY_MAX_BYTES,
      invalidJsonMessage: 'Invalid check-in request body',
      payloadTooLargeMessage: 'Check-in request body is too large',
    })
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status })
    }

    const parsed = CheckInSchema.parse(bodyResult.data)

    let result

    if (parsed.is_walk_in) {
      // Add as walk-in guest
      const walkInResult = await addWalkInGuest(
        device.tenantId,
        parsed.event_id,
        parsed.name_or_email,
        parsed.walk_in_email
      )

      if (!walkInResult.success) {
        return NextResponse.json({ error: walkInResult.error || 'Walk-in failed' }, { status: 500 })
      }

      result = {
        success: true,
        found: false,
        walk_in: true,
        guest: {
          id: walkInResult.guest_id,
          full_name: parsed.name_or_email,
          email: parsed.walk_in_email || null,
          dietary_restrictions: [],
          allergies: [],
          dietary_notes: null,
          plus_one: false,
          plus_one_name: null,
          rsvp_status: 'attending',
        },
      }
    } else {
      // Search existing guest list
      result = await checkInGuest(device.tenantId, parsed.event_id, parsed.name_or_email)
    }

    // Log device event (non-blocking)
    try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      await db.from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        type: 'guest_checkin',
        payload: {
          event_id: parsed.event_id,
          guest_name: parsed.name_or_email,
          found: result.found ?? false,
          walk_in: parsed.is_walk_in,
          ip,
        },
      })
    } catch (e) {
      console.error('[kiosk/checkin] Event log failed (non-blocking):', e)
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }
    console.error('[kiosk/checkin] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
