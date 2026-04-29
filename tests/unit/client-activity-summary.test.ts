import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClientPortalActivitySummary } from '@/lib/activity/client-activity-summary'
import type { ActivityEvent, ActivityEventType } from '@/lib/activity/types'

function event(input: {
  id: string
  eventType: ActivityEventType
  createdAt: string
  actorType?: ActivityEvent['actor_type']
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}): ActivityEvent {
  return {
    id: input.id,
    tenant_id: 'tenant-1',
    actor_id: 'client-1',
    actor_type: input.actorType ?? 'client',
    client_id: 'client-1',
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    created_at: input.createdAt,
  }
}

test('buildClientPortalActivitySummary ranks real client payment intent and keeps entity links', () => {
  const summary = buildClientPortalActivitySummary(
    [
      event({
        id: 'older-quote',
        eventType: 'quote_viewed',
        createdAt: '2026-04-29T10:00:00.000Z',
        entityType: 'quote',
        entityId: 'quote-1',
        metadata: { quote_number: 'Q-42', total_quoted_cents: 125000 },
      }),
      event({
        id: 'latest-payment',
        eventType: 'payment_page_visited',
        createdAt: '2026-04-29T10:05:00.000Z',
        entityType: 'event',
        entityId: 'event-1',
        metadata: { occasion: 'Spring dinner', payment_amount_cents: 50000 },
      }),
    ],
    'client-1'
  )

  assert.equal(summary.intentLevel, 'urgent')
  assert.equal(summary.intentLabel, 'Payment attention')
  assert.equal(summary.lastActivity?.id, 'latest-payment')
  assert.equal(summary.lastActivity?.detail, 'Spring dinner | $500')
  assert.equal(summary.recentSignals.length, 2)
  assert.deepEqual(
    summary.nextActions.map((action) => action.label),
    ['Message client', 'Open related event', 'Open full presence']
  )
  assert.equal(summary.nextActions[1].href, '/events/event-1')
})

test('buildClientPortalActivitySummary filters heartbeats and non-client activity', () => {
  const summary = buildClientPortalActivitySummary(
    [
      event({
        id: 'heartbeat',
        eventType: 'session_heartbeat',
        createdAt: '2026-04-29T10:05:00.000Z',
      }),
      event({
        id: 'chef-entry',
        eventType: 'quote_viewed',
        actorType: 'chef',
        createdAt: '2026-04-29T10:04:00.000Z',
      }),
      event({
        id: 'client-entry',
        eventType: 'portal_login',
        createdAt: '2026-04-29T10:03:00.000Z',
      }),
    ],
    'client-1'
  )

  assert.equal(summary.intentLevel, 'passive')
  assert.equal(summary.lastActivity?.id, 'client-entry')
  assert.deepEqual(
    summary.recentSignals.map((signal) => signal.id),
    ['client-entry']
  )
})

test('buildClientPortalActivitySummary returns an honest empty state', () => {
  const summary = buildClientPortalActivitySummary([], 'client-1')

  assert.equal(summary.intentLevel, 'none')
  assert.equal(summary.lastActivity, null)
  assert.deepEqual(summary.recentSignals, [])
  assert.deepEqual(summary.nextActions, [
    {
      label: 'Open full presence',
      href: '/clients/presence',
      emphasis: 'primary',
    },
  ])
})
