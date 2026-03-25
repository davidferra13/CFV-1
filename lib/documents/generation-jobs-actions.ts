import {
  getDocumentDefinition,
  isOperationalDocumentType,
  type DocumentRequestType,
  type OperationalDocumentType,
  type SnapshotDocumentType,
} from '@/lib/documents/document-definitions'
import type { Json } from '@/types/database'

export type DocumentGenerationJobStatus = 'started' | 'succeeded' | 'failed'

const MAX_ERROR_MESSAGE_LENGTH = 1200
const BULK_RUN_IDEMPOTENCY_PREFIX = 'bulk:'

export const DOCUMENT_REQUEST_LABELS: Record<DocumentRequestType, string> = {
  summary: getDocumentDefinition('summary').label,
  grocery: getDocumentDefinition('grocery').label,
  foh: getDocumentDefinition('foh').label,
  prep: getDocumentDefinition('prep').label,
  execution: getDocumentDefinition('execution').label,
  checklist: getDocumentDefinition('checklist').label,
  packing: getDocumentDefinition('packing').label,
  reset: getDocumentDefinition('reset').label,
  travel: getDocumentDefinition('travel').label,
  shots: getDocumentDefinition('shots').label,
  all: 'Full 8-Sheet Packet',
  pack: 'Custom Document Pack',
}

export type StartDocumentGenerationJobInput = {
  db: any
  tenantId: string
  eventId: string
  requestedType: DocumentRequestType
  selectedTypes: OperationalDocumentType[]
  archiveRequested: boolean
  idempotencyKey?: string | null
  maxAttempts?: number
}

export type StartDocumentGenerationJobResult = {
  jobId: string
  reused: boolean
  status: DocumentGenerationJobStatus
  attempts: number
  maxAttempts: number
}

export type MarkGenerationJobSucceededInput = {
  db: any
  tenantId: string
  jobId: string
  attempts: number
  filename: string
  documentType: SnapshotDocumentType
  sizeBytes: number
  metadata: Record<string, Json | undefined>
}

export type MarkGenerationJobFailedInput = {
  db: any
  tenantId: string
  jobId: string
  attempts: number
  errorMessage: string
  metadata?: Record<string, Json | undefined>
}

export type DocumentGenerationTypeHealth = {
  requestedType: DocumentRequestType
  total: number
  started: number
  succeeded: number
  failed: number
  lastStatus: DocumentGenerationJobStatus | null
  lastCreatedAt: string | null
  lastCompletedAt: string | null
  lastError: string | null
}

export type EventDocumentGenerationHealthSummary = {
  total: number
  started: number
  succeeded: number
  failed: number
  latestStatus: DocumentGenerationJobStatus | null
  latestCreatedAt: string | null
  latestError: string | null
  byType: DocumentGenerationTypeHealth[]
}

type BulkRunHistoryRow = {
  requested_type: unknown
  status: unknown
  error_message: string | null
  created_at: string | null
  completed_at: string | null
  idempotency_key: string | null
  result_metadata?: unknown
}

export type EventDocumentBulkRunDocSummary = {
  type: OperationalDocumentType
  status: DocumentGenerationJobStatus
  createdAt: string | null
  completedAt: string | null
  error: string | null
  snapshotId: string | null
}

export type EventDocumentBulkRunSummary = {
  runId: string
  startedAt: string | null
  completedAt: string | null
  total: number
  started: number
  succeeded: number
  failed: number
  docs: EventDocumentBulkRunDocSummary[]
}

function isMissingGenerationJobsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  if (code === '42P01') return true
  const message =
    ((error as { message?: string }).message ?? '').toLowerCase() +
    ' ' +
    ((error as { details?: string }).details ?? '').toLowerCase()
  return message.includes('event_document_generation_jobs') && message.includes('does not exist')
}

