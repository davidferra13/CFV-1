import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('redeliverDailyReportEmail resends a stored report and marks it sent', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const sendEmailPath = require.resolve('../../lib/email/send.ts')
  const templatePath = require.resolve('../../lib/email/templates/daily-report.tsx')
  const observabilityPath = require.resolve('../../lib/platform-observability/events.ts')
  const routePath = require.resolve('../../lib/reports/daily-report-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalSendEmail = require.cache[sendEmailPath]
  const originalTemplate = require.cache[templatePath]
  const originalObservability = require.cache[observabilityPath]

  const sentTo: string[] = []
  const updates: Array<Record<string, unknown>> = []
  const recordedEvents: string[] = []

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'daily_reports') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: {
                                content: {
                                  aiNarrative: null,
                                  generatedAt: '2026-04-21T12:00:00.000Z',
                                  provenance: {
                                    contractVersion: 'derived-output.v1',
                                    derivationMethod: 'deterministic',
                                    derivationSource: 'computeDailyReport',
                                    freshness: {
                                      ageSeconds: 0,
                                      asOf: '2026-04-21T23:59:59.000Z',
                                      status: 'fresh',
                                      windowSeconds: 86400,
                                    },
                                    generatedAt: '2026-04-21T12:00:00.000Z',
                                    inputs: [],
                                    model: null,
                                    moduleId: 'lib/reports/compute-daily-report.ts',
                                    runtime: {
                                      environment: 'test',
                                      app_url: null,
                                      build_surface: null,
                                      build_id: null,
                                      release: null,
                                    },
                                  },
                                  eventsToday: [],
                                  highIntentVisits: [],
                                  upcomingMilestones: [],
                                  scheduleConflicts: [],
                                  nextBestActions: [],
                                  dormantClients: [],
                                  expiringQuoteDetails: [],
                                  paymentsReceivedTodayCents: 0,
                                  monthRevenueToDateCents: 0,
                                  monthOverMonthChangePercent: 0,
                                  outstandingBalanceCents: 0,
                                  newInquiriesToday: 0,
                                  inquiryStats: { new: 0, awaiting_chef: 0 },
                                  staleFollowUps: 0,
                                  quotesExpiringSoon: 0,
                                  pipelineForecastCents: 0,
                                  avgResponseTimeHours: null,
                                  overdueResponses: 0,
                                  foodCostAvgPercent: null,
                                  foodCostTrending: 'stable',
                                  closureStreak: 0,
                                  longestStreak: 0,
                                  openClosureTasks: 0,
                                  clientLoginsYesterday: 0,
                                  upcomingEventsNext7d: 0,
                                },
                              },
                              error: null,
                            })
                          },
                        }
                      },
                    }
                  },
                }
              },
              update(payload: Record<string, unknown>) {
                updates.push(payload)
                return {
                  eq() {
                    return {
                      eq() {
                        return Promise.resolve({ error: null })
                      },
                    }
                  },
                }
              },
            }
          }

          if (table === 'chefs') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      single() {
                        return Promise.resolve({
                          data: { auth_user_id: 'user-1', business_name: 'Test Kitchen' },
                          error: null,
                        })
                      },
                    }
                  },
                }
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
        auth: {
          admin: {
            async getUserById() {
              return { data: { user: { email: 'chef@example.com' } } }
            },
          },
        },
      }),
    },
  } as NodeJS.Module

  require.cache[sendEmailPath] = {
    exports: {
      sendEmail: async (input: { to: string }) => {
        sentTo.push(input.to)
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

  require.cache[observabilityPath] = {
    exports: {
      recordPlatformEvent: async (input: { eventKey: string }) => {
        recordedEvents.push(input.eventKey)
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { redeliverDailyReportEmail } = require(routePath)
    const result = await redeliverDailyReportEmail({
      tenantId: 'chef-1',
      reportDate: '2026-04-21',
    })

    assert.equal(result.emailSent, true)
    assert.equal(result.message, 'Daily report for 2026-04-21 redelivered.')
    assert.deepEqual(sentTo, ['chef@example.com'])
    assert.deepEqual(recordedEvents, ['feature.daily_report_delivered'])
    assert.equal(updates.length, 1)
    assert.equal(typeof updates[0].email_sent_at, 'string')
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalSendEmail) require.cache[sendEmailPath] = originalSendEmail
    else delete require.cache[sendEmailPath]

    if (originalTemplate) require.cache[templatePath] = originalTemplate
    else delete require.cache[templatePath]

    if (originalObservability) require.cache[observabilityPath] = originalObservability
    else delete require.cache[observabilityPath]

    delete require.cache[routePath]
  }
})
