import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateOperationalAwarenessAggregates } from '@/lib/operational-awareness/aggregates'
import {
  normalizeTelemetryEventInput,
  sanitizeTelemetryMetadata,
  type TelemetryEvent,
} from '@/lib/operational-awareness/types'

const TENANT_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const CLIENT_ID = '33333333-3333-4333-8333-333333333333'
const INQUIRY_ID = '44444444-4444-4444-8444-444444444444'
const BOOKING_ID = '55555555-5555-4555-8555-555555555555'

function event(partial: Partial<TelemetryEvent> & Pick<TelemetryEvent, 'id' | 'event_type' | 'timestamp'>): TelemetryEvent {
  return {
    tenant_id: TENANT_ID,
    actor_id: ACTOR_ID,
    actor_role: 'chef_owner',
    target_id: null,
    target_role: null,
    context_id: null,
    metadata: {},
    ...partial,
  }
}

describe('operational telemetry normalization', () => {
  it('normalizes the role-aware TelemetryEvent input', () => {
    const normalized = normalizeTelemetryEventInput({
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      actor_role: 'client_owner',
      target_id: ACTOR_ID,
      target_role: 'chef_owner',
      event_type: 'inquiry_received',
      context_id: INQUIRY_ID,
      timestamp: '2026-04-29T12:00:00.000Z',
      idempotency_key: 'Inquiry.Received:123',
      metadata: {
        channel: 'portal',
      },
    })

    assert.equal(normalized.tenant_id, TENANT_ID)
    assert.equal(normalized.actor_id, ACTOR_ID)
    assert.equal(normalized.actor_role, 'client_owner')
    assert.equal(normalized.target_id, ACTOR_ID)
    assert.equal(normalized.target_role, 'chef_owner')
    assert.equal(normalized.event_type, 'inquiry_received')
    assert.equal(normalized.context_id, INQUIRY_ID)
    assert.equal(normalized.timestamp, '2026-04-29T12:00:00.000Z')
    assert.equal(normalized.idempotency_key, 'inquiry.received:123')
    assert.deepEqual(normalized.metadata, { channel: 'portal' })
  })

  it('rejects unsupported actor roles and event types', () => {
    assert.throws(
      () =>
        normalizeTelemetryEventInput({
          tenant_id: TENANT_ID,
          actor_id: ACTOR_ID,
          actor_role: 'system' as never,
          event_type: 'inquiry_received',
        }),
      /actor_role is not supported/
    )

    assert.throws(
      () =>
        normalizeTelemetryEventInput({
          tenant_id: TENANT_ID,
          actor_id: ACTOR_ID,
          actor_role: 'chef_owner',
          event_type: 'unknown_event' as never,
        }),
      /event_type is not supported/
    )
  })

  it('rejects message-like metadata recursively', () => {
    assert.throws(
      () =>
        sanitizeTelemetryMetadata({
          outer: {
            transcript: 'private conversation',
          },
        }),
      /private message content/
    )
  })
})

describe('operational awareness aggregates', () => {
  it('computes response, booking, cancellation, wait, and inactive thread metrics', () => {
    const result = calculateOperationalAwarenessAggregates(
      [
        event({
          id: '66666666-6666-4666-8666-666666666661',
          actor_id: CLIENT_ID,
          actor_role: 'client_owner',
          event_type: 'inquiry_received',
          context_id: INQUIRY_ID,
          timestamp: '2026-04-29T10:00:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666662',
          event_type: 'inquiry_responded',
          context_id: INQUIRY_ID,
          timestamp: '2026-04-29T10:30:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666663',
          actor_id: CLIENT_ID,
          actor_role: 'client_owner',
          event_type: 'inquiry_received',
          context_id: '77777777-7777-4777-8777-777777777777',
          timestamp: '2026-04-28T09:00:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666664',
          event_type: 'booking_created',
          context_id: BOOKING_ID,
          timestamp: '2026-04-29T11:00:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666665',
          event_type: 'booking_confirmed',
          context_id: BOOKING_ID,
          timestamp: '2026-04-29T11:05:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666666',
          event_type: 'booking_created',
          context_id: '88888888-8888-4888-8888-888888888888',
          timestamp: '2026-04-29T12:00:00.000Z',
        }),
        event({
          id: '66666666-6666-4666-8666-666666666667',
          event_type: 'booking_cancelled',
          context_id: '88888888-8888-4888-8888-888888888888',
          timestamp: '2026-04-29T12:30:00.000Z',
        }),
      ],
      {
        now: '2026-04-29T12:00:00.000Z',
        inactiveThreadThresholdMs: 24 * 60 * 60 * 1000,
      }
    )

    const aggregate = result.tenant_aggregates[0]
    assert.equal(aggregate.tenant_id, TENANT_ID)
    assert.equal(aggregate.chef_owner_id, TENANT_ID)
    assert.equal(aggregate.avg_response_time_ms, 30 * 60 * 1000)
    assert.equal(aggregate.response_rate, 0.5)
    assert.equal(aggregate.booking_conversion_rate, 0.5)
    assert.equal(aggregate.cancellation_rate, 0.5)
    assert.equal(aggregate.client_wait_time_ms, 27 * 60 * 60 * 1000)
    assert.equal(aggregate.inactive_threads, 1)
    assert.deepEqual(aggregate.trace.pending_context_ids, ['77777777-7777-4777-8777-777777777777'])
    assert.deepEqual(aggregate.trace.inactive_context_ids, ['77777777-7777-4777-8777-777777777777'])
  })
})
