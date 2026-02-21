// @ts-nocheck
// Gmail Sync Engine
// Core pipeline: fetch emails → classify → create inquiries / log messages
// Runs with admin Supabase client (no user session required) so it works
// from both the manual UI trigger and the cron endpoint.

import { createServerClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from '@/lib/google/auth'
import {
  listRecentMessages,
  listMessagesSinceHistory,
  getFullMessage,
  getGmailProfile,
} from './client'
import { classifyEmail } from './classify'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { isCommTriageEnabled } from '@/lib/features'
import type { SyncResult, ParsedEmail } from './types'
import type { Json } from '@/types/database'

// ─── Main Sync Function ─────────────────────────────────────────────────────

export async function syncGmailInbox(chefId: string, tenantId: string): Promise<SyncResult> {
  const result: SyncResult = {
    processed: 0,
    inquiriesCreated: 0,
    messagesLogged: 0,
    skipped: 0,
    errors: [],
  }

  const supabase = createServerClient({ admin: true })

  // 1. Get valid access token (auto-refreshes if needed)
  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(chefId)
  } catch (err) {
    const error = err as Error
    result.errors.push(`Token error: ${error.message}`)
    return result
  }

  // 2. Get current sync state
  const { data: conn } = await supabase
    .from('google_connections')
    .select('gmail_history_id')
    .eq('chef_id', chefId)
    .single()

  const historyId = conn?.gmail_history_id

  // 3. Fetch message IDs to process
  let messageIds: string[]

  if (!historyId) {
    // First sync — get last 50 inbox messages (exclude Sent/Drafts/Spam)
    const messages = await listRecentMessages(accessToken, {
      maxResults: 50,
      query: 'in:inbox -in:sent',
    })
    messageIds = messages.map((m) => m.id)

    // Bootstrap the history ID for future incremental syncs
    const profile = await getGmailProfile(accessToken)
    await supabase
      .from('google_connections')
      .update({ gmail_history_id: profile.historyId })
      .eq('chef_id', chefId)
  } else {
    // Incremental sync — only new messages since last history ID
    const historyResult = await listMessagesSinceHistory(accessToken, historyId)
    messageIds = historyResult.messageIds

    if (historyResult.latestHistoryId === '') {
      // History ID too old — fall back to recent inbox messages
      const messages = await listRecentMessages(accessToken, {
        maxResults: 50,
        query: 'in:inbox -in:sent',
      })
      messageIds = messages.map((m) => m.id)
      const profile = await getGmailProfile(accessToken)
      await supabase
        .from('google_connections')
        .update({ gmail_history_id: profile.historyId })
        .eq('chef_id', chefId)
    } else if (historyResult.latestHistoryId) {
      await supabase
        .from('google_connections')
        .update({ gmail_history_id: historyResult.latestHistoryId })
        .eq('chef_id', chefId)
    }
  }

  // 4. Load known client emails for classification context
  const { data: clients } = await supabase.from('clients').select('email').eq('tenant_id', tenantId)

  const knownClientEmails = (clients || []).map((c) => c.email).filter(Boolean) as string[]

  // 5. Process each message
  for (const messageId of messageIds) {
    try {
      await processMessage(
        supabase,
        accessToken,
        messageId,
        chefId,
        tenantId,
        knownClientEmails,
        result
      )
    } catch (err) {
      const error = err as Error
      result.errors.push(`Message ${messageId}: ${error.message}`)
    }
  }

  // 6. Update sync timestamp
  await supabase
    .from('google_connections')
    .update({
      gmail_last_sync_at: new Date().toISOString(),
      gmail_sync_errors: result.errors.length,
    })
    .eq('chef_id', chefId)

  return result
}

// ─── Process Single Message ─────────────────────────────────────────────────

async function processMessage(
  supabase: ReturnType<typeof createServerClient>,
  accessToken: string,
  messageId: string,
  chefId: string,
  tenantId: string,
  knownClientEmails: string[],
  result: SyncResult
) {
  // Dedup check — skip if already processed
  const { data: existing } = await supabase
    .from('gmail_sync_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('gmail_message_id', messageId)
    .single()

  if (existing) {
    result.skipped++
    return
  }

  // Fetch full message
  const email = await getFullMessage(accessToken, messageId)
  result.processed++

  // Skip emails sent by the chef themselves (outbound)
  const { data: conn } = await supabase
    .from('google_connections')
    .select('connected_email')
    .eq('chef_id', chefId)
    .single()

  if (conn?.connected_email && email.from.email === conn.connected_email) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'personal',
      confidence: 'high',
      action_taken: 'skipped',
    })
    result.skipped++
    return
  }

  // Communication intake signal layer (non-blocking, additive)
  if (isCommTriageEnabled()) {
    try {
      const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')
      await ingestCommunicationEvent({
        tenantId,
        source: 'email',
        externalId: email.messageId,
        externalThreadKey: email.threadId,
        timestamp: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
        senderIdentity: `${email.from.name || email.from.email} <${email.from.email}>`,
        rawContent: `${email.subject || ''}\n\n${email.body || ''}`.trim(),
        direction: 'inbound',
        ingestionSource: 'import',
      })
    } catch (intakeErr) {
      console.error('[processMessage] Communication intake failed (non-fatal):', intakeErr)
    }
  }

  // Classify the email
  const classification = await classifyEmail(
    email.subject,
    email.body,
    email.from.email,
    knownClientEmails
  )

  // Route by classification
  switch (classification.category) {
    case 'inquiry':
      await handleInquiry(supabase, email, chefId, tenantId, classification, result)
      break

    case 'existing_thread':
      await handleExistingThread(supabase, email, tenantId, classification, result)
      break

    default:
      // personal, spam, marketing — just log
      await logSyncEntry(supabase, tenantId, email, {
        classification: classification.category,
        confidence: classification.confidence,
        action_taken: 'skipped',
      })
      result.skipped++
      break
  }
}

