import test from 'node:test'
import assert from 'node:assert/strict'

import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  createEventPreferenceOverrideSignal,
  mergeEventPreferenceOverrides,
  promoteEventOverrideToGlobalPreference,
} from '@/lib/discovery/preference-override-contract'

test('event preference overrides shadow overlapping global soft preferences only for that event', () => {
  const globalSeafoodLike = createPreferenceSignalEntry({
    id: 'global-seafood-like',
    ownerId: 'client-1',
    domain: 'profile',
    source: 'user_entered',
    rawValue: 'seafood',
    kind: 'ingredient',
    polarity: 'like',
    observedAt: '2026-05-01T12:00:00.000Z',
  })
  const globalItalianLike = createPreferenceSignalEntry({
    id: 'global-italian-like',
    ownerId: 'client-1',
    domain: 'profile',
    source: 'user_entered',
    rawValue: 'Italian',
    kind: 'cuisine',
    polarity: 'like',
    observedAt: '2026-05-01T12:01:00.000Z',
  })
  const eventNoSeafood = createEventPreferenceOverrideSignal({
    id: 'event-no-seafood',
    ownerId: 'client-1',
    eventId: 'event-1',
    rawValue: 'seafood',
    kind: 'ingredient',
    polarity: 'never_show',
    observedAt: '2026-05-12T12:00:00.000Z',
  })

  const result = mergeEventPreferenceOverrides(
    [globalSeafoodLike, globalItalianLike],
    [eventNoSeafood],
    {
      ownerId: 'client-1',
      eventId: 'event-1',
      generatedAt: '2026-05-12T13:00:00.000Z',
    }
  )

  assert.deepEqual(
    result.shadowedGlobalSignals.map((signal) => signal.id),
    ['global-seafood-like']
  )
  assert.deepEqual(result.profile.resolved.map((signal) => signal.id).sort(), [
    'event-no-seafood',
    'global-italian-like',
  ])
  assert.equal(result.profile.exclusions[0]?.id, 'event-no-seafood')
  assert.equal(result.eventOverrides[0].scope.eventId, 'event-1')
})

test('event overrides can be promoted to global preferences without leaking event sharing settings', () => {
  const override = createEventPreferenceOverrideSignal({
    id: 'event-extra-vegetarian',
    ownerId: 'client-1',
    eventId: 'event-1',
    rawValue: 'vegetarian',
    kind: 'dietary',
    polarity: 'restriction',
    chefVisible: true,
    observedAt: '2026-05-12T12:00:00.000Z',
  })

  const promoted = promoteEventOverrideToGlobalPreference(override, {
    actorId: 'client-1',
    observedAt: '2026-05-13T12:00:00.000Z',
  })

  assert.equal(promoted.scope.level, 'account')
  assert.equal(promoted.domain, 'profile')
  assert.equal(promoted.shareCategory, 'private')
  assert.equal(promoted.consent.chefSharing, false)
  assert.deepEqual(promoted.supersedesSignalIds, ['event-extra-vegetarian'])
  assert.equal(promoted.metadata.promotedFromEventId, 'event-1')
})
