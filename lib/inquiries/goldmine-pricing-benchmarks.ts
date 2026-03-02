/**
 * GOLDMINE Pricing Benchmarks — deterministic runtime module.
 *
 * Hardcoded from conversion-intelligence.json analysis of 49 real threads
 * with 20 pricing data points. No file I/O, no Ollama — pure lookup.
 *
 * Used as a FALLBACK when the chef has no accepted quotes of their own.
 * The chef's own pricing history always takes priority (getPricingSuggestion).
 */

// ─── Benchmark Data (from conversion-intelligence.json) ──────────────────────

interface GuestBucket {
  label: string
  guestMin: number
  guestMax: number
  avg_total_cents: number
  median_total_cents: number
  avg_per_person_cents: number | null
  median_per_person_cents: number | null
  sample_size: number
}

const GUEST_BUCKETS: GuestBucket[] = [
  {
    label: '1-2 guests',
    guestMin: 1,
    guestMax: 2,
    avg_total_cents: 52000,
    median_total_cents: 60000,
    avg_per_person_cents: 26000,
    median_per_person_cents: 30000,
    sample_size: 5,
  },
  {
    label: '3-6 guests',
    guestMin: 3,
    guestMax: 6,
    avg_total_cents: 16000,
    median_total_cents: 16000,
    avg_per_person_cents: 5333,
    median_per_person_cents: 5333,
    sample_size: 1,
  },
  {
    label: '7-12 guests',
    guestMin: 7,
    guestMax: 12,
    avg_total_cents: 107500,
    median_total_cents: 107500,
    avg_per_person_cents: 13306,
    median_per_person_cents: 13306,
    sample_size: 2,
  },
  {
    label: '13+ guests',
    guestMin: 13,
    guestMax: 999,
    avg_total_cents: 10000,
    median_total_cents: 10000,
    avg_per_person_cents: 10000,
    median_per_person_cents: 10000,
    sample_size: 1,
  },
]

// Overall averages (across all 20 pricing data points)
const OVERALL = {
  avg_total_cents: 42050,
  median_total_cents: 30000,
  avg_per_person_cents: 19105,
  median_per_person_cents: 15000,
  range_low_cents: 10000,
  range_high_cents: 155000,
  sample_size: 20,
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PricingBenchmark {
  avg_per_person_cents: number
  median_per_person_cents: number
  avg_total_cents: number
  median_total_cents: number
  range_low_cents: number
  range_high_cents: number
  sample_size: number
  bucket_label: string
}

/**
 * Get pricing benchmark for a given guest count.
 * Falls back to overall averages if no bucket matches well.
 */
export function getGoldminePricingBenchmark(guestCount: number): PricingBenchmark {
  const bucket = GUEST_BUCKETS.find((b) => guestCount >= b.guestMin && guestCount <= b.guestMax)

  if (bucket && bucket.sample_size >= 2) {
    return {
      avg_per_person_cents: bucket.avg_per_person_cents ?? OVERALL.avg_per_person_cents,
      median_per_person_cents: bucket.median_per_person_cents ?? OVERALL.median_per_person_cents,
      avg_total_cents: bucket.avg_total_cents,
      median_total_cents: bucket.median_total_cents,
      range_low_cents: OVERALL.range_low_cents,
      range_high_cents: OVERALL.range_high_cents,
      sample_size: bucket.sample_size,
      bucket_label: bucket.label,
    }
  }

  // Fallback to overall averages
  return {
    avg_per_person_cents: OVERALL.avg_per_person_cents,
    median_per_person_cents: OVERALL.median_per_person_cents,
    avg_total_cents: OVERALL.avg_total_cents,
    median_total_cents: OVERALL.median_total_cents,
    range_low_cents: OVERALL.range_low_cents,
    range_high_cents: OVERALL.range_high_cents,
    sample_size: OVERALL.sample_size,
    bucket_label: 'all events',
  }
}

/**
 * Format a pricing benchmark as a human-readable suggestion string.
 * Used by the quote form as a pricingSuggestion fallback.
 */
export function formatBenchmarkSuggestion(guestCount: number): string | null {
  const b = getGoldminePricingBenchmark(guestCount)
  if (b.sample_size < 2) return null

  const perPerson = Math.round(b.median_per_person_cents / 100)
  const total = Math.round(b.median_total_cents / 100)

  if (guestCount <= 2) {
    return `Similar intimate dinners: ~$${total} total ($${perPerson}/person) based on ${b.sample_size} past bookings`
  }

  return `Similar ${b.bucket_label}: ~$${perPerson}/person (~$${total} total) based on ${b.sample_size} past bookings`
}
