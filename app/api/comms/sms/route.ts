import { NextRequest, NextResponse } from 'next/server'
import { parseInboundWebhook } from '@/lib/sms/twilio-client'
import { timingSafeEqual } from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'
import { ingestManagedInboundCommunication } from '@/lib/communication/managed-ingest'
import { resolveManagedInboundChannel } from '@/lib/communication/managed-channels'
import { validateTwilioSignature } from '@/lib/communication/twilio-webhook'

function buildInboundContent(input: {
  body: string
  channel: 'sms' | 'whatsapp'
  numMedia: number
}) {
  const body = input.body.trim()
  if (body) return body
  if (input.numMedia > 0) {
    return `${input.channel.toUpperCase()} media message (${input.numMedia} attachment${input.numMedia === 1 ? '' : 's'})`
  }
  return ''
}

function getWebhookUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://app.cheflowhq.com'

  return `${base.replace(/\/+$/, '')}${pathname}`
}

function twiml(status = 200) {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status,
    headers: { 'Content-Type': 'text/xml' },
  })
}

// Twilio sends incoming SMS as x-www-form-urlencoded POST requests.
// JSON + bearer auth remains as a compatibility path for manual forwarding,
// but tenant ownership is still resolved by the managed channel record.
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`sms-inbound:${ip}`, 30, 60_000)
  } catch {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  try {
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

    let from = ''
    let toNumber = ''
    let body = ''
    let timestamp: string | undefined
    let channel: 'sms' | 'whatsapp' = 'sms'
    let messageSid: string | null = null
    let numMedia = 0
    let twilioParams: Record<string, string> = {}

    if (isTwilioFormat) {
      const rawText = await request.text()
      twilioParams = Object.fromEntries(new URLSearchParams(rawText))
      const parsed = parseInboundWebhook(twilioParams)

      from = parsed.from
      toNumber = parsed.to
      body = parsed.body
      channel = parsed.channel
      messageSid = parsed.messageSid || null
      numMedia = parsed.numMedia

      const managedChannel = await resolveManagedInboundChannel({
        channel,
        address: toNumber,
      })

      const twilioSignature = request.headers.get('x-twilio-signature')
      if (!managedChannel?.authToken || !twilioSignature) {
        return twiml(401)
      }

      const webhookUrl = getWebhookUrl('/api/comms/sms')
      const isTwilioVerified = validateTwilioSignature({
        authToken: managedChannel.authToken,
        url: webhookUrl,
        params: twilioParams,
        signature: twilioSignature,
      })

      if (!isTwilioVerified) {
        console.warn('[sms-inbound] Invalid Twilio signature - rejecting')
        return twiml(401)
      }
    } else {
      if (!isBearerAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      let json: Record<string, unknown>
      try {
        json = await request.json()
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      from = String(json.from ?? '')
      body = String(json.body ?? '')
      toNumber = String(json.to ?? '')
      timestamp = typeof json.timestamp === 'string' ? json.timestamp : undefined
      channel = json.channel === 'whatsapp' ? 'whatsapp' : 'sms'
    }

    if (!from || !toNumber) {
      return NextResponse.json({ error: 'Missing required fields: from, to' }, { status: 400 })
    }

    const rawContent = buildInboundContent({ body, channel, numMedia })
    if (!rawContent) {
      return isTwilioFormat
        ? twiml()
        : NextResponse.json({ ok: true, routed: false, reason: 'empty_body' })
    }

    const result = await ingestManagedInboundCommunication({
      channel,
      toAddress: toNumber,
      senderIdentity: from,
      rawContent,
      timestamp,
      externalId: messageSid,
      providerName: isTwilioFormat ? 'twilio' : 'manual_forward',
      legacyMessage: {
        enabled: true,
        body: rawContent,
      },
    })

    if (!result.routed) {
      return isTwilioFormat
        ? twiml()
        : NextResponse.json(
            { error: 'Could not determine which managed channel this message belongs to' },
            { status: 422 }
          )
    }

    return isTwilioFormat
      ? twiml()
      : NextResponse.json({
          ok: true,
          routed: true,
          deduped: result.deduped,
          tenantId: result.tenantId,
        })
  } catch (error) {
    console.error('[sms-inbound] Error processing inbound message:', error)
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 })
  }
}
