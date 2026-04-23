// Gmail Historical Scan Engine
// Crawls a chef's Gmail history in resumable batches, classifying each email
// and staging potential missed inquiries for chef review.

import { createServerClient } from '@/lib/db/server'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { getGoogleAccessToken } from '@/lib/google/auth'
import { getGoogleGmailControl } from '@/lib/google/mailbox-control'
import { listMessagesPage, getFullMessage } from './client'
import { classifyEmail } from './classify'

const DEFAULT_BATCH_SIZE = 50
const PROGRESS_CHECKPOINT_INTERVAL = 10
const TRANSIENT_MESSAGE_MAX_ATTEMPTS = 3
const TRANSIENT_CLASSIFICATION_MAX_ATTEMPTS = 3

export interface HistoricalScanBatchOptions {
  batchSize?: number
  messageConcurrency?: number
  mailboxId?: string | null
}

export interface HistoricalScanBatchResult {
  chefId: string
  processed: number
  seen: number
  findingsAdded: number
  skipped: number
  errors: string[]
  status: 'in_progress' | 'completed' | 'error'
}

type HistoricalScanConnection = {
  mailbox_id: string | null
  connected_email: string | null
  gmail_connected: boolean
  historical_scan_enabled: boolean
  historical_scan_status: string
  historical_scan_page_token: string | null
  historical_scan_total_processed: number | null
  historical_scan_total_seen: number | null
  historical_scan_lookback_days: number | null
  historical_scan_started_at: string | null
  historical_scan_completed_at: string | null
  historical_scan_last_run_at: string | null
  historical_scan_result_size_estimate: number | null
}

