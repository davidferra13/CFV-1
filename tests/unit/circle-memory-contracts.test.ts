import test from 'node:test'
import assert from 'node:assert/strict'

import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  buildCircleTasteMemorySummary,
  circleMemoryEventsFromPreferenceSignals,
  decorateCandidatesWithCircleMemory,
  type CircleMemoryEvent,
} from '@/lib/hub/circle-memory-contracts'
import { evaluateDinnerRotation } from '@/lib/dinner-circles/memory-rotation'

test('circle taste memory summarizes shared labels and redacts private member events', () => {
  const events: CircleMemoryEvent[] = [
    {
      id: 'a-like',
      circleId: 'circle-1',
      memberId: 'a',
      targetType: 'restaurant',
      targetId: 'thai-1',
      label: 'Thai Place',
      kind: 'liked',
      occurredAt: '2026-05-01T00:00:00.000Z',
      visibility: 'circle_shared',
    },
    {
      id: 'b-like',
      circleId: 'circle-1',
      memberId: 'b',
      targetType: 'restaurant',
      targetId: 'thai-1',
      label: 'Thai Place',
      kind: 'liked',
      occurredAt: '2026-05-02T00:00:00.000Z',
      visibility: 'aggregate_allowed',
    },
    {
      id: 'pick',
      circleId: 'circle-1',
      memberId: 'a',
      targetType: 'restaurant',
      targetId: 'thai-1',
      label: 'Thai Place',
      kind: 'final_pick',
      occurredAt: '2026-05-10T00:00:00.000Z',
      visibility: 'circle_shared',
    },
    {
      id: 'private',
      circleId: 'circle-1',
      memberId: 'b',
      targetType: 'restaurant',
      targetId: 'secret-1',
      label: 'Private Search',
      kind: 'liked',
      occurredAt: '2026-05-10T00:00:00.000Z',
      visibility: 'private',
    },
  ]

  const summary = buildCircleTasteMemorySummary({
    circleId: 'circle-1',
    memberIds: ['a', 'b'],
    events,
    now: '2026-05-13T00:00:00.000Z',
  })

  assert.equal(summary.visibleEventCount, 3)
  assert.equal(summary.redactedPrivateEventCount, 1)
  assert.deepEqual(summary.labelsByTargetId['thai-1'], ['you_both_liked_this', 'had_this_recently'])
  assert.equal(summary.labelsByTargetId['secret-1'], undefined)
})

test('memory decoration penalizes recent repeats and suppresses never-again rotation items', () => {
  const events: CircleMemoryEvent[] = [
    {
      id: 'recent',
      circleId: 'circle-1',
      memberId: 'a',
      targetType: 'restaurant',
      targetId: 'pizza-1',
      label: 'Pizza',
      kind: 'final_pick',
      occurredAt: '2026-05-12T00:00:00.000Z',
      visibility: 'circle_shared',
    },
    {
      id: 'never',
      circleId: 'circle-1',
      memberId: 'b',
      targetType: 'restaurant',
      targetId: 'sushi-1',
      label: 'Sushi',
      kind: 'never_again',
      occurredAt: '2026-05-01T00:00:00.000Z',
      visibility: 'circle_shared',
    },
  ]
  const summary = buildCircleTasteMemorySummary({
    circleId: 'circle-1',
    memberIds: ['a', 'b'],
    events,
    now: '2026-05-13T00:00:00.000Z',
  })

  const decorated = decorateCandidatesWithCircleMemory({
    summary,
    candidates: [
      { id: 'pizza-1', label: 'Pizza', targetType: 'restaurant' },
      { id: 'sushi-1', label: 'Sushi', targetType: 'restaurant' },
    ],
  })

  assert.equal(decorated[0].repeatPenalty, 0.45)
  assert.equal(decorated[1].repeatPenalty, 1)
  assert.equal(evaluateDinnerRotation({ candidate: decorated[1], summary }).shouldSuppress, true)
})

test('preference signals become aggregate circle memory without exposing private signals', () => {
  const signals = [
    createPreferenceSignalEntry({
      id: 'pref-a',
      ownerId: 'owner-a',
      rawValue: 'Thai',
      kind: 'cuisine',
      domain: 'discovery',
      source: 'user_entered',
      polarity: 'like',
      scope: { guestId: 'a' },
      shareCategory: 'household_visible',
    }),
    createPreferenceSignalEntry({
      id: 'pref-b',
      ownerId: 'owner-b',
      rawValue: 'Omakase',
      kind: 'cuisine',
      domain: 'discovery',
      source: 'user_entered',
      polarity: 'like',
      scope: { guestId: 'b' },
      shareCategory: 'private',
    }),
  ]

  const memoryEvents = circleMemoryEventsFromPreferenceSignals({
    circleId: 'circle-1',
    signals,
    observedAtFallback: '2026-05-13T00:00:00.000Z',
  })
  const summary = buildCircleTasteMemorySummary({
    circleId: 'circle-1',
    memberIds: ['a', 'b'],
    events: memoryEvents,
    now: '2026-05-13T00:00:00.000Z',
  })

  assert.equal(
    memoryEvents.find((event) => event.targetId === 'thai')?.visibility,
    'aggregate_allowed'
  )
  assert.equal(memoryEvents.find((event) => event.targetId === 'omakase')?.visibility, 'private')
  assert.equal(summary.visibleEventCount, 1)
  assert.equal(summary.redactedPrivateEventCount, 1)
  assert.equal(summary.labelsByTargetId.omakase, undefined)
})
