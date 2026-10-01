'use server'

// Historical Email Scan - Server Actions
// Opt-in toggle, status retrieval, findings management, and import flow.
// All actions require requireChef() and are tenant-scoped.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { persistHistoricalInquiry } from '@/lib/business-history-import/persist-inquiry'
import { parseHistoricalInquirySource } from '@/lib/business-history-import/parse-source'
import { requireChef } from '@/lib/auth/get-user'
import { getGoogleGmailControl, listGoogleGmailMailboxes } from '@/lib/google/mailbox-control'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoricalScanStatus {
  enabled: boolean
  status: 'idle' | 'in_progress' | 'completed' | 'paused'
  totalProcessed: number
  startedAt: string | null
  completedAt: string | null
  lastRunAt: string | null
  lookbackDays: number
}

export interface HistoricalFinding {
  id: string
  gmailMessageId: string
  gmailThreadId: string | null
  fromAddress: string
  subject: string | null
  bodyPreview: string | null
  receivedAt: string | null
  classification:
    | 'inquiry'
    | 'existing_thread'
    | 'client'
    | 'event'
    | 'preference'
    | 'payment_invoice'
    | 'follow_up'
  confidence: 'high' | 'medium' | 'low'
  aiReasoning: string | null
  status: 'pending' | 'imported' | 'dismissed'
  importedInquiryId: string | null
  reviewedAt: string | null
  createdAt: string
}

// ─── Enable Historical Scan ───────────────────────────────────────────────────

export async function enableHistoricalEmailScan(): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const mailboxes = await listGoogleGmailMailboxes({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    requireConnected: true,
    allowRepair: true,
    db,
  })

  if (mailboxes.length === 0) {
    const control = await getGoogleGmailControl({
      chefId: user.entityId!,
      tenantId: user.tenantId!,
      db,
      allowRepair: true,
    })
    if (!control.legacyConnection?.gmailConnected) {
      throw new Error('Gmail is not connected')
    }
  }

  if (mailboxes.length > 0) {
    const { error: mailboxError } = await db
      .from('google_mailboxes')
      .update({
        historical_scan_enabled: true,
        historical_scan_status: 'idle',
        historical_scan_lookback_days: 0,
      })
      .in(
        'id',
        mailboxes.map((mailbox) => mailbox.id)
      )
      .eq('tenant_id', user.tenantId!)
    if (mailboxError) throw new Error(mailboxError.message)
  }

  const { error: connectionError } = await db
    .from('google_connections')
    .update({
      historical_scan_enabled: true,
      historical_scan_status: 'idle',
      historical_scan_lookback_days: 0, // 0 = full scan (no date limit)
    })
    .eq('chef_id', user.entityId)
    .eq('tenant_id', user.tenantId!)
  if (connectionError) throw new Error(connectionError.message)

  revalidatePath('/settings')
  revalidatePath('/settings/connections')
  revalidatePath('/imports/business-history')
}

// ─── Disable Historical Scan ──────────────────────────────────────────────────

export async function disableHistoricalEmailScan(): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const mailboxes = await listGoogleGmailMailboxes({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    includeInactive: true,
    allowRepair: true,
    db,
  })

  if (mailboxes.length > 0) {
    const { error: mailboxError } = await db
      .from('google_mailboxes')
      .update({
        historical_scan_enabled: false,
        historical_scan_status: 'paused',
      })
      .in(
        'id',
        mailboxes.map((mailbox) => mailbox.id)
      )
      .eq('tenant_id', user.tenantId!)
    if (mailboxError) throw new Error(mailboxError.message)
  }

  // Pause (not reset) - preserves progress and existing findings
  const { error: connectionError } = await db
    .from('google_connections')
    .update({
      historical_scan_enabled: false,
      historical_scan_status: 'paused',
    })
    .eq('chef_id', user.entityId)
    .eq('tenant_id', user.tenantId!)
  if (connectionError) throw new Error(connectionError.message)

  revalidatePath('/settings')
  revalidatePath('/settings/connections')
  revalidatePath('/imports/business-history')
}

// ─── Get Scan Status ──────────────────────────────────────────────────────────

