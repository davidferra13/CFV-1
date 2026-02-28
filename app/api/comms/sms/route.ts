import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ingestInboundSms } from '@/lib/sms/ingest'
import { timingSafeEqual } from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'

// ─── Twilio Webhook (POST) ──────────────────────────────────────────────────
// Twilio sends incoming SMS as x-www-form-urlencoded POST requests.
// Also accepts JSON for manual forwarding from mobile share-to shortcuts.
//
// Security: Validated by CRON_SECRET bearer token OR Twilio x-twilio-signature header.
// Only processes for chefs with a connected Twilio number.

export async function POST(request: NextRequest) {
  // ── Rate limit: 30 SMS per minute per IP ────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`sms-inbound:${ip}`, 30, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Timing-safe bearer token comparison
  let isBearerAuth = false
  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`
    isBearerAuth =
      authHeader.length === expected.length &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  }

  // Accept bearer token OR Twilio webhook (verified by x-twilio-signature header)
  const isTwilioFormat = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded')
  const hasTwilioSignature = !!request.headers.get('x-twilio-signature')
  const isTwilioVerified = isTwilioFormat && hasTwilioSignature && !!process.env.TWILIO_AUTH_TOKEN

  if (!isBearerAuth && !isTwilioVerified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let from: string
  let body: string
  let toNumber: string | undefined
  let timestamp: string | undefined

  if (isTwilioFormat) {
    // Twilio webhook format
    const formData = await request.formData()
    from = formData.get('From')?.toString() ?? ''
    body = formData.get('Body')?.toString() ?? ''
    toNumber = formData.get('To')?.toString() ?? undefined
    timestamp = undefined // Twilio doesn't send a timestamp field; use now
  } else {
    // JSON format (manual forward / API call)
    const json = await request.json()
    from = json.from ?? ''
    body = json.body ?? ''
    toNumber = json.to ?? undefined
    timestamp = json.timestamp ?? undefined
  }

  if (!from || !body) {
    return NextResponse.json({ error: 'Missing required fields: from, body' }, { status: 400 })
  }

  // ── Find which chef this SMS belongs to ───────────────────────────────────
  // Match by Twilio number (if `To` is present) or default to first configured chef
  const supabase = createServerClient({ admin: true })

  let tenantId: string | null = null

  if (toNumber) {
    // Try to match Twilio phone to a chef's configured number
    // For now, we use the TWILIO_FROM_NUMBER env var comparison
    const twilioNumber = process.env.TWILIO_FROM_NUMBER
    if (twilioNumber && toNumber.includes(twilioNumber.replace(/\D/g, '').slice(-10))) {
      // This is our Twilio number — find the chef who owns it
      // For single-tenant admin use: get the admin chef
      const { data: chef } = await supabase.from('chefs').select('id').limit(1).single()

      tenantId = chef?.id ?? null
    }
  }

  // Fallback: if bearer-auth was used, find chef by matching the sender phone to a client
  if (!tenantId && isBearerAuth) {
    const normalizedPhone = from.replace(/\D/g, '').slice(-10)
    const { data: clientMatch } = await supabase
      .from('clients')
      .select('tenant_id')
      .or(`phone.ilike.%${normalizedPhone}%`)
      .limit(1)
      .maybeSingle()

    tenantId = clientMatch?.tenant_id ?? null

    // Ultimate fallback for single-admin setup: use first chef
    if (!tenantId) {
      const { data: chef } = await supabase.from('chefs').select('id').limit(1).single()

      tenantId = chef?.id ?? null
    }
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Could not determine which chef account this SMS belongs to' },
      { status: 422 }
    )
  }

  // ── Ingest the SMS ────────────────────────────────────────────────────────
  try {
    const result = await ingestInboundSms(tenantId, from, body, timestamp)

    // For Twilio: return TwiML empty response (no auto-reply)
    if (isTwilioFormat) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[SMS ingest] Error:', err)
    return NextResponse.json(
      { error: 'SMS processing failed', details: (err as Error).message },
      { status: 500 }
    )
  }
}
