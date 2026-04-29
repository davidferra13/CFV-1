export type PublicBookingProofStatus =
  | 'missing'
  | 'system_evidence'
  | 'operator_review'
  | 'verified'

export type PublicBookingProofFacts = {
  totalTests: number
  nonDeveloperConfirmedCount?: number | null
  nonDeveloperConfirmed?: boolean | null
  latestSubmittedAt?: string | null
  hasStatusPageEvidence: boolean
  matchedChefCount?: number | null
  unresolvedFollowup: number
  href?: string | null
}

export type PublicBookingProofSummary = {
  status: PublicBookingProofStatus
  evidence: string
  nextStep: string
  href: string
}

export const DEFAULT_PUBLIC_BOOKING_PROOF_HREF = '/admin/launch-readiness'

function normalizeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function hasNonDeveloperConfirmation(facts: PublicBookingProofFacts): boolean {
  if (facts.nonDeveloperConfirmed === true) return true
  return normalizeCount(facts.nonDeveloperConfirmedCount) > 0
}

function buildEvidence(facts: PublicBookingProofFacts): string {
  const totalTests = normalizeCount(facts.totalTests)
  const confirmedCount = normalizeCount(facts.nonDeveloperConfirmedCount)
  const matchedChefCount =
    facts.matchedChefCount === null || facts.matchedChefCount === undefined
      ? null
      : normalizeCount(facts.matchedChefCount)
  const unresolvedFollowup = normalizeCount(facts.unresolvedFollowup)
  const nonDeveloperConfirmed = hasNonDeveloperConfirmation(facts)

  const parts = [countLabel(totalTests, 'public booking test exists', 'public booking tests exist')]

  if (facts.latestSubmittedAt) {
    parts.push(`latest submitted at ${facts.latestSubmittedAt}`)
  }

  if (nonDeveloperConfirmed) {
    parts.push(
      facts.nonDeveloperConfirmed === true
        ? 'non-developer tester manually confirmed'
        : countLabel(
            confirmedCount,
            'non-developer confirmation exists',
            'non-developer confirmations exist'
          )
    )
  } else {
    parts.push('non-developer tester not confirmed')
  }

  parts.push(
    facts.hasStatusPageEvidence ? 'status page evidence captured' : 'status page evidence missing'
  )

  if (matchedChefCount === null) {
    parts.push('matched chef count not provided')
  } else {
    parts.push(countLabel(matchedChefCount, 'matched chef', 'matched chefs'))
  }

  parts.push(
    unresolvedFollowup === 0
      ? 'no unresolved follow-up'
      : countLabel(unresolvedFollowup, 'unresolved follow-up', 'unresolved follow-ups')
  )

  return parts.join('; ')
}

function resolveNextStep(facts: PublicBookingProofFacts, status: PublicBookingProofStatus): string {
  const totalTests = normalizeCount(facts.totalTests)
  const matchedChefCount =
    facts.matchedChefCount === null || facts.matchedChefCount === undefined
      ? null
      : normalizeCount(facts.matchedChefCount)
  const unresolvedFollowup = normalizeCount(facts.unresolvedFollowup)

  if (status === 'verified') {
    return 'Public booking proof is verified.'
  }

  if (status === 'missing') {
    return 'Capture one public booking test from the public booking flow.'
  }

  if (!hasNonDeveloperConfirmation(facts)) {
    return totalTests > 0
      ? 'Confirm the tester was not a developer and attach the operator decision.'
      : 'Capture one submitted public booking test, then confirm the tester was not a developer.'
  }

  if (totalTests === 0) {
    return 'Capture one submitted public booking test tied to the confirmed tester.'
  }

  if (!facts.hasStatusPageEvidence) {
    return 'Attach status page evidence for the submitted public booking test.'
  }

  if (matchedChefCount === 0) {
    return 'Match the public booking test to a chef before marking proof verified.'
  }

  if (unresolvedFollowup > 0) {
    return `Resolve ${countLabel(
      unresolvedFollowup,
      'follow-up item',
      'follow-up items'
    )} before marking public booking proof verified.`
  }

  return 'Review the submitted public booking proof and record the operator decision.'
}

export function summarizePublicBookingProof(
  facts: PublicBookingProofFacts
): PublicBookingProofSummary {
  const totalTests = normalizeCount(facts.totalTests)
  const matchedChefCount =
    facts.matchedChefCount === null || facts.matchedChefCount === undefined
      ? null
      : normalizeCount(facts.matchedChefCount)
  const unresolvedFollowup = normalizeCount(facts.unresolvedFollowup)
  const hasSystemEvidence = totalTests > 0 || facts.hasStatusPageEvidence
  const nonDeveloperConfirmed = hasNonDeveloperConfirmation(facts)
  const hasMatchedChefEvidence = matchedChefCount === null || matchedChefCount > 0

  let status: PublicBookingProofStatus

  if (!hasSystemEvidence) {
    status = 'missing'
  } else if (!nonDeveloperConfirmed) {
    status = 'system_evidence'
  } else if (
    totalTests === 0 ||
    !facts.hasStatusPageEvidence ||
    !hasMatchedChefEvidence ||
    unresolvedFollowup > 0
  ) {
    status = 'operator_review'
  } else {
    status = 'verified'
  }

  return {
    status,
    evidence: buildEvidence(facts),
    nextStep: resolveNextStep(facts, status),
    href: facts.href ?? DEFAULT_PUBLIC_BOOKING_PROOF_HREF,
  }
}