function clampAttempts(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function normalizeErrorMessage(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Unknown generation error'
  if (trimmed.length <= MAX_ERROR_MESSAGE_LENGTH) return trimmed
  return trimmed.slice(0, MAX_ERROR_MESSAGE_LENGTH)
}

function toJobStatus(value: unknown): DocumentGenerationJobStatus {
  if (value === 'succeeded' || value === 'failed' || value === 'started') return value
  return 'started'
}

function emptyHealthSummary(): EventDocumentGenerationHealthSummary {
  return {
    total: 0,
    started: 0,
    succeeded: 0,
    failed: 0,
    latestStatus: null,
    latestCreatedAt: null,
    latestError: null,
    byType: [],
  }
}

function minIsoDate(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) <= Date.parse(b) ? a : b
}

function maxIsoDate(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

function readSnapshotIdFromResultMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const archive = (metadata as { archive?: unknown }).archive
  if (!archive || typeof archive !== 'object') return null
  const archived = (archive as { archived?: unknown }).archived
  if (archived !== true) return null
  const snapshotId = (archive as { snapshotId?: unknown }).snapshotId
  if (typeof snapshotId !== 'string') return null
  const trimmed = snapshotId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseBulkRunIdempotencyKey(
  idempotencyKey: string | null | undefined
): { runId: string } | null {
  if (!idempotencyKey) return null
  const normalized = idempotencyKey.trim()
  if (!normalized.startsWith(BULK_RUN_IDEMPOTENCY_PREFIX)) return null

  const parts = normalized.split(':')
  if (parts.length < 3) return null
  const runId = parts[1]?.trim()
  if (!runId) return null

  return { runId }
}

export function buildBulkRunHistoryFromRows(
  rows: BulkRunHistoryRow[],
  limitRuns = 8
): EventDocumentBulkRunSummary[] {
  const maxRuns = Math.max(1, Math.min(50, Math.floor(limitRuns)))
  const runMap = new Map<
    string,
    {
      summary: EventDocumentBulkRunSummary
      docsByType: Map<OperationalDocumentType, EventDocumentBulkRunDocSummary>
    }
  >()

  for (const row of rows) {
    const parsedRun = parseBulkRunIdempotencyKey(row.idempotency_key)
    if (!parsedRun) continue
    if (!isOperationalDocumentType(String(row.requested_type ?? ''))) continue

    const type = row.requested_type as OperationalDocumentType
    const status = toJobStatus(row.status)
    let run = runMap.get(parsedRun.runId)

    if (!run) {
      run = {
        summary: {
          runId: parsedRun.runId,
          startedAt: null,
          completedAt: null,
          total: 0,
          started: 0,
          succeeded: 0,
          failed: 0,
          docs: [],
        },
        docsByType: new Map<OperationalDocumentType, EventDocumentBulkRunDocSummary>(),
      }
      runMap.set(parsedRun.runId, run)
    }

    if (run.docsByType.has(type)) {
      continue
    }

    const docSummary: EventDocumentBulkRunDocSummary = {
      type,
      status,
      createdAt: row.created_at ?? null,
      completedAt: row.completed_at ?? null,
      error: row.error_message ?? null,
      snapshotId: readSnapshotIdFromResultMetadata(row.result_metadata),
    }
    run.docsByType.set(type, docSummary)
    run.summary.total += 1
    if (status === 'started') run.summary.started += 1
    if (status === 'succeeded') run.summary.succeeded += 1
    if (status === 'failed') run.summary.failed += 1
    run.summary.startedAt = minIsoDate(run.summary.startedAt, docSummary.createdAt)
    run.summary.completedAt = maxIsoDate(run.summary.completedAt, docSummary.completedAt)
  }

  const summaries = Array.from(runMap.values()).map(({ summary, docsByType }) => {
    summary.docs = Array.from(docsByType.values()).sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
      if (aTime !== bTime) return bTime - aTime
      return a.type.localeCompare(b.type)
    })
    return summary
  })

  summaries.sort((a, b) => {
    const aTime = a.startedAt ? Date.parse(a.startedAt) : 0
    const bTime = b.startedAt ? Date.parse(b.startedAt) : 0
    return bTime - aTime
  })

  return summaries.slice(0, maxRuns)
}

