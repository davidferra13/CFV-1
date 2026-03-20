// Chef Pricing Config - TypeScript types
// Matches the chef_pricing_config table schema.
// All monetary values in cents (minor units).

export interface PricingConfig {
  id: string
  chef_id: string

  // Couples rates (per person)
  couples_rate_3_course: number
  couples_rate_4_course: number
  couples_rate_5_course: number

  // Group rates (per person)
  group_rate_3_course: number
  group_rate_4_course: number
  group_rate_5_course: number

  // Weekly / ongoing
  weekly_standard_min: number
  weekly_standard_max: number
  weekly_commit_min: number
  weekly_commit_max: number
  cook_and_leave_rate: number
  pizza_rate: number

  // Multi-night packages (key -> total cents)
  multi_night_packages: Record<string, number>

  // Deposit and booking policies
  deposit_percentage: number // whole number, e.g. 50 = 50%
  minimum_booking_cents: number
  balance_due_hours: number

  // Mileage
  mileage_rate_cents: number

  // Weekend premium
  weekend_premium_pct: number // whole number, e.g. 10 = 10%
  weekend_premium_on: boolean

  // Holiday premiums (whole-number percentages)
  holiday_tier1_pct: number
  holiday_tier2_pct: number
  holiday_tier3_pct: number
  holiday_proximity_days: number

  // Large group thresholds
  large_group_min: number
  large_group_max: number

  // Add-on catalog (array of add-on definitions)
  add_on_catalog: AddOnCatalogEntry[]

  created_at: string
  updated_at: string
}

export interface AddOnCatalogEntry {
  key: string
  label: string
  type: 'per_person' | 'flat'
  perPersonCents?: number
  flatCents?: number
}

// Input type for updates: all fields optional except chef_id is derived from session
export type PricingConfigInput = Partial<
  Omit<PricingConfig, 'id' | 'chef_id' | 'created_at' | 'updated_at'>
>
