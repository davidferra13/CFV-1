// Event Risk Assessment Score - Deterministic Formula
// Pure math. No AI. Scores events 0-100 based on operational risk factors.
// Higher score = more attention needed before the event.

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export type RiskFactor = {
  name: string
  /** Points contributed to the total score (0-100 scale contribution) */
  impact: number
  /** Human-readable explanation */
  detail: string
}

export type EventRiskResult = {
  /** Overall risk score, 0-100 */
  score: number
  /** Individual risk factors that contributed */
  factors: RiskFactor[]
  /** Categorical risk level */
  level: RiskLevel
}

export type EventRiskInput = {
  /** Event date as ISO string or Date */
  eventDate: string | Date
  /** Current event status */
  status: 'draft' | 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  /** Payment status */
  paymentStatus: 'unpaid' | 'deposit_paid' | 'partial' | 'paid' | 'refunded'
  /** Number of guests */
  guestCount: number
  /** Dietary restrictions array (e.g. ["gluten-free", "vegan", "nut allergy"]) */
  dietaryRestrictions: string[]
  /** Allergies array */
  allergies: string[]
  /** Whether a menu has been assigned */
  hasMenu: boolean
  /** Whether a signed contract exists for this event */
  hasSignedContract: boolean
  /** Whether this client has had previous events */
  isRepeatClient: boolean
  /** Service style, used to detect outdoor/complex setups */
  serviceStyle?: 'plated' | 'family_style' | 'buffet' | 'cocktail' | 'tasting_menu' | 'other'
  /** Quoted price in cents (higher value = higher stakes) */
  quotedPriceCents?: number | null
  /** Outstanding balance in cents */
  outstandingBalanceCents?: number | null
  /** Travel distance in miles, if known */
  travelDistanceMiles?: number | null
  /** Whether guest count has been confirmed */
  guestCountConfirmed?: boolean
  /** Occasion type (e.g. "wedding", "corporate", "birthday") */
  occasion?: string | null
}

// ── Thresholds ───────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: { max: number; level: RiskLevel }[] = [
  { max: 25, level: 'low' },
  { max: 50, level: 'moderate' },
  { max: 75, level: 'high' },
  { max: 100, level: 'critical' },
]

// High-stakes occasion types that add risk (more complex logistics)
const HIGH_STAKES_OCCASIONS = new Set([
  'wedding',
  'corporate',
  'fundraiser',
  'gala',
  'rehearsal dinner',
  'engagement',
  'anniversary',
])

// ── Weights (sum to ~100 at maximum risk) ────────────────────────────────────
// Each factor has a max contribution. The total is clamped to 0-100.

const WEIGHTS = {
  timeUrgency: 20,       // Days until event vs readiness
  paymentRisk: 18,       // Unpaid/partial payment
  guestScale: 12,        // More guests = more complexity
  dietaryComplexity: 10, // Restrictions + allergies
  missingMenu: 12,       // No menu assigned
  missingContract: 8,    // No signed contract
  firstTimeClient: 5,    // Unknown client behavior
  travelDistance: 5,      // Long travel = more logistics
  highStakesOccasion: 5, // Wedding/corporate carry more weight
  unconfirmedGuests: 5,  // Guest count not locked in
} as const

// ── Calculator ───────────────────────────────────────────────────────────────

