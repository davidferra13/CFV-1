import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBulkRunHistoryFromRows,
  markEventDocumentGenerationJobFailed,
  markEventDocumentGenerationJobSucceeded,
  parseBulkRunIdempotencyKey,
  startEventDocumentGenerationJob,
} from '@/lib/documents/generation-jobs-actions'

type QueryResponse<T = unknown> = {
  data: T | null
  error: { code?: string } | null
}

type DbMockState = {
  insertCalls: Array<{ table: string; payload: Record<string, unknown> }>
  updateCalls: Array<{ table: string; payload: Record<string, unknown> }>
  eqCalls: Array<{ table: string; column: string; value: unknown }>
}

function createDbMock(config?: {
  maybeSingleResponses?: QueryResponse[]
  singleResponses?: QueryResponse[]
  awaitedResponses?: Array<{ error: { code?: string } | null }>
}) {
  const maybeSingleQueue = [...(config?.maybeSingleResponses ?? [])]
  const singleQueue = [...(config?.singleResponses ?? [])]
  const awaitedQueue = [...(config?.awaitedResponses ?? [])]

  const state: DbMockState = {
    insertCalls: [],
    updateCalls: [],
    eqCalls: [],
  }

  return {
    state,
    from(table: string) {
      const chain = {
        select() {
          return chain
        },
        insert(payload: Record<string, unknown>) {
          state.insertCalls.push({ table, payload })
          return chain
        },
        update(payload: Record<string, unknown>) {
          state.updateCalls.push({ table, payload })
          return chain
        },
        eq(column: string, value: unknown) {
          state.eqCalls.push({ table, column, value })
          return chain
        },
        order() {
          return chain
        },
        limit() {
          return chain
        },
        maybeSingle(): Promise<QueryResponse> {
          return Promise.resolve(maybeSingleQueue.shift() ?? { data: null, error: null })
        },
        single(): Promise<QueryResponse> {
          return Promise.resolve(singleQueue.shift() ?? { data: null, error: null })
        },
        then(
          onFulfilled?: ((value: { error: { code?: string } | null }) => unknown) | null,
          onRejected?: ((reason: unknown) => unknown) | null
        ) {
          return Promise.resolve(awaitedQueue.shift() ?? { error: null }).then(
            onFulfilled ?? undefined,
            onRejected ?? undefined
          )
        },
      }
      return chain
    },
  }
}

