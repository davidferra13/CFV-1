// True Plate Cost Calculator
// Deterministic formula for calculating the REAL cost per plate,
// including ingredients, labor, travel, and overhead.
// No AI needed. Pure math.

// ── Types ────────────────────────────────────────────────────────────

export interface TruePlateCostInput {
  ingredientCostCents: number // total recipe ingredient cost for the menu
  guestCount: number // number of guests
  laborHours: number // prep + service hours
  hourlyRateCents: number // chef's hourly rate in cents
  travelMiles: number // round-trip miles to venue
  mileageRateCents: number // per-mile cost in cents (IRS rate or chef config)
  overheadPercent: number // overhead as percentage of ingredient cost (e.g. 15 = 15%)
  quotedPriceCents?: number // optional: event quoted price for margin calculation
}

export interface TruePlateCost {
  ingredientPerPlateCents: number
  laborPerPlateCents: number
  travelPerPlateCents: number
  overheadPerPlateCents: number
  totalPerPlateCents: number
  totalCostCents: number // totalPerPlate * guestCount
  marginPercent: number | null // (quoted - total) / quoted * 100, null if no quoted price
}

// ── Constants ────────────────────────────────────────────────────────

/** IRS standard mileage rate for 2026: 70 cents/mile */
export const IRS_MILEAGE_RATE_CENTS_2026 = 70

/** Default overhead percentage (15%) */
export const DEFAULT_OVERHEAD_PERCENT = 15

/** Default hourly rate: $50/hr = 5000 cents */
export const DEFAULT_HOURLY_RATE_CENTS = 5000

// ── Calculator ───────────────────────────────────────────────────────

/**
 * Calculates the true cost per plate including all cost components.
 * All monetary results are rounded to the nearest cent.
 *
 * Returns zero-safe results: if guestCount is 0 or negative,
 * all per-plate values return 0 to avoid division errors.
 */
export function calculateTruePlateCost(input: TruePlateCostInput): TruePlateCost {
  const {
    ingredientCostCents,
    guestCount,
    laborHours,
    hourlyRateCents,
    travelMiles,
    mileageRateCents,
    overheadPercent,
    quotedPriceCents,
  } = input

  // Guard against division by zero
  if (guestCount <= 0) {
    return {
      ingredientPerPlateCents: 0,
      laborPerPlateCents: 0,
      travelPerPlateCents: 0,
      overheadPerPlateCents: 0,
      totalPerPlateCents: 0,
      totalCostCents: 0,
      marginPercent: null,
    }
  }

  const ingredientPerPlate = ingredientCostCents / guestCount
  const laborPerPlate = (laborHours * hourlyRateCents) / guestCount
  const travelPerPlate = (travelMiles * mileageRateCents) / guestCount
  const overheadPerPlate = (ingredientCostCents * overheadPercent) / 100 / guestCount
  const totalPerPlate = ingredientPerPlate + laborPerPlate + travelPerPlate + overheadPerPlate

  const ingredientPerPlateCents = Math.round(ingredientPerPlate)
  const laborPerPlateCents = Math.round(laborPerPlate)
  const travelPerPlateCents = Math.round(travelPerPlate)
  const overheadPerPlateCents = Math.round(overheadPerPlate)
  const totalPerPlateCents = Math.round(totalPerPlate)
  const totalCostCents = Math.round(totalPerPlate * guestCount)

  // Calculate margin if quoted price is available
  let marginPercent: number | null = null
  if (quotedPriceCents && quotedPriceCents > 0) {
    marginPercent = Math.round(((quotedPriceCents - totalCostCents) / quotedPriceCents) * 1000) / 10
  }

  return {
    ingredientPerPlateCents,
    laborPerPlateCents,
    travelPerPlateCents,
    overheadPerPlateCents,
    totalPerPlateCents,
    totalCostCents,
    marginPercent,
  }
}
