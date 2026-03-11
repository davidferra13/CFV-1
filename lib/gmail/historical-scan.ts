import { createAdminClient } from '@/lib/supabase/admin'
import {
  getGoogleMailboxAccessToken,
  getGoogleMailboxById,
  isPersistedGoogleMailboxId,
  listActiveGoogleMailboxesForChef,
  syncLegacyGoogleConnectionFromPrimary,
  type GoogleMailboxRecord,
} from '@/lib/google/mailboxes'
import { classifyEmail } from './classify'
import { getFullMessage, getGmailProfile, listMessagesPage } from './client'
import type { ParsedEmail } from './types'

const DEFAULT_BATCH_SIZE = 250
const MAX_BATCH_SIZE = 500
const DEFAULT_MESSAGE_CONCURRENCY = 16
const MAX_MESSAGE_CONCURRENCY = 32

export interface HistoricalScanBatchResult {
  chefId: string
  mailboxId: string | null
  mailboxEmail: string | null
  processed: number
  seen: number
  findingsAdded: number
  includeSpamTrash: boolean
  resultSizeEstimate: number | null
  skipped: number
  errors: string[]
  status: 'in_progress' | 'completed' | 'error'
}

interface HistoricalMessageOutcome {
  processed: number
  skipped: number
  findingsAdded: number
}

export interface HistoricalScanRunOptions {
  batchSize?: number
  mailboxId?: string
  messageConcurrency?: number
}

function getStoredMailboxId(mailboxId?: string | null) {
  return isPersistedGoogleMailboxId(mailboxId) ? mailboxId : null
}

async function getExistingSyncLogId(
  supabase: any,
  tenantId: string,
  gmailMessageId: string,
  mailboxId?: string | null
) {
  const storedMailboxId = getStoredMailboxId(mailboxId)
  let query = supabase.from('gmail_sync_log').select('id').eq('gmail_message_id', gmailMessageId)

  if (storedMailboxId) {
    query = query.eq('mailbox_id', storedMailboxId)
  } else {
    query = query.eq('tenant_id', tenantId)
  }

  const { data } = await query.maybeSingle()
  return data?.id ?? null
}

async function getExistingFindingId(
  supabase: any,
  tenantId: string,
  gmailMessageId: string,
  mailboxId?: string | null
) {
  const storedMailboxId = getStoredMailboxId(mailboxId)
  let query = supabase
    .from('gmail_historical_findings')
    .select('id')
    .eq('gmail_message_id', gmailMessageId)

  if (storedMailboxId) {
    query = query.eq('mailbox_id', storedMailboxId)
  } else {
    query = query.eq('tenant_id', tenantId)
  }

  const { data } = await query.maybeSingle()
  return data?.id ?? null
}

