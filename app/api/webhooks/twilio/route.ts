// Twilio Inbound Webhook — receives SMS and WhatsApp messages
// Stores them in the messages table for the unified inbox
// URL: POST /api/webhooks/twilio (configure in Twilio console)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseInboundWebhook } from '@/lib/sms/twilio-client'

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const text = await request.text()
    const params = Object.fromEntries(new URLSearchParams(text))
    const msg = parseInboundWebhook(params)

    if (!msg.body && msg.numMedia === 0) {
      // Empty message — acknowledge but don't store
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const supabase: any = createAdminClient()

    // Try to match inbound phone to a client
    // Strip formatting: +1 (555) 123-4567 → search for various formats
    const digits = msg.from.replace(/\D/g, '')
    const searchPatterns = [msg.from, `+${digits}`, digits]

    let clientId: string | null = null
    let tenantId: string | null = null

    for (const pattern of searchPatterns) {
      const { data: client } = await (supabase
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

    // Store the message (even if we can't match a client — it'll show as unlinked)
    await (supabase as any).from('messages').insert({
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

    // Twilio expects TwiML response
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('[twilio-webhook] Error processing inbound message:', err)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' }, status: 200 } // Always 200 to Twilio
    )
  }
}
