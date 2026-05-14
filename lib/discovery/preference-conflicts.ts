import {
  type DerivedPreferenceProfile,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import {
  type FoodTaxonomyKind,
  type NormalizedFoodTaxonomyTerm,
  foodTaxonomyTermsOverlap,
  normalizeFoodTaxonomyTerm,
} from '@/lib/discovery/preference-taxonomy'

export type PreferenceConflictSeverity = 'hard_block' | 'warning'

export type PreferenceConflictType =
  | 'allergy_or_restriction_conflict'
  | 'never_show_conflict'
  | 'opposed_preference'
  | 'heat_preference_conflict'
  | 'candidate_safety_violation'
  | 'candidate_preference_warning'

export interface PreferenceConflict {
  type: PreferenceConflictType
  severity: PreferenceConflictSeverity
  scopeLabel: string
  blockingSignalIds: string[]
  candidateLabel: string | null
  reason: string
}

export interface PreferenceCandidateInput {
  label: string
  terms: Array<{
    value: string
    kind?: FoodTaxonomyKind
  }>
}

function scopeLabel(signal: PreferenceSignalLedgerEntry): string {
  return signal.scope.label ?? signal.scope.level
}

function overlaps(left: PreferenceSignalLedgerEntry, right: PreferenceSignalLedgerEntry): boolean {
  return foodTaxonomyTermsOverlap(left.normalizedTerm, right.normalizedTerm)
}

function candidateOverlaps(term: NormalizedFoodTaxonomyTerm, signal: PreferenceSignalLedgerEntry) {
  return foodTaxonomyTermsOverlap(term, signal.normalizedTerm)
}

function isNoHeat(signal: PreferenceSignalLedgerEntry): boolean {
  return signal.normalizedTerm.canonicalKey === 'tag:no_heat'
}

function isSpicy(signal: PreferenceSignalLedgerEntry): boolean {
  return signal.normalizedTerm.canonicalKey === 'tag:spicy'
}

export function detectPreferenceConflicts(
  profile: DerivedPreferenceProfile,
  candidate?: PreferenceCandidateInput
): PreferenceConflict[] {
  const conflicts: PreferenceConflict[] = []

  for (const positive of profile.positives) {
    for (const hardConstraint of profile.hardConstraints) {
      if (!overlaps(positive, hardConstraint)) continue

      conflicts.push({
        type: 'allergy_or_restriction_conflict',
        severity: 'hard_block',
        scopeLabel: scopeLabel(hardConstraint),
        blockingSignalIds: [positive.id, hardConstraint.id],
        candidateLabel: null,
        reason: `${positive.normalizedTerm.displayLabel} conflicts with ${hardConstraint.normalizedTerm.displayLabel}.`,
      })
    }

    for (const exclusion of profile.exclusions) {
      if (!overlaps(positive, exclusion)) continue

      conflicts.push({
        type: 'never_show_conflict',
        severity: 'hard_block',
        scopeLabel: scopeLabel(exclusion),
        blockingSignalIds: [positive.id, exclusion.id],
        candidateLabel: null,
        reason: `${positive.normalizedTerm.displayLabel} is also marked never-show.`,
      })
    }

    for (const negative of profile.negatives) {
      if (!overlaps(positive, negative)) continue

      conflicts.push({
        type: 'opposed_preference',
        severity: 'warning',
        scopeLabel: scopeLabel(negative),
        blockingSignalIds: [positive.id, negative.id],
        candidateLabel: null,
        reason: `${positive.normalizedTerm.displayLabel} is both liked and disliked.`,
      })
    }
  }

  for (const noHeat of profile.resolved.filter(isNoHeat)) {
    for (const spicy of profile.resolved.filter(isSpicy)) {
      if (noHeat.id === spicy.id) continue
      conflicts.push({
        type: 'heat_preference_conflict',
        severity: 'warning',
        scopeLabel: scopeLabel(noHeat),
        blockingSignalIds: [noHeat.id, spicy.id],
        candidateLabel: null,
        reason: 'Spicy preference conflicts with a no-heat diner preference.',
      })
    }
  }

  if (candidate) {
    const candidateTerms = candidate.terms.map((term) =>
      normalizeFoodTaxonomyTerm(term.value, term.kind)
    )

    for (const term of candidateTerms) {
      for (const hardConstraint of [...profile.hardConstraints, ...profile.exclusions]) {
        if (!candidateOverlaps(term, hardConstraint)) continue

        conflicts.push({
          type: 'candidate_safety_violation',
          severity: 'hard_block',
          scopeLabel: scopeLabel(hardConstraint),
          blockingSignalIds: [hardConstraint.id],
          candidateLabel: candidate.label,
          reason: `${candidate.label} includes ${term.displayLabel}, which conflicts with ${hardConstraint.normalizedTerm.displayLabel}.`,
        })
      }

      for (const negative of profile.negatives) {
        if (!candidateOverlaps(term, negative)) continue

        conflicts.push({
          type: 'candidate_preference_warning',
          severity: 'warning',
          scopeLabel: scopeLabel(negative),
          blockingSignalIds: [negative.id],
          candidateLabel: candidate.label,
          reason: `${candidate.label} includes ${term.displayLabel}, which this profile dislikes.`,
        })
      }
    }
  }

  return conflicts
}
