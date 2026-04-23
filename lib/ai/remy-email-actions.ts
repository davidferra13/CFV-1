'use server'

// Remy - Email Awareness Actions
// PRIVACY: Email content contains client PII - all processing via local Ollama only.
// These functions let Remy read, search, and summarize the chef's email inbox.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'
import { getGoogleGmailControl } from '@/lib/google/mailbox-control'

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// ─── Get Recent Emails ──────────────────────────────────────────────────────

export async function getRecentEmails(limit = 10) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('gmail_sync_log')
    .select(
      'gmail_message_id, gmail_thread_id, from_address, subject, snippet, classification, confidence, action_taken, received_at, inquiry_id'
    )
    .eq('tenant_id', tenantId)
    .not('action_taken', 'eq', 'error')
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  return {
    emails: (data ?? []).map((e: any) => ({
      messageId: e.gmail_message_id,
      threadId: e.gmail_thread_id,
      from: e.from_address ?? '',
      subject: e.subject ?? '(no subject)',
      snippet: e.snippet ?? '',
      classification: e.classification ?? 'unknown',
      confidence: e.confidence ?? 'low',
      action: e.action_taken ?? 'unknown',
      receivedAt: e.received_at ?? '',
      inquiryId: e.inquiry_id ?? null,
    })),
    count: (data ?? []).length,
  }
}

// ─── Search Emails ──────────────────────────────────────────────────────────

export async function searchEmails(query: string, limit = 10) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const searchTerm = `%${query.toLowerCase()}%`

  // Search across subject, from_address, and body_preview
  const { data } = await db
    .from('gmail_sync_log')
    .select(
      'gmail_message_id, gmail_thread_id, from_address, subject, snippet, body_preview, classification, received_at, inquiry_id'
    )
    .eq('tenant_id', tenantId)
    .not('action_taken', 'eq', 'error')
    .or(
      `subject.ilike.${searchTerm},from_address.ilike.${searchTerm},body_preview.ilike.${searchTerm}`
    )
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  return {
    query,
    emails: (data ?? []).map((e: any) => ({
      messageId: e.gmail_message_id,
      threadId: e.gmail_thread_id,
      from: e.from_address ?? '',
      subject: e.subject ?? '(no subject)',
      snippet: e.snippet ?? '',
      preview: e.body_preview?.slice(0, 300) ?? '',
      classification: e.classification ?? 'unknown',
      receivedAt: e.received_at ?? '',
      inquiryId: e.inquiry_id ?? null,
    })),
    count: (data ?? []).length,
  }
}

// ─── Get Email Thread ───────────────────────────────────────────────────────

export async function getEmailThread(threadId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get all emails in this thread from sync log
  const { data: syncEmails } = await db
    .from('gmail_sync_log')
    .select('gmail_message_id, from_address, subject, body_preview, classification, received_at')
    .eq('tenant_id', tenantId)
    .eq('gmail_thread_id', threadId)
    .order('received_at', { ascending: true })
    .limit(30)

  // Also get stored messages (may have richer body content)
  const { data: messages } = await db
    .from('messages')
    .select('direction, subject, body, sent_at, channel')
    .eq('tenant_id', tenantId)
    .eq('gmail_thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(30)

  // Check if this thread is linked to an inquiry
  const { data: inquiryMsg } = await db
    .from('messages')
    .select('inquiry_id')
    .eq('tenant_id', tenantId)
    .eq('gmail_thread_id', threadId)
    .not('inquiry_id', 'is', null)
    .limit(1)
    .maybeSingle()

  return {
    threadId,
    inquiryId: inquiryMsg?.inquiry_id ?? null,
    syncedEmails: (syncEmails ?? []).map((e: any) => ({
      messageId: e.gmail_message_id,
      from: e.from_address ?? '',
      subject: e.subject ?? '(no subject)',
      body: e.body_preview ?? '',
      classification: e.classification ?? 'unknown',
      receivedAt: e.received_at ?? '',
    })),
    storedMessages: (messages ?? []).map((m: any) => ({
      direction: m.direction,
      subject: m.subject ?? '',
      body: (m.body ?? '').slice(0, 1000),
      sentAt: m.sent_at ?? '',
      channel: m.channel ?? 'email',
    })),
  }
}

// ─── Inbox Summary ──────────────────────────────────────────────────────────

export async function summarizeInbox() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const now = new Date()
  const today = localDateISO(now)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Count by classification (last 7 days)
  const { data: recentEmails } = await db
    .from('gmail_sync_log')
    .select('classification, action_taken, received_at')
    .eq('tenant_id', tenantId)
    .gte('received_at', weekAgo)
    .not('action_taken', 'eq', 'error')

  const emails = recentEmails ?? []

  const totalThisWeek = emails.length
  const todayEmails = emails.filter((e: any) => e.received_at?.startsWith(today))
  const byClassification: Record<string, number> = {}
  for (const e of emails) {
    const cls = e.classification ?? 'unknown'
    byClassification[cls] = (byClassification[cls] ?? 0) + 1
  }

  // Count unactioned inquiries (created_inquiry but no follow-up yet)
  const inquiryEmails = emails.filter((e: any) => e.action_taken === 'created_inquiry')

  // Get last sync time
  const control = await getGoogleGmailControl({
    chefId: user.entityId!,
    tenantId,
    db,
    allowRepair: true,
  })

  return {
    totalThisWeek,
    todayCount: todayEmails.length,
    byClassification,
    newInquiries: inquiryEmails.length,
    threadReplies: byClassification['existing_thread'] ?? 0,
    personalSkipped: byClassification['personal'] ?? 0,
    spamSkipped: (byClassification['spam'] ?? 0) + (byClassification['marketing'] ?? 0),
    lastSyncAt:
      control.mailbox?.gmailLastSyncAt ?? control.legacyConnection?.gmailLastSyncAt ?? null,
  }
}

