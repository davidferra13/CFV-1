export type MoneySnapshot = {
  revenueCollectedCents: number | null
  bookedUnpaidCents: number | null
  foodCostCents: number | null
  laborCostCents: number | null
  vendorSpendCents: number | null
  missingReceiptCount: number | null
  overdueInvoiceCount: number | null
}

export type OwnerReportInput = {
  periodStart: string
  periodEnd: string
  money: MoneySnapshot
  eventCount: number | null
  leadCount: number | null
  acceptedBookingCount: number | null
  repeatClientCount: number | null
  averageResponseHours: number | null
  bestMarginEventLabel: string | null
  worstMarginEventLabel: string | null
  capacityWarnings: string[]
  vendorWarnings: string[]
  reputationWarnings: string[]
}

export type OwnerReportCadence = 'monthly' | 'quarterly' | 'yearly'

export type OwnerReport = {
  cadence: OwnerReportCadence
  period: {
    start: string
    end: string
  }
  money: MoneySnapshot
  metrics: {
    eventCount: number | null
    leadCount: number | null
    acceptedBookingCount: number | null
    repeatClientCount: number | null
    averageResponseHours: number | null
  }
  warnings: string[]
  requiredDecisions: string[]
  blockedClaims: string[]
}

function addIfKnown(blockedClaims: string[], label: string, value: unknown): void {
  if (value === null || value === undefined) {
    blockedClaims.push(`${label} unavailable because source data was not provided.`)
  }
}

function marginKnown(input: OwnerReportInput): boolean {
  return input.money.revenueCollectedCents !== null && input.money.foodCostCents !== null
}

export function createOwnerReport(
  input: OwnerReportInput,
  cadence: OwnerReportCadence
): OwnerReport {
  const blockedClaims: string[] = []
  addIfKnown(blockedClaims, 'Revenue collected', input.money.revenueCollectedCents)
  addIfKnown(blockedClaims, 'Booked but unpaid', input.money.bookedUnpaidCents)
  addIfKnown(blockedClaims, 'Food cost', input.money.foodCostCents)
  addIfKnown(blockedClaims, 'Labor cost', input.money.laborCostCents)
  addIfKnown(blockedClaims, 'Event count', input.eventCount)
  addIfKnown(blockedClaims, 'Lead count', input.leadCount)

  const warnings = [
    ...input.capacityWarnings,
    ...input.vendorWarnings,
    ...input.reputationWarnings,
    ...(input.money.missingReceiptCount && input.money.missingReceiptCount > 0
      ? [
          `${input.money.missingReceiptCount} receipt${input.money.missingReceiptCount === 1 ? '' : 's'} missing.`,
        ]
      : []),
    ...(input.money.overdueInvoiceCount && input.money.overdueInvoiceCount > 0
      ? [
          `${input.money.overdueInvoiceCount} overdue invoice${
            input.money.overdueInvoiceCount === 1 ? '' : 's'
          }.`,
        ]
      : []),
  ]

  const requiredDecisions: string[] = []

  if (marginKnown(input) && input.money.revenueCollectedCents! > 0) {
    const foodCostRatio = input.money.foodCostCents! / input.money.revenueCollectedCents!
    if (foodCostRatio >= 0.35)
      requiredDecisions.push('Review pricing or sourcing because food cost ratio is high.')
  }

  if (input.money.bookedUnpaidCents !== null && input.money.bookedUnpaidCents > 0) {
    requiredDecisions.push('Decide which unpaid bookings need payment follow-up.')
  }

  if (input.capacityWarnings.length > 0) {
    requiredDecisions.push(
      'Decide whether to protect capacity, raise minimums, or decline low-fit work.'
    )
  }

  if (input.vendorWarnings.length > 0) {
    requiredDecisions.push('Decide whether to replace, renegotiate, or backup weak vendors.')
  }

  if (cadence !== 'monthly') {
    requiredDecisions.push('Decide which service types should scale, stay, or stop.')
  }

  if (cadence === 'yearly') {
    requiredDecisions.push(
      'Decide whether this business model is giving the chef the life they want.'
    )
  }

  return {
    cadence,
    period: {
      start: input.periodStart,
      end: input.periodEnd,
    },
    money: input.money,
    metrics: {
      eventCount: input.eventCount,
      leadCount: input.leadCount,
      acceptedBookingCount: input.acceptedBookingCount,
      repeatClientCount: input.repeatClientCount,
      averageResponseHours: input.averageResponseHours,
    },
    warnings,
    requiredDecisions,
    blockedClaims,
  }
}