export function calculateEventRisk(input: EventRiskInput): EventRiskResult {
  const factors: RiskFactor[] = []
  let totalScore = 0

  // Skip completed/cancelled events
  if (input.status === 'completed' || input.status === 'cancelled') {
    return {
      score: 0,
      factors: [{ name: 'Event concluded', impact: 0, detail: `Event is ${input.status}` }],
      level: 'low',
    }
  }

  const now = new Date()
  const eventDate = new Date(input.eventDate)
  const daysUntil = Math.max(0, Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // 1. Time urgency - closer events with incomplete status are riskier
  const timeScore = calculateTimeUrgency(daysUntil, input.status, input.paymentStatus)
  if (timeScore > 0) {
    factors.push({
      name: 'Time urgency',
      impact: timeScore,
      detail: getTimeUrgencyDetail(daysUntil, input.status),
    })
    totalScore += timeScore
  }

  // 2. Payment risk
  const paymentScore = calculatePaymentRisk(input.paymentStatus, daysUntil, input.outstandingBalanceCents)
  if (paymentScore > 0) {
    factors.push({
      name: 'Payment risk',
      impact: paymentScore,
      detail: getPaymentDetail(input.paymentStatus, input.outstandingBalanceCents),
    })
    totalScore += paymentScore
  }

  // 3. Guest scale
  const guestScore = calculateGuestScale(input.guestCount)
  if (guestScore > 0) {
    factors.push({
      name: 'Guest scale',
      impact: guestScore,
      detail: `${input.guestCount} guests`,
    })
    totalScore += guestScore
  }

  // 4. Dietary complexity
  const dietaryScore = calculateDietaryComplexity(input.dietaryRestrictions, input.allergies)
  if (dietaryScore > 0) {
    const totalRestrictions = input.dietaryRestrictions.length + input.allergies.length
    factors.push({
      name: 'Dietary complexity',
      impact: dietaryScore,
      detail: `${totalRestrictions} restriction${totalRestrictions !== 1 ? 's' : ''}/allerg${input.allergies.length !== 1 ? 'ies' : 'y'}`,
    })
    totalScore += dietaryScore
  }

  // 5. Missing menu
  if (!input.hasMenu) {
    const menuScore = calculateMissingMenuRisk(daysUntil)
    factors.push({
      name: 'No menu assigned',
      impact: menuScore,
      detail: daysUntil <= 7 ? 'No menu with event in less than a week' : 'Menu not yet assigned',
    })
    totalScore += menuScore
  }

  // 6. Missing contract
  if (!input.hasSignedContract) {
    const contractScore = calculateMissingContractRisk(daysUntil, input.quotedPriceCents)
    factors.push({
      name: 'No signed contract',
      impact: contractScore,
      detail: input.quotedPriceCents && input.quotedPriceCents > 100000
        ? 'High-value event without signed contract'
        : 'Contract not yet signed',
    })
    totalScore += contractScore
  }

  // 7. First-time client
  if (!input.isRepeatClient) {
    factors.push({
      name: 'First-time client',
      impact: WEIGHTS.firstTimeClient,
      detail: 'No prior event history with this client',
    })
    totalScore += WEIGHTS.firstTimeClient
  }

  // 8. Travel distance
  if (input.travelDistanceMiles != null && input.travelDistanceMiles > 0) {
    const travelScore = calculateTravelRisk(input.travelDistanceMiles)
    if (travelScore > 0) {
      factors.push({
        name: 'Travel distance',
        impact: travelScore,
        detail: `${Math.round(input.travelDistanceMiles)} miles to venue`,
      })
      totalScore += travelScore
    }
  }

  // 9. High-stakes occasion
  if (input.occasion && HIGH_STAKES_OCCASIONS.has(input.occasion.toLowerCase())) {
    factors.push({
      name: 'High-stakes occasion',
      impact: WEIGHTS.highStakesOccasion,
      detail: `${input.occasion} (higher expectations)`,
    })
    totalScore += WEIGHTS.highStakesOccasion
  }

  // 10. Unconfirmed guest count
  if (input.guestCountConfirmed === false && daysUntil <= 14) {
    factors.push({
      name: 'Guest count unconfirmed',
      impact: WEIGHTS.unconfirmedGuests,
      detail: `Guest count not locked in with ${daysUntil} day${daysUntil !== 1 ? 's' : ''} to go`,
    })
    totalScore += WEIGHTS.unconfirmedGuests
  }

  // Clamp to 0-100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)))

  return {
    score: finalScore,
    factors: factors.sort((a, b) => b.impact - a.impact),
    level: getLevel(finalScore),
  }
}

// ── Sub-calculators ──────────────────────────────────────────────────────────

function calculateTimeUrgency(
  daysUntil: number,
  status: EventRiskInput['status'],
  paymentStatus: EventRiskInput['paymentStatus'],
): number {
  const max = WEIGHTS.timeUrgency

  // Events far out have minimal time pressure
  if (daysUntil > 30) return 0
  if (daysUntil > 14) return max * 0.15

  // Status modifier: less-ready statuses amplify urgency
  let statusMultiplier = 0
  switch (status) {
    case 'draft': statusMultiplier = 1.0; break
    case 'proposed': statusMultiplier = 0.8; break
    case 'accepted': statusMultiplier = 0.5; break
    case 'paid': statusMultiplier = 0.2; break
    case 'confirmed': statusMultiplier = 0.1; break
    case 'in_progress': statusMultiplier = 0.0; break
    default: statusMultiplier = 0.3
  }

  // Payment modifier: unpaid events close to date are dangerous
  let paymentMultiplier = 0
  switch (paymentStatus) {
    case 'unpaid': paymentMultiplier = 1.0; break
    case 'deposit_paid': paymentMultiplier = 0.5; break
    case 'partial': paymentMultiplier = 0.4; break
    case 'paid': paymentMultiplier = 0.0; break
    case 'refunded': paymentMultiplier = 0.0; break
    default: paymentMultiplier = 0.5
  }

  // Combine: closer + less ready = higher urgency
  // daysUntil 0-3: full urgency, 4-7: high, 8-14: moderate
  let timeFactor = 0
  if (daysUntil <= 3) timeFactor = 1.0
  else if (daysUntil <= 7) timeFactor = 0.7
  else timeFactor = 0.4 // 8-14 days

  const combinedMultiplier = Math.max(statusMultiplier, paymentMultiplier)
  return Math.round(max * timeFactor * combinedMultiplier)
}

function getTimeUrgencyDetail(daysUntil: number, status: EventRiskInput['status']): string {
  if (daysUntil === 0) return `Event is today, status: ${status}`
  if (daysUntil === 1) return `Event is tomorrow, status: ${status}`
  if (daysUntil <= 3) return `${daysUntil} days away, status: ${status}`
  if (daysUntil <= 7) return `${daysUntil} days away, status: ${status}`
  if (daysUntil <= 14) return `${daysUntil} days away, status: ${status}`
  return `${daysUntil} days away`
}

function calculatePaymentRisk(
  paymentStatus: EventRiskInput['paymentStatus'],
  daysUntil: number,
  outstandingCents?: number | null,
): number {
  const max = WEIGHTS.paymentRisk

  if (paymentStatus === 'paid') return 0
  if (paymentStatus === 'refunded') return 0

  // Base risk by payment status
  let base = 0
  switch (paymentStatus) {
    case 'unpaid': base = max; break
    case 'deposit_paid': base = max * 0.4; break
    case 'partial': base = max * 0.5; break
    default: base = max * 0.3
  }

  // Increase if event is soon and still unpaid/partial
  if (daysUntil <= 7 && paymentStatus === 'unpaid') {
    base = max // Full risk
  }

  // Large outstanding balances add urgency
  if (outstandingCents != null && outstandingCents > 200000) { // > $2000
    base = Math.min(max, base * 1.2)
  }

  return Math.round(base)
}

function getPaymentDetail(
  paymentStatus: EventRiskInput['paymentStatus'],
  outstandingCents?: number | null,
): string {
  const statusLabel = paymentStatus.replace('_', ' ')
  if (outstandingCents != null && outstandingCents > 0) {
    const dollars = (outstandingCents / 100).toFixed(2)
    return `${statusLabel}, $${dollars} outstanding`
  }
  return statusLabel
}

function calculateGuestScale(guestCount: number): number {
  const max = WEIGHTS.guestScale

  // Small events (1-6): minimal scale risk
  if (guestCount <= 6) return 0
  // Medium (7-12): low
  if (guestCount <= 12) return Math.round(max * 0.25)
  // Large (13-25): moderate
  if (guestCount <= 25) return Math.round(max * 0.5)
  // Very large (26-50): high
  if (guestCount <= 50) return Math.round(max * 0.75)
  // 50+: full
  return max
}

function calculateDietaryComplexity(restrictions: string[], allergies: string[]): number {
  const max = WEIGHTS.dietaryComplexity

  const totalCount = restrictions.length + allergies.length
  if (totalCount === 0) return 0

  // Allergies are weighted more heavily (safety concern)
  const allergyWeight = allergies.length * 2
  const restrictionWeight = restrictions.length * 1
  const complexityScore = allergyWeight + restrictionWeight

  // Scale: 1-2 items = low, 3-5 = moderate, 6+ = high
  if (complexityScore <= 2) return Math.round(max * 0.2)
  if (complexityScore <= 5) return Math.round(max * 0.5)
  if (complexityScore <= 8) return Math.round(max * 0.75)
  return max
}

function calculateMissingMenuRisk(daysUntil: number): number {
  const max = WEIGHTS.missingMenu

  // Far out: low concern
  if (daysUntil > 30) return Math.round(max * 0.2)
  if (daysUntil > 14) return Math.round(max * 0.4)
  if (daysUntil > 7) return Math.round(max * 0.7)
  // Within a week: critical
  return max
}

function calculateMissingContractRisk(daysUntil: number, quotedPriceCents?: number | null): number {
  const max = WEIGHTS.missingContract

  let base = max * 0.5

  // High-value events without contract are riskier
  if (quotedPriceCents != null && quotedPriceCents > 100000) { // > $1000
    base = max * 0.75
  }
  if (quotedPriceCents != null && quotedPriceCents > 300000) { // > $3000
    base = max
  }

  // Closer events without contract: more risk
  if (daysUntil <= 7) {
    base = Math.max(base, max * 0.8)
  }

  return Math.round(base)
}

function calculateTravelRisk(miles: number): number {
  const max = WEIGHTS.travelDistance

  if (miles <= 10) return 0
  if (miles <= 30) return Math.round(max * 0.3)
  if (miles <= 60) return Math.round(max * 0.6)
  return max
}

function getLevel(score: number): RiskLevel {
  for (const threshold of LEVEL_THRESHOLDS) {
    if (score <= threshold.max) return threshold.level
  }
  return 'critical'
}
