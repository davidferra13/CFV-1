// Gmail Sync Engine
// Core pipeline: fetch emails → classify → create inquiries / log messages
// Runs with admin Supabase client (no user session required) so it works
// from both the manual UI trigger and the cron endpoint.

import { createServerClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from './google-auth'
import {
  listRecentMessages,
  listMessagesSinceHistory,
  getFullMessage,
  getGmailProfile,
} from './client'
import { classifyEmail } from './classify'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import type { SyncResult, ParsedEmail } from './types'
import type { Json } from '@/types/database'

// ─── Main Sync Function ─────────────────────────────────────────────────────

export async function syncGmailInbox(
  chefId: string,
  tenantId: string
): Promise<SyncResult> {
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
    // First sync — get last 50 messages
    const messages = await listRecentMessages(accessToken, { maxResults: 50 })
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
      // History ID too old — fall back to recent messages
      const messages = await listRecentMessages(accessToken, { maxResults: 50 })
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
  const { data: clients } = await supabase
    .from('clients')
    .select('email')
    .eq('tenant_id', tenantId)

  const knownClientEmails = (clients || [])
    .map((c) => c.email)
    .filter(Boolean) as string[]

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

    // Check if a client exists for this sender
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.from.email)
      .single()

    const clientId = existingClient?.id || null

    // Build unknown_fields for unlinked leads
    const unknownFields: Record<string, string> = {}
    if (!clientId) {
      unknownFields.client_name = parseResult.parsed.client_name || email.from.name || 'Unknown'
      unknownFields.client_email = email.from.email
      if (parseResult.parsed.client_phone) {
        unknownFields.client_phone = parseResult.parsed.client_phone
      }
    }

    // Create the inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'email' as const,
        client_id: clientId,
        first_contact_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
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
        unknown_fields: Object.keys(unknownFields).length > 0
          ? (unknownFields as unknown as Json)
          : null,
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

    await logSyncEntry(supabase, tenantId, email, {
      classification: classification.category,
      confidence: classification.confidence,
      action_taken: 'logged_message',
      message_id: message?.id || null,
    })

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
