// Pricing Calculator - pure calculation engine for cost-plus pricing
// No database, no server actions. Client-side utility.

export type EventType =
  | 'intimate'
  | 'dinner-party'
  | 'corporate'
  | 'meal-prep'
  | 'cooking-class'
  | 'custom'

export type ExperienceLevel = 'new' | 'established' | 'premium'
export type MarketArea = 'rural' | 'suburban' | 'urban' | 'luxury-market'

export interface PricingInput {
  guestCount: number
  courses: number // 1-7
  estimatedIngredientCostCents: number
  prepHours: number
  cookingHours: number
  cleanupHours: number // default 0.5
  travelMiles: number // round trip
  eventType: EventType
  experienceLevel: ExperienceLevel
  marketArea: MarketArea
}

export interface PricingBreakdown {
  ingredientCostCents: number
  laborCostCents: number
  travelCostCents: number
  overheadCents: number
  profitMarginCents: number
}

export interface PricingOutput {
  recommendedPriceCents: number
  rangeLowCents: number
  rangeHighCents: number
  perGuestCents: number
  breakdown: PricingBreakdown
  hourlyEffectiveRate: number
  insights: string[]
}

// Base hourly rates (cents) by experience level
const BASE_HOURLY_RATES: Record<ExperienceLevel, { low: number; high: number }> = {
  new: { low: 3500, high: 5000 },
  established: { low: 5000, high: 8500 },
  premium: { low: 8500, high: 15000 },
}

// Market area multipliers
const MARKET_MULTIPLIERS: Record<MarketArea, number> = {
  rural: 0.75,
  suburban: 1.0,
  urban: 1.3,
  'luxury-market': 1.6,
}

// IRS standard mileage rate for 2026 (cents per mile)
const IRS_MILEAGE_RATE_CENTS = 67

// Overhead percentage range (of subtotal before profit)
const OVERHEAD_RATE = { low: 0.15, mid: 0.175, high: 0.20 }

// Profit margin range by experience
const PROFIT_MARGINS: Record<ExperienceLevel, { low: number; mid: number; high: number }> = {
  new: { low: 0.20, mid: 0.25, high: 0.30 },
  established: { low: 0.25, mid: 0.30, high: 0.35 },
  premium: { low: 0.30, mid: 0.35, high: 0.40 },
}

// Food cost markup: ingredient cost * 3.0 (industry standard 33% food cost ratio)
const FOOD_COST_MULTIPLIER = 3.0

