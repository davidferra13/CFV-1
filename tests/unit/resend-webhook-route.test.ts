import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

test('resend webhook route preserves campaign recipient updates and suppression side effects', async () => {
  const routePath = require.resolve('../../app/api/webhooks/resend/route.ts')
  const dbPath = require.resolve('../../lib/db/admin.ts')
  const providerPath = require.resolve('../../lib/email/provider/index.ts')
  const auditPath = require.resolve('../../lib/webhooks/audit-log.ts')

  const originalRoute = require.cache[routePath]
  const originalDb = require.cache[dbPath]
  const originalProvider = require.cache[providerPath]
  const originalAudit = require.cache[auditPath]
  const previousSecret = process.env.RESEND_WEBHOOK_SECRET

  let campaignUpdate: Record<string, unknown> | null = null
  let campaignLookup: { field: string; value: string | null; nullField: string } | null = null
  const suppressions: Array<Record<string, unknown>> = []
  const auditEntries: Array<Record<string, unknown>> = []

  process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'

  require.cache[dbPath] = {
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          if (table === 'campaign_recipients') {
            return {
              update(payload: Record<string, unknown>) {
                campaignUpdate = payload
                return {
                  eq(field: string, value: string | null) {
                    return {
                      is(nullField: string) {
                        campaignLookup = { field, value, nullField }
                        return Promise.resolve({ error: null })
                      },
                    }
                  },
                }
              },
            }
          }

          if (table === 'email_suppressions') {
            return {
              upsert(payload: Record<string, unknown>) {
                suppressions.push(payload)
                return Promise.resolve({ data: null, error: null })
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[providerPath] = {
    exports: {
      verifyResendWebhookSignature: async () => true,
      normalizeResendWebhookEvent: () => ({
        provider: 'resend',
        kind: 'bounced',
        providerEventType: 'email.bounced',
        occurredAt: '2026-04-20T12:15:00.000Z',
        message: {
          provider: 'resend',
          providerMessageId: 're_webhook_123',
          legacyResendMessageId: 're_webhook_123',
        },
        recipients: ['bounce@example.com'],
        suppression: 'hard_bounce',
        raw: {},
      }),
      mapNormalizedEventToCampaignRecipientField: () => 'bounced_at',
    },
  } as NodeJS.Module

  require.cache[auditPath] = {
    exports: {
      logWebhookEvent: async (entry: Record<string, unknown>) => {
        auditEntries.push(entry)
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email.bounced',
          data: { email_id: 're_webhook_123', to: ['bounce@example.com'] },
        }),
        headers: {
          'content-type': 'application/json',
          'svix-signature': 't=test,v1=test',
        },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.deepEqual(campaignUpdate, { bounced_at: '2026-04-20T12:15:00.000Z' })
    assert.deepEqual(campaignLookup, {
      field: 'resend_message_id',
      value: 're_webhook_123',
      nullField: 'bounced_at',
    })
    assert.deepEqual(suppressions, [
      {
        email: 'bounce@example.com',
        reason: 'hard_bounce',
        source: 'resend_webhook',
      },
    ])
    assert.equal(auditEntries.length, 1)
    assert.equal(auditEntries[0].status, 'processed')
    assert.deepEqual(auditEntries[0].result, { field: 'bounced_at', kind: 'bounced' })
  } finally {
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET
    else process.env.RESEND_WEBHOOK_SECRET = previousSecret

    restoreModule(routePath, originalRoute)
    restoreModule(dbPath, originalDb)
    restoreModule(providerPath, originalProvider)
    restoreModule(auditPath, originalAudit)
  }
})
