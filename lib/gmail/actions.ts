// Gmail Server Actions
// UI-facing actions for triggering sync, viewing history, sending messages.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncGmailInbox } from './sync'
import { getGoogleAccessToken } from '@/lib/google/auth'
import { sendEmail, getMessageHeaders } from './client'
import { isCommTriageEnabled } from '@/lib/features'
import type { SyncResult, GmailSyncLogEntry, SendMessageResult } from './types'

// ─── Trigger Gmail Sync ─────────────────────────────────────────────────────

export async function triggerGmailSync(): Promise<SyncResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify Gmail is connected
  const { data: conn } = await supabase
    .from('google_connections')
    .select('gmail_connected')
    .eq('chef_id', user.entityId)
    .single()

  if (!conn?.gmail_connected) {
    throw new Error('Gmail is not connected. Connect your Google account in Settings first.')
  }

  // Run the sync
  const result = await syncGmailInbox(user.entityId!, user.tenantId!)

  // Revalidate pages that show inquiry/message/inbox data
  revalidatePath('/inquiries')
  revalidatePath('/settings')
  revalidatePath('/inbox')
  revalidatePath('/inbox/triage')

  return result
}

// ─── Get Gmail Sync History ─────────────────────────────────────────────────

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

// ─── Create Draft Message ───────────────────────────────────────────────────
// Creates a message record in 'draft' status, ready for chef review.
// Called by the correspondence engine after generating an AI draft.

export async function createDraftMessage(input: {
  inquiryId: string
  clientId: string
  subject: string
  body: string
  eventId?: string | null
}): Promise<{ messageId: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id, email')
    .eq('id', input.clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')
  if (!client.email) throw new Error('Client has no email address')

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: user.tenantId!,
      inquiry_id: input.inquiryId,
      event_id: input.eventId || null,
      client_id: input.clientId,
      channel: 'email' as const,
      direction: 'outbound' as const,
      status: 'draft' as const,
      subject: input.subject,
      body: input.body,
      from_user_id: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createDraftMessage] Error:', error)
    throw new Error('Failed to create draft message')
  }

  revalidatePath('/inquiries')
  return { messageId: message.id }
}

// ─── Approve and Send Message via Gmail ─────────────────────────────────────
// Takes a draft message, approves it, and sends it through Gmail API.
// This is the chef's "approve and send" action.

