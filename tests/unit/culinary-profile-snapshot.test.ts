import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCulinaryProfileSnapshot } from '@/lib/discovery/culinary-profile-snapshot'
import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'

test('culinary profile snapshots separate private and consented shareable summaries', () => {
  const profile = derivePreferenceProfile(
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
        id: 'private-craving',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'pad thai',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'accepted',
        observedAt: '2026-05-12T11:00:00.000Z',
        shareCategory: 'private',
      }),
    ],
    { ownerId: 'client-1' }
  )

  const snapshot = buildCulinaryProfileSnapshot({
    profile,
    generatedAt: '2026-05-12T12:00:00.000Z',
    sharingGrant: {
      id: 'grant-1',
      granteeChefId: 'chef-1',
      allowedCategories: ['chef_visible'],
      grantedAt: '2026-05-12T08:00:00.000Z',
    },
  })

  assert.equal(snapshot.version, 'culinary-profile-v1')
  assert.equal(snapshot.sourceWindow.startsAt, '2026-05-12T09:00:00.000Z')
  assert.equal(snapshot.sourceWindow.endsAt, '2026-05-12T11:00:00.000Z')
  assert.equal(snapshot.sourceWindow.signalCount, 3)
  assert.equal(snapshot.readiness.hasHardConstraints, true)
  assert.equal(snapshot.readiness.hasShareableContent, true)
  assert.ok(
    snapshot.privateSummary
      .flatMap((block) => block.items)
      .some((item) => item.label === 'Pad Thai')
  )
  assert.equal(
    snapshot.shareableSummary
      .flatMap((block) => block.items)
      .some((item) => item.label === 'Pad Thai'),
    false
  )
  assert.ok(
    snapshot.shareableSummary
      .flatMap((block) => block.items)
      .some((item) => item.label === 'Shellfish')
  )
})

test('revoked sharing grants produce safe empty shareable snapshots', () => {
  const profile = derivePreferenceProfile([
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
  ])

  const snapshot = buildCulinaryProfileSnapshot({
    profile,
    generatedAt: '2026-05-12T12:00:00.000Z',
    sharingGrant: {
      id: 'grant-1',
      allowedCategories: ['chef_visible'],
      grantedAt: '2026-05-12T08:00:00.000Z',
      revokedAt: '2026-05-12T11:00:00.000Z',
    },
  })

  assert.equal(snapshot.readiness.hasShareableContent, false)
  assert.deepEqual(snapshot.shareableSummary, [])
  assert.equal(snapshot.privateSummary.length, 1)
})
