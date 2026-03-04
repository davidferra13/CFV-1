// Gmail Sync Engine
// Core pipeline: fetch emails → classify → create inquiries / log messages
// Runs with admin Supabase client (no user session required) so it works
// from both the manual UI trigger and the cron endpoint.

import { createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type DbClient = SupabaseClient<Database>
import { getGoogleAccessToken } from '@/lib/google/auth'
import {
  listRecentMessages,
  listMessagesSinceHistory,
  getFullMessage,
  getGmailProfile,
  GmailScopeError,
} from './client'
import { classifyEmail } from './classify'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { extractAndScoreEmail, scoreInquiryFields } from './extract-inquiry-fields'
import { createClientFromLead } from '@/lib/clients/actions'
import { createNotification, getChefAuthUserId, getChefProfile } from '@/lib/notifications/actions'
import { isCommTriageEnabled } from '@/lib/features'
import { isTakeAChefEmail, parseTakeAChefEmail } from './take-a-chef-parser'
import type { TacParseResult } from './take-a-chef-parser'
import { isYhangryEmail, parseYhangryEmail } from './yhangry-parser'
import type { YhangryParseResult } from './yhangry-parser'
import { isThumbtackEmail, parseThumbtackEmail } from './thumbtack-parser'
import { isTheKnotEmail, parseTheKnotEmail } from './theknot-parser'
import { isBarkEmail, parseBarkEmail } from './bark-parser'
import { isCozymealEmail, parseCozymealEmail } from './cozymeal-parser'
import { isGigSaladEmail, parseGigSaladEmail } from './gigsalad-parser'
import {
  isGoogleBusinessEmailWithSubject,
  parseGoogleBusinessEmail,
} from './google-business-parser'
import { isWixFormsEmail, parseWixFormsEmail } from './wix-forms-parser'
import { checkPlatformInquiryDuplicate, findPlatformInquiryByContext } from './platform-dedup'
import type { SyncResult, ParsedEmail } from './types'
import type { Json } from '@/types/database'

// ─── Known Platform Domains ───────────────────────────────────────────────
// Platform emails may be auto-archived by Gmail filters, so we run a second
// targeted query for these domains to ensure they're always captured.
const PLATFORM_DOMAINS = [
  'privatechefmanager.com',
  'takeachef.com',
  'yhangry.com',
  'thumbtack.com',
  'theknot.com',
  'weddingwire.com',
  'weddingpro.com',
  'theknotww.com',
  'bark.com',
  'cozymeal.com',
  'gigsalad.com',
  'wix-forms.com',
]

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

  try {
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
  } catch (err) {
    if (err instanceof GmailScopeError) {
      // Mark connection as needing reauth so the UI shows a reconnect prompt
      await supabase
        .from('google_connections')
        .update({ gmail_sync_errors: 99 })
        .eq('chef_id', chefId)
      result.errors.push(
        'Gmail permissions are insufficient. Please disconnect and reconnect your Gmail in Settings.'
      )
      return result
    }
    throw err
  }

  // 3b. Also fetch platform emails that may have been auto-archived by Gmail filters
  // These domains (TakeAChef, Yhangry, etc.) often get filtered out of inbox
  try {
    const platformQuery = PLATFORM_DOMAINS.map((d) => `from:${d}`).join(' OR ')
    const platformMessages = await listRecentMessages(accessToken, {
      maxResults: 50,
      query: platformQuery,
    })
    const platformIds = platformMessages.map((m) => m.id)

    // Merge with inbox results, deduplicate by message ID
    const existingSet = new Set(messageIds)
    for (const id of platformIds) {
      if (!existingSet.has(id)) {
        messageIds.push(id)
      }
    }
  } catch (platformErr) {
    // Non-fatal — inbox messages were already fetched
    console.error('[syncGmailInbox] Platform domain query failed (non-fatal):', platformErr)
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
  supabase: DbClient,
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

  // ─── Platform Fast Paths ────────────────────────────────────────────
  // Detect known platform emails by sender domain and route to dedicated parsers.
  // Skips Ollama classification entirely — platform emails are consistently
  // formatted and don't need AI to classify.
  if (isTakeAChefEmail(email.from.email)) {
    await handleTakeAChefEmail(supabase, email, chefId, tenantId, result)
    return
  }

  if (isYhangryEmail(email.from.email)) {
    await handleYhangryEmail(supabase, email, chefId, tenantId, result)
    return
  }

  if (isThumbtackEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'thumbtack',
      parseThumbtackEmail
    )
    return
  }

  if (isTheKnotEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'theknot',
      parseTheKnotEmail
    )
    return
  }

  if (isBarkEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'bark',
      parseBarkEmail
    )
    return
  }

  if (isCozymealEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'cozymeal',
      parseCozymealEmail
    )
    return
  }

  if (isGigSaladEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'gigsalad',
      parseGigSaladEmail
    )
    return
  }

  if (isGoogleBusinessEmailWithSubject(email.from.email, email.subject || '')) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'google_business',
      parseGoogleBusinessEmail
    )
    return
  }

  if (isWixFormsEmail(email.from.email)) {
    await handleGenericPlatformEmail(
      supabase,
      email,
      chefId,
      tenantId,
      result,
      'wix_forms',
      parseWixFormsEmail
    )
    return
  }

  // Classify the email FIRST — spam/marketing should never reach the inbox
  // Pass Gmail metadata for deterministic filtering (labels, headers) before AI
  const classification = await classifyEmail(
    email.subject,
    email.body,
    email.from.email,
    knownClientEmails,
    {
      labelIds: email.labelIds,
      listUnsubscribe: email.listUnsubscribe,
      precedence: email.precedence,
      tenantId,
    }
  )

  // Communication intake signal layer (non-blocking, additive)
  // Whitelist: only actionable emails enter the triage inbox.
  // Personal, spam, and marketing emails are logged in gmail_sync_log but
  // never create conversation threads or follow-up timers.
  if (
    isCommTriageEnabled() &&
    (classification.category === 'inquiry' || classification.category === 'existing_thread')
  ) {
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
  supabase: DbClient,
  email: ParsedEmail,
  chefId: string,
  tenantId: string,
  classification: { category: string; confidence: string },
  result: SyncResult
) {
  try {
    // ─── Phase 1: Deterministic extraction (instant, free, always works) ───
    const { fields: detFields, score: leadScore } = extractAndScoreEmail(
      email.subject || '',
      email.body,
      undefined,
      { observedAt: email.date ?? null }
    )

    // ─── Phase 2: Ollama enrichment (supplements deterministic with freeform fields) ───
    // Ollama provides: client_name, occasion normalization, service style, notes
    // If Ollama is offline, deterministic results still provide all structured data
    let ollamaClientName: string | null = null
    let ollamaOccasion: string | null = null
    let ollamaServiceExpectations: string | null = null
    let ollamaPhone: string | null = null
    let ollamaNotes: string | null = null
    let ollamaReferralSource: string | null = null

    try {
      const parseResult = await parseInquiryFromText(email.body)
      ollamaClientName = parseResult.parsed.client_name || null
      ollamaOccasion = parseResult.parsed.confirmed_occasion || null
      ollamaServiceExpectations = parseResult.parsed.confirmed_service_expectations || null
      ollamaPhone = parseResult.parsed.client_phone || null
      ollamaNotes = parseResult.parsed.notes || null
      ollamaReferralSource = parseResult.parsed.referral_source || null
    } catch (ollamaErr) {
      // Ollama offline — deterministic extraction still provides all structured fields
      console.warn(
        '[handleInquiry] Ollama unavailable, using deterministic extraction only:',
        (ollamaErr as Error).message
      )
    }

    // ─── Merge: deterministic wins for structured data, Ollama wins for freeform ───
    const leadName = ollamaClientName || email.from.name || 'Unknown'
    const leadEmail = email.from.email
    const clientPhone = detFields.client_phone || ollamaPhone || null

    // Find or create client from lead data
    let clientId: string | null = null

    try {
      const clientResult = await createClientFromLead(tenantId, {
        email: leadEmail,
        full_name: leadName,
        phone: clientPhone,
        dietary_restrictions:
          detFields.confirmed_dietary_restrictions.length > 0
            ? detFields.confirmed_dietary_restrictions
            : null,
        source: 'email',
      })
      clientId = clientResult.id
    } catch (clientErr) {
      // Non-fatal: inquiry still gets created, just without client link
      console.error('[handleInquiry] Client creation failed:', clientErr)
    }

    // Store lead data + lead score in unknown_fields
    const unknownFields: Record<string, unknown> = {
      original_sender_name: leadName,
      original_sender_email: leadEmail,
      lead_score: leadScore.lead_score,
      lead_tier: leadScore.lead_tier,
      lead_score_factors: leadScore.lead_score_factors,
    }
    if (clientPhone) {
      unknownFields.client_phone = clientPhone
    }
    if (ollamaNotes) {
      unknownFields.notes = ollamaNotes
    }
    if (detFields.referral_source || ollamaReferralSource) {
      unknownFields.referral_source = detFields.referral_source || ollamaReferralSource
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
        // Deterministic fields (structured data — regex is more reliable than LLM)
        confirmed_date: detFields.confirmed_date || null,
        confirmed_guest_count: detFields.confirmed_guest_count ?? null,
        confirmed_location: detFields.confirmed_location || null,
        confirmed_budget_cents: detFields.confirmed_budget_cents ?? null,
        confirmed_dietary_restrictions:
          detFields.confirmed_dietary_restrictions.length > 0
            ? detFields.confirmed_dietary_restrictions
            : null,
        confirmed_cannabis_preference: detFields.confirmed_cannabis_preference || null,
        // Ollama fields (freeform interpretation — LLM is better here)
        confirmed_occasion: ollamaOccasion || detFields.confirmed_occasion || null,
        confirmed_service_expectations: ollamaServiceExpectations || null,
        // Referral source from either layer
        referral_source: detFields.referral_source || ollamaReferralSource || null,
        source_message: email.body,
        unknown_fields:
          Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
        // GOLDMINE: set chef_likelihood + follow_up_due_at from lead score
        chef_likelihood: leadScore.lead_tier,
        follow_up_due_at: new Date(
          Date.now() +
            (leadScore.lead_tier === 'hot'
              ? 4 * 3600000 // 4 hours — hot leads need fast response
              : leadScore.lead_tier === 'warm'
                ? 24 * 3600000 // 24 hours
                : 72 * 3600000) // 72 hours — cold leads
        ).toISOString(),
        next_action_required:
          leadScore.lead_tier === 'hot'
            ? `🔥 HOT lead (${leadScore.lead_score}/100) — Review email inquiry from ${leadName}`
            : leadScore.lead_tier === 'warm'
              ? `Review email inquiry from ${leadName} (score: ${leadScore.lead_score}/100)`
              : 'Review auto-captured email inquiry',
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
        const tierLabel =
          leadScore.lead_tier === 'hot' ? '🔥 HOT' : leadScore.lead_tier === 'warm' ? 'Warm' : ''
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'new_inquiry',
          title: tierLabel ? `${tierLabel} inquiry received` : 'New inquiry received',
          body: `${leadName} — ${email.subject || 'No subject'} (score: ${leadScore.lead_score}/100)`,
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
          occasion: ollamaOccasion || detFields.confirmed_occasion || null,
          eventDate: detFields.confirmed_date || null,
          guestCount: detFields.confirmed_guest_count ?? null,
          source: 'gmail',
          inquiryId: inquiry.id,
        })
        // Acknowledge the inquiry sender so they know their email was received
        if (email.from.email) {
          await sendInquiryReceivedEmail({
            clientEmail: email.from.email,
            clientName: email.from.name || 'there',
            chefName: chefProfile.name,
            occasion: ollamaOccasion || detFields.confirmed_occasion || '',
            eventDate: detFields.confirmed_date ?? null,
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
  supabase: DbClient,
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
          .select(
            'status, confirmed_date, confirmed_guest_count, confirmed_budget_cents, confirmed_location, confirmed_occasion, confirmed_dietary_restrictions, confirmed_cannabis_preference, unknown_fields'
          )
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

        // ─── GOLDMINE: Extract from every thread email, fill missing fields ───
        // Run deterministic extraction on this reply. If new fields are found
        // that the inquiry doesn't already have, update the inquiry record.
        if (inquiry) {
          try {
            const { fields: newFields, score: newScore } = extractAndScoreEmail(
              email.subject || '',
              email.body,
              {
                total_messages: 2, // At least 2 messages in thread now
                has_pricing_quoted: false,
              },
              { observedAt: email.date ?? null }
            )

            const updates: Record<string, unknown> = {}

            // Only fill fields that are currently null/empty on the inquiry
            if (!inquiry.confirmed_date && newFields.confirmed_date)
              updates.confirmed_date = newFields.confirmed_date
            if (!inquiry.confirmed_guest_count && newFields.confirmed_guest_count)
              updates.confirmed_guest_count = newFields.confirmed_guest_count
            if (!inquiry.confirmed_budget_cents && newFields.confirmed_budget_cents)
              updates.confirmed_budget_cents = newFields.confirmed_budget_cents
            if (!inquiry.confirmed_location && newFields.confirmed_location)
              updates.confirmed_location = newFields.confirmed_location
            if (!inquiry.confirmed_occasion && newFields.confirmed_occasion)
              updates.confirmed_occasion = newFields.confirmed_occasion
            if (
              (!inquiry.confirmed_dietary_restrictions ||
                (inquiry.confirmed_dietary_restrictions as string[]).length === 0) &&
              newFields.confirmed_dietary_restrictions.length > 0
            )
              updates.confirmed_dietary_restrictions = newFields.confirmed_dietary_restrictions
            if (!inquiry.confirmed_cannabis_preference && newFields.confirmed_cannabis_preference)
              updates.confirmed_cannabis_preference = newFields.confirmed_cannabis_preference

            // Re-score if we found new fields
            if (Object.keys(updates).length > 0) {
              // Merge existing unknown_fields with updated lead score
              const existingUnknown =
                (inquiry.unknown_fields as Record<string, unknown> | null) || {}
              updates.unknown_fields = {
                ...existingUnknown,
                lead_score: newScore.lead_score,
                lead_tier: newScore.lead_tier,
                lead_score_factors: newScore.lead_score_factors,
              } as unknown as Json

              // Update chef_likelihood if score improved
              if (
                newScore.lead_tier === 'hot' ||
                (newScore.lead_tier === 'warm' &&
                  (existingUnknown.lead_tier === 'cold' || !existingUnknown.lead_tier))
              ) {
                updates.chef_likelihood = newScore.lead_tier
              }

              await supabase
                .from('inquiries')
                .update(updates)
                .eq('id', linkedInquiryId)
                .eq('tenant_id', tenantId)

              console.log(
                `[handleExistingThread] Updated inquiry ${linkedInquiryId} with new fields:`,
                Object.keys(updates).join(', ')
              )
            }
          } catch (extractErr) {
            // Non-fatal — thread processing continues even if extraction fails
            console.error('[handleExistingThread] Field extraction failed (non-fatal):', extractErr)
          }
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

// ─── TakeAChef Email Handler ────────────────────────────────────────────────

async function handleTakeAChefEmail(
  supabase: DbClient,
  email: ParsedEmail,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const parsed = parseTakeAChefEmail(email)

  if (parsed.parseWarnings.length > 0) {
    console.warn(`[TakeAChef] Parse warnings for ${email.messageId}:`, parsed.parseWarnings)
  }

  try {
    switch (parsed.emailType) {
      case 'tac_new_inquiry':
        await handleTacNewInquiry(supabase, email, parsed, chefId, tenantId, result)
        break

      case 'tac_client_message':
        await handleTacClientMessage(supabase, email, parsed, tenantId, result)
        break

      case 'tac_booking_confirmed':
        await handleTacBookingConfirmed(supabase, email, parsed, chefId, tenantId, result)
        break

      case 'tac_customer_info':
        await handleTacCustomerInfo(supabase, email, parsed, tenantId, result)
        break

      case 'tac_payment':
        await handleTacPayment(supabase, email, parsed, tenantId, result)
        break

      case 'tac_administrative':
      default:
        await logSyncEntry(supabase, tenantId, email, {
          classification: 'marketing',
          confidence: 'high',
          action_taken: 'administrative_skipped',
          platform_email_type: parsed.emailType,
        })
        result.skipped++
        break
    }
  } catch (err) {
    const error = err as Error
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: parsed.emailType,
      error: error.message,
    })
    result.errors.push(`TakeAChef ${parsed.emailType} for ${email.messageId}: ${error.message}`)
  }
}

// ─── TAC: New Inquiry ──────────────────────────────────────────────────────

async function handleTacNewInquiry(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: TacParseResult,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const inquiry = parsed.inquiry
  if (!inquiry) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: 'tac_new_inquiry',
      error: 'Failed to parse inquiry fields from email body',
    })
    result.errors.push(`TakeAChef inquiry parse failed for ${email.messageId}`)
    return
  }

  // Dedup check — same inquiry sent multiple times?
  const dedup = await checkPlatformInquiryDuplicate(supabase, tenantId, {
    channel: 'take_a_chef',
    externalId: inquiry.ctaLink || undefined,
    clientName: inquiry.clientName,
    eventDate: inquiry.eventDate,
  })

  if (dedup.isDuplicate) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'duplicate_skipped',
      platform_email_type: 'tac_new_inquiry',
      inquiry_id: dedup.existingInquiryId,
    })
    result.skipped++
    return
  }

  // Create client record
  let clientId: string | null = null
  try {
    const clientResult = await createClientFromLead(tenantId, {
      full_name: inquiry.clientName,
      email: `tac-${Date.now()}@placeholder.cheflowhq.com`,
      phone: null,
      dietary_restrictions: inquiry.dietaryRestrictions
        ? inquiry.dietaryRestrictions
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      source: 'take_a_chef',
    })
    clientId = clientResult.id
  } catch (clientErr) {
    console.error('[TakeAChef] Client creation failed (non-fatal):', clientErr)
  }

  // Calculate budget in cents from price range + guest count
  let budgetCents: number | null = null
  if (inquiry.priceMaxCents && inquiry.guestCountNumber) {
    // Use the max of the range × guest count as the budget estimate
    budgetCents = inquiry.priceMaxCents * inquiry.guestCountNumber
  } else if (inquiry.priceMinCents && inquiry.guestCountNumber) {
    budgetCents = inquiry.priceMinCents * inquiry.guestCountNumber
  }

  // Compute lead score from parsed platform fields
  const tacLeadScore = scoreInquiryFields({
    confirmed_date: inquiry.eventDate,
    confirmed_guest_count: inquiry.guestCountNumber,
    confirmed_budget_cents: budgetCents,
    confirmed_location: inquiry.location,
    confirmed_occasion: inquiry.occasion,
    confirmed_dietary_restrictions: inquiry.dietaryRestrictions
      ? inquiry.dietaryRestrictions
          .split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : null,
    confirmed_cannabis_preference: null,
    referral_source: 'take_a_chef',
  })

  // Build unknown_fields with all TakeAChef-specific data + lead score
  const unknownFields: Record<string, unknown> = {
    submission_source: 'take_a_chef_gmail_auto',
    original_sender_name: inquiry.clientName,
    guest_count_text: inquiry.guestCountText,
    price_per_person_range: inquiry.pricePerPersonRange,
    experience_type: inquiry.experienceType,
    food_preferences: inquiry.foodPreferences,
    meal_type: inquiry.mealType,
    partner_name: inquiry.partnerName,
    client_notes: inquiry.clientNotes,
    tac_link: inquiry.ctaLink,
    price_min_cents: inquiry.priceMinCents,
    price_max_cents: inquiry.priceMaxCents,
    lead_score: tacLeadScore.lead_score,
    lead_tier: tacLeadScore.lead_tier,
    lead_score_factors: tacLeadScore.lead_score_factors,
  }

  // Create the inquiry
  const { data: newInquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'take_a_chef' as const,
      client_id: clientId,
      first_contact_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      confirmed_date: inquiry.eventDate,
      confirmed_guest_count: inquiry.guestCountNumber,
      confirmed_location: inquiry.location,
      confirmed_occasion: inquiry.occasion,
      confirmed_budget_cents: budgetCents,
      confirmed_dietary_restrictions: inquiry.dietaryRestrictions
        ? inquiry.dietaryRestrictions
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      confirmed_service_expectations: inquiry.experienceType,
      source_message:
        `${inquiry.clientNotes || ''}\n\n--- Original TakeAChef email ---\n${email.body}`.trim(),
      unknown_fields: unknownFields as unknown as Json,
      external_platform: 'take_a_chef',
      external_link: inquiry.ctaLink,
      status: 'new',
      // GOLDMINE: set chef_likelihood + follow_up_due_at from lead score
      chef_likelihood: tacLeadScore.lead_tier,
      follow_up_due_at: new Date(
        Date.now() +
          (tacLeadScore.lead_tier === 'hot'
            ? 4 * 3600000
            : tacLeadScore.lead_tier === 'warm'
              ? 24 * 3600000
              : 72 * 3600000)
      ).toISOString(),
      next_action_required: `Review TakeAChef inquiry from ${inquiry.clientName}`,
      next_action_by: 'chef',
    })
    .select('id')
    .single()

  if (inquiryError || !newInquiry) {
    throw new Error(`Inquiry creation failed: ${inquiryError?.message}`)
  }

  // Log in sync log
  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: 'created_inquiry',
    inquiry_id: newInquiry.id,
    platform_email_type: 'tac_new_inquiry',
  })

  // Notify chef (non-blocking)
  try {
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: 'New TakeAChef inquiry',
        body: `${inquiry.clientName} — ${inquiry.occasion || 'Event'} on ${inquiry.eventDate || 'TBD'} · ${inquiry.guestCountText || '? guests'} · ${inquiry.pricePerPersonRange || 'budget TBD'}`,
        actionUrl: `/inquiries/${newInquiry.id}`,
        inquiryId: newInquiry.id,
        clientId: clientId || undefined,
      })
    }
  } catch (notifErr) {
    console.error('[TakeAChef] Notification failed (non-fatal):', notifErr)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: chefId,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: newInquiry.id,
      summary: `TakeAChef inquiry auto-captured: ${inquiry.clientName} on ${inquiry.eventDate || 'TBD'}`,
      context: {
        channel: 'take_a_chef',
        client_name: inquiry.clientName,
        event_date: inquiry.eventDate,
        guest_count: inquiry.guestCountNumber,
        location: inquiry.location,
        source: 'gmail_auto',
      },
      clientId: clientId || undefined,
    })
  } catch (actErr) {
    console.error('[TakeAChef] Activity log failed (non-fatal):', actErr)
  }

  result.inquiriesCreated++
}

