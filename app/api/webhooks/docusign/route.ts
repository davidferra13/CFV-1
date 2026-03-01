import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// DocuSign Connect webhook — receives envelope status updates.
// Configured in DocuSign Admin → Connect → Add Configuration.
// Handles: envelope completed (signed), declined, voided.

function verifyHmacSignature(payload: string, signature: string): boolean {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_KEY
  if (!secret) {
    // If no HMAC key configured, skip verification (dev mode)
    console.warn('[docusign-webhook] No HMAC key configured — skipping signature verification')
    return true
  }
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('base64')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Verify HMAC signature if configured
    const signature = req.headers.get('x-docusign-signature-1')
    if (signature && !verifyHmacSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)

    // DocuSign Connect sends XML by default, but we configure JSON.
    // The envelope status is nested in the payload.
    const envelopeId = body.envelopeId || body.EnvelopeStatus?.EnvelopeID
    const envelopeStatus = body.status || body.EnvelopeStatus?.Status
    const completedAt = body.completedDateTime || body.EnvelopeStatus?.Completed

    if (!envelopeId) {
      return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 })
    }

    const supabase = createServerClient({ admin: true })

    // Update contract record based on envelope status
    if (envelopeStatus === 'completed' || envelopeStatus === 'Completed') {
      await (supabase as any)
        .from('event_contracts')
        .update({
          docusign_status: 'completed',
          docusign_signed_at: completedAt || new Date().toISOString(),
          status: 'signed',
        })
        .eq('docusign_envelope_id', envelopeId)

      // Dispatch Zapier webhook (non-blocking)
      try {
        const { data: contract } = await (supabase as any)
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
      await (supabase as any)
        .from('event_contracts')
        .update({
          docusign_status: 'declined',
        })
        .eq('docusign_envelope_id', envelopeId)
    } else if (envelopeStatus === 'voided' || envelopeStatus === 'Voided') {
      await (supabase as any)
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
