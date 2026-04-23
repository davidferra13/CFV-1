import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('daily report cron stores reports without sending email when report emails are disabled', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const computePath = require.resolve('../../lib/reports/compute-daily-report.ts')
  const sendEmailPath = require.resolve('../../lib/email/send.ts')
  const templatePath = require.resolve('../../lib/email/templates/daily-report.tsx')
  const cronAuthPath = require.resolve('../../lib/auth/cron-auth.ts')
  const monitorPath = require.resolve('../../lib/cron/monitor.ts')
  const sideEffectPath = require.resolve('../../lib/monitoring/non-blocking.ts')
  const routePath = require.resolve('../../app/api/scheduled/daily-report/route.ts')

  const originalDb = require.cache[dbPath]
  const originalCompute = require.cache[computePath]
  const originalSendEmail = require.cache[sendEmailPath]
  const originalTemplate = require.cache[templatePath]
  const originalCronAuth = require.cache[cronAuthPath]
  const originalMonitor = require.cache[monitorPath]
  const originalSideEffect = require.cache[sideEffectPath]
  const previousEmailsEnabled = process.env.ENABLE_DAILY_REPORT_EMAILS

  const upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = []
  let sendEmailCalls = 0
  let authLookups = 0

  delete process.env.ENABLE_DAILY_REPORT_EMAILS

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'chefs') {
            return {
              select(selection: string) {
                assert.equal(selection, 'id, auth_user_id, business_name')
                return Promise.resolve({
                  data: [{ id: 'chef-1', auth_user_id: 'user-1', business_name: 'Test Kitchen' }],
                  error: null,
                })
              },
            }
          }

          if (table === 'daily_reports') {
            return {
              upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
                upserts.push({ payload, options })
                return Promise.resolve({ data: null, error: null })
              },
              update() {
                throw new Error('email_sent_at should not be updated when email delivery is off')
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
        auth: {
          admin: {
            async getUserById() {
              authLookups++
              throw new Error('auth lookup should not run when daily report emails are disabled')
            },
          },
        },
      }),
    },
  } as NodeJS.Module

  require.cache[computePath] = {
    exports: {
      computeDailyReport: async () => ({
        eventsToday: [],
        paymentsReceivedTodayCents: 0,
        newInquiriesToday: 0,
      }),
    },
  } as NodeJS.Module

  require.cache[sendEmailPath] = {
    exports: {
      sendEmail: async () => {
        sendEmailCalls++
        return true
      },
    },
  } as NodeJS.Module

  require.cache[templatePath] = {
    exports: {
      DailyReportEmail: function DailyReportEmail() {
        return null
      },
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
      recordSideEffectFailure: async () => {
        throw new Error('side effect failures should not be recorded for the happy path')
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new Request('http://localhost/api/scheduled/daily-report', {
        headers: { authorization: 'Bearer test' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, true)
    assert.equal(body.chefs, 1)
    assert.equal(body.emailsEnabled, false)
    assert.equal(body.sent, 0)
    assert.equal(body.failed, 0)
    assert.equal(sendEmailCalls, 0)
    assert.equal(authLookups, 0)
    assert.equal(upserts.length, 1)
    assert.equal(upserts[0].payload.tenant_id, 'chef-1')
    assert.deepEqual(upserts[0].options, { onConflict: 'tenant_id,report_date' })
    assert.equal(typeof upserts[0].payload.report_date, 'string')
  } finally {
    if (previousEmailsEnabled === undefined) delete process.env.ENABLE_DAILY_REPORT_EMAILS
    else process.env.ENABLE_DAILY_REPORT_EMAILS = previousEmailsEnabled

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalCompute) require.cache[computePath] = originalCompute
    else delete require.cache[computePath]

    if (originalSendEmail) require.cache[sendEmailPath] = originalSendEmail
    else delete require.cache[sendEmailPath]

    if (originalTemplate) require.cache[templatePath] = originalTemplate
    else delete require.cache[templatePath]

    if (originalCronAuth) require.cache[cronAuthPath] = originalCronAuth
    else delete require.cache[cronAuthPath]

    if (originalMonitor) require.cache[monitorPath] = originalMonitor
    else delete require.cache[monitorPath]

    if (originalSideEffect) require.cache[sideEffectPath] = originalSideEffect
    else delete require.cache[sideEffectPath]

    delete require.cache[routePath]
  }
})

test('daily report cron records repairable email failures with report context', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const computePath = require.resolve('../../lib/reports/compute-daily-report.ts')
  const deliveryPath = require.resolve('../../lib/reports/daily-report-delivery.ts')
  const cronAuthPath = require.resolve('../../lib/auth/cron-auth.ts')
  const monitorPath = require.resolve('../../lib/cron/monitor.ts')
  const sideEffectPath = require.resolve('../../lib/monitoring/non-blocking.ts')
  const routePath = require.resolve('../../app/api/scheduled/daily-report/route.ts')

  const originalDb = require.cache[dbPath]
  const originalCompute = require.cache[computePath]
  const originalDelivery = require.cache[deliveryPath]
  const originalCronAuth = require.cache[cronAuthPath]
  const originalMonitor = require.cache[monitorPath]
  const originalSideEffect = require.cache[sideEffectPath]
  const previousEmailsEnabled = process.env.ENABLE_DAILY_REPORT_EMAILS

  const recordedFailures: Array<Record<string, unknown>> = []

  process.env.ENABLE_DAILY_REPORT_EMAILS = 'true'

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'chefs') {
            return {
              select() {
                return Promise.resolve({
                  data: [{ id: 'chef-1', auth_user_id: 'user-1', business_name: 'Test Kitchen' }],
                  error: null,
                })
              },
            }
          }

          if (table === 'daily_reports') {
            return {
              upsert() {
                return Promise.resolve({ data: null, error: null })
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[computePath] = {
    exports: {
      computeDailyReport: async () => ({
        eventsToday: [],
        paymentsReceivedTodayCents: 0,
        newInquiriesToday: 0,
      }),
    },
  } as NodeJS.Module

  require.cache[deliveryPath] = {
    exports: {
      sendDailyReportEmailDelivery: async () => {
        throw new Error('provider timeout')
      },
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

  delete require.cache[routePath]

  try {
    const { GET } = require(routePath)
    const response = await GET(
      new Request('http://localhost/api/scheduled/daily-report', {
        headers: { authorization: 'Bearer test' },
      })
    )
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.success, true)
    assert.equal(body.sent, 0)
    assert.equal(body.failed, 1)
    assert.equal(recordedFailures.length, 1)
    assert.equal(recordedFailures[0].source, 'cron:daily-report')
    assert.equal(recordedFailures[0].operation, 'send_daily_report_email')
    assert.equal(recordedFailures[0].entityType, 'chef')
    assert.equal(recordedFailures[0].tenantId, 'chef-1')
    assert.equal(
      (recordedFailures[0].context as Record<string, unknown>).repairKind,
      'daily_report_email_redelivery'
    )
    assert.equal(
      typeof (recordedFailures[0].context as Record<string, unknown>).reportDate,
      'string'
    )
  } finally {
    if (previousEmailsEnabled === undefined) delete process.env.ENABLE_DAILY_REPORT_EMAILS
    else process.env.ENABLE_DAILY_REPORT_EMAILS = previousEmailsEnabled

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalCompute) require.cache[computePath] = originalCompute
    else delete require.cache[computePath]

    if (originalDelivery) require.cache[deliveryPath] = originalDelivery
    else delete require.cache[deliveryPath]

    if (originalCronAuth) require.cache[cronAuthPath] = originalCronAuth
    else delete require.cache[cronAuthPath]

    if (originalMonitor) require.cache[monitorPath] = originalMonitor
    else delete require.cache[monitorPath]

    if (originalSideEffect) require.cache[sideEffectPath] = originalSideEffect
    else delete require.cache[sideEffectPath]

    delete require.cache[routePath]
  }
})
