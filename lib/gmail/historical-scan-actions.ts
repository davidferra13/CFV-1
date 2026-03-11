'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import {
  isPersistedGoogleMailboxId,
  listGoogleMailboxesForChef,
  syncLegacyGoogleConnectionFromPrimary,
} from '@/lib/google/mailboxes'
import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export interface HistoricalScanMailboxStatus {
  id: string
  email: string
  enabled: boolean
  status: 'idle' | 'in_progress' | 'completed' | 'paused'
  percentComplete: number | null
  totalProcessed: number
  totalSeen: number
  estimatedTotal: number | null
  startedAt: string | null
  completedAt: string | null
  includeSpamTrash: boolean
  lastRunAt: string | null
  lookbackDays: number
  isPrimary: boolean
}

export interface HistoricalScanStatus {
  enabled: boolean
  status: 'idle' | 'in_progress' | 'completed' | 'paused'
  percentComplete: number | null
  totalProcessed: number
  totalSeen: number
  estimatedTotal: number | null
  startedAt: string | null
  completedAt: string | null
  includeSpamTrash: boolean
  lastRunAt: string | null
  lookbackDays: number
  mailboxes: HistoricalScanMailboxStatus[]
}

export interface HistoricalFinding {
  id: string
  gmailMessageId: string
  gmailThreadId: string | null
  fromAddress: string
  subject: string | null
  bodyPreview: string | null
  receivedAt: string | null
  classification: 'inquiry' | 'existing_thread'
  confidence: 'high' | 'medium' | 'low'
  aiReasoning: string | null
  status: 'pending' | 'imported' | 'dismissed'
  importedInquiryId: string | null
  mailboxId: string | null
  mailboxEmail: string | null
  reviewedAt: string | null
  createdAt: string
}

function getStoredMailboxId(mailboxId: string) {
  return isPersistedGoogleMailboxId(mailboxId) ? mailboxId : null
}

function mapMailboxStatus(mailbox: any): HistoricalScanMailboxStatus {
  const totalSeen = mailbox.historicalScanTotalSeen ?? mailbox.historicalScanTotalProcessed ?? 0
  const estimatedTotal =
    mailbox.historicalScanResultSizeEstimate != null
      ? Math.max(mailbox.historicalScanResultSizeEstimate, totalSeen)
      : null
  const percentComplete =
    estimatedTotal && estimatedTotal > 0
      ? Math.min(100, Math.round((totalSeen / estimatedTotal) * 100))
      : null

  return {
    id: mailbox.id,
    email: mailbox.email,
    enabled: mailbox.historicalScanEnabled ?? false,
    status: mailbox.historicalScanStatus ?? 'idle',
    percentComplete,
    totalProcessed: mailbox.historicalScanTotalProcessed ?? 0,
    totalSeen,
    estimatedTotal,
    startedAt: mailbox.historicalScanStartedAt ?? null,
    completedAt: mailbox.historicalScanCompletedAt ?? null,
    includeSpamTrash: mailbox.historicalScanIncludeSpamTrash ?? true,
    lastRunAt: mailbox.historicalScanLastRunAt ?? null,
    lookbackDays: mailbox.historicalScanLookbackDays ?? 0,
    isPrimary: mailbox.isPrimary ?? false,
  }
}

function deriveAggregateStatus(
  mailboxes: HistoricalScanMailboxStatus[]
): HistoricalScanStatus['status'] {
  if (mailboxes.some((mailbox) => mailbox.enabled && mailbox.status === 'in_progress')) {
    return 'in_progress'
  }
  if (mailboxes.some((mailbox) => mailbox.enabled && mailbox.status === 'idle')) {
    return 'idle'
  }
  if (mailboxes.length > 0 && mailboxes.every((mailbox) => mailbox.status === 'completed')) {
    return 'completed'
  }
  return 'paused'
}

export async function enableHistoricalEmailScan(): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })
  const mailboxes = (await listGoogleMailboxesForChef(user.entityId)).filter(
    (mailbox) => mailbox.gmailConnected && mailbox.isActive
  )

  if (mailboxes.length === 0) {
    await supabase
      .from('google_connections')
      .update({
        historical_scan_enabled: true,
        historical_scan_include_spam_trash: true,
        historical_scan_status: 'idle',
        historical_scan_lookback_days: 0,
      })
      .eq('chef_id', user.entityId)
  } else {
    const persistedIds = mailboxes.map((mailbox) => getStoredMailboxId(mailbox.id)).filter(Boolean)
    if (persistedIds.length > 0) {
      await supabase
        .from('google_mailboxes')
        .update({
          historical_scan_enabled: true,
          historical_scan_include_spam_trash: true,
          historical_scan_status: 'idle',
          historical_scan_lookback_days: 0,
        })
        .in('id', persistedIds)
    } else {
      await supabase
        .from('google_connections')
        .update({
          historical_scan_enabled: true,
          historical_scan_include_spam_trash: true,
          historical_scan_status: 'idle',
          historical_scan_lookback_days: 0,
        })
        .eq('chef_id', user.entityId)
    }
  }

  await syncLegacyGoogleConnectionFromPrimary(user.entityId, user.tenantId || user.entityId)
  revalidatePath('/settings')
  revalidatePath('/inbox/history-scan')
}

