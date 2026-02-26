// Pricing Constants — Single Source of Truth
// Imported by both the deterministic pricing engine (compute.ts) and the AI agent brain.
// All amounts in cents (minor units).

export const COUPLES_RATES: Record<number, number> = {
  3: 20000, // $200/person
  4: 25000, // $250/person
  5: 30000, // $300/person
}

export const GROUP_RATES: Record<number, number> = {
  3: 15500, // $155/person
  4: 18500, // $185/person
  5: 21500, // $215/person
}

// Multi-night packages (total price, not per-person)
export const MULTI_NIGHT_PACKAGES: Record<string, number> = {
  // Two-night packages
  two_night_3_course: 70000, // $700
  two_night_4_course: 90000, // $900
  two_night_5_course: 110000, // $1,100
  two_night_mixed: 90000, // $900

  // Three-night packages — ⚠️ CONFIRM VALUE with chef before shipping
  three_night_3_course: 0, // ⚠️ CONFIRM VALUE
  three_night_4_course: 0, // ⚠️ CONFIRM VALUE
  three_night_5_course: 0, // ⚠️ CONFIRM VALUE
  three_night_mixed: 0, // ⚠️ CONFIRM VALUE

  // Four-night packages — ⚠️ CONFIRM VALUE with chef before shipping
  four_night_3_course: 0, // ⚠️ CONFIRM VALUE
  four_night_4_course: 0, // ⚠️ CONFIRM VALUE
  four_night_5_course: 0, // ⚠️ CONFIRM VALUE
  four_night_mixed: 0, // ⚠️ CONFIRM VALUE
}

export const WEEKLY_RATES = {
  standard_day: { min: 40000, max: 50000 }, // $400-$500/day
  commitment_day: { min: 30000, max: 35000 }, // $300-$350/day (5 consecutive days, same home)
  cook_and_leave: 15000, // $150/session (2 meals)
}

export const PIZZA_RATE = 15000 // $150/person

// Deposit requirements
export const DEPOSIT_PERCENTAGE = 0.5 // 50% non-refundable

// Balance due window
export const BALANCE_DUE_HOURS_BEFORE = 24 // hours before service

// IRS mileage rate (2026 standard) — update annually
export const IRS_MILEAGE_RATE_CENTS = 70 // $0.70/mile

// ─── Thresholds ───────────────────────────────────────────────────────────────

// Guest count classification
export const LARGE_GROUP_MIN_GUESTS = 8 // 8–14 = large group (uses GROUP_RATES + isLargeGroup flag)
export const LARGE_GROUP_MAX_GUESTS = 14 // 15+ = custom/buyout required

// Weekly service: minimum consecutive days for commitment rate
export const WEEKLY_COMMITMENT_MIN_DAYS = 5

// ─── Holiday Premiums ─────────────────────────────────────────────────────────

// Holiday premium tiers
export type HolidayTier = 1 | 2 | 3

export interface HolidayPremium {
  tier: HolidayTier
  min: number // e.g., 0.40 = 40%
  max: number // e.g., 0.50 = 50%
  default: number // midpoint used for computation
}

export const HOLIDAY_PREMIUMS: Record<HolidayTier, HolidayPremium> = {
  1: { tier: 1, min: 0.4, max: 0.5, default: 0.45 },
  2: { tier: 2, min: 0.25, max: 0.35, default: 0.3 },
  3: { tier: 3, min: 0.15, max: 0.25, default: 0.2 },
}

// Days before a Tier 1 or 2 holiday that qualify for half-premium (proximity premium)
export const HOLIDAY_PROXIMITY_DAYS = 2

// ─── Weekend Premium ──────────────────────────────────────────────────────────

// Optional Fri/Sat uplift — applied only when weekendPremiumEnabled = true in PricingInput
export const WEEKEND_PREMIUM_PERCENT = 0.1 // 10%

// ─── Minimum Booking ──────────────────────────────────────────────────────────

// ⚠️ CONFIRM VALUE with chef — service fee floor (does NOT include travel or add-ons)
export const MINIMUM_BOOKING_CENTS = 30000 // $300

// ─── Add-On Catalog ───────────────────────────────────────────────────────────

export type AddOnKey =
  | 'wine_pairing'
  | 'charcuterie_board'
  | 'extra_appetizer_course'
  | 'birthday_dessert'
  | 'custom'

export interface AddOnDefinition {
  label: string
  type: 'per_person' | 'flat'
  perPersonCents?: number
  flatCents?: number
}