// Event type complexity multipliers (affects labor estimate)
const EVENT_TYPE_MULTIPLIERS: Record<EventType, number> = {
  intimate: 1.0,
  'dinner-party': 1.1,
  corporate: 1.2,
  'meal-prep': 0.8,
  'cooking-class': 1.3,
  custom: 1.0,
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const {
    guestCount,
    courses,
    estimatedIngredientCostCents,
    prepHours,
    cookingHours,
    cleanupHours,
    travelMiles,
    eventType,
    experienceLevel,
    marketArea,
  } = input

  const marketMultiplier = MARKET_MULTIPLIERS[marketArea]
  const eventMultiplier = EVENT_TYPE_MULTIPLIERS[eventType]
  const rates = BASE_HOURLY_RATES[experienceLevel]
  const margins = PROFIT_MARGINS[experienceLevel]

  // Compute hourly rates adjusted for market
  const hourlyLow = Math.round(rates.low * marketMultiplier)
  const hourlyMid = Math.round(((rates.low + rates.high) / 2) * marketMultiplier)
  const hourlyHigh = Math.round(rates.high * marketMultiplier)

  // Total labor hours with event type complexity
  const totalHours = (prepHours + cookingHours + cleanupHours) * eventMultiplier

  // Course complexity bonus: each course beyond 3 adds 10% to labor
  const courseBonus = courses > 3 ? 1 + (courses - 3) * 0.1 : 1.0

  // Ingredient cost with standard food cost markup
  const ingredientCostCents = Math.round(estimatedIngredientCostCents * FOOD_COST_MULTIPLIER)

  // Travel cost
  const travelCostCents = Math.round(travelMiles * IRS_MILEAGE_RATE_CENTS)

  // Calculate three tiers: low, mid, high
  function computeTier(hourlyRate: number, overheadRate: number, profitRate: number) {
    const laborCents = Math.round(totalHours * hourlyRate * courseBonus)
    const subtotal = ingredientCostCents + laborCents + travelCostCents
    const overheadCents = Math.round(subtotal * overheadRate)
    const baseWithOverhead = subtotal + overheadCents
    const profitCents = Math.round(baseWithOverhead * profitRate)
    const total = baseWithOverhead + profitCents
    return { laborCents, overheadCents, profitCents, total }
  }

  const low = computeTier(hourlyLow, OVERHEAD_RATE.low, margins.low)
  const mid = computeTier(hourlyMid, OVERHEAD_RATE.mid, margins.mid)
  const high = computeTier(hourlyHigh, OVERHEAD_RATE.high, margins.high)

  const perGuestCents = guestCount > 0 ? Math.round(mid.total / guestCount) : mid.total
  const totalHoursRaw = prepHours + cookingHours + cleanupHours
  const hourlyEffectiveRate = totalHoursRaw > 0
    ? Math.round((mid.total / totalHoursRaw) / 100 * 100) / 100
    : 0

  // Build insights
  const insights: string[] = []

  if (totalHoursRaw > 0) {
    insights.push(
      `At the recommended price, you'd earn about $${hourlyEffectiveRate.toFixed(0)}/hr including all prep, cooking, and cleanup time.`
    )
  }

  if (estimatedIngredientCostCents > 0) {
    const foodCostPct = Math.round((estimatedIngredientCostCents / mid.total) * 100)
    if (foodCostPct > 40) {
      insights.push(
        `Your raw ingredient cost is ${foodCostPct}% of the recommended price. The industry target is 33% or below. Consider adjusting your menu or raising your price.`
      )
    } else if (foodCostPct < 20) {
      insights.push(
        `Your ingredient cost is only ${foodCostPct}% of the total, well below the 33% industry average. You have strong margins on food.`
      )
    }
  }

  if (travelMiles > 50) {
    insights.push(
      `Travel adds $${(travelCostCents / 100).toFixed(0)} to this event. For distances over 50 miles, consider listing travel as a separate line item on your quote.`
    )
  }

  if (guestCount > 0 && perGuestCents > 0) {
    insights.push(
      `At $${(perGuestCents / 100).toFixed(0)} per guest for ${guestCount} guests, this is ${perGuestCents > 15000 ? 'premium' : perGuestCents > 7500 ? 'mid-range' : 'budget-friendly'} pricing.`
    )
  }

  if (experienceLevel === 'new') {
    insights.push(
      'As a newer chef, pricing competitively helps build your client base. Once you have 20+ events and strong reviews, consider moving to "established" rates.'
    )
  }

  if (eventType === 'corporate') {
    insights.push(
      'Corporate clients typically expect polished presentation and may have specific dietary requirements. The higher complexity multiplier reflects this.'
    )
  }

  if (courses >= 6) {
    insights.push(
      `A ${courses}-course menu is a significant undertaking. Make sure your prep time accounts for the complexity of plating and timing.`
    )
  }

  return {
    recommendedPriceCents: mid.total,
    rangeLowCents: low.total,
    rangeHighCents: high.total,
    perGuestCents,
    breakdown: {
      ingredientCostCents,
      laborCostCents: mid.laborCents,
      travelCostCents,
      overheadCents: mid.overheadCents,
      profitMarginCents: mid.profitCents,
    },
    hourlyEffectiveRate,
    insights,
  }
}

// Display helpers
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function formatCentsDecimal(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  intimate: 'Intimate Dinner (1-6 guests)',
  'dinner-party': 'Dinner Party (7-20 guests)',
  corporate: 'Corporate Event',
  'meal-prep': 'Meal Prep',
  'cooking-class': 'Cooking Class',
  custom: 'Custom Event',
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, { label: string; description: string }> = {
  new: { label: 'New Chef', description: 'Starting out, building your client base (0-2 years)' },
  established: { label: 'Established', description: 'Consistent bookings, solid reviews (2-5+ years)' },
  premium: { label: 'Premium', description: 'High-end clientele, strong reputation (5+ years)' },
}

export const MARKET_LABELS: Record<MarketArea, { label: string; description: string }> = {
  rural: { label: 'Rural', description: '0.75x rate (lower cost of living)' },
  suburban: { label: 'Suburban', description: '1.0x rate (baseline)' },
  urban: { label: 'Urban', description: '1.3x rate (higher demand)' },
  'luxury-market': { label: 'Luxury Market', description: '1.6x rate (affluent areas)' },
}
