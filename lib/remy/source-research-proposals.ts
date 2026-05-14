import {
  evaluateDiscoveryImageQuality,
  type DiscoveryImageQualityInput,
} from '@/lib/discovery/quality-gates'
import type {
  DiscoveryConfidenceEvaluation,
  DiscoveryConfidenceField,
  ExternalMenuReadModel,
} from '@/lib/discovery/source-governance'
import type { DiscoveryFreshnessEvaluation } from '@/lib/discovery/data-freshness'

export type RemyResearchGapKind =
  | 'menu_proof'
  | 'price_proof'
  | 'availability_proof'
  | 'photo_proof'
  | 'operator_profile'
  | 'public_proof'
  | 'freshness_proof'

export type RemyResearchGap = {
  kind: RemyResearchGapKind
  severity: 'blocker' | 'warning'
  reason: string
}

export type RemySourceCandidate = {
  id: string
  label: string
  menu?: ExternalMenuReadModel | null
  fieldConfidence?: Partial<
    Record<
      DiscoveryConfidenceField,
      Pick<DiscoveryConfidenceEvaluation, 'tier' | 'canSupportStrongClaim'>
    >
  > | null
  freshness?: Partial<
    Record<
      DiscoveryConfidenceField,
      Pick<DiscoveryFreshnessEvaluation, 'state' | 'canSupportFreshClaim'>
    >
  > | null
  photos?: DiscoveryImageQualityInput[]
}

export type RemyResearchProposal = {
  id: string
  candidateId: string
  candidateLabel: string
  status: 'requires_user_approval' | 'not_needed'
  gaps: RemyResearchGap[]
  tasks: Array<{
    id: string
    label: string
    targetGap: RemyResearchGapKind
    requiresApproval: true
  }>
  prompt: string | null
}

export type RemyResearchResult =
  | {
      status: 'succeeded'
      sourceLabels: string[]
      newConfidence: Pick<DiscoveryConfidenceEvaluation, 'tier' | 'canSupportStrongClaim'>
    }
  | {
      status: 'failed'
      reason: string
    }

export function detectRemySourceGaps(candidate: RemySourceCandidate): RemyResearchGap[] {
  const gaps: RemyResearchGap[] = []

  if (!candidate.menu || candidate.menu.status === 'no_menu') {
    gaps.push(gap('menu_proof', 'blocker', 'No current menu proof is attached.'))
  } else if (
    candidate.menu.status === 'link_only' ||
    candidate.menu.status === 'metadata_stale' ||
    candidate.menu.status === 'suppressed'
  ) {
    gaps.push(gap('menu_proof', 'warning', `Menu proof is ${candidate.menu.status}.`))
  }

  for (const field of ['price', 'availability', 'operator_identity'] as const) {
    const confidence = candidate.fieldConfidence?.[field]
    if (!confidence || !confidence.canSupportStrongClaim) {
      gaps.push(
        gap(
          field === 'price'
            ? 'price_proof'
            : field === 'availability'
              ? 'availability_proof'
              : 'operator_profile',
          field === 'price' || field === 'availability' ? 'warning' : 'blocker',
          `${field.replace('_', ' ')} proof is ${confidence?.tier ?? 'unknown'}-confidence.`
        )
      )
    }
  }

  for (const [field, freshness] of Object.entries(candidate.freshness ?? {})) {
    if (freshness && !freshness.canSupportFreshClaim) {
      gaps.push(gap('freshness_proof', 'warning', `${field} freshness is ${freshness.state}.`))
    }
  }

  const photoReports = (candidate.photos ?? []).map(evaluateDiscoveryImageQuality)
  if (photoReports.some((report) => !report.passed)) {
    gaps.push(
      gap('photo_proof', 'warning', 'Photo proof is missing, low-quality, or low-confidence.')
    )
  }

  return dedupeGaps(gaps)
}

export function proposeRemyOperatorResearch(candidate: RemySourceCandidate): RemyResearchProposal {
  const gaps = detectRemySourceGaps(candidate)
  const tasks = gaps.map((researchGap) => ({
    id: `${candidate.id}:${researchGap.kind}`,
    label: researchTaskLabel(researchGap.kind),
    targetGap: researchGap.kind,
    requiresApproval: true as const,
  }))

  return {
    id: `remy-research:${candidate.id}`,
    candidateId: candidate.id,
    candidateLabel: candidate.label,
    status: gaps.length > 0 ? 'requires_user_approval' : 'not_needed',
    gaps,
    tasks,
    prompt:
      gaps.length > 0
        ? `This looks promising, but I am missing ${gaps[0].kind.replace('_', ' ')}. Want me to research it before we shortlist?`
        : null,
  }
}

export function buildRemySourceUpgradePrompt(candidate: RemySourceCandidate): {
  shouldPrompt: boolean
  prompt: string | null
  proposal: RemyResearchProposal
} {
  const proposal = proposeRemyOperatorResearch(candidate)

  return {
    shouldPrompt: proposal.status === 'requires_user_approval',
    prompt: proposal.prompt,
    proposal,
  }
}

export function applyRemyResearchResultToConfidence(input: {
  currentConfidence: Pick<DiscoveryConfidenceEvaluation, 'score' | 'tier' | 'canSupportStrongClaim'>
  result: RemyResearchResult
}): {
  confidence: Pick<DiscoveryConfidenceEvaluation, 'score' | 'tier' | 'canSupportStrongClaim'>
  sourceLabels: string[]
  warnings: string[]
} {
  if (input.result.status === 'failed') {
    return {
      confidence: {
        ...input.currentConfidence,
        canSupportStrongClaim: false,
      },
      sourceLabels: [],
      warnings: [`Research failed: ${input.result.reason}`],
    }
  }

  return {
    confidence: {
      score: input.result.newConfidence.canSupportStrongClaim
        ? Math.max(input.currentConfidence.score, 0.78)
        : input.currentConfidence.score,
      tier: input.result.newConfidence.tier,
      canSupportStrongClaim: input.result.newConfidence.canSupportStrongClaim,
    },
    sourceLabels: input.result.sourceLabels,
    warnings: input.result.newConfidence.canSupportStrongClaim
      ? []
      : ['Research completed, but the new source still cannot support a strong claim.'],
  }
}

function gap(
  kind: RemyResearchGapKind,
  severity: RemyResearchGap['severity'],
  reason: string
): RemyResearchGap {
  return { kind, severity, reason }
}

function dedupeGaps(gaps: RemyResearchGap[]): RemyResearchGap[] {
  const byKind = new Map<RemyResearchGapKind, RemyResearchGap>()
  for (const researchGap of gaps) {
    const current = byKind.get(researchGap.kind)
    if (!current || researchGap.severity === 'blocker') byKind.set(researchGap.kind, researchGap)
  }
  return [...byKind.values()]
}

function researchTaskLabel(kind: RemyResearchGapKind): string {
  switch (kind) {
    case 'menu_proof':
      return 'Verify current menu proof'
    case 'price_proof':
      return 'Verify current prices and fees'
    case 'availability_proof':
      return 'Verify availability'
    case 'photo_proof':
      return 'Find usable public photo proof'
    case 'operator_profile':
      return 'Verify operator identity and profile'
    case 'public_proof':
      return 'Find public proof'
    case 'freshness_proof':
      return 'Refresh stale source data'
  }
}
