import { formatCentsAsDollars, type PricingBreakdown, type ServiceType } from './compute'
import { WEEKLY_RATES, MINIMUM_BOOKING_CENTS } from './constants'
import type { PricingEvaluationInput, PricingRangeSide } from './evaluate'

// Use the same chef configuration and computed payment policy as the high side.
export function computeWeeklyRange(
  input: PricingEvaluationInput,
  breakdown: PricingBreakdown
): { hasRange: boolean; low?: PricingRangeSide; high?: PricingRangeSide } {
  const weeklyRangeTypes: ServiceType[] = ['weekly_standard', 'weekly_commitment']

  // Only weekly services with a computable service fee get a range
  if (
    !weeklyRangeTypes.includes(input.serviceType) ||
    breakdown.requiresCustomPricing ||
    breakdown.serviceFeeCents === 0
  ) {
    return { hasRange: false }
  }

  const config = input.config
  const rates =
    input.serviceType === 'weekly_standard'
      ? {
          min: config?.weekly_standard_min ?? WEEKLY_RATES.standard_day.min,
          max: config?.weekly_standard_max ?? WEEKLY_RATES.standard_day.max,
        }
      : {
          min: config?.weekly_commit_min ?? WEEKLY_RATES.commitment_day.min,
          max: config?.weekly_commit_max ?? WEEKLY_RATES.commitment_day.max,
        }
  const minimum = config?.minimum_booking_cents ?? MINIMUM_BOOKING_CENTS

  const days = breakdown.numberOfDays

  // The breakdown was computed using the max rate; the high side mirrors it exactly.
  const high: PricingRangeSide = {
    label: 'high',
    dayRateCents: rates.max,
    serviceFeeCents: breakdown.serviceFeeCents,
    subtotalCents: breakdown.subtotalCents,
    totalServiceCents: breakdown.totalServiceCents,
    depositCents: breakdown.depositCents,
    balanceCents: breakdown.totalServiceCents - breakdown.depositCents,
    rateDescription: `${formatCentsAsDollars(rates.max)}/day × ${days} day${days > 1 ? 's' : ''} = ${formatCentsAsDollars(breakdown.serviceFeeCents)}`,
  }

  // Compute the low side by scaling all premium amounts proportionally.
  // This is valid because weekend premium and holiday premiums are both
  // percentage-based on serviceFeeCents, so they scale linearly with the day rate.
  const lowServiceFee = rates.min * days
  const scalingFactor = lowServiceFee / breakdown.serviceFeeCents // always ≤ 1

  const lowWeekendPremium = Math.round(breakdown.weekendPremiumCents * scalingFactor)
  const lowHolidayPremium = Math.round(breakdown.holidayPremiumCents * scalingFactor)
  const lowNearHolidayPremium = Math.round(breakdown.nearHolidayPremiumCents * scalingFactor)
  const lowSubtotal = lowServiceFee + lowWeekendPremium + lowHolidayPremium + lowNearHolidayPremium

  // Travel and add-ons are fixed (do not change with day rate choice)
  const lowPreTotal = lowSubtotal + breakdown.travelFeeCents + breakdown.addOnTotalCents

  // Apply minimum booking floor if needed (same rule as in computePricing)
  const lowTotal =
    lowSubtotal > 0 && lowSubtotal < minimum
      ? minimum + breakdown.travelFeeCents + breakdown.addOnTotalCents
      : lowPreTotal

  const lowDeposit = Math.round(lowTotal * (breakdown.depositPercent / 100))

  const low: PricingRangeSide = {
    label: 'low',
    dayRateCents: rates.min,
    serviceFeeCents: lowServiceFee,
    subtotalCents: lowSubtotal,
    totalServiceCents: lowTotal,
    depositCents: lowDeposit,
    balanceCents: lowTotal - lowDeposit,
    rateDescription: `${formatCentsAsDollars(rates.min)}/day × ${days} day${days > 1 ? 's' : ''} = ${formatCentsAsDollars(lowServiceFee)}`,
  }

  return { hasRange: true, low, high }
}
