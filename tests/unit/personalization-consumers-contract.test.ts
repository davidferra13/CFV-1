import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProfileCompleteness,
  type ProfileCompletenessField,
} from '@/lib/discovery/personalization-completeness'
import {
  type PersonalizationCandidate,
  scoreTasteCandidate,
  scoreTasteCandidates,
} from '@/lib/discovery/personalization-scoring'
import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'

function contractProfile() {
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
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
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
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
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
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
      }),
      createPreferenceSignalEntry({
        id: 'tree-nut-private',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'tree nuts',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T12:00:00.000Z',
        shareCategory: 'private',
        consent: { chefSharing: false },
      }),
      createPreferenceSignalEntry({
        id: 'budget-context',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'budget',
        kind: 'budget',
        polarity: 'context',
        observedAt: '2026-05-12T13:00:00.000Z',
        metadata: { maxBudgetCents: 7500 },
      }),
      createPreferenceSignalEntry({
        id: 'location-context',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'nearby',
        kind: 'tag',
        polarity: 'context',
        observedAt: '2026-05-12T14:00:00.000Z',
        metadata: { maxDistanceMiles: 8 },
      }),
      createPreferenceSignalEntry({
        id: 'occasion-context',
        ownerId: 'client-1',
        domain: 'event',
        source: 'user_entered',
        rawValue: 'birthday',
        kind: 'service_style',
        polarity: 'context',
        observedAt: '2026-05-12T15:00:00.000Z',
        metadata: { occasion: 'birthday' },
      }),
    ],
    { ownerId: 'client-1' }
  )
}

test('shared taste vector scoring boosts, demotes, excludes, and explains consistently', () => {
  const profile = contractProfile()
  const thaiCandidate: PersonalizationCandidate = {
    id: 'thai-noodles',
    label: 'Thai Noodles',
    domain: 'recipe',
    terms: [{ value: 'Thai', kind: 'cuisine' }],
    budgetCents: 5800,
    distanceMiles: 4,
    occasionTags: ['birthday'],
    confidence: 0.8,
  }
  const mushroomCandidate: PersonalizationCandidate = {
    id: 'mushroom-toast',
    label: 'Mushroom Toast',
    domain: 'grocery',
    terms: [{ value: 'mushroom', kind: 'ingredient' }],
  }
  const shrimpCandidate: PersonalizationCandidate = {
    id: 'shrimp-pad-thai',
    label: 'Shrimp Pad Thai',
    domain: 'discovery',
    terms: [
      { value: 'Thai', kind: 'cuisine' },
      { value: 'shrimp', kind: 'ingredient' },
    ],
  }

  const thaiScore = scoreTasteCandidate(profile, thaiCandidate, {
    maxBudgetCents: 7500,
    maxDistanceMiles: 8,
    occasionTags: ['birthday'],
  })
  const mushroomScore = scoreTasteCandidate(profile, mushroomCandidate)
  const shrimpScore = scoreTasteCandidate(profile, shrimpCandidate)

  assert.equal(thaiScore.hidden, false)
  assert.ok(thaiScore.totalScore > mushroomScore.totalScore)
  assert.ok(thaiScore.reasons.some((reason) => reason.kind === 'positive_match'))
  assert.ok(thaiScore.reasons.some((reason) => reason.kind === 'budget_fit'))
  assert.ok(mushroomScore.components.negative < 0)
  assert.equal(shrimpScore.hidden, true)
  assert.deepEqual(
    shrimpScore.hardExclusions.map((item) => item.signalId),
    ['shellfish-allergy']
  )
})

test('preference consumers share hard dietary exclusions across domains', () => {
  const profile = contractProfile()
  const domains: PersonalizationCandidate['domain'][] = [
    'discovery',
    'recipe',
    'grocery',
    'restaurant',
    'remy',
    'search',
  ]
  const candidates = domains.map((domain) => ({
    id: `${domain}-shrimp`,
    label: `${domain} shrimp option`,
    domain,
    terms: [{ value: 'shrimp', kind: 'ingredient' as const }],
  }))

  const scores = scoreTasteCandidates(profile, candidates)

  assert.equal(scores.length, domains.length)
  assert.ok(scores.every((score) => score.hidden))
  assert.ok(
    scores.every((score) =>
      score.hardExclusions.some((exclusion) => exclusion.signalId === 'shellfish-allergy')
    )
  )
})

test('chef-shared scoring blocks private safety constraints without leaking labels', () => {
  const profile = contractProfile()
  const cashewCandidate: PersonalizationCandidate = {
    id: 'cashew-salad',
    label: 'Cashew Salad',
    domain: 'menu',
    terms: [{ value: 'cashew cream', kind: 'ingredient' }],
  }

  const score = scoreTasteCandidate(profile, cashewCandidate, { visibility: 'chef_shared' })

  assert.equal(score.hidden, true)
  assert.equal(score.redactedSignalCount, 1)
  assert.equal(score.hardExclusions[0]?.redacted, true)
  assert.equal(score.hardExclusions[0]?.label, 'Private safety constraint')
  assert.equal(
    score.reasons.some((reason) => reason.signalLabel === 'Tree Nut'),
    false
  )
})

test('profile completeness produces contextual nudges and honors dismissal deferral', () => {
  const profile = derivePreferenceProfile([
    createPreferenceSignalEntry({
      id: 'favorite-thai',
      ownerId: 'client-2',
      domain: 'profile',
      source: 'user_entered',
      rawValue: 'Thai',
      kind: 'cuisine',
      polarity: 'like',
      observedAt: '2026-05-12T09:00:00.000Z',
    }),
  ])

  const completeness = buildProfileCompleteness(profile, {
    dismissedFields: ['dislikes'],
    deferredFields: {
      budget: '2026-05-14T00:00:00.000Z',
    },
    now: '2026-05-13T00:00:00.000Z',
  })

  const nudgedFields = completeness.nudges.map((nudge) => nudge.field)

  assert.equal(completeness.fields.favorites.complete, true)
  assert.equal(completeness.sufficientlyComplete, false)
  assert.ok(nudgedFields.includes('allergies'))
  assert.equal(nudgedFields.includes('dislikes' satisfies ProfileCompletenessField), false)
  assert.equal(nudgedFields.includes('budget'), false)
})
