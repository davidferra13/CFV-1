// Deterministic Pricing Engine
// Pure functions — no AI, no guessing, no estimation.
// All amounts in cents (minor units).
// Source of truth: lib/pricing/constants.ts

'use server'

import {
  COUPLES_RATES,
  GROUP_RATES,
  MULTI_NIGHT_PACKAGES,
  WEEKLY_RATES,
  PIZZA_RATE,
  DEPOSIT_PERCENTAGE,
  IRS_MILEAGE_RATE_CENTS,
  HOLIDAY_PREMIUMS,
  type HolidayTier,
} from './constants'

// ─── Holiday Date Detection ──────────────────────────────────────────────────

// Holiday date detection (month-day format for fixed holidays)
const TIER_1_HOLIDAYS = [
  { month: 11, name: 'Thanksgiving', type: 'floating' as const },
  { month: 12, day: 24, name: 'Christmas Eve' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 31, name: "New Year's Eve" },
  { month: 2, day: 14, name: "Valentine's Day" },
]

const TIER_2_HOLIDAYS = [
  { month: 5, name: "Mother's Day", type: 'floating' as const },
  { month: 6, name: "Father's Day", type: 'floating' as const },
  { month: 4, name: 'Easter', type: 'floating' as const },
  { month: 7, day: 4, name: 'Fourth of July' },
]

