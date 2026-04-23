import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

test('twilio webhook records outbound provider lifecycle updates against the canonical event', async () => {
  const routePath = require.resolve('../../app/api/webhooks/twilio/route.ts')
  const managedChannelsPath = require.resolve('../../lib/communication/managed-channels.ts')
  const signaturePath = require.resolve('../../lib/communication/twilio-webhook.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const pipelinePath = require.resolve('../../lib/communication/pipeline.ts')
  const reconciliationPath = require.resolve('../../lib/communication/delivery-reconciliation.ts')

  const originalRoute = require.cache[routePath]
  const originalManagedChannels = require.cache[managedChannelsPath]
  const originalSignature = require.cache[signaturePath]
  const originalDb = require.cache[dbPath]
  const originalPipeline = require.cache[pipelinePath]
  const originalReconciliation = require.cache[reconciliationPath]

  const actionLogCalls: Array<Record<string, unknown>> = []
  const reconciliationCalls: Array<Record<string, unknown>> = []

  require.cache[managedChannelsPath] = {
    exports: {
      normalizeManagedPhoneAddress: (phone: string) => phone,
      resolveManagedInboundChannel: async () => ({
        tenantId: 'chef-1',
        channel: 'sms',
        provider: 'twilio',
        managedAddress: '+15551112222',
        accountSid: 'AC123',
        authToken: 'twilio-auth-token',
      }),
    },
  } as NodeJS.Module

  require.cache[signaturePath] = {
    exports: {
      validateTwilioSignature: () => true,
    },
  } as NodeJS.Module

  require.cache[dbPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'communication_events') {
            return {
              select() {
                return this
              },
              eq() {
                return this
              },
              maybeSingle() {
                return Promise.resolve({
                  data: {
                    id: 'event-1',
                    thread_id: 'thread-1',
                    timestamp: '2026-04-21T12:00:00.000Z',
                  },
                })
              },
            }
          }

          throw new Error(`Unexpected table: ${table}`)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[pipelinePath] = {
    exports: {
      logCommunicationAction: async (input: Record<string, unknown>) => {
        actionLogCalls.push(input)
      },
    },
  } as NodeJS.Module

  require.cache[reconciliationPath] = {
    exports: {
      reconcileCommunicationDeliveryState: async (input: Record<string, unknown>) => {
        reconciliationCalls.push(input)
        return {
          communicationEventId: 'event-1',
          threadId: 'thread-1',
          previousDeliveryStatus: 'pending',
          previousProviderStatus: 'queued',
          nextDeliveryStatus: 'delivered',
          nextProviderStatus: 'delivered',
          threadProjected: true,
        }
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/webhooks/twilio', {
        method: 'POST',
        body: new URLSearchParams({
          MessageSid: 'SM123',
          MessageStatus: 'delivered',
          From: '+15551112222',
          To: '+15554443333',
        }).toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': 'sig',
        },
      })
    )

    assert.equal(response.status, 200)
    assert.equal(reconciliationCalls.length, 1)
    assert.deepEqual(reconciliationCalls[0], {
      tenantId: 'chef-1',
      threadId: 'thread-1',
      communicationEventId: 'event-1',
      kind: 'provider_update',
      providerName: 'twilio',
      rawProviderStatus: 'delivered',
      occurredAt: reconciliationCalls[0].occurredAt,
      attemptedAt: '2026-04-21T12:00:00.000Z',
      errorCode: null,
      errorMessage: null,
    })
    assert.equal(actionLogCalls.length, 1)
    assert.deepEqual(actionLogCalls[0], {
      tenantId: 'chef-1',
      communicationEventId: 'event-1',
      threadId: 'thread-1',
      action: 'provider_message_status_updated',
      source: 'webhook',
      previousState: {
        provider: 'twilio',
        provider_status: 'queued',
        delivery_status: 'pending',
      },
      newState: {
        provider: 'twilio',
        provider_status: 'delivered',
        delivery_status: 'delivered',
        raw_provider_status: 'delivered',
        external_id: 'SM123',
        managed_channel_address: '+15551112222',
        recipient_address: '+15554443333',
        error_code: null,
        error_message: null,
      },
    })
  } finally {
    restoreModule(routePath, originalRoute)
    restoreModule(managedChannelsPath, originalManagedChannels)
    restoreModule(signaturePath, originalSignature)
    restoreModule(dbPath, originalDb)
    restoreModule(pipelinePath, originalPipeline)
    restoreModule(reconciliationPath, originalReconciliation)
  }
})
