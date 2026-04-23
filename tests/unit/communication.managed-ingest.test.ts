import test from 'node:test'
import assert from 'node:assert/strict'

import { ingestManagedInboundCommunication } from '../../lib/communication/managed-ingest'

test('managed inbound ingest resolves tenant ownership and writes canonical plus compatibility records', async () => {
  const ingestCalls: Array<Record<string, unknown>> = []
  const compatCalls: Array<Record<string, unknown>> = []

  const result = await ingestManagedInboundCommunication(
    {
      channel: 'email',
      toAddress: 'chef-one@cheflowhq.com',
      senderIdentity: 'Client <client@example.com>',
      rawContent: 'Dinner inquiry',
      externalId: 'msg-1',
      externalThreadKey: 'thread-1',
      providerName: 'cloudflare_email_routing',
      legacyMessage: {
        subject: 'Dinner inquiry',
        body: 'Dinner inquiry',
      },
    },
    {
      resolveManagedInboundChannel: async () => ({
        tenantId: 'chef-1',
        channel: 'email',
        provider: 'chef_email_alias',
        managedAddress: 'chef-one@cheflowhq.com',
      }),
      ingestCommunicationEvent: async (input) => {
        ingestCalls.push(input as Record<string, unknown>)
        return {
          id: 'event-1',
          threadId: 'thread-123',
          resolvedClientId: 'client-9',
          linkedEntityType: 'inquiry',
          linkedEntityId: 'inq-4',
          timestamp: '2026-04-21T12:00:00.000Z',
          deduped: false,
        }
      },
      logCommunicationMessageCompat: async (input) => {
        compatCalls.push(input as Record<string, unknown>)
        return 'message-1'
      },
    }
  )

  assert.deepEqual(result, {
    routed: true,
    deduped: false,
    tenantId: 'chef-1',
    threadId: 'thread-123',
    managedChannel: {
      tenantId: 'chef-1',
      channel: 'email',
      provider: 'chef_email_alias',
      managedAddress: 'chef-one@cheflowhq.com',
    },
  })
  assert.equal(ingestCalls.length, 1)
  assert.equal(ingestCalls[0].tenantId, 'chef-1')
  assert.equal(ingestCalls[0].source, 'email')
  assert.equal(ingestCalls[0].managedChannelAddress, 'chef-one@cheflowhq.com')
  assert.equal(ingestCalls[0].recipientAddress, 'chef-one@cheflowhq.com')
  assert.equal(compatCalls.length, 1)
  assert.equal(compatCalls[0].threadId, 'thread-123')
  assert.equal(compatCalls[0].clientId, 'client-9')
  assert.equal(compatCalls[0].linkedEntityType, 'inquiry')
  assert.equal(compatCalls[0].linkedEntityId, 'inq-4')
  assert.equal(compatCalls[0].recipientAddress, 'chef-one@cheflowhq.com')
})

test('managed inbound ingest skips legacy compatibility writes for deduped events', async () => {
  let compatCalled = false

  const result = await ingestManagedInboundCommunication(
    {
      channel: 'sms',
      toAddress: '+15551112222',
      senderIdentity: '+15554443333',
      rawContent: 'Checking in',
      externalId: 'SM123',
      providerName: 'twilio',
      legacyMessage: {
        body: 'Checking in',
      },
    },
    {
      resolveManagedInboundChannel: async () => ({
        tenantId: 'chef-2',
        channel: 'sms',
        provider: 'twilio',
        managedAddress: '+15551112222',
        accountSid: 'AC123',
        authToken: 'secret',
      }),
      ingestCommunicationEvent: async () => ({
        id: 'event-2',
        threadId: 'thread-2',
        resolvedClientId: null,
        linkedEntityType: null,
        linkedEntityId: null,
        timestamp: '2026-04-21T12:05:00.000Z',
        deduped: true,
      }),
      logCommunicationMessageCompat: async () => {
        compatCalled = true
        return 'message-2'
      },
    }
  )

  assert.equal(result.routed, true)
  assert.equal(result.deduped, true)
  assert.equal(result.tenantId, 'chef-2')
  assert.equal(compatCalled, false)
})

test('managed inbound ingest fails closed when the destination channel is not owned by any tenant', async () => {
  const result = await ingestManagedInboundCommunication(
    {
      channel: 'sms',
      toAddress: '+15550000000',
      senderIdentity: '+15554443333',
      rawContent: 'Hello',
      providerName: 'twilio',
    },
    {
      resolveManagedInboundChannel: async () => null,
    }
  )

  assert.deepEqual(result, {
    routed: false,
    deduped: false,
    managedChannel: null,
    reason: 'unmanaged_channel',
  })
})