export async function approveAndSendMessage(messageId: string): Promise<SendMessageResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Fetch the draft message
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .select('*, client:clients(email, full_name)')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (msgErr || !message) throw new Error('Message not found')
  if (message.status !== 'draft') throw new Error('Message is not in draft status')
  if (message.direction !== 'outbound') throw new Error('Can only send outbound messages')

  const clientEmail = (message.client as { email: string | null })?.email
  if (!clientEmail) throw new Error('Client has no email address')

  // 2. Get Gmail access token
  const accessToken = await getGoogleAccessToken(user.entityId!)

  // 3. Find the most recent inbound message in the same thread for reply threading
  let inReplyTo: string | undefined
  let references: string | undefined
  let threadId: string | undefined

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
      threadId = lastInbound.gmail_thread_id || undefined

      // Get the original message's Message-ID header for proper threading
      try {
        const headers = await getMessageHeaders(accessToken, lastInbound.gmail_message_id)
        if (headers.messageIdHeader) {
          inReplyTo = headers.messageIdHeader
          references = headers.messageIdHeader
        }
        threadId = threadId || headers.threadId || undefined
      } catch {
        // Non-fatal - send without threading if headers fail
        console.warn('[approveAndSendMessage] Could not fetch reply headers')
      }
    }
  }

  // 4. Resolve [PAYMENT_LINK] placeholder if present
  let emailBody = message.body || ''
  if (emailBody.includes('[PAYMENT_LINK]')) {
    let paymentUrl: string | null = null

    if (message.inquiry_id) {
      const { data: inq } = await supabase
        .from('inquiries')
        .select('converted_to_event_id')
        .eq('id', message.inquiry_id)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (inq?.converted_to_event_id) {
        try {
          const { createPaymentCheckoutUrl } = await import('@/lib/stripe/checkout')
          paymentUrl = await createPaymentCheckoutUrl(inq.converted_to_event_id, user.tenantId!)
        } catch (err) {
          console.warn('[approveAndSendMessage] Payment link generation failed:', err)
        }
      }
    }

    emailBody = paymentUrl
      ? emailBody.replace('[PAYMENT_LINK]', paymentUrl)
      : emailBody.replace('[PAYMENT_LINK]', '(payment link will be sent separately)')

    // Persist the resolved body so the message record has the actual link
    await supabase
      .from('messages')
      .update({ body: emailBody })
      .eq('id', messageId)
      .eq('tenant_id', user.tenantId!)
  }

  // 5. Send via Gmail API
  const subject = message.subject || 'Re: Your inquiry'
  const gmailResult = await sendEmail(accessToken, {
    to: clientEmail,
    subject,
    body: emailBody,
    inReplyTo,
    references,
    threadId,
  })

  // 6. Update message record: draft → sent
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
    // Message was sent but status update failed - log but don't throw
    // The message DID go out to Gmail
  }

  // 7. Ingest outbound message into communication pipeline (non-blocking)
  // This ensures the inbox thread shows both inbound client messages AND chef replies.
  if (isCommTriageEnabled()) {
    try {
      const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')

      // Get the chef's connected Gmail address for senderIdentity
      const { data: conn } = await supabase
        .from('google_connections')
        .select('connected_email')
        .eq('chef_id', user.entityId!)
        .single()

      await ingestCommunicationEvent({
        tenantId: user.tenantId!,
        source: 'email',
        externalId: gmailResult.messageId,
        externalThreadKey: gmailResult.threadId,
        timestamp: new Date().toISOString(),
        senderIdentity: conn?.connected_email ?? 'chef',
        rawContent: `${subject}\n\n${emailBody}`.trim(),
        direction: 'outbound',
        linkedEntityType: message.inquiry_id ? 'inquiry' : null,
        linkedEntityId: message.inquiry_id || null,
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

  // 8. Update inquiry: action tracking, auto-advance status, set follow-up timer
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

    // Auto-advance: new → awaiting_client, awaiting_chef → awaiting_client
    // DB trigger auto-logs to inquiry_state_transitions
    if (currentInquiry?.status === 'new' || currentInquiry?.status === 'awaiting_chef') {
      updatePayload.status = 'awaiting_client'
    }

    await supabase
      .from('inquiries')
      .update(updatePayload)
      .eq('id', message.inquiry_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${message.inquiry_id}`)

  return {
    success: true,
    messageId,
    gmailMessageId: gmailResult.messageId,
    gmailThreadId: gmailResult.threadId,
  }
}

// ─── Update Draft Message ───────────────────────────────────────────────────
// Chef edits the AI-generated draft before sending.

export async function updateDraftMessage(
  messageId: string,
  updates: { subject?: string; body?: string }
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select('status')
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!message) throw new Error('Message not found')
  if (message.status !== 'draft') throw new Error('Can only edit draft messages')

  const { error } = await supabase
    .from('messages')
    .update({
      ...(updates.subject !== undefined && { subject: updates.subject }),
      ...(updates.body !== undefined && { body: updates.body }),
    })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error('Failed to update draft')

  return { success: true }
}

// ─── Get Messages for Inquiry ───────────────────────────────────────────────
// Returns the full email thread for an inquiry, ordered chronologically.

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

// ─── Delete Draft Message ───────────────────────────────────────────────────

export async function deleteDraftMessage(messageId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: message } = await supabase
    .from('messages')
    .select('status')
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

  revalidatePath('/inquiries')
  return { success: true }
}
