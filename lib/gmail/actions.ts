// Gmail Server Actions
// UI-facing actions for triggering sync, viewing history, and sending messages.

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { isCommTriageEnabled } from '@/lib/features'
import { getGoogleAccessToken } from '@/lib/google/auth'
import { createServerClient } from '@/lib/supabase/server'
import { getMessageHeaders, sendEmail } from './client'
import { syncGmailInbox } from './sync'
import type { GmailSyncLogEntry, SendMessageResult, SyncResult } from './types'

type CreateDraftMessageInput = {
  inquiryId?: string | null
  clientId?: string | null
  subject?: string | null
  body: string
  eventId?: string | null
  conversationThreadId?: string | null
  recipientEmail?: string | null
  gmailThreadId?: string | null
}

export interface ApprovalQueueMessage {
  id: string
  subject: string | null
  body: string
  createdAt: string
  recipientEmail: string | null
  recipientName: string | null
  inquiryId: string | null
  eventId: string | null
  clientId: string | null
  conversationThreadId: string | null
  href: string
  contextLabel: string | null
}

function extractEmailFromIdentity(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0].toLowerCase() : null
}

function extractReplySubjectFromRawContent(rawContent: string | null | undefined): string | null {
  if (!rawContent) return null
  const normalized = rawContent.replace(/\r\n/g, '\n').trim()
  if (!normalized) return null

  const splitIndex = normalized.indexOf('\n\n')
  const candidate =
    splitIndex > 0
      ? normalized.slice(0, splitIndex).trim()
      : (normalized
          .split('\n')
          .find((line) => line.trim().length > 0)
          ?.trim() ?? null)

  if (!candidate) return null
  return /^re:/i.test(candidate) ? candidate : `Re: ${candidate}`
}

async function getConversationThreadDraftContext(
  supabase: any,
  tenantId: string,
  threadId: string
): Promise<{
  clientId: string | null
  recipientEmail: string | null
  suggestedSubject: string | null
}> {
  const { data: thread } = await supabase
    .from('conversation_threads')
    .select('id, client_id')
    .eq('id', threadId)
    .eq('tenant_id', tenantId)
    .single()

  if (!thread) {
    throw new Error('Conversation thread not found')
  }

  const { data: lastInbound } = await supabase
    .from('communication_events')
    .select('sender_identity, raw_content')
    .eq('thread_id', threadId)
    .eq('tenant_id', tenantId)
    .eq('direction', 'inbound')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    clientId: thread.client_id ?? null,
    recipientEmail: extractEmailFromIdentity(lastInbound?.sender_identity),
    suggestedSubject: extractReplySubjectFromRawContent(lastInbound?.raw_content),
  }
}

function revalidateDraftSurfaces(input: {
  inquiryId?: string | null
  eventId?: string | null
  clientId?: string | null
  conversationThreadId?: string | null
}) {
  revalidatePath('/inquiries')
  revalidatePath('/queue')
  revalidatePath('/messages/approval-queue')

  if (input.inquiryId) revalidatePath(`/inquiries/${input.inquiryId}`)
  if (input.eventId) revalidatePath(`/events/${input.eventId}`)
  if (input.clientId) revalidatePath(`/clients/${input.clientId}`)
  if (input.conversationThreadId) revalidatePath(`/inbox/triage/${input.conversationThreadId}`)
}

export async function triggerGmailSync(): Promise<SyncResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: conn } = await supabase
    .from('google_connections')
    .select('gmail_connected')
    .eq('chef_id', user.entityId)
    .single()

  if (!conn?.gmail_connected) {
    throw new Error('Gmail is not connected. Connect your Google account in Settings first.')
  }

  const result = await syncGmailInbox(user.entityId!, user.tenantId!)

  revalidatePath('/inquiries')
  revalidatePath('/settings')
  revalidatePath('/inbox')
  revalidatePath('/inbox/triage')

  return result
}

export async function getGmailSyncHistory(limit = 20): Promise<GmailSyncLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('gmail_sync_log')
    .select(
      'id, gmail_message_id, from_address, subject, classification, confidence, action_taken, error, synced_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('synced_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getGmailSyncHistory] Error:', error)
    return []
  }

  return data || []
}

