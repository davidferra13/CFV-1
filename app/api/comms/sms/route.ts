import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ingestInboundSms } from '@/lib/sms/ingest'
import { FOUNDER_EMAIL } from '@/lib/platform/owner-account'
import { timingSafeEqual, createHmac } from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'

/**
 * Validate Twilio request signature (HMAC-SHA1).
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }
  const expectedSignature = createHmac('sha1', authToken).update(data).digest('base64')
  if (expectedSignature.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

async function getFounderChefId(supabase: any): Promise<string | null> {
  const { data: founder } = await supabase
    .from('chefs')
    .select('id')
    .ilike('email', FOUNDER_EMAIL)
    .maybeSingle()

  return founder?.id ?? null
}

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

  // Accept bearer token OR Twilio webhook (cryptographically verified signature)
  const isTwilioFormat = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded')
  const twilioSignature = request.headers.get('x-twilio-signature')
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

  // For Twilio format: verify the HMAC-SHA1 signature cryptographically
  let isTwilioVerified = false
  let twilioParams: Record<string, string> = {}
  if (isTwilioFormat && twilioSignature && twilioAuthToken) {
    const rawText = await request.text()
    twilioParams = Object.fromEntries(new URLSearchParams(rawText))
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/api/comms/sms`
    isTwilioVerified = validateTwilioSignature(
      twilioAuthToken,
      webhookUrl,
      twilioParams,
      twilioSignature
    )
    if (!isTwilioVerified) {
      console.warn('[sms-inbound] Invalid Twilio signature — rejecting')
    }
  }

  if (!isBearerAuth && !isTwilioVerified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let from: string
  let body: string
  let toNumber: string | undefined
  let timestamp: string | undefined

  if (isTwilioFormat) {
    // Twilio webhook format — already parsed into twilioParams above
    from = twilioParams['From'] ?? ''
    body = twilioParams['Body'] ?? ''
    toNumber = twilioParams['To'] ?? undefined
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
      // This is our Twilio number — for single-admin setups, prefer founder account.
      tenantId = await getFounderChefId(supabase)
      if (!tenantId) {
        const { data: chef } = await supabase.from('chefs').select('id').limit(1).single()
        tenantId = chef?.id ?? null
      }
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

    // Ultimate fallback for single-admin setup: prefer founder, then first chef.
    if (!tenantId) {
      tenantId = await getFounderChefId(supabase)
      if (!tenantId) {
        const { data: chef } = await supabase.from('chefs').select('id').limit(1).single()
        tenantId = chef?.id ?? null
      }
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
    return NextResponse.json({ error: 'SMS processing failed' }, { status: 500 })
  }
}
