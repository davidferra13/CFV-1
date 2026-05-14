import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'
import { buildChefFacingCulinaryProfileReport } from '@/lib/discovery/profile-sharing-report'
import {
  filterShareableCulinaryProfileSignals,
  type CulinaryProfileSharingGrantRecord,
} from '@/lib/discovery/profile-sharing-contracts'

function activeCuisineAndDietaryGrant(): CulinaryProfileSharingGrantRecord {
  return {
    id: 'grant-1',
    ownerId: 'client-1',
    scope: 'chef',
    granteeChefId: 'chef-1',
    categories: ['cuisines', 'dietary'],
    grantedAt: '2026-05-12T08:00:00.000Z',
  }
}

test('sharing grants filter signals by chef, category, review, consent, and hidden overrides', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'thai',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'Thai',
        kind: 'cuisine',
        polarity: 'like',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
        observedAt: '2026-05-12T09:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'shellfish',
        ownerId: 'client-1',
        domain: 'intake',
        source: 'intake_form',
        rawValue: 'shellfish',
        kind: 'allergen',
        polarity: 'allergy',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'pad-thai-private',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'Pad Thai',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'accepted',
        shareCategory: 'private',
        metadata: { hiddenFromChef: true },
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'omakase-pending',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'omakase',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'pending_review',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
        observedAt: '2026-05-12T12:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1', generatedAt: '2026-05-12T13:00:00.000Z' }
  )

  const filtered = filterShareableCulinaryProfileSignals({
    signals: profile.allSignals,
    grants: [activeCuisineAndDietaryGrant()],
    context: {
      ownerId: 'client-1',
      requestingChefId: 'chef-1',
      now: '2026-05-12T14:00:00.000Z',
    },
  })

  assert.deepEqual(filtered.allowedSignals.map((signal) => signal.id).sort(), ['shellfish', 'thai'])
  assert.equal(filtered.redactionCounts.signal_private, 1)
  assert.equal(filtered.redactionCounts.signal_not_reviewed, 1)
})

test('chef-facing reports include only consented summary items and redact revoked access', () => {
  const profile = derivePreferenceProfile(
    [
      createPreferenceSignalEntry({
        id: 'thai',
        ownerId: 'client-1',
        domain: 'profile',
        source: 'user_entered',
        rawValue: 'Thai',
        kind: 'cuisine',
        polarity: 'like',
        shareCategory: 'chef_visible',
        consent: { chefSharing: true },
        observedAt: '2026-05-12T09:00:00.000Z',
      }),
      createPreferenceSignalEntry({
        id: 'pad-thai-private',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'Pad Thai',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'accepted',
        shareCategory: 'private',
        observedAt: '2026-05-12T11:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1', generatedAt: '2026-05-12T13:00:00.000Z' }
  )

  const visibleReport = buildChefFacingCulinaryProfileReport({
    profile,
    grants: [activeCuisineAndDietaryGrant()],
    access: {
      ownerId: 'client-1',
      requestingChefId: 'chef-1',
      now: '2026-05-12T14:00:00.000Z',
    },
    generatedAt: '2026-05-12T14:00:00.000Z',
  })
  const revokedReport = buildChefFacingCulinaryProfileReport({
    profile,
    grants: [{ ...activeCuisineAndDietaryGrant(), revokedAt: '2026-05-12T13:30:00.000Z' }],
    access: {
      ownerId: 'client-1',
      requestingChefId: 'chef-1',
      now: '2026-05-12T14:00:00.000Z',
    },
  })

  assert.equal(visibleReport.status, 'visible')
  assert.deepEqual(visibleReport.visibleCategories, ['cuisines'])
  assert.deepEqual(
    visibleReport.sections.flatMap((section) => section.items.map((item) => item.label)),
    ['Thai']
  )
  assert.equal(
    visibleReport.sections
      .flatMap((section) => section.items)
      .some((item) => item.label === 'Pad Thai'),
    false
  )
  assert.equal(revokedReport.status, 'limited')
  assert.equal(revokedReport.sections.length, 0)
  assert.equal(revokedReport.redactions.no_active_grant, 1)
})
