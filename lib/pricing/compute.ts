// Deterministic Pricing Engine
// Pure functions — no AI, no guessing, no estimation.
// All amounts in cents (minor units).
// Source of truth: lib/pricing/constants.ts

import {
  COUPLES_RATES,
  GROUP_RATES,
  MULTI_NIGHT_PACKAGES,
  WEEKLY_RATES,
  PIZZA_RATE,
  DEPOSIT_PERCENTAGE,
  IRS_MILEAGE_RATE_CENTS,
  HOLIDAY_PREMIUMS,
  HOLIDAY_PROXIMITY_DAYS,
  WEEKEND_PREMIUM_PERCENT,
  MINIMUM_BOOKING_CENTS,
  BALANCE_DUE_HOURS_BEFORE,
  LARGE_GROUP_MIN_GUESTS,
  LARGE_GROUP_MAX_GUESTS,
  WEEKLY_COMMITMENT_MIN_DAYS,
  ADD_ON_CATALOG,
  type HolidayTier,
  type AddOnInput,
  type ComputedAddOnLine,
} from './constants'

// ─── Holiday Date Detection ──────────────────────────────────────────────────

// Holiday date detection (month-day format for fixed holidays)
const TIER_1_HOLIDAYS = [
  { month: 11, name: 'Thanksgiving', type: 'floating' as const },
  { month: 12, day: 24, name: 'Christmas Eve' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 31, name: "New Year's Eve" },
  { month: 1, day: 1, name: "New Year's Day" }, // Jan 1 — major cooking holiday
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
  courseCount?: number // required for private_dinner; ignored for all other service types
  eventDate?: string // ISO date string (YYYY-MM-DD)
  distanceMiles?: number
  multiNightPackage?: string // key from MULTI_NIGHT_PACKAGES
  numberOfDays?: number // for weekly types; defaults to 1
  weekendPremiumEnabled?: boolean // opt-in Fri/Sat uplift; defaults to false
  addOns?: AddOnInput[] // optional named or custom add-on line items
}

export interface PricingBreakdown {
  // Core pricing
  serviceFeeCents: number
  perPersonCents: number
  guestCount: number
  courseCount: number | undefined

  // Exact holiday premium
  holidayName: string | null
  holidayTier: HolidayTier | null
  holidayPremiumPercent: number // e.g., 0.45 = 45%
  holidayPremiumCents: number

  // Holiday proximity premium (near-holiday; mutually exclusive with exact holiday)
  isNearHoliday: boolean
  nearHolidayName: string | null
  nearHolidayPremiumCents: number

  // Weekend premium
  isWeekend: boolean
  weekendPremiumPercent: number
  weekendPremiumCents: number

  // Travel
  distanceMiles: number
  travelFeeCents: number

  // Add-ons
  addOnLines: ComputedAddOnLine[]
  addOnTotalCents: number

  // Totals
  subtotalCents: number // service + weekend + holiday premiums (before travel + add-ons)
  totalServiceCents: number // subtotal + travel + add-ons (after minimum floor)
  depositCents: number // DEPOSIT_PERCENTAGE of totalServiceCents
  depositPercent: number

  // Minimum booking floor
  minimumApplied: boolean

  // Grocery estimate (internal only — never shown to client)
  estimatedGroceryCents: { low: number; high: number }

  // Metadata
  pricingModel: 'per_person' | 'flat_rate' | 'custom'
  isCouple: boolean
  isLargeGroup: boolean
  requiresCustomPricing: boolean // true when engine cannot compute a final number
  numberOfDays: number
  notes: string[]
  validationErrors: string[]
  balanceDueHours: number // always BALANCE_DUE_HOURS_BEFORE (24)
}

// ─── Input Validation ─────────────────────────────────────────────────────────

/**
 * Validate a PricingInput before computation.
 * Always returns a result — never throws. Errors are informational.
 * Exported so callers (e.g., quote forms) can pre-validate UI state.
 */
