import test from 'node:test'
import assert from 'node:assert/strict'

import { decideCulinaryProfileSnapshotRefresh } from '@/lib/discovery/culinary-profile-refresh'
import {
  createPreferenceSignalEntry,
  derivePreferenceProfile,
} from '@/lib/discovery/preference-contract'
import {
  auditCulinaryProfilePrivacy,
  buildCulinaryProfileAuditEvent,
} from '@/lib/discovery/profile-privacy-audit'
import {
  buildCulinaryProfileExportPayload,
  planCulinaryProfileDeletion,
} from '@/lib/discovery/profile-export-guardrails'
import type { CulinaryProfileSharingGrantRecord } from '@/lib/discovery/profile-sharing-contracts'

function grant(): CulinaryProfileSharingGrantRecord {
  return {
    id: 'grant-1',
    ownerId: 'client-1',
    scope: 'chef',
    granteeChefId: 'chef-1',
    categories: ['cuisines'],
    grantedAt: '2026-05-12T08:00:00.000Z',
  }
}

test('profile exports use report filtering and never include raw discovery activity by default', () => {
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
        id: 'private-craving',
        ownerId: 'client-1',
        domain: 'discovery',
        source: 'discovery_interaction',
        rawValue: 'Pad Thai',
        kind: 'dish',
        polarity: 'like',
        reviewState: 'accepted',
        shareCategory: 'private',
        observedAt: '2026-05-12T10:00:00.000Z',
      }),
    ],
    { ownerId: 'client-1' }
  )

  const chefShare = buildCulinaryProfileExportPayload({
    profile,
    mode: 'chef_share',
    requesterId: 'chef-1',
    generatedAt: '2026-05-12T11:00:00.000Z',
    grants: [grant()],
    access: {
      ownerId: 'client-1',
      requestingChefId: 'chef-1',
      now: '2026-05-12T11:00:00.000Z',
    },
  })
  const clientDownload = buildCulinaryProfileExportPayload({
    profile,
    mode: 'client_download',
    requesterId: 'client-1',
    generatedAt: '2026-05-12T11:00:00.000Z',
    includePrivateProfileSignals: true,
  })

  assert.equal(chefShare.includesRawDiscoveryActivity, false)
  assert.equal(chefShare.includesPrivateProfileSignals, false)
  assert.deepEqual(
    chefShare.items.map((item) => item.label),
    ['Thai']
  )
  assert.equal(chefShare.redactedSignalCount, 1)
  assert.equal(chefShare.auditEvent.metadata.visibleSignalCount, 1)
  assert.equal(clientDownload.includesPrivateProfileSignals, true)
  assert.deepEqual(clientDownload.items.map((item) => item.label).sort(), ['Pad Thai', 'Thai'])
})

test('privacy audit catches raw export payloads and sensitive audit metadata', () => {
  const safeEvent = buildCulinaryProfileAuditEvent({
    type: 'chef_report_viewed',
    actorId: 'chef-1',
    ownerId: 'client-1',
    occurredAt: '2026-05-12T11:00:00.000Z',
    chefId: 'chef-1',
    visibleSignalCount: 1,
  })
  const findings = auditCulinaryProfilePrivacy({
    signals: [],
    grants: [],
    context: { ownerId: 'client-1', requestingChefId: 'chef-1' },
    exportPayload: { rawDiscoveryEvents: [{ itemId: 'dish-1' }] },
    auditEvents: [safeEvent, { metadata: { rawValue: 'Pad Thai' } }],
  })

  assert.deepEqual(findings.map((finding) => finding.code).sort(), [
    'raw_activity_in_export',
    'sensitive_audit_payload',
  ])
})

test('delete plans are owner-only and revoke active grants before deleting profile data', () => {
  const allowed = planCulinaryProfileDeletion({
    ownerId: 'client-1',
    requestedBy: 'client-1',
    requestedAt: '2026-05-12T12:00:00.000Z',
    grants: [grant(), { ...grant(), id: 'grant-2', revokedAt: '2026-05-12T11:00:00.000Z' }],
  })
  const blocked = planCulinaryProfileDeletion({
    ownerId: 'client-1',
    requestedBy: 'chef-1',
    requestedAt: '2026-05-12T12:00:00.000Z',
    grants: [grant()],
  })

  assert.equal(allowed.allowed, true)
  assert.deepEqual(allowed.grantIdsToRevoke, ['grant-1'])
  assert.deepEqual(allowed.actions, [
    'revoke_active_sharing_grants',
    'delete_preference_signals',
    'delete_profile_snapshots',
    'write_privacy_tombstone',
  ])
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.blockedReason, 'not_profile_owner')
  assert.deepEqual(blocked.actions, ['write_privacy_tombstone'])
})

test('snapshot refresh decisions refresh immediately for grants and revocations', () => {
  assert.deepEqual(
    decideCulinaryProfileSnapshotRefresh({
      now: '2026-05-12T12:10:00.000Z',
      lastSnapshotGeneratedAt: '2026-05-12T12:00:00.000Z',
      latestRevocationAt: '2026-05-12T12:05:00.000Z',
      minimumIntervalHours: 1,
    }),
    {
      shouldRefresh: true,
      reason: 'revocation_changed',
      nextEligibleAt: null,
    }
  )
  assert.equal(
    decideCulinaryProfileSnapshotRefresh({
      now: '2026-05-12T12:10:00.000Z',
      lastSnapshotGeneratedAt: '2026-05-12T12:00:00.000Z',
      latestSignalObservedAt: '2026-05-12T12:05:00.000Z',
      minimumIntervalHours: 1,
    }).shouldRefresh,
    false
  )
  assert.equal(
    decideCulinaryProfileSnapshotRefresh({
      now: '2026-05-12T12:10:00.000Z',
      profileOptedOut: true,
      lastSnapshotGeneratedAt: '2026-05-12T12:00:00.000Z',
    }).reason,
    'opted_out'
  )
})
