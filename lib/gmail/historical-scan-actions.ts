'use server'

// Historical Email Scan — Server Actions
// Opt-in toggle, status retrieval, findings management, and import flow.
// All actions require requireChef() and are tenant-scoped.

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { parseInquiryFromText } from '@/lib/ai/parse-inquiry'
import { createClientFromLead } from '@/lib/clients/actions'
import type { Json } from '@/types/database'

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
  classification: 'inquiry' | 'existing_thread'
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
  const supabase: any = createServerClient()

  await supabase
    .from('google_connections')
    .update({
      historical_scan_enabled: true,
      historical_scan_status: 'idle',
      historical_scan_lookback_days: 0, // 0 = full scan (no date limit)
    })
    .eq('chef_id', user.entityId)

  revalidatePath('/settings')
}

// ─── Disable Historical Scan ──────────────────────────────────────────────────

export async function disableHistoricalEmailScan(): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Pause (not reset) — preserves progress and existing findings
  await supabase
    .from('google_connections')
    .update({
      historical_scan_enabled: false,
      historical_scan_status: 'paused',
    })
    .eq('chef_id', user.entityId)

  revalidatePath('/settings')
}

// ─── Get Scan Status ──────────────────────────────────────────────────────────

export async function getHistoricalScanStatus(): Promise<HistoricalScanStatus | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('google_connections')
    .select(
      'gmail_connected, historical_scan_enabled, historical_scan_status, historical_scan_total_processed, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at'
    )
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (error || !data) return null

  // If Gmail is not connected, scan can't run
  if (!data.gmail_connected) return null

  return {
    enabled: data.historical_scan_enabled ?? false,
    status: (data.historical_scan_status as HistoricalScanStatus['status']) ?? 'idle',
    totalProcessed: data.historical_scan_total_processed ?? 0,
    startedAt: data.historical_scan_started_at ?? null,
    completedAt: data.historical_scan_completed_at ?? null,
    lastRunAt: data.historical_scan_last_run_at ?? null,
    lookbackDays: data.historical_scan_lookback_days ?? 730,
  }
}

// ─── Get Findings ─────────────────────────────────────────────────────────────

export async function getHistoricalFindings(
  filter: 'pending' | 'imported' | 'dismissed' | 'all' = 'pending',
  limit = 50
): Promise<HistoricalFinding[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
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
    classification: row.classification as 'inquiry' | 'existing_thread',
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
  const supabase: any = createServerClient()

  // Load the finding (tenant-scoped)
  const { data: finding, error: findErr } = await supabase
    .from('gmail_historical_findings')
    .select('*')
    .eq('id', findingId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (findErr || !finding) throw new Error('Finding not found')
  if (finding.status !== 'pending') throw new Error('Finding already reviewed')

  // Parse email body into structured inquiry data
  const bodyText = finding.body_preview ?? ''
  const parseResult = await parseInquiryFromText(bodyText)

  // Parse sender name and email from from_address field
  // Format stored: "Name <email>" or just "<email>"
  const fromAddressRaw = finding.from_address as string
  const emailMatch = fromAddressRaw.match(/<([^>]+)>/)
  const leadEmail = emailMatch ? emailMatch[1] : fromAddressRaw.trim()
  const nameMatch = fromAddressRaw.match(/^(.+?)\s*</)
  const leadName =
    parseResult.parsed.client_name || (nameMatch ? nameMatch[1].trim() : null) || 'Unknown'

  // Find or create client
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
    // Non-fatal — create inquiry without client link
  }

  // Build audit trail
  const unknownFields: Record<string, string> = {
    imported_from: 'historical_email_scan',
    original_sender: fromAddressRaw,
    gmail_message_id: finding.gmail_message_id,
  }
  if (finding.subject) unknownFields.subject = finding.subject

  // Create the inquiry
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

  // Log original email as a message on the inquiry
  await supabase.from('messages').insert({
    tenant_id: user.tenantId!,
    inquiry_id: inquiry.id,
    client_id: clientId,
    channel: 'email' as const,
    direction: 'inbound' as const,
    status: 'logged' as const,
    subject: finding.subject ?? null,
    body: bodyText,
    sent_at: receivedAt,
    gmail_message_id: finding.gmail_message_id,
    gmail_thread_id: finding.gmail_thread_id ?? null,
  })

  // Mark finding as imported
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

// ─── Dismiss a Single Finding ─────────────────────────────────────────────────

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

// ─── Dismiss Many Findings ────────────────────────────────────────────────────

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
