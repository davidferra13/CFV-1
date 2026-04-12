import test from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizePlatformObservabilityEvents,
  type PlatformObservabilityDigestSummary,
} from '@/lib/platform-observability/digest'
import type { PlatformObservabilityEventRecord } from '@/lib/platform-observability/events'

function makeEvent(
  partial: Partial<PlatformObservabilityEventRecord> &
    Pick<PlatformObservabilityEventRecord, 'id' | 'event_key'>
): PlatformObservabilityEventRecord {
  return {
    id: partial.id,
    event_key: partial.event_key,
    severity: partial.severity ?? 'info',
    source: partial.source ?? 'test',
    scope: partial.scope ?? 'public',
    summary: partial.summary ?? partial.event_key,
    details: partial.details ?? null,
    actor_type: partial.actor_type ?? 'anonymous',
    actor_id: partial.actor_id ?? null,
    auth_user_id: partial.auth_user_id ?? null,
    tenant_id: partial.tenant_id ?? null,
    subject_type: partial.subject_type ?? null,
    subject_id: partial.subject_id ?? null,
    metadata: partial.metadata ?? {},
    occurred_at: partial.occurred_at ?? '2026-04-09T12:00:00.000Z',
    realtime_alert_enabled: partial.realtime_alert_enabled ?? false,
    daily_digest_enabled: partial.daily_digest_enabled ?? true,
    alert_dedupe_key: partial.alert_dedupe_key ?? null,
    realtime_alert_sent_at: partial.realtime_alert_sent_at ?? null,
    realtime_alert_status: partial.realtime_alert_status ?? 'not_applicable',
    created_at: partial.created_at ?? '2026-04-09T12:00:00.000Z',
  }
}

test('summarizePlatformObservabilityEvents aggregates totals and notable changes', () => {
  const currentEvents: PlatformObservabilityEventRecord[] = [
    makeEvent({
      id: '1',
      event_key: 'account.chef_signed_up',
      severity: 'important',
      summary: 'Chef A signed up',
    }),
    makeEvent({
      id: '2',
      event_key: 'account.client_signed_up',
      severity: 'important',
      summary: 'Client A signed up',
      scope: 'private',
      actor_type: 'client',
      source: 'auth',
    }),
    makeEvent({
      id: '3',
      event_key: 'subscription.stay_updated_subscribed',
      severity: 'important',
      summary: 'Stay Updated signup',
    }),
    makeEvent({
      id: '4',
      event_key: 'conversion.public_inquiry_submitted',
      severity: 'important',
      summary: 'Inquiry submitted',
      source: 'public_booking',
    }),
    makeEvent({
      id: '5',
      event_key: 'input.contact_form_submitted',
      severity: 'important',
      summary: 'Contact form submitted',
      source: 'public_contact',
    }),
    makeEvent({
      id: '6',
      event_key: 'feature.payment_page_visited',
      severity: 'important',
      summary: 'Payment page visited',
      source: 'private_client_portal',
      scope: 'private',
      actor_type: 'client',
      realtime_alert_status: 'sent',
      realtime_alert_sent_at: '2026-04-09T12:10:00.000Z',
    }),
    makeEvent({
      id: '7',
      event_key: 'system.client_error_reported',
      severity: 'critical',
      summary: 'Client error spike',
      source: 'system_monitoring',
      scope: 'system',
      actor_type: 'system',
    }),
    makeEvent({
      id: '8',
      event_key: 'system.client_error_reported',
      severity: 'critical',
      summary: 'Another client error spike',
      source: 'system_monitoring',
      scope: 'system',
      actor_type: 'system',
    }),
    makeEvent({
      id: '9',
      event_key: 'system.client_error_reported',
      severity: 'critical',
      summary: 'Third client error spike',
      source: 'system_monitoring',
      scope: 'system',
      actor_type: 'system',
    }),
  ]

  const previousEvents: PlatformObservabilityEventRecord[] = [
    makeEvent({
      id: 'p1',
      event_key: 'subscription.stay_updated_subscribed',
      severity: 'important',
      summary: 'Previous stay updated signup',
    }),
  ]

  const digest: PlatformObservabilityDigestSummary = summarizePlatformObservabilityEvents(
    currentEvents,
    previousEvents,
    {
      generatedAt: '2026-04-09T12:30:00.000Z',
      windowStart: '2026-04-08T12:30:00.000Z',
      windowEnd: '2026-04-09T12:30:00.000Z',
    }
  )

  assert.equal(digest.totals.totalEvents, 9)
  assert.equal(digest.totals.newUsers, 2)
  assert.equal(digest.totals.stayUpdatedSubscriptions, 1)
  assert.equal(digest.totals.conversionEvents, 2)
  assert.equal(digest.totals.criticalEvents, 3)
  assert.equal(digest.totals.realtimeAlertsSent, 1)
  assert.ok(typeof digest.runtime.environment === 'string')
  assert.ok(Array.isArray(digest.eventKeyBreakdown))
  assert.ok(Array.isArray(digest.pathBreakdown))
  assert.equal(digest.featureUsage[0]?.label, 'Payment Page Visited')
  assert.ok(digest.sourceBreakdown.some((entry) => entry.label === 'system_monitoring'))
  assert.ok(digest.actorBreakdown.some((entry) => entry.label === 'system'))
  assert.ok(digest.notableChanges.some((entry) => entry.label === 'Critical system events'))
  assert.equal(digest.criticalItems.length, 3)
})