// ─── Draft Email Reply ──────────────────────────────────────────────────────

export async function draftEmailReply(messageId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Load the email we're replying to
  const { data: email } = await db
    .from('gmail_sync_log')
    .select('from_address, subject, body_preview, classification, gmail_thread_id')
    .eq('tenant_id', tenantId)
    .eq('gmail_message_id', messageId)
    .single()

  if (!email) {
    return { error: 'Email not found', draftText: '' }
  }

  // Load thread context if available
  let threadContext = ''
  if (email.gmail_thread_id) {
    const { data: threadMsgs } = await db
      .from('messages')
      .select('direction, body, sent_at')
      .eq('tenant_id', tenantId)
      .eq('gmail_thread_id', email.gmail_thread_id)
      .order('sent_at', { ascending: true })
      .limit(5)

    if (threadMsgs && threadMsgs.length > 0) {
      threadContext = threadMsgs
        .map((m: any) => {
          const dir = m.direction === 'inbound' ? 'Client' : 'Chef'
          return `${dir}: ${(m.body ?? '').slice(0, 300)}`
        })
        .join('\n\n')
    }
  }

  // Load client context if we can match sender to a client
  let clientContext = ''
  if (email.from_address) {
    const { data: client } = await db
      .from('clients')
      .select('full_name, dietary_restrictions, allergies, vibe_notes')
      .eq('tenant_id', tenantId)
      .eq('email', email.from_address)
      .maybeSingle()

    if (client) {
      clientContext = `Client: ${client.full_name ?? 'Unknown'}. ${client.dietary_restrictions?.length ? `Dietary: ${client.dietary_restrictions.join(', ')}. ` : ''}${client.vibe_notes ? `Vibe: ${client.vibe_notes}` : ''}`
    }
  }

  const ReplySchema = z.object({
    subject: z.string(),
    body: z.string(),
  })

  const result = await parseWithOllama(
    `You are a private chef's email assistant. Draft a professional, warm reply to this email. Write in the chef's voice (first person singular "I"). Keep it concise (2-4 short paragraphs). Don't be salesy. Return JSON: { "subject": "Re: ...", "body": "..." }`,
    `Reply to this email:
From: ${email.from_address}
Subject: ${email.subject ?? '(no subject)'}
Body: ${email.body_preview?.slice(0, 1000) ?? '(no content)'}
${threadContext ? `\nThread history:\n${threadContext}` : ''}
${clientContext ? `\n${clientContext}` : ''}`,
    ReplySchema,
    { modelTier: 'standard' }
  )

  return {
    originalFrom: email.from_address,
    originalSubject: email.subject,
    subject: result.subject,
    draftText: `Subject: ${result.subject}\n\n${result.body}`,
  }
}

// ─── Email Digest for Remy Context ──────────────────────────────────────────
// Used by remy-context.ts to build the email awareness tier.

export async function loadEmailDigest(tenantId: string) {
  // Tenant isolation: verify tenantId matches session when called from user context
  const { getCurrentUser } = await import('@/lib/auth/get-user')
  const sessionUser = await getCurrentUser()
  if (sessionUser && tenantId !== sessionUser.tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }
  const db: any = createServerClient()
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db
    .from('gmail_sync_log')
    .select('from_address, subject, snippet, classification, action_taken, received_at')
    .eq('tenant_id', tenantId)
    .gte('received_at', yesterday)
    .not('action_taken', 'eq', 'error')
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(10)

  const emails = data ?? []

  const inquiryCount = emails.filter((e: any) => e.action_taken === 'created_inquiry').length
  const threadReplyCount = emails.filter((e: any) => e.classification === 'existing_thread').length

  return {
    totalSinceYesterday: emails.length,
    inquiryCount,
    threadReplyCount,
    recentEmails: emails.slice(0, 5).map((e: any) => ({
      from: e.from_address ?? '',
      subject: e.subject ?? '(no subject)',
      snippet: e.snippet ?? '',
      classification: e.classification ?? 'unknown',
      receivedAt: e.received_at ?? '',
    })),
  }
}
