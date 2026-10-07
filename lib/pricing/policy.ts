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
  type AddOnDefinition,
} from './constants'
import type { PricingConfig } from './config-types'

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
  eventDate?: Date | string // ISO date string (YYYY-MM-DD)
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
  depositCents: number // configured percentage of totalServiceCents
  depositPercent: number

  // Minimum booking floor
  minimumApplied: boolean

  // Grocery estimate (internal only - never shown to client)
  estimatedGroceryCents: { low: number; high: number }

  // Metadata
  pricingModel: 'per_person' | 'flat_rate' | 'custom'
  isCouple: boolean
  isLargeGroup: boolean
  requiresCustomPricing: boolean // true when engine cannot compute a final number
  numberOfDays: number
  notes: string[]
  validationErrors: string[]
  balanceDueHours: number // chef's configured payment deadline
}

// ---- Resolved runtime config (built from DB config or constants) ----

interface ResolvedConfig {
  couplesRates: Record<number, number>
  groupRates: Record<number, number>
  multiNightPackages: Record<string, number>
  weeklyRates: {
    standard_day: { min: number; max: number }
    commitment_day: { min: number; max: number }
    cook_and_leave: number
  }
  pizzaRate: number
  depositPercentage: number // decimal, e.g. 0.5
  mileageRateCents: number
  holidayPremiums: Record<
    HolidayTier,
    { tier: HolidayTier; min: number; max: number; default: number }
  >
  holidayProximityDays: number
  weekendPremiumPercent: number // decimal, e.g. 0.1
  minimumBookingCents: number
  balanceDueHours: number
  largeGroupMin: number
  largeGroupMax: number
  weeklyCommitmentMinDays: number
  addOnCatalog: Record<string, AddOnDefinition>
}

/**
 * Build a ResolvedConfig from a PricingConfig (DB row) or fall back to constants.
 */
export function resolveConfig(config?: PricingConfig): ResolvedConfig {
  if (!config) {
    return {
      couplesRates: COUPLES_RATES,
      groupRates: GROUP_RATES,
      multiNightPackages: MULTI_NIGHT_PACKAGES,
      weeklyRates: WEEKLY_RATES,
      pizzaRate: PIZZA_RATE,
      depositPercentage: DEPOSIT_PERCENTAGE,
      mileageRateCents: IRS_MILEAGE_RATE_CENTS,
      holidayPremiums: HOLIDAY_PREMIUMS,
      holidayProximityDays: HOLIDAY_PROXIMITY_DAYS,
      weekendPremiumPercent: WEEKEND_PREMIUM_PERCENT,
      minimumBookingCents: MINIMUM_BOOKING_CENTS,
      balanceDueHours: BALANCE_DUE_HOURS_BEFORE,
      largeGroupMin: LARGE_GROUP_MIN_GUESTS,
      largeGroupMax: LARGE_GROUP_MAX_GUESTS,
      weeklyCommitmentMinDays: WEEKLY_COMMITMENT_MIN_DAYS,
      addOnCatalog: ADD_ON_CATALOG,
    }
  }

  // Build add-on catalog from DB JSONB array
  const addOnCatalog: Record<string, AddOnDefinition> = {}
  if (Array.isArray(config.add_on_catalog)) {
    for (const entry of config.add_on_catalog) {
      if (entry.key && entry.key !== 'custom') {
        addOnCatalog[entry.key] = {
          label: entry.label,
          type: entry.type,
          perPersonCents: entry.perPersonCents,
          flatCents: entry.flatCents,
        }
      }
    }
  }

  return {
    couplesRates: {
      3: config.couples_rate_3_course,
      4: config.couples_rate_4_course,
      5: config.couples_rate_5_course,
    },
    groupRates: {
      3: config.group_rate_3_course,
      4: config.group_rate_4_course,
      5: config.group_rate_5_course,
    },
    multiNightPackages: (config.multi_night_packages ?? {}) as Record<string, number>,
    weeklyRates: {
      standard_day: { min: config.weekly_standard_min, max: config.weekly_standard_max },
      commitment_day: { min: config.weekly_commit_min, max: config.weekly_commit_max },
      cook_and_leave: config.cook_and_leave_rate,
    },
    pizzaRate: config.pizza_rate,
    depositPercentage: config.deposit_percentage / 100, // DB stores whole number, engine uses decimal
    mileageRateCents: config.mileage_rate_cents,
    holidayPremiums: {
      1: {
        tier: 1,
        min: (config.holiday_tier1_pct - 5) / 100,
        max: (config.holiday_tier1_pct + 5) / 100,
        default: config.holiday_tier1_pct / 100,
      },
      2: {
        tier: 2,
        min: (config.holiday_tier2_pct - 5) / 100,
        max: (config.holiday_tier2_pct + 5) / 100,
        default: config.holiday_tier2_pct / 100,
      },
      3: {
        tier: 3,
        min: (config.holiday_tier3_pct - 5) / 100,
        max: (config.holiday_tier3_pct + 5) / 100,
        default: config.holiday_tier3_pct / 100,
      },
    },
    holidayProximityDays: config.holiday_proximity_days,
    weekendPremiumPercent: config.weekend_premium_pct / 100, // DB stores whole number, engine uses decimal
    minimumBookingCents: config.minimum_booking_cents,
    balanceDueHours: config.balance_due_hours,
    largeGroupMin: config.large_group_min,
    largeGroupMax: config.large_group_max,
    weeklyCommitmentMinDays: WEEKLY_COMMITMENT_MIN_DAYS, // Not stored in DB, kept as system constant
    addOnCatalog: Object.keys(addOnCatalog).length > 0 ? addOnCatalog : ADD_ON_CATALOG,
  }
}

// ─── Input Validation ─────────────────────────────────────────────────────────

/**
 * Validate a PricingInput before computation.
 * Always returns a result - never throws. Errors are informational.
 * Exported so callers (e.g., quote forms) can pre-validate UI state.
 */
export function validatePricingInput(
  input: PricingInput,
  config?: PricingConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const packages = config?.multi_night_packages ?? MULTI_NIGHT_PACKAGES
  const largeGroupMax = config?.large_group_max ?? LARGE_GROUP_MAX_GUESTS

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
        `${input.courseCount}-course menu is outside the standard 3–5 course range - requires custom pricing`
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
    } else if (!(input.multiNightPackage in packages)) {
      errors.push(
        `Unknown multi-night package "${input.multiNightPackage}". Valid keys: ${Object.keys(packages).join(', ')}`
      )
    } else if (packages[input.multiNightPackage] === 0) {
      errors.push(
        `Multi-night package "${input.multiNightPackage}" is a placeholder - price not yet confirmed. Requires custom pricing.`
      )
    }
  }

  // weekly_commitment: warn if fewer than WEEKLY_COMMITMENT_MIN_DAYS
  if (input.serviceType === 'weekly_commitment') {
    const days = input.numberOfDays ?? 1
    if (days < WEEKLY_COMMITMENT_MIN_DAYS) {
      errors.push(
        `Commitment rate requires at least ${WEEKLY_COMMITMENT_MIN_DAYS} consecutive days. Received ${days} day(s) - use weekly_standard for shorter bookings.`
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
  if (input.guestCount > largeGroupMax) {
    errors.push(
      `Guest count of ${input.guestCount} exceeds ${largeGroupMax} - requires a custom large-group or buyout quote`
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
