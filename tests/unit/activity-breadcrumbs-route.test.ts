import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

test('breadcrumbs route returns 401 when there is no authenticated user', async () => {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const rateLimitPath = require.resolve('../../lib/rateLimit.ts')
  const routePath = require.resolve('../../app/api/activity/breadcrumbs/route.ts')

  const originalAuth = require.cache[authPath]
  const originalAdmin = require.cache[adminPath]
  const originalRateLimit = require.cache[rateLimitPath]

  require.cache[authPath] = {
    exports: {
      getCurrentUser: async () => null,
    },
  } as NodeJS.Module

  require.cache[adminPath] = {
    exports: {
      createAdminClient: () => ({
        from() {
          throw new Error('insert should not be called for unauthorized requests')
        },
      }),
    },
  } as NodeJS.Module

  require.cache[rateLimitPath] = {
    exports: {
      checkRateLimit: async () => {},
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/activity/breadcrumbs', {
        method: 'POST',
        body: JSON.stringify({ items: [{ path: '/dashboard' }] }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 401)
    assert.equal(body.error, 'unauthorized')
  } finally {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalAdmin) require.cache[adminPath] = originalAdmin
    else delete require.cache[adminPath]

    if (originalRateLimit) require.cache[rateLimitPath] = originalRateLimit
    else delete require.cache[rateLimitPath]

    delete require.cache[routePath]
  }
})

test('breadcrumbs route uses the authenticated chef tenant context for inserts', async () => {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const adminPath = require.resolve('../../lib/db/admin.ts')
  const rateLimitPath = require.resolve('../../lib/rateLimit.ts')
  const routePath = require.resolve('../../app/api/activity/breadcrumbs/route.ts')

  const originalAuth = require.cache[authPath]
  const originalAdmin = require.cache[adminPath]
  const originalRateLimit = require.cache[rateLimitPath]

  let insertedRows: Array<Record<string, unknown>> | null = null

  require.cache[authPath] = {
    exports: {
      getCurrentUser: async () => ({
        id: 'user-1',
        role: 'chef',
        entityId: 'chef-1',
        tenantId: 'chef-1',
      }),
    },
  } as NodeJS.Module

  require.cache[adminPath] = {
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          assert.equal(table, 'chef_breadcrumbs')
          return {
            insert(rows: Array<Record<string, unknown>>) {
              insertedRows = rows
              return Promise.resolve({ error: null })
            },
          }
        },
      }),
    },
  } as NodeJS.Module

  require.cache[rateLimitPath] = {
    exports: {
      checkRateLimit: async () => {},
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/activity/breadcrumbs', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { breadcrumb_type: 'page_view', path: '/dashboard', timestamp: '2026-04-09T12:00:00Z' },
          ],
        }),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.tracked, true)
    assert.equal(body.count, 1)
    assert.deepEqual(insertedRows, [
      {
        actor_id: 'user-1',
        breadcrumb_type: 'page_view',
        created_at: '2026-04-09T12:00:00Z',
        label: null,
        metadata: {},
        path: '/dashboard',
        referrer_path: null,
        session_id: null,
        tenant_id: 'chef-1',
      },
    ])
  } finally {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalAdmin) require.cache[adminPath] = originalAdmin
    else delete require.cache[adminPath]

    if (originalRateLimit) require.cache[rateLimitPath] = originalRateLimit
    else delete require.cache[rateLimitPath]

    delete require.cache[routePath]
  }
})
