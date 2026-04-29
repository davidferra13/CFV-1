import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeOperationalTelemetryEvent,
  sanitizeOperationalTelemetryAttributes,
} from '@/lib/operational-awareness/types'

const TENANT_ID = '11111111-1111-4111-8111-111111111111'
const EVENT_ID = '22222222-2222-4222-8222-222222222222'

describe('operational telemetry normalization', () => {
  it('normalizes role-aware event input without private content', () => {
    const normalized = normalizeOperationalTelemetryEvent({
      tenantId: TENANT_ID,
      eventCategory: 'booking',
      eventName: 'Booking.Proposed',
      eventStatus: 'started',
      source: 'Booking.Flow',
      subject: {
        type: 'Event',
        id: EVENT_ID,
      },
      target: {
        role: 'chef_owner',
        entityId: TENANT_ID,
      },
      idempotencyKey: 'Booking.Proposed:123',
      attributes: {
        step: 'proposal_sent',
        count: 1,
      },
    })

    assert.equal(normalized.tenantId, TENANT_ID)
    assert.equal(normalized.eventCategory, 'booking')
    assert.equal(normalized.eventName, 'booking.proposed')
    assert.equal(normalized.source, 'booking.flow')
    assert.equal(normalized.subjectType, 'event')
    assert.equal(normalized.subjectId, EVENT_ID)
    assert.equal(normalized.targetRole, 'chef_owner')
    assert.deepEqual(normalized.attributes, { step: 'proposal_sent', count: 1 })
  })

  it('rejects message-like attributes recursively', () => {
    assert.throws(
      () =>
        sanitizeOperationalTelemetryAttributes({
          outer: {
            transcript: 'private conversation',
          },
        }),
      /private message content/
    )
  })

  it('requires subject type and id together', () => {
    assert.throws(
      () =>
        normalizeOperationalTelemetryEvent({
          tenantId: TENANT_ID,
          eventCategory: 'client_interaction',
          eventName: 'client.awaiting_response',
          source: 'client.portal',
          subject: {
            type: 'event',
            id: '',
          },
        }),
      /subject requires both type and id/
    )
  })
})
