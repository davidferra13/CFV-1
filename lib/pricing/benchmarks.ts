// Industry Pricing Benchmarks by Chef Archetype
// Used during guided pricing setup to show chefs what peers charge.
// Sources: Bureau of Labor Statistics, industry surveys, marketplace data.
// All amounts in cents (minor units).
//
// NOT a server action file - pure data.

import type { ArchetypeId } from '@/lib/archetypes/presets'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BenchmarkRange {
  low: number // cents
  mid: number // cents
  high: number // cents
  label: string // human-readable label for this price point
}

export interface BenchmarkSet {
  archetype: ArchetypeId
  label: string
  description: string
  sections: BenchmarkSection[]
}

export interface BenchmarkSection {
  key: string
  title: string
  subtitle: string
  stat?: string // e.g. "78% of private chefs charge per person"
  fields: BenchmarkField[]
}

export interface BenchmarkField {
  /** Maps to a key in chef_pricing_config */
  configKey: string
  label: string
  unit:
    | 'cents_per_person'
    | 'cents_flat'
    | 'cents_per_day'
    | 'cents_per_session'
    | 'percentage'
    | 'hours'
    | 'number'
  benchmark: BenchmarkRange
  tip?: string // contextual tip shown below the input
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cents(dollars: number): number {
  return Math.round(dollars * 100)
}

// ─── Private Chef Benchmarks ────────────────────────────────────────────────

const PRIVATE_CHEF: BenchmarkSet = {
  archetype: 'private-chef',
  label: 'Private Chef',
  description: 'Based on data from private chef marketplaces and industry surveys across the US.',
  sections: [
    {
      key: 'couples',
      title: 'Couples Dinners (1-2 guests)',
      subtitle: 'Intimate multi-course dining experiences',
      stat: 'Private chefs typically charge 30-50% more per person for couples due to the same prep time with fewer guests.',
      fields: [
        {
          configKey: 'couples_rate_3_course',
          label: '3-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(150), mid: cents(200), high: cents(300), label: 'per person' },
          tip: 'Most chefs start around $175-225 for a 3-course couples experience.',
        },
        {
          configKey: 'couples_rate_4_course',
          label: '4-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(200), mid: cents(275), high: cents(400), label: 'per person' },
          tip: 'A 4-course dinner is the most popular option for date nights.',
        },
        {
          configKey: 'couples_rate_5_course',
          label: '5-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(250), mid: cents(350), high: cents(500), label: 'per person' },
          tip: 'Premium tasting menus can command $350+ in major metro areas.',
        },
      ],
    },
    {
      key: 'groups',
      title: 'Group Dinners (3+ guests)',
      subtitle: 'Dinner parties, celebrations, and gatherings',
      stat: 'Group rates are typically 25-40% lower per person than couples rates since prep time is amortized across more guests.',
      fields: [
        {
          configKey: 'group_rate_3_course',
          label: '3-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(100), mid: cents(150), high: cents(225), label: 'per person' },
        },
        {
          configKey: 'group_rate_4_course',
          label: '4-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(125), mid: cents(185), high: cents(275), label: 'per person' },
          tip: '4-course group dinners are the bread and butter of most private chefs.',
        },
        {
          configKey: 'group_rate_5_course',
          label: '5-course dinner',
          unit: 'cents_per_person',
          benchmark: { low: cents(150), mid: cents(225), high: cents(350), label: 'per person' },
        },
      ],
    },
    {
      key: 'weekly',
      title: 'Weekly / Recurring Services',
      subtitle: 'Ongoing meal prep, cook days, and regular clients',
      stat: 'Weekly clients provide predictable revenue. Most chefs offer a 15-25% discount for committed weekly bookings.',
      fields: [
        {
          configKey: 'weekly_standard_min',
          label: 'Standard day rate (low end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(300), mid: cents(400), high: cents(600), label: 'per day' },
        },
        {
          configKey: 'weekly_standard_max',
          label: 'Standard day rate (high end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(400), mid: cents(500), high: cents(800), label: 'per day' },
        },
        {
          configKey: 'weekly_commit_min',
          label: 'Commitment rate (low end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(250), mid: cents(325), high: cents(450), label: 'per day' },
          tip: 'The commitment rate rewards clients who book 5+ consecutive days per week.',
        },
        {
          configKey: 'weekly_commit_max',
          label: 'Commitment rate (high end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(300), mid: cents(400), high: cents(550), label: 'per day' },
        },
        {
          configKey: 'cook_and_leave_rate',
          label: 'Cook & Leave (2 meals)',
          unit: 'cents_per_session',
          benchmark: { low: cents(100), mid: cents(175), high: cents(250), label: 'per session' },
          tip: 'Cook & Leave is popular with busy families. No table service, just great food ready to eat.',
        },
      ],
    },
    {
      key: 'policies',
      title: 'Booking Policies',
      subtitle: 'Deposits, minimums, and payment terms',
      stat: '85% of private chefs require a deposit to secure the date. The industry standard is 50%.',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Deposit required',
          unit: 'percentage',
          benchmark: { low: 25, mid: 50, high: 100, label: '%' },
          tip: '50% is the industry standard. Some chefs do 100% prepaid for smaller bookings.',
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Minimum booking',
          unit: 'cents_flat',
          benchmark: { low: cents(200), mid: cents(350), high: cents(500), label: 'minimum' },
          tip: 'Protects your time on smaller jobs. Most chefs set this at $250-400.',
        },
        {
          configKey: 'balance_due_hours',
          label: 'Balance due before service',
          unit: 'hours',
          benchmark: { low: 24, mid: 48, high: 72, label: 'hours' },
          tip: '24-48 hours before service is standard. Gives you time to shop if balance is outstanding.',
        },
      ],
    },
    {
      key: 'premiums',
      title: 'Premiums & Surcharges',
      subtitle: 'Weekends, holidays, and seasonal adjustments',
      stat: 'Holiday premiums are standard in the industry. Most clients expect to pay more for major holidays.',
      fields: [
        {
          configKey: 'weekend_premium_pct',
          label: 'Weekend premium (Fri/Sat)',
          unit: 'percentage',
          benchmark: { low: 0, mid: 10, high: 20, label: '%' },
          tip: 'Not all chefs charge a weekend premium. If your weekends are booked solid, consider adding one.',
        },
        {
          configKey: 'holiday_tier1_pct',
          label: 'Major holidays (Christmas, NYE, Thanksgiving)',
          unit: 'percentage',
          benchmark: { low: 25, mid: 45, high: 75, label: '%' },
          tip: 'Tier 1 holidays are the highest demand. 40-50% premium is standard.',
        },
        {
          configKey: 'holiday_tier2_pct',
          label: 'Mid-tier holidays (Easter, July 4th)',
          unit: 'percentage',
          benchmark: { low: 15, mid: 30, high: 50, label: '%' },
          tip: 'Moderate demand holidays. 25-35% is typical.',
        },
        {
          configKey: 'holiday_tier3_pct',
          label: 'Minor holidays (Memorial Day, Labor Day)',
          unit: 'percentage',
          benchmark: { low: 10, mid: 20, high: 35, label: '%' },
          tip: 'Lower premium, but still above a normal day. 15-25% is common.',
        },
      ],
    },
    {
      key: 'mileage',
      title: 'Travel',
      subtitle: 'Mileage reimbursement for driving to clients',
      fields: [
        {
          configKey: 'mileage_rate_cents',
          label: 'Mileage rate',
          unit: 'cents_flat',
          benchmark: { low: cents(0.585), mid: cents(0.67), high: cents(0.7), label: 'per mile' },
          tip: 'The 2026 IRS standard rate is $0.70/mile. Most chefs use this or charge a flat travel fee.',
        },
      ],
    },
  ],
}

