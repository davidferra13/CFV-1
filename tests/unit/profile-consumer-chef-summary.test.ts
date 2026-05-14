import test from 'node:test'
import assert from 'node:assert/strict'

import { buildChefClientTasteSummary } from '@/lib/discovery/chef-client-taste-summary'
import { buildPersonalizationAuditTrail } from '@/lib/discovery/personalization-audit-trail'
import {
  type PersonalizationCandidate,
  scoreTasteCandidate,
} from '@/lib/discovery/personalization-scoring'
import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'

function chefProfile() {
  return derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'likes-thai',
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
        id: 'avoid-cilantro',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'cilantro',
        kind: 'ingredient',
        polarity: 'dislike',
        observedAt: '2026-05-12T10:00:00.000Z',
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
        observedAt: '2026-05-12T11:00:00.000Z',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
      }),
      createPreferenceSignalEntry({
        id: 'private-pad-thai',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'pad thai',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'accepted',
        observedAt: '2026-05-12T12:00:00.000Z',
        shareCategory: 'private',
        consent: { chefSharing: false },
      }),
      createPreferenceSignalEntry({
        id: 'private-tree-nut',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'tree nuts',
        kind: 'allergen',
        polarity: 'allergy',
        observedAt: '2026-05-12T13:00:00.000Z',
        shareCategory: 'private',
        consent: { chefSharing: false },
      }),
      createPreferenceSignalEntry({
        id: 'pending-oaxacan',
        ownerId: 'client-1',
        domain: 'search',
        source: 'search',
        rawValue: 'Oaxacan',
        kind: 'cuisine',
        polarity: 'like',
        observedAt: '2026-05-12T14:00:00.000Z',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
      }),
    ],
    { ownerId: 'client-1' }
  )
}

test('chef client taste summary shows shared taste and redacts private signals', () => {
  const summary = buildChefClientTasteSummary(chefProfile(), {
    generatedAt: '2026-05-13T00:00:00.000Z',
  })
  const allLabels = [
    ...summary.favorites,
    ...summary.avoids,
    ...summary.safetyCritical,
    ...summary.recentChanges,
  ].map((item) => item.label)

  assert.equal(summary.access, 'allowed')
  assert.ok(summary.favorites.some((item) => item.label === 'Thai'))
  assert.ok(summary.avoids.some((item) => item.label === 'Cilantro'))
  assert.ok(summary.safetyCritical.some((item) => item.label === 'Shellfish'))
  assert.equal(allLabels.includes('Pad Thai'), false)
  assert.equal(allLabels.includes('Tree Nut'), false)
  assert.equal(summary.redacted.privateSafetySignalCount, 1)
  assert.ok(
    summary.warnings.includes(
      'Additional private safety constraints exist but are not shared by label.'
    )
  )
  assert.ok(
    summary.safeMenuDirections.some((direction) => direction.includes('Do not serve Shellfish'))
  )
})

test('chef client taste summary denies access without leaking profile details', () => {
  const summary = buildChefClientTasteSummary(chefProfile(), {
    canViewChefSharedProfile: false,
  })

  assert.equal(summary.access, 'denied')
  assert.deepEqual(summary.favorites, [])
  assert.deepEqual(summary.safetyCritical, [])
  assert.equal(summary.redacted.privateSafetySignalCount, 2)
})

test('chef audit trail explains exclusions and redacts private safety labels', () => {
  const profile = chefProfile()
  const shrimpCandidate: PersonalizationCandidate = {
    id: 'shrimp-menu',
    label: 'Shrimp Menu',
    domain: 'menu',
    terms: [{ value: 'shrimp', kind: 'ingredient' }],
  }
  const cashewCandidate: PersonalizationCandidate = {
    id: 'cashew-menu',
    label: 'Cashew Menu',
    domain: 'menu',
    terms: [{ value: 'cashew cream', kind: 'ingredient' }],
  }

  const shrimpAudit = buildPersonalizationAuditTrail(profile, shrimpCandidate, {
    visibility: 'chef_shared',
    generatedAt: '2026-05-13T00:00:00.000Z',
  })
  const cashewAudit = buildPersonalizationAuditTrail(profile, cashewCandidate, {
    visibility: 'chef_shared',
    generatedAt: '2026-05-13T00:00:00.000Z',
  })
  const directScore = scoreTasteCandidate(profile, cashewCandidate, { visibility: 'chef_shared' })

  assert.equal(shrimpAudit.score?.hidden, true)
  assert.ok(
    shrimpAudit.events.some(
      (event) =>
        event.kind === 'safety_exclusion' &&
        event.signalId === 'shellfish-allergy' &&
        event.signalLabel === 'Shellfish'
    )
  )
  assert.equal(cashewAudit.score?.hidden, true)
  assert.equal(cashewAudit.score?.redactedSignalCount, 1)
  assert.equal(directScore.redactedSignalCount, 1)
  assert.ok(
    cashewAudit.events.some(
      (event) => event.kind === 'safety_exclusion' && event.redacted && event.signalLabel === null
    )
  )
  assert.equal(
    cashewAudit.events.some((event) => event.signalLabel === 'Tree Nut'),
    false
  )
})

test('audit trail permission denial returns no events', () => {
  const audit = buildPersonalizationAuditTrail(
    chefProfile(),
    {
      id: 'thai-menu',
      label: 'Thai Menu',
      domain: 'menu',
      terms: [{ value: 'Thai', kind: 'cuisine' }],
    },
    {
      canViewProfile: false,
      visibility: 'chef_shared',
    }
  )

  assert.equal(audit.access, 'denied')
  assert.equal(audit.score, null)
  assert.deepEqual(audit.events, [])
})
