import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

test('legacy sendEmail forwards transactional mail through the active provider and returns a boolean', async () => {
  const sendPath = require.resolve('../../lib/email/send.ts')
  const providerPath = require.resolve('../../lib/email/provider/index.ts')
  const breakerPath = require.resolve('../../lib/resilience/circuit-breaker.ts')
  const resendClientPath = require.resolve('../../lib/email/resend-client.ts')
  const dbAdminPath = require.resolve('../../lib/db/admin.ts')

  const originalSend = require.cache[sendPath]
  const originalProvider = require.cache[providerPath]
  const originalBreaker = require.cache[breakerPath]
  const originalResendClient = require.cache[resendClientPath]
  const originalDbAdmin = require.cache[dbAdminPath]
  const previousResendApiKey = process.env.RESEND_API_KEY

  let capturedRequest: Record<string, unknown> | null = null

  process.env.RESEND_API_KEY = 're_test'

  require.cache[providerPath] = {
    exports: {
      getEmailProvider: () => ({
        name: 'resend',
        send: async (request: Record<string, unknown>) => {
          capturedRequest = request
          return {
            provider: 'resend',
            kind: request.kind,
            acceptedAt: '2026-04-20T12:00:00.000Z',
            message: {
              provider: 'resend',
              providerMessageId: 're_legacy_123',
              legacyResendMessageId: 're_legacy_123',
            },
          }
        },
        classifyError: () => ({
          retry: 'permanent',
          suppression: 'none',
          category: 'permanent',
          message: 'permanent failure',
        }),
      }),
    },
  } as NodeJS.Module

  require.cache[breakerPath] = {
    exports: {
      breakers: {
        resend: {
          execute: async (fn: () => Promise<unknown>) => fn(),
        },
      },
    },
  } as NodeJS.Module

  require.cache[resendClientPath] = {
    exports: {
      FROM_EMAIL: 'info@example.com',
      FROM_NAME: 'ChefFlow',
    },
  } as NodeJS.Module

  require.cache[dbAdminPath] = {
    exports: {
      createAdminClient: () => ({
        from(table: string) {
          if (table === 'email_suppressions') {
            return {
              select() {
                return {
                  limit: async () => ({ data: [] }),
                }
              },
            }
          }

          if (table === 'email_dead_letter_queue') {
            return {
              insert: async () => ({ data: null, error: null }),
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  delete require.cache[sendPath]

  try {
    const { sendEmail } = require(sendPath)
    const ok = await sendEmail({
      to: 'client@example.com',
      subject: 'Welcome',
      react: { type: function WelcomeEmail() {}, props: {}, key: null },
    })

    assert.equal(ok, true)
    assert.ok(capturedRequest)
    assert.equal(capturedRequest.kind, 'transactional')
    assert.equal(capturedRequest.to, 'client@example.com')
    assert.equal(capturedRequest.subject, 'Welcome')
    assert.equal(capturedRequest.from, 'ChefFlow <info@example.com>')
  } finally {
    if (previousResendApiKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previousResendApiKey

    restoreModule(sendPath, originalSend)
    restoreModule(providerPath, originalProvider)
    restoreModule(breakerPath, originalBreaker)
    restoreModule(resendClientPath, originalResendClient)
    restoreModule(dbAdminPath, originalDbAdmin)
  }
})