// ─── Caterer Benchmarks ─────────────────────────────────────────────────────

const CATERER: BenchmarkSet = {
  archetype: 'caterer',
  label: 'Caterer',
  description:
    'Based on catering industry averages. Rates vary widely by region, cuisine, and service style.',
  sections: [
    {
      key: 'groups',
      title: 'Per-Person Rates',
      subtitle: 'Standard catering pricing by course count',
      stat: 'Caterers typically price per person with a minimum guest count. Rates include staff and service.',
      fields: [
        {
          configKey: 'group_rate_3_course',
          label: '3-course meal',
          unit: 'cents_per_person',
          benchmark: { low: cents(55), mid: cents(85), high: cents(150), label: 'per person' },
        },
        {
          configKey: 'group_rate_4_course',
          label: '4-course meal',
          unit: 'cents_per_person',
          benchmark: { low: cents(75), mid: cents(110), high: cents(200), label: 'per person' },
        },
        {
          configKey: 'group_rate_5_course',
          label: '5-course meal',
          unit: 'cents_per_person',
          benchmark: { low: cents(95), mid: cents(140), high: cents(250), label: 'per person' },
        },
      ],
    },
    {
      key: 'policies',
      title: 'Booking Policies',
      subtitle: 'Deposits, minimums, and payment terms',
      stat: 'Caterers often have higher minimums than private chefs due to staffing and equipment needs.',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Deposit required',
          unit: 'percentage',
          benchmark: { low: 25, mid: 50, high: 100, label: '%' },
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Minimum booking',
          unit: 'cents_flat',
          benchmark: { low: cents(500), mid: cents(1000), high: cents(2500), label: 'minimum' },
          tip: 'Catering minimums are typically higher ($500-2500+) due to setup, staff, and equipment.',
        },
        {
          configKey: 'balance_due_hours',
          label: 'Balance due before service',
          unit: 'hours',
          benchmark: { low: 48, mid: 72, high: 168, label: 'hours' },
          tip: 'Caterers often require final payment 3-7 days before the event.',
        },
      ],
    },
    {
      key: 'premiums',
      title: 'Premiums & Surcharges',
      subtitle: 'Weekends, holidays, and seasonal adjustments',
      fields: [
        {
          configKey: 'weekend_premium_pct',
          label: 'Weekend premium',
          unit: 'percentage',
          benchmark: { low: 0, mid: 15, high: 25, label: '%' },
        },
        {
          configKey: 'holiday_tier1_pct',
          label: 'Major holidays',
          unit: 'percentage',
          benchmark: { low: 25, mid: 50, high: 100, label: '%' },
        },
        {
          configKey: 'holiday_tier2_pct',
          label: 'Mid-tier holidays',
          unit: 'percentage',
          benchmark: { low: 15, mid: 35, high: 50, label: '%' },
        },
        {
          configKey: 'holiday_tier3_pct',
          label: 'Minor holidays',
          unit: 'percentage',
          benchmark: { low: 10, mid: 20, high: 35, label: '%' },
        },
      ],
    },
  ],
}

