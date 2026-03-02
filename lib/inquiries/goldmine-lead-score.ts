/**
 * GOLDMINE-derived lead scoring formula.
 *
 * Pure deterministic function — formula > AI. Takes an inquiry's extracted
 * fields and returns a 0-100 score with factor breakdown and tier.
 *
 * Weights derived from 49 real conversation threads (Nov 2023 – Oct 2024)
 * with labeled outcomes: 15 confirmed booked, 8 likely booked, 18 expired,
 * 8 declined. Each weight reflects the conversion lift that field presence
 * provides in the real dataset.
 *
 * NO 'use server' — importable from both build scripts and server actions.
 */

// ─── Weight Table (derived from GOLDMINE conversion analysis) ───────────
//
// Lift = increase in conversion rate when field is present vs absent.
// Weight = scaled score contribution (0-15 range per field).
//
// Data source: scripts/email-references/analyze-goldmine-conversion.ts
// Last derived: 2026-03-02 from 49 threads, 56.1% effective conversion rate.

const WEIGHTS = {
  // Top predictors (12pts each, 30%+ lift)
  has_date: 12, // +32.6% lift — inquiries with specific dates are serious
  has_pricing_quoted: 12, // +30.5% lift — if chef quoted price, deal is alive
  multi_message: 12, // +38.7% lift — back-and-forth = engagement

  // Strong predictors (8pts each, 15-30% lift)
  has_budget: 8, // +26.2% lift — explicit budget signals buying intent
  has_location: 8, // +18.5% lift — location = concrete event planning

  // Moderate predictors (5pts each, 5-15% lift)
  has_guest_count: 5, // +13.8% lift — knowing headcount = further along
  has_dietary: 5, // +14.3% lift — dietary details = event is real

  // Neutral or negative (0pts — no positive lift in dataset)
  has_occasion: 0, // -20.2% lift — casual inquiries convert MORE than occasion-specific
  has_cannabis: 0, // -8.7% lift — no positive effect on conversion
  has_referral: 0, // -7.1% lift — referral source doesn't predict outcome
  airbnb_referral: 0, // -21.4% lift — Airbnb guests have lower close rate
} as const

// Maximum possible score (sum of all positive weights)
const MAX_RAW = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)

// ─── Input Type ─────────────────────────────────────────────────────────

export interface LeadScoreInput {
  /** Does the inquiry mention a specific event date? */
  has_date: boolean
  /** Does the inquiry include a guest count? */
  has_guest_count: boolean
  /** Does the inquiry mention a budget or price range? */
  has_budget: boolean
  /** Does the inquiry specify an occasion (birthday, wedding, etc.)? */
  has_occasion: boolean
  /** Does the inquiry mention dietary restrictions or allergies? */
  has_dietary: boolean
  /** Does the inquiry mention cannabis/THC/infused dining? */
  has_cannabis: boolean
  /** Does the inquiry have a referral source? */
  has_referral: boolean
  /** Does the inquiry mention a specific location? */
  has_location: boolean
  /** Has the chef already quoted pricing in this thread? */
  has_pricing_quoted: boolean
  /** Are there 3+ messages in the thread (indicates engagement)? */
  multi_message: boolean
  /** Specific referral source, if any */
  referral_source: string | null
}

// ─── Output Type ────────────────────────────────────────────────────────

export interface LeadScoreResult {
  /** 0-100 normalized score */
  score: number
  /** Human-readable factors that contributed to the score */
  factors: string[]
  /** Hot (70+), Warm (40-69), Cold (0-39) */
  tier: 'hot' | 'warm' | 'cold'
}

// ─── Scoring Function ───────────────────────────────────────────────────

export function computeLeadScore(input: LeadScoreInput): LeadScoreResult {
  let rawScore = 0
  const factors: string[] = []

  if (input.has_date) {
    rawScore += WEIGHTS.has_date
    factors.push('Specific date mentioned (+12)')
  }

  if (input.has_pricing_quoted) {
    rawScore += WEIGHTS.has_pricing_quoted
    factors.push('Pricing quoted (+12)')
  }

  if (input.multi_message) {
    rawScore += WEIGHTS.multi_message
    factors.push('Active conversation (3+ messages) (+12)')
  }

  if (input.has_budget) {
    rawScore += WEIGHTS.has_budget
    factors.push('Budget mentioned (+8)')
  }

  if (input.has_location) {
    rawScore += WEIGHTS.has_location
    factors.push('Location provided (+8)')
  }

  if (input.has_guest_count) {
    rawScore += WEIGHTS.has_guest_count
    factors.push('Guest count provided (+5)')
  }

  if (input.has_dietary) {
    rawScore += WEIGHTS.has_dietary
    factors.push('Dietary restrictions specified (+5)')
  }

  // Normalize to 0-100
  const score = MAX_RAW > 0 ? Math.round((rawScore / MAX_RAW) * 100) : 0

  // Determine tier
  let tier: 'hot' | 'warm' | 'cold'
  if (score >= 70) tier = 'hot'
  else if (score >= 40) tier = 'warm'
  else tier = 'cold'

  return { score, factors, tier }
}

// ─── Convenience: Score from deterministic extraction ───────────────────

/**
 * Score an inquiry directly from deterministic extraction results.
 * This is the bridge between the extraction pipeline and the scoring formula.
 */
export function scoreFromExtraction(
  extraction: {
    dates: { raw: string }[]
    guest_counts: { number: number | null }[]
    budget_mentions: { amount_cents: number | null }[]
    occasion_keywords: string[]
    dietary_mentions: string[]
    cannabis_mentions: string[]
    location_mentions: string[]
    referral_signals: string[]
  },
  threadContext?: {
    total_messages: number
    has_pricing_quoted: boolean
  }
): LeadScoreResult {
  return computeLeadScore({
    has_date: extraction.dates.length > 0,
    has_guest_count: extraction.guest_counts.some((g) => g.number !== null && g.number > 0),
    has_budget: extraction.budget_mentions.some(
      (b) => b.amount_cents !== null && b.amount_cents > 0
    ),
    has_occasion: extraction.occasion_keywords.length > 0,
    has_dietary: extraction.dietary_mentions.length > 0,
    has_cannabis: extraction.cannabis_mentions.length > 0,
    has_referral: extraction.referral_signals.length > 0,
    has_location: extraction.location_mentions.length > 0,
    has_pricing_quoted: threadContext?.has_pricing_quoted ?? false,
    multi_message: (threadContext?.total_messages ?? 1) >= 3,
    referral_source: extraction.referral_signals[0] || null,
  })
}
