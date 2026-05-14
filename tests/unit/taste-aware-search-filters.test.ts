import test from 'node:test'
import assert from 'node:assert/strict'

import {
  describeTasteAwareFilters,
  filterTasteAwareCandidates,
} from '@/lib/discovery/taste-aware-search-filters'
import type { PersonalizationCandidate } from '@/lib/discovery/personalization-scoring'
import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'

function searchProfile() {
  return derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'thai-like',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'Thai',
        kind: 'cuisine',
        polarity: 'like',
        observedAt: '2026-05-12T09:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'shellfish-allergy',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'shellfish',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'cilantro-dislike',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'cilantro',
        kind: 'ingredient',
        polarity: 'dislike',
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1' }
  )
}

const candidates: PersonalizationCandidate[] = [
  {
    id: 'nearby-thai',
    label: 'Nearby Thai Supper',
    domain: 'search',
    terms: [{ value: 'Thai', kind: 'cuisine' }],
    budgetCents: 6400,
    distanceMiles: 3,
    occasionTags: ['date-night'],
  },
  {
    id: 'shrimp-thai',
    label: 'Shrimp Thai Supper',
    domain: 'search',
    terms: [
      { value: 'Thai', kind: 'cuisine' },
      { value: 'shrimp', kind: 'ingredient' },
    ],
    budgetCents: 5200,
    distanceMiles: 2,
    occasionTags: ['date-night'],
  },
  {
    id: 'cilantro-tacos',
    label: 'Cilantro Tacos',
    domain: 'search',
    terms: [{ value: 'cilantro', kind: 'ingredient' }],
    budgetCents: 4200,
    distanceMiles: 1,
  },
  {
    id: 'far-thai',
    label: 'Far Thai Menu',
    domain: 'search',
    terms: [{ value: 'Thai', kind: 'cuisine' }],
    budgetCents: 12500,
    distanceMiles: 25,
  },
]

test('taste-aware filters compose safe, favorites, dislikes, budget, distance, and occasion predicates', () => {
  const results = filterTasteAwareCandidates(
    searchProfile(),
    candidates,
    ['safe_for_me', 'matches_favorites', 'hide_dislikes', 'budget_fit', 'nearby', 'occasion_fit'],
    {
      maxBudgetCents: 7500,
      maxDistanceMiles: 8,
      occasionTags: ['date-night'],
    }
  )

  assert.deepEqual(
    results.map((result) => result.candidate.id),
    ['nearby-thai']
  )
  assert.deepEqual(results[0]?.activeFilters, [
    'safe_for_me',
    'matches_favorites',
    'hide_dislikes',
    'budget_fit',
    'nearby',
    'occasion_fit',
  ])
  assert.ok(results[0]?.explanations.includes('Safe for this profile'))
})

test('new but similar excludes recently seen candidates while preserving similar matches', () => {
  const results = filterTasteAwareCandidates(
    searchProfile(),
    candidates,
    ['safe_for_me', 'new_but_similar'],
    {
      recentlySeenCandidateIds: ['nearby-thai'],
    }
  )

  assert.deepEqual(
    results.map((result) => result.candidate.id),
    ['far-thai']
  )
})

test('taste-aware filter descriptions are stable and deduplicated', () => {
  assert.deepEqual(describeTasteAwareFilters(['safe_for_me', 'safe_for_me', 'hide_dislikes']), [
    'Safe for this profile',
    'Does not include disliked items',
  ])
})
