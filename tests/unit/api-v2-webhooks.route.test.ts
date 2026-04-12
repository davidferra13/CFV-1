import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

type InsertPayload = {
  description: string | null
  events: string[]
  is_active: boolean
  secret: string
  tenant_id: string
  url: string
}

function loadRouteModule() {
  const apiV2Path = require.resolve('../../lib/api/v2/index.ts')
  const featureFlagsPath = require.resolve('../../lib/features/chef-feature-flags.ts')
  const observabilityPath = require.resolve('../../lib/features/developer-tools-observability.ts')
  const routePath = require.resolve('../../app/api/v2/webhooks/route.ts')

  const originalApiV2 = require.cache[apiV2Path]
  const originalFeatureFlags = require.cache[featureFlagsPath]
  const originalObservability = require.cache[observabilityPath]

  let insertedPayload: InsertPayload | null = null
  let receivedCtx: Record<string, unknown> | null = null
  let firstUseInput: Record<string, unknown> | null = null

  const ctx = {
    tenantId: 'tenant-1',
    scopes: ['webhooks:manage'],
    keyId: 'key-1',
    db: {
      from(table: string) {
        assert.equal(table, 'webhook_endpoints')

        return {
          insert(payload: InsertPayload) {
            insertedPayload = payload

            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: 'wh_1',
                      ...payload,
                    },
                    error: null,
                  }),
                }
              },
            }
          },
        }
      },
    },
  }

  require.cache[apiV2Path] = {
    exports: {
      withApiAuth: (handler: Function) => async (req: Request) => {
        receivedCtx = ctx
        return handler(req, ctx)
      },
      apiSuccess: (data: unknown) => Response.json(data, { status: 200 }),
      apiCreated: (data: unknown) => Response.json(data, { status: 201 }),
      apiValidationError: (error: { issues?: unknown }) =>
        Response.json({ error }, { status: 400 }),
      apiError: (_code: string, message: string, status: number) =>
        Response.json({ error: message }, { status }),
    },
  } as NodeJS.Module

  require.cache[featureFlagsPath] = {
    exports: {
      CHEF_FEATURE_FLAGS: { developerTools: 'developer_tools' },
    },
  } as NodeJS.Module

  require.cache[observabilityPath] = {
    exports: {
      logDeveloperToolsFirstUseIfNeeded: async (input: Record<string, unknown>) => {
        firstUseInput = input
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]
  const mod = require(routePath)

  const restore = () => {
    if (originalApiV2) {
      require.cache[apiV2Path] = originalApiV2
    } else {
      delete require.cache[apiV2Path]
    }

    if (originalFeatureFlags) {
      require.cache[featureFlagsPath] = originalFeatureFlags
    } else {
      delete require.cache[featureFlagsPath]
    }

    if (originalObservability) {
      require.cache[observabilityPath] = originalObservability
    } else {
      delete require.cache[observabilityPath]
    }

    delete require.cache[routePath]
  }

  return {
    mod,
    restore,
    getInsertedPayload: () => insertedPayload,
    getReceivedCtx: () => receivedCtx,
    getFirstUseInput: () => firstUseInput,
  }
}

test('api v2 webhooks stores normalized payload and logs first use metadata', async () => {
  const { mod, restore, getInsertedPayload, getReceivedCtx, getFirstUseInput } = loadRouteModule()

  try {
    const response = await mod.POST(
      new Request('http://localhost/api/v2/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: '  https://example.com/hook  ',
          events: ['lead.created', 'lead.updated'],
          description: 'Outbound sync',
        }),
      })
    )

    assert.equal(response.status, 201)
    assert.deepEqual(getInsertedPayload(), {
      tenant_id: 'tenant-1',
      url: 'https://example.com/hook',
      description: 'Outbound sync',
      events: ['lead.created', 'lead.updated'],
      secret: getInsertedPayload()?.secret ?? '',
      is_active: true,
    })
    assert.ok(getInsertedPayload()?.secret)
    assert.deepEqual(getFirstUseInput(), {
      tenantId: 'tenant-1',
      actorId: 'key-1',
      kind: 'raw_webhook',
      entityId: 'wh_1',
      context: { event_count: 2, via: 'api_v2' },
      db: getReceivedCtx()?.db,
    })
  } finally {
    restore()
  }
})
