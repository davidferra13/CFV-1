/**
 * Pure deterministic pricing functions for experience packages.
 * Formula > AI: all pricing math is exact, instant, and free.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type AddOn = {
  name: string
  price_cents: number
  per_person: boolean
}

export type SeasonalPricing = Record<string, number>

export type PriceBreakdown = {
  baseCents: number
  guestCount: number
  perPersonCents: number
  guestDiscount: number
  seasonalMultiplier: number
  seasonLabel: string
  addOnsTotalCents: number
  addOnsDetail: { name: string; totalCents: number }[]
  subtotalCents: number
  totalCents: number
}

// ── Guest Tier Discounts ───────────────────────────────────────────────────

const GUEST_TIERS = [
  { max: 4, discount: 1.0 }, // 1-4: full price per person
  { max: 8, discount: 0.9 }, // 5-8: 10% off per person
  { max: 12, discount: 0.85 }, // 9-12: 15% off per person
  { max: Infinity, discount: 0.8 }, // 13+: 20% off per person
] as const

/**
 * Returns the per-person discount multiplier for a given guest count.
 * 1-4: 1.0 (full price), 5-8: 0.9, 9-12: 0.85, 13+: 0.8
 */
export function getGuestTierDiscount(guestCount: number): number {
  if (guestCount < 1) return 1.0
  for (const tier of GUEST_TIERS) {
    if (guestCount <= tier.max) return tier.discount
  }
  return 0.8
}

// ── Seasonal Multiplier ────────────────────────────────────────────────────

const MONTH_TO_SEASON: Record<number, string> = {
  0: 'off_peak', // January
  1: 'off_peak', // February
  2: 'off_peak', // March
  3: 'spring', // April
  4: 'spring', // May
  5: 'summer', // June
  6: 'summer', // July
  7: 'summer', // August
  8: 'fall', // September
  9: 'fall', // October
  10: 'holiday', // November
  11: 'holiday', // December
}

/**
 * Returns the seasonal pricing multiplier for a given date.
 * Falls back to 1.0 if no seasonal pricing is configured or the season is not mapped.
 */
export function getSeasonalMultiplier(
  date: Date,
  seasonalPricing?: SeasonalPricing | null
): { multiplier: number; label: string } {
  if (!seasonalPricing) return { multiplier: 1.0, label: 'Standard' }

  const month = date.getMonth()
  const season = MONTH_TO_SEASON[month] ?? 'standard'
  const multiplier = seasonalPricing[season] ?? 1.0

  const labelMap: Record<string, string> = {
    off_peak: 'Off-Peak',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    holiday: 'Holiday',
    standard: 'Standard',
  }

  return { multiplier, label: labelMap[season] ?? 'Standard' }
}

// ── Core Price Calculation ─────────────────────────────────────────────────

/**
 * Calculates the full dynamic price for a package.
 *
 * Formula: (baseCents * guestDiscount * guestCount * seasonalMultiplier) + addOns
 *
 * The base_price_cents is treated as a per-person price.
 * Guest tiers apply volume discounts to the per-person rate.
 * Seasonal multipliers scale the subtotal.
 * Add-ons are added on top (either flat or per-person).
 */
export function calculateDynamicPrice(
  baseCents: number,
  guestCount: number,
  date: Date,
  selectedAddOns: AddOn[],
  seasonalPricing?: SeasonalPricing | null
): PriceBreakdown {
  const guests = Math.max(1, guestCount)
  const guestDiscount = getGuestTierDiscount(guests)
  const { multiplier: seasonalMultiplier, label: seasonLabel } = getSeasonalMultiplier(
    date,
    seasonalPricing
  )

  const perPersonCents = Math.round(baseCents * guestDiscount * seasonalMultiplier)
  const subtotalCents = perPersonCents * guests

  // Add-ons
  const addOnsDetail = selectedAddOns.map((addon) => ({
    name: addon.name,
    totalCents: addon.per_person ? addon.price_cents * guests : addon.price_cents,
  }))
  const addOnsTotalCents = addOnsDetail.reduce((sum, a) => sum + a.totalCents, 0)

  const totalCents = subtotalCents + addOnsTotalCents

  return {
    baseCents,
    guestCount: guests,
    perPersonCents,
    guestDiscount,
    seasonalMultiplier,
    seasonLabel,
    addOnsTotalCents,
    addOnsDetail,
    subtotalCents,
    totalCents,
  }
}

// ── Display Helpers ────────────────────────────────────────────────────────

/**
 * Formats a price range string like "From $75 - $300" based on min/max guests.
 */
export function formatPriceRange(
  baseCents: number,
  minGuests: number,
  maxGuests?: number | null
): string {
  const min = Math.max(1, minGuests)
  const minDiscount = getGuestTierDiscount(min)
  const minTotal = Math.round(baseCents * minDiscount * min)

  if (!maxGuests || maxGuests <= min) {
    return `$${(minTotal / 100).toFixed(0)}`
  }

  const maxDiscount = getGuestTierDiscount(maxGuests)
  const maxTotal = Math.round(baseCents * maxDiscount * maxGuests)

  return `From $${(minTotal / 100).toFixed(0)} - $${(maxTotal / 100).toFixed(0)}`
}

/**
 * Formats cents as a dollar string.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
