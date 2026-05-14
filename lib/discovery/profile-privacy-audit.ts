import type { PreferenceSignalLedgerEntry } from '@/lib/discovery/preference-contract'
import {
  decideCulinaryProfileSignalSharing,
  isCulinaryProfileSharingGrantActive,
  type CulinaryProfileAccessContext,
  type CulinaryProfileSharingGrantRecord,
} from '@/lib/discovery/profile-sharing-contracts'

export type CulinaryProfileAuditEventType =
  | 'chef_report_viewed'
  | 'sharing_grant_changed'
  | 'sharing_grant_revoked'
  | 'snapshot_refreshed'
  | 'profile_exported'

export interface CulinaryProfileAuditEvent {
  type: CulinaryProfileAuditEventType
  actorId: string
  ownerId: string
  occurredAt: string
  metadata: {
    chefId?: string
    relationshipId?: string
    grantId?: string
    categoryCount?: number
    visibleSignalCount?: number
    redactedSignalCount?: number
    exportMode?: 'client_download' | 'chef_share'
    reason?: string
  }
}

export type CulinaryProfilePrivacyFindingCode =
  | 'revoked_grant_would_share'
  | 'private_signal_visible'
  | 'unreviewed_signal_visible'
  | 'nonconsented_signal_visible'
  | 'raw_activity_in_export'
  | 'sensitive_audit_payload'

export interface CulinaryProfilePrivacyFinding {
  code: CulinaryProfilePrivacyFindingCode
  severity: 'warning' | 'error'
  message: string
  signalId?: string
  grantId?: string
}

const SENSITIVE_AUDIT_METADATA_KEYS = new Set([
  'rawValue',
  'itemLabel',
  'preferenceLabel',
  'canonicalKey',
  'rawDiscoveryEvents',
])

export function buildCulinaryProfileAuditEvent(input: {
  type: CulinaryProfileAuditEventType
  actorId: string
  ownerId: string
  occurredAt: string
  chefId?: string | null
  relationshipId?: string | null
  grantId?: string | null
  categoryCount?: number
  visibleSignalCount?: number
  redactedSignalCount?: number
  exportMode?: 'client_download' | 'chef_share'
  reason?: string | null
}): CulinaryProfileAuditEvent {
  return {
    type: input.type,
    actorId: input.actorId,
    ownerId: input.ownerId,
    occurredAt: input.occurredAt,
    metadata: {
      chefId: input.chefId ?? undefined,
      relationshipId: input.relationshipId ?? undefined,
      grantId: input.grantId ?? undefined,
      categoryCount: input.categoryCount,
      visibleSignalCount: input.visibleSignalCount,
      redactedSignalCount: input.redactedSignalCount,
      exportMode: input.exportMode,
      reason: input.reason ?? undefined,
    },
  }
}

function objectHasSensitiveAuditKeys(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false

  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_AUDIT_METADATA_KEYS.has(key)) return true
    if (objectHasSensitiveAuditKeys(child)) return true
  }

  return false
}

function hasRawActivityPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if ('rawDiscoveryEvents' in value || 'rawBrowsingHistory' in value) return true

  return Object.values(value).some((child) => hasRawActivityPayload(child))
}

export function auditCulinaryProfilePrivacy(input: {
  signals: PreferenceSignalLedgerEntry[]
  grants: CulinaryProfileSharingGrantRecord[]
  context: CulinaryProfileAccessContext
  externallyVisibleSignalIds?: string[]
  exportPayload?: unknown
  auditEvents?: CulinaryProfileAuditEvent[] | Array<Record<string, unknown>>
}): CulinaryProfilePrivacyFinding[] {
  const visibleIds = new Set(input.externallyVisibleSignalIds ?? [])
  const findings: CulinaryProfilePrivacyFinding[] = []

  for (const grant of input.grants) {
    if (!grant.revokedAt) continue
    if (isCulinaryProfileSharingGrantActive(grant, input.context)) {
      findings.push({
        code: 'revoked_grant_would_share',
        severity: 'error',
        grantId: grant.id,
        message: 'A revoked culinary profile sharing grant was still considered active.',
      })
    }
  }

  for (const signal of input.signals) {
    if (!visibleIds.has(signal.id)) continue

    const decision = decideCulinaryProfileSignalSharing({
      signal,
      grants: input.grants,
      context: input.context,
    })

    if (decision.allowed) continue

    const code =
      decision.reason === 'signal_not_reviewed'
        ? 'unreviewed_signal_visible'
        : decision.reason === 'signal_not_consented'
          ? 'nonconsented_signal_visible'
          : 'private_signal_visible'

    findings.push({
      code,
      severity: 'error',
      signalId: signal.id,
      message: 'A culinary profile signal was externally visible without matching consent.',
    })
  }

  if (hasRawActivityPayload(input.exportPayload)) {
    findings.push({
      code: 'raw_activity_in_export',
      severity: 'error',
      message: 'A culinary profile export included raw discovery activity.',
    })
  }

  for (const event of input.auditEvents ?? []) {
    if (objectHasSensitiveAuditKeys(event.metadata ?? event)) {
      findings.push({
        code: 'sensitive_audit_payload',
        severity: 'warning',
        message: 'An audit payload included preference details instead of aggregate metadata.',
      })
    }
  }

  return findings
}
