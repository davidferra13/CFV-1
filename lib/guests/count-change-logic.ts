const CLIENT_MUTABLE_EVENT_STATUSES = ['proposed', 'accepted', 'paid', 'confirmed'] as const

export type GuestCountChangePricing = {
  priceImpactCents: number
  surchargeApplied: boolean
  surchargeCents: number
  totalDeltaCents: number
  protectedByCustomTotal: boolean
}

export type GuestCountChangePolicy = {
  canRequest: boolean
  hasDeadline: boolean
  deadlineDays: number | null
  cutoffAt: string | null
  summary: string
  reason: string | null
}

type GuestCountPricingInput = {
  previousCount: number
  newCount: number
  eventDate: string | null
  quotedPriceCents: number | null
  pricingModel: string | null
  overrideKind: string | null
  pricePerPersonCents: number | null
  now?: Date
}

type GuestCountPolicyInput = {
  eventStatus: string
  eventDate: string | null
  hasDeadline: boolean
  deadlineDays: number | null
  hasPendingRequest: boolean
  now?: Date
}

function clampGuestCountDeadlineDays(days: number | null | undefined): number {
  if (typeof days !== 'number' || Number.isNaN(days)) return 3
  return Math.max(0, Math.round(days))
}

function buildEventCutoff(eventDate: string, deadlineDays: number): Date | null {
  const parsed = new Date(eventDate)
  if (Number.isNaN(parsed.getTime())) return null

  const cutoff = new Date(parsed)
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - deadlineDays)
  return cutoff
}

export function calculateGuestCountPricing(
  input: GuestCountPricingInput
): GuestCountChangePricing {
  const previousCount = Math.max(0, input.previousCount)
  const newCount = Math.max(0, input.newCount)
  const protectedByCustomTotal = input.overrideKind === 'custom_total'

  let priceImpactCents = 0

  if (!protectedByCustomTotal && input.pricingModel === 'per_person' && previousCount > 0) {
    const pricePerPerson =
      typeof input.pricePerPersonCents === 'number' && input.pricePerPersonCents > 0
        ? input.pricePerPersonCents
        : input.quotedPriceCents && input.quotedPriceCents > 0
          ? Math.round(input.quotedPriceCents / previousCount)
          : 0

    priceImpactCents = pricePerPerson * (newCount - previousCount)
  }

  let surchargeApplied = false
  let surchargeCents = 0

  if (input.eventDate) {
    const eventDate = new Date(input.eventDate)
    const now = input.now ?? new Date()
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / 3_600_000
    if (hoursUntilEvent > 0 && hoursUntilEvent <= 72 && newCount > previousCount) {
      surchargeApplied = true
      surchargeCents = Math.round(Math.abs(priceImpactCents) * 0.2)
    }
  }

  return {
    priceImpactCents,
    surchargeApplied,
    surchargeCents,
    totalDeltaCents: priceImpactCents + surchargeCents,
    protectedByCustomTotal,
  }
}

export function evaluateGuestCountChangePolicy(
  input: GuestCountPolicyInput
): GuestCountChangePolicy {
  if (
    !CLIENT_MUTABLE_EVENT_STATUSES.includes(
      input.eventStatus as (typeof CLIENT_MUTABLE_EVENT_STATUSES)[number]
    )
  ) {
    return {
      canRequest: false,
      hasDeadline: Boolean(input.hasDeadline),
      deadlineDays: input.hasDeadline ? clampGuestCountDeadlineDays(input.deadlineDays) : null,
      cutoffAt: null,
      summary: 'Guest-count changes are available on active booked events.',
      reason: 'This booking is no longer eligible for client guest-count requests.',
    }
  }

  if (input.hasPendingRequest) {
    return {
      canRequest: false,
      hasDeadline: Boolean(input.hasDeadline),
      deadlineDays: input.hasDeadline ? clampGuestCountDeadlineDays(input.deadlineDays) : null,
      cutoffAt: null,
      summary: 'A guest-count request is already waiting on chef review.',
      reason: 'Wait for your chef to approve or reject the current request before sending another.',
    }
  }

  if (!input.hasDeadline) {
    return {
      canRequest: true,
      hasDeadline: false,
      deadlineDays: null,
      cutoffAt: null,
      summary: 'Guest-count requests are currently open for this booking.',
      reason: null,
    }
  }

  const deadlineDays = clampGuestCountDeadlineDays(input.deadlineDays)
  if (!input.eventDate) {
    return {
      canRequest: true,
      hasDeadline: true,
      deadlineDays,
      cutoffAt: null,
      summary: `Requests stay open until ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} before the event once the date is finalized.`,
      reason: null,
    }
  }

  const cutoff = buildEventCutoff(input.eventDate, deadlineDays)
  const cutoffAt = cutoff?.toISOString() ?? null

  if (cutoff && (input.now ?? new Date()).getTime() >= cutoff.getTime()) {
    return {
      canRequest: false,
      hasDeadline: true,
      deadlineDays,
      cutoffAt,
      summary: `Guest-count changes close ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} before the event.`,
      reason: 'The guest-count change window has already closed for this booking.',
    }
  }

  return {
    canRequest: true,
    hasDeadline: true,
    deadlineDays,
    cutoffAt,
    summary: `Guest-count changes close ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} before the event.`,
    reason: null,
  }
}

export function hasMaterialGuestCountDrift(previousCount: number, newCount: number): boolean {
  if (previousCount <= 0) return false
  const deltaPercent = (Math.abs(newCount - previousCount) / previousCount) * 100
  return deltaPercent > 10
}