describe('event document generation jobs', () => {
  it('reuses existing job for idempotent request key', async () => {
    const db = createDbMock({
      maybeSingleResponses: [
        {
          data: { id: 'job-existing', status: 'succeeded', attempts: 2, max_attempts: 5 },
          error: null,
        },
      ],
    })

    const result = await startEventDocumentGenerationJob({
      db,
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      requestedType: 'summary',
      selectedTypes: ['summary'],
      archiveRequested: false,
      idempotencyKey: 'docgen_12345678',
      maxAttempts: 5,
    })

    assert.deepEqual(result, {
      jobId: 'job-existing',
      reused: true,
      status: 'succeeded',
      attempts: 2,
      maxAttempts: 5,
    })
    assert.equal(db.state.insertCalls.length, 0)
  })

  it('creates a new generation job when no idempotent match exists', async () => {
    const db = createDbMock({
      singleResponses: [
        {
          data: { id: 'job-new', status: 'started', attempts: 0, max_attempts: 3 },
          error: null,
        },
      ],
    })

    const result = await startEventDocumentGenerationJob({
      db,
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      requestedType: 'all',
      selectedTypes: ['summary', 'grocery'],
      archiveRequested: true,
      maxAttempts: 3,
    })

    assert.deepEqual(result, {
      jobId: 'job-new',
      reused: false,
      status: 'started',
      attempts: 0,
      maxAttempts: 3,
    })
    assert.equal(db.state.insertCalls.length, 1)
    assert.equal(db.state.insertCalls[0]?.table, 'event_document_generation_jobs')
    assert.equal(db.state.insertCalls[0]?.payload.status, 'started')
  })

  it('falls back to existing job after unique-key race on insert', async () => {
    const db = createDbMock({
      maybeSingleResponses: [
        { data: null, error: null },
        {
          data: { id: 'job-race', status: 'started', attempts: 1, max_attempts: 4 },
          error: null,
        },
      ],
      singleResponses: [{ data: null, error: { code: '23505' } }],
    })

    const result = await startEventDocumentGenerationJob({
      db,
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      requestedType: 'pack',
      selectedTypes: ['summary', 'prep'],
      archiveRequested: true,
      idempotencyKey: 'docgen_12345678',
      maxAttempts: 4,
    })

    assert.deepEqual(result, {
      jobId: 'job-race',
      reused: true,
      status: 'started',
      attempts: 1,
      maxAttempts: 4,
    })
  })

  it('returns null when the jobs table does not exist', async () => {
    const db = createDbMock({
      singleResponses: [{ data: null, error: { code: '42P01' } }],
    })

    const result = await startEventDocumentGenerationJob({
      db,
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      requestedType: 'summary',
      selectedTypes: ['summary'],
      archiveRequested: false,
    })

    assert.equal(result, null)
  })

  it('normalizes failure payload and clamps attempts on failed status updates', async () => {
    const db = createDbMock()
    const veryLongMessage = `  ${'x'.repeat(1400)}  `

    await markEventDocumentGenerationJobFailed({
      db,
      tenantId: 'tenant-12345',
      jobId: 'job-1',
      attempts: 3.9,
      errorMessage: veryLongMessage,
    })

    assert.equal(db.state.updateCalls.length, 1)
    const payload = db.state.updateCalls[0]?.payload ?? {}
    assert.equal(payload.status, 'failed')
    assert.equal(payload.attempts, 3)
    assert.equal(typeof payload.error_message, 'string')
    assert.equal((payload.error_message as string).length, 1200)
  })

  it('marks success with normalized attempt count', async () => {
    const db = createDbMock()

    await markEventDocumentGenerationJobSucceeded({
      db,
      tenantId: 'tenant-12345',
      jobId: 'job-2',
      attempts: 1.8,
      filename: 'event-summary-2026-03-04.pdf',
      documentType: 'summary',
      sizeBytes: 2048,
      metadata: {},
    })

    assert.equal(db.state.updateCalls.length, 1)
    const payload = db.state.updateCalls[0]?.payload ?? {}
    assert.equal(payload.status, 'succeeded')
    assert.equal(payload.attempts, 1)
    assert.equal(payload.result_document_type, 'summary')
    assert.equal(payload.result_size_bytes, 2048)
  })

  it('parses bulk run idempotency keys', () => {
    assert.deepEqual(parseBulkRunIdempotencyKey('bulk:run-123:summary'), { runId: 'run-123' })
    assert.equal(parseBulkRunIdempotencyKey('bulk:'), null)
    assert.equal(parseBulkRunIdempotencyKey('docgen_12345678'), null)
    assert.equal(parseBulkRunIdempotencyKey(null), null)
  })

  it('builds grouped run history from bulk rows', () => {
    const rows = [
      {
        requested_type: 'summary',
        status: 'succeeded',
        error_message: null,
        created_at: '2026-03-01T12:00:00.000Z',
        completed_at: '2026-03-01T12:00:04.000Z',
        idempotency_key: 'bulk:run-a:summary',
        result_metadata: {
          archive: {
            archived: true,
            snapshotId: 'snap-summary',
          },
        },
      },
      {
        requested_type: 'grocery',
        status: 'failed',
        error_message: 'menu missing',
        created_at: '2026-03-01T12:00:05.000Z',
        completed_at: '2026-03-01T12:00:09.000Z',
        idempotency_key: 'bulk:run-a:grocery',
      },
      {
        requested_type: 'packing',
        status: 'succeeded',
        error_message: null,
        created_at: '2026-03-02T09:00:00.000Z',
        completed_at: '2026-03-02T09:00:03.000Z',
        idempotency_key: 'bulk:run-b:packing',
      },
      {
        requested_type: 'all',
        status: 'succeeded',
        error_message: null,
        created_at: '2026-03-02T09:00:04.000Z',
        completed_at: '2026-03-02T09:00:06.000Z',
        idempotency_key: 'bulk:run-b:all',
      },
      {
        requested_type: 'prep',
        status: 'succeeded',
        error_message: null,
        created_at: '2026-03-02T09:01:00.000Z',
        completed_at: '2026-03-02T09:01:05.000Z',
        idempotency_key: 'docgen_12345678',
      },
    ]

    const grouped = buildBulkRunHistoryFromRows(rows, 5)
    assert.equal(grouped.length, 2)
    assert.equal(grouped[0]?.runId, 'run-b')
    assert.equal(grouped[0]?.total, 1)
    assert.equal(grouped[0]?.succeeded, 1)
    assert.equal(grouped[1]?.runId, 'run-a')
    assert.equal(grouped[1]?.total, 2)
    assert.equal(grouped[1]?.failed, 1)
    assert.equal(
      grouped[1]?.docs.some((doc) => doc.type === 'grocery' && doc.status === 'failed'),
      true
    )
    assert.equal(
      grouped[1]?.docs.some((doc) => doc.type === 'summary' && doc.snapshotId === 'snap-summary'),
      true
    )
  })
})
