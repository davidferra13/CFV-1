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

test('bulk generate does not attach stale snapshot ids when archive status is missing', async () => {
  const db = {
    from(table: string) {
      assert.equal(table, 'events')
      const chain = {
        select() {
          return chain
        },
        eq() {
          return chain
        },
        then(onfulfilled: (value: { count: number; error: null }) => unknown) {
          return Promise.resolve({ count: 1, error: null }).then(onfulfilled)
        },
      }
      return chain
    },
  }

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
    mockModule('../../lib/security/csrf.ts', {
      verifyCsrfOrigin: () => null,
    }),
  ]

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(Buffer.from('%PDF-1.4'), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Document-Generation-Job-Id': 'job-summary',
      },
    })

  const routePath = require.resolve('../../app/api/documents/[eventId]/bulk-generate/route.ts')
  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/documents/event-12345/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({ types: ['summary'], runId: 'run-12345' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: { eventId: 'event-12345' } }
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, false)
    assert.equal(body.succeeded, 0)
    assert.equal(body.failed, 1)
    assert.equal(body.results[0].status, 'failed')
    assert.equal(body.results[0].snapshotId, null)
    assert.equal(body.results[0].error, 'Archive status missing from document response.')
  } finally {
    globalThis.fetch = originalFetch
    delete require.cache[routePath]
    restoreMocks(mocks)
  }
})

test('bulk generate uses the snapshot id returned by the document route', async () => {
  const db = {
    from(table: string) {
      assert.equal(table, 'events')
      const chain = {
        select() {
          return chain
        },
        eq() {
          return chain
        },
        then(onfulfilled: (value: { count: number; error: null }) => unknown) {
          return Promise.resolve({ count: 1, error: null }).then(onfulfilled)
        },
      }
      return chain
    },
  }

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
    mockModule('../../lib/security/csrf.ts', {
      verifyCsrfOrigin: () => null,
    }),
  ]

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(Buffer.from('%PDF-1.4'), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Document-Archive-Status': 'archived',
        'X-Document-Snapshot-Id': 'snapshot-from-route',
      },
    })

  const routePath = require.resolve('../../app/api/documents/[eventId]/bulk-generate/route.ts')
  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/documents/event-12345/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({ types: ['summary'], runId: 'run-12345' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: { eventId: 'event-12345' } }
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, true)
    assert.equal(body.succeeded, 1)
    assert.equal(body.failed, 0)
    assert.equal(body.results[0].snapshotId, 'snapshot-from-route')
  } finally {
    globalThis.fetch = originalFetch
    delete require.cache[routePath]
    restoreMocks(mocks)
  }
})
