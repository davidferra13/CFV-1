import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function buildScheduledCallsDb(opts: {
  calls24h?: Array<Record<string, unknown>>
  calls1h?: Array<Record<string, unknown>>
  updateError?: { message: string } | null
  updates?: Array<Record<string, unknown>>
}) {
  let selectCount = 0

  return {
    from(table: string) {
      if (table !== 'scheduled_calls') throw new Error(`Unexpected table: ${table}`)

      return {
        select() {
          const currentIndex = selectCount++
          return {
            in() {
              return {
                gte() {
                  return {
                    lte() {
                      return {
                        is() {
                          return Promise.resolve({
                            data: currentIndex === 0 ? opts.calls24h ?? [] : opts.calls1h ?? [],
                            error: null,
                          })
                        },
                      }
                    },
                  }
                },
              }
            },
          }
        },
        update(payload: Record<string, unknown>) {
          opts.updates?.push(payload)
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: opts.updateError ?? null })
                },
              }
            },
          }
        },
      }
    },
  }
}

test('call reminders cron records repairable send failures with reminder metadata', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const cronAuthPath = require.resolve('../../lib/auth/cron-auth.ts')
  const monitorPath = require.resolve('../../lib/cron/monitor.ts')
  const sideEffectPath = require.resolve('../../lib/monitoring/non-blocking.ts')
  const deliveryPath = require.resolve('../../lib/calls/call-reminder-delivery.ts')
  const routePath = require.resolve('../../app/api/scheduled/call-reminders/route.ts')

  const originalDb = require.cache[dbPath]
  const originalCronAuth = require.cache[cronAuthPath]
  const originalMonitor = require.cache[monitorPath]
  const originalSideEffect = require.cache[sideEffectPath]
  const originalDelivery = require.cache[deliveryPath]

  const recordedFailures: Array<Record<string, unknown>> = []

  require.cache[dbPath] = {
    exports: {
      createServerClient: () =>
        buildScheduledCallsDb({
          calls24h: [
            {
              id: 'call-24',
              tenant_id: 'chef-1',
              call_type: 'discovery',
              title: 'Discovery call',
              scheduled_at: '2099-04-21T16:00:00.000Z',
              duration_minutes: 30,
              contact_name: 'Maya Chen',
              contact_company: null,
              client: { full_name: 'Maya Chen' },
            },
          ],
          calls1h: [],
        }),
    },
  } as NodeJS.Module

  require.cache[cronAuthPath] = {
    exports: {
      verifyCronAuth: () => null,
    },
  } as NodeJS.Module

  require.cache[monitorPath] = {
    exports: {
      runMonitoredCronJob: async (_name: string, job: () => Promise<unknown>) => job(),
    },
  } as NodeJS.Module

  require.cache[sideEffectPath] = {
    exports: {
      recordSideEffectFailure: async (opts: Record<string, unknown>) => {
        recordedFailures.push(opts)
      },
    },
  } as NodeJS.Module

  require.cache[deliveryPath] = {
    exports: {
      sendCallReminderEmailDelivery: async () => {
        throw new Error('provider timeout')
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new Request('http://localhost/api/scheduled/call-reminders', {
        headers: { authorization: 'Bearer test' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.processed_24h, 1)
    assert.equal(body.processed_1h, 0)
    assert.equal(body.sent, 0)
    assert.equal(body.errors, 1)
    assert.equal(recordedFailures.length, 1)
    assert.equal(recordedFailures[0].source, 'cron:call-reminders')
    assert.equal(recordedFailures[0].operation, 'send_24h_reminder')
    assert.equal(recordedFailures[0].entityType, 'scheduled_call')
    assert.equal(recordedFailures[0].entityId, 'call-24')
    assert.equal(recordedFailures[0].tenantId, 'chef-1')
    assert.equal(
      (recordedFailures[0].context as Record<string, unknown>).repairKind,
      'call_reminder_24h_email_redelivery'
    )
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalCronAuth) require.cache[cronAuthPath] = originalCronAuth
    else delete require.cache[cronAuthPath]

    if (originalMonitor) require.cache[monitorPath] = originalMonitor
    else delete require.cache[monitorPath]

    if (originalSideEffect) require.cache[sideEffectPath] = originalSideEffect
    else delete require.cache[sideEffectPath]

    if (originalDelivery) require.cache[deliveryPath] = originalDelivery
    else delete require.cache[deliveryPath]

    delete require.cache[routePath]
  }
})

test('call reminders cron records sent-marker failures without repair metadata', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const cronAuthPath = require.resolve('../../lib/auth/cron-auth.ts')
  const monitorPath = require.resolve('../../lib/cron/monitor.ts')
  const sideEffectPath = require.resolve('../../lib/monitoring/non-blocking.ts')
  const deliveryPath = require.resolve('../../lib/calls/call-reminder-delivery.ts')
  const routePath = require.resolve('../../app/api/scheduled/call-reminders/route.ts')

  const originalDb = require.cache[dbPath]
  const originalCronAuth = require.cache[cronAuthPath]
  const originalMonitor = require.cache[monitorPath]
  const originalSideEffect = require.cache[sideEffectPath]
  const originalDelivery = require.cache[deliveryPath]

  const recordedFailures: Array<Record<string, unknown>> = []
  const updates: Array<Record<string, unknown>> = []

  require.cache[dbPath] = {
    exports: {
      createServerClient: () =>
        buildScheduledCallsDb({
          calls24h: [
            {
              id: 'call-24',
              tenant_id: 'chef-1',
              call_type: 'discovery',
              title: 'Discovery call',
              scheduled_at: '2099-04-21T16:00:00.000Z',
              duration_minutes: 30,
              contact_name: 'Maya Chen',
              contact_company: null,
              client: { full_name: 'Maya Chen' },
            },
          ],
          calls1h: [],
          updateError: { message: 'write failed' },
          updates,
        }),
    },
  } as NodeJS.Module

  require.cache[cronAuthPath] = {
    exports: {
      verifyCronAuth: () => null,
    },
  } as NodeJS.Module

  require.cache[monitorPath] = {
    exports: {
      runMonitoredCronJob: async (_name: string, job: () => Promise<unknown>) => job(),
    },
  } as NodeJS.Module

  require.cache[sideEffectPath] = {
    exports: {
      recordSideEffectFailure: async (opts: Record<string, unknown>) => {
        recordedFailures.push(opts)
      },
    },
  } as NodeJS.Module

  require.cache[deliveryPath] = {
    exports: {
      sendCallReminderEmailDelivery: async () => ({
        emailSent: true,
        recipientEmail: 'chef@example.com',
      }),
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new Request('http://localhost/api/scheduled/call-reminders', {
        headers: { authorization: 'Bearer test' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.processed_24h, 1)
    assert.equal(body.sent, 0)
    assert.equal(body.errors, 1)
    assert.equal(updates.length, 1)
    assert.equal(recordedFailures.length, 1)
    assert.equal(recordedFailures[0].operation, 'mark_24h_reminder_sent')
    assert.equal(
      (recordedFailures[0].context as Record<string, unknown>).repairKind,
      undefined
    )
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalCronAuth) require.cache[cronAuthPath] = originalCronAuth
    else delete require.cache[cronAuthPath]

    if (originalMonitor) require.cache[monitorPath] = originalMonitor
    else delete require.cache[monitorPath]

    if (originalSideEffect) require.cache[sideEffectPath] = originalSideEffect
    else delete require.cache[sideEffectPath]

    if (originalDelivery) require.cache[deliveryPath] = originalDelivery
    else delete require.cache[deliveryPath]

    delete require.cache[routePath]
  }
})
