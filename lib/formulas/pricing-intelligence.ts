// Pricing Intelligence - Deterministic Percentile Math
// Analyzes historical pricing data using standard statistics.
// No AI needed - this is percentile math and comparison logic.
// Every pricing tool on the planet does this with math, not LLMs.

// ── Types (match the AI version exactly) ───────────────────────────────────

export type PricingIntelligenceResult = {
  suggestedMinCents: number
  suggestedMaxCents: number
  suggestedPerHeadCents: number
  rationale: string
  underbiddingRisk: boolean
  underbiddingWarning: string | null
  marketPosition: 'below_average' | 'at_average' | 'above_average'
  comparableEvents: number
  confidence: 'high' | 'medium' | 'low'
}

// ── Input types ────────────────────────────────────────────────────────────

export type CurrentEvent = {
  occasion: string | null
  guest_count: number | null
  event_date: string | null
  service_style: string | null
  dietary_restrictions: string[] | null
  quoted_price_cents: number | null
}

export type HistoricalEvent = {
  occasion: string | null
  guest_count: number | null
  quoted_price_cents: number | null
  amount_paid_cents: number | null
  service_style: string | null
  event_date: string | null
}

// ── Statistics helpers ─────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const fraction = index - lower
  return Math.round(sorted[lower] + fraction * (sorted[upper] - sorted[lower]))
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

// ── Formula ────────────────────────────────────────────────────────────────

/**
 * Calculates pricing intelligence using percentile math on historical data.
 * Pure statistics - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function calculatePricingFormula(
  event: CurrentEvent,
  historicalEvents: HistoricalEvent[]
): PricingIntelligenceResult {
  const guestCount = event.guest_count ?? 10

  // Filter to events with actual pricing data
  const withPrices = historicalEvents.filter(
    (h) => h.quoted_price_cents && h.quoted_price_cents > 0
  )

  if (withPrices.length < 3) {
    // Not enough data for meaningful statistics
    return {
      suggestedMinCents: 0,
      suggestedMaxCents: 0,
      suggestedPerHeadCents: 0,
      rationale: `Only ${withPrices.length} historical event${withPrices.length === 1 ? '' : 's'} with pricing data. Complete at least 3 events to get pricing guidance.`,
      underbiddingRisk: false,
      underbiddingWarning: null,
      marketPosition: 'at_average',
      comparableEvents: withPrices.length,
      confidence: 'low',
    }
  }

  // Find comparable events: similar guest count (±50%)
  const comparables = withPrices.filter((h) => {
    const hGuests = h.guest_count ?? 0
    return hGuests >= guestCount * 0.5 && hGuests <= guestCount * 1.5
  })

  // Use comparables if we have enough, otherwise use all events
  const referenceEvents = comparables.length >= 3 ? comparables : withPrices

  // Extract price data
  const prices = referenceEvents.map((h) => h.quoted_price_cents!)
  const perHeadPrices = referenceEvents.map((h) => {
    const guests = h.guest_count ?? guestCount
    return Math.round(h.quoted_price_cents! / guests)
  })

  // Calculate percentiles
  const p25 = percentile(prices, 25)
  const p50 = median(prices)
  const p75 = percentile(prices, 75)
  const avg = mean(prices)
  const perHeadMedian = median(perHeadPrices)

  // Scale to current guest count
  const scaledMin = Math.round(perHeadMedian * guestCount * 0.85) // P25-ish
  const scaledMax = Math.round(perHeadMedian * guestCount * 1.25) // P75-ish
  const suggestedPerHead = perHeadMedian

  // Use the better of: comparable-based or scaled
  const suggestedMinCents = comparables.length >= 3 ? p25 : scaledMin
  const suggestedMaxCents = comparables.length >= 3 ? p75 : scaledMax

  // Check underbidding risk
  const currentQuote = event.quoted_price_cents ?? 0
  const underbiddingRisk = currentQuote > 0 && currentQuote < p25
  const underbiddingWarning = underbiddingRisk
    ? `Current price of $${(currentQuote / 100).toFixed(0)} is below your 25th percentile ($${(p25 / 100).toFixed(0)}). You typically charge more for similar events.`
    : null

  // Market position (relative to own history)
  let marketPosition: PricingIntelligenceResult['marketPosition']
  if (currentQuote > 0) {
    if (currentQuote < p25) marketPosition = 'below_average'
    else if (currentQuote > p75) marketPosition = 'above_average'
    else marketPosition = 'at_average'
  } else {
    marketPosition = 'at_average' // No quote set yet
  }

  // Build rationale
  const parts: string[] = []
  parts.push(
    `Based on ${referenceEvents.length} historical event${referenceEvents.length > 1 ? 's' : ''}`
  )
  if (comparables.length >= 3) {
    parts.push(`(${comparables.length} with similar guest count)`)
  }
  parts.push(
    `your median price is $${(p50 / 100).toFixed(0)} (range: $${(p25 / 100).toFixed(0)} – $${(p75 / 100).toFixed(0)}).`
  )
  parts.push(`Median per-head rate: $${(perHeadMedian / 100).toFixed(0)}/guest.`)

  if (guestCount > 30) {
    parts.push('Larger events often justify a lower per-head rate due to economies of scale.')
  }

  // Confidence based on data quality
  const confidence: 'high' | 'medium' | 'low' =
    comparables.length >= 5 ? 'high' : comparables.length >= 3 ? 'medium' : 'low'

  return {
    suggestedMinCents,
    suggestedMaxCents,
    suggestedPerHeadCents: suggestedPerHead,
    rationale: parts.join(' '),
    underbiddingRisk,
    underbiddingWarning,
    marketPosition,
    comparableEvents: comparables.length,
    confidence,
  }
}