export function validatePricingInput(input: PricingInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // guestCount must be a positive integer
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    errors.push('Guest count must be a positive integer (minimum 1)')
  }

  // courseCount: required and must be 3–5 for private_dinner; ignored for all other types
  if (input.serviceType === 'private_dinner') {
    if (
      input.courseCount === undefined ||
      !Number.isInteger(input.courseCount) ||
      input.courseCount < 1
    ) {
      errors.push('Course count is required for private dinner and must be a positive integer')
    } else if (input.courseCount < 3 || input.courseCount > 5) {
      errors.push(
        `${input.courseCount}-course menu is outside the standard 3–5 course range — requires custom pricing`
      )
    }
  }

  // eventDate must be a parseable ISO date if provided
  if (input.eventDate) {
    const d = new Date(input.eventDate + 'T12:00:00')
    if (isNaN(d.getTime())) {
      errors.push(`Event date "${input.eventDate}" is not a valid date`)
    }
  }

  // distanceMiles must be non-negative if provided
  if (input.distanceMiles !== undefined && input.distanceMiles < 0) {
    errors.push('Distance miles cannot be negative')
  }

  // multi_night: multiNightPackage must be provided and known
  if (input.serviceType === 'multi_night') {
    if (!input.multiNightPackage) {
      errors.push(
        'multiNightPackage key is required for multi_night service type (e.g., "two_night_4_course")'
      )
    } else if (!(input.multiNightPackage in MULTI_NIGHT_PACKAGES)) {
      errors.push(
        `Unknown multi-night package "${input.multiNightPackage}". Valid keys: ${Object.keys(MULTI_NIGHT_PACKAGES).join(', ')}`
      )
    } else if (MULTI_NIGHT_PACKAGES[input.multiNightPackage] === 0) {
      errors.push(
        `Multi-night package "${input.multiNightPackage}" is a placeholder — price not yet confirmed. Requires custom pricing.`
      )
    }
  }

  // weekly_commitment: warn if fewer than WEEKLY_COMMITMENT_MIN_DAYS
  if (input.serviceType === 'weekly_commitment') {
    const days = input.numberOfDays ?? 1
    if (days < WEEKLY_COMMITMENT_MIN_DAYS) {
      errors.push(
        `Commitment rate requires at least ${WEEKLY_COMMITMENT_MIN_DAYS} consecutive days. Received ${days} day(s) — use weekly_standard for shorter bookings.`
      )
    }
  }

  // numberOfDays: must be a positive integer for weekly types
  const weeklyTypes: ServiceType[] = ['weekly_standard', 'weekly_commitment', 'cook_and_leave']
  if (weeklyTypes.includes(input.serviceType)) {
    const days = input.numberOfDays ?? 1
    if (!Number.isInteger(days) || days < 1) {
      errors.push('numberOfDays must be a positive integer for weekly service types')
    }
  }

  // Large group (15+): cannot be computed deterministically
  if (input.guestCount > LARGE_GROUP_MAX_GUESTS) {
    errors.push(
      `Guest count of ${input.guestCount} exceeds ${LARGE_GROUP_MAX_GUESTS} — requires a custom large-group or buyout quote`
    )
  }

  // Add-ons: validate each entry
  if (input.addOns) {
    for (const addOn of input.addOns) {
      if (addOn.key === 'custom') {
        if (!addOn.label || addOn.label.trim() === '') {
          errors.push('Custom add-on must have a label')
        }
        if (
          addOn.type === 'per_person' &&
          (addOn.perPersonCents === undefined || addOn.perPersonCents < 0)
        ) {
          errors.push(
            `Custom add-on "${addOn.label || 'unnamed'}" (per_person) must have a non-negative perPersonCents`
          )
        }
        if (addOn.type === 'flat' && (addOn.flatCents === undefined || addOn.flatCents < 0)) {
          errors.push(
            `Custom add-on "${addOn.label || 'unnamed'}" (flat) must have a non-negative flatCents`
          )
        }
      } else {
        // Belt-and-suspenders runtime check even though TypeScript enforces the key
        if (!(addOn.key in ADD_ON_CATALOG)) {
          errors.push(`Unknown add-on key "${addOn.key}"`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Add-On Computation ───────────────────────────────────────────────────────

function computeAddOns(
  addOns: AddOnInput[] | undefined,
  guestCount: number
): { lines: ComputedAddOnLine[]; totalCents: number } {
  if (!addOns || addOns.length === 0) {
    return { lines: [], totalCents: 0 }
  }

  const lines: ComputedAddOnLine[] = []
  let totalCents = 0

  for (const addOn of addOns) {
    if (addOn.key === 'custom') {
      const unitCents =
        addOn.type === 'per_person' ? (addOn.perPersonCents ?? 0) : (addOn.flatCents ?? 0)
      const quantity =
        addOn.type === 'per_person' ? (addOn.quantity ?? guestCount) : (addOn.quantity ?? 1)
      const lineTotalCents = unitCents * quantity
      lines.push({
        key: 'custom',
        label: addOn.label,
        type: addOn.type,
        unitCents,
        quantity,
        totalCents: lineTotalCents,
      })
      totalCents += lineTotalCents
    } else {
      const def = ADD_ON_CATALOG[addOn.key]
      const unitCents = def.type === 'per_person' ? (def.perPersonCents ?? 0) : (def.flatCents ?? 0)
      const quantity =
        def.type === 'per_person' ? (addOn.quantity ?? guestCount) : (addOn.quantity ?? 1)
      const lineTotalCents = unitCents * quantity
      lines.push({
        key: addOn.key,
        label: def.label,
        type: def.type,
        unitCents,
        quantity,
        totalCents: lineTotalCents,
      })
      totalCents += lineTotalCents
    }
  }

  return { lines, totalCents }
}

// ─── Core Pricing Function ───────────────────────────────────────────────────

export async function computePricing(input: PricingInput): Promise<PricingBreakdown> {
  // ── Step 0: Validate input ────────────────────────────────────────────────
  const validation = validatePricingInput(input)
  const validationErrors = validation.errors

  const {
    serviceType,
    guestCount,
    courseCount, // intentionally kept as undefined when not provided
    eventDate,
    distanceMiles = 0,
    weekendPremiumEnabled = false,
    addOns,
  } = input

  const notes: string[] = []
  let perPersonCents = 0
  let serviceFeeCents = 0
  let pricingModel: 'per_person' | 'flat_rate' | 'custom' = 'per_person'
  let requiresCustomPricing = false

  // ── Step 1: Guest count classification ───────────────────────────────────
  //   Solo (1):     → uses COUPLES_RATES with a note
  //   Couple (2):   → uses COUPLES_RATES
  //   Group (3–7):  → uses GROUP_RATES
  //   Large (8–14): → uses GROUP_RATES + isLargeGroup flag + note
  //   Buyout (15+): → requiresCustomPricing = true immediately

  const isCouple = guestCount <= 2 && guestCount >= 1
  const isSolo = guestCount === 1
  const isLargeGroup = guestCount >= LARGE_GROUP_MIN_GUESTS && guestCount <= LARGE_GROUP_MAX_GUESTS
  const isBuyout = guestCount > LARGE_GROUP_MAX_GUESTS

  if (isSolo) {
    notes.push('Solo guest — priced at couples rate (1 person)')
  }

  if (isBuyout) {
    requiresCustomPricing = true
    pricingModel = 'custom'
    notes.push(`${guestCount} guests requires a custom large-group / buyout quote`)
  }

  if (isLargeGroup && serviceType === 'private_dinner') {
    notes.push(
      `Large group (${guestCount} guests) — standard group rates applied; confirm feasibility before quoting`
    )
  }

  // ── Step 2: Resolve numberOfDays for weekly service types ─────────────────
  const weeklyTypes: ServiceType[] = ['weekly_standard', 'weekly_commitment', 'cook_and_leave']
  const isWeeklyType = weeklyTypes.includes(serviceType)
  const numberOfDays = isWeeklyType ? Math.max(1, input.numberOfDays ?? 1) : 1

  // ── Step 3: Base service fee by service type ──────────────────────────────
  // Buyout guests bypass the rate table entirely — skip if already custom.
  if (!isBuyout) {
    switch (serviceType) {
      case 'private_dinner': {
        // Couples rates apply to 1–2 guests; group rates apply to 3+
        const rateTable = isCouple ? COUPLES_RATES : GROUP_RATES
        perPersonCents = courseCount !== undefined ? (rateTable[courseCount] ?? 0) : 0

        if (perPersonCents === 0) {
          // Either courseCount was not provided, or it falls outside the 3–5 range
          pricingModel = 'custom'
          requiresCustomPricing = true
          if (courseCount === undefined) {
            notes.push('Course count not provided — requires custom pricing for private dinner')
          } else {
            notes.push(
              `${courseCount}-course menu is outside the standard 3–5 course range — requires custom pricing`
            )
          }
        } else {
          serviceFeeCents = perPersonCents * guestCount
          pricingModel = 'per_person'
        }
        break
      }

      case 'pizza_experience': {
        perPersonCents = PIZZA_RATE
        serviceFeeCents = PIZZA_RATE * guestCount
        pricingModel = 'per_person'
        break
      }

      case 'multi_night': {
        const packageKey = input.multiNightPackage ?? ''
        const packageTotal = packageKey ? (MULTI_NIGHT_PACKAGES[packageKey] ?? -1) : -1

        if (!packageKey) {
          pricingModel = 'custom'
          requiresCustomPricing = true
          notes.push('multi_night requires an explicit package key — no package key was provided')
        } else if (packageTotal === -1) {
          pricingModel = 'custom'
          requiresCustomPricing = true
          notes.push(`Unknown multi-night package "${packageKey}" — requires custom pricing`)
        } else if (packageTotal === 0) {
          // Placeholder value — price not yet confirmed by chef
          pricingModel = 'custom'
          requiresCustomPricing = true
          notes.push(
            `Multi-night package "${packageKey}" is reserved but not yet priced — requires custom pricing`
          )
        } else {
          serviceFeeCents = packageTotal
          pricingModel = 'flat_rate'
          perPersonCents = guestCount > 0 ? Math.round(serviceFeeCents / guestCount) : 0
          notes.push(`Package: ${packageKey} — ${formatCentsAsDollars(serviceFeeCents)} flat`)
        }
        break
      }

      case 'weekly_standard': {
        serviceFeeCents = WEEKLY_RATES.standard_day.max * numberOfDays
        pricingModel = 'flat_rate'
        perPersonCents = 0
        notes.push(
          `Weekly standard: ${formatCentsAsDollars(WEEKLY_RATES.standard_day.min)}–${formatCentsAsDollars(WEEKLY_RATES.standard_day.max)}/day × ${numberOfDays} day(s) = ${formatCentsAsDollars(serviceFeeCents)}`
        )
        break
      }

      case 'weekly_commitment': {
        serviceFeeCents = WEEKLY_RATES.commitment_day.max * numberOfDays
        pricingModel = 'flat_rate'
        perPersonCents = 0
        if (numberOfDays < WEEKLY_COMMITMENT_MIN_DAYS) {
          notes.push(
            `Warning: commitment rate requires ${WEEKLY_COMMITMENT_MIN_DAYS} consecutive days — only ${numberOfDays} provided. Consider weekly_standard.`
          )
        } else {
          notes.push(
            `Commitment rate: ${formatCentsAsDollars(WEEKLY_RATES.commitment_day.min)}–${formatCentsAsDollars(WEEKLY_RATES.commitment_day.max)}/day × ${numberOfDays} day(s) = ${formatCentsAsDollars(serviceFeeCents)}`
          )
        }
        break
      }

      case 'cook_and_leave': {
        serviceFeeCents = WEEKLY_RATES.cook_and_leave * numberOfDays
        pricingModel = 'flat_rate'
        perPersonCents = 0
        notes.push(
          numberOfDays > 1
            ? `Cook & Leave: ${formatCentsAsDollars(WEEKLY_RATES.cook_and_leave)}/session × ${numberOfDays} sessions = ${formatCentsAsDollars(serviceFeeCents)}`
            : `Cook & Leave: ${formatCentsAsDollars(serviceFeeCents)}`
        )
        break
      }

      case 'custom': {
        pricingModel = 'custom'
        requiresCustomPricing = true
        notes.push('Custom service type — requires manual pricing')
        break
      }
    }
  }

  // ── Step 4: Weekend premium ───────────────────────────────────────────────
  // Applies to serviceFeeCents only (before holiday premium stacks on top).
  // Only when: weekendPremiumEnabled = true, eventDate provided, Fri or Sat, not custom.

  let isWeekend = false
  let weekendPremiumPercent = 0
  let weekendPremiumCents = 0

  if (eventDate) {
    const d = new Date(eventDate + 'T12:00:00')
    if (!isNaN(d.getTime())) {
      const dayOfWeek = d.getDay() // 0=Sun, 5=Fri, 6=Sat
      isWeekend = dayOfWeek === 5 || dayOfWeek === 6

      if (isWeekend && weekendPremiumEnabled && !requiresCustomPricing && serviceFeeCents > 0) {
        weekendPremiumPercent = WEEKEND_PREMIUM_PERCENT
        weekendPremiumCents = Math.round(serviceFeeCents * WEEKEND_PREMIUM_PERCENT)
        notes.push(
          `Weekend premium (+${Math.round(WEEKEND_PREMIUM_PERCENT * 100)}%) — ${formatCentsAsDollars(weekendPremiumCents)}`
        )
      } else if (isWeekend && weekendPremiumEnabled === false) {
        notes.push('Friday/Saturday event — weekend premium available but not applied')
      }
    }
  }

  // ── Step 5: Holiday detection ─────────────────────────────────────────────
  // Exact match → tier premium on (serviceFeeCents + weekendPremiumCents).
  // No match → proximity check (Tier 1/2 only) → half-premium.
  // The two are mutually exclusive — never double-count.

  let holidayName: string | null = null
  let holidayTier: HolidayTier | null = null
  let holidayPremiumPercent = 0
  let holidayPremiumCents = 0
  let isNearHoliday = false
  let nearHolidayName: string | null = null
  let nearHolidayPremiumCents = 0

  if (eventDate) {
    const holiday = detectHoliday(eventDate)

    if (holiday) {
      // Exact holiday match
      holidayName = holiday.name
      holidayTier = holiday.tier
      const premium = HOLIDAY_PREMIUMS[holiday.tier]
      holidayPremiumPercent = premium.default
      holidayPremiumCents = Math.round((serviceFeeCents + weekendPremiumCents) * premium.default)
      if (requiresCustomPricing) {
        notes.push(
          `Note: ${holiday.name} (Tier ${holiday.tier}) detected — factor into custom quote`
        )
      } else {
        notes.push(
          `${holiday.name} — Tier ${holiday.tier} premium (+${Math.round(premium.default * 100)}%) = ${formatCentsAsDollars(holidayPremiumCents)}`
        )
      }
    } else {
      // No exact holiday — check proximity
      const proximity = detectHolidayProximity(eventDate)
      if (proximity) {
        isNearHoliday = true
        nearHolidayName = proximity.name
        const premium = HOLIDAY_PREMIUMS[proximity.tier]
        const halfRate = premium.default / 2
        nearHolidayPremiumCents = requiresCustomPricing
          ? 0
          : Math.round((serviceFeeCents + weekendPremiumCents) * halfRate)

        if (requiresCustomPricing) {
          notes.push(
            `Note: event is ${proximity.daysAway} day(s) before ${proximity.name} — factor proximity premium into custom quote`
          )
        } else {
          notes.push(
            `Near ${proximity.name} (${proximity.daysAway} day(s) before) — half-premium (+${Math.round(halfRate * 100)}%) = ${formatCentsAsDollars(nearHolidayPremiumCents)}`
          )
        }
      }
    }
  }

  // ── Step 6: Subtotal ──────────────────────────────────────────────────────
  // service + weekend + exact holiday + proximity holiday (before travel and add-ons)
  const subtotalCents =
    serviceFeeCents + weekendPremiumCents + holidayPremiumCents + nearHolidayPremiumCents

  // ── Step 7: Travel fee ────────────────────────────────────────────────────
  const travelFeeCents = Math.round(distanceMiles * IRS_MILEAGE_RATE_CENTS)
  if (distanceMiles > 0) {
    notes.push(
      `Travel: ${distanceMiles} miles × $${(IRS_MILEAGE_RATE_CENTS / 100).toFixed(2)}/mile = ${formatCentsAsDollars(travelFeeCents)}`
    )
  }

  // ── Step 8: Add-ons ───────────────────────────────────────────────────────
  const { lines: addOnLines, totalCents: addOnTotalCents } = computeAddOns(addOns, guestCount)
  if (addOnLines.length > 0) {
    for (const line of addOnLines) {
      notes.push(`Add-on: ${line.label} — ${formatCentsAsDollars(line.totalCents)}`)
    }
  }

  // ── Step 9: Pre-floor total ───────────────────────────────────────────────
  const preTotalServiceCents = subtotalCents + travelFeeCents + addOnTotalCents

  // ── Step 10: Minimum booking floor ───────────────────────────────────────
  // Applied only to the service fee portion (subtotalCents).
  // Travel and add-ons are added on top of the floored total.
  // Not applied when requiresCustomPricing = true or serviceFeeCents = 0.

  let minimumApplied = false
  let totalServiceCents = preTotalServiceCents

  if (!requiresCustomPricing && subtotalCents > 0 && subtotalCents < MINIMUM_BOOKING_CENTS) {
    const gap = MINIMUM_BOOKING_CENTS - subtotalCents
    totalServiceCents = MINIMUM_BOOKING_CENTS + travelFeeCents + addOnTotalCents
    minimumApplied = true
    notes.push(
      `Minimum booking floor applied — service fee raised by ${formatCentsAsDollars(gap)} to ${formatCentsAsDollars(MINIMUM_BOOKING_CENTS)} minimum`
    )
  }

  // ── Step 11: Deposit ──────────────────────────────────────────────────────
  const depositCents = Math.round(totalServiceCents * DEPOSIT_PERCENTAGE)

  // ── Step 12: Grocery estimate (internal only — never shown to client) ─────
  // Rough estimate: $30–$50 per guest per session.
  // For weekly types, scales by numberOfDays.
  const groceryMultiplier = isWeeklyType ? numberOfDays : 1
  const estimatedGroceryCents = {
    low: guestCount * 3000 * groceryMultiplier,
    high: guestCount * 5000 * groceryMultiplier,
  }

  // ── Step 13: Assemble and return ─────────────────────────────────────────
  return {
    serviceFeeCents,
    perPersonCents,
    guestCount,
    courseCount,
    holidayName,
    holidayTier,
    holidayPremiumPercent,
    holidayPremiumCents,
    isNearHoliday,
    nearHolidayName,
    nearHolidayPremiumCents,
    isWeekend,
    weekendPremiumPercent,
    weekendPremiumCents,
    distanceMiles,
    travelFeeCents,
    addOnLines,
    addOnTotalCents,
    subtotalCents,
    totalServiceCents,
    depositCents,
    depositPercent: DEPOSIT_PERCENTAGE * 100,
    minimumApplied,
    estimatedGroceryCents,
    pricingModel,
    isCouple,
    isLargeGroup,
    requiresCustomPricing,
    numberOfDays,
    notes,
    validationErrors,
    balanceDueHours: BALANCE_DUE_HOURS_BEFORE,
  }
}

// ─── Quote Generation Helper ─────────────────────────────────────────────────
// Creates a quote-ready object from pricing computation.
// Callers should check _requiresCustomPricing before saving a quote.

function buildDefaultQuoteName(input: PricingInput, pricing: PricingBreakdown): string {
  switch (input.serviceType) {
    case 'private_dinner':
      return `${input.courseCount ?? '?'}-course dinner for ${input.guestCount}`
    case 'pizza_experience':
      return `Pizza experience for ${input.guestCount}`
    case 'weekly_standard':
      return `Weekly cooking — ${pricing.numberOfDays} day(s)`
    case 'weekly_commitment':
      return `Commitment rate — ${pricing.numberOfDays} day(s)`
    case 'cook_and_leave':
      return `Cook & Leave — ${pricing.numberOfDays} session(s)`
    case 'multi_night':
      return input.multiNightPackage
        ? `Multi-night package (${input.multiNightPackage.replace(/_/g, ' ')})`
        : `Multi-night package for ${input.guestCount}`
    default:
      return `Custom quote for ${input.guestCount} guest${input.guestCount === 1 ? '' : 's'}`
  }
}

export async function generateQuoteFromPricing(
  input: PricingInput & {
    clientId: string
    inquiryId?: string
    eventId?: string
    quoteName?: string
    pricingNotes?: string
  }
) {
  const pricing = await computePricing(input)

  return {
    client_id: input.clientId,
    inquiry_id: input.inquiryId || null,
    event_id: input.eventId || null,
    quote_name: input.quoteName || buildDefaultQuoteName(input, pricing),
    pricing_model: pricing.pricingModel,
    total_quoted_cents: pricing.totalServiceCents, // includes travel + add-ons
    price_per_person_cents: pricing.perPersonCents || null,
    guest_count_estimated: input.guestCount,
    deposit_required: true,
    deposit_amount_cents: pricing.depositCents,
    deposit_percentage: pricing.depositPercent,
    pricing_notes: input.pricingNotes || pricing.notes.join('. ') || null,
    // Internal: surface validation state so callers can guard against saving broken quotes
    _requiresCustomPricing: pricing.requiresCustomPricing,
    _validationErrors: pricing.validationErrors,
    // Full breakdown for AI or debug use (not stored on quote record)
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
  if (isNaN(date.getTime())) return null

  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()
  const dayOfWeek = date.getDay() // 0=Sunday

  // Tier 1
  for (const h of TIER_1_HOLIDAYS) {
    if ('type' in h && h.type === 'floating') {
      // Thanksgiving: 4th Thursday of November
      if (h.month === 11 && month === 11 && dayOfWeek === 4) {
        const thursdays = countWeekdayInMonth(date, 4)
        if (thursdays === 4) return { name: h.name, tier: 1 }
      }
    } else if ('day' in h && h.month === month && h.day === day) {
      return { name: h.name, tier: 1 }
    }
  }

  // Tier 2
  for (const h of TIER_2_HOLIDAYS) {
    if ('type' in h && h.type === 'floating') {
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
    } else if ('day' in h && h.month === month && h.day === day) {
      return { name: h.name, tier: 2 }
    }
  }

  // Tier 3
  for (const h of TIER_3_HOLIDAYS) {
    if ('type' in h && h.type === 'floating') {
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
    } else if ('day' in h && h.month === month && h.day === day) {
      return { name: h.name, tier: 3 }
    }
  }

  return null
}

// ─── Holiday Proximity Detection ─────────────────────────────────────────────

interface HolidayProximityMatch {
  name: string
  tier: HolidayTier
  daysAway: number // how many days before the holiday
}

/**
 * Check whether a date falls within HOLIDAY_PROXIMITY_DAYS before a Tier 1 or 2 holiday.
 * Only called when detectHoliday() returns null for the same date (mutually exclusive).
 * Returns the nearest upcoming holiday with its distance in days, or null.
 */
function detectHolidayProximity(dateStr: string): HolidayProximityMatch | null {
  for (let offset = 1; offset <= HOLIDAY_PROXIMITY_DAYS; offset++) {
    const futureDate = new Date(dateStr + 'T12:00:00')
    futureDate.setDate(futureDate.getDate() + offset)

    // Format the future date as YYYY-MM-DD
    const y = futureDate.getFullYear()
    const m = String(futureDate.getMonth() + 1).padStart(2, '0')
    const d = String(futureDate.getDate()).padStart(2, '0')
    const futureDateStr = `${y}-${m}-${d}`

    const holiday = detectHoliday(futureDateStr)
    // Only Tier 1 and 2 have proximity premiums
    if (holiday && (holiday.tier === 1 || holiday.tier === 2)) {
      return { name: holiday.name, tier: holiday.tier, daysAway: offset }
    }
  }
  return null
}

// ─── Utility Helpers ─────────────────────────────────────────────────────────

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

  return daysDiff <= 1 // Within 1 day of Easter Sunday
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

export function formatCentsAsDollars(cents: number): string {
  const dollars = cents / 100
  const hasCents = dollars % 1 !== 0
  // Always use thousands separator ($2,500 not $2500).
  // Show cents only for non-whole-dollar amounts (travel fees, etc.).
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(dollars)
}

export function formatPricingForEmail(pricing: PricingBreakdown): string {
  const lines: string[] = []

  // ── Guard: custom pricing ─────────────────────────────────────────────────
  if (pricing.requiresCustomPricing) {
    const reasonNotes = pricing.notes.filter(
      (n) =>
        n.toLowerCase().includes('custom') ||
        n.toLowerCase().includes('requires') ||
        n.toLowerCase().includes('buyout')
    )
    lines.push(`This booking requires a custom quote. ${reasonNotes.join(' ')}`)
    if (pricing.validationErrors.length > 0) {
      lines.push(`[INTERNAL: ${pricing.validationErrors.join('; ')}]`)
    }
    return lines.join(' ')
  }

  // ── Opening line: service fee ─────────────────────────────────────────────
  if (pricing.pricingModel === 'per_person' && pricing.perPersonCents > 0) {
    const guestLabel =
      pricing.guestCount === 1
        ? 'one guest'
        : pricing.isLargeGroup
          ? `your group of ${pricing.guestCount}`
          : `${pricing.guestCount} guests`

    lines.push(
      pricing.courseCount
        ? `For ${guestLabel} at ${pricing.courseCount} courses, it comes out to ${formatCentsAsDollars(pricing.perPersonCents)} per person — ${formatCentsAsDollars(pricing.serviceFeeCents)} for the table.`
        : `For ${guestLabel}, it comes out to ${formatCentsAsDollars(pricing.perPersonCents)} per person — ${formatCentsAsDollars(pricing.serviceFeeCents)} for the table.`
    )
  } else if (pricing.pricingModel === 'flat_rate') {
    if (pricing.numberOfDays > 1) {
      lines.push(
        `The service fee is ${formatCentsAsDollars(pricing.serviceFeeCents)}, covering ${pricing.numberOfDays} day(s).`
      )
    } else {
      lines.push(`The service fee is ${formatCentsAsDollars(pricing.serviceFeeCents)}.`)
    }
  }

  // ── Weekend premium ───────────────────────────────────────────────────────
  if (pricing.weekendPremiumCents > 0) {
    lines.push(
      `Since this is a Friday/Saturday booking, there's a ${Math.round(pricing.weekendPremiumPercent * 100)}% weekend premium of ${formatCentsAsDollars(pricing.weekendPremiumCents)}.`
    )
  }

  // ── Exact holiday premium ─────────────────────────────────────────────────
  if (pricing.holidayPremiumCents > 0) {
    lines.push(
      `Since this falls on ${pricing.holidayName}, there's a ${Math.round(pricing.holidayPremiumPercent * 100)}% holiday premium, bringing the service fee to ${formatCentsAsDollars(pricing.subtotalCents)}.`
    )
  }

  // ── Near-holiday proximity premium ────────────────────────────────────────
  if (pricing.isNearHoliday && pricing.nearHolidayPremiumCents > 0) {
    lines.push(
      `This date falls just before ${pricing.nearHolidayName}, so a proximity premium applies — ${formatCentsAsDollars(pricing.nearHolidayPremiumCents)}.`
    )
  }

  // ── Minimum booking floor ─────────────────────────────────────────────────
  if (pricing.minimumApplied) {
    lines.push(
      `A ${formatCentsAsDollars(MINIMUM_BOOKING_CENTS)} minimum booking applies to this event.`
    )
  }

  // ── Add-ons ───────────────────────────────────────────────────────────────
  if (pricing.addOnLines.length > 0) {
    const descriptions = pricing.addOnLines.map(
      (line) => `${line.label} (${formatCentsAsDollars(line.totalCents)})`
    )
    lines.push(
      `Add-ons included: ${descriptions.join(', ')} — ${formatCentsAsDollars(pricing.addOnTotalCents)} total.`
    )
  }

  // ── Travel ────────────────────────────────────────────────────────────────
  if (pricing.travelFeeCents > 0) {
    lines.push(`Travel is ${formatCentsAsDollars(pricing.travelFeeCents)} based on mileage.`)
  }

  // ── Groceries ─────────────────────────────────────────────────────────────
  const groceryContext =
    pricing.numberOfDays > 1
      ? `for a booking of ${pricing.numberOfDays} days`
      : 'for a booking this size'
  lines.push(
    `Groceries are billed separately at actual cost based on real receipts, usually in the ${formatCentsAsDollars(pricing.estimatedGroceryCents.low)}–${formatCentsAsDollars(pricing.estimatedGroceryCents.high)} range ${groceryContext}.`
  )

  // ── Deposit and balance ───────────────────────────────────────────────────
  lines.push(
    `A ${pricing.depositPercent}% non-refundable deposit locks the date, with the balance due ${pricing.balanceDueHours} hours before service.`
  )

  // ── Internal validation warnings (stripped before sending to client) ──────
  if (pricing.validationErrors.length > 0) {
    lines.push(`[INTERNAL: ${pricing.validationErrors.join('; ')}]`)
  }

  return lines.join(' ')
}
