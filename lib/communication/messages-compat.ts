import { createServerClient } from '@/lib/db/server'

type LegacyMessageChannel = 'email' | 'text'

function getDb() {
  return createServerClient({ admin: true }) as any
}

function mapCommunicationChannelToLegacyMessageChannel(channel: 'email' | 'sms' | 'whatsapp') {
  return (channel === 'email' ? 'email' : 'text') as LegacyMessageChannel
}

async function resolveThreadContext(input: {
  tenantId: string
  threadId: string
  clientId?: string | null
  linkedEntityType?: 'inquiry' | 'event' | null
  linkedEntityId?: string | null
}) {
  if (input.clientId && (input.linkedEntityType ? input.linkedEntityId : true)) {
    return {
      clientId: input.clientId,
      inquiryId:
        input.linkedEntityType === 'inquiry' && input.linkedEntityId ? input.linkedEntityId : null,
      eventId:
        input.linkedEntityType === 'event' && input.linkedEntityId ? input.linkedEntityId : null,
    }
  }

  const db = getDb()
  const { data: contextEvents } = await db
    .from('communication_events')
    .select('resolved_client_id, linked_entity_type, linked_entity_id')
    .eq('tenant_id', input.tenantId)
    .eq('thread_id', input.threadId)
    .order('timestamp', { ascending: false })
    .limit(10)

  const latestLinked = (contextEvents || []).find(
    (row: any) => row.linked_entity_type && row.linked_entity_id
  )
  const latestClient = (contextEvents || []).find((row: any) => row.resolved_client_id)

  return {
    clientId: input.clientId ?? latestClient?.resolved_client_id ?? null,
    inquiryId:
      input.linkedEntityType === 'inquiry'
        ? input.linkedEntityId || null
        : latestLinked?.linked_entity_type === 'inquiry'
          ? latestLinked.linked_entity_id
          : null,
    eventId:
      input.linkedEntityType === 'event'
        ? input.linkedEntityId || null
        : latestLinked?.linked_entity_type === 'event'
          ? latestLinked.linked_entity_id
          : null,
  }
}

export async function logCommunicationMessageCompat(input: {
  tenantId: string
  threadId: string
  direction: 'inbound' | 'outbound'
  channel: 'email' | 'sms' | 'whatsapp'
  body: string
  subject?: string | null
  timestamp: string
  clientId?: string | null
  linkedEntityType?: 'inquiry' | 'event' | null
  linkedEntityId?: string | null
  externalId?: string | null
  externalThreadKey?: string | null
  recipientAddress?: string | null
  mailboxId?: string | null
}) {
  const db = getDb()
  const legacyChannel = mapCommunicationChannelToLegacyMessageChannel(input.channel)
  const context = await resolveThreadContext({
    tenantId: input.tenantId,
    threadId: input.threadId,
    clientId: input.clientId,
    linkedEntityType: input.linkedEntityType,
    linkedEntityId: input.linkedEntityId,
  })

  if (input.channel === 'email' && input.externalId) {
    const findExistingMessage = async (mailboxScoped: boolean) => {
      let query = db
        .from('messages')
        .select(
          'id, conversation_thread_id, inquiry_id, event_id, client_id, recipient_email, mailbox_id'
        )
        .eq('gmail_message_id', input.externalId)
        .limit(1)

      if (mailboxScoped && input.mailboxId) {
        query = query.eq('mailbox_id', input.mailboxId)
      } else {
        query = query.eq('tenant_id', input.tenantId)
      }

      const { data } = await query.maybeSingle()
      return data
    }

    const existing =
      (await findExistingMessage(Boolean(input.mailboxId))) ??
      (input.mailboxId ? await findExistingMessage(false) : null)

    if (existing?.id) {
      await db
        .from('messages')
        .update({
          conversation_thread_id: existing.conversation_thread_id || input.threadId,
          inquiry_id: existing.inquiry_id || context.inquiryId,
          event_id: existing.event_id || context.eventId,
          client_id: existing.client_id || context.clientId,
          mailbox_id: existing.mailbox_id || input.mailboxId || null,
          recipient_email:
            existing.recipient_email || (input.channel === 'email' ? input.recipientAddress : null),
        })
        .eq('id', existing.id)

      return existing.id as string
    }
  }

  const { data: inserted } = await db
    .from('messages')
    .insert({
      tenant_id: input.tenantId,
      inquiry_id: context.inquiryId,
      event_id: context.eventId,
      client_id: context.clientId,
      conversation_thread_id: input.threadId,
      mailbox_id: input.mailboxId || null,
      recipient_email: input.channel === 'email' ? input.recipientAddress || null : null,
      channel: legacyChannel,
      direction: input.direction,
      status: input.direction === 'outbound' ? 'sent' : 'logged',
      subject: input.subject || null,
      body: input.body,
      sent_at: input.timestamp,
      gmail_message_id: input.channel === 'email' ? input.externalId || null : null,
      gmail_thread_id: input.channel === 'email' ? input.externalThreadKey || null : null,
    })
    .select('id')
    .single()

  return inserted?.id as string | undefined
}
