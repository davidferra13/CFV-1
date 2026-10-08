import type { PricingConfig } from '@/lib/pricing/config-types'

// Explicit test data, never an operator's live tariff or a product default.
export function makePricingTestConfig(overrides: Partial<PricingConfig> = {}): PricingConfig {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    chef_id: '00000000-0000-4000-8000-000000000002',
    couples_rate_3_course: 20000,
    couples_rate_4_course: 25000,
    couples_rate_5_course: 30000,
    group_rate_3_course: 15500,
    group_rate_4_course: 18500,
    group_rate_5_course: 21500,
    weekly_standard_min: 40000,
    weekly_standard_max: 50000,
    weekly_commit_min: 30000,
    weekly_commit_max: 35000,
    cook_and_leave_rate: 15000,
    pizza_rate: 15000,
    multi_night_packages: {
      two_night_4_course: 90000,
      three_night_3_course: 0,
      three_night_4_course: 0,
    },
    deposit_percentage: 50,
    minimum_booking_cents: 30000,
    balance_due_hours: 24,
    mileage_rate_cents: 70,
    overhead_percent: 0,
    hourly_rate_cents: 0,
    weekend_premium_pct: 10,
    weekend_premium_on: true,
    holiday_tier1_pct: 45,
    holiday_tier2_pct: 30,
    holiday_tier3_pct: 20,
    holiday_proximity_days: 2,
    large_group_min: 8,
    large_group_max: 14,
    add_on_catalog: [
      { key: 'wine_pairing', label: 'Wine Pairing', type: 'per_person', perPersonCents: 0 },
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
