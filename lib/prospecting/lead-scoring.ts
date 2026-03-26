// Lead Scoring - deterministic 0-100 score from structured prospect fields.
// Formula > AI. No LLM calls. Pure math.

import type { ProspectCategory } from './constants'

interface ProspectScoreInput {
  // From AI generation
  avgEventBudget?: string | null
  annualEventsEstimate?: string | null
  luxuryIndicators?: string[] | null
  eventTypesHosted?: string[] | null
  membershipSize?: string | null
  category?: string | null
  // From web enrichment
  phone?: string | null
  email?: string | null
  website?: string | null
  contactPerson?: string | null
  contactDirectPhone?: string | null
  socialProfiles?: Record<string, string> | null
  verified?: boolean
  // Wave 3 - event signals
  eventSignals?: string | null
}

/**
 * Compute a lead score from 0-100 based on structured prospect data.
 *
 * Scoring breakdown (100 points max):
 * - Budget tier:          0-25 pts
 * - Event frequency:      0-15 pts
 * - Luxury indicators:    0-15 pts
 * - Contact quality:      0-20 pts
 * - Web verification:     0-10 pts
 * - Intelligence depth:   0-15 pts
 *
 * Bonus modifiers (applied after base, still capped at 100):
 * - Seasonal timing:      0-8 pts  (peak booking season approaching)
 * - Event signals:        0-7 pts  (upcoming events detected on their site)
 */
export { computeProspectScore as computeLeadScore }

export function computeProspectScore(input: ProspectScoreInput): number {
  let score = 0

  // 1. Budget tier (0-25)
  score += scoreBudget(input.avgEventBudget)

  // 2. Event frequency (0-15)
  score += scoreEventFrequency(input.annualEventsEstimate)

  // 3. Luxury indicators (0-15)
  const luxCount = input.luxuryIndicators?.length ?? 0
  score += Math.min(luxCount * 3, 15)

  // 4. Contact quality (0-20) - the more real contact info, the higher
  let contactScore = 0
  if (input.phone) contactScore += 4
  if (input.email) contactScore += 4
  if (input.website) contactScore += 3
  if (input.contactPerson) contactScore += 4
  if (input.contactDirectPhone) contactScore += 3
  if (input.socialProfiles && Object.keys(input.socialProfiles).length > 0) contactScore += 2
  score += Math.min(contactScore, 20)

  // 5. Web verification (0-10)
  if (input.verified) score += 10

  // 6. Intelligence depth (0-15) - having rich structured data
  let intelScore = 0
  if (input.eventTypesHosted && input.eventTypesHosted.length > 0) intelScore += 5
  if (input.membershipSize) intelScore += 5
  if (input.annualEventsEstimate) intelScore += 5
  score += Math.min(intelScore, 15)

  // ── Bonus modifiers ──────────────────────────────────────────────────

  // 7. Seasonal timing bonus (0-8)
  score += scoreSeasonalTiming(input.category)

  // 8. Event signals bonus (0-7) - upcoming events detected on their site
  score += scoreEventSignals(input.eventSignals)

  return Math.min(score, 100)
}

function scoreBudget(budgetStr?: string | null): number {
  if (!budgetStr) return 0
  // Extract the largest number from the string (e.g., "$5,000-$10,000" → 10000)
  const numbers = budgetStr.replace(/[,$]/g, '').match(/\d+/g)
  if (!numbers) return 0
  const maxVal = Math.max(...numbers.map(Number))

  if (maxVal >= 20_000) return 25
  if (maxVal >= 10_000) return 20
  if (maxVal >= 5_000) return 15
  if (maxVal >= 2_500) return 10
  if (maxVal >= 1_000) return 5
  return 2
}

function scoreEventFrequency(freqStr?: string | null): number {
  if (!freqStr) return 0
  const lower = freqStr.toLowerCase()
  // Extract numbers
  const numbers = lower.match(/\d+/g)
  if (numbers) {
    const maxVal = Math.max(...numbers.map(Number))
    if (maxVal >= 50) return 15
    if (maxVal >= 20) return 12
    if (maxVal >= 10) return 9
    if (maxVal >= 5) return 6
    if (maxVal >= 1) return 3
  }
  // Keyword fallbacks
  if (lower.includes('weekly') || lower.includes('frequent')) return 15
  if (lower.includes('monthly') || lower.includes('regular')) return 10
  if (lower.includes('quarterly') || lower.includes('several')) return 7
  if (lower.includes('annual') || lower.includes('yearly') || lower.includes('occasional')) return 4
  return 2
}

// ── Seasonal Timing (Wave 3) ──────────────────────────────────────────────
// Private chef bookings follow predictable seasonal patterns by category.
// If the current month is 1-2 months before a category's peak, boost the score.
// This surfaces "call now" prospects at the right time of year.

/** Peak booking months by category (1=Jan, 12=Dec). Months when the category books most. */
const CATEGORY_PEAK_MONTHS: Partial<Record<ProspectCategory, number[]>> = {
  yacht_club: [5, 6, 7, 8], // Summer season
  country_club: [5, 6, 7, 8, 9], // Summer + early fall
  golf_club: [4, 5, 6, 9, 10], // Spring + fall tournaments
  marina: [5, 6, 7, 8], // Summer boating
  luxury_hotel: [6, 7, 8, 11, 12], // Summer + holiday season
  resort_concierge: [6, 7, 8, 12], // Summer + NYE
  wedding_planner: [5, 6, 9, 10], // Spring + fall wedding season
  event_coordinator: [5, 6, 9, 10, 11, 12], // Galas, holiday parties
  corporate_events: [3, 4, 9, 10, 11], // Q1 kickoffs, Q4 year-end
  estate_manager: [6, 7, 8, 11, 12], // Summer entertaining + holidays
  celebrity: [1, 2, 6, 7, 8, 12], // Awards season + summer
  athlete: [2, 3, 7, 8], // Pre/post season hosting
  philanthropist: [9, 10, 11], // Gala season (fall)
  high_net_worth: [6, 7, 8, 11, 12], // Summer + holiday entertaining
}

/**
 * Score bonus for seasonal timing. Returns 0-8 based on how close
 * the current month is to the category's peak booking season.
 * +8 if we're 1-2 months before peak (ideal outreach window).
 * +4 if we're in peak month (still good, but they may already have someone).
 * +0 otherwise.
 */
function scoreSeasonalTiming(category?: string | null): number {
  if (!category) return 0
  const peaks = CATEGORY_PEAK_MONTHS[category as ProspectCategory]
  if (!peaks || peaks.length === 0) return 0

  const currentMonth = new Date().getMonth() + 1 // 1-12

  // Check if current month is 1-2 months before any peak month
  for (const peak of peaks) {
    const monthsBefore = (peak - currentMonth + 12) % 12
    if (monthsBefore === 1 || monthsBefore === 2) return 8 // Sweet spot: call now
    if (monthsBefore === 0) return 4 // In peak: still worth calling
  }

  return 0
}

// ── Event Signals (Wave 3) ────────────────────────────────────────────────
// If we detected upcoming events on the prospect's website, they're actively
// hosting and more likely to need catering. Boost their score.

function scoreEventSignals(eventSignals?: string | null): number {
  if (!eventSignals || eventSignals.trim().length === 0) return 0
  // More signals = more active. Count line breaks as separate events.
  const lines = eventSignals.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length >= 3) return 7 // Very active event calendar
  if (lines.length >= 1) return 4 // At least something upcoming
  return 0
}
