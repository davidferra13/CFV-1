import type { RailTier } from '@/lib/discovery/god-mode-types'
import type { EvidenceLabel, LoopState, SourceKind } from '@/lib/operating-loop/types'

export type CommandSurfaceRole =
  | 'chef'
  | 'client'
  | 'staff'
  | 'admin'
  | 'partner'
  | 'developer'
  | 'agent'

export type CommandSurfaceSourceKind = SourceKind | 'pricing' | 'pie'

export type CommandSurfaceRiskZone =
  | 'ready'
  | 'watch'
  | 'synthetic_or_modeled'
  | 'degraded'
  | 'stale'
  | 'missing_proof'
  | 'disputed'
  | 'blocked'

export type CommandSurfacePlaybackMode = 'live' | 'playback'

export interface CommandSurfaceVisibility {
  scope: 'tenant' | 'role' | 'private' | 'system' | 'public'
  tenantId: string | null
  roleAudience: readonly CommandSurfaceRole[]
  ownerId?: string | null
}

export interface CommandSurfacePlayback {
  mode: CommandSurfacePlaybackMode
  readOnly: boolean
  capturedAt?: string | null
  reason?: string | null
}

export interface CommandSurfaceProof {
  id: string
  label: string
  present: boolean
  href: string | null
  evidenceLabel: EvidenceLabel
  confidence: number | null
  observedAt?: string | null
  sourceLabels?: readonly string[]
  visibility: CommandSurfaceVisibility
  metadata?: Record<string, unknown>
}

export interface CommandSurfaceMutationMetadata {
  command: string
  enabled: boolean
  readOnlyBlocked: boolean
  disabledReason?: string | null
}

export interface CommandSurfaceAction {
  id: string
  label: string
  kind: 'navigation' | 'mutation' | 'external'
  href?: string | null
  params?: Record<string, unknown>
  variant?: 'default' | 'destructive' | 'success'
  mutation?: CommandSurfaceMutationMetadata
}

export interface CommandSurfaceRiskSignal {
  zone: CommandSurfaceRiskZone
  reason: string
  source?: string
}

export interface CommandSurfaceItem {
  id: string
  title: string
  description: string | null
  domain: string
  href: string | null
  sourceKind: CommandSurfaceSourceKind
  sourceId?: string | null
  tier?: RailTier
  loopState: LoopState
  evidenceLabel: EvidenceLabel
  confidence: number | null
  proof: CommandSurfaceProof | null
  riskZone: CommandSurfaceRiskZone
  riskSignals: readonly CommandSurfaceRiskSignal[]
  actions: readonly CommandSurfaceAction[]
  visibility: CommandSurfaceVisibility
  playback: CommandSurfacePlayback
  metadata?: Record<string, unknown>
}

export const DEFAULT_COMMAND_SURFACE_VISIBILITY: CommandSurfaceVisibility = {
  scope: 'tenant',
  tenantId: null,
  roleAudience: ['chef'],
}

export const LIVE_COMMAND_SURFACE_PLAYBACK: CommandSurfacePlayback = {
  mode: 'live',
  readOnly: false,
}

const RISK_RANK: Record<CommandSurfaceRiskZone, number> = {
  ready: 0,
  watch: 1,
  synthetic_or_modeled: 2,
  degraded: 3,
  stale: 4,
  missing_proof: 5,
  disputed: 6,
  blocked: 7,
}

export function highestRiskZone(
  signals: readonly CommandSurfaceRiskSignal[],
  fallback: CommandSurfaceRiskZone = 'ready'
): CommandSurfaceRiskZone {
  return signals.reduce<CommandSurfaceRiskZone>(
    (highest, signal) => (RISK_RANK[signal.zone] > RISK_RANK[highest] ? signal.zone : highest),
    fallback
  )
}

export function uniqueRiskSignals(
  signals: readonly CommandSurfaceRiskSignal[]
): CommandSurfaceRiskSignal[] {
  const seen = new Set<string>()
  const result: CommandSurfaceRiskSignal[] = []

  for (const signal of signals) {
    const key = `${signal.zone}:${signal.reason}:${signal.source ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(signal)
  }

  return result
}

export function commandSurfacePlayback(
  playback: Partial<CommandSurfacePlayback> = {}
): CommandSurfacePlayback {
  const mode = playback.mode ?? LIVE_COMMAND_SURFACE_PLAYBACK.mode
  const readOnly = playback.readOnly ?? mode === 'playback'

  return {
    mode,
    readOnly,
    capturedAt: playback.capturedAt ?? null,
    reason: playback.reason ?? null,
  }
}

export function applyPlaybackToActions(
  actions: readonly CommandSurfaceAction[],
  playback: CommandSurfacePlayback
): CommandSurfaceAction[] {
  return actions.map((action) => {
    if (action.kind !== 'mutation' || !action.mutation) return action

    const readOnlyBlocked = playback.readOnly || action.mutation.readOnlyBlocked
    return {
      ...action,
      mutation: {
        ...action.mutation,
        enabled: action.mutation.enabled && !readOnlyBlocked,
        readOnlyBlocked,
        disabledReason: readOnlyBlocked
          ? (playback.reason ?? 'Playback is read-only.')
          : (action.mutation.disabledReason ?? null),
      },
    }
  })
}

export function isCriticalCommandSurfaceItem(item: Pick<CommandSurfaceItem, 'tier'>): boolean {
  return item.tier === 'p0' || item.tier === 'p1'
}
