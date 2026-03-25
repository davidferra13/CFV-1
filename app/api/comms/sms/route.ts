import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { ingestInboundSms } from '@/lib/sms/ingest'
import { resolveOwnerChefId } from '@/lib/platform/owner-account'
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

// Twilio sends incoming SMS as x-www-form-urlencoded POST requests.
// Also accepts JSON for manual forwarding from mobile share-to shortcuts.
// Security: Validated by CRON_SECRET bearer token OR Twilio signature.
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`sms-inbound:${ip}`, 30, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  let isBearerAuth = false
  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`
    isBearerAuth =
      authHeader.length === expected.length &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  }

  const isTwilioFormat = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded')
  const twilioSignature = request.headers.get('x-twilio-signature')
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

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
      console.warn('[sms-inbound] Invalid Twilio signature - rejecting')
    }
  }

  if (!isBearerAuth && !isTwilioVerified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let from: string
  let body: string
  let toNumber: string | undefined
  let timestamp: string | undefined

  if (isTwilioFormat) {
    from = twilioParams['From'] ?? ''
    body = twilioParams['Body'] ?? ''
    toNumber = twilioParams['To'] ?? undefined
    timestamp = undefined
  } else {
    const json = await request.json()
    from = json.from ?? ''
    body = json.body ?? ''
    toNumber = json.to ?? undefined
    timestamp = json.timestamp ?? undefined
  }

  if (!from || !body) {
    return NextResponse.json({ error: 'Missing required fields: from, body' }, { status: 400 })
  }

  const db = createServerClient({ admin: true })
  let tenantId: string | null = null

  if (toNumber) {
    const twilioNumber = process.env.TWILIO_FROM_NUMBER
    if (twilioNumber && toNumber.includes(twilioNumber.replace(/\D/g, '').slice(-10))) {
      tenantId = await resolveOwnerChefId(db)
    }
  }

  // Fallback: if bearer auth was used, find tenant via matching client phone.
  if (!tenantId && isBearerAuth) {
    const normalizedPhone = from.replace(/\D/g, '').slice(-10)
    const { data: clientMatch } = await db
      .from('clients')
      .select('tenant_id')
      .or(`phone.ilike.%${normalizedPhone}%`)
      .limit(1)
      .maybeSingle()

    tenantId = clientMatch?.tenant_id ?? null

    if (!tenantId) {
      tenantId = await resolveOwnerChefId(db)
    }
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Could not determine which chef account this SMS belongs to' },
      { status: 422 }
    )
  }

  try {
    const result = await ingestInboundSms(tenantId, from, body, timestamp)

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
