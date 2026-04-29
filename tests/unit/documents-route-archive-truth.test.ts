import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

type MockModule = {
  path: string
  original: NodeJS.Module | undefined
}

function mockModule(relativePath: string, exports: Record<string, unknown>): MockModule {
  const path = require.resolve(relativePath)
  const original = require.cache[path]
  require.cache[path] = { exports } as NodeJS.Module
  return { path, original }
}

function restoreMocks(mocks: MockModule[]) {
  for (const mock of mocks.reverse()) {
    if (mock.original) require.cache[mock.path] = mock.original
    else delete require.cache[mock.path]
  }
}

function documentGeneratorMocks() {
  const render = (pdf: { title: (text: string) => void; text: (text: string) => void }) => {
    pdf.title('Event Summary')
    pdf.text('Confirmed operational details.')
  }

  return [
    mockModule('../../lib/documents/generate-grocery-list.ts', {
      fetchGroceryListData: async () => ({}),
      renderGroceryList: render,
    }),
    mockModule('../../lib/documents/generate-travel-route.ts', {
      fetchTravelRouteData: async () => ({}),
      renderTravelRoute: render,
    }),
    mockModule('../../lib/documents/generate-prep-sheet.ts', {
      fetchPrepSheetData: async () => ({}),
      renderPrepSheet: render,
    }),
    mockModule('../../lib/documents/generate-execution-sheet.ts', {
      fetchExecutionSheetData: async () => ({}),
      renderExecutionSheet: render,
    }),
    mockModule('../../lib/documents/generate-checklist.ts', {
      fetchChecklistData: async () => ({}),
      renderChecklist: render,
    }),
    mockModule('../../lib/documents/generate-front-of-house-menu.ts', {
      fetchFrontOfHouseMenuData: async () => ({}),
      renderFrontOfHouseMenu: render,
    }),
    mockModule('../../lib/documents/generate-packing-list.ts', {
      fetchPackingListData: async () => ({}),
      renderPackingList: render,
    }),
    mockModule('../../lib/documents/generate-reset-checklist.ts', {
      fetchResetChecklistData: async () => ({}),
      renderResetChecklist: render,
    }),
    mockModule('../../lib/documents/generate-event-summary.ts', {
      fetchEventSummaryData: async () => ({}),
      renderEventSummary: render,
    }),
    mockModule('../../lib/documents/generate-content-shot-list.ts', {
      fetchContentShotListData: async () => ({}),
      renderContentShotList: render,
    }),
    mockModule('../../lib/documents/generate-beo.ts', {
      fetchBEOData: async () => ({}),
      renderBEO: render,
    }),
    mockModule('../../lib/documents/generate-allergy-card.ts', {
      generateAllergyCard: async () => Buffer.from('allergy-card'),
    }),
    mockModule('../../lib/documents/generate-serving-labels.ts', {
      generateServingLabels: async () => ({ pdf: Buffer.from('labels').toString('base64') }),
    }),
  ]
}

function createRouteDbMock(config: {
  latestSnapshot: Record<string, unknown> | null
  uploadError?: unknown
}) {
  const state = {
    uploadCalls: 0,
    snapshotInsertCalls: 0,
  }

  const db = {
    state,
    storage: {
      from(bucket: string) {
        assert.equal(bucket, 'event-documents')
        return {
          upload: async () => {
            state.uploadCalls += 1
            return { error: config.uploadError ?? null }
          },
          remove: async () => ({ error: null }),
        }
      },
    },
    from(table: string) {
      const chain = {
        select() {
          return chain
        },
        eq() {
          return chain
        },
        order() {
          return chain
        },
        limit() {
          return chain
        },
        insert() {
          if (table === 'event_document_snapshots') {
            state.snapshotInsertCalls += 1
          }
          return chain
        },
        single() {
          return Promise.resolve({ data: { id: 'snapshot-new' }, error: null })
        },
        maybeSingle() {
          return Promise.resolve({ data: config.latestSnapshot, error: null })
        },
        then(onfulfilled: (value: { count: number; error: null }) => unknown) {
          assert.equal(table, 'events')
          return Promise.resolve({ count: 1, error: null }).then(onfulfilled)
        },
      }
      return chain
    },
  }

  return db
}

