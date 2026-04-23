// Twilio inbound webhook compatibility route.
// Canonical ingress now runs through communication_events/conversation_threads
// via the shared managed-channel adapter.

import { NextRequest, NextResponse } from 'next/server'
import { parseInboundWebhook } from '@/lib/sms/twilio-client'
import { ingestManagedInboundCommunication } from '@/lib/communication/managed-ingest'
import {
  normalizeManagedPhoneAddress,
  resolveManagedInboundChannel,
} from '@/lib/communication/managed-channels'
import { reconcileCommunicationDeliveryState } from '@/lib/communication/delivery-reconciliation'
import { validateTwilioSignature } from '@/lib/communication/twilio-webhook'
import { createServerClient } from '@/lib/db/server'
import { logCommunicationAction } from '@/lib/communication/pipeline'

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

function twiml(status = 200) {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function getWebhookUrl(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://app.cheflowhq.com'

  return `${base.replace(/\/+$/, '')}${pathname}`
}

function normalizeTwilioAddress(value: string | null | undefined) {
  const raw = String(value || '').trim()
  const channel = raw.startsWith('whatsapp:') ? 'whatsapp' : 'sms'
  const address = raw.replace(/^whatsapp:/, '')
  return {
    channel,
    address: channel === 'whatsapp' ? normalizeManagedPhoneAddress(address) || address : address,
  } as const
}

function extractTwilioStatusCallback(params: Record<string, string>) {
  const rawStatus = String(params.MessageStatus || params.SmsStatus || '')
    .trim()
    .toLowerCase()
  const messageSid = String(params.MessageSid || params.SmsSid || '').trim()

  if (!rawStatus || rawStatus === 'received' || !messageSid) {
    return null
  }

  const from = normalizeTwilioAddress(params.From)
  const to = normalizeTwilioAddress(params.To)

  return {
    channel: from.channel === 'whatsapp' || to.channel === 'whatsapp' ? 'whatsapp' : 'sms',
    managedAddress: from.address,
    recipientAddress: to.address,
    providerStatus: rawStatus,
    rawProviderStatus: rawStatus,
    messageSid,
    errorCode: params.ErrorCode || null,
    errorMessage: params.ErrorMessage || null,
  } as const
}

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text()
    const params = Object.fromEntries(new URLSearchParams(rawText))
    const statusCallback = extractTwilioStatusCallback(params)
    const msg = statusCallback ? null : parseInboundWebhook(params)

    if (msg && !msg.body && msg.numMedia === 0) {
      return twiml()
    }

    const managedChannel = await resolveManagedInboundChannel({
      channel: statusCallback?.channel || msg!.channel,
      address: statusCallback?.managedAddress || msg!.to,
    })

    if (!managedChannel?.authToken) {
      console.warn(
        '[twilio-webhook] Unmanaged Twilio destination:',
        statusCallback?.managedAddress || msg?.to
      )
      return twiml()
    }

    const twilioSignature = request.headers.get('x-twilio-signature')
    if (!twilioSignature) {
      console.warn('[twilio-webhook] Missing X-Twilio-Signature header - rejecting')
      return twiml(403)
    }

    const webhookUrl = getWebhookUrl('/api/webhooks/twilio')
    if (
      !validateTwilioSignature({
        authToken: managedChannel.authToken,
        url: webhookUrl,
        params,
        signature: twilioSignature,
      })
    ) {
      console.warn('[twilio-webhook] Invalid signature - rejecting forged request')
      return twiml(403)
    }

    if (statusCallback) {
      const db: any = createServerClient({ admin: true })
      const { data: event } = await db
        .from('communication_events')
        .select('id, thread_id, timestamp')
        .eq('tenant_id', managedChannel.tenantId)
        .eq('source', statusCallback.channel)
        .eq('external_id', statusCallback.messageSid)
        .eq('direction', 'outbound')
        .maybeSingle()

      if (!event?.id) {
        console.warn(
          '[twilio-webhook] Status callback did not match an outbound communication event:',
          statusCallback.messageSid
        )
        return twiml()
      }

      const deliveryState = await reconcileCommunicationDeliveryState({
        tenantId: managedChannel.tenantId,
        threadId: event.thread_id,
        communicationEventId: event.id,
        kind: 'provider_update',
        providerName: 'twilio',
        rawProviderStatus: statusCallback.providerStatus,
        occurredAt: new Date().toISOString(),
        attemptedAt: event.timestamp,
        errorCode: statusCallback.errorCode,
        errorMessage: statusCallback.errorMessage,
      })

      await logCommunicationAction({
        tenantId: managedChannel.tenantId,
        communicationEventId: event.id,
        threadId: event.thread_id || null,
        action: 'provider_message_status_updated',
        source: 'webhook',
        previousState: {
          provider: 'twilio',
          provider_status: deliveryState.previousProviderStatus,
          delivery_status: deliveryState.previousDeliveryStatus,
        },
        newState: {
          provider: 'twilio',
          provider_status: deliveryState.nextProviderStatus,
          delivery_status: deliveryState.nextDeliveryStatus,
          raw_provider_status: statusCallback.rawProviderStatus,
          external_id: statusCallback.messageSid,
          managed_channel_address: statusCallback.managedAddress,
          recipient_address: statusCallback.recipientAddress,
          error_code: statusCallback.errorCode,
          error_message: statusCallback.errorMessage,
        },
      })

      return twiml()
    }

    const rawContent = buildInboundContent({
      body: msg!.body,
      channel: msg!.channel,
      numMedia: msg!.numMedia,
    })

    const result = await ingestManagedInboundCommunication({
      channel: msg!.channel,
      toAddress: msg!.to,
      senderIdentity: msg!.from,
      rawContent,
      timestamp: new Date().toISOString(),
      externalId: msg!.messageSid || null,
      providerName: 'twilio',
      legacyMessage: {
        enabled: true,
        body: rawContent,
      },
    })

    if (!result.routed) {
      console.warn('[twilio-webhook] Message was accepted but not routed:', result.reason)
    }

    return twiml()
  } catch (err) {
    console.error('[twilio-webhook] Error processing inbound message:', err)
    return twiml(500)
  }
}