// ─── TAC: Client Message ───────────────────────────────────────────────────

async function handleTacClientMessage(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: TacParseResult,
  tenantId: string,
  result: SyncResult
) {
  const msg = parsed.message
  const clientName = msg?.clientName || null
  const eventDate = msg?.eventDate || null

  // Find the existing inquiry
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: 'take_a_chef',
    clientName,
    eventDate,
    orderId: null,
  })

  if (inquiryId) {
    // Advance status to awaiting_chef (client has messaged — chef needs to respond)
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('status, external_link')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()

    if (inquiry && ['new', 'awaiting_client'].includes(inquiry.status)) {
      await supabase
        .from('inquiries')
        .update({
          status: 'awaiting_chef',
          next_action_required: `${clientName || 'Client'} messaged you on TakeAChef — respond to keep lead warm`,
          next_action_by: 'chef',
          external_link: msg?.ctaLink || inquiry.external_link,
        })
        .eq('id', inquiryId)
        .eq('tenant_id', tenantId)
    }

    // Notify chef
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'inquiry_reply',
          title: 'TakeAChef client messaged you',
          body: `${clientName || 'A client'} sent a message about the ${eventDate || ''} booking`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error('[TakeAChef] Message notification failed (non-fatal):', notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'existing_thread',
    confidence: 'high',
    action_taken: inquiryId ? 'logged_message' : 'unmatched_message',
    inquiry_id: inquiryId,
    platform_email_type: 'tac_client_message',
  })

  result.messagesLogged++
}

