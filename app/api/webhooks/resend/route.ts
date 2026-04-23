// Resend Webhook Handler
// Receives Resend delivery events and maps them into the current campaign
// recipient compatibility fields plus the shared suppression table.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import {
  mapNormalizedEventToCampaignRecipientField,
  normalizeResendWebhookEvent,
  verifyResendWebhookSignature,
} from '@/lib/email/provider'
import { logWebhookEvent } from '@/lib/webhooks/audit-log'

function readRawEventMetadata(payload: unknown): { type: string; messageId: string | null } {
  if (typeof payload !== 'object' || payload === null) {
    return { type: 'unknown', messageId: null }
  }

  const event = payload as { type?: unknown; data?: { email_id?: unknown } }
  const type = typeof event.type === 'string' ? event.type : 'unknown'
  const messageId = typeof event.data?.email_id === 'string' ? event.data.email_id : null

  return { type, messageId }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  const body = await req.text()
  const signature = req.headers.get('svix-signature') ?? req.headers.get('resend-signature')

  if (!webhookSecret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured - rejecting all webhooks')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const valid = await verifyResendWebhookSignature(body, signature, webhookSecret)
  if (!valid) {
    console.warn('[resend-webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let rawEvent: unknown
  try {
    rawEvent = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawMetadata = readRawEventMetadata(rawEvent)
  if (!rawMetadata.messageId) {
    return NextResponse.json({ ok: true, skipped: 'no email_id' })
  }

  const normalizedEvent = normalizeResendWebhookEvent(rawEvent as any)
  if (!normalizedEvent) {
    await logWebhookEvent({
      provider: 'resend',
      eventType: rawMetadata.type,
      providerEventId: rawMetadata.messageId,
      status: 'skipped',
      result: { reason: 'unhandled type' },
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ ok: true, skipped: `unhandled type: ${rawMetadata.type}` })
  }

  const providerMessageId = normalizedEvent.message.providerMessageId ?? rawMetadata.messageId
  const updateField = mapNormalizedEventToCampaignRecipientField(normalizedEvent)
  if (!updateField) {
    await logWebhookEvent({
      provider: 'resend',
      eventType: normalizedEvent.providerEventType,
      providerEventId: providerMessageId,
      status: 'skipped',
      result: { reason: 'no legacy field mapping' },
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ ok: true, skipped: 'no legacy field mapping' })
  }

  const db = createAdminClient()

  const { error } = await db
    .from('campaign_recipients' as any)
    .update({ [updateField]: normalizedEvent.occurredAt })
    .eq('resend_message_id', normalizedEvent.message.legacyResendMessageId)
    .is(updateField, null)

  if (error) {
    console.error(
      `[resend-webhook] DB update failed for ${providerMessageId}:`,
      error.message
    )
    await logWebhookEvent({
      provider: 'resend',
      eventType: normalizedEvent.providerEventType,
      providerEventId: providerMessageId,
      status: 'failed',
      errorText: error.message,
      payloadSizeBytes: body.length,
    })
    return NextResponse.json({ ok: false, error: 'Database update failed' }, { status: 500 })
  }

  if (normalizedEvent.suppression !== 'none' && normalizedEvent.recipients.length) {
    for (const recipientEmail of normalizedEvent.recipients) {
      try {
        const normalized = recipientEmail.toLowerCase().trim()
        await db.from('email_suppressions' as any).upsert(
          {
            email: normalized,
            reason: normalizedEvent.suppression,
            source: 'resend_webhook',
          },
          { onConflict: 'email' }
        )
        console.log(`[resend-webhook] Suppressed ${normalized} (${normalizedEvent.suppression})`)
      } catch (suppressErr) {
        console.error('[resend-webhook] Suppression insert failed (non-blocking):', suppressErr)
      }
    }
  }

  await logWebhookEvent({
    provider: 'resend',
    eventType: normalizedEvent.providerEventType,
    providerEventId: providerMessageId,
    status: 'processed',
    result: { field: updateField, kind: normalizedEvent.kind },
    payloadSizeBytes: body.length,
  })
  console.log(`[resend-webhook] ${normalizedEvent.providerEventType} -> ${providerMessageId}`)
  return NextResponse.json({ ok: true })
}