export async function createDraftMessage(
  input: CreateDraftMessageInput
): Promise<{ messageId: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const trimmedBody = input.body.trim()

  if (!trimmedBody) throw new Error('Email body is required')

  let clientId = input.clientId ?? null
  let recipientEmail = input.recipientEmail?.trim().toLowerCase() || null
  let subject = input.subject?.trim() || ''

  if (input.conversationThreadId) {
    const threadContext = await getConversationThreadDraftContext(
      supabase,
      user.tenantId!,
      input.conversationThreadId
    )
    clientId = clientId || threadContext.clientId
    recipientEmail = recipientEmail || threadContext.recipientEmail
    subject = subject || threadContext.suggestedSubject || ''
  }

  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, email')
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!client) throw new Error('Client not found')
    recipientEmail = recipientEmail || client.email || null
  }

  if (input.inquiryId && (!clientId || !recipientEmail)) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('client_id, contact_email, client:clients(email)')
      .eq('id', input.inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!inquiry) throw new Error('Inquiry not found')
    clientId = clientId || inquiry.client_id || null
    recipientEmail =
      recipientEmail ||
      inquiry.contact_email ||
      (inquiry.client as { email: string | null } | null)?.email ||
      null
  }

  if (!input.inquiryId && !input.eventId && !clientId && !input.conversationThreadId) {
    throw new Error('Draft must be attached to an inquiry, client, event, or inbox thread')
  }
  if (!recipientEmail) throw new Error('Recipient has no email address')
  if (!subject) subject = input.inquiryId ? 'Re: Your inquiry' : 'Message from ChefFlow'

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: user.tenantId!,
      inquiry_id: input.inquiryId || null,
      event_id: input.eventId || null,
      client_id: clientId,
      conversation_thread_id: input.conversationThreadId || null,
      recipient_email: recipientEmail,
      channel: 'email' as const,
      direction: 'outbound' as const,
      status: 'draft' as const,
      subject,
      body: trimmedBody,
      from_user_id: user.id,
      gmail_thread_id: input.gmailThreadId?.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createDraftMessage] Error:', error)
    throw new Error('Failed to create draft message')
  }

  revalidateDraftSurfaces({
    inquiryId: input.inquiryId,
    eventId: input.eventId,
    clientId,
    conversationThreadId: input.conversationThreadId,
  })

  return { messageId: message.id }
}