const TIER_3_HOLIDAYS = [
  { month: 5, name: 'Memorial Day', type: 'floating' as const },
  { month: 9, name: 'Labor Day', type: 'floating' as const },
  { month: 10, day: 31, name: 'Halloween' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceType =
  | 'private_dinner'
  | 'weekly_standard'
  | 'weekly_commitment'
  | 'cook_and_leave'
  | 'pizza_experience'
  | 'multi_night'
  | 'custom'

export interface PricingInput {
  serviceType: ServiceType
  guestCount: number
  courseCount: number
  eventDate?: string // ISO date string
  distanceMiles?: number
  multiNightPackage?: string // key from MULTI_NIGHT_PACKAGES
}

export interface PricingBreakdown {
  // Core pricing
  serviceFeeCents: number
  perPersonCents: number
  guestCount: number
  courseCount: number

  // Holiday premium
  holidayName: string | null
  holidayTier: HolidayTier | null
  holidayPremiumPercent: number // e.g., 0.45 = 45%
  holidayPremiumCents: number

  // Travel
  distanceMiles: number
  travelFeeCents: number

  // Totals
  subtotalCents: number // service fee + holiday premium
  totalServiceCents: number // subtotal + travel
  depositCents: number // 50% of totalServiceCents
  depositPercent: number

  // Grocery estimate (internal only — never shown to client)
  estimatedGroceryCents: { low: number; high: number }

  // Metadata
  pricingModel: 'per_person' | 'flat_rate' | 'custom'
  isCouple: boolean
  notes: string[]
}

// ─── Core Pricing Function ───────────────────────────────────────────────────

export async function computePricing(input: PricingInput): Promise<PricingBreakdown> {
  const { serviceType, guestCount, courseCount, eventDate, distanceMiles = 0 } = input

  const notes: string[] = []
  let perPersonCents = 0
  let serviceFeeCents = 0
  let pricingModel: 'per_person' | 'flat_rate' | 'custom' = 'per_person'
  const isCouple = guestCount === 2

  // ── 1. Base Service Fee ──────────────────────────────────────────────────

  switch (serviceType) {
    case 'private_dinner': {
      if (isCouple) {
        perPersonCents = COUPLES_RATES[courseCount] || 0
        if (!perPersonCents) {
          // Custom/tasting menu
          pricingModel = 'custom'
          notes.push(`${courseCount}-course tasting menu requires custom pricing`)
        }
      } else {
        perPersonCents = GROUP_RATES[courseCount] || 0
        if (!perPersonCents) {
          pricingModel = 'custom'
          notes.push(`${courseCount}-course tasting menu requires custom pricing`)
        }
      }
      serviceFeeCents = perPersonCents * guestCount
      break
    }

    case 'pizza_experience': {
      perPersonCents = PIZZA_RATE
      serviceFeeCents = PIZZA_RATE * guestCount
      break
    }

    case 'multi_night': {
      const packageKey = input.multiNightPackage || 'two_night_4_course'
      serviceFeeCents = MULTI_NIGHT_PACKAGES[packageKey] || 0
      if (!serviceFeeCents) {
        pricingModel = 'custom'
        notes.push('Multi-night package requires custom pricing')
      } else {
        pricingModel = 'flat_rate'
        perPersonCents = Math.round(serviceFeeCents / guestCount)
      }
      break
    }

    case 'weekly_standard': {
      serviceFeeCents = WEEKLY_RATES.standard_day.max // Default to high end
      pricingModel = 'flat_rate'
      perPersonCents = 0
      notes.push('Weekly standard: $400–$500/day')
      break
    }

    case 'weekly_commitment': {
      serviceFeeCents = WEEKLY_RATES.commitment_day.max
      pricingModel = 'flat_rate'
      perPersonCents = 0
      notes.push('Commitment rate (5 consecutive days): $300–$350/day')
      break
    }

    case 'cook_and_leave': {
      serviceFeeCents = WEEKLY_RATES.cook_and_leave
      pricingModel = 'flat_rate'
      perPersonCents = 0
      break
    }

    case 'custom': {
      pricingModel = 'custom'
      notes.push('Custom service type — requires manual pricing')
      break
    }
  }

  // ── 2. Holiday Premium ───────────────────────────────────────────────────

  let holidayName: string | null = null
  let holidayTier: HolidayTier | null = null
  let holidayPremiumPercent = 0
  let holidayPremiumCents = 0

  if (eventDate) {
    const holiday = detectHoliday(eventDate)
    if (holiday) {
      holidayName = holiday.name
      holidayTier = holiday.tier
      const premium = HOLIDAY_PREMIUMS[holiday.tier]
      holidayPremiumPercent = premium.default
      holidayPremiumCents = Math.round(serviceFeeCents * premium.default)
      notes.push(`${holiday.name} — Tier ${holiday.tier} premium (+${Math.round(premium.default * 100)}%)`)
    }
  }

  const subtotalCents = serviceFeeCents + holidayPremiumCents

  // ── 3. Travel Fee ────────────────────────────────────────────────────────

  const travelFeeCents = Math.round(distanceMiles * IRS_MILEAGE_RATE_CENTS)
  if (distanceMiles > 0) {
    notes.push(`Travel: ${distanceMiles} miles × $${(IRS_MILEAGE_RATE_CENTS / 100).toFixed(2)}/mile`)
  }

  // ── 4. Totals ────────────────────────────────────────────────────────────

  const totalServiceCents = subtotalCents + travelFeeCents
  const depositCents = Math.round(totalServiceCents * DEPOSIT_PERCENTAGE)

  // ── 5. Grocery Estimate (internal only) ──────────────────────────────────

  // Rough estimate: $30–$50 per guest for standard dinners
  const estimatedGroceryCents = {
    low: guestCount * 3000,
    high: guestCount * 5000,
  }

  return {
    serviceFeeCents,
    perPersonCents,
    guestCount,
    courseCount,
    holidayName,
    holidayTier,
    holidayPremiumPercent,
    holidayPremiumCents,
    subtotalCents,
    travelFeeCents,
    distanceMiles,
    totalServiceCents,
    depositCents,
    depositPercent: DEPOSIT_PERCENTAGE * 100,
    estimatedGroceryCents,
    pricingModel,
    isCouple,
    notes,
  }
}

// ─── Quote Generation Helper ─────────────────────────────────────────────────
// Creates a quote-ready object from pricing computation

export async function generateQuoteFromPricing(input: PricingInput & {
  clientId: string
  inquiryId?: string
  eventId?: string
  quoteName?: string
  pricingNotes?: string
}) {
  const pricing = await computePricing(input)

  return {
    client_id: input.clientId,
    inquiry_id: input.inquiryId || null,
    event_id: input.eventId || null,
    quote_name: input.quoteName || `${input.courseCount}-course dinner for ${input.guestCount}`,
    pricing_model: pricing.pricingModel,
    total_quoted_cents: pricing.totalServiceCents,
    price_per_person_cents: pricing.perPersonCents || null,
    guest_count_estimated: input.guestCount,
    deposit_required: true,
    deposit_amount_cents: pricing.depositCents,
    deposit_percentage: pricing.depositPercent,
    pricing_notes: input.pricingNotes || pricing.notes.join('. ') || null,
    // Internal data (not stored on quote, but useful for the AI)
    _breakdown: pricing,
  }
}

// ─── Holiday Detection ───────────────────────────────────────────────────────

interface HolidayMatch {
  name: string
  tier: HolidayTier
}

function detectHoliday(dateStr: string): HolidayMatch | null {
  const date = new Date(dateStr + 'T12:00:00') // Avoid timezone issues
  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()
  const dayOfWeek = date.getDay() // 0=Sunday

  // Tier 1
  for (const h of TIER_1_HOLIDAYS) {
    if (h.type === 'floating') {
      // Thanksgiving: 4th Thursday of November
      if (h.month === 11 && month === 11 && dayOfWeek === 4) {
        const thursdays = countWeekdayInMonth(date, 4)
        if (thursdays === 4) return { name: h.name, tier: 1 }
      }
    } else if (h.month === month && h.day === day) {
      return { name: h.name, tier: 1 }
    }
  }

  // Tier 2
  for (const h of TIER_2_HOLIDAYS) {
    if (h.type === 'floating') {
      // Mother's Day: 2nd Sunday of May
      if (h.name === "Mother's Day" && month === 5 && dayOfWeek === 0) {
        const sundays = countWeekdayInMonth(date, 0)
        if (sundays === 2) return { name: h.name, tier: 2 }
      }
      // Father's Day: 3rd Sunday of June
      if (h.name === "Father's Day" && month === 6 && dayOfWeek === 0) {
        const sundays = countWeekdayInMonth(date, 0)
        if (sundays === 3) return { name: h.name, tier: 2 }
      }
      // Easter: complex — check within +/- 1 day of known Easter dates
      if (h.name === 'Easter' && (month === 3 || month === 4)) {
        if (isNearEaster(date)) return { name: h.name, tier: 2 }
      }
    } else if (h.month === month && h.day === day) {
      return { name: h.name, tier: 2 }
    }
  }

  // Tier 3
  for (const h of TIER_3_HOLIDAYS) {
    if (h.type === 'floating') {
      // Memorial Day: last Monday of May
      if (h.name === 'Memorial Day' && month === 5 && dayOfWeek === 1) {
        const nextMonday = new Date(date)
        nextMonday.setDate(day + 7)
        if (nextMonday.getMonth() + 1 !== 5) return { name: h.name, tier: 3 }
      }
      // Labor Day: 1st Monday of September
      if (h.name === 'Labor Day' && month === 9 && dayOfWeek === 1 && day <= 7) {
        return { name: h.name, tier: 3 }
      }
    } else if (h.month === month && h.day === day) {
      return { name: h.name, tier: 3 }
    }
  }

  // Also check day-before and day-of for holiday weekends
  // (Valentine's dinner might be on the 13th, etc.)
  // For now, only exact dates. Can expand later.

  return null
}

// Helper: count which occurrence of a weekday this is in the month
function countWeekdayInMonth(date: Date, targetDay: number): number {
  const day = date.getDate()
  const dayOfWeek = date.getDay()
  if (dayOfWeek !== targetDay) return 0
  return Math.ceil(day / 7)
}

// Helper: Easter computation (Anonymous Gregorian algorithm)
function isNearEaster(date: Date): boolean {
  const year = date.getFullYear()
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  const easter = new Date(year, month - 1, day)
  const diff = Math.abs(date.getTime() - easter.getTime())
  const daysDiff = diff / (1000 * 60 * 60 * 24)

  return daysDiff <= 1 // Within 1 day of Easter
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

export function formatCentsAsDollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function formatPricingForEmail(pricing: PricingBreakdown): string {
  const lines: string[] = []

  if (pricing.isCouple) {
    lines.push(
      `For ${pricing.guestCount} guests at ${pricing.courseCount} courses, it comes out to ${formatCentsAsDollars(pricing.perPersonCents)} per person — ${formatCentsAsDollars(pricing.serviceFeeCents)} for the table.`
    )
  } else {
    lines.push(
      `For ${pricing.guestCount} guests at ${pricing.courseCount} courses, it comes out to ${formatCentsAsDollars(pricing.perPersonCents)} per person — ${formatCentsAsDollars(pricing.serviceFeeCents)} total.`
    )
  }

  if (pricing.holidayPremiumCents > 0) {
    lines.push(
      `Since this falls on ${pricing.holidayName}, there's a ${Math.round(pricing.holidayPremiumPercent * 100)}% holiday premium, bringing the service fee to ${formatCentsAsDollars(pricing.subtotalCents)}.`
    )
  }

  if (pricing.travelFeeCents > 0) {
    lines.push(
      `Travel is ${formatCentsAsDollars(pricing.travelFeeCents)} based on mileage.`
    )
  }

  lines.push(
    `Groceries are billed separately at actual cost based on real receipts, usually in the ${formatCentsAsDollars(pricing.estimatedGroceryCents.low)}–${formatCentsAsDollars(pricing.estimatedGroceryCents.high)} range for a dinner this size.`
  )

  lines.push(
    `A ${pricing.depositPercent}% non-refundable deposit locks the date.`
  )

  return lines.join(' ')
}
