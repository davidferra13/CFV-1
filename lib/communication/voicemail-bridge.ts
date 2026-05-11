'use server'

import { ingestCommunicationEvent } from './pipeline'

export type VoicemailBridgeInput = {
  tenantId: string
  aiCallId: string
  contactPhone: string | null
  contactName: string | null
  transcription: string | null
  recordingUrl: string | null
}

/**
 * Bridge a voicemail into the communication pipeline.
 * Delegates to ingestCommunicationEvent which handles thread
 * finding/creation, event insertion, and action logging.
 * Fire-and-forget: never throws.
 */
export async function bridgeVoicemailToCommunication(input: VoicemailBridgeInput): Promise<void> {
  if (!input.transcription) return

  try {
    const senderIdentity = input.contactPhone || input.contactName || 'Unknown caller'

    await ingestCommunicationEvent({
      tenantId: input.tenantId,
      source: 'phone',
      externalId: input.aiCallId,
      senderIdentity,
      rawContent: input.transcription,
      direction: 'inbound',
      ingestionSource: 'webhook',
      providerName: 'twilio',
    })
  } catch (err) {
    console.error('[voicemail-bridge] Failed to bridge voicemail to communication pipeline:', err)
  }
}
