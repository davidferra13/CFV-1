// Kiosk Inquiry Submission API — creates client + inquiry + draft event
// Follows the same pattern as submitPublicInquiry but with device/staff attribution
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClientFromLead } from '@/lib/clients/actions'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'
import { z } from 'zod'

const KioskInquirySchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone or email is required').max(30).optional().or(z.literal('')),
  event_date: z
    .string()
    .min(1, 'Date is required')
    .refine((d) => {
      const date = new Date(d)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    }, 'Event date cannot be in the past'),
  party_size: z.number().int().positive().max(500),
  notes: z.string().max(2000).optional().or(z.literal('')),
  staff_member_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
})

const MAX_SUBMISSIONS = 10
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

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

    const supabase: any = createAdminClient()
    const tenantId = device.tenantId

    // DB-based rate limit — count recent submissions for this device
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count: recentCount } = await supabase
      .from('device_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device.deviceId)
      .eq('type', 'submitted_inquiry')
      .gte('created_at', windowStart)

    if ((recentCount ?? 0) >= MAX_SUBMISSIONS) {
      return NextResponse.json({ error: 'Too many submissions. Please wait.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = KioskInquirySchema.parse(body)

    // Must have at least email or phone
    const email = parsed.email?.trim()
    const phone = parsed.phone?.trim()
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400 })
    }

    // Duplicate inquiry detection — same name + date from same device within 5 min
    const dedupStart = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    const { count: dupeCount } = await supabase
      .from('device_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device.deviceId)
      .eq('type', 'submitted_inquiry')
      .gte('created_at', dedupStart)
      .contains('payload', { client_name: parsed.full_name.trim() })

    if ((dupeCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This inquiry was already submitted. Please start a new one.' },
        { status: 409 }
      )
    }

    // 1. Create or find client (use email if provided, otherwise phone as identifier)
    // For phone-only submissions, use a unique placeholder email to avoid collisions
    const clientEmail =
      email || `kiosk-${Date.now()}-${phone?.replace(/\D/g, '')}@placeholder.chefflow.local`

    let client: { id: string }
    try {
      client = await createClientFromLead(tenantId, {
        email: clientEmail.toLowerCase(),
        full_name: parsed.full_name.trim(),
        phone: phone || null,
        source: 'kiosk',
      })
    } catch (clientErr) {
      console.error('[kiosk/inquiry] Client creation failed:', clientErr)
      return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
    }

    // 2. Create inquiry
    const sourceMessage = [
      `Party size: ${parsed.party_size}`,
      phone ? `Phone: ${phone}` : null,
      parsed.notes?.trim() ? `Notes: ${parsed.notes.trim()}` : null,
      `Submitted via kiosk device`,
    ]
      .filter(Boolean)
      .join('\n')

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'kiosk',
        client_id: client.id,
        first_contact_at: new Date().toISOString(),
        confirmed_date: parsed.event_date,
        confirmed_guest_count: parsed.party_size,
        confirmed_occasion: 'Inquiry via kiosk',
        source_message: sourceMessage,
        unknown_fields: {
          notes: parsed.notes?.trim() || null,
          device_id: device.deviceId,
          staff_member_id: parsed.staff_member_id || null,
        },
        status: 'new',
      })
      .select('id')
      .single()

    if (inquiryError) {
      console.error('[kiosk/inquiry] Inquiry creation error:', inquiryError)
      return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })
    }

    // 3. Create draft event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        client_id: client.id,
        inquiry_id: inquiry.id,
        event_date: parsed.event_date,
        serve_time: 'TBD',
        guest_count: parsed.party_size,
        location_address: 'TBD',
        location_city: 'TBD',
        location_zip: 'TBD',
        occasion: 'Kiosk inquiry',
        special_requests: parsed.notes?.trim() || null,
      })
      .select('id')
      .single()

    if (!eventError && event) {
      // Log state transition
      await supabase.from('event_state_transitions').insert({
        tenant_id: tenantId,
        event_id: event.id,
        from_status: null,
        to_status: 'draft',
        metadata: {
          action: 'auto_created_from_kiosk',
          inquiry_id: inquiry.id,
          device_id: device.deviceId,
        },
      })

      // Link inquiry to event
      await supabase
        .from('inquiries')
        .update({ converted_to_event_id: event.id })
        .eq('id', inquiry.id)
    }

    // 4. Log device event
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    try {
      await supabase.from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: tenantId,
        staff_member_id: parsed.staff_member_id || null,
        type: 'submitted_inquiry',
        payload: {
          inquiry_id: inquiry.id,
          event_id: event?.id || null,
          client_name: parsed.full_name,
          ip,
        },
      })
    } catch (e) {
      console.error('[kiosk/inquiry] Event log failed (non-blocking):', e)
    }

    // 5. Push notification (non-blocking)
    try {
      const { getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        const { notifyNewInquiry } = await import('@/lib/notifications/onesignal')
        await notifyNewInquiry(chefUserId, parsed.full_name, parsed.event_date || 'date TBD')
      }
    } catch (err) {
      console.error('[kiosk/inquiry] Push notification failed (non-blocking):', err)
    }

    return NextResponse.json({ success: true, inquiry_id: inquiry.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }
    console.error('[kiosk/inquiry] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