// ─── TAC: Booking Confirmed ────────────────────────────────────────────────

async function handleTacBookingConfirmed(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: TacParseResult,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const booking = parsed.booking
  if (!booking) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: 'tac_booking_confirmed',
      error: 'Failed to parse booking fields from email body',
    })
    return
  }

  // Find existing inquiry by client name + date
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: 'take_a_chef',
    clientName: booking.clientName,
    eventDate: null, // Booking may have different date format
    orderId: null,
  })

  if (inquiryId) {
    // Store the Order ID for future matching (customer info, payment)
    await supabase
      .from('inquiries')
      .update({
        status: 'confirmed',
        external_inquiry_id: booking.orderId || null,
        external_link: booking.ctaLink || null,
        confirmed_budget_cents: booking.amountCents,
        confirmed_location: booking.address,
        next_action_required: 'TakeAChef booking confirmed — prepare for event',
        next_action_by: 'chef',
      })
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)

    // Create draft event from booking details
    const { data: existingInquiry } = await supabase
      .from('inquiries')
      .select('client_id, confirmed_date, confirmed_guest_count, confirmed_occasion')
      .eq('id', inquiryId)
      .single()

    if (existingInquiry) {
      const eventDate =
        existingInquiry.confirmed_date ||
        booking.serviceDates?.split(/[-–]/)[0]?.trim() ||
        new Date().toISOString().slice(0, 10)

      const clientId = existingInquiry.client_id
      if (!clientId) return // Cannot create event without a client

      const { data: event } = await supabase
        .from('events')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          inquiry_id: inquiryId,
          event_date: eventDate,
          serve_time: 'TBD',
          guest_count: existingInquiry.confirmed_guest_count ?? 2,
          location_address: booking.address || '',
          location_city: 'TBD',
          location_zip: 'TBD',
          occasion: booking.occasion || existingInquiry.confirmed_occasion || 'Dinner',
          quoted_price_cents: booking.amountCents,
          special_requests: `TakeAChef Order ID: ${booking.orderId}\nService dates: ${booking.serviceDates || 'TBD'}\nRequest type: ${booking.requestType || 'Standard'}`,
        })
        .select('id')
        .single()

      if (event) {
        // Link inquiry to event
        await supabase
          .from('inquiries')
          .update({ converted_to_event_id: event.id })
          .eq('id', inquiryId)

        // Log event state transition
        await supabase.from('event_state_transitions').insert({
          tenant_id: tenantId,
          event_id: event.id,
          from_status: null,
          to_status: 'draft',
          metadata: {
            action: 'auto_created_from_take_a_chef_booking',
            order_id: booking.orderId,
            inquiry_id: inquiryId,
          },
        })

        // Log auto-onboarding activity (non-blocking)
        try {
          const { logChefActivity } = await import('@/lib/activity/log-chef')
          await logChefActivity({
            tenantId,
            actorId: chefId,
            action: 'event_created',
            domain: 'event',
            entityType: 'event',
            entityId: event.id,
            summary: `Auto-created event from TakeAChef booking — Order #${booking.orderId || 'unknown'}. Next: create the final menu.`,
            context: {
              source: 'take_a_chef_booking_email',
              order_id: booking.orderId,
              inquiry_id: inquiryId,
              amount_cents: booking.amountCents,
            },
          })
        } catch (actErr) {
          console.error('[TakeAChef] Activity log failed (non-fatal):', actErr)
        }
      }
    }
  }

  // Notify chef about confirmed booking
  try {
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: 'TakeAChef booking confirmed!',
        body: `${booking.clientName || 'A client'} booked — ${booking.amountUsd ? `$${booking.amountUsd}` : 'amount TBD'} · ${booking.serviceDates || 'dates TBD'}`,
        actionUrl: inquiryId ? `/inquiries/${inquiryId}` : '/inquiries',
        inquiryId: inquiryId || undefined,
      })
    }
  } catch (notifErr) {
    console.error('[TakeAChef] Booking notification failed (non-fatal):', notifErr)
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: inquiryId ? 'booking_confirmed' : 'booking_confirmed_unmatched',
    inquiry_id: inquiryId,
    platform_email_type: 'tac_booking_confirmed',
  })

  result.messagesLogged++
}

