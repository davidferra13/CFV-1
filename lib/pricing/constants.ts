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
  'two_night_3_course': 70000,  // $700
  'two_night_4_course': 90000,  // $900
  'two_night_5_course': 110000, // $1,100
  'two_night_mixed': 90000,     // $900
}

export const WEEKLY_RATES = {
  standard_day: { min: 40000, max: 50000 },    // $400-$500/day
  commitment_day: { min: 30000, max: 35000 },   // $300-$350/day (5 consecutive days)
  cook_and_leave: 15000,                         // $150 total (2 meals)
}

export const PIZZA_RATE = 15000 // $150/person

// Deposit requirements
export const DEPOSIT_PERCENTAGE = 0.50 // 50% non-refundable

// IRS mileage rate (2026 standard) - update annually
export const IRS_MILEAGE_RATE_CENTS = 70 // $0.70/mile

// Holiday premium tiers
export type HolidayTier = 1 | 2 | 3

export interface HolidayPremium {
  tier: HolidayTier
  min: number // e.g., 0.40 = 40%
  max: number // e.g., 0.50 = 50%
  default: number // midpoint used for computation
}

export const HOLIDAY_PREMIUMS: Record<HolidayTier, HolidayPremium> = {
  1: { tier: 1, min: 0.40, max: 0.50, default: 0.45 },
  2: { tier: 2, min: 0.25, max: 0.35, default: 0.30 },
  3: { tier: 3, min: 0.15, max: 0.25, default: 0.20 },
}

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
    .map(([courses, cents]) => `${courses} courses: ${centsToDisplay(cents)}/person (${centsToDisplay(cents * 2)} total)`)
    .join('\n')

  const groupLines = Object.entries(GROUP_RATES)
    .map(([courses, cents]) => `${courses} courses: ${centsToDisplay(cents)}/person`)
    .join('\n')

  return `RATE CARD (for reference - AI formats only, never calculates):

COUPLES (2 guests):
${couplesLines}
Large tasting (8-15+): Custom

GROUPS (3+ guests):
${groupLines}
Large tasting (8-15+): Custom

WEEKLY/ONGOING:
Standard cooking day: ${centsToDisplay(WEEKLY_RATES.standard_day.min)}-${centsToDisplay(WEEKLY_RATES.standard_day.max)}/day
Commitment rate (5 consecutive days): ${centsToDisplay(WEEKLY_RATES.commitment_day.min)}-${centsToDisplay(WEEKLY_RATES.commitment_day.max)}/day
Cook & Leave (2 meals, no service): ${centsToDisplay(WEEKLY_RATES.cook_and_leave)} total

MULTI-DAY PACKAGES:
Two-Night Dinner for Two - 3 courses both nights: ${centsToDisplay(MULTI_NIGHT_PACKAGES['two_night_3_course'])}
Two-Night Dinner for Two - 4 courses both nights: ${centsToDisplay(MULTI_NIGHT_PACKAGES['two_night_4_course'])}
Two-Night Dinner for Two - 5 courses both nights: ${centsToDisplay(MULTI_NIGHT_PACKAGES['two_night_5_course'])}
Mixed course option: ${centsToDisplay(MULTI_NIGHT_PACKAGES['two_night_mixed'])}

SEASONAL:
Summer Brick-Fired Pizza Experience: ${centsToDisplay(PIZZA_RATE)}/person

NOTES:
- Groceries billed at actual receipt cost, no markup
- Table setting and beverages not included
- Deposit: ${DEPOSIT_PERCENTAGE * 100}% non-refundable to lock date
- Balance due 24 hours before service`
}
