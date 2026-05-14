import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'
import { detectPreferenceConflicts } from '@/lib/discovery/preference-conflicts'

test('preference conflicts separate hard safety blocks from soft taste warnings', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'likes-lobster',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'lobster',
        kind: 'ingredient',
        polarity: 'like',
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'shellfish-allergy',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'Shellfish',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'likes-spicy',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'spicy',
        kind: 'tag',
        polarity: 'like',
        observedAt: '2026-05-12T12:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'guest-no-heat',
        ownerId: 'client-1',
        domain: 'event',
        source: 'chef_entered',
        rawValue: 'no heat',
        kind: 'tag',
        polarity: 'restriction',
        observedAt: '2026-05-12T13:00:00.000Z',
        scope: { level: 'guest', guestId: 'guest-1', label: 'Guest 1' },
      }),
    ],
    { ownerId: 'client-1' }
  )

  const conflicts = detectPreferenceConflicts(profile, {
    label: 'Cashew Cream Pasta',
    terms: [{ value: 'cashew cream', kind: 'ingredient' }],
  })

  assert.ok(
    conflicts.some(
      (conflict) =>
        conflict.type === 'allergy_or_restriction_conflict' &&
        conflict.severity === 'hard_block' &&
        conflict.blockingSignalIds.includes('shellfish-allergy')
    )
  )
  assert.ok(
    conflicts.some(
      (conflict) =>
        conflict.type === 'heat_preference_conflict' &&
        conflict.severity === 'warning' &&
        conflict.blockingSignalIds.includes('guest-no-heat')
    )
  )
  assert.equal(
    conflicts.some((conflict) => conflict.candidateLabel === 'Cashew Cream Pasta'),
    false
  )
})

test('candidate checks block derived allergen ingredients and warn on dislikes', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'tree-nut-allergy',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'tree nuts',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'mushroom-dislike',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'mushroom',
        kind: 'ingredient',
        polarity: 'dislike',
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1' }
  )

  const conflicts = detectPreferenceConflicts(profile, {
    label: 'Cashew Mushroom Risotto',
    terms: [
      { value: 'cashew cream', kind: 'ingredient' },
      { value: 'mushroom', kind: 'ingredient' },
    ],
  })

  assert.ok(
    conflicts.some(
      (conflict) =>
        conflict.type === 'candidate_safety_violation' &&
        conflict.severity === 'hard_block' &&
        conflict.blockingSignalIds.includes('tree-nut-allergy')
    )
  )
  assert.ok(
    conflicts.some(
      (conflict) =>
        conflict.type === 'candidate_preference_warning' &&
        conflict.severity === 'warning' &&
        conflict.blockingSignalIds.includes('mushroom-dislike')
    )
  )
})
