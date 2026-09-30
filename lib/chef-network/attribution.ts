export const ATTRIBUTION_DECISION_VERSION = 'chef-network-v1'

export type BookingSourceOwner = 'chefflow' | 'chef' | 'unknown'
export type BookingRoute = 'chefflow' | 'direct'
export type ClientRelationship = 'new' | 'repeat' | 'referral'
export type AttributionStatus = 'commissionable' | 'non_commissionable' | 'needs_review'

export type BookingAttributionInput = {
  sourceOwner: BookingSourceOwner
  bookingRoute: BookingRoute
  relationship: ClientRelationship
  agreementAccepted: boolean
  disputed?: boolean
  chefPriorRelationship?: boolean
  chefflowFirstTouchAt?: string | null
  chefFirstTouchAt?: string | null
}

export type BookingAttributionDecision = {
  status: AttributionStatus
  commissionable: boolean
  reason:
    | 'chefflow_originated_and_processed'
    | 'chef_owned_client'
    | 'chef_prior_relationship'
    | 'direct_booking_outside_chefflow'
    | 'no_accepted_partner_agreement'
    | 'attribution_disputed'
    | 'source_unknown'
    | 'first_touch_conflict'
  decisionVersion: typeof ATTRIBUTION_DECISION_VERSION
}

function toTime(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function decideBookingAttribution(
  input: BookingAttributionInput
): BookingAttributionDecision {
  const base = { decisionVersion: ATTRIBUTION_DECISION_VERSION } as const

  if (input.disputed) {
    return {
      ...base,
      status: 'needs_review',
      commissionable: false,
      reason: 'attribution_disputed',
    }
  }

  if (!input.agreementAccepted) {
    return {
      ...base,
      status: 'non_commissionable',
      commissionable: false,
      reason: 'no_accepted_partner_agreement',
    }
  }

  if (input.chefPriorRelationship) {
    return {
      ...base,
      status: 'non_commissionable',
      commissionable: false,
      reason: 'chef_prior_relationship',
    }
  }

  const chefflowTouch = toTime(input.chefflowFirstTouchAt)
  const chefTouch = toTime(input.chefFirstTouchAt)

  if (chefflowTouch !== null && chefTouch !== null) {
    if (chefTouch < chefflowTouch) {
      return {
        ...base,
        status: 'non_commissionable',
        commissionable: false,
        reason: 'chef_prior_relationship',
      }
    }

    if (chefTouch === chefflowTouch && input.sourceOwner === 'unknown') {
      return {
        ...base,
        status: 'needs_review',
        commissionable: false,
        reason: 'first_touch_conflict',
      }
    }
  }

  if (input.sourceOwner === 'chef') {
    return {
      ...base,
      status: 'non_commissionable',
      commissionable: false,
      reason: 'chef_owned_client',
    }
  }

  if (input.sourceOwner === 'unknown') {
    return {
      ...base,
      status: 'needs_review',
      commissionable: false,
      reason: 'source_unknown',
    }
  }

  if (input.bookingRoute === 'direct') {
    return {
      ...base,
      status: 'non_commissionable',
      commissionable: false,
      reason: 'direct_booking_outside_chefflow',
    }
  }

  return {
    ...base,
    status: 'commissionable',
    commissionable: true,
    reason: 'chefflow_originated_and_processed',
  }
}

export type CommissionInput = {
  serviceSubtotalCents: number
  refundedServiceCents?: number
  commissionRateBps: number
}

export type CommissionResult = {
  basisCents: number
  commissionRateBps: number
  commissionAmountCents: number
  chefServiceRevenueAfterCommissionCents: number
}

function assertWholeCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(label + ' must be a non-negative integer number of cents')
  }
}

export function calculateChefNetworkCommission(input: CommissionInput): CommissionResult {
  assertWholeCents(input.serviceSubtotalCents, 'serviceSubtotalCents')
  assertWholeCents(input.refundedServiceCents ?? 0, 'refundedServiceCents')

  if (
    !Number.isInteger(input.commissionRateBps) ||
    input.commissionRateBps < 0 ||
    input.commissionRateBps > 10000
  ) {
    throw new Error('commissionRateBps must be an integer between 0 and 10000')
  }

  const basisCents = Math.max(0, input.serviceSubtotalCents - (input.refundedServiceCents ?? 0))
  const commissionAmountCents = Math.round((basisCents * input.commissionRateBps) / 10000)

  return {
    basisCents,
    commissionRateBps: input.commissionRateBps,
    commissionAmountCents,
    chefServiceRevenueAfterCommissionCents: basisCents - commissionAmountCents,
  }
}