export async function approveAndSendMessage(messageId: string): Promise<SendMessageResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .select('*, client:clients(email, full_name)')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (msgErr || !message) throw new Error('Message not found')
  if (message.status !== 'draft') throw new Error('Message is not in draft status')
  if (message.direction !== 'outbound') throw new Error('Can only send outbound messages')

  const recipientEmail =
    message.recipient_email || (message.client as { email: string | null } | null)?.email || null
  if (!recipientEmail) throw new Error('Recipient has no email address')

  const accessToken = await getGoogleAccessToken(user.entityId!)

  let inReplyTo: string | undefined
  let references: string | undefined
  let threadId: string | undefined = message.gmail_thread_id || undefined
  let replyTargetGmailMessageId: string | undefined

  if (message.inquiry_id) {
    const { data: lastInbound } = await supabase
      .from('messages')
      .select('gmail_message_id, gmail_thread_id')
      .eq('tenant_id', user.tenantId!)
      .eq('inquiry_id', message.inquiry_id)
      .eq('direction', 'inbound')
      .not('gmail_message_id', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastInbound?.gmail_message_id) {
      threadId = threadId || lastInbound.gmail_thread_id || undefined
      replyTargetGmailMessageId = lastInbound.gmail_message_id
    }
  }

  if (!replyTargetGmailMessageId && message.conversation_thread_id) {
    const { data: lastInboundEvent } = await supabase
      .from('communication_events')
      .select('external_id')
      .eq('thread_id', message.conversation_thread_id)
      .eq('tenant_id', user.tenantId!)
      .eq('direction', 'inbound')
      .not('external_id', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastInboundEvent?.external_id) {
      replyTargetGmailMessageId = lastInboundEvent.external_id
    }
  }

  if (replyTargetGmailMessageId) {
    try {
      const headers = await getMessageHeaders(accessToken, replyTargetGmailMessageId)
      if (headers.messageIdHeader) {
        inReplyTo = headers.messageIdHeader
        references = headers.messageIdHeader
      }
      threadId = threadId || headers.threadId || undefined
    } catch {
      console.warn('[approveAndSendMessage] Could not fetch reply headers')
    }
  }

  let emailBody = message.body || ''
  if (emailBody.includes('[PAYMENT_LINK]')) {
    let paymentUrl: string | null = null

    if (message.inquiry_id) {
      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('converted_to_event_id')
        .eq('id', message.inquiry_id)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (inquiry?.converted_to_event_id) {
        try {
          const { createPaymentCheckoutUrl } = await import('@/lib/stripe/checkout')
          paymentUrl = await createPaymentCheckoutUrl(inquiry.converted_to_event_id, user.tenantId!)
        } catch (err) {
          console.warn('[approveAndSendMessage] Payment link generation failed:', err)
        }
      }
    }

    emailBody = paymentUrl
      ? emailBody.replace('[PAYMENT_LINK]', paymentUrl)
      : emailBody.replace('[PAYMENT_LINK]', '(payment link will be sent separately)')

    await supabase
      .from('messages')
      .update({ body: emailBody })
      .eq('id', messageId)
      .eq('tenant_id', user.tenantId!)
  }

  const subject = message.subject || 'Re: Your inquiry'
  const gmailResult = await sendEmail(accessToken, {
    to: recipientEmail,
    subject,
    body: emailBody,
    inReplyTo,
    references,
    threadId,
  })

  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('messages')
    .update({
      status: 'sent',
      sent_at: now,
      approved_at: now,
      approved_by: user.id,
      gmail_message_id: gmailResult.messageId,
      gmail_thread_id: gmailResult.threadId,
    })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (updateErr) {
    console.error('[approveAndSendMessage] Status update failed:', updateErr)
  }

  const { data: conn } = await supabase
    .from('google_connections')
    .select('connected_email')
    .eq('chef_id', user.entityId!)
    .single()

  if (message.conversation_thread_id) {
    let linkedEntityType: 'inquiry' | 'event' | null = message.inquiry_id
      ? 'inquiry'
      : message.event_id
        ? 'event'
        : null
    let linkedEntityId: string | null = message.inquiry_id || message.event_id || null

    if (!linkedEntityId) {
      const { data: lastLinked } = await supabase
        .from('communication_events')
        .select('linked_entity_type, linked_entity_id')
        .eq('thread_id', message.conversation_thread_id)
        .eq('tenant_id', user.tenantId!)
        .not('linked_entity_id', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()

      linkedEntityType = (lastLinked?.linked_entity_type as 'inquiry' | 'event' | null) ?? null
      linkedEntityId = lastLinked?.linked_entity_id ?? null
    }

    await supabase.from('communication_events').insert({
      tenant_id: user.tenantId!,
      thread_id: message.conversation_thread_id,
      source: 'email',
      external_id: gmailResult.messageId,
      timestamp: now,
      sender_identity: conn?.connected_email ?? 'chef',
      raw_content: `${subject}\n\n${emailBody}`.trim(),
      normalized_content: `${subject}\n\n${emailBody}`.trim().toLowerCase().replace(/\s+/g, ' '),
      direction: 'outbound',
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId,
      resolved_client_id: message.client_id || null,
      status: linkedEntityId ? 'linked' : 'unlinked',
    })

    await supabase
      .from('conversation_threads')
      .update({ last_activity_at: now })
      .eq('id', message.conversation_thread_id)
      .eq('tenant_id', user.tenantId!)
  } else if (isCommTriageEnabled()) {
    try {
      const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')

      await ingestCommunicationEvent({
        tenantId: user.tenantId!,
        source: 'email',
        externalId: gmailResult.messageId,
        externalThreadKey: gmailResult.threadId,
        resolvedClientId: message.client_id || null,
        timestamp: now,
        senderIdentity: conn?.connected_email ?? 'chef',
        rawContent: `${subject}\n\n${emailBody}`.trim(),
        direction: 'outbound',
        linkedEntityType: message.inquiry_id ? 'inquiry' : message.event_id ? 'event' : null,
        linkedEntityId: message.inquiry_id || message.event_id || null,
        ingestionSource: 'manual',
        actorId: user.id,
      })
    } catch (intakeErr) {
      console.error(
        '[approveAndSendMessage] Outbound communication intake failed (non-fatal):',
        intakeErr
      )
    }
  }

  if (message.inquiry_id) {
    const { data: currentInquiry } = await supabase
      .from('inquiries')
      .select('status')
      .eq('id', message.inquiry_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    const updatePayload: Record<string, unknown> = {
      next_action_required: 'Awaiting client reply',
      next_action_by: 'client',
      follow_up_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }

    if (currentInquiry?.status === 'new' || currentInquiry?.status === 'awaiting_chef') {
      updatePayload.status = 'awaiting_client'
    }

    await supabase
      .from('inquiries')
      .update(updatePayload)
      .eq('id', message.inquiry_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidateDraftSurfaces({
    inquiryId: message.inquiry_id,
    eventId: message.event_id,
    clientId: message.client_id,
    conversationThreadId: message.conversation_thread_id,
  })

  return {
    success: true,
    messageId,
    gmailMessageId: gmailResult.messageId,
    gmailThreadId: gmailResult.threadId,
  }
}

export async function updateDraftMessage(
  messageId: string,
  updates: { subject?: string; body?: string }
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select('status, inquiry_id, event_id, client_id, conversation_thread_id')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!message) throw new Error('Message not found')
  if (message.status !== 'draft') throw new Error('Can only edit draft messages')

  const nextSubject = updates.subject?.trim()
  const nextBody = updates.body?.trim()
  if (updates.body !== undefined && !nextBody) {
    throw new Error('Email body is required')
  }

  const { error } = await supabase
    .from('messages')
    .update({
      ...(updates.subject !== undefined && { subject: nextSubject || null }),
      ...(updates.body !== undefined && { body: nextBody }),
    })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error('Failed to update draft')

  revalidateDraftSurfaces({
    inquiryId: message.inquiry_id,
    eventId: message.event_id,
    clientId: message.client_id,
    conversationThreadId: message.conversation_thread_id,
  })

  return { success: true }
}

export async function getMessagesForInquiry(inquiryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getMessagesForInquiry] Error:', error)
    return []
  }

  return data || []
}