export async function disableHistoricalEmailScan(): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient({ admin: true })
  const mailboxes = (await listGoogleMailboxesForChef(user.entityId)).filter(
    (mailbox) => mailbox.gmailConnected && mailbox.isActive
  )
  const persistedIds = mailboxes.map((mailbox) => getStoredMailboxId(mailbox.id)).filter(Boolean)

  if (persistedIds.length > 0) {
    await supabase
      .from('google_mailboxes')
      .update({
        historical_scan_enabled: false,
        historical_scan_status: 'paused',
      })
      .in('id', persistedIds)
  } else {
    await supabase
      .from('google_connections')
      .update({
        historical_scan_enabled: false,
        historical_scan_status: 'paused',
      })
      .eq('chef_id', user.entityId)
  }

  await syncLegacyGoogleConnectionFromPrimary(user.entityId, user.tenantId || user.entityId)
  revalidatePath('/settings')
  revalidatePath('/inbox/history-scan')
}

export async function getHistoricalScanStatus(): Promise<HistoricalScanStatus | null> {
  const user = await requireChef()
  const mailboxes = await listGoogleMailboxesForChef(user.entityId)
  const connectedMailboxes = mailboxes
    .filter((mailbox) => mailbox.gmailConnected && mailbox.isActive)
    .map(mapMailboxStatus)

  if (connectedMailboxes.length === 0) {
    return null
  }

  const estimatedTotals = connectedMailboxes
    .map((mailbox) => mailbox.estimatedTotal)
    .filter((value): value is number => typeof value === 'number')
  const estimatedTotal =
    estimatedTotals.length > 0 ? estimatedTotals.reduce((sum, value) => sum + value, 0) : null
  const totalSeen = connectedMailboxes.reduce((sum, mailbox) => sum + mailbox.totalSeen, 0)
  const completedAtCandidates = connectedMailboxes
    .map((mailbox) => mailbox.completedAt)
    .filter(Boolean)
    .sort()
  const lastRunCandidates = connectedMailboxes
    .map((mailbox) => mailbox.lastRunAt)
    .filter(Boolean)
    .sort()
  const percentComplete =
    estimatedTotal && estimatedTotal > 0
      ? Math.min(100, Math.round((totalSeen / estimatedTotal) * 100))
      : null

  return {
    enabled: connectedMailboxes.some((mailbox) => mailbox.enabled),
    status: deriveAggregateStatus(connectedMailboxes),
    percentComplete,
    totalProcessed: connectedMailboxes.reduce((sum, mailbox) => sum + mailbox.totalProcessed, 0),
    totalSeen,
    estimatedTotal,
    startedAt:
      connectedMailboxes
        .map((mailbox) => mailbox.startedAt)
        .filter(Boolean)
        .sort()[0] ?? null,
    completedAt: completedAtCandidates[completedAtCandidates.length - 1] ?? null,
    includeSpamTrash: connectedMailboxes.every((mailbox) => mailbox.includeSpamTrash),
    lastRunAt: lastRunCandidates[lastRunCandidates.length - 1] ?? null,
    lookbackDays: Math.max(...connectedMailboxes.map((mailbox) => mailbox.lookbackDays)),
    mailboxes: connectedMailboxes,
  }
}

export async function getHistoricalFindings(
  filter: 'pending' | 'imported' | 'dismissed' | 'all' = 'pending',
  limit = 50
): Promise<HistoricalFinding[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('gmail_historical_findings')
    .select('*, mailbox:google_mailboxes(email)')
    .eq('tenant_id', user.tenantId!)
    .order('received_at', { ascending: false })
    .limit(limit)

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error || !data) return []

  return (data as any[]).map((row) => ({
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    gmailThreadId: row.gmail_thread_id,
    fromAddress: row.from_address,
    subject: row.subject,
    bodyPreview: row.body_preview,
    receivedAt: row.received_at,
    classification: row.classification as 'inquiry' | 'existing_thread',
    confidence: row.confidence as 'high' | 'medium' | 'low',
    aiReasoning: row.ai_reasoning,
    status: row.status as 'pending' | 'imported' | 'dismissed',
    importedInquiryId: row.imported_inquiry_id,
    mailboxId: row.mailbox_id ?? null,
    mailboxEmail: row.mailbox?.email ?? null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }))
}

