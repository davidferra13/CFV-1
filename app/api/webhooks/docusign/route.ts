import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import crypto from 'crypto'

// DocuSign Connect webhook - receives envelope status updates.
// Configured in DocuSign Admin → Connect → Add Configuration.
// Handles: envelope completed (signed), declined, voided.

function verifyHmacSignature(payload: string, signature: string): boolean {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_KEY
  if (!secret) {
    // Fail closed: reject webhooks if no HMAC key is configured
    console.error('[docusign-webhook] No HMAC key configured - rejecting webhook (fail-closed)')
    return false
  }
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Require HMAC signature - fail closed if header is missing or invalid
    const signature = req.headers.get('x-docusign-signature-1')
    if (!signature) {
      console.error('[docusign-webhook] Missing x-docusign-signature-1 header - rejecting')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    if (!verifyHmacSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // DocuSign Connect sends XML by default, but we configure JSON.
    // The envelope status is nested in the payload.
    const envelopePayload = body.EnvelopeStatus as Record<string, any> | undefined
    const envelopeId = body.envelopeId || envelopePayload?.EnvelopeID
    const envelopeStatus = body.status || envelopePayload?.Status
    const completedAt = body.completedDateTime || envelopePayload?.Completed

    if (!envelopeId) {
      return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 })
    }

    const db = createServerClient({ admin: true })

    // Update contract record based on envelope status
    if (envelopeStatus === 'completed' || envelopeStatus === 'Completed') {
      await (db as any)
        .from('event_contracts')
        .update({
          docusign_status: 'completed',
          docusign_signed_at: completedAt || new Date().toISOString(),
          status: 'signed',
        })
        .eq('docusign_envelope_id', envelopeId)

      // Dispatch Zapier webhook (non-blocking)
      try {
        const { data: contract } = await (db as any)
          .from('event_contracts')
          .select('tenant_id, id, event_id, client_id')
          .eq('docusign_envelope_id', envelopeId)
          .single()

        if (contract) {
          const { dispatchWebhookEvent } = await import('@/lib/integrations/zapier/zapier-webhooks')
          await dispatchWebhookEvent(contract.tenant_id, 'contract.signed', {
            contract_id: contract.id,
            event_id: contract.event_id,
            client_id: contract.client_id,
            envelope_id: envelopeId,
            signed_at: completedAt || new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('[docusign-webhook] Zapier dispatch failed (non-blocking):', err)
      }
    } else if (envelopeStatus === 'declined' || envelopeStatus === 'Declined') {
      await (db as any)
        .from('event_contracts')
        .update({
          docusign_status: 'declined',
        })
        .eq('docusign_envelope_id', envelopeId)
    } else if (envelopeStatus === 'voided' || envelopeStatus === 'Voided') {
      await (db as any)
        .from('event_contracts')
        .update({
          docusign_status: 'voided',
        })
        .eq('docusign_envelope_id', envelopeId)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[docusign-webhook] Error processing webhook:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