export async function getHistoricalScanStatus(): Promise<HistoricalScanStatus | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const mailboxes = await listGoogleGmailMailboxes({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    requireConnected: true,
    allowRepair: true,
    db,
  })

  const mailbox = mailboxes[0] || null
  if (mailbox) {
    return {
      enabled: mailbox.historicalScanEnabled ?? false,
      status: (mailbox.historicalScanStatus as HistoricalScanStatus['status']) ?? 'idle',
      totalProcessed: mailbox.historicalScanTotalProcessed ?? 0,
      startedAt: mailbox.historicalScanStartedAt ?? null,
      completedAt: mailbox.historicalScanCompletedAt ?? null,
      lastRunAt: mailbox.historicalScanLastRunAt ?? null,
      lookbackDays: mailbox.historicalScanLookbackDays ?? 0,
    }
  }

  const control = await getGoogleGmailControl({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    db,
    allowRepair: true,
  })
  const legacy = control.legacyConnection
  if (!legacy?.gmailConnected) return null

  return {
    enabled: legacy.historicalScanEnabled ?? false,
    status: (legacy.historicalScanStatus as HistoricalScanStatus['status']) ?? 'idle',
    totalProcessed: legacy.historicalScanTotalProcessed ?? 0,
    startedAt: legacy.historicalScanStartedAt ?? null,
    completedAt: legacy.historicalScanCompletedAt ?? null,
    lastRunAt: legacy.historicalScanLastRunAt ?? null,
    lookbackDays: legacy.historicalScanLookbackDays ?? 0,
  }
}

// ─── Get Findings ─────────────────────────────────────────────────────────────

export async function getHistoricalFindings(
  filter: 'pending' | 'imported' | 'dismissed' | 'all' = 'pending',
  limit = 50
): Promise<HistoricalFinding[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('gmail_historical_findings')
    .select('*')
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
    classification: row.classification as HistoricalFinding['classification'],
    confidence: row.confidence as 'high' | 'medium' | 'low',
    aiReasoning: row.ai_reasoning,
    status: row.status as 'pending' | 'imported' | 'dismissed',
    importedInquiryId: row.imported_inquiry_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }))
}

// ─── Import a Finding as an Inquiry ──────────────────────────────────────────

export async function importHistoricalFinding(findingId: string): Promise<{ inquiryId: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load the finding (tenant-scoped)
  const { data: finding, error: findErr } = await db
    .from('gmail_historical_findings')
    .select('*')
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (findErr || !finding) throw new Error('Finding not found')
  if (finding.status === 'dismissed') throw new Error('Finding was dismissed')
  if (!['inquiry', 'existing_thread'].includes(finding.classification)) {
    throw new Error('This finding needs destination mapping before it can be imported')
  }

  const source = {
    gmailMessageId: finding.gmail_message_id,
    gmailThreadId: finding.gmail_thread_id ?? null,
    mailboxId: finding.mailbox_id ?? null,
    fromAddress: finding.from_address,
    subject: finding.subject ?? null,
    bodyPreview: finding.body_preview ?? null,
    receivedAt: finding.received_at ?? null,
    classification: finding.classification,
  }
  const parsed = parseHistoricalInquirySource(source)
  const result = await persistHistoricalInquiry(pgClient, {
    tenantId: user.tenantId!,
    findingId,
    expectedSource: source,
    inquiryFields: parsed.fields,
    clientLead: parsed.clientLead ?? undefined,
  })

  revalidatePath('/inbox/history-scan')
  revalidatePath('/inquiries')
  revalidatePath('/imports/business-history')

  return result
}

// ─── Dismiss a Single Finding ─────────────────────────────────────────────────

export async function dismissHistoricalFinding(findingId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('gmail_historical_findings')
    .update({
      status: 'dismissed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/inbox/history-scan')
  revalidatePath('/imports/business-history')
}

// ─── Dismiss Many Findings ────────────────────────────────────────────────────

export async function dismissAllFindings(filter: {
  confidence?: 'high' | 'medium' | 'low'
  classification?: HistoricalFinding['classification']
}): Promise<{ count: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
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
  revalidatePath('/imports/business-history')
  return { count: data?.length ?? 0 }
}