// ─── Meal Prep Benchmarks ───────────────────────────────────────────────────

const MEAL_PREP: BenchmarkSet = {
  archetype: 'meal-prep',
  label: 'Meal Prep Chef',
  description:
    'Based on meal prep service pricing across the US. Rates vary by menu complexity and delivery model.',
  sections: [
    {
      key: 'weekly',
      title: 'Weekly Service Rates',
      subtitle: 'Recurring meal prep and cooking sessions',
      stat: 'Meal prep chefs thrive on recurring clients. Weekly commitments are the core revenue driver.',
      fields: [
        {
          configKey: 'weekly_standard_min',
          label: 'Standard session (low end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(200), mid: cents(300), high: cents(450), label: 'per session' },
        },
        {
          configKey: 'weekly_standard_max',
          label: 'Standard session (high end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(300), mid: cents(400), high: cents(600), label: 'per session' },
        },
        {
          configKey: 'weekly_commit_min',
          label: 'Commitment rate (low end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(175), mid: cents(250), high: cents(350), label: 'per session' },
        },
        {
          configKey: 'weekly_commit_max',
          label: 'Commitment rate (high end)',
          unit: 'cents_per_day',
          benchmark: { low: cents(250), mid: cents(350), high: cents(500), label: 'per session' },
        },
        {
          configKey: 'cook_and_leave_rate',
          label: 'Cook & Leave (per session)',
          unit: 'cents_per_session',
          benchmark: { low: cents(100), mid: cents(150), high: cents(250), label: 'per session' },
          tip: 'This is your core service. Price it competitively for volume.',
        },
      ],
    },
    {
      key: 'policies',
      title: 'Booking Policies',
      subtitle: 'Payment terms for recurring services',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Upfront payment',
          unit: 'percentage',
          benchmark: { low: 50, mid: 100, high: 100, label: '%' },
          tip: 'Most meal prep chefs collect 100% upfront for weekly services.',
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Minimum per session',
          unit: 'cents_flat',
          benchmark: { low: cents(150), mid: cents(250), high: cents(400), label: 'minimum' },
        },
      ],
    },
  ],
}

// ─── Restaurant Benchmarks ──────────────────────────────────────────────────

const RESTAURANT: BenchmarkSet = {
  archetype: 'restaurant',
  label: 'Restaurant',
  description: 'Restaurant pricing varies enormously by concept. Set your baseline rates here.',
  sections: [
    {
      key: 'groups',
      title: 'Per-Person Pricing',
      subtitle: 'Average check targets by course count',
      stat: 'Use these as your target average check for menu engineering.',
      fields: [
        {
          configKey: 'group_rate_3_course',
          label: '3-course prix fixe',
          unit: 'cents_per_person',
          benchmark: { low: cents(35), mid: cents(65), high: cents(120), label: 'per person' },
        },
        {
          configKey: 'group_rate_4_course',
          label: '4-course prix fixe',
          unit: 'cents_per_person',
          benchmark: { low: cents(50), mid: cents(85), high: cents(150), label: 'per person' },
        },
        {
          configKey: 'group_rate_5_course',
          label: 'Tasting menu',
          unit: 'cents_per_person',
          benchmark: { low: cents(75), mid: cents(125), high: cents(250), label: 'per person' },
        },
      ],
    },
    {
      key: 'policies',
      title: 'Policies',
      subtitle: 'Deposits for private events and buyouts',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Event deposit',
          unit: 'percentage',
          benchmark: { low: 25, mid: 50, high: 100, label: '%' },
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Private event minimum',
          unit: 'cents_flat',
          benchmark: { low: cents(500), mid: cents(1500), high: cents(5000), label: 'minimum' },
        },
      ],
    },
  ],
}