// ─── TAC: Customer Information (Personal Info Reveal) ──────────────────────

async function handleTacCustomerInfo(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: TacParseResult,
  tenantId: string,
  result: SyncResult
) {
  const info = parsed.customerInfo
  if (!info) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'personal',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: 'tac_customer_info',
      error: 'Failed to parse customer info fields',
    })
    return
  }

  // Find existing inquiry to get the client
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: 'take_a_chef',
    clientName: info.guestName,
    eventDate: null,
    orderId: null,
  })

  if (inquiryId) {
    // Get the linked client
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('client_id')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()

    if (inquiry?.client_id) {
      // Update client with revealed contact details
      const updates: Record<string, unknown> = {}
      if (info.phoneNumber) updates.phone = info.phoneNumber
      if (info.email) updates.email = info.email.toLowerCase().trim()
      if (info.guestName) updates.full_name = info.guestName

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('clients')
          .update(updates)
          .eq('id', inquiry.client_id)
          .eq('tenant_id', tenantId)
      }
    }

    // Update the inquiry's external link
    if (info.ctaLink) {
      await supabase
        .from('inquiries')
        .update({ external_link: info.ctaLink })
        .eq('id', inquiryId)
        .eq('tenant_id', tenantId)
    }

    // Notify chef
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'inquiry_reply',
          title: 'TakeAChef revealed client contact details',
          body: `${info.guestName || 'Client'} — phone: ${info.phoneNumber || 'N/A'}`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error('[TakeAChef] Customer info notification failed (non-fatal):', notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'personal',
    confidence: 'high',
    action_taken: inquiryId ? 'customer_info_merged' : 'customer_info_unmatched',
    inquiry_id: inquiryId,
    platform_email_type: 'tac_customer_info',
  })

  result.messagesLogged++
}