export async function getApprovalQueueMessages(): Promise<ApprovalQueueMessage[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: messages, error } = await supabase
    .from('messages')
    .select(
      'id, subject, body, created_at, inquiry_id, event_id, client_id, conversation_thread_id, recipient_email, client:clients(full_name, email)'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('direction', 'outbound')
    .eq('channel', 'email')
    .eq('status', 'draft')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getApprovalQueueMessages] Error:', error)
    throw new Error('Failed to fetch approval queue')
  }

  const inquiryIds = Array.from(
    new Set((messages || []).map((message: any) => message.inquiry_id).filter(Boolean))
  ) as string[]
  const eventIds = Array.from(
    new Set((messages || []).map((message: any) => message.event_id).filter(Boolean))
  ) as string[]

  const [{ data: inquiries }, { data: events }] = await Promise.all([
    inquiryIds.length
      ? supabase
          .from('inquiries')
          .select('id, confirmed_occasion')
          .eq('tenant_id', user.tenantId!)
          .in('id', inquiryIds)
      : Promise.resolve({ data: [] as any[] }),
    eventIds.length
      ? supabase
          .from('events')
          .select('id, occasion')
          .eq('tenant_id', user.tenantId!)
          .in('id', eventIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const inquiryTitleById = new Map(
    (inquiries || []).map((inquiry: any) => [inquiry.id, inquiry.confirmed_occasion || 'Inquiry'])
  )
  const eventTitleById = new Map(
    (events || []).map((event: any) => [event.id, event.occasion || 'Event'])
  )

  return (messages || []).map((message: any) => {
    const recipientEmail =
      message.recipient_email || (message.client as { email: string | null } | null)?.email || null
    const recipientName =
      (message.client as { full_name: string | null } | null)?.full_name || recipientEmail

    let href = '/messages/approval-queue'
    let contextLabel: string | null = null

    if (message.inquiry_id) {
      href = `/inquiries/${message.inquiry_id}`
      contextLabel = inquiryTitleById.get(message.inquiry_id) ?? 'Inquiry'
    } else if (message.conversation_thread_id) {
      href = `/inbox/triage/${message.conversation_thread_id}`
      contextLabel = 'Inbox thread'
    } else if (message.event_id) {
      href = `/events/${message.event_id}`
      contextLabel = eventTitleById.get(message.event_id) ?? 'Event'
    } else if (message.client_id) {
      href = `/clients/${message.client_id}`
      contextLabel = 'Client'
    }

    return {
      id: message.id,
      subject: message.subject,
      body: message.body,
      createdAt: message.created_at,
      recipientEmail,
      recipientName: recipientName || null,
      inquiryId: message.inquiry_id || null,
      eventId: message.event_id || null,
      clientId: message.client_id || null,
      conversationThreadId: message.conversation_thread_id || null,
      href,
      contextLabel,
    }
  })
}

export async function deleteDraftMessage(messageId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select('status, inquiry_id, event_id, client_id, conversation_thread_id')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!message) throw new Error('Message not found')
  if (message.status !== 'draft') throw new Error('Can only delete draft messages')

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error('Failed to delete draft')

  revalidateDraftSurfaces({
    inquiryId: message.inquiry_id,
    eventId: message.event_id,
    clientId: message.client_id,
    conversationThreadId: message.conversation_thread_id,
  })

  return { success: true }
}
