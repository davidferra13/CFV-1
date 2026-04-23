import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildManagedCommunicationControlPlaneSummary,
  extractChefFlowAlias,
  getManagedOutboundChannel,
  normalizeManagedEmailAddress,
  normalizeManagedPhoneAddress,
  resolveManagedInboundChannel,
  sendManagedTwilioMessage,
  type ManagedChannelRepository,
} from '../../lib/communication/managed-channels'

function createRepository(
  overrides: Partial<ManagedChannelRepository> = {}
): ManagedChannelRepository {
  return {
    findEmailAlias: async () => null,
    findGoogleMailbox: async () => null,
    findGoogleConnection: async () => null,
    findTwilioCredentialByPhone: async () => null,
    getPrimaryGoogleMailboxForTenant: async () => null,
    getGoogleConnectionForTenant: async () => null,
    getTwilioCredentialForTenant: async () => null,
    ...overrides,
  }
}

test('managed channel resolution attributes inbound email to tenant-owned alias or mailbox', async () => {
  const repo = createRepository({
    findEmailAlias: async (alias) =>
      alias === 'chef-one' ? { tenantId: 'chef-1', address: 'chef-one@cheflowhq.com' } : null,
    findGoogleMailbox: async (address) =>
      address === 'ops@example.com' ? { tenantId: 'chef-2', address: 'ops@example.com' } : null,
  })

  assert.equal(normalizeManagedEmailAddress(' Ops@Example.com '), 'ops@example.com')
  assert.equal(extractChefFlowAlias('Chef-One@cheflowhq.com'), 'chef-one')

  const aliasMatch = await resolveManagedInboundChannel(
    { channel: 'email', address: 'Chef-One@cheflowhq.com' },
    repo
  )
  assert.deepEqual(aliasMatch, {
    tenantId: 'chef-1',
    channel: 'email',
    provider: 'chef_email_alias',
    managedAddress: 'chef-one@cheflowhq.com',
  })

  const mailboxMatch = await resolveManagedInboundChannel(
    { channel: 'email', address: 'ops@example.com' },
    repo
  )
  assert.deepEqual(mailboxMatch, {
    tenantId: 'chef-2',
    channel: 'email',
    provider: 'google_mailbox',
    managedAddress: 'ops@example.com',
    mailboxId: null,
  })
})

test('managed channel resolution normalizes inbound Twilio numbers and resolves outbound channels by tenant', async () => {
  const repo = createRepository({
    findTwilioCredentialByPhone: async (phone) =>
      phone === '+15552223333'
        ? {
            tenantId: 'chef-3',
            phoneNumber: '+15552223333',
            accountSid: 'AC123',
            authToken: 'auth-token',
          }
        : null,
    getPrimaryGoogleMailboxForTenant: async (tenantId) =>
      tenantId === 'chef-3'
        ? { tenantId, address: 'primary@example.com', mailboxId: 'mailbox-3' }
        : null,
    getTwilioCredentialForTenant: async (tenantId) =>
      tenantId === 'chef-3'
        ? {
            tenantId,
            phoneNumber: '+15552223333',
            accountSid: 'AC123',
            authToken: 'auth-token',
          }
        : null,
  })

  assert.equal(normalizeManagedPhoneAddress('(555) 222-3333'), '+15552223333')

  const inboundMatch = await resolveManagedInboundChannel(
    { channel: 'sms', address: '(555) 222-3333' },
    repo
  )
  assert.deepEqual(inboundMatch, {
    tenantId: 'chef-3',
    channel: 'sms',
    provider: 'twilio',
    managedAddress: '+15552223333',
    accountSid: 'AC123',
    authToken: 'auth-token',
  })

  const outboundEmail = await getManagedOutboundChannel(
    { tenantId: 'chef-3', channel: 'email' },
    repo
  )
  assert.deepEqual(outboundEmail, {
    tenantId: 'chef-3',
    channel: 'email',
    provider: 'google_mailbox',
    managedAddress: 'primary@example.com',
    mailboxId: 'mailbox-3',
  })

  const outboundSms = await getManagedOutboundChannel({ tenantId: 'chef-3', channel: 'sms' }, repo)
  assert.deepEqual(outboundSms, {
    tenantId: 'chef-3',
    channel: 'sms',
    provider: 'twilio',
    managedAddress: '+15552223333',
    accountSid: 'AC123',
    authToken: 'auth-token',
  })
})