export async function startEventDocumentGenerationJob(
  input: StartDocumentGenerationJobInput
): Promise<StartDocumentGenerationJobResult | null> {
  const idempotencyKey = input.idempotencyKey?.trim() || null

  const fetchExisting = async () => {
    const { data, error } = await input.db
      .from('event_document_generation_jobs')
      .select('id, status, attempts, max_attempts')
      .eq('tenant_id', input.tenantId)
      .eq('event_id', input.eventId)
      .eq('requested_type', input.requestedType)
      .eq('idempotency_key', idempotencyKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (isMissingGenerationJobsTable(error)) return null
      console.error('[generation-jobs] failed to query existing idempotent job:', error)
      return null
    }
    if (!data) return null

    return {
      jobId: data.id as string,
      reused: true,
      status: toJobStatus(data.status),
      attempts: clampAttempts(Number(data.attempts ?? 0)),
      maxAttempts: Math.max(1, clampAttempts(Number(data.max_attempts ?? 3))),
    } satisfies StartDocumentGenerationJobResult
  }

  if (idempotencyKey) {
    const existing = await fetchExisting()
    if (existing) return existing
  }

  const { data, error } = await input.db
    .from('event_document_generation_jobs')
    .insert({
      tenant_id: input.tenantId,
      event_id: input.eventId,
      requested_type: input.requestedType,
      selected_types: input.selectedTypes,
      archive_requested: input.archiveRequested,
      idempotency_key: idempotencyKey,
      status: 'started',
      attempts: 0,
      max_attempts: input.maxAttempts ?? 3,
      result_metadata: {},
      started_at: new Date().toISOString(),
    })
    .select('id, status, attempts, max_attempts')
    .single()

  if (error) {
    if (isMissingGenerationJobsTable(error)) {
      return null
    }
    if (error.code === '23505' && idempotencyKey) {
      const existing = await fetchExisting()
      if (existing) return existing
    }
    console.error('[generation-jobs] failed to start generation job:', error)
    return null
  }

  return {
    jobId: data.id as string,
    reused: false,
    status: toJobStatus(data.status),
    attempts: clampAttempts(Number(data.attempts ?? 0)),
    maxAttempts: Math.max(1, clampAttempts(Number(data.max_attempts ?? 3))),
  }
}

