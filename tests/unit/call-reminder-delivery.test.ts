import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('sendCallReminderEmailDelivery throws when the provider does not confirm delivery', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const sendEmailPath = require.resolve('../../lib/email/send.ts')
  const routePath = require.resolve('../../lib/calls/call-reminder-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalSendEmail = require.cache[sendEmailPath]

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'user_roles') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          single() {
                            return Promise.resolve({
                              data: { auth_user_id: 'user-1' },
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
          }

          if (table === 'chefs') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      single() {
                        return Promise.resolve({
                          data: { display_name: 'Chef Remy', business_name: 'ChefFlow Test' },
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
      sendEmail: async () => false,
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { sendCallReminderEmailDelivery } = require(routePath)
    await assert.rejects(
      () =>
        sendCallReminderEmailDelivery({
          tenantId: 'chef-1',
          callType: 'discovery',
          title: 'Discovery call',
          scheduledAt: '2099-04-21T16:00:00.000Z',
          durationMinutes: 30,
          reminderType: '24h',
          contactLabel: 'Maya Chen',
        }),
      /Call reminder email provider did not confirm delivery/
    )
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalSendEmail) require.cache[sendEmailPath] = originalSendEmail
    else delete require.cache[sendEmailPath]

    delete require.cache[routePath]
  }
})

test('redeliverCallReminderEmail resends a 24-hour reminder and marks it sent', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const sendEmailPath = require.resolve('../../lib/email/send.ts')
  const routePath = require.resolve('../../lib/calls/call-reminder-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalSendEmail = require.cache[sendEmailPath]

  const updates: Array<Record<string, unknown>> = []
  let sendCount = 0

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'scheduled_calls') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          single() {
                            return Promise.resolve({
                              data: {
                                id: 'call-1',
                                tenant_id: 'chef-1',
                                call_type: 'discovery',
                                title: 'Discovery call',
                                scheduled_at: '2099-04-21T16:00:00.000Z',
                                duration_minutes: 45,
                                status: 'scheduled',
                                contact_name: 'Maya Chen',
                                contact_company: null,
                                reminder_24h_sent_at: null,
                                reminder_1h_sent_at: null,
                                client: { full_name: 'Maya Chen' },
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

          if (table === 'user_roles') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          single() {
                            return Promise.resolve({
                              data: { auth_user_id: 'user-1' },
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
          }

          if (table === 'chefs') {
            return {
              select() {
                return {
                  eq() {
                    return {
                      single() {
                        return Promise.resolve({
                          data: { display_name: 'Chef Remy', business_name: 'ChefFlow Test' },
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
        sendCount++
        assert.equal(input.to, 'chef@example.com')
        return true
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { redeliverCallReminderEmail } = require(routePath)
    const result = await redeliverCallReminderEmail({
      tenantId: 'chef-1',
      callId: 'call-1',
      reminderType: '24h',
    })

    assert.equal(result.emailSent, true)
    assert.equal(result.message, '24-hour call reminder redelivered.')
    assert.equal(sendCount, 1)
    assert.equal(updates.length, 1)
    assert.equal(typeof updates[0].reminder_24h_sent_at, 'string')
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalSendEmail) require.cache[sendEmailPath] = originalSendEmail
    else delete require.cache[sendEmailPath]

    delete require.cache[routePath]
  }
})

test('redeliverCallReminderEmail blocks replay when the reminder is already marked sent', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const sendEmailPath = require.resolve('../../lib/email/send.ts')
  const routePath = require.resolve('../../lib/calls/call-reminder-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalSendEmail = require.cache[sendEmailPath]

  let sendCount = 0

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table !== 'scheduled_calls') {
            throw new Error(`Unexpected table: ${table}`)
          }

          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        single() {
                          return Promise.resolve({
                            data: {
                              id: 'call-1',
                              tenant_id: 'chef-1',
                              call_type: 'discovery',
                              title: 'Discovery call',
                              scheduled_at: '2099-04-21T16:00:00.000Z',
                              duration_minutes: 45,
                              status: 'scheduled',
                              contact_name: 'Maya Chen',
                              contact_company: null,
                              reminder_24h_sent_at: null,
                              reminder_1h_sent_at: '2099-04-21T15:00:00.000Z',
                              client: { full_name: 'Maya Chen' },
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
          }
        },
      }),
    },
  } as NodeJS.Module

  require.cache[sendEmailPath] = {
    exports: {
      sendEmail: async () => {
        sendCount++
        return true
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { redeliverCallReminderEmail } = require(routePath)
    await assert.rejects(
      () =>
        redeliverCallReminderEmail({
          tenantId: 'chef-1',
          callId: 'call-1',
          reminderType: '1h',
        }),
      /already marked sent/
    )
    assert.equal(sendCount, 0)
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalSendEmail) require.cache[sendEmailPath] = originalSendEmail
    else delete require.cache[sendEmailPath]

    delete require.cache[routePath]
  }
})