// ─── Handle Inquiry Email ───────────────────────────────────────────────────

async function handleInquiry(
  supabase: ReturnType<typeof createServerClient>,
  email: ParsedEmail,
  chefId: string,
  tenantId: string,
  classification: { category: string; confidence: string },
  result: SyncResult
) {
  try {
    // Parse the email body into structured inquiry data
    const parseResult = await parseInquiryFromText(email.body)

    // Find or create client from lead data
    let clientId: string | null = null

    const leadName = parseResult.parsed.client_name || email.from.name || 'Unknown'
    const leadEmail = email.from.email

    try {
      const clientResult = await createClientFromLead(tenantId, {
        email: leadEmail,
        full_name: leadName,
        phone: parseResult.parsed.client_phone || null,
        dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions || null,
        source: 'email',
      })
      clientId = clientResult.id
    } catch (clientErr) {
      // Non-fatal: inquiry still gets created, just without client link
      console.error('[handleInquiry] Client creation failed:', clientErr)
    }

    // Store original lead data in unknown_fields for audit trail
    const unknownFields: Record<string, string> = {}
    unknownFields.original_sender_name = leadName
    unknownFields.original_sender_email = leadEmail
    if (parseResult.parsed.client_phone) {
      unknownFields.client_phone = parseResult.parsed.client_phone
    }

    // Create the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'email' as const,
        client_id: clientId,
        first_contact_at: email.date
          ? new Date(email.date).toISOString()
          : new Date().toISOString(),
        confirmed_date: parseResult.parsed.confirmed_date || null,
        confirmed_guest_count: parseResult.parsed.confirmed_guest_count ?? null,
        confirmed_location: parseResult.parsed.confirmed_location || null,
        confirmed_occasion: parseResult.parsed.confirmed_occasion || null,
        confirmed_budget_cents: parseResult.parsed.confirmed_budget_cents ?? null,
        confirmed_dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions?.length
          ? parseResult.parsed.confirmed_dietary_restrictions
          : null,
        confirmed_service_expectations: parseResult.parsed.confirmed_service_expectations || null,
        confirmed_cannabis_preference: parseResult.parsed.confirmed_cannabis_preference || null,
        source_message: email.body,
        unknown_fields:
          Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
        next_action_required: 'Review auto-captured email inquiry',
        next_action_by: 'chef',
      })
      .select()
      .single()

    if (inquiryError) throw new Error(inquiryError.message)

    // Log the raw message in the messages table
    const { data: message } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        inquiry_id: inquiry.id,
        client_id: clientId,
        channel: 'email' as const,
        direction: 'inbound' as const,
        status: 'logged' as const,
        subject: email.subject,
        body: email.body,
        sent_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
        gmail_message_id: email.messageId,
        gmail_thread_id: email.threadId,
      })
      .select('id')
      .single()

    // Log in sync log
    await logSyncEntry(supabase, tenantId, email, {
      classification: classification.category,
      confidence: classification.confidence,
      action_taken: 'created_inquiry',
      inquiry_id: inquiry.id,
      message_id: message?.id || null,
    })

    // Notify the chef about new inquiry (non-blocking)
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'new_inquiry',
          title: 'New inquiry received',
          body: `${leadName} — ${email.subject || 'No subject'}`,
          actionUrl: `/inquiries/${inquiry.id}`,
          inquiryId: inquiry.id,
          clientId: clientId || undefined,
        })
      }
    } catch (notifErr) {
      console.error('[handleInquiry] Notification failed (non-fatal):', notifErr)
    }

    // Email the chef directly about the new inquiry (non-blocking)
    try {
      const chefProfile = await getChefProfile(tenantId)
      if (chefProfile) {
        const { sendNewInquiryChefEmail, sendInquiryReceivedEmail } =
          await import('@/lib/email/notifications')
        await sendNewInquiryChefEmail({
          chefEmail: chefProfile.email,
          chefName: chefProfile.name,
          clientName: leadName,
          occasion: parseResult.parsed.confirmed_occasion || null,
          eventDate: parseResult.parsed.confirmed_date || null,
          guestCount: parseResult.parsed.confirmed_guest_count ?? null,
          source: 'gmail',
          inquiryId: inquiry.id,
        })
        // Acknowledge the inquiry sender so they know their email was received
        if (email.from.email) {
          await sendInquiryReceivedEmail({
            clientEmail: email.from.email,
            clientName: email.from.name || 'there',
            chefName: chefProfile.name,
            occasion: parseResult.parsed.confirmed_occasion || '',
            eventDate: parseResult.parsed.confirmed_date || undefined,
          })
        }
      }
    } catch (emailErr) {
      console.error('[handleInquiry] Chef email failed (non-fatal):', emailErr)
    }

    result.inquiriesCreated++
  } catch (err) {
    const error = err as Error
    await logSyncEntry(supabase, tenantId, email, {
      classification: classification.category,
      confidence: classification.confidence,
      action_taken: 'error',
      error: error.message,
    })
    result.errors.push(`Inquiry creation for ${email.from.email}: ${error.message}`)
  }
}