// ─── TAC: Payment ──────────────────────────────────────────────────────────

async function handleTacPayment(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: TacParseResult,
  tenantId: string,
  result: SyncResult
) {
  // Payment email parsing is TBD (no sample email yet).
  // For now, log it and notify the chef so they can manually close the loop.
  try {
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'inquiry_reply',
        title: 'TakeAChef payment notification received',
        body: `Check your TakeAChef account for payment details — ${email.subject}`,
        actionUrl: '/inquiries?channel=take_a_chef',
      })
    }
  } catch (notifErr) {
    console.error('[TakeAChef] Payment notification failed (non-fatal):', notifErr)
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'personal',
    confidence: 'high',
    action_taken: 'payment_logged',
    platform_email_type: 'tac_payment',
  })

  result.messagesLogged++
}

// ─── Yhangry Email Handler ─────────────────────────────────────────────────

async function handleYhangryEmail(
  supabase: DbClient,
  email: ParsedEmail,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const parsed = parseYhangryEmail(email)

  if (parsed.parseWarnings.length > 0) {
    console.warn(`[Yhangry] Parse warnings for ${email.messageId}:`, parsed.parseWarnings)
  }

  try {
    switch (parsed.emailType) {
      case 'yhangry_new_inquiry':
        await handleYhangryNewInquiry(supabase, email, parsed, chefId, tenantId, result)
        break

      case 'yhangry_client_message':
        await handleYhangryClientMessage(supabase, email, parsed, tenantId, result)
        break

      case 'yhangry_booking_confirmed':
        await handleYhangryBookingConfirmed(supabase, email, parsed, chefId, tenantId, result)
        break

      case 'yhangry_administrative':
      default:
        await logSyncEntry(supabase, tenantId, email, {
          classification: 'marketing',
          confidence: 'high',
          action_taken: 'administrative_skipped',
          platform_email_type: parsed.emailType,
        })
        result.skipped++
        break
    }
  } catch (err) {
    const error = err as Error
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: parsed.emailType,
      error: error.message,
    })
    result.errors.push(`Yhangry ${parsed.emailType} for ${email.messageId}: ${error.message}`)
  }
}

// ─── Yhangry: New Inquiry ─────────────────────────────────────────────────

async function handleYhangryNewInquiry(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: YhangryParseResult,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const inquiry = parsed.inquiry
  if (!inquiry) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: 'yhangry_new_inquiry',
      error: 'Failed to parse inquiry fields from email body',
    })
    result.errors.push(`Yhangry inquiry parse failed for ${email.messageId}`)
    return
  }

  // Dedup check
  const dedup = await checkPlatformInquiryDuplicate(supabase, tenantId, {
    channel: 'yhangry',
    externalId: inquiry.quoteId || undefined,
    clientName: inquiry.clientName || 'Yhangry Client',
    eventDate: inquiry.eventDate,
  })

  if (dedup.isDuplicate) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'duplicate_skipped',
      platform_email_type: 'yhangry_new_inquiry',
      inquiry_id: dedup.existingInquiryId,
    })
    result.skipped++
    return
  }

  // Create client record — name comes from Yhangry later, use placeholder
  let clientId: string | null = null
  try {
    const clientResult = await createClientFromLead(tenantId, {
      full_name: inquiry.clientName || 'Yhangry Client',
      email: `yhangry-${Date.now()}@placeholder.cheflowhq.com`,
      phone: null,
      dietary_restrictions: null,
      source: 'yhangry',
    })
    clientId = clientResult.id
  } catch (clientErr) {
    console.error('[Yhangry] Client creation failed (non-fatal):', clientErr)
  }

  // Compute lead score from parsed platform fields
  const yhangryLeadScore = scoreInquiryFields({
    confirmed_date: inquiry.eventDate,
    confirmed_guest_count: null,
    confirmed_budget_cents: null,
    confirmed_location: inquiry.location,
    confirmed_occasion: inquiry.eventType,
    confirmed_dietary_restrictions: null,
    confirmed_cannabis_preference: null,
    referral_source: 'yhangry',
  })

  // Build unknown_fields with all Yhangry-specific data + lead score
  const unknownFields: Record<string, unknown> = {
    submission_source: 'yhangry_gmail_auto',
    original_sender_name: email.from.name || 'Yhangry',
    platform_rep_name: email.from.name || null,
    location: inquiry.location,
    event_type: inquiry.eventType,
    quote_url: inquiry.quoteUrl,
    quote_id: inquiry.quoteId,
    lead_score: yhangryLeadScore.lead_score,
    lead_tier: yhangryLeadScore.lead_tier,
    lead_score_factors: yhangryLeadScore.lead_score_factors,
  }

  // Create the inquiry
  const { data: newInquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'yhangry',
      client_id: clientId,
      first_contact_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      confirmed_date: inquiry.eventDate,
      confirmed_location: inquiry.location,
      confirmed_occasion: inquiry.eventType || 'private event',
      source_message:
        `${inquiry.eventType || 'Private event'} in ${inquiry.location || 'TBD'}\n\n--- Original Yhangry email ---\n${email.body}`.trim(),
      unknown_fields: unknownFields as unknown as Json,
      external_platform: 'yhangry',
      external_link: inquiry.quoteUrl,
      external_inquiry_id: inquiry.quoteId,
      status: 'new',
      // GOLDMINE: set chef_likelihood + follow_up_due_at from lead score
      chef_likelihood: yhangryLeadScore.lead_tier,
      follow_up_due_at: new Date(
        Date.now() +
          (yhangryLeadScore.lead_tier === 'hot'
            ? 4 * 3600000
            : yhangryLeadScore.lead_tier === 'warm'
              ? 24 * 3600000
              : 72 * 3600000)
      ).toISOString(),
      next_action_required: `Review Yhangry inquiry — ${inquiry.eventType || 'private event'} in ${inquiry.location || 'location TBD'}`,
      next_action_by: 'chef',
    })
    .select('id')
    .single()

  if (inquiryError || !newInquiry) {
    throw new Error(`Inquiry creation failed: ${inquiryError?.message}`)
  }

  // Log in sync log
  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: 'created_inquiry',
    inquiry_id: newInquiry.id,
    platform_email_type: 'yhangry_new_inquiry',
  })

  // Notify chef (non-blocking)
  try {
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: 'New Yhangry inquiry',
        body: `${inquiry.eventType || 'Private event'} in ${inquiry.location || 'TBD'} on ${inquiry.eventDate || 'TBD'}`,
        actionUrl: `/inquiries/${newInquiry.id}`,
        inquiryId: newInquiry.id,
        clientId: clientId || undefined,
      })
    }
  } catch (notifErr) {
    console.error('[Yhangry] Notification failed (non-fatal):', notifErr)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: chefId,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: newInquiry.id,
      summary: `Yhangry inquiry auto-captured: ${inquiry.eventType || 'private event'} in ${inquiry.location || 'TBD'} on ${inquiry.eventDate || 'TBD'}`,
      context: {
        channel: 'yhangry',
        event_type: inquiry.eventType,
        event_date: inquiry.eventDate,
        location: inquiry.location,
        source: 'gmail_auto',
      },
      clientId: clientId || undefined,
    })
  } catch (actErr) {
    console.error('[Yhangry] Activity log failed (non-fatal):', actErr)
  }

  result.inquiriesCreated++
}

