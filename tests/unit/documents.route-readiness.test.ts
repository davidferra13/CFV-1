import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

test('document route blocks packet generation without an explicit readiness override', async () => {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const readinessPath = require.resolve('../../lib/events/readiness.ts')
  const routePath = require.resolve('../../app/api/documents/[eventId]/route.ts')

  const originalAuth = require.cache[authPath]
  const originalDb = require.cache[dbPath]
  const originalReadiness = require.cache[readinessPath]

  require.cache[authPath] = {
    exports: {
      requireChef: async () => ({
        id: 'user-1',
        tenantId: 'tenant-1',
      }),
    },
  } as NodeJS.Module

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          assert.equal(table, 'events')
          return {
            select(selection: string, options?: Record<string, unknown>) {
              assert.equal(selection, 'id')
              assert.deepEqual(options, { count: 'exact', head: true })
              return {
                eq() {
                  return this
                },
                then(onfulfilled: (value: { count: number; error: null }) => unknown) {
                  return Promise.resolve({ count: 1, error: null }).then(onfulfilled)
                },
              }
            },
          }
        },
      }),
    },
  } as NodeJS.Module

  require.cache[readinessPath] = {
    exports: {
      evaluateReadinessForDocumentGeneration: async () => ({
        eventId: 'event-1001',
        targetStatus: 'documents',
        ready: false,
        hardBlocked: true,
        confidence: 62,
        contextHash: 'hash-1',
        counts: {
          blockers: 1,
          risks: 0,
          stale: 0,
        },
        gates: [],
        blockers: [
          {
            gate: 'prep_timeline',
            status: 'unverified',
            label: 'Prep Timeline',
            description: 'No current prep proof.',
            details: 'Prep blocks are still missing.',
            isHardBlock: true,
            blocking: true,
            severity: 'critical',
            sourceOfTruth: 'No prep blocks exist.',
            lastVerifiedAt: null,
            verifyRoute: '/events/event-1001/prep-plan',
            verifyTarget: 'event.prep_plan',
            ctaLabel: 'Open Prep Plan',
          },
        ],
        warnings: [],
        mostLikelyFailurePoint: null,
      }),
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new NextRequest('http://localhost/api/documents/event-1001?type=all'),
      { params: { eventId: 'event-1001' } }
    )
    const body = await response.json()

    assert.equal(response.status, 409)
    assert.equal(
      body.error,
      'Readiness blockers must be fixed or explicitly overridden before generating the packet.'
    )
    assert.equal(body.readiness.counts.blockers, 1)
    assert.equal(body.readiness.blockers[0].gate, 'prep_timeline')
  } finally {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalReadiness) require.cache[readinessPath] = originalReadiness
    else delete require.cache[readinessPath]

    delete require.cache[routePath]
  }
})