export async function importHistoricalFinding(findingId: string): Promise<{ inquiryId: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: finding, error: findErr } = await supabase
    .from('gmail_historical_findings')
    .select('*')
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (findErr || !finding) throw new Error('Finding not found')
  if (finding.status !== 'pending') throw new Error('Finding already reviewed')

  const bodyText = finding.body_preview ?? ''
  const parseResult = await parseInquiryFromText(bodyText)

  const fromAddressRaw = finding.from_address as string
  const emailMatch = fromAddressRaw.match(/<([^>]+)>/)
  const leadEmail = emailMatch ? emailMatch[1] : fromAddressRaw.trim()
  const nameMatch = fromAddressRaw.match(/^(.+?)\s*</)
  const leadName =
    parseResult.parsed.client_name || (nameMatch ? nameMatch[1].trim() : null) || 'Unknown'

  let clientId: string | null = null
  try {
    const clientResult = await createClientFromLead(user.tenantId!, {
      email: leadEmail,
      full_name: leadName,
      phone: parseResult.parsed.client_phone ?? null,
      dietary_restrictions: parseResult.parsed.confirmed_dietary_restrictions ?? null,
      source: 'email',
    })
    clientId = clientResult.id
  } catch {
    clientId = null
  }

  const unknownFields: Record<string, string> = {
    imported_from: 'historical_email_scan',
    original_sender: fromAddressRaw,
    gmail_message_id: finding.gmail_message_id,
  }
  if (finding.subject) unknownFields.subject = finding.subject

  const receivedAt = finding.received_at
    ? new Date(finding.received_at).toISOString()
    : new Date().toISOString()

  const { data: inquiry, error: inquiryErr } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: user.tenantId!,
      channel: 'email' as const,
      client_id: clientId,
      first_contact_at: receivedAt,
      confirmed_date: parseResult.parsed.confirmed_date ?? null,
      confirmed_guest_count: parseResult.parsed.confirmed_guest_count ?? null,
      confirmed_location: parseResult.parsed.confirmed_location ?? null,
      confirmed_occasion: parseResult.parsed.confirmed_occasion ?? null,
      confirmed_budget_cents: parseResult.parsed.confirmed_budget_cents ?? null,
      confirmed_dietary_restrictions:
        (parseResult.parsed.confirmed_dietary_restrictions?.length ?? 0) > 0
          ? parseResult.parsed.confirmed_dietary_restrictions
          : null,
      confirmed_service_expectations: parseResult.parsed.confirmed_service_expectations ?? null,
      source_message: bodyText,
      unknown_fields:
        Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
      next_action_required: 'Review imported historical inquiry',
      next_action_by: 'chef',
    })
    .select()
    .single()

  if (inquiryErr) throw new Error(inquiryErr.message)

  await supabase.from('messages').insert({
    tenant_id: user.tenantId!,
    inquiry_id: inquiry.id,
    client_id: clientId,
    mailbox_id: finding.mailbox_id ?? null,
    channel: 'email' as const,
    direction: 'inbound' as const,
    status: 'logged' as const,
    subject: finding.subject ?? null,
    body: bodyText,
    sent_at: receivedAt,
    gmail_message_id: finding.gmail_message_id,
    gmail_thread_id: finding.gmail_thread_id ?? null,
  })

  await supabase
    .from('gmail_historical_findings')
    .update({
      status: 'imported',
      imported_inquiry_id: inquiry.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/inbox/history-scan')
  revalidatePath('/inquiries')

  return { inquiryId: inquiry.id }
}

export async function dismissHistoricalFinding(findingId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await supabase
    .from('gmail_historical_findings')
    .update({
      status: 'dismissed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/inbox/history-scan')
}

export async function dismissAllFindings(filter: {
  confidence?: 'high' | 'medium' | 'low'
  classification?: 'inquiry' | 'existing_thread'
}): Promise<{ count: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('gmail_historical_findings')
    .update({
      status: 'dismissed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')

  if (filter.confidence) query = query.eq('confidence', filter.confidence)
  if (filter.classification) query = query.eq('classification', filter.classification)

  const { data, error } = await query.select('id')
  if (error) throw new Error(error.message)

  revalidatePath('/inbox/history-scan')
  return { count: data?.length ?? 0 }
}
