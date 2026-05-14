import type { DiscoveryConfidenceEvaluation } from '@/lib/discovery/source-governance'
import type { DiscoveryFreshnessEvaluation } from '@/lib/discovery/data-freshness'

export type RemyBudgetIntentMode =
  | 'all_in_cap'
  | 'per_person_cap'
  | 'before_fees_cap'
  | 'splurge'
  | 'value_special'
  | 'avoid_surprise_fees'
  | 'ambiguous_cap'

export type RemyBudgetIntent = {
  mode: RemyBudgetIntentMode
  amountCents: number | null
  hardCap: boolean
  feeSensitive: boolean
  requiresClarification: boolean
  clarificationQuestion: string | null
}

export type RemyBudgetCandidate = {
  label: string
  estimatedSubtotalCents?: number | null
  estimatedAllInCents?: number | null
  estimatedPerPersonCents?: number | null
  knownFeesCents?: number | null
  hasUnknownFees?: boolean
  priceConfidence?: Pick<DiscoveryConfidenceEvaluation, 'tier' | 'canSupportStrongClaim'> | null
  priceFreshness?: Pick<DiscoveryFreshnessEvaluation, 'state' | 'canSupportFreshClaim'> | null
}

export type RemyBudgetFit = {
  candidateLabel: string
  status: 'fits' | 'maybe_fits' | 'does_not_fit' | 'needs_clarification'
  canClaimAllInFit: boolean
  confidence: 'confirmed' | 'plausible' | 'weak' | 'unknown'
  warnings: string[]
}

export function parseRemyBudgetIntent(phrase: string): RemyBudgetIntent {
  const normalized = phrase.toLowerCase()
  const amount = normalized.match(
    /(?:under|below|less than|cap(?:ped)? at|max(?:imum)?|up to)\s*\$?(\d+)/
  )
  const amountCents = amount ? Number(amount[1]) * 100 : null
  const feeSensitive = /all[- ]?in|fees?|tax|tip|surprise/.test(normalized)

  if (/worth\s+(a\s+)?splurg|splurge/.test(normalized)) {
    return intent('splurge', null, false, feeSensitive, false, null)
  }
  if (/cheap.*special|special.*cheap|value|deal/.test(normalized)) {
    return intent('value_special', amountCents, Boolean(amountCents), feeSensitive, false, null)
  }
  if (amountCents !== null && /per person|pp|each/.test(normalized)) {
    return intent('per_person_cap', amountCents, true, feeSensitive, false, null)
  }
  if (amountCents !== null && /all[- ]?in|after (tax|tip|fees?)/.test(normalized)) {
    return intent('all_in_cap', amountCents, true, true, false, null)
  }
  if (amountCents !== null && /before (tax|tip|fees?)|subtotal/.test(normalized)) {
    return intent('before_fees_cap', amountCents, true, false, false, null)
  }
  if (/avoid.*surprise|surprise.*fees?/.test(normalized)) {
    return intent('avoid_surprise_fees', amountCents, Boolean(amountCents), true, false, null)
  }
  if (amountCents !== null) {
    return intent(
      'ambiguous_cap',
      amountCents,
      true,
      feeSensitive,
      true,
      'Is that budget per person, all-in, or before tax, tip, and fees?'
    )
  }

  return intent(
    'ambiguous_cap',
    null,
    false,
    feeSensitive,
    true,
    'What budget should I protect, and should it be all-in or per person?'
  )
}

export function evaluateRemyBudgetFit(input: {
  intent: RemyBudgetIntent
  candidate: RemyBudgetCandidate
}): RemyBudgetFit {
  const warnings = budgetWarnings(input.candidate)
  const proofStrong = Boolean(input.candidate.priceConfidence?.canSupportStrongClaim)

  if (input.intent.requiresClarification) {
    return fit(input.candidate.label, 'needs_clarification', false, 'unknown', [
      input.intent.clarificationQuestion ?? 'Budget semantics are unclear.',
      ...warnings,
    ])
  }

  if (input.intent.mode === 'splurge') {
    return fit(
      input.candidate.label,
      'maybe_fits',
      false,
      proofStrong ? 'plausible' : 'weak',
      warnings
    )
  }

  if (input.intent.mode === 'avoid_surprise_fees') {
    return fit(
      input.candidate.label,
      input.candidate.hasUnknownFees ? 'maybe_fits' : 'fits',
      false,
      proofStrong && !input.candidate.hasUnknownFees ? 'confirmed' : 'weak',
      input.candidate.hasUnknownFees
        ? ['Unknown fees are present; do not present this as fee-safe.', ...warnings]
        : warnings
    )
  }

  const measured = measuredBudgetCents(input.intent.mode, input.candidate)
  if (input.intent.amountCents === null || measured === null) {
    return fit(input.candidate.label, 'maybe_fits', false, 'unknown', [
      'Price data is missing for this budget mode.',
      ...warnings,
    ])
  }

  const withinCap = measured <= input.intent.amountCents
  const status = withinCap ? (proofStrong ? 'fits' : 'maybe_fits') : 'does_not_fit'
  const canClaimAllInFit =
    input.intent.mode === 'all_in_cap' &&
    withinCap &&
    proofStrong &&
    input.candidate.estimatedAllInCents !== null &&
    input.candidate.estimatedAllInCents !== undefined &&
    !input.candidate.hasUnknownFees

  return fit(
    input.candidate.label,
    status,
    canClaimAllInFit,
    proofStrong ? 'confirmed' : 'weak',
    withinCap && !proofStrong
      ? ['Do not claim firm budget fit without stronger price proof.', ...warnings]
      : warnings
  )
}

function budgetWarnings(candidate: RemyBudgetCandidate): string[] {
  const warnings: string[] = []
  if (candidate.hasUnknownFees) warnings.push('Unknown fees may change the actual total.')
  if (candidate.priceConfidence && !candidate.priceConfidence.canSupportStrongClaim) {
    warnings.push(`Price proof is ${candidate.priceConfidence.tier}-confidence.`)
  }
  if (candidate.priceFreshness && !candidate.priceFreshness.canSupportFreshClaim) {
    warnings.push(`Price freshness is ${candidate.priceFreshness.state}.`)
  }
  return warnings
}

function measuredBudgetCents(
  mode: RemyBudgetIntentMode,
  candidate: RemyBudgetCandidate
): number | null {
  if (mode === 'all_in_cap') return candidate.estimatedAllInCents ?? null
  if (mode === 'per_person_cap') return candidate.estimatedPerPersonCents ?? null
  if (mode === 'before_fees_cap') return candidate.estimatedSubtotalCents ?? null
  if (mode === 'value_special') {
    return candidate.estimatedAllInCents ?? candidate.estimatedSubtotalCents ?? null
  }
  return null
}

function intent(
  mode: RemyBudgetIntentMode,
  amountCents: number | null,
  hardCap: boolean,
  feeSensitive: boolean,
  requiresClarification: boolean,
  clarificationQuestion: string | null
): RemyBudgetIntent {
  return { mode, amountCents, hardCap, feeSensitive, requiresClarification, clarificationQuestion }
}

function fit(
  candidateLabel: string,
  status: RemyBudgetFit['status'],
  canClaimAllInFit: boolean,
  confidence: RemyBudgetFit['confidence'],
  warnings: string[]
): RemyBudgetFit {
  return {
    candidateLabel,
    status,
    canClaimAllInFit,
    confidence,
    warnings: Array.from(new Set(warnings)),
  }
}
