import type {
  DiscoveryConfidenceEvaluation,
  DiscoveryConfidenceField,
} from '@/lib/discovery/source-governance'
import type { DiscoveryFreshnessEvaluation } from '@/lib/discovery/data-freshness'

export type RemyExplanationSignalKind =
  | 'saved'
  | 'pinned'
  | 'nearby'
  | 'group_size'
  | 'dietary'
  | 'circle_momentum'
  | 'freshness'
  | 'source_confidence'
  | 'availability'
  | 'budget'
  | 'broad_match'

export type RemyExplanationCertainty = 'high' | 'medium' | 'limited'

export type RemyExplanationSignal = {
  id: string
  kind: RemyExplanationSignalKind
  label: string
  detail: string
  field?: DiscoveryConfidenceField
  confidence?: Pick<DiscoveryConfidenceEvaluation, 'tier' | 'canSupportStrongClaim' | 'reasons'>
  freshness?: Pick<DiscoveryFreshnessEvaluation, 'state' | 'canSupportFreshClaim' | 'reason'>
  visibility?: 'public' | 'personal' | 'circle_summary' | 'private'
  allowed: boolean
}

export type RemyProofAwareRailExplanation = {
  candidateId: string
  candidateLabel: string
  certainty: RemyExplanationCertainty
  signals: Array<{
    id: string
    kind: RemyExplanationSignalKind
    label: string
    detail: string
  }>
  redactedSignalCount: number
  proofWarnings: string[]
  answer: string
}

export function buildProofAwareRailExplanation(input: {
  candidateId: string
  candidateLabel: string
  signals: readonly RemyExplanationSignal[]
  maxSignals?: number
}): RemyProofAwareRailExplanation {
  const allowedSignals = input.signals
    .filter((signal) => signal.allowed && signal.visibility !== 'private')
    .slice(0, input.maxSignals ?? 4)
  const redactedSignalCount = input.signals.length - allowedSignals.length
  const proofWarnings = buildProofWarnings(allowedSignals, redactedSignalCount)
  const certainty = resolveExplanationCertainty(allowedSignals, proofWarnings)

  return {
    candidateId: input.candidateId,
    candidateLabel: input.candidateLabel,
    certainty,
    signals: allowedSignals.map((signal) => ({
      id: signal.id,
      kind: signal.kind,
      label: signal.label,
      detail: signal.detail,
    })),
    redactedSignalCount,
    proofWarnings,
    answer: buildExplanationAnswer(input.candidateLabel, allowedSignals, certainty, proofWarnings),
  }
}

function buildProofWarnings(
  signals: readonly RemyExplanationSignal[],
  redactedSignalCount: number
): string[] {
  const warnings: string[] = []

  if (signals.length === 0) {
    warnings.push('I do not have approved backing signals for this recommendation yet.')
  }
  if (redactedSignalCount > 0) {
    warnings.push('Some private or unauthorized signals were withheld from this explanation.')
  }

  for (const signal of signals) {
    if (signal.confidence && !signal.confidence.canSupportStrongClaim) {
      warnings.push(
        `${signal.label} is ${signal.confidence.tier}-confidence and cannot support a strong claim.`
      )
    }
    if (signal.freshness && !signal.freshness.canSupportFreshClaim) {
      warnings.push(
        `${signal.label} freshness is ${signal.freshness.state}: ${signal.freshness.reason}`
      )
    }
  }

  return Array.from(new Set(warnings))
}

function resolveExplanationCertainty(
  signals: readonly RemyExplanationSignal[],
  proofWarnings: readonly string[]
): RemyExplanationCertainty {
  if (signals.length === 0) return 'limited'

  const strongSignals = signals.filter((signal) => signal.confidence?.canSupportStrongClaim).length
  const weakProof = signals.some(
    (signal) =>
      signal.confidence?.tier === 'low' ||
      signal.confidence?.tier === 'unknown' ||
      signal.freshness?.state === 'stale' ||
      signal.freshness?.state === 'unknown' ||
      signal.freshness?.state === 'invalid'
  )

  if (strongSignals >= 2 && proofWarnings.length === 0) return 'high'
  if (weakProof || proofWarnings.length > 1) return 'limited'
  return 'medium'
}

function buildExplanationAnswer(
  candidateLabel: string,
  signals: readonly RemyExplanationSignal[],
  certainty: RemyExplanationCertainty,
  proofWarnings: readonly string[]
): string {
  const prefix =
    certainty === 'high'
      ? `${candidateLabel} is showing because`
      : certainty === 'medium'
        ? `${candidateLabel} is likely showing because`
        : `${candidateLabel} may be showing because`
  const signalText =
    signals.length > 0
      ? signals.map((signal) => `${signal.label}: ${signal.detail}`).join('; ')
      : 'the rail only has broad fallback context'
  const warningText =
    proofWarnings.length > 0 ? ` Proof limits: ${proofWarnings.slice(0, 2).join(' ')}` : ''

  return `${prefix} ${signalText}.${warningText}`.trim()
}
