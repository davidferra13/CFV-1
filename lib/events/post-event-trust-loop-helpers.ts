export type ReviewRequestGateInput = {
  completedAt: string | null
  reviewRequestEligible: boolean | null
  reviewRequestSentAt: string | null
}

export type ReviewRequestGateResult = {
  ok: boolean
  reason: 'incomplete' | 'not_eligible' | 'already_sent' | null
}

export function isPositiveSurveyRating(overall: number | null | undefined): boolean {
  return typeof overall === 'number' && overall >= 4
}

export function normalizePublicReviewText(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed
  }

  return null
}

export function shouldPromoteSurveyToPublicReview(args: {
  overall: number | null | undefined
  consent: boolean | null | undefined
  publicReviewText?: string | null | undefined
  fallbackText?: string | null | undefined
}): boolean {
  return Boolean(
    args.consent &&
    isPositiveSurveyRating(args.overall) &&
    normalizePublicReviewText(args.publicReviewText, args.fallbackText)
  )
}

export function getReviewRequestGate(input: ReviewRequestGateInput): ReviewRequestGateResult {
  if (!input.completedAt) {
    return { ok: false, reason: 'incomplete' }
  }

  if (!input.reviewRequestEligible) {
    return { ok: false, reason: 'not_eligible' }
  }

  if (input.reviewRequestSentAt) {
    return { ok: false, reason: 'already_sent' }
  }

  return { ok: true, reason: null }
}

export function booleanToLegacyWouldBookAgain(
  value: boolean | null | undefined
): 'yes' | 'no' | null {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return null
}
