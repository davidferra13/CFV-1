import type {
  CulinaryProfileAccessContext,
  CulinaryProfileSharingGrantRecord,
} from '@/lib/discovery/profile-sharing-contracts'
import { filterShareableCulinaryProfileSignals } from '@/lib/discovery/profile-sharing-contracts'
import type {
  DerivedPreferenceProfile,
  PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import {
  detectPreferenceConflicts,
  type PreferenceCandidateInput,
} from '@/lib/discovery/preference-conflicts'
import type { DiscoveryConfidenceEvaluation } from '@/lib/discovery/source-governance'
import type { DiscoveryFreshnessEvaluation } from '@/lib/discovery/data-freshness'

export type RemyDietarySafetyLabel = 'probably_fine' | 'needs_confirmation' | 'do_not_recommend'

export type RemyDietaryCandidate = PreferenceCandidateInput & {
  menuConfidence?: Pick<DiscoveryConfidenceEvaluation, 'tier' | 'canSupportStrongClaim'> | null
  menuFreshness?: Pick<DiscoveryFreshnessEvaluation, 'state' | 'canSupportFreshClaim'> | null
  crossContactRisk?: 'none' | 'possible' | 'known' | null
}

export type RemyDietarySafetyTriage = {
  label: RemyDietarySafetyLabel
  candidateLabel: string
  mayRecommend: boolean
  visibleConstraintLabels: string[]
  hiddenConstraintCount: number
  reasons: string[]
  confirmationQuestions: string[]
}

export function triageRemyDietarySafety(input: {
  profile: DerivedPreferenceProfile
  candidate: RemyDietaryCandidate
  sharing?: {
    grants: CulinaryProfileSharingGrantRecord[]
    access: CulinaryProfileAccessContext
  }
}): RemyDietarySafetyTriage {
  const conflicts = detectPreferenceConflicts(input.profile, input.candidate)
  const hardConflicts = conflicts.filter((conflict) => conflict.severity === 'hard_block')
  const warnings = conflicts.filter((conflict) => conflict.severity === 'warning')
  const visible = visibleDietarySignals(input.profile.hardConstraints, input.sharing)
  const reasons: string[] = []
  const confirmationQuestions: string[] = []

  if (hardConflicts.length > 0) {
    reasons.push('Candidate conflicts with a hard allergy, restriction, or never-show rule.')
  }
  if (warnings.length > 0) {
    reasons.push('Candidate has dietary or preference warnings that should be confirmed.')
  }
  if (input.profile.hardConstraints.length > 0 && input.candidate.terms.length === 0) {
    reasons.push(
      'No ingredient or menu terms are available to check against hard dietary constraints.'
    )
    confirmationQuestions.push('Can the operator confirm ingredients and cross-contact handling?')
  }
  if (input.candidate.crossContactRisk === 'known') {
    reasons.push('Known cross-contact risk is present.')
  } else if (input.candidate.crossContactRisk === 'possible') {
    reasons.push('Cross-contact risk is possible and needs operator confirmation.')
    confirmationQuestions.push('Can the kitchen confirm cross-contact controls for this diner?')
  }
  if (input.candidate.menuConfidence && !input.candidate.menuConfidence.canSupportStrongClaim) {
    reasons.push(`Menu proof is only ${input.candidate.menuConfidence.tier}-confidence.`)
    confirmationQuestions.push('Can we verify the current menu before recommending this?')
  }
  if (input.candidate.menuFreshness && !input.candidate.menuFreshness.canSupportFreshClaim) {
    reasons.push(`Menu freshness is ${input.candidate.menuFreshness.state}.`)
    confirmationQuestions.push('Can we confirm the menu is current?')
  }

  const label = resolveDietaryLabel({
    hardConflictCount: hardConflicts.length,
    hasKnownCrossContact: input.candidate.crossContactRisk === 'known',
    needsConfirmation: reasons.length > hardConflicts.length || confirmationQuestions.length > 0,
  })

  return {
    label,
    candidateLabel: input.candidate.label,
    mayRecommend: label !== 'do_not_recommend',
    visibleConstraintLabels: visible.visibleLabels,
    hiddenConstraintCount: visible.hiddenCount,
    reasons: Array.from(new Set(reasons)),
    confirmationQuestions: Array.from(new Set(confirmationQuestions)),
  }
}

function resolveDietaryLabel(input: {
  hardConflictCount: number
  hasKnownCrossContact: boolean
  needsConfirmation: boolean
}): RemyDietarySafetyLabel {
  if (input.hardConflictCount > 0 || input.hasKnownCrossContact) return 'do_not_recommend'
  if (input.needsConfirmation) return 'needs_confirmation'
  return 'probably_fine'
}

function visibleDietarySignals(
  signals: PreferenceSignalLedgerEntry[],
  sharing:
    | {
        grants: CulinaryProfileSharingGrantRecord[]
        access: CulinaryProfileAccessContext
      }
    | undefined
): { visibleLabels: string[]; hiddenCount: number } {
  if (!sharing) {
    return {
      visibleLabels: signals.map((signal) => signal.normalizedTerm.displayLabel),
      hiddenCount: 0,
    }
  }

  const filtered = filterShareableCulinaryProfileSignals({
    signals,
    grants: sharing.grants,
    context: sharing.access,
  })

  return {
    visibleLabels: filtered.allowedSignals.map((signal) => signal.normalizedTerm.displayLabel),
    hiddenCount: signals.length - filtered.allowedSignals.length,
  }
}
