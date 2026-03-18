// Gratuity Calculation - Deterministic Rules
// Industry-standard gratuity guidance for private chef events.
// No AI needed - these are well-established conventions.
//
// Industry norms (from private chef associations, catering industry guides):
//   - Standard gratuity range: 15–22% of service fee
//   - First-time clients: invoice line or verbal mention
//   - Returning clients who always tip: no ask needed
//   - High-value corporate: invoice line (professional)
//   - Casual/intimate: verbal mention (personal)

// ── Types (match the AI version exactly) ───────────────────────────────────

export type GratuityFramingDraft = {
  approach: 'mention_in_invoice' | 'verbal_mention' | 'note_in_message' | 'no_ask_needed'
  approachRationale: string
  messageDraft: string | null
  verbalScript: string | null
  suggestedGratuityRangePercent: { min: number; max: number } | null
  timing: string
  generatedAt: string
}

// ── Input types ────────────────────────────────────────────────────────────

export type GratuityContext = {
  clientFirstName: string
  isReturningClient: boolean
  eventCount: number // total completed events with this client
  occasion: string | null
  guestCount: number | null
  serviceStyle: string | null
  totalSpendCents: number // quoted or paid amount
}

// ── Rules ──────────────────────────────────────────────────────────────────

/**
 * Determines gratuity approach and suggested range using industry conventions.
 * Pure rules - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function calculateGratuityFormula(ctx: GratuityContext): GratuityFramingDraft {
  const {
    clientFirstName,
    isReturningClient,
    eventCount,
    occasion,
    guestCount,
    serviceStyle,
    totalSpendCents,
  } = ctx

  const totalDollars = totalSpendCents / 100
  const isHighValue = totalDollars > 2000
  const isVeryHighValue = totalDollars > 5000
  const isCorporate =
    (occasion ?? '').toLowerCase().includes('corporate') ||
    (occasion ?? '').toLowerCase().includes('company') ||
    (occasion ?? '').toLowerCase().includes('business')
  const isIntimate = (guestCount ?? 10) <= 6
  const isLargeEvent = (guestCount ?? 10) >= 30

  // Determine gratuity range
  let minPercent: number
  let maxPercent: number

  if (isVeryHighValue) {
    // Very high-value events: lower percentage, bigger absolute amount
    minPercent = 15
    maxPercent = 18
  } else if (isHighValue) {
    minPercent = 15
    maxPercent = 20
  } else if (isLargeEvent) {
    // Large events: standard range
    minPercent = 18
    maxPercent = 22
  } else if (isIntimate) {
    // Small, intimate dinners: higher percentage is common
    minPercent = 18
    maxPercent = 22
  } else {
    // Standard
    minPercent = 18
    maxPercent = 20
  }

  // Determine approach
  let approach: GratuityFramingDraft['approach']
  let rationale: string
  let timing: string

  if (isReturningClient && eventCount >= 3) {
    // Long-term relationship - they know the deal
    approach = 'no_ask_needed'
    rationale = `${clientFirstName} is a returning client with ${eventCount} completed events. The relationship is established - a direct ask isn't needed.`
    timing = 'N/A - no ask needed for established relationship.'
  } else if (isCorporate) {
    // Corporate events are professional - invoice line is standard
    approach = 'mention_in_invoice'
    rationale =
      'Corporate events are best handled professionally with a gratuity line on the invoice.'
    timing = 'Include in the final invoice before the event.'
  } else if (isReturningClient) {
    // Returning but not established - light touch
    approach = 'note_in_message'
    rationale = `${clientFirstName} is a returning client. A brief mention in the follow-up keeps it warm without being direct.`
    timing = 'Include in the thank-you message after service.'
  } else if (isIntimate) {
    // First-time intimate dinner - verbal is more natural
    approach = 'verbal_mention'
    rationale =
      'For an intimate first-time dinner, a verbal mention at end of service feels natural and non-transactional.'
    timing = 'Mention casually at the end of service, after dessert.'
  } else {
    // First-time, standard event - invoice line is safest
    approach = 'mention_in_invoice'
    rationale = `First event with ${clientFirstName}. An invoice line is the standard, professional approach.`
    timing = 'Include in the final invoice before the event.'
  }

  // Build message draft (if note_in_message approach)
  let messageDraft: string | null = null
  if (approach === 'note_in_message') {
    messageDraft = `P.S. - Gratuity is always appreciated but never expected. If you'd like to add a gratuity, you can do so through the invoice link.`
  }

  // Build verbal script (if verbal_mention approach)
  let verbalScript: string | null = null
  if (approach === 'verbal_mention') {
    verbalScript = `"${clientFirstName}, I really enjoyed cooking for you tonight. Just so you know, gratuity is always appreciated but never expected - whatever feels right to you."`
  }

  return {
    approach,
    approachRationale: rationale,
    messageDraft,
    verbalScript,
    suggestedGratuityRangePercent:
      approach === 'no_ask_needed' ? null : { min: minPercent, max: maxPercent },
    timing,
    generatedAt: new Date().toISOString(),
  }
}