async function loadRoute(config: {
  latestSnapshot: Record<string, unknown> | null
  uploadError?: unknown
}) {
  const db = createRouteDbMock(config)
  const succeeded: Array<Record<string, unknown>> = []
  const failed: Array<Record<string, unknown>> = []
  const dlq: Array<Record<string, unknown>> = []

  const mocks = [
    mockModule('../../lib/auth/get-user.ts', {
      requireChef: async () => ({ id: 'user-12345', tenantId: 'tenant-12345' }),
    }),
    mockModule('../../lib/db/server.ts', {
      createServerClient: () => db,
    }),
    mockModule('../../lib/events/readiness.ts', {
      evaluateReadinessForDocumentGeneration: async () => null,
    }),
    mockModule('../../lib/print/actions.ts', {
      getDocumentContext: async () => ({ generatedBy: 'Test Chef', customFooter: null }),
    }),
    mockModule('../../lib/documents/generation-jobs-actions.ts', {
      startEventDocumentGenerationJob: async () => ({
        jobId: 'job-12345',
        reused: false,
        status: 'started',
        attempts: 0,
        maxAttempts: 1,
      }),
      markEventDocumentGenerationJobSucceeded: async (input: Record<string, unknown>) => {
        succeeded.push(input)
      },
      markEventDocumentGenerationJobFailed: async (input: Record<string, unknown>) => {
        failed.push(input)
      },
    }),
    mockModule('../../lib/resilience/retry.ts', {
      withRetry: async (fn: () => Promise<unknown>) => fn(),
      isTransientError: () => false,
      pushToDLQ: async (_db: unknown, entry: Record<string, unknown>) => {
        dlq.push(entry)
      },
    }),
    ...documentGeneratorMocks(),
  ]

  const routePath = require.resolve('../../app/api/documents/[eventId]/route.ts')
  delete require.cache[routePath]
  const route = require(routePath)

  return {
    GET: route.GET as typeof import('../../app/api/documents/[eventId]/route').GET,
    db,
    succeeded,
    failed,
    dlq,
    cleanup: () => {
      delete require.cache[routePath]
      restoreMocks(mocks)
    },
  }
}

test('document route fails the request and job when archive upload fails', async () => {
  const loaded = await loadRoute({
    latestSnapshot: null,
    uploadError: { message: 'storage unavailable' },
  })

  try {
    const response = await loaded.GET(
      new NextRequest('http://localhost/api/documents/event-12345?type=summary&archive=1'),
      { params: { eventId: 'event-12345' } }
    )
    const body = await response.json()

    assert.equal(response.status, 503)
    assert.equal(body.archiveReason, 'upload_failed')
    assert.equal(loaded.succeeded.length, 0)
    assert.equal(loaded.failed.length, 1)
    assert.equal(loaded.db.state.snapshotInsertCalls, 0)
  } finally {
    loaded.cleanup()
  }
})

test('document route preserves rate-limited archive generation as a benign PDF response', async () => {
  const loaded = await loadRoute({
    latestSnapshot: {
      version_number: 3,
      generated_at: new Date().toISOString(),
      content_hash: 'different-hash',
    },
  })

  try {
    const response = await loaded.GET(
      new NextRequest('http://localhost/api/documents/event-12345?type=summary&archive=1'),
      { params: { eventId: 'event-12345' } }
    )

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/pdf')
    assert.equal(response.headers.get('X-Document-Archive-Status'), 'rate_limited')
    assert.equal(response.headers.get('X-Document-Snapshot-Id'), null)
    assert.equal(loaded.db.state.uploadCalls, 0)
    assert.equal(loaded.succeeded.length, 1)
    assert.deepEqual((loaded.succeeded[0]?.metadata as any).archive, {
      archived: false,
      reason: 'rate_limited',
    })
  } finally {
    loaded.cleanup()
  }
})
