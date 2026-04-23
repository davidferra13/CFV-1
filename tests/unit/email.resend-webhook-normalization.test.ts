import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapNormalizedEventToCampaignRecipientField,
  normalizeResendWebhookEvent,
} from '../../lib/email/provider'

test('normalizeResendWebhookEvent maps open events into the shared event model', () => {
  const event = normalizeResendWebhookEvent({
    type: 'email.opened',
    data: {
      email_id: 're_open_123',
      created_at: '2026-04-20T12:00:00.000Z',
      to: ['client@example.com'],
    },
  })

  assert.ok(event)
  assert.equal(event.kind, 'opened')
  assert.equal(event.providerEventType, 'email.opened')
  assert.equal(event.message.providerMessageId, 're_open_123')
  assert.equal(event.message.legacyResendMessageId, 're_open_123')
  assert.deepEqual(event.recipients, ['client@example.com'])
  assert.equal(event.suppression, 'none')
  assert.equal(mapNormalizedEventToCampaignRecipientField(event), 'opened_at')
})

test('normalizeResendWebhookEvent maps bounce events to suppression and compatibility fields', () => {
  const event = normalizeResendWebhookEvent({
    type: 'email.bounced',
    data: {
      email_id: 're_bounce_123',
      created_at: '2026-04-20T12:05:00.000Z',
      to: ['bounce@example.com'],
    },
  })

  assert.ok(event)
  assert.equal(event.kind, 'bounced')
  assert.equal(event.suppression, 'hard_bounce')
  assert.equal(mapNormalizedEventToCampaignRecipientField(event), 'bounced_at')
})

test('normalizeResendWebhookEvent skips unsupported or incomplete payloads', () => {
  assert.equal(
    normalizeResendWebhookEvent({
      type: 'email.delivered',
      data: { email_id: 're_delivered_123' },
    }),
    null
  )

  assert.equal(
    normalizeResendWebhookEvent({
      type: 'email.opened',
      data: {},
    }),
    null
  )
})
