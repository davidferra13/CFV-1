import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInterruptionAuditMetadata,
  evaluateNotificationInterruption,
  readInterruptionAuditMetadata,
} from '@/lib/notifications/interruption-policy'

test('low-confidence scraped leads stay badge-only', () => {
  const decision = evaluateNotificationInterruption({
    action: 'new_inquiry',
    inquiryId: 'inquiry-1',
    metadata: { source: 'scraped', lead_confidence: 0.42 },
  })

  assert.equal(decision.level, 'badge')
  assert.equal(decision.pattern.length, 0)
  assert.equal(decision.shouldDigest, true)
})

test('event-day focus mutes generic leads but preserves active event alerts', () => {
  const focus = {
    active: true,
    eventIds: ['event-1'],
    eventCount: 1,
    reason: 'Event-day focus active for 1 event today',
  }

  const lead = evaluateNotificationInterruption({
    action: 'new_inquiry',
    inquiryId: 'inquiry-1',
    eventDayFocus: focus,
  })
  const allergy = evaluateNotificationInterruption({
    action: 'client_allergy_changed',
    eventId: 'event-1',
    eventDayFocus: focus,
  })

  assert.equal(lead.level, 'badge')
  assert.equal(lead.reason, focus.reason)
  assert.equal(allergy.level, 'urgent')
  assert.equal(allergy.bypassQuietHours, true)
})

test('haptic audit metadata round-trips safely', () => {
  const input = {
    action: 'payment_failed' as const,
    eventId: 'event-1',
  }
  const decision = evaluateNotificationInterruption(input)
  const audit = buildInterruptionAuditMetadata(input, decision, new Date('2026-04-30T12:00:00Z'))
  const parsed = readInterruptionAuditMetadata({ haptic_audit: audit })

  assert.equal(parsed?.level, 'urgent')
  assert.equal(parsed?.reason, 'Payment or booking risk')
  assert.equal(parsed?.evaluatedAt, '2026-04-30T12:00:00.000Z')
})
