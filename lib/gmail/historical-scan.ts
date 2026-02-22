// Gmail Historical Scan Engine
// Crawls a chef's full Gmail history in batches, classifying each email and
// staging potential missed inquiries for chef review.
//
// Key design principles:
// - Runs via cron (no user session). Uses admin Supabase client.
// - Processes BATCH_SIZE messages per call, persists pagination token so it
//   resumes exactly where it left off on next run.
// - Reuses existing gmail_sync_log dedup constraint — any email already
//   processed by the live sync is automatically skipped.
// - Only surfaces inquiry + existing_thread classifications as findings.
//   Personal, spam, and marketing emails are silently discarded.
// - Nothing is auto-imported. Findings wait in gmail_historical_findings for
//   explicit chef review.

import { createServerClient } from '@/lib/supabase/server'
import { getGoogleAccessToken } from '@/lib/google/auth'
import { listMessagesPage, getFullMessage } from './client'
import { classifyEmail } from './classify'

const BATCH_SIZE = 100

export interface HistoricalScanBatchResult {
  chefId: string
  processed: number
  findingsAdded: number
  skipped: number
  errors: string[]
  status: 'in_progress' | 'completed' | 'error'
}

// ─── Main Batch Function ─────────────────────────────────────────────────────

export async function runHistoricalScanBatch(
  chefId: string,
  tenantId: string
): Promise<HistoricalScanBatchResult> {
  const result: HistoricalScanBatchResult = {
    chefId,
    processed: 0,
    findingsAdded: 0,
    skipped: 0,
    errors: [],
    status: 'in_progress',
  }

  const supabase = createServerClient({ admin: true })

  // ── Load connection row ────────────────────────────────────────────────────
  const { data: conn, error: connErr } = await supabase
    .from('google_connections')
    .select(
      'connected_email, gmail_connected, historical_scan_enabled, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_lookback_days'
    )
    .eq('chef_id', chefId)
    .single()

  if (connErr || !conn) {
    result.errors.push('No google_connections row found')
    result.status = 'error'
    return result
  }

  // Safety checks — bail out immediately if scan should not be running
  if (!conn.gmail_connected) {
    result.errors.push('Gmail not connected')
    result.status = 'error'
    return result
  }

  const scanConn = conn as Record<string, unknown>

  if (!scanConn.historical_scan_enabled) {
    result.status = 'error'
    result.errors.push('Historical scan not enabled')
    return result
  }

  if ((scanConn.historical_scan_status as string) === 'completed') {
    result.status = 'completed'
    return result
  }

  // ── Get access token ───────────────────────────────────────────────────────
  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(chefId)
  } catch (err) {
    result.errors.push(`Token error: ${(err as Error).message}`)
    result.status = 'error'
    return result
  }

  // ── Build Gmail search query (date-bounded) ────────────────────────────────
  const lookbackDays = (scanConn.historical_scan_lookback_days as number) ?? 730
  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceStr = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`
  const gmailQuery = `after:${sinceStr}`

  // ── Fetch this batch of message IDs ───────────────────────────────────────
  let pageResult: { messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }
  try {
    pageResult = await listMessagesPage(accessToken, {
      pageToken: (scanConn.historical_scan_page_token as string | undefined) ?? undefined,
      query: gmailQuery,
      maxResults: BATCH_SIZE,
    })
  } catch (err) {
    result.errors.push(`List messages failed: ${(err as Error).message}`)
    result.status = 'error'
    return result
  }

  // ── Load known client emails for richer classification context ─────────────
  const { data: clients } = await supabase.from('clients').select('email').eq('tenant_id', tenantId)

  const knownClientEmails = (clients ?? [])
    .map((c: { email: string | null }) => c.email)
    .filter(Boolean) as string[]

  const connectedEmail = conn.connected_email as string | null

  // ── Process each message ───────────────────────────────────────────────────
  for (const msgRef of pageResult.messages) {
    try {
      await processHistoricalMessage(
        supabase,
        accessToken,
        msgRef.id,
        chefId,
        tenantId,
        connectedEmail,
        knownClientEmails,
        result
      )
    } catch (err) {
      result.errors.push(`Message ${msgRef.id}: ${(err as Error).message}`)
    }
  }

  // ── Persist scan progress ──────────────────────────────────────────────────
  const isLastPage = !pageResult.nextPageToken
  const newTotalProcessed =
    ((scanConn.historical_scan_total_processed as number) ?? 0) + result.processed

  const progressUpdate: Record<string, unknown> = {
    historical_scan_page_token: pageResult.nextPageToken ?? null,
    historical_scan_total_processed: newTotalProcessed,
    historical_scan_last_run_at: new Date().toISOString(),
  }

  if (isLastPage) {
    progressUpdate.historical_scan_status = 'completed'
    progressUpdate.historical_scan_completed_at = new Date().toISOString()
    result.status = 'completed'
  } else {
    progressUpdate.historical_scan_status = 'in_progress'
    if (!scanConn.historical_scan_started_at) {
      progressUpdate.historical_scan_started_at = new Date().toISOString()
    }
  }

  await supabase.from('google_connections').update(progressUpdate).eq('chef_id', chefId)

  return result
}

// ─── Process a Single Historical Message ─────────────────────────────────────

async function processHistoricalMessage(
  supabase: ReturnType<typeof createServerClient>,
  accessToken: string,
  messageId: string,
  chefId: string,
  tenantId: string,
  connectedEmail: string | null,
  knownClientEmails: string[],
  result: HistoricalScanBatchResult
) {
  // Dedup — skip if already in gmail_sync_log (live sync or prior historical scan)
  const { data: existing } = await supabase
    .from('gmail_sync_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('gmail_message_id', messageId)
    .maybeSingle()

  if (existing) {
    result.skipped++
    return
  }

  // Fetch full email
  const email = await getFullMessage(accessToken, messageId)
  result.processed++

  // Skip outbound (emails sent by the chef themselves)
  if (connectedEmail && email.from.email.toLowerCase() === connectedEmail.toLowerCase()) {
    await logScanEntry(supabase, tenantId, messageId, email, 'personal', 'high', 'skipped_outbound')
    result.skipped++
    return
  }

  // Classify
  const classification = await classifyEmail(
    email.subject,
    email.body,
    email.from.email,
    knownClientEmails
  )

  // Record in gmail_sync_log for dedup on future runs
  await logScanEntry(
    supabase,
    tenantId,
    messageId,
    email,
    classification.category,
    classification.confidence,
    'historical_scan'
  )

  // Only surface inquiry and existing_thread as review candidates
  if (classification.category !== 'inquiry' && classification.category !== 'existing_thread') {
    result.skipped++
    return
  }

  // Only surface high or medium confidence findings (skip low)
  if (classification.confidence === 'low') {
    result.skipped++
    return
  }

  // Parse received date from email headers
  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      // Leave null if date is unparseable
    }
  }

  // Upsert into gmail_historical_findings
  await supabase.from('gmail_historical_findings').upsert(
    {
      tenant_id: tenantId,
      chef_id: chefId,
      gmail_message_id: messageId,
      gmail_thread_id: email.threadId || null,
      from_address: `${email.from.name ? email.from.name + ' ' : ''}<${email.from.email}>`.trim(),
      subject: email.subject || null,
      body_preview: email.body ? email.body.slice(0, 500) : null,
      received_at: receivedAt,
      classification: classification.category,
      confidence: classification.confidence,
      ai_reasoning: classification.reasoning,
      status: 'pending',
    },
    { onConflict: 'tenant_id,gmail_message_id' }
  )

  result.findingsAdded++
}

// ─── Log Scan Entry in gmail_sync_log ─────────────────────────────────────────

async function logScanEntry(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  messageId: string,
  email: { from: { email: string }; subject: string; threadId: string },
  classification: string,
  confidence: string,
  actionTaken: string
) {
  try {
    await supabase.from('gmail_sync_log').insert({
      tenant_id: tenantId,
      gmail_message_id: messageId,
      gmail_thread_id: email.threadId || null,
      from_address: email.from.email,
      subject: email.subject || null,
      classification,
      confidence,
      action_taken: actionTaken,
    })
  } catch {
    // Ignore dedup conflicts (same message already logged)
  }
}