export async function markEventDocumentGenerationJobSucceeded(
  input: MarkGenerationJobSucceededInput
): Promise<void> {
  const { error } = await input.db
    .from('event_document_generation_jobs')
    .update({
      status: 'succeeded',
      attempts: clampAttempts(input.attempts),
      error_message: null,
      result_filename: input.filename,
      result_document_type: input.documentType,
      result_size_bytes: input.sizeBytes,
      result_metadata: input.metadata,
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.jobId)
    .eq('tenant_id', input.tenantId)

  if (error && !isMissingGenerationJobsTable(error)) {
    console.error('[generation-jobs] failed to mark job succeeded:', error)
  }
}

export async function markEventDocumentGenerationJobFailed(
  input: MarkGenerationJobFailedInput
): Promise<void> {
  const { error } = await input.db
    .from('event_document_generation_jobs')
    .update({
      status: 'failed',
      attempts: clampAttempts(input.attempts),
      error_message: normalizeErrorMessage(input.errorMessage),
      result_metadata: input.metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.jobId)
    .eq('tenant_id', input.tenantId)

  if (error && !isMissingGenerationJobsTable(error)) {
    console.error('[generation-jobs] failed to mark job failed:', error)
  }
}

export async function getEventDocumentGenerationHealth(
  eventId: string,
  limit = 200
): Promise<EventDocumentGenerationHealthSummary> {
  const [{ requireChef }, { createServerClient }] = await Promise.all([
    import('@/lib/auth/get-user'),
    import('@/lib/db/server'),
  ])
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_document_generation_jobs')
    .select('requested_type, status, error_message, created_at, completed_at')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(500, Math.floor(limit))))

  if (error) {
    if (!isMissingGenerationJobsTable(error)) {
      console.error('[generation-jobs] failed to load generation health:', error)
    }
    return emptyHealthSummary()
  }

  const rows = data ?? []
  if (rows.length === 0) {
    return emptyHealthSummary()
  }

  const latest = rows[0] as {
    status: unknown
    created_at: string | null
    error_message: string | null
  }

  const byTypeMap = new Map<DocumentRequestType, DocumentGenerationTypeHealth>()

  for (const row of rows) {
    const requestedType = row.requested_type as DocumentRequestType
    if (!DOCUMENT_REQUEST_LABELS[requestedType]) continue

    const status = toJobStatus(row.status)
    const existing = byTypeMap.get(requestedType)
    if (!existing) {
      byTypeMap.set(requestedType, {
        requestedType,
        total: 0,
        started: 0,
        succeeded: 0,
        failed: 0,
        lastStatus: null,
        lastCreatedAt: null,
        lastCompletedAt: null,
        lastError: null,
      })
    }

    const entry = byTypeMap.get(requestedType)!
    entry.total += 1
    if (status === 'started') entry.started += 1
    if (status === 'succeeded') entry.succeeded += 1
    if (status === 'failed') entry.failed += 1
    if (!entry.lastCreatedAt) {
      entry.lastStatus = status
      entry.lastCreatedAt = row.created_at ?? null
      entry.lastCompletedAt = row.completed_at ?? null
      entry.lastError = row.error_message ?? null
    }
  }

  const byType = Array.from(byTypeMap.values()).sort((a, b) => {
    if (a.lastCreatedAt && b.lastCreatedAt) {
      return Date.parse(b.lastCreatedAt) - Date.parse(a.lastCreatedAt)
    }
    if (a.lastCreatedAt) return -1
    if (b.lastCreatedAt) return 1
    return a.requestedType.localeCompare(b.requestedType)
  })

  const started = rows.filter((row: any) => toJobStatus(row.status) === 'started').length
  const succeeded = rows.filter((row: any) => toJobStatus(row.status) === 'succeeded').length
  const failed = rows.filter((row: any) => toJobStatus(row.status) === 'failed').length

  return {
    total: rows.length,
    started,
    succeeded,
    failed,
    latestStatus: toJobStatus(latest.status),
    latestCreatedAt: latest.created_at,
    latestError: latest.error_message,
    byType,
  }
}

export async function getEventDocumentBulkRunHistory(
  eventId: string,
  limitRuns = 8,
  rowLimit = 350
): Promise<EventDocumentBulkRunSummary[]> {
  const [{ requireChef }, { createServerClient }] = await Promise.all([
    import('@/lib/auth/get-user'),
    import('@/lib/db/server'),
  ])
  const user = await requireChef()
  const db: any = createServerClient()

  const safeRowLimit = Math.max(50, Math.min(1000, Math.floor(rowLimit)))
  const { data, error } = await db
    .from('event_document_generation_jobs')
    .select(
      'requested_type, status, error_message, created_at, completed_at, idempotency_key, result_metadata'
    )
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .like('idempotency_key', `${BULK_RUN_IDEMPOTENCY_PREFIX}%`)
    .order('created_at', { ascending: false })
    .limit(safeRowLimit)

  if (error) {
    if (!isMissingGenerationJobsTable(error)) {
      console.error('[generation-jobs] failed to load bulk run history:', error)
    }
    return []
  }

  return buildBulkRunHistoryFromRows((data ?? []) as BulkRunHistoryRow[], limitRuns)
}