export function buildHistoricalScanQuery(lookbackDays: number, now = new Date()): string {
  if (lookbackDays > 0) {
    const since = new Date(now)
    since.setDate(since.getDate() - lookbackDays)
    const sinceStr = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`
    return `after:${sinceStr}`
  }

  return 'in:anywhere'
}

function shouldCheckpoint(processed: number): boolean {
  return processed > 0 && processed % PROGRESS_CHECKPOINT_INTERVAL === 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientGmailMessageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('backendError') ||
    message.includes('Unknown Error') ||
    message.includes('"status": "UNKNOWN"') ||
    message.includes('"code": 500')
  )
}

function isTransientClassificationError(error: unknown): boolean {
  if (!(error instanceof OllamaOfflineError)) return false

  return ['invalid_json', 'validation_failed', 'timeout', 'unreachable', 'empty_response'].includes(
    error.code
  )
}

async function getHistoricalMessageWithRetry(accessToken: string, messageId: string) {
  let lastError: unknown

  for (let attempt = 1; attempt <= TRANSIENT_MESSAGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await getFullMessage(accessToken, messageId)
    } catch (error) {
      lastError = error
      if (!isTransientGmailMessageError(error) || attempt === TRANSIENT_MESSAGE_MAX_ATTEMPTS) {
        throw error
      }
      await sleep(250 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function classifyHistoricalEmailWithRetry(
  email: {
    subject: string
    body: string
    from: { email: string }
    labelIds?: string[]
    listUnsubscribe?: string
    precedence?: string
  },
  knownClientEmails: string[],
  tenantId: string
) {
  let lastError: unknown

  for (let attempt = 1; attempt <= TRANSIENT_CLASSIFICATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await classifyEmail(email.subject, email.body, email.from.email, knownClientEmails, {
        labelIds: email.labelIds,
        listUnsubscribe: email.listUnsubscribe,
        precedence: email.precedence,
        tenantId,
      })
    } catch (error) {
      lastError = error
      if (
        !isTransientClassificationError(error) ||
        attempt === TRANSIENT_CLASSIFICATION_MAX_ATTEMPTS
      ) {
        throw error
      }
      await sleep(300 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function runHistoricalScanBatch(
  chefId: string,
  tenantId: string,
  options: HistoricalScanBatchOptions = {}
): Promise<HistoricalScanBatchResult> {
  const result: HistoricalScanBatchResult = {
    chefId,
    processed: 0,
    seen: 0,
    findingsAdded: 0,
    skipped: 0,
    errors: [],
    status: 'in_progress',
  }

  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
  const db = createServerClient({ admin: true })
  const control = await getGoogleGmailControl({
    chefId,
    tenantId,
    db,
    allowRepair: true,
  })
  let mailbox =
    options.mailboxId && options.mailboxId.trim()
      ? (
          await db
            .from('google_mailboxes')
            .select(
              'id, normalized_email, gmail_connected, historical_scan_enabled, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, historical_scan_result_size_estimate'
            )
            .eq('id', options.mailboxId)
            .eq('chef_id', chefId)
            .eq('tenant_id', tenantId)
            .maybeSingle()
        ).data
      : control.mailbox?.gmailConnected && control.mailbox.isActive
        ? {
            id: control.mailbox.id,
            normalized_email: control.mailbox.normalizedEmail,
            gmail_connected: control.mailbox.gmailConnected,
            historical_scan_enabled: control.mailbox.historicalScanEnabled,
            historical_scan_status: control.mailbox.historicalScanStatus,
            historical_scan_page_token: control.mailbox.historicalScanPageToken,
            historical_scan_total_processed: control.mailbox.historicalScanTotalProcessed,
            historical_scan_total_seen: control.mailbox.historicalScanTotalSeen,
            historical_scan_lookback_days: control.mailbox.historicalScanLookbackDays,
            historical_scan_started_at: control.mailbox.historicalScanStartedAt,
            historical_scan_completed_at: control.mailbox.historicalScanCompletedAt,
            historical_scan_last_run_at: control.mailbox.historicalScanLastRunAt,
            historical_scan_result_size_estimate: control.mailbox.historicalScanResultSizeEstimate,
          }
        : null

  const scanConn: HistoricalScanConnection | null = mailbox
    ? {
        mailbox_id: mailbox.id,
        connected_email: mailbox.normalized_email,
        gmail_connected: mailbox.gmail_connected === true,
        historical_scan_enabled: mailbox.historical_scan_enabled === true,
        historical_scan_status: String(mailbox.historical_scan_status || 'idle'),
        historical_scan_page_token: mailbox.historical_scan_page_token || null,
        historical_scan_total_processed: mailbox.historical_scan_total_processed ?? 0,
        historical_scan_total_seen: mailbox.historical_scan_total_seen ?? 0,
        historical_scan_lookback_days: mailbox.historical_scan_lookback_days ?? 0,
        historical_scan_started_at: mailbox.historical_scan_started_at || null,
        historical_scan_completed_at: mailbox.historical_scan_completed_at || null,
        historical_scan_last_run_at: mailbox.historical_scan_last_run_at || null,
        historical_scan_result_size_estimate: mailbox.historical_scan_result_size_estimate ?? null,
      }
    : control.legacyConnection
      ? {
          mailbox_id: null,
          connected_email: control.legacyConnection.connectedEmail,
          gmail_connected: control.legacyConnection.gmailConnected,
          historical_scan_enabled: control.legacyConnection.historicalScanEnabled,
          historical_scan_status: control.legacyConnection.historicalScanStatus,
          historical_scan_page_token: control.legacyConnection.historicalScanPageToken,
          historical_scan_total_processed: control.legacyConnection.historicalScanTotalProcessed,
          historical_scan_total_seen: control.legacyConnection.historicalScanTotalSeen,
          historical_scan_lookback_days: control.legacyConnection.historicalScanLookbackDays,
          historical_scan_started_at: control.legacyConnection.historicalScanStartedAt,
          historical_scan_completed_at: control.legacyConnection.historicalScanCompletedAt,
          historical_scan_last_run_at: control.legacyConnection.historicalScanLastRunAt,
          historical_scan_result_size_estimate:
            control.legacyConnection.historicalScanResultSizeEstimate,
        }
      : null

  if (!scanConn) {
    result.errors.push('No mailbox-native or legacy Gmail connection found')
    result.status = 'error'
    return result
  }
  const activeScanConn = scanConn

  if (!activeScanConn.gmail_connected) {
    result.errors.push('Gmail not connected')
    result.status = 'error'
    return result
  }

  if (!activeScanConn.historical_scan_enabled) {
    result.errors.push('Historical scan not enabled')
    result.status = 'error'
    return result
  }

  if (activeScanConn.historical_scan_status === 'completed') {
    result.status = 'completed'
    return result
  }

  async function updateScanState(updates: Record<string, unknown>) {
    await db.from('google_connections').update(updates).eq('chef_id', chefId)

    if (activeScanConn.mailbox_id) {
      await db.from('google_mailboxes').update(updates).eq('id', activeScanConn.mailbox_id)
    }
  }

  const scanStartedAt = activeScanConn.historical_scan_started_at ?? new Date().toISOString()
  const startUpdates = {
    historical_scan_status: 'in_progress',
    historical_scan_started_at: scanStartedAt,
    historical_scan_last_run_at: new Date().toISOString(),
    historical_scan_completed_at: null,
  }

  try {
    await updateScanState(startUpdates)
  } catch (startErr) {
    result.errors.push(`Failed to persist scan start: ${(startErr as Error).message}`)
    result.status = 'error'
    return result
  }

  let accessToken: string
  try {
    accessToken = await getGoogleAccessToken(chefId, {
      skipSessionCheck: true,
      mailboxId: activeScanConn.mailbox_id,
    })
  } catch (err) {
    result.errors.push(`Token error: ${(err as Error).message}`)
    result.status = 'error'
    return result
  }

  let pageResult: {
    messages: Array<{ id: string; threadId: string }>
    nextPageToken?: string
    resultSizeEstimate?: number
  }
  try {
    pageResult = await listMessagesPage(accessToken, {
      pageToken: activeScanConn.historical_scan_page_token ?? undefined,
      query: buildHistoricalScanQuery(activeScanConn.historical_scan_lookback_days ?? 0),
      maxResults: batchSize,
    })
  } catch (err) {
    result.errors.push(`List messages failed: ${(err as Error).message}`)
    result.status = 'error'
    return result
  }

  const { data: clients } = await db
    .from('clients')
    .select('email')
    .eq('tenant_id', tenantId)
    .limit(10000)

  const knownClientEmails = (clients ?? [])
    .map((client: { email: string | null }) => client.email)
    .filter(Boolean) as string[]

  const pageMessageIds = pageResult.messages.map((message) => message.id)
  let syncedSet = new Set<string>()

  if (pageMessageIds.length > 0) {
    let alreadySyncedQuery = db
      .from('gmail_sync_log')
      .select('gmail_message_id')
      .in('gmail_message_id', pageMessageIds)

    alreadySyncedQuery = activeScanConn.mailbox_id
      ? alreadySyncedQuery.eq('mailbox_id', activeScanConn.mailbox_id)
      : alreadySyncedQuery.eq('tenant_id', tenantId)

    const { data: alreadySynced, error: syncedErr } = await alreadySyncedQuery

    if (syncedErr) {
      result.errors.push(`Failed to load dedup state: ${syncedErr.message}`)
      result.status = 'error'
      return result
    }

    syncedSet = new Set(
      (alreadySynced ?? []).map((row: { gmail_message_id: string }) => row.gmail_message_id)
    )
  }

  const baseTotalProcessed = activeScanConn.historical_scan_total_processed ?? 0
  const baseTotalSeen = Math.max(activeScanConn.historical_scan_total_seen ?? 0, baseTotalProcessed)
  const connectedEmail = activeScanConn.connected_email

  for (const msgRef of pageResult.messages) {
    result.seen++

    if (syncedSet.has(msgRef.id)) {
      result.skipped++
      continue
    }

    try {
      await processHistoricalMessage(
        db,
        accessToken,
        msgRef.id,
        chefId,
        tenantId,
        activeScanConn.mailbox_id,
        connectedEmail,
        knownClientEmails,
        result
      )
    } catch (err) {
      result.errors.push(`Message ${msgRef.id}: ${(err as Error).message}`)
    }

    if (shouldCheckpoint(result.processed)) {
      await checkpointHistoricalScanProgress(
        db,
        chefId,
        activeScanConn.mailbox_id,
        baseTotalProcessed + result.processed,
        baseTotalSeen + result.seen
      )
    }
  }

  const isLastPage = !pageResult.nextPageToken
  const newTotalProcessed = baseTotalProcessed + result.processed
  const newTotalSeen = baseTotalSeen + result.seen
  const resultSizeEstimate = Math.max(
    activeScanConn.historical_scan_result_size_estimate ?? 0,
    pageResult.resultSizeEstimate ?? 0,
    newTotalSeen
  )

  const progressUpdate: Record<string, unknown> = {
    historical_scan_page_token: pageResult.nextPageToken ?? null,
    historical_scan_total_processed: newTotalProcessed,
    historical_scan_total_seen: newTotalSeen,
    historical_scan_last_run_at: new Date().toISOString(),
    historical_scan_result_size_estimate: resultSizeEstimate,
  }

  if (isLastPage) {
    progressUpdate.historical_scan_status = 'completed'
    progressUpdate.historical_scan_completed_at = new Date().toISOString()
    result.status = 'completed'
  }

  await updateScanState(progressUpdate)

  return result
}

async function processHistoricalMessage(
  db: any,
  accessToken: string,
  messageId: string,
  chefId: string,
  tenantId: string,
  mailboxId: string | null,
  connectedEmail: string | null,
  knownClientEmails: string[],
  result: HistoricalScanBatchResult
) {
  const email = await getHistoricalMessageWithRetry(accessToken, messageId)
  result.processed++

  if (connectedEmail && email.from.email.toLowerCase() === connectedEmail.toLowerCase()) {
    await logScanEntry(
      db,
      tenantId,
      mailboxId,
      messageId,
      { ...email, body: email.body, date: email.date },
      'personal',
      'high',
      'skipped_outbound'
    )
    result.skipped++
    return
  }

  const classification = await classifyHistoricalEmailWithRetry(email, knownClientEmails, tenantId)

  await logScanEntry(
    db,
    tenantId,
    mailboxId,
    messageId,
    { ...email, body: email.body, date: email.date },
    classification.category,
    classification.confidence,
    'historical_scan'
  )

  if (classification.category !== 'inquiry' && classification.category !== 'existing_thread') {
    result.skipped++
    return
  }

  if (classification.confidence === 'low') {
    result.skipped++
    return
  }

  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      // Leave null if date is unparseable.
    }
  }

  const inserted = await saveHistoricalFinding(db, {
    tenant_id: tenantId,
    chef_id: chefId,
    mailbox_id: mailboxId,
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
  })

  if (inserted) {
    result.findingsAdded++
  }
}

async function checkpointHistoricalScanProgress(
  db: any,
  chefId: string,
  mailboxId: string | null,
  totalProcessed: number,
  totalSeen: number
) {
  const payload = {
    historical_scan_total_processed: totalProcessed,
    historical_scan_total_seen: totalSeen,
    historical_scan_last_run_at: new Date().toISOString(),
  }

  await db.from('google_connections').update(payload).eq('chef_id', chefId)

  if (mailboxId) {
    await db.from('google_mailboxes').update(payload).eq('id', mailboxId)
  }
}

async function saveHistoricalFinding(
  db: any,
  finding: {
    tenant_id: string
    chef_id: string
    mailbox_id: string | null
    gmail_message_id: string
    gmail_thread_id: string | null
    from_address: string
    subject: string | null
    body_preview: string | null
    received_at: string | null
    classification: string
    confidence: string
    ai_reasoning: string
    status: 'pending'
  }
) {
  let existingQuery = db
    .from('gmail_historical_findings')
    .select('id')
    .eq('gmail_message_id', finding.gmail_message_id)

  existingQuery = finding.mailbox_id
    ? existingQuery.eq('mailbox_id', finding.mailbox_id)
    : existingQuery.eq('tenant_id', finding.tenant_id)

  const { data: existing, error: existingErr } = await existingQuery.maybeSingle()

  if (existingErr) {
    throw new Error(`Historical finding lookup failed: ${existingErr.message}`)
  }

  if (existing?.id) {
    return false
  }

  const { error: insertErr } = await db.from('gmail_historical_findings').insert(finding)
  if (insertErr) {
    throw new Error(`Historical finding insert failed: ${insertErr.message}`)
  }

  return true
}

async function logScanEntry(
  db: any,
  tenantId: string,
  mailboxId: string | null,
  messageId: string,
  email: {
    from: { email: string }
    subject: string
    threadId: string
    body?: string
    date?: string
  },
  classification: string,
  confidence: string,
  actionTaken: string
) {
  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      // Leave null if date is unparseable.
    }
  }

  try {
    const payload = {
      tenant_id: tenantId,
      mailbox_id: mailboxId,
      gmail_message_id: messageId,
      gmail_thread_id: email.threadId || null,
      from_address: email.from.email,
      subject: email.subject || null,
      classification,
      confidence,
      action_taken: actionTaken,
      body_preview: email.body?.slice(0, 2000) || null,
      snippet: email.body?.slice(0, 200) || null,
      received_at: receivedAt,
    }

    if (mailboxId) {
      await db.from('gmail_sync_log').upsert(payload, { onConflict: 'mailbox_id,gmail_message_id' })
      return
    }

    await db.from('gmail_sync_log').insert(payload)
  } catch {
    // Ignore dedup conflicts when a retry sees a message that already landed.
  }
}

export default {
  buildHistoricalScanQuery,
  runHistoricalScanBatch,
}