// ─── Yhangry: Client Message ──────────────────────────────────────────────

async function handleYhangryClientMessage(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: YhangryParseResult,
  tenantId: string,
  result: SyncResult
) {
  // Find existing inquiry by quote URL or context
  const quoteId = parsed.inquiry?.quoteId || parsed.message?.quoteId || null
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: 'yhangry',
    clientName: null,
    eventDate: null,
    orderId: quoteId,
  })

  if (inquiryId) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('status, external_link')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()

    if (inquiry && ['new', 'awaiting_client'].includes(inquiry.status)) {
      await supabase
        .from('inquiries')
        .update({
          status: 'awaiting_chef',
          next_action_required: 'Client messaged you on Yhangry — respond to keep lead warm',
          next_action_by: 'chef',
        })
        .eq('id', inquiryId)
        .eq('tenant_id', tenantId)
    }

    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'inquiry_reply',
          title: 'Yhangry client messaged you',
          body: `Check your Yhangry account for details`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error('[Yhangry] Message notification failed (non-fatal):', notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'existing_thread',
    confidence: 'high',
    action_taken: inquiryId ? 'logged_message' : 'unmatched_message',
    inquiry_id: inquiryId,
    platform_email_type: 'yhangry_client_message',
  })

  result.messagesLogged++
}

// ─── Yhangry: Booking Confirmed ──────────────────────────────────────────

async function handleYhangryBookingConfirmed(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: YhangryParseResult,
  chefId: string,
  tenantId: string,
  result: SyncResult
) {
  const quoteId = parsed.booking?.quoteId || null
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: 'yhangry',
    clientName: null,
    eventDate: null,
    orderId: quoteId,
  })

  if (inquiryId) {
    await supabase
      .from('inquiries')
      .update({
        status: 'confirmed',
        external_inquiry_id: quoteId,
        confirmed_budget_cents: parsed.booking?.amountCents || null,
        next_action_required: 'Yhangry booking confirmed — prepare for event',
        next_action_by: 'chef',
      })
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)

    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'new_inquiry',
          title: 'Yhangry booking confirmed!',
          body: `Check your Yhangry account for booking details`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error('[Yhangry] Booking notification failed (non-fatal):', notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: inquiryId ? 'booking_confirmed' : 'unmatched_booking',
    inquiry_id: inquiryId,
    platform_email_type: 'yhangry_booking_confirmed',
  })

  result.messagesLogged++
}

// ─── Generic Platform Email Handler ─────────────────────────────────────────
// Handles all new platform parsers (Thumbtack, TheKnot, Bark, Cozymeal,
// GigSalad, Google Business) with a single function. Each parser returns a
// common shape: { emailType, lead/inquiry/booking/message, parseWarnings }.
// The handler routes by email type suffix (new_lead/new_inquiry/new_booking →
// create inquiry, client_message → log + advance status, booking_confirmed →
// confirm, everything else → skip as administrative).

type PlatformChannel =
  | 'thumbtack'
  | 'theknot'
  | 'bark'
  | 'cozymeal'
  | 'gigsalad'
  | 'google_business'
  | 'wix_forms'

// Common parsed result shape — all parsers follow this pattern
interface GenericParseResult {
  emailType: string
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
  // Each parser puts structured data under different keys (lead, inquiry, booking, message, review, etc.)
  // We use index signature to access them generically
  [key: string]: unknown
}

// Map platform channels to the inquiry_channel enum values in the DB
const PLATFORM_TO_INQUIRY_CHANNEL: Record<PlatformChannel, string> = {
  thumbtack: 'thumbtack',
  theknot: 'theknot',
  bark: 'bark',
  cozymeal: 'cozymeal',
  gigsalad: 'gigsalad',
  google_business: 'google_business',
  wix_forms: 'wix',
}

// Map platform channels to display names for notifications
const PLATFORM_DISPLAY_NAMES: Record<PlatformChannel, string> = {
  thumbtack: 'Thumbtack',
  theknot: 'The Knot',
  bark: 'Bark',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  google_business: 'Google Business',
  wix_forms: 'Wix Forms',
}

// Email type suffixes that indicate a new lead/inquiry
const NEW_LEAD_SUFFIXES = [
  '_new_lead',
  '_new_inquiry',
  '_new_booking',
  '_new_message', // GBP messages are potential inquiries
  '_new_review', // GBP reviews — log but notify
  '_quote_requested', // GigSalad quote requests = new leads
]

// Email type suffixes that indicate a client message on existing thread
const CLIENT_MESSAGE_SUFFIXES = ['_client_message', '_lead_update']

// Email type suffixes that indicate a booking confirmation
const BOOKING_CONFIRMED_SUFFIXES = ['_booking_confirmed', '_booking']

