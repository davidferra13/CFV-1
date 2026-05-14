import type {
  DerivedPreferenceProfile,
  PreferenceShareCategory,
  PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import {
  type PersonalizationCandidate,
  type PersonalizationVisibility,
  type TasteScoreContext,
  scoreTasteCandidate,
} from '@/lib/discovery/personalization-scoring'

export type PersonalizationAuditEventKind =
  | 'recommendation_boost'
  | 'recommendation_demotion'
  | 'safety_exclusion'
  | 'context_adjustment'
  | 'recent_profile_change'

export interface PersonalizationAuditEvent {
  kind: PersonalizationAuditEventKind
  severity: 'info' | 'warning' | 'block'
  message: string
  signalId: string | null
  signalLabel: string | null
  source: PreferenceSignalLedgerEntry['source'] | null
  confidence: number | null
  observedAt: string | null
  redacted: boolean
}

export interface PersonalizationAuditTrail {
  ownerId: string
  candidateId: string
  candidateLabel: string
  generatedAt: string
  access: 'allowed' | 'denied'
  visibility: PersonalizationVisibility
  score: {
    totalScore: number
    hidden: boolean
    redactedSignalCount: number
  } | null
  events: PersonalizationAuditEvent[]
}

export interface PersonalizationAuditTrailOptions extends TasteScoreContext {
  generatedAt?: string
  canViewProfile?: boolean
  recentLimit?: number
  allowedShareCategories?: PreferenceShareCategory[]
}

function eventKind(reasonKind: string): PersonalizationAuditEventKind {
  if (reasonKind === 'positive_match') return 'recommendation_boost'
  if (reasonKind === 'negative_match') return 'recommendation_demotion'
  if (reasonKind === 'safety_exclusion') return 'safety_exclusion'
  return 'context_adjustment'
}

function severity(kind: PersonalizationAuditEventKind): PersonalizationAuditEvent['severity'] {
  if (kind === 'safety_exclusion') return 'block'
  if (kind === 'recommendation_demotion') return 'warning'
  return 'info'
}

function visibleForAudit(
  signal: PreferenceSignalLedgerEntry,
  options: PersonalizationAuditTrailOptions | undefined
): boolean {
  if (options?.visibility !== 'chef_shared') return true
  const allowed = options.allowedShareCategories ?? ['chef_visible', 'event_visible']
  return signal.consent.chefSharing && allowed.includes(signal.shareCategory)
}

function newestFirst(
  left: PreferenceSignalLedgerEntry,
  right: PreferenceSignalLedgerEntry
): number {
  return Date.parse(right.observedAt) - Date.parse(left.observedAt)
}

export function buildPersonalizationAuditTrail(
  profile: DerivedPreferenceProfile,
  candidate: PersonalizationCandidate,
  options?: PersonalizationAuditTrailOptions
): PersonalizationAuditTrail {
  const generatedAt = options?.generatedAt ?? new Date().toISOString()
  const visibility = options?.visibility ?? 'client_private'

  if (options?.canViewProfile === false) {
    return {
      ownerId: profile.ownerId,
      candidateId: candidate.id,
      candidateLabel: candidate.label,
      generatedAt,
      access: 'denied',
      visibility,
      score: null,
      events: [],
    }
  }

  const score = scoreTasteCandidate(profile, candidate, { ...options, visibility })
  const signalsById = new Map(profile.allSignals.map((signal) => [signal.id, signal]))
  const reasonEvents: PersonalizationAuditEvent[] = score.reasons.map((reason) => {
    const kind = eventKind(reason.kind)
    const signal = reason.signalId ? signalsById.get(reason.signalId) : null

    return {
      kind,
      severity: severity(kind),
      message: reason.message,
      signalId: reason.signalId,
      signalLabel: reason.signalLabel,
      source: reason.source,
      confidence: reason.confidence,
      observedAt: signal?.observedAt ?? null,
      redacted: reason.redacted,
    }
  })

  const recentEvents = profile.resolved
    .filter((signal) => visibleForAudit(signal, { ...options, visibility }))
    .slice()
    .sort(newestFirst)
    .slice(0, options?.recentLimit ?? 3)
    .map((signal) => ({
      kind: 'recent_profile_change' as const,
      severity: 'info' as const,
      message: `${signal.normalizedTerm.displayLabel} was updated from ${signal.source}.`,
      signalId: signal.id,
      signalLabel: signal.normalizedTerm.displayLabel,
      source: signal.source,
      confidence: signal.confidence,
      observedAt: signal.observedAt,
      redacted: false,
    }))

  return {
    ownerId: profile.ownerId,
    candidateId: candidate.id,
    candidateLabel: candidate.label,
    generatedAt,
    access: 'allowed',
    visibility,
    score: {
      totalScore: score.totalScore,
      hidden: score.hidden,
      redactedSignalCount: score.redactedSignalCount,
    },
    events: [...reasonEvents, ...recentEvents],
  }
}