function buildHistoricalQuery(lookbackDays: number) {
  if (lookbackDays <= 0) {
    return 'in:anywhere'
  }

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceStr = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}`
  return `after:${sinceStr}`
}

export async function runHistoricalScanBatch(
  chefId: string,
  tenantId: string,
  options: HistoricalScanRunOptions = {}
): Promise<HistoricalScanBatchResult> {
  const mailboxes = options.mailboxId
    ? [await getGoogleMailboxById(options.mailboxId)].filter(Boolean)
    : await listActiveGoogleMailboxesForChef(chefId)

  const scanCandidates = (mailboxes as GoogleMailboxRecord[]).filter(
    (mailbox) =>
      mailbox.gmailConnected &&
      mailbox.historicalScanEnabled &&
      mailbox.historicalScanStatus !== 'paused' &&
      mailbox.historicalScanStatus !== 'completed'
  )

  if (scanCandidates.length === 0) {
    const hasCompletedMailbox = (mailboxes as GoogleMailboxRecord[]).some(
      (mailbox) =>
        mailbox.gmailConnected &&
        mailbox.historicalScanEnabled &&
        mailbox.historicalScanStatus === 'completed'
    )

    return {
      chefId,
      mailboxId: options.mailboxId ?? null,
      mailboxEmail:
        (mailboxes as GoogleMailboxRecord[]).find((mailbox) => mailbox.id === options.mailboxId)
          ?.email ?? null,
      processed: 0,
      seen: 0,
      findingsAdded: 0,
      includeSpamTrash: true,
      resultSizeEstimate: null,
      skipped: 0,
      errors: hasCompletedMailbox ? [] : ['Historical scan not enabled'],
      status: hasCompletedMailbox ? 'completed' : 'error',
    }
  }

  const batchResults = await Promise.all(
    scanCandidates.map((mailbox) => runHistoricalScanBatchForMailbox(mailbox, tenantId, options))
  )

  await syncLegacyGoogleConnectionFromPrimary(chefId, tenantId)

  const estimateValues = batchResults
    .map((item) => item.resultSizeEstimate)
    .filter((value): value is number => typeof value === 'number')

  return {
    chefId,
    mailboxId: options.mailboxId ?? null,
    mailboxEmail: batchResults.length === 1 ? batchResults[0].mailboxEmail : null,
    processed: batchResults.reduce((sum, item) => sum + item.processed, 0),
    seen: batchResults.reduce((sum, item) => sum + item.seen, 0),
    findingsAdded: batchResults.reduce((sum, item) => sum + item.findingsAdded, 0),
    includeSpamTrash: batchResults.every((item) => item.includeSpamTrash),
    resultSizeEstimate:
      estimateValues.length > 0 ? estimateValues.reduce((sum, value) => sum + value, 0) : null,
    skipped: batchResults.reduce((sum, item) => sum + item.skipped, 0),
    errors: batchResults.flatMap((item) => item.errors),
    status: batchResults.some((item) => item.status === 'in_progress')
      ? 'in_progress'
      : batchResults.every((item) => item.status === 'completed')
        ? 'completed'
        : batchResults.some((item) => item.status === 'error')
          ? 'error'
          : 'in_progress',
  }
}

async function runHistoricalScanBatchForMailbox(
  mailbox: GoogleMailboxRecord,
  tenantId: string,
  options: HistoricalScanRunOptions
): Promise<HistoricalScanBatchResult> {
  const result: HistoricalScanBatchResult = {
    chefId: mailbox.chefId,
    mailboxId: getStoredMailboxId(mailbox.id),
    mailboxEmail: mailbox.email,
    processed: 0,
    seen: 0,
    findingsAdded: 0,
    includeSpamTrash: mailbox.historicalScanIncludeSpamTrash,
    resultSizeEstimate: mailbox.historicalScanResultSizeEstimate,
    skipped: 0,
    errors: [],
    status: 'in_progress',
  }

  const supabase = createAdminClient() as any
  const batchSize = Math.max(1, Math.min(options.batchSize ?? DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE))
  const messageConcurrency = Math.max(
    1,
    Math.min(options.messageConcurrency ?? DEFAULT_MESSAGE_CONCURRENCY, MAX_MESSAGE_CONCURRENCY)
  )
  const storedMailboxId = getStoredMailboxId(mailbox.id)

  let accessToken: string
  try {
    accessToken = await getGoogleMailboxAccessToken(mailbox.id)
  } catch (error) {
    result.errors.push(`Token error: ${(error as Error).message}`)
    result.status = 'error'
    return result
  }

  const storedLookbackDays = mailbox.historicalScanLookbackDays ?? 0
  const legacyFullScan =
    storedLookbackDays === 730 &&
    (mailbox.historicalScanTotalProcessed ?? 0) === 0 &&
    !mailbox.historicalScanStartedAt
  const lookbackDays = legacyFullScan ? 0 : storedLookbackDays
  const gmailQuery = buildHistoricalQuery(lookbackDays)

  let fullMailboxTotal: number | null = null
  if (lookbackDays === 0) {
    try {
      fullMailboxTotal = (await getGmailProfile(accessToken)).messagesTotal
    } catch (error) {
      console.warn(
        `[historical-scan] Unable to load Gmail profile for mailbox ${mailbox.email}: ${(error as Error).message}`
      )
    }
  }

  let pageResult: Awaited<ReturnType<typeof listMessagesPage>>
  try {
    pageResult = await listMessagesPage(accessToken, {
      includeSpamTrash: mailbox.historicalScanIncludeSpamTrash,
      pageToken: mailbox.historicalScanPageToken ?? undefined,
      query: gmailQuery,
      maxResults: batchSize,
    })
  } catch (error) {
    result.errors.push(`List messages failed: ${(error as Error).message}`)
    result.status = 'error'
    return result
  }

  result.seen = pageResult.messages.length
  const priorSeen = mailbox.historicalScanTotalSeen ?? 0
  const priorEstimate = mailbox.historicalScanResultSizeEstimate ?? null

  if (typeof fullMailboxTotal === 'number') {
    result.resultSizeEstimate = Math.max(
      fullMailboxTotal,
      priorSeen + result.seen,
      priorEstimate ?? 0
    )
  } else if (typeof pageResult.resultSizeEstimate === 'number') {
    result.resultSizeEstimate = Math.max(
      priorSeen + pageResult.resultSizeEstimate,
      priorSeen + result.seen,
      priorEstimate ?? 0
    )
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('email')
    .eq('tenant_id', tenantId)
    .limit(10000)

  const knownClientEmails = (clients ?? [])
    .map((client: { email: string | null }) => client.email)
    .filter(Boolean) as string[]

  const messageIds = pageResult.messages.map((message) => message.id)
  let messagesToProcess = pageResult.messages

  if (messageIds.length > 0) {
    let existingQuery = supabase
      .from('gmail_sync_log')
      .select('gmail_message_id')
      .in('gmail_message_id', messageIds)

    existingQuery = storedMailboxId
      ? existingQuery.eq('mailbox_id', storedMailboxId)
      : existingQuery.eq('tenant_id', tenantId)

    const { data: existingRows } = await existingQuery

    if (existingRows?.length) {
      const existingMessageIds = new Set(
        existingRows.map((row: { gmail_message_id: string }) => row.gmail_message_id)
      )
      messagesToProcess = pageResult.messages.filter(
        (message) => !existingMessageIds.has(message.id)
      )
      result.skipped += pageResult.messages.length - messagesToProcess.length
    }
  }

  const queue = [...messagesToProcess]
  const workerCount = Math.min(messageConcurrency, queue.length)
  const workerResults = await Promise.all(
    Array.from({ length: workerCount }, async () => {
      const workerOutcome: HistoricalMessageOutcome = {
        processed: 0,
        skipped: 0,
        findingsAdded: 0,
      }

      while (queue.length > 0) {
        const messageRef = queue.shift()
        if (!messageRef) break

        try {
          const outcome = await processHistoricalMessage(
            supabase,
            accessToken,
            messageRef.id,
            mailbox,
            tenantId,
            knownClientEmails
          )
          workerOutcome.processed += outcome.processed
          workerOutcome.skipped += outcome.skipped
          workerOutcome.findingsAdded += outcome.findingsAdded
        } catch (error) {
          result.errors.push(`Message ${messageRef.id}: ${(error as Error).message}`)
        }
      }

      return workerOutcome
    })
  )

  for (const workerOutcome of workerResults) {
    result.processed += workerOutcome.processed
    result.skipped += workerOutcome.skipped
    result.findingsAdded += workerOutcome.findingsAdded
  }

  const newTotalProcessed = mailbox.historicalScanTotalProcessed + result.processed
  const newTotalSeen = priorSeen + result.seen
  const isLastPage = !pageResult.nextPageToken
  const progressUpdate: Record<string, unknown> = {
    historical_scan_include_spam_trash: mailbox.historicalScanIncludeSpamTrash,
    historical_scan_page_token: pageResult.nextPageToken ?? null,
    historical_scan_result_size_estimate: result.resultSizeEstimate,
    historical_scan_total_processed: newTotalProcessed,
    historical_scan_total_seen: newTotalSeen,
    historical_scan_last_run_at: new Date().toISOString(),
  }

  if (legacyFullScan) {
    progressUpdate.historical_scan_lookback_days = 0
  }

  if (isLastPage) {
    result.resultSizeEstimate = newTotalSeen
    progressUpdate.historical_scan_result_size_estimate = newTotalSeen
    progressUpdate.historical_scan_status = 'completed'
    progressUpdate.historical_scan_completed_at = new Date().toISOString()
    result.status = 'completed'
  } else {
    progressUpdate.historical_scan_status = 'in_progress'
    if (!mailbox.historicalScanStartedAt) {
      progressUpdate.historical_scan_started_at = new Date().toISOString()
    }
  }

  if (storedMailboxId) {
    await supabase.from('google_mailboxes').update(progressUpdate).eq('id', storedMailboxId)
  } else {
    await supabase.from('google_connections').update(progressUpdate).eq('chef_id', mailbox.chefId)
  }

  return result
}

async function processHistoricalMessage(
  supabase: any,
  accessToken: string,
  messageId: string,
  mailbox: GoogleMailboxRecord,
  tenantId: string,
  knownClientEmails: string[]
): Promise<HistoricalMessageOutcome> {
  const outcome: HistoricalMessageOutcome = {
    processed: 0,
    skipped: 0,
    findingsAdded: 0,
  }

  const storedMailboxId = getStoredMailboxId(mailbox.id)
  const email: ParsedEmail = {
    ...(await getFullMessage(accessToken, messageId)),
    mailboxId: storedMailboxId,
    mailboxEmail: mailbox.email,
  }
  outcome.processed++

  if (
    mailbox.email &&
    email.from.email &&
    email.from.email.toLowerCase() === mailbox.email.toLowerCase()
  ) {
    await logScanEntry(supabase, tenantId, messageId, email, 'personal', 'high', 'skipped_outbound')
    outcome.skipped++
    return outcome
  }

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

  await logScanEntry(
    supabase,
    tenantId,
    messageId,
    email,
    classification.category,
    classification.confidence,
    'historical_scan'
  )

  if (classification.category !== 'inquiry' && classification.category !== 'existing_thread') {
    outcome.skipped++
    return outcome
  }

  if (classification.confidence === 'low') {
    outcome.skipped++
    return outcome
  }

  const existingFindingId = await getExistingFindingId(
    supabase,
    tenantId,
    messageId,
    storedMailboxId
  )
  if (existingFindingId) {
    outcome.skipped++
    return outcome
  }

  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      receivedAt = null
    }
  }

  await supabase.from('gmail_historical_findings').insert({
    tenant_id: tenantId,
    chef_id: mailbox.chefId,
    mailbox_id: storedMailboxId,
    gmail_message_id: messageId,
    gmail_thread_id: email.threadId || null,
    from_address: `${email.from.name ? `${email.from.name} ` : ''}<${email.from.email}>`.trim(),
    subject: email.subject || null,
    body_preview: email.body ? email.body.slice(0, 500) : null,
    received_at: receivedAt,
    classification: classification.category,
    confidence: classification.confidence,
    ai_reasoning: classification.reasoning,
    status: 'pending',
  })

  outcome.findingsAdded++
  return outcome
}

async function logScanEntry(
  supabase: any,
  tenantId: string,
  messageId: string,
  email: Pick<ParsedEmail, 'body' | 'date' | 'from' | 'mailboxId' | 'subject' | 'threadId'>,
  classification: string,
  confidence: string,
  actionTaken: string
) {
  let receivedAt: string | null = null
  if (email.date) {
    try {
      receivedAt = new Date(email.date).toISOString()
    } catch {
      receivedAt = null
    }
  }

  const existingId = await getExistingSyncLogId(supabase, tenantId, messageId, email.mailboxId)
  const payload = {
    tenant_id: tenantId,
    mailbox_id: getStoredMailboxId(email.mailboxId),
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

  if (existingId) {
    await supabase.from('gmail_sync_log').update(payload).eq('id', existingId)
    return
  }

  await supabase.from('gmail_sync_log').insert(payload)
}
