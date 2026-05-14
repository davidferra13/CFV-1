import type { DerivedPreferenceProfile } from '@/lib/discovery/preference-contract'
import {
  buildCulinaryProfileAuditEvent,
  type CulinaryProfileAuditEvent,
} from '@/lib/discovery/profile-privacy-audit'
import {
  filterShareableCulinaryProfileSignals,
  toSharedProfileReportItems,
  type CulinaryProfileAccessContext,
  type CulinaryProfileSharingGrantRecord,
  type SharedProfileReportItem,
} from '@/lib/discovery/profile-sharing-contracts'

export type CulinaryProfileExportMode = 'client_download' | 'chef_share'

export interface CulinaryProfileExportPayload {
  ownerId: string
  mode: CulinaryProfileExportMode
  generatedAt: string
  includesPrivateProfileSignals: boolean
  includesRawDiscoveryActivity: false
  items: SharedProfileReportItem[]
  redactedSignalCount: number
  auditEvent: CulinaryProfileAuditEvent
}

export interface CulinaryProfileDeletePlan {
  allowed: boolean
  ownerId: string
  requestedBy: string
  requestedAt: string
  actions: Array<
    | 'revoke_active_sharing_grants'
    | 'delete_preference_signals'
    | 'delete_profile_snapshots'
    | 'write_privacy_tombstone'
  >
  blockedReason?: 'not_profile_owner'
  grantIdsToRevoke: string[]
}

export function buildCulinaryProfileExportPayload(input: {
  profile: DerivedPreferenceProfile
  mode: CulinaryProfileExportMode
  requesterId: string
  generatedAt: string
  grants?: CulinaryProfileSharingGrantRecord[]
  access?: CulinaryProfileAccessContext
  includePrivateProfileSignals?: boolean
}): CulinaryProfileExportPayload {
  const isOwnerDownload =
    input.mode === 'client_download' && input.requesterId === input.profile.ownerId
  const includePrivateProfileSignals =
    isOwnerDownload && input.includePrivateProfileSignals === true
  const signals: {
    allowedSignals: DerivedPreferenceProfile['resolved']
    redactionCounts: Record<string, number>
  } =
    input.mode === 'chef_share'
      ? filterShareableCulinaryProfileSignals({
          signals: input.profile.resolved,
          grants: input.grants ?? [],
          context: input.access ?? {
            ownerId: input.profile.ownerId,
          },
        })
      : {
          allowedSignals: input.profile.resolved.filter(
            (signal) => includePrivateProfileSignals || signal.shareCategory !== 'private'
          ),
          redactionCounts: {},
        }

  const items = toSharedProfileReportItems(signals.allowedSignals)
  const redactedSignalCount = Object.values(signals.redactionCounts).reduce(
    (total, count) => total + count,
    0
  )

  return {
    ownerId: input.profile.ownerId,
    mode: input.mode,
    generatedAt: input.generatedAt,
    includesPrivateProfileSignals: includePrivateProfileSignals,
    includesRawDiscoveryActivity: false,
    items,
    redactedSignalCount,
    auditEvent: buildCulinaryProfileAuditEvent({
      type: 'profile_exported',
      actorId: input.requesterId,
      ownerId: input.profile.ownerId,
      occurredAt: input.generatedAt,
      chefId: input.access?.requestingChefId ?? null,
      relationshipId: input.access?.relationshipId ?? null,
      visibleSignalCount: items.length,
      redactedSignalCount,
      exportMode: input.mode,
    }),
  }
}

export function planCulinaryProfileDeletion(input: {
  ownerId: string
  requestedBy: string
  requestedAt: string
  grants: CulinaryProfileSharingGrantRecord[]
  deleteSignals?: boolean
  deleteSnapshots?: boolean
}): CulinaryProfileDeletePlan {
  const allowed = input.ownerId === input.requestedBy
  const grantIdsToRevoke = input.grants
    .filter((grant) => grant.ownerId === input.ownerId && !grant.revokedAt)
    .map((grant) => grant.id)

  if (!allowed) {
    return {
      allowed: false,
      ownerId: input.ownerId,
      requestedBy: input.requestedBy,
      requestedAt: input.requestedAt,
      actions: ['write_privacy_tombstone'],
      blockedReason: 'not_profile_owner',
      grantIdsToRevoke: [],
    }
  }

  return {
    allowed: true,
    ownerId: input.ownerId,
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt,
    actions: [
      'revoke_active_sharing_grants',
      ...(input.deleteSignals === false ? [] : (['delete_preference_signals'] as const)),
      ...(input.deleteSnapshots === false ? [] : (['delete_profile_snapshots'] as const)),
      'write_privacy_tombstone',
    ],
    grantIdsToRevoke,
  }
}
