export type CulinaryProfileRefreshReason =
  | 'force'
  | 'opted_out'
  | 'missing_snapshot'
  | 'new_signal'
  | 'sharing_changed'
  | 'revocation_changed'
  | 'stale_snapshot'
  | 'no_refresh_needed'

export interface CulinaryProfileRefreshDecision {
  shouldRefresh: boolean
  reason: CulinaryProfileRefreshReason
  nextEligibleAt: string | null
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hoursToMs(hours: number): number {
  return Math.max(0, hours) * 60 * 60 * 1000
}

export function decideCulinaryProfileSnapshotRefresh(input: {
  now: string
  profileOptedOut?: boolean
  force?: boolean
  lastSnapshotGeneratedAt?: string | null
  latestSignalObservedAt?: string | null
  sharingGrantChangedAt?: string | null
  latestRevocationAt?: string | null
  minimumIntervalHours?: number
  staleAfterHours?: number
}): CulinaryProfileRefreshDecision {
  const nowMs = parseTime(input.now) ?? Date.now()
  const lastSnapshotMs = parseTime(input.lastSnapshotGeneratedAt)
  const minimumIntervalMs = hoursToMs(input.minimumIntervalHours ?? 1)
  const staleAfterMs = hoursToMs(input.staleAfterHours ?? 24)
  const nextEligibleAt =
    lastSnapshotMs === null ? null : new Date(lastSnapshotMs + minimumIntervalMs).toISOString()

  if (input.profileOptedOut) {
    return { shouldRefresh: false, reason: 'opted_out', nextEligibleAt }
  }

  if (input.force) {
    return { shouldRefresh: true, reason: 'force', nextEligibleAt: null }
  }

  if (lastSnapshotMs === null) {
    return { shouldRefresh: true, reason: 'missing_snapshot', nextEligibleAt: null }
  }

  const canRefreshByInterval = nowMs >= lastSnapshotMs + minimumIntervalMs
  const sharingGrantChangedAt = parseTime(input.sharingGrantChangedAt)
  if (sharingGrantChangedAt !== null && sharingGrantChangedAt > lastSnapshotMs) {
    return { shouldRefresh: true, reason: 'sharing_changed', nextEligibleAt: null }
  }

  const latestRevocationAt = parseTime(input.latestRevocationAt)
  if (latestRevocationAt !== null && latestRevocationAt > lastSnapshotMs) {
    return { shouldRefresh: true, reason: 'revocation_changed', nextEligibleAt: null }
  }

  const latestSignalObservedAt = parseTime(input.latestSignalObservedAt)
  if (
    latestSignalObservedAt !== null &&
    latestSignalObservedAt > lastSnapshotMs &&
    canRefreshByInterval
  ) {
    return { shouldRefresh: true, reason: 'new_signal', nextEligibleAt: null }
  }

  if (nowMs >= lastSnapshotMs + staleAfterMs) {
    return { shouldRefresh: true, reason: 'stale_snapshot', nextEligibleAt: null }
  }

  return { shouldRefresh: false, reason: 'no_refresh_needed', nextEligibleAt }
}