// ─── Handle Existing Thread Email ───────────────────────────────────────────

async function handleExistingThread(
  supabase: ReturnType<typeof createServerClient>,
  email: ParsedEmail,
  tenantId: string,
  classification: { category: string; confidence: string },
  result: SyncResult
) {
  try {
    // Find the client by email
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.from.email)
      .single()

    // Log the message linked to the client (and optionally inquiry by thread)
    const { data: message } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        client_id: client?.id || null,
        channel: 'email' as const,
        direction: 'inbound' as const,
        status: 'logged' as const,
        subject: email.subject,
        body: email.body,
        sent_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
        gmail_message_id: email.messageId,
        gmail_thread_id: email.threadId,
      })
      .select('id')
      .single()

    // Link message to inquiry by thread and auto-advance inquiry status
    let linkedInquiryId: string | null = null
    if (email.threadId) {
      const { data: threadMessage } = await supabase
        .from('messages')
        .select('inquiry_id')
        .eq('tenant_id', tenantId)
        .eq('gmail_thread_id', email.threadId)
        .not('inquiry_id', 'is', null)
        .limit(1)
        .maybeSingle()

      if (threadMessage?.inquiry_id) {
        linkedInquiryId = threadMessage.inquiry_id

        // Link this reply message to the same inquiry
        if (message?.id) {
          await supabase
            .from('messages')
            .update({ inquiry_id: linkedInquiryId })
            .eq('id', message.id)
        }

        // Auto-advance: awaiting_client → awaiting_chef (client replied)
        // DB trigger auto-logs to inquiry_state_transitions
        const { data: inquiry } = await supabase
          .from('inquiries')
          .select('status')
          .eq('id', linkedInquiryId)
          .eq('tenant_id', tenantId)
          .single()

        if (inquiry?.status === 'awaiting_client') {
          await supabase
            .from('inquiries')
            .update({
              status: 'awaiting_chef',
              follow_up_due_at: null,
              next_action_required: 'Client replied — review and respond',
              next_action_by: 'chef',
            })
            .eq('id', linkedInquiryId)
            .eq('tenant_id', tenantId)
        }
      }
    }

    await logSyncEntry(supabase, tenantId, email, {
      classification: classification.category,
      confidence: classification.confidence,
      action_taken: 'logged_message',
      message_id: message?.id || null,
    })

    // Notify chef about client reply (non-blocking)
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        const clientName = client?.id
          ? (await supabase.from('clients').select('full_name').eq('id', client.id).single()).data
              ?.full_name
          : email.from.name || email.from.email
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'inquiry_reply',
          title: 'Client replied',
          body: `${clientName} — ${email.subject || 'No subject'}`,
          actionUrl: linkedInquiryId ? `/inquiries/${linkedInquiryId}` : undefined,
          inquiryId: linkedInquiryId || undefined,
          clientId: client?.id || undefined,
        })
      }
    } catch (notifErr) {
      console.error('[handleExistingThread] Notification failed (non-fatal):', notifErr)
    }

    result.messagesLogged++
  } catch (err) {
    const error = err as Error
    await logSyncEntry(supabase, tenantId, email, {
      classification: classification.category,
      confidence: classification.confidence,
      action_taken: 'error',
      error: error.message,
    })
    result.errors.push(`Thread logging for ${email.from.email}: ${error.message}`)
  }
}

// ─── Log Sync Entry ─────────────────────────────────────────────────────────

async function logSyncEntry(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  email: ParsedEmail,
  entry: {
    classification: string
    confidence: string
    action_taken: string
    inquiry_id?: string | null
    message_id?: string | null
    error?: string | null
  }
) {
  await supabase.from('gmail_sync_log').upsert(
    {
      tenant_id: tenantId,
      gmail_message_id: email.messageId,
      gmail_thread_id: email.threadId,
      from_address: email.from.email,
      subject: email.subject?.slice(0, 500) || null,
      classification: entry.classification,
      confidence: entry.confidence,
      action_taken: entry.action_taken,
      inquiry_id: entry.inquiry_id || null,
      message_id: entry.message_id || null,
      error: entry.error || null,
    },
    { onConflict: 'tenant_id,gmail_message_id' }
  )
}
