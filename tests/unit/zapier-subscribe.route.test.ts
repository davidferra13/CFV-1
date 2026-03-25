import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

type InsertPayload = {
  event_types: string[]
  target_url: string
  tenant_id: string
}

function loadRouteModule() {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const requireProPath = require.resolve('../../lib/billing/require-pro.ts')
  const tierPath = require.resolve('../../lib/billing/tier.ts')
  const serverPath = require.resolve('../../lib/db/server.ts')
  const routePath = require.resolve('../../app/api/integrations/zapier/subscribe/route.ts')

  const originalAuth = require.cache[authPath]
  const originalRequirePro = require.cache[requireProPath]
  const originalTier = require.cache[tierPath]
  const originalServer = require.cache[serverPath]

  let fromCalls = 0
  let insertedPayload: InsertPayload | null = null

  require.cache[authPath] = {
    exports: {
      requireChef: async () => ({ entityId: 'tenant-1' }),
    },
  } as NodeJS.Module

  require.cache[requireProPath] = {
    exports: {
      requirePro: async () => {},
    },
  } as NodeJS.Module

  require.cache[tierPath] = {
    exports: {
      hasProAccess: async () => true,
    },
  } as NodeJS.Module

  require.cache[serverPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          assert.equal(table, 'zapier_webhook_subscriptions')
          fromCalls += 1

          return {
            insert(payload: InsertPayload) {
              insertedPayload = payload

              return {
                select(_columns: string) {
                  return {
                    single: async () => ({
                      data: {
                        id: 'sub-1',
                        target_url: payload.target_url,
                        event_types: payload.event_types,
                        secret: 'secret',
                        created_at: '2026-03-16T00:00:00.000Z',
                      },
                      error: null,
                    }),
                  }
                },
              }
            },
          }
        },
      }),
    },
  } as NodeJS.Module

  delete require.cache[routePath]
  const mod = require(routePath)

  const restore = () => {
    if (originalAuth) {
      require.cache[authPath] = originalAuth
    } else {
      delete require.cache[authPath]
    }

    if (originalRequirePro) {
      require.cache[requireProPath] = originalRequirePro
    } else {
      delete require.cache[requireProPath]
    }

    if (originalTier) {
      require.cache[tierPath] = originalTier
    } else {
      delete require.cache[tierPath]
    }

    if (originalServer) {
      require.cache[serverPath] = originalServer
    } else {
      delete require.cache[serverPath]
    }

    delete require.cache[routePath]
  }

  return {
    mod,
    restore,
    getFromCalls: () => fromCalls,
    getInsertedPayload: () => insertedPayload,
  }
}

test('zapier subscribe rejects localhost webhook targets before any database write', async () => {
  const { mod, restore, getFromCalls } = loadRouteModule()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/integrations/zapier/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetUrl: 'https://localhost/webhook',
          event_types: ['inquiry.created'],
        }),
      })
    )

    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /internal/i)
    assert.equal(getFromCalls(), 0)
  } finally {
    restore()
  }
})

test('zapier subscribe stores the normalized webhook URL for valid targets', async () => {
  const { mod, restore, getInsertedPayload } = loadRouteModule()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/integrations/zapier/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetUrl: '  https://hooks.zapier.com/hooks/catch/123/abc  ',
          event_types: ['inquiry.created'],
        }),
      })
    )

    assert.equal(response.status, 201)
    assert.deepEqual(getInsertedPayload(), {
      tenant_id: 'tenant-1',
      target_url: 'https://hooks.zapier.com/hooks/catch/123/abc',
      event_types: ['inquiry.created'],
    })
  } finally {
    restore()
  }
})
