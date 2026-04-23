import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildClientRelationshipSignalSnapshot,
  type ClientRelationshipSignal,
} from '@/lib/clients/relationship-signals'
import type { ClientPattern } from '@/lib/clients/preference-learning-actions'

function labels(signals: ClientRelationshipSignal[]) {
  return signals.map((signal) => `${signal.kind}:${signal.value}`)
}

describe('client relationship snapshot', () => {
  it('keeps profile-entered signals canonical when learned history overlaps', () => {
    const snapshot = buildClientRelationshipSignalSnapshot(
      {
        favorite_cuisines: ['Italian'],
        dietary_restrictions: ['Vegetarian'],
        allergies: ['Tree nut'],
        updated_at: '2026-04-20T10:00:00.000Z',
      },
      [
        {
          id: 'pattern-1',
          chefId: 'chef-1',
          clientId: 'client-1',
          patternType: 'favorite_cuisine',
          patternValue: 'italian',
          confidence: 1,
          occurrences: 1,
          lastSeenAt: '2026-04-18T09:00:00.000Z',
        },
        {
          id: 'pattern-2',
          chefId: 'chef-1',
          clientId: 'client-1',
          patternType: 'allergy',
          patternValue: 'shellfish',
          confidence: 0.8,
          occurrences: 2,
          lastSeenAt: '2026-04-17T09:00:00.000Z',
        },
        {
          id: 'pattern-3',
          chefId: 'chef-1',
          clientId: 'client-1',
          patternType: 'preferred_day',
          patternValue: 'friday',
          confidence: 0.7,
          occurrences: 3,
          lastSeenAt: '2026-04-19T09:00:00.000Z',
        },
      ] satisfies ClientPattern[]
    )

    assert.deepEqual(labels(snapshot.profile), [
      'favorite_cuisine:Italian',
      'dietary_need:Vegetarian',
      'allergy:Tree nut',
    ])
    assert.deepEqual(labels(snapshot.canonical), [
      'favorite_cuisine:Italian',
      'dietary_need:Vegetarian',
      'allergy:Tree nut',
      'preferred_day:Friday',
    ])
    assert.deepEqual(labels(snapshot.secondaryLearned), [
      'favorite_cuisine:Italian',
      'allergy:Shellfish',
    ])
    assert.ok(snapshot.secondaryLearned.every((signal) => signal.shadowedByProfile))
  })

  it('promotes learned signals when no explicit profile fact exists for that concept', () => {
    const snapshot = buildClientRelationshipSignalSnapshot(
      {
        favorite_cuisines: [],
        dietary_restrictions: [],
        allergies: [],
        updated_at: null,
      },
      [
        {
          id: 'pattern-1',
          chefId: 'chef-1',
          clientId: 'client-1',
          patternType: 'service_style',
          patternValue: 'family_style',
          confidence: 0.65,
          occurrences: 2,
          lastSeenAt: '2026-04-16T09:00:00.000Z',
        },
        {
          id: 'pattern-2',
          chefId: 'chef-1',
          clientId: 'client-1',
          patternType: 'time_preference',
          patternValue: 'dinner',
          confidence: 0.9,
          occurrences: 4,
          lastSeenAt: '2026-04-18T09:00:00.000Z',
        },
      ] satisfies ClientPattern[]
    )

    assert.deepEqual(labels(snapshot.profile), [])
    assert.deepEqual(labels(snapshot.secondaryLearned), [])
    assert.deepEqual(labels(snapshot.canonical), [
      'service_style:Family Style',
      'time_preference:Dinner',
    ])
    assert.ok(snapshot.canonical.every((signal) => signal.source === 'learned_pattern'))
  })
})