async function handleGenericPlatformEmail(
  supabase: DbClient,
  email: ParsedEmail,
  chefId: string,
  tenantId: string,
  result: SyncResult,
  platform: PlatformChannel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseFn: (email: ParsedEmail) => any
) {
  const parsed = parseFn(email)
  const displayName = PLATFORM_DISPLAY_NAMES[platform]

  if (parsed.parseWarnings.length > 0) {
    console.warn(`[${displayName}] Parse warnings for ${email.messageId}:`, parsed.parseWarnings)
  }

  // Ingest into unified communication pipeline (non-blocking)
  if (isCommTriageEnabled()) {
    try {
      const { ingestCommunicationEvent } = await import('@/lib/communication/pipeline')
      await ingestCommunicationEvent({
        tenantId,
        source:
          platform === 'google_business'
            ? 'google_business'
            : platform === 'wix_forms'
              ? 'website_form'
              : platform,
        externalId: email.messageId,
        externalThreadKey: email.threadId,
        timestamp: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
        senderIdentity: `${email.from.name || email.from.email} <${email.from.email}>`,
        rawContent: `${email.subject || ''}\n\n${email.body || ''}`.trim(),
        direction: 'inbound',
        ingestionSource: 'import',
      })
    } catch (intakeErr) {
      console.error(`[${displayName}] Communication intake failed (non-fatal):`, intakeErr)
    }
  }

  try {
    const emailType = parsed.emailType

    // Route by email type category
    if (NEW_LEAD_SUFFIXES.some((s) => emailType.endsWith(s))) {
      await handleGenericNewLead(supabase, email, parsed, chefId, tenantId, result, platform)
    } else if (CLIENT_MESSAGE_SUFFIXES.some((s) => emailType.endsWith(s))) {
      await handleGenericClientMessage(supabase, email, parsed, tenantId, result, platform)
    } else if (BOOKING_CONFIRMED_SUFFIXES.some((s) => emailType.endsWith(s))) {
      await handleGenericBookingConfirmed(supabase, email, parsed, tenantId, result, platform)
    } else {
      // Administrative, payment, etc. — log and skip
      await logSyncEntry(supabase, tenantId, email, {
        classification: 'marketing',
        confidence: 'high',
        action_taken: 'administrative_skipped',
        platform_email_type: emailType,
      })
      result.skipped++
    }
  } catch (err) {
    const error = err as Error
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'error',
      platform_email_type: parsed.emailType,
      error: error.message,
    })
    result.errors.push(
      `${displayName} ${parsed.emailType} for ${email.messageId}: ${error.message}`
    )
  }
}

// ─── Generic: New Lead / Inquiry ─────────────────────────────────────────────

function extractLeadFields(parsed: GenericParseResult): {
  clientName: string
  eventDate: string | null
  location: string | null
  guestCount: number | null
  occasion: string | null
  budgetCents: number | null
  dietaryRestrictions: string | null
  ctaLink: string | null
  externalId: string | null
} {
  // Each parser stores lead data under different keys — try all common ones
  const data =
    (parsed.lead as Record<string, unknown>) ||
    (parsed.inquiry as Record<string, unknown>) ||
    (parsed.booking as Record<string, unknown>) ||
    (parsed.message as Record<string, unknown>) ||
    (parsed.review as Record<string, unknown>) ||
    {}

  const clientName =
    (data.clientName as string) ||
    (data.senderName as string) ||
    (data.reviewerName as string) ||
    'Unknown'

  // Guest count — try various field names
  const guestCount =
    (data.guestCount as number | null) ?? (data.guestCountNumber as number | null) ?? null

  // Budget — try various patterns
  let budgetCents =
    (data.budgetMaxCents as number | null) ?? (data.totalCents as number | null) ?? null
  if (!budgetCents && (data.pricePerPersonCents as number | null) && guestCount) {
    budgetCents = (data.pricePerPersonCents as number) * guestCount
  }

  return {
    clientName,
    eventDate: (data.eventDate as string | null) ?? (data.weddingDate as string | null) ?? null,
    location: (data.location as string | null) ?? null,
    guestCount,
    occasion:
      (data.eventType as string | null) ??
      (data.serviceType as string | null) ??
      (data.occasion as string | null) ??
      (data.projectDescription as string | null) ??
      null,
    budgetCents,
    dietaryRestrictions: (data.dietaryRestrictions as string | null) ?? null,
    ctaLink: (data.ctaLink as string | null) ?? (data.contactLink as string | null) ?? null,
    externalId:
      (data.ctaLink as string | null) ??
      (data.contactLink as string | null) ??
      (data.quoteId as string | null) ??
      null,
  }
}

async function handleGenericNewLead(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: GenericParseResult,
  chefId: string,
  tenantId: string,
  result: SyncResult,
  platform: PlatformChannel
) {
  const fields = extractLeadFields(parsed)
  const displayName = PLATFORM_DISPLAY_NAMES[platform]
  const channelValue = PLATFORM_TO_INQUIRY_CHANNEL[platform]

  // Dedup check
  const dedup = await checkPlatformInquiryDuplicate(supabase, tenantId, {
    channel: channelValue,
    externalId: fields.externalId || undefined,
    clientName: fields.clientName,
    eventDate: fields.eventDate,
  })

  if (dedup.isDuplicate) {
    await logSyncEntry(supabase, tenantId, email, {
      classification: 'inquiry',
      confidence: 'high',
      action_taken: 'duplicate_skipped',
      platform_email_type: parsed.emailType,
      inquiry_id: dedup.existingInquiryId,
    })
    result.skipped++
    return
  }

  // Create client record
  let clientId: string | null = null
  try {
    const clientResult = await createClientFromLead(tenantId, {
      full_name: fields.clientName,
      email: `${platform}-${Date.now()}@placeholder.cheflowhq.com`,
      phone: null,
      dietary_restrictions: fields.dietaryRestrictions
        ? fields.dietaryRestrictions
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      source: channelValue,
    })
    clientId = clientResult.id
  } catch (clientErr) {
    console.error(`[${displayName}] Client creation failed (non-fatal):`, clientErr)
  }

  // Compute lead score from parsed platform fields
  const platformLeadScore = scoreInquiryFields({
    confirmed_date: fields.eventDate,
    confirmed_guest_count: fields.guestCount,
    confirmed_budget_cents: fields.budgetCents,
    confirmed_location: fields.location,
    confirmed_occasion: fields.occasion,
    confirmed_dietary_restrictions: fields.dietaryRestrictions
      ? fields.dietaryRestrictions
          .split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : null,
    confirmed_cannabis_preference: null,
    referral_source: channelValue,
  })

  // Build unknown_fields with all platform-specific data + lead score
  const leadData =
    (parsed.lead as Record<string, unknown>) ||
    (parsed.inquiry as Record<string, unknown>) ||
    (parsed.booking as Record<string, unknown>) ||
    (parsed.message as Record<string, unknown>) ||
    (parsed.review as Record<string, unknown>) ||
    {}

  const unknownFields: Record<string, unknown> = {
    submission_source: `${platform}_gmail_auto`,
    original_sender_name: fields.clientName,
    ...leadData,
    lead_score: platformLeadScore.lead_score,
    lead_tier: platformLeadScore.lead_tier,
    lead_score_factors: platformLeadScore.lead_score_factors,
  }

  // Create the inquiry
  const { data: newInquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: channelValue as any,
      client_id: clientId,
      first_contact_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      confirmed_date: fields.eventDate,
      confirmed_guest_count: fields.guestCount,
      confirmed_location: fields.location,
      confirmed_occasion: fields.occasion,
      confirmed_budget_cents: fields.budgetCents,
      confirmed_dietary_restrictions: fields.dietaryRestrictions
        ? fields.dietaryRestrictions
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      source_message:
        `${fields.occasion || displayName + ' inquiry'}\n\n--- Original ${displayName} email ---\n${email.body}`.trim(),
      unknown_fields: unknownFields as unknown as Json,
      external_platform: channelValue,
      external_link: fields.ctaLink,
      status: 'new',
      // GOLDMINE: set chef_likelihood + follow_up_due_at from lead score
      chef_likelihood: platformLeadScore.lead_tier,
      follow_up_due_at: new Date(
        Date.now() +
          (platformLeadScore.lead_tier === 'hot'
            ? 4 * 3600000
            : platformLeadScore.lead_tier === 'warm'
              ? 24 * 3600000
              : 72 * 3600000)
      ).toISOString(),
      next_action_required:
        platformLeadScore.lead_tier === 'hot'
          ? `🔥 HOT lead (${platformLeadScore.lead_score}/100) — Review ${displayName} inquiry from ${fields.clientName}`
          : `Review ${displayName} inquiry from ${fields.clientName}`,
      next_action_by: 'chef',
    })
    .select('id')
    .single()

  if (inquiryError || !newInquiry) {
    throw new Error(`Inquiry creation failed: ${inquiryError?.message}`)
  }

  // Log in sync log
  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: 'created_inquiry',
    inquiry_id: newInquiry.id,
    platform_email_type: parsed.emailType,
  })

  // Notify chef (non-blocking)
  try {
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: `New ${displayName} inquiry`,
        body: `${fields.clientName} — ${fields.occasion || 'Event'} on ${fields.eventDate || 'TBD'} · ${fields.guestCount ? fields.guestCount + ' guests' : '? guests'}`,
        actionUrl: `/inquiries/${newInquiry.id}`,
        inquiryId: newInquiry.id,
        clientId: clientId || undefined,
      })
    }
  } catch (notifErr) {
    console.error(`[${displayName}] Notification failed (non-fatal):`, notifErr)
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: chefId,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: newInquiry.id,
      summary: `${displayName} inquiry auto-captured: ${fields.clientName} on ${fields.eventDate || 'TBD'}`,
      context: {
        channel: channelValue,
        client_name: fields.clientName,
        event_date: fields.eventDate,
        guest_count: fields.guestCount,
        location: fields.location,
        source: 'gmail_auto',
      },
      clientId: clientId || undefined,
    })
  } catch (actErr) {
    console.error(`[${displayName}] Activity log failed (non-fatal):`, actErr)
  }

  result.inquiriesCreated++
}

