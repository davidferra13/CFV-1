import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import {
  CORE_PACKET_DOCUMENT_TYPES,
  isOperationalDocumentType,
  type OperationalDocumentType,
} from '@/lib/documents/document-definitions'
import { evaluateReadinessForDocumentGeneration } from '@/lib/events/readiness'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import { createServerClient } from '@/lib/db/server'

const MAX_TYPES_PER_RUN = 12
const MAX_ERROR_MESSAGE_LENGTH = 280

const bulkGenerateRequestSchema = z.object({
  types: z.array(z.string()).max(MAX_TYPES_PER_RUN).optional(),
  readinessOverride: z.boolean().optional(),
  runId: z
    .string()
    .trim()
    .min(8)
    .max(80)
    .regex(/^[a-zA-Z0-9:_\-.]+$/)
    .optional(),
})

type BulkGenerateResultRow = {
  type: OperationalDocumentType
  status: 'succeeded' | 'failed'
  httpStatus: number
  generationJobId: string | null
  reusedJob: boolean
  snapshotId: string | null
  error: string | null
}

function normalizeRequestedTypes(input: unknown): OperationalDocumentType[] {
  if (!Array.isArray(input)) return [...CORE_PACKET_DOCUMENT_TYPES]
  const seen = new Set<OperationalDocumentType>()
  const normalized: OperationalDocumentType[] = []

  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const token = raw.trim().toLowerCase()
    if (!isOperationalDocumentType(token)) continue
    if (seen.has(token)) continue
    seen.add(token)
    normalized.push(token)
  }

  if (normalized.length === 0) return [...CORE_PACKET_DOCUMENT_TYPES]
  return normalized
}

function summarizeErrorMessage(input: unknown): string {
  const message = input instanceof Error ? input.message : String(input ?? 'Unknown error')
  if (message.length <= MAX_ERROR_MESSAGE_LENGTH) return message
  return `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 3)}...`
}

async function parseResponseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as { error?: unknown; details?: unknown }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return summarizeErrorMessage(payload.error)
      }
      if (Array.isArray(payload.details) && payload.details.length > 0) {
        return summarizeErrorMessage(payload.details[0])
      }
    } catch {
      return `HTTP ${response.status}`
    }
  }

  try {
    const text = await response.text()
    if (text.trim()) return summarizeErrorMessage(text.trim())
  } catch {
    // Ignore parse failures and return a generic HTTP error below.
  }

  return `HTTP ${response.status}`
}

export async function POST(request: NextRequest, { params }: { params: { eventId: string } }) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = params
  if (!eventId || eventId.length < 8) {
    return NextResponse.json({ error: 'Invalid event ID format' }, { status: 400 })
  }

  const db: any = createServerClient()
  const { count } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!count || count === 0) {
    return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
  }

  let payload: z.infer<typeof bulkGenerateRequestSchema>
  try {
    payload = bulkGenerateRequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  const types = normalizeRequestedTypes(payload.types).slice(0, MAX_TYPES_PER_RUN)
  const readiness = await evaluateReadinessForDocumentGeneration(eventId).catch(() => null)
  if (readiness && readiness.counts.blockers > 0 && payload.readinessOverride !== true) {
    return NextResponse.json(
      {
        error:
          'Readiness blockers must be fixed or explicitly overridden before generating the packet.',
        readiness: {
          confidence: readiness.confidence,
          counts: readiness.counts,
          blockers: readiness.blockers.map((blocker) => ({
            gate: blocker.gate,
            label: blocker.label,
            details: blocker.details,
            verifyRoute: blocker.verifyRoute,
          })),
        },
      },
      { status: 409 }
    )
  }
  const runId = payload.runId ?? randomUUID()
  const startedAt = new Date().toISOString()
  const results: BulkGenerateResultRow[] = []
  const cookieHeader = request.headers.get('cookie') ?? ''

  for (const type of types) {
    const url = new URL(`/api/documents/${eventId}`, request.url)
    url.searchParams.set('type', type)
    url.searchParams.set('archive', '1')
    url.searchParams.set('idempotencyKey', `bulk:${runId}:${type}`)
    if (payload.readinessOverride === true) {
      url.searchParams.set('readinessOverride', '1')
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      })

      const generationJobId = response.headers.get('X-Document-Generation-Job-Id')
      const reusedJob = response.headers.get('X-Document-Generation-Job-Reused') === '1'

      if (!response.ok) {
        const error = await parseResponseError(response)
        results.push({
          type,
          status: 'failed',
          httpStatus: response.status,
          generationJobId,
          reusedJob,
          snapshotId: null,
          error,
        })
        continue
      }

      await response.arrayBuffer()
      results.push({
        type,
        status: 'succeeded',
        httpStatus: response.status,
        generationJobId,
        reusedJob,
        snapshotId: null,
        error: null,
      })
    } catch (error) {
      results.push({
        type,
        status: 'failed',
        httpStatus: 500,
        generationJobId: null,
        reusedJob: false,
        snapshotId: null,
        error: summarizeErrorMessage(error),
      })
    }
  }

  for (const row of results) {
    if (row.status !== 'succeeded') continue
    const { data: snapshot, error: snapshotError } = await db
      .from('event_document_snapshots')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('event_id', eventId)
      .eq('document_type', row.type)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (snapshotError) {
      console.error('[documents/bulk-generate] latest snapshot lookup failed:', snapshotError)
      continue
    }
    row.snapshotId = (snapshot?.id as string | undefined) ?? null
  }

  const succeeded = results.filter((row) => row.status === 'succeeded').length
  const failed = results.length - succeeded

  return NextResponse.json({
    success: failed === 0,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    total: results.length,
    succeeded,
    failed,
    results,
  })
}
