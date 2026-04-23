import { ingestCommunicationEvent } from './pipeline'
import {
  resolveManagedInboundChannel,
  type ManagedChannelResolution,
  type ManagedChannelRepository,
} from './managed-channels'
import { logCommunicationMessageCompat } from './messages-compat'
import type { CommunicationActionSource } from './types'

export type ManagedInboundCommunicationInput = {
  channel: 'email' | 'sms' | 'whatsapp'
  toAddress: string
  senderIdentity: string
  rawContent: string
  timestamp?: string
  externalId?: string | null
  externalThreadKey?: string | null
  providerName: string
  ingestionSource?: CommunicationActionSource
  isRawSignalOnly?: boolean
  legacyMessage?: {
    enabled?: boolean
    subject?: string | null
    body: string
  }
}

type ManagedIngestDeps = {
  repository?: ManagedChannelRepository
  resolveManagedInboundChannel?: typeof resolveManagedInboundChannel
  ingestCommunicationEvent?: typeof ingestCommunicationEvent
  logCommunicationMessageCompat?: typeof logCommunicationMessageCompat
}

export type ManagedInboundIngestResult = {
  routed: boolean
  deduped: boolean
  tenantId?: string | null
  threadId?: string | null
  managedChannel?: ManagedChannelResolution | null
  reason?: 'unmanaged_channel' | 'empty_body'
}

export async function ingestManagedInboundCommunication(
  input: ManagedInboundCommunicationInput,
  deps: ManagedIngestDeps = {}
): Promise<ManagedInboundIngestResult> {
  const resolveInbound = deps.resolveManagedInboundChannel || resolveManagedInboundChannel
  const ingestEvent = deps.ingestCommunicationEvent || ingestCommunicationEvent
  const logCompat = deps.logCommunicationMessageCompat || logCommunicationMessageCompat

  const managedChannel = await resolveInbound(
    { channel: input.channel, address: input.toAddress },
    deps.repository
  )

  if (!managedChannel) {
    return { routed: false, deduped: false, managedChannel: null, reason: 'unmanaged_channel' }
  }

  const rawContent = input.rawContent.trim()
  if (!rawContent) {
    return {
      routed: true,
      deduped: false,
      tenantId: managedChannel.tenantId,
      managedChannel,
      reason: 'empty_body',
    }
  }

  const result = await ingestEvent({
    tenantId: managedChannel.tenantId,
    source: input.channel,
    externalId: input.externalId || null,
    externalThreadKey: input.externalThreadKey || null,
    timestamp: input.timestamp,
    senderIdentity: input.senderIdentity,
    rawContent,
    direction: 'inbound',
    ingestionSource: input.ingestionSource || 'webhook',
    providerName: input.providerName,
    managedChannelAddress: managedChannel.managedAddress,
    recipientAddress: input.toAddress,
    isRawSignalOnly: input.isRawSignalOnly,
  })

  if (!result.deduped && input.legacyMessage?.enabled !== false) {
    await logCompat({
      tenantId: managedChannel.tenantId,
      threadId: result.threadId!,
      direction: 'inbound',
      channel: input.channel,
      subject: input.legacyMessage?.subject || null,
      body: input.legacyMessage?.body || rawContent,
      timestamp: result.timestamp || input.timestamp || new Date().toISOString(),
      clientId: result.resolvedClientId || null,
      linkedEntityType: result.linkedEntityType || null,
      linkedEntityId: result.linkedEntityId || null,
      externalId: input.externalId || null,
      externalThreadKey: input.externalThreadKey || null,
      recipientAddress: input.channel === 'email' ? managedChannel.managedAddress : null,
      mailboxId: managedChannel.mailboxId || null,
    })
  }

  return {
    routed: true,
    deduped: result.deduped,
    tenantId: managedChannel.tenantId,
    threadId: result.threadId || null,
    managedChannel,
  }
}