// ─── Food Truck Benchmarks ──────────────────────────────────────────────────

const FOOD_TRUCK: BenchmarkSet = {
  archetype: 'food-truck',
  label: 'Food Truck',
  description: 'Food truck pricing is typically per-item or per-person for catering gigs.',
  sections: [
    {
      key: 'groups',
      title: 'Catering Rates',
      subtitle: 'Per-person pricing for events and private bookings',
      stat: 'Food trucks at private events typically charge $15-35 per person depending on the menu.',
      fields: [
        {
          configKey: 'group_rate_3_course',
          label: 'Standard menu',
          unit: 'cents_per_person',
          benchmark: { low: cents(15), mid: cents(25), high: cents(40), label: 'per person' },
        },
        {
          configKey: 'group_rate_4_course',
          label: 'Premium menu',
          unit: 'cents_per_person',
          benchmark: { low: cents(25), mid: cents(35), high: cents(55), label: 'per person' },
        },
      ],
    },
    {
      key: 'policies',
      title: 'Booking Policies',
      subtitle: 'Deposits and minimums for private events',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Event deposit',
          unit: 'percentage',
          benchmark: { low: 25, mid: 50, high: 50, label: '%' },
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Event minimum',
          unit: 'cents_flat',
          benchmark: { low: cents(300), mid: cents(750), high: cents(1500), label: 'minimum' },
          tip: 'Covers your fuel, setup time, and opportunity cost.',
        },
      ],
    },
  ],
}

// ─── Bakery Benchmarks ──────────────────────────────────────────────────────

const BAKERY: BenchmarkSet = {
  archetype: 'bakery',
  label: 'Bakery / Pastry',
  description:
    'Bakery pricing is typically per-item or per-order. Set baseline rates for custom orders.',
  sections: [
    {
      key: 'groups',
      title: 'Custom Order Pricing',
      subtitle: 'Per-person rates for catered dessert services',
      fields: [
        {
          configKey: 'group_rate_3_course',
          label: 'Standard dessert spread',
          unit: 'cents_per_person',
          benchmark: { low: cents(12), mid: cents(20), high: cents(35), label: 'per person' },
        },
        {
          configKey: 'group_rate_4_course',
          label: 'Premium dessert experience',
          unit: 'cents_per_person',
          benchmark: { low: cents(20), mid: cents(35), high: cents(60), label: 'per person' },
        },
      ],
    },
    {
      key: 'policies',
      title: 'Order Policies',
      subtitle: 'Deposits and minimums for custom orders',
      fields: [
        {
          configKey: 'deposit_percentage',
          label: 'Order deposit',
          unit: 'percentage',
          benchmark: { low: 50, mid: 50, high: 100, label: '%' },
        },
        {
          configKey: 'minimum_booking_cents',
          label: 'Minimum order',
          unit: 'cents_flat',
          benchmark: { low: cents(50), mid: cents(150), high: cents(300), label: 'minimum' },
        },
      ],
    },
  ],
}

// ─── Registry ───────────────────────────────────────────────────────────────

const BENCHMARK_REGISTRY: Record<ArchetypeId, BenchmarkSet> = {
  'private-chef': PRIVATE_CHEF,
  caterer: CATERER,
  'meal-prep': MEAL_PREP,
  restaurant: RESTAURANT,
  'food-truck': FOOD_TRUCK,
  bakery: BAKERY,
}

/**
 * Get benchmark data for a given chef archetype.
 * Falls back to private-chef if archetype is unknown.
 */
export function getBenchmarksForArchetype(archetype: ArchetypeId | string | null): BenchmarkSet {
  if (archetype && archetype in BENCHMARK_REGISTRY) {
    return BENCHMARK_REGISTRY[archetype as ArchetypeId]
  }
  return BENCHMARK_REGISTRY['private-chef']
}

/**
 * Get all available benchmark sets (for a "browse all" view).
 */
export function getAllBenchmarks(): BenchmarkSet[] {
  return Object.values(BENCHMARK_REGISTRY)
}

/**
 * Format cents as a dollar display string.
 */
export function benchmarkCentsToDisplay(cents: number): string {
  if (cents < 100) return `$${(cents / 100).toFixed(2)}`
  return `$${Math.round(cents / 100).toLocaleString()}`
}