test('sendManagedTwilioMessage uses tenant-scoped credentials and returns provider metadata', async () => {
  const repo = createRepository({
    getTwilioCredentialForTenant: async (tenantId) =>
      tenantId === 'chef-7'
        ? {
            tenantId,
            phoneNumber: '+15551112222',
            accountSid: 'AC777',
            authToken: 'secret-token',
          }
        : null,
  })

  const calls: Array<{ url: string; init?: RequestInit }> = []
  const result = await sendManagedTwilioMessage({
    tenantId: 'chef-7',
    channel: 'whatsapp',
    to: '(555) 444-9999',
    body: 'Dinner starts at 7.',
    repository: repo,
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ sid: 'SM777', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.provider, 'twilio')
  assert.equal(result.providerMessageId, 'SM777')
  assert.equal(result.managedAddress, '+15551112222')
  assert.equal(result.providerStatus, 'queued')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.twilio.com/2010-04-01/Accounts/AC777/Messages.json')
  assert.match(
    String(
      calls[0].init?.headers && (calls[0].init?.headers as Record<string, string>).Authorization
    ),
    /^Basic /
  )
  assert.equal(
    String(calls[0].init?.body),
    'To=whatsapp%3A%2B15554449999&From=whatsapp%3A%2B15551112222&Body=Dinner+starts+at+7.&StatusCallback=https%3A%2F%2Fapp.cheflowhq.com%2Fapi%2Fwebhooks%2Ftwilio'
  )
})

test('sendManagedTwilioMessage fails closed when tenant has no managed Twilio channel', async () => {
  const result = await sendManagedTwilioMessage({
    tenantId: 'chef-missing',
    channel: 'sms',
    to: '+15554449999',
    body: 'Hello',
    repository: createRepository(),
  })

  assert.equal(result.success, false)
  assert.equal(result.provider, 'twilio')
  assert.match(result.error || '', /No active managed Twilio channel/i)
})

test('managed communication control-plane summary prefers active mailboxes before legacy connection fallback', () => {
  const summary = buildManagedCommunicationControlPlaneSummary({
    inboundEmailAlias: {
      alias: 'cf-1234abcd',
      address: 'cf-1234abcd@cheflowhq.com',
    },
    mailboxes: [
      {
        id: 'mailbox-1',
        address: 'ops@example.com',
        isPrimary: true,
        isActive: true,
        gmailConnected: true,
        lastSyncAt: '2026-04-21T13:00:00.000Z',
        syncErrors: 0,
        historicalScanEnabled: true,
        historicalScanStatus: 'completed',
      },
    ],
    legacyConnection: {
      address: 'legacy@example.com',
      gmailConnected: true,
      lastSyncAt: '2026-04-20T13:00:00.000Z',
      syncErrors: 2,
    },
    twilio: {
      connected: true,
      phoneNumber: '+15551112222',
      accountSid: 'AC123',
    },
  })

  assert.deepEqual(summary.email.outboundOwner, {
    address: 'ops@example.com',
    provider: 'google_mailbox',
    mailboxId: 'mailbox-1',
  })
  assert.equal(summary.inboundEmailAlias.address, 'cf-1234abcd@cheflowhq.com')
  assert.equal(summary.twilio.inboundWebhookUrl, 'https://app.cheflowhq.com/api/webhooks/twilio')
  assert.equal(summary.twilio.statusCallbackUrl, 'https://app.cheflowhq.com/api/webhooks/twilio')
})