// ─── Generic: Client Message ─────────────────────────────────────────────────

async function handleGenericClientMessage(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: GenericParseResult,
  tenantId: string,
  result: SyncResult,
  platform: PlatformChannel
) {
  const displayName = PLATFORM_DISPLAY_NAMES[platform]
  const channelValue = PLATFORM_TO_INQUIRY_CHANNEL[platform]
  const fields = extractLeadFields(parsed)

  // Find existing inquiry by context
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: channelValue,
    clientName: fields.clientName !== 'Unknown' ? fields.clientName : null,
    eventDate: fields.eventDate,
    orderId: fields.externalId,
  })

  if (inquiryId) {
    // Advance status to awaiting_chef (client has messaged — chef needs to respond)
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('status, external_link')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()

    if (inquiry && ['new', 'awaiting_client'].includes(inquiry.status)) {
      await supabase
        .from('inquiries')
        .update({
          status: 'awaiting_chef',
          next_action_required: `${fields.clientName !== 'Unknown' ? fields.clientName : 'Client'} messaged you on ${displayName} — respond to keep lead warm`,
          next_action_by: 'chef',
          external_link: fields.ctaLink || inquiry.external_link,
        })
        .eq('id', inquiryId)
        .eq('tenant_id', tenantId)
    }

    // Notify chef
    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'inquiry_reply',
          title: `${displayName} client messaged you`,
          body: `${fields.clientName !== 'Unknown' ? fields.clientName : 'A client'} sent a message about the ${fields.eventDate || ''} booking`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error(`[${displayName}] Message notification failed (non-fatal):`, notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'existing_thread',
    confidence: 'high',
    action_taken: inquiryId ? 'logged_message' : 'unmatched_message',
    inquiry_id: inquiryId,
    platform_email_type: parsed.emailType,
  })

  result.messagesLogged++
}

// ─── Generic: Booking Confirmed ──────────────────────────────────────────────

async function handleGenericBookingConfirmed(
  supabase: DbClient,
  email: ParsedEmail,
  parsed: GenericParseResult,
  tenantId: string,
  result: SyncResult,
  platform: PlatformChannel
) {
  const displayName = PLATFORM_DISPLAY_NAMES[platform]
  const channelValue = PLATFORM_TO_INQUIRY_CHANNEL[platform]
  const fields = extractLeadFields(parsed)

  // Find existing inquiry
  const inquiryId = await findPlatformInquiryByContext(supabase, tenantId, {
    channel: channelValue,
    clientName: fields.clientName !== 'Unknown' ? fields.clientName : null,
    eventDate: fields.eventDate,
    orderId: fields.externalId,
  })

  if (inquiryId) {
    await supabase
      .from('inquiries')
      .update({
        status: 'confirmed',
        confirmed_budget_cents: fields.budgetCents,
        external_link: fields.ctaLink,
        next_action_required: `${displayName} booking confirmed — prepare for event`,
        next_action_by: 'chef',
      })
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)

    try {
      const chefUserId = await getChefAuthUserId(tenantId)
      if (chefUserId) {
        await createNotification({
          tenantId,
          recipientId: chefUserId,
          category: 'inquiry',
          action: 'new_inquiry',
          title: `${displayName} booking confirmed!`,
          body: `${fields.clientName !== 'Unknown' ? fields.clientName : 'A client'} booked — ${fields.eventDate || 'date TBD'}`,
          actionUrl: `/inquiries/${inquiryId}`,
          inquiryId,
        })
      }
    } catch (notifErr) {
      console.error(`[${displayName}] Booking notification failed (non-fatal):`, notifErr)
    }
  }

  await logSyncEntry(supabase, tenantId, email, {
    classification: 'inquiry',
    confidence: 'high',
    action_taken: inquiryId ? 'booking_confirmed' : 'unmatched_booking',
    inquiry_id: inquiryId,
    platform_email_type: parsed.emailType,
  })

  result.messagesLogged++
}

// ─── Log Sync Entry ─────────────────────────────────────────────────────────

async function logSyncEntry(
  supabase: DbClient,
  tenantId: string,
  email: ParsedEmail,
  entry: {
    classification: string
    confidence: string
    action_taken: string
    inquiry_id?: string | null
    message_id?: string | null
    error?: string | null
    platform_email_type?: string | null
  }
) {
  // Parse received_at from email date header
  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      // Leave null if date is unparseable
    }
  }

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
      // Remy email awareness — store body content for search/context
      body_preview: email.body?.slice(0, 2000) || null,
      snippet: email.body?.slice(0, 200) || null,
      to_address: email.to || null,
      received_at: receivedAt,
      platform_email_type: entry.platform_email_type || null,
    },
    { onConflict: 'tenant_id,gmail_message_id' }
  )
}