// ⚠️ ALL PRICES NEED CHEF CONFIRMATION before shipping
export const ADD_ON_CATALOG: Record<Exclude<AddOnKey, 'custom'>, AddOnDefinition> = {
  wine_pairing: {
    label: 'Wine Pairing',
    type: 'per_person',
    perPersonCents: 3500, // $35/person — ⚠️ CONFIRM VALUE
  },
  charcuterie_board: {
    label: 'Charcuterie Board Setup',
    type: 'flat',
    flatCents: 15000, // $150 flat — ⚠️ CONFIRM VALUE
  },
  extra_appetizer_course: {
    label: 'Additional Appetizer Course',
    type: 'per_person',
    perPersonCents: 2500, // $25/person — ⚠️ CONFIRM VALUE
  },
  birthday_dessert: {
    label: 'Custom Birthday Dessert',
    type: 'flat',
    flatCents: 7500, // $75 flat — ⚠️ CONFIRM VALUE
  },
}

// AddOnInput: either a catalog key (optionally overriding quantity) or a fully custom add-on
export type AddOnInput =
  | { key: Exclude<AddOnKey, 'custom'>; quantity?: number }
  | {
      key: 'custom'
      label: string
      type: 'per_person' | 'flat'
      perPersonCents?: number
      flatCents?: number
      quantity?: number
    }

// ComputedAddOnLine: the resolved, computed form of an add-on (returned in PricingBreakdown)
export interface ComputedAddOnLine {
  key: string
  label: string
  type: 'per_person' | 'flat'
  unitCents: number
  quantity: number
  totalCents: number
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

// Helper to format cents as dollars
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

/**
 * Generate the rate card string from constants.
 * Used by the AI agent brain for email generation context.
 */
export function generateRateCardString(): string {
  const couplesLines = Object.entries(COUPLES_RATES)
    .map(
      ([courses, cents]) =>
        `${courses} courses: ${centsToDisplay(cents)}/person (${centsToDisplay(cents * 2)} total)`
    )
    .join('\n')

  const groupLines = Object.entries(GROUP_RATES)
    .map(([courses, cents]) => `${courses} courses: ${centsToDisplay(cents)}/person`)
    .join('\n')

  // Multi-night: dynamic loop so new keys are automatically included
  const multiNightLines = Object.entries(MULTI_NIGHT_PACKAGES)
    .filter(([, cents]) => cents > 0) // exclude placeholder CONFIRM VALUE entries
    .map(([key, cents]) => `${key.replace(/_/g, ' ')}: ${centsToDisplay(cents)}`)
    .join('\n')

  // Add-on catalog lines
  const addOnLines = Object.entries(ADD_ON_CATALOG)
    .map(([, def]) => {
      if (def.type === 'per_person' && def.perPersonCents) {
        return `${def.label}: ${centsToDisplay(def.perPersonCents)}/person`
      }
      if (def.type === 'flat' && def.flatCents) {
        return `${def.label}: ${centsToDisplay(def.flatCents)} flat`
      }
      return `${def.label}: custom`
    })
    .join('\n')

  return `RATE CARD (for reference - AI formats only, never calculates):

COUPLES (1–2 guests):
${couplesLines}
Large tasting (8-15+): Custom

GROUPS (3+ guests):
${groupLines}
Large group (8-14): Standard group rates apply — confirm feasibility
Large tasting (15+): Custom / Buyout required

WEEKLY/ONGOING:
Standard cooking day: ${centsToDisplay(WEEKLY_RATES.standard_day.min)}-${centsToDisplay(WEEKLY_RATES.standard_day.max)}/day
Commitment rate (${WEEKLY_COMMITMENT_MIN_DAYS}+ consecutive days, same home): ${centsToDisplay(WEEKLY_RATES.commitment_day.min)}-${centsToDisplay(WEEKLY_RATES.commitment_day.max)}/day
Cook & Leave (2 meals, no service): ${centsToDisplay(WEEKLY_RATES.cook_and_leave)}/session

MULTI-DAY PACKAGES:
${multiNightLines || '(none confirmed yet)'}

SEASONAL:
Summer Brick-Fired Pizza Experience: ${centsToDisplay(PIZZA_RATE)}/person

WEEKEND PREMIUM (when enabled):
Friday/Saturday events: +${Math.round(WEEKEND_PREMIUM_PERCENT * 100)}% on service fee

ADD-ONS (when requested explicitly):
${addOnLines}
Additional add-ons quoted custom

NOTES:
- Groceries billed at actual receipt cost, no markup
- Table setting and beverages not included
- Deposit: ${DEPOSIT_PERCENTAGE * 100}% non-refundable to lock date
- Balance due ${BALANCE_DUE_HOURS_BEFORE} hours before service
- Minimum booking: ${centsToDisplay(MINIMUM_BOOKING_CENTS)} (service fee floor)`
}
