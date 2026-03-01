// Resend Webhook Handler
// Receives email.opened and email.clicked events from Resend.
// Updates campaign_recipients.opened_at / clicked_at for open/click tracking.
//
// Setup required:
// 1. In the Resend dashboard → Webhooks → Add endpoint → this URL
// 2. Select events: email.opened, email.clicked
// 3. Copy the signing secret → set RESEND_WEBHOOK_SECRET env var

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logWebhookEvent } from '@/lib/webhooks/audit-log'

// Resend signs webhooks with HMAC-SHA256. We verify to prevent spoofing.
async function verifyResendSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Resend sends a timestamp+payload signature: "t=<ts>,v1=<sig>"
    const parts = Object.fromEntries(
      signature.split(',').map((p) => p.split('=') as [string, string])
    )
    const svix_ts = parts['t']
    const svix_sig = parts['v1']

    if (!svix_ts || !svix_sig) return false

    const signedPayload = `${svix_ts}.${payload}`
    const sigBytes = Uint8Array.from(atob(svix_sig.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0)
    )

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(signedPayload)
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  const body = await req.text()
  const signature = req.headers.get('svix-signature') ?? req.headers.get('resend-signature')

  // Verify signature if secret is configured
  if (webhookSecret) {
    const valid = await verifyResendSignature(body, signature, webhookSecret)
    if (!valid) {
      console.warn('[resend-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: { type: string; data: { email_id?: string; created_at?: string } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = event
  const messageId = data?.email_id

  if (!messageId) {
    return NextResponse.json({ ok: true, skipped: 'no email_id' })
  }

  // Only process supported email events
  const HANDLED_TYPES: Record<string, string> = {
    'email.opened': 'opened_at',
    'email.clicked': 'clicked_at',
    'email.bounced': 'bounced_at',
    'email.spam_complaint': 'spam_at',
  }

  if (!(type in HANDLED_TYPES)) {
    await logWebhookEvent({
      provider: 'resend',
      eventType: type,
      providerEventId: messageId,
      status: 'skipped',
      result: { reason: 'unhandled type' },
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ ok: true, skipped: `unhandled type: ${type}` })
  }

  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const now = data.created_at ?? new Date().toISOString()

  const updateField = HANDLED_TYPES[type]

  const { error } = await supabase
    .from('campaign_recipients' as any)
    .update({ [updateField]: now })
    .eq('resend_message_id', messageId)
    .is(updateField, null) // only update if not already set

  if (error) {
    console.error(`[resend-webhook] DB update failed for ${messageId}:`, error.message)
    await logWebhookEvent({
      provider: 'resend',
      eventType: type,
      providerEventId: messageId,
      status: 'failed',
      errorText: error.message,
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ ok: false, error: 'Database update failed' }, { status: 500 })
  }

  await logWebhookEvent({
    provider: 'resend',
    eventType: type,
    providerEventId: messageId,
    status: 'processed',
    result: { field: updateField },
    payloadSizeBytes: body.length,
  })
  console.log(`[resend-webhook] ${type} → ${messageId}`)
  return NextResponse.json({ ok: true })
}
