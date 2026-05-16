import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  evidencePriority,
  mapCILSignalToOperatingLoopItem,
  mapNotificationToOperatingLoopItem,
  mapProfileCompletenessToOperatingLoopItem,
  mapReminderToOperatingLoopItem,
  mapTaskToOperatingLoopItem,
} from '@/lib/operating-loop/adapters'

const NOW = new Date('2026-05-15T17:30:00.000Z')

describe('operating loop adapters', () => {
  it('maps user-entered tasks into active next-action work', () => {
    const item = mapTaskToOperatingLoopItem(
      {
        id: 'task-1',
        title: 'Confirm menu quantities',
        description: 'Lock quantities before grocery ordering.',
        status: 'pending',
        priority: 'high',
        createdAt: '2026-05-15T10:00:00.000Z',
        dueAt: '2026-05-16T12:00:00.000Z',
        route: '/tasks/task-1',
      },
      { now: NOW }
    )

    assert.equal(item.sourceKind, 'task')
    assert.equal(item.loopState, 'active')
    assert.equal(item.evidenceLabel, 'user_entered')
    assert.equal(item.confidence, 0.85)
    assert.equal(item.nextAction, 'Confirm menu quantities')
    assert.equal(item.resumeContext?.sourceRoute, '/tasks/task-1')
  })

  it('maps overdue tasks into stale work without changing the source', () => {
    const item = mapTaskToOperatingLoopItem(
      {
        id: 'task-2',
        title: 'Send quote follow-up',
        status: 'pending',
        createdAt: '2026-05-10T10:00:00.000Z',
        dueAt: '2026-05-14T09:00:00.000Z',
      },
      { now: NOW }
    )

    assert.equal(item.loopState, 'stale')
    assert.equal(item.evidenceLabel, 'stale')
    assert.equal(item.nextAction, 'Send quote follow-up')
  })

  it('maps snoozed reminders into waiting-on-time work', () => {
    const item = mapReminderToOperatingLoopItem(
      {
        id: 'reminder-1',
        title: 'Follow up on anniversary dinner',
        status: 'snoozed',
        createdAt: '2026-05-14T10:00:00.000Z',
        dueAt: '2026-05-15T18:00:00.000Z',
        snoozedUntil: '2026-05-18T09:00:00.000Z',
        actionUrl: '/reminders/reminder-1',
      },
      { now: NOW }
    )

    assert.equal(item.sourceKind, 'reminder')
    assert.equal(item.loopState, 'snoozed')
    assert.equal(item.evidenceLabel, 'user_entered')
    assert.equal(item.waitingOn?.kind, 'time')
    assert.equal(item.waitingOn?.followUpAt, '2026-05-18T09:00:00.000Z')
  })

  it('maps reply-oriented notifications into confirmed waiting work', () => {
    const item = mapNotificationToOperatingLoopItem(
      {
        id: 'notification-1',
        title: 'New inquiry from Maya Chen',
        description: 'Client submitted a new inquiry.',
        action: 'new_inquiry',
        priority: 'urgent',
        createdAt: '2026-05-15T12:00:00.000Z',
        dueAt: '2026-05-16T12:00:00.000Z',
        actionUrl: '/inquiries/inquiry-1',
      },
      { now: NOW }
    )

    assert.equal(item.sourceKind, 'notification')
    assert.equal(item.loopState, 'waiting')
    assert.equal(item.evidenceLabel, 'confirmed')
    assert.equal(item.confidence, 1)
    assert.equal(item.waitingOn?.kind, 'reply')
    assert.equal(item.nextAction, 'new_inquiry')
  })

  it('maps CIL signals with confidence and uncertainty labels', () => {
    const item = mapCILSignalToOperatingLoopItem({
      id: 'signal-1',
      title: 'Quote may go stale',
      detail: 'Client has not replied after quote delivery.',
      suggestedAction: 'Follow up on quote',
      actionType: 'confirm',
      confidence: 0.62,
      createdAt: 1778842800000,
      actionPayload: { href: '/clients/client-1/relationship' },
    })

    assert.equal(item.sourceKind, 'cil_signal')
    assert.equal(item.loopState, 'uncertain')
    assert.equal(item.evidenceLabel, 'inferred')
    assert.equal(item.confidence, 0.62)
    assert.equal(item.waitingOn?.kind, 'system')
    assert.equal(item.nextAction, 'Follow up on quote')
    assert.equal(item.proofHref, '/clients/client-1/relationship')
  })

  it('maps client profile completeness gaps into blocked external-memory work', () => {
    const item = mapProfileCompletenessToOperatingLoopItem({
      clientId: 'client-1',
      clientName: 'Maya Chen',
      href: '/clients/client-1',
      score: 48,
      missing: ['allergies confirmed', 'contact info'],
      tier: 'basic',
      updatedAt: '2026-05-12T12:00:00.000Z',
    })

    assert.equal(item.sourceKind, 'client_profile')
    assert.equal(item.loopState, 'blocked')
    assert.equal(item.evidenceLabel, 'computed')
    assert.equal(item.confidence, 0.48)
    assert.equal(item.waitingOn?.kind, 'person')
    assert.equal(item.nextAction, 'Fill in allergies confirmed')
  })

  it('orders evidence strength for downstream dedupe lanes', () => {
    assert.ok(evidencePriority('confirmed') > evidencePriority('computed'))
    assert.ok(evidencePriority('user_entered') > evidencePriority('computed'))
    assert.ok(evidencePriority('computed') > evidencePriority('inferred'))
    assert.ok(evidencePriority('claimed') > evidencePriority('inferred'))
    assert.ok(evidencePriority('inferred') > evidencePriority('unknown'))
    assert.ok(evidencePriority('disputed') > evidencePriority('unknown'))
    assert.ok(evidencePriority('stale') > evidencePriority('unknown'))
  })
})
