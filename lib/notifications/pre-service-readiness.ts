export type PreServiceReadinessInput = {
  eventId: string
  eventTitle: string
  startsAt: string
  addressConfirmed: boolean
  accessNotesConfirmed: boolean
  parkingConfirmed: boolean
  finalGuestCountConfirmed: boolean
  allergyReviewComplete: boolean
  menuApproved: boolean
  paymentClear: boolean
  staffConfirmed: boolean
  shoppingComplete: boolean
  equipmentPacked: boolean
}

export type PreServiceBlockerKind =
  | 'address'
  | 'access'
  | 'parking'
  | 'guest_count'
  | 'allergy'
  | 'menu'
  | 'payment'
  | 'staff'
  | 'shopping'
  | 'equipment'

export type PreServiceBlocker = {
  kind: PreServiceBlockerKind
  label: string
  severity: 'critical' | 'high' | 'medium'
  smsAllowed: boolean
}

export type PreServiceReadinessResult = {
  eventId: string
  ready: boolean
  blockerCount: number
  criticalCount: number
  blockers: PreServiceBlocker[]
  shouldSms: boolean
  shouldPush: boolean
  summary: string
}

const BLOCKER_DEFINITIONS: Array<{
  key: keyof PreServiceReadinessInput
  kind: PreServiceBlockerKind
  label: string
  severity: 'critical' | 'high' | 'medium'
  smsAllowed: boolean
}> = [
  {
    key: 'addressConfirmed',
    kind: 'address',
    label: 'Event address is missing or unconfirmed.',
    severity: 'critical',
    smsAllowed: true,
  },
  {
    key: 'accessNotesConfirmed',
    kind: 'access',
    label: 'Access notes, gate code, elevator, or entry plan is missing.',
    severity: 'critical',
    smsAllowed: true,
  },
  {
    key: 'parkingConfirmed',
    kind: 'parking',
    label: 'Parking or loading plan is missing.',
    severity: 'high',
    smsAllowed: true,
  },
  {
    key: 'finalGuestCountConfirmed',
    kind: 'guest_count',
    label: 'Final guest count is not confirmed.',
    severity: 'high',
    smsAllowed: true,
  },
  {
    key: 'allergyReviewComplete',
    kind: 'allergy',
    label: 'Allergy and dietary review is incomplete.',
    severity: 'critical',
    smsAllowed: true,
  },
  {
    key: 'menuApproved',
    kind: 'menu',
    label: 'Menu approval is incomplete.',
    severity: 'high',
    smsAllowed: false,
  },
  {
    key: 'paymentClear',
    kind: 'payment',
    label: 'Payment is not clear for service.',
    severity: 'critical',
    smsAllowed: true,
  },
  {
    key: 'staffConfirmed',
    kind: 'staff',
    label: 'Staffing is not fully confirmed.',
    severity: 'high',
    smsAllowed: true,
  },
  {
    key: 'shoppingComplete',
    kind: 'shopping',
    label: 'Shopping or sourcing is incomplete.',
    severity: 'high',
    smsAllowed: false,
  },
  {
    key: 'equipmentPacked',
    kind: 'equipment',
    label: 'Equipment checklist is incomplete.',
    severity: 'medium',
    smsAllowed: false,
  },
]

export function evaluatePreServiceReadiness(
  input: PreServiceReadinessInput
): PreServiceReadinessResult {
  const blockers = BLOCKER_DEFINITIONS.filter((definition) => input[definition.key] === false).map(
    ({ kind, label, severity, smsAllowed }) => ({ kind, label, severity, smsAllowed })
  )

  const criticalCount = blockers.filter((blocker) => blocker.severity === 'critical').length
  const shouldSms = blockers.some((blocker) => blocker.smsAllowed && blocker.severity !== 'medium')
  const shouldPush = blockers.length > 0

  return {
    eventId: input.eventId,
    ready: blockers.length === 0,
    blockerCount: blockers.length,
    criticalCount,
    blockers,
    shouldSms,
    shouldPush,
    summary:
      blockers.length === 0
        ? `${input.eventTitle} is pre-service ready.`
        : `${input.eventTitle} has ${blockers.length} pre-service blocker${blockers.length === 1 ? '' : 's'}.`,
  }
}
