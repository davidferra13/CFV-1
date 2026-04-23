import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('redeliverFollowUpDueEmail resends an overdue follow-up alert when the inquiry is still open', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const notificationsActionsPath = require.resolve('../../lib/notifications/actions.ts')
  const notificationsPath = require.resolve('../../lib/email/notifications.ts')
  const routePath = require.resolve('../../lib/inquiries/follow-up-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalNotificationsActions = require.cache[notificationsActionsPath]
  const originalNotifications = require.cache[notificationsPath]

  const sentPayloads: Array<Record<string, unknown>> = []

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table !== 'inquiries') throw new Error(`Unexpected table: ${table}`)
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        single() {
                          return Promise.resolve({
                            data: { status: 'awaiting_client' },
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

  require.cache[notificationsActionsPath] = {
    exports: {
      getChefProfile: async () => ({ email: 'chef@example.com', name: 'Test Kitchen' }),
    },
  } as NodeJS.Module

  require.cache[notificationsPath] = {
    exports: {
      sendFollowUpDueChefEmail: async (input: Record<string, unknown>) => {
        sentPayloads.push(input)
        return true
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { redeliverFollowUpDueEmail } = require(routePath)
    const result = await redeliverFollowUpDueEmail({
      tenantId: 'chef-1',
      inquiryId: 'inquiry-1',
      clientName: 'Maya Chen',
      occasion: 'Anniversary dinner',
      followUpNote: 'Reach out before they cool off.',
      followUpDueAt: '2026-04-20T10:00:00.000Z',
    })

    assert.equal(result.emailSent, true)
    assert.equal(result.message, 'Follow-up alert redelivered.')
    assert.equal(sentPayloads.length, 1)
    assert.equal(sentPayloads[0].chefEmail, 'chef@example.com')
    assert.equal(sentPayloads[0].clientName, 'Maya Chen')
    assert.equal(typeof sentPayloads[0].daysOverdue, 'number')
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalNotificationsActions)
      require.cache[notificationsActionsPath] = originalNotificationsActions
    else delete require.cache[notificationsActionsPath]

    if (originalNotifications) require.cache[notificationsPath] = originalNotifications
    else delete require.cache[notificationsPath]

    delete require.cache[routePath]
  }
})

test('redeliverFollowUpDueEmail blocks replay after the inquiry leaves awaiting_client', async () => {
  const dbPath = require.resolve('../../lib/db/server.ts')
  const notificationsActionsPath = require.resolve('../../lib/notifications/actions.ts')
  const notificationsPath = require.resolve('../../lib/email/notifications.ts')
  const routePath = require.resolve('../../lib/inquiries/follow-up-delivery.ts')

  const originalDb = require.cache[dbPath]
  const originalNotificationsActions = require.cache[notificationsActionsPath]
  const originalNotifications = require.cache[notificationsPath]

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        single() {
                          return Promise.resolve({
                            data: { status: 'converted' },
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

  require.cache[notificationsActionsPath] = {
    exports: {
      getChefProfile: async () => ({ email: 'chef@example.com', name: 'Test Kitchen' }),
    },
  } as NodeJS.Module

  require.cache[notificationsPath] = {
    exports: {
      sendFollowUpDueChefEmail: async () => true,
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { redeliverFollowUpDueEmail } = require(routePath)
    await assert.rejects(
      () =>
        redeliverFollowUpDueEmail({
          tenantId: 'chef-1',
          inquiryId: 'inquiry-1',
          clientName: 'Maya Chen',
          occasion: 'Anniversary dinner',
          followUpNote: null,
          followUpDueAt: '2026-04-20T10:00:00.000Z',
        }),
      /Automatic follow-up redelivery is blocked/
    )
  } finally {
    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalNotificationsActions)
      require.cache[notificationsActionsPath] = originalNotificationsActions
    else delete require.cache[notificationsActionsPath]

    if (originalNotifications) require.cache[notificationsPath] = originalNotifications
    else delete require.cache[notificationsPath]

    delete require.cache[routePath]
  }
})
