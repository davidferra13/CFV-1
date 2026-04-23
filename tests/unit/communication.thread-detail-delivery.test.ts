import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) {
    require.cache[path] = original
  } else {
    delete require.cache[path]
  }
}

test('thread detail reads canonical delivery state from communication events', async () => {
  const actionsPath = require.resolve('../../lib/communication/actions.ts')
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const inquiriesPath = require.resolve('../../lib/inquiries/actions.ts')
  const notesPath = require.resolve('../../lib/notes/actions.ts')
  const takeAChefPath = require.resolve('../../lib/gmail/take-a-chef-parser.ts')
  const yhangryPath = require.resolve('../../lib/gmail/yhangry-parser.ts')
  const pipelinePath = require.resolve('../../lib/communication/pipeline.ts')
  const senderReputationPath = require.resolve('../../lib/gmail/sender-reputation.ts')

  const originalActions = require.cache[actionsPath]
  const originalAuth = require.cache[authPath]
  const originalDb = require.cache[dbPath]
  const originalInquiries = require.cache[inquiriesPath]
  const originalNotes = require.cache[notesPath]
  const originalTakeAChef = require.cache[takeAChefPath]
  const originalYhangry = require.cache[yhangryPath]
  const originalPipeline = require.cache[pipelinePath]
  const originalSenderReputation = require.cache[senderReputationPath]

  require.cache[authPath] = {
    exports: {
      requireChef: async () => ({
        tenantId: 'chef-1',
      }),
    },
  } as NodeJS.Module

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'conversation_threads') {
            return {
              select() {
                return this
              },
              eq() {
                return this
              },
              single() {
                return Promise.resolve({
                  data: {
                    id: 'thread-1',
                    state: 'active',
                    snoozed_until: null,
                    is_starred: false,
                    last_activity_at: '2026-04-21T12:05:00.000Z',
                    client_id: null,
                    latest_outbound_event_id: 'event-1',
                    latest_outbound_attempted_at: '2026-04-21T12:00:00.000Z',
                    latest_outbound_delivery_status: 'delivered',
                    latest_outbound_provider_status: 'delivered',
                    latest_outbound_status_updated_at: '2026-04-21T12:02:00.000Z',
                    latest_outbound_error_code: null,
                    latest_outbound_error_message: null,
                  },
                })
              },
            }
          }

          if (table === 'communication_events') {
            return {
              select() {
                return this
              },
              eq() {
                return this
              },
              order() {
                return Promise.resolve({
                  data: [
                    {
                      id: 'event-1',
                      timestamp: '2026-04-21T12:00:00.000Z',
                      direction: 'outbound',
                      source: 'sms',
                      sender_identity: '+15551112222',
                      raw_content: 'On my way.',
                      external_id: 'SM123',
                      external_thread_key: null,
                      provider_name: 'twilio',
                      managed_channel_address: '+15551112222',
                      recipient_address: '+15554443333',
                      provider_delivery_status: 'delivered',
                      provider_status: 'delivered',
                      provider_status_updated_at: '2026-04-21T12:02:00.000Z',
                      provider_delivered_at: '2026-04-21T12:02:00.000Z',
                      provider_read_at: null,
                      provider_failed_at: null,
                      provider_error_code: null,
                      provider_error_message: null,
                      linked_entity_type: null,
                      linked_entity_id: null,
                      status: 'linked',
                    },
                  ],
                })
              },
            }
          }

          if (table === 'suggested_links' || table === 'communication_action_log') {
            return {
              select() {
                return this
              },
              eq() {
                return this
              },
              in() {
                return this
              },
              order() {
                return Promise.resolve({ data: [] })
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[inquiriesPath] = {
    exports: {
      createInquiry: async () => {
        throw new Error('createInquiry should not be called in this test')
      },
    },
  } as NodeJS.Module

  require.cache[notesPath] = {
    exports: {
      addClientNote: async () => {
        throw new Error('addClientNote should not be called in this test')
      },
    },
  } as NodeJS.Module

  require.cache[takeAChefPath] = {
    exports: {
      isTakeAChefEmail: () => false,
      parseTakeAChefEmail: () => null,
    },
  } as NodeJS.Module

  require.cache[yhangryPath] = {
    exports: {
      isYhangryEmail: () => false,
      parseYhangryEmail: () => null,
    },
  } as NodeJS.Module

  require.cache[pipelinePath] = {
    exports: {
      ingestCommunicationEvent: async () => {
        throw new Error('ingestCommunicationEvent should not be called in this test')
      },
      logCommunicationAction: async () => undefined,
      seedDefaultCommunicationRules: async () => undefined,
    },
  } as NodeJS.Module

  require.cache[senderReputationPath] = {
    exports: {
      recordSenderAction: async () => undefined,
    },
  } as NodeJS.Module

  delete require.cache[actionsPath]

  try {
    const { getThreadWithEvents } = require(actionsPath)
    const detail = await getThreadWithEvents('thread-1')

    assert.equal(detail.thread.latest_outbound_event_id, 'event-1')
    assert.equal(detail.thread.latest_outbound_delivery_status, 'delivered')
    assert.equal(detail.events[0].provider_delivery_status, 'delivered')
    assert.equal(detail.events[0].provider_status, 'delivered')
    assert.equal(detail.events[0].provider_delivered_at, '2026-04-21T12:02:00.000Z')
  } finally {
    restoreModule(actionsPath, originalActions)
    restoreModule(authPath, originalAuth)
    restoreModule(dbPath, originalDb)
    restoreModule(inquiriesPath, originalInquiries)
    restoreModule(notesPath, originalNotes)
    restoreModule(takeAChefPath, originalTakeAChef)
    restoreModule(yhangryPath, originalYhangry)
    restoreModule(pipelinePath, originalPipeline)
    restoreModule(senderReputationPath, originalSenderReputation)
  }
})
