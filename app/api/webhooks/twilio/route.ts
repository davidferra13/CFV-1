// Twilio Inbound Webhook - receives SMS and WhatsApp messages
// Stores them in the messages table for the unified inbox
// URL: POST /api/webhooks/twilio (configure in Twilio console)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { parseInboundWebhook } from '@/lib/sms/twilio-client'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Validate Twilio request signature to prevent forged webhook submissions.
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // Build the data string: URL + sorted param key/value pairs
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const expectedSignature = createHmac('sha1', authToken).update(data).digest('base64')

  // Timing-safe comparison using crypto.timingSafeEqual
  if (expectedSignature.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const text = await request.text()
    const params = Object.fromEntries(new URLSearchParams(text))

    // Validate Twilio signature - reject forged requests
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioSignature = request.headers.get('x-twilio-signature')
    if (twilioAuthToken && twilioSignature) {
      const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/api/webhooks/twilio`
      if (!validateTwilioSignature(twilioAuthToken, webhookUrl, params, twilioSignature)) {
        console.warn('[twilio-webhook] Invalid signature - rejecting forged request')
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { 'Content-Type': 'text/xml' },
          status: 403,
        })
      }
    } else if (twilioAuthToken && !twilioSignature) {
      // Auth token configured but no signature header - reject
      console.warn('[twilio-webhook] Missing X-Twilio-Signature header - rejecting')
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 403,
      })
    } else {
      // Fail-closed: reject if TWILIO_AUTH_TOKEN is not configured
      console.error('[twilio-webhook] TWILIO_AUTH_TOKEN not configured - rejecting all webhooks')
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 503,
      })
    }
    const msg = parseInboundWebhook(params)

    if (!msg.body && msg.numMedia === 0) {
      // Empty message - acknowledge but don't store
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const db: any = createAdminClient()

    // Try to match inbound phone to a client
    // Strip formatting: +1 (555) 123-4567 → search for various formats
    const digits = msg.from.replace(/\D/g, '')
    const searchPatterns = [msg.from, `+${digits}`, digits]

    let clientId: string | null = null
    let tenantId: string | null = null

    for (const pattern of searchPatterns) {
      const { data: client } = await (db
        .from('clients')
        .select('id, tenant_id')
        .ilike('phone', `%${pattern.slice(-10)}%`)
        .limit(1)
        .single() as any)

      if (client) {
        clientId = (client as any).id
        tenantId = (client as any).tenant_id
        break
      }
    }

    // Store the message (even if we can't match a client - it'll show as unlinked)
    const { error: insertError } = await (db as any).from('messages').insert({
      tenant_id: tenantId,
      client_id: clientId,
      direction: 'inbound',
      channel: msg.channel,
      body: msg.body,
      status: 'received',
      metadata: {
        twilio_sid: msg.messageSid,
        from_phone: msg.from,
        media_count: msg.numMedia,
        media_urls: msg.mediaUrls,
      },
    })

    if (insertError) {
      console.error('[twilio-webhook] Failed to store inbound message:', insertError.message)
      try {
        const { recordSideEffectFailure } = await import('@/lib/monitoring/non-blocking')
        await recordSideEffectFailure({
          source: 'twilio-webhook',
          operation: 'insert_message',
          severity: 'critical',
          entityType: 'message',
          tenantId,
          errorMessage: insertError.message,
          context: { from: msg.from, twilio_sid: msg.messageSid },
        })
      } catch {
        // Already logged above
      }
      // Return 500 so Twilio retries delivery rather than silently dropping the message
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 500,
      })
    }

    // Mid-service alert: if chef has an in_progress event today, surface via Remy (non-blocking)
    if (clientId && tenantId && !insertError) {
      try {
        const _twt = new Date()
        const today = `${_twt.getFullYear()}-${String(_twt.getMonth() + 1).padStart(2, '0')}-${String(_twt.getDate()).padStart(2, '0')}`
        const { data: activeEvent } = await (db as any)
          .from('events')
          .select('id, occasion')
          .eq('tenant_id', tenantId)
          .eq('status', 'in_progress')
          .eq('event_date', today)
          .limit(1)
          .single()

        if (activeEvent) {
          const { data: clientRow } = await (db as any)
            .from('clients')
            .select('full_name')
            .eq('id', clientId)
            .single()

          const clientName = clientRow?.full_name ?? 'A client'
          const raw = (msg.body ?? '').trim()
          const excerpt = raw.length > 120 ? raw.slice(0, 117) + '...' : raw

          await (db as any).from('remy_alerts').insert({
            tenant_id: tenantId,
            alert_type: 'mid_service_message',
            entity_type: 'event',
            entity_id: activeEvent.id,
            title: `Message from ${clientName} during service`,
            body: excerpt
              ? `"${excerpt}" - Queued for after service. Check /inbox when done.`
              : 'New inbound message while you are in service. Review inbox after service.',
            priority: 'high',
          })
        }
      } catch {
        // Non-blocking - do not interrupt the Twilio response
      }
    }

    // Twilio expects TwiML response
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[twilio-webhook] Error processing inbound message:', err)
    // Return 500 so Twilio retries — a 200 here would silently drop the message
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    })
  }
}
