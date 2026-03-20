// Dietary Complexity Scoring - Deterministic Formula
// Scores how complex an event's dietary requirements are (0-100).
// Pure math, no AI, works offline, instant, zero compute cost.
//
// Scoring factors (weighted):
//   1. Unique dietary restrictions count (25%)
//   2. Unique allergens count (25%)
//   3. Restricted-guest ratio (15%)
//   4. Cross-restriction conflicts (20%)
//   5. Allergen severity / anaphylaxis risk (15%)

import { FDA_BIG_9 } from '@/lib/constants/allergens'

// ── Types ────────────────────────────────────────────────────────────────────

export type ComplexityLevel = 'low' | 'moderate' | 'high' | 'critical'

export type ComplexityBreakdown = {
  factor: string
  weight: number
  /** Raw value before weighting (0-100 scale) */
  value: number
}

export type DietaryComplexityResult = {
  /** Overall score 0-100 */
  score: number
  breakdown: ComplexityBreakdown[]
  level: ComplexityLevel
}

export type GuestDietaryProfile = {
  dietaryRestrictions: string[]
  allergies: string[]
}

export type DietaryComplexityParams = {
  guests: GuestDietaryProfile[]
  totalGuestCount: number
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Weights for each scoring factor (must sum to 1.0) */
const WEIGHTS = {
  uniqueRestrictions: 0.25,
  uniqueAllergens: 0.25,
  restrictedGuestRatio: 0.15,
  crossConflicts: 0.2,
  allergenSeverity: 0.15,
} as const

/** Thresholds for complexity level */
const THRESHOLDS = {
  low: 25,
  moderate: 50,
  high: 75,
} as const

/**
 * FDA Big 9 allergens normalized to lowercase for matching.
 * These carry anaphylaxis risk and score higher.
 */
const HIGH_SEVERITY_ALLERGENS = new Set(FDA_BIG_9.map((a) => a.toLowerCase()))

/** Additional anaphylaxis-risk terms that may appear in free-text allergy fields */
const ANAPHYLAXIS_KEYWORDS = new Set([
  'peanut',
  'peanuts',
  'tree nuts',
  'tree nut',
  'nuts',
  'nut',
  'shellfish',
  'shrimp',
  'lobster',
  'crab',
  'fish',
  'milk',
  'dairy',
  'eggs',
  'egg',
  'wheat',
  'soy',
  'soybean',
  'soybeans',
  'sesame',
])

/**
 * Cross-restriction conflict pairs. When both restrictions appear
 * in the same event, menu planning difficulty increases significantly.
 * Each pair has a conflict weight (0-1) indicating how much harder
 * the combination is vs. either alone.
 */
const CROSS_CONFLICTS: Array<{ a: string; b: string; weight: number }> = [
  // Vegan + nut-free: removes most plant-protein options
  { a: 'vegan', b: 'nut-free', weight: 0.9 },
  { a: 'vegan', b: 'tree nut', weight: 0.9 },
  // Vegan + soy-free: tofu/tempeh gone too
  { a: 'vegan', b: 'soy-free', weight: 0.8 },
  { a: 'vegan', b: 'soy', weight: 0.8 },
  // Vegan + gluten-free: very limited base ingredients
  { a: 'vegan', b: 'gluten-free', weight: 0.7 },
  { a: 'vegan', b: 'gluten', weight: 0.7 },
  { a: 'vegan', b: 'celiac', weight: 0.7 },
  // Kosher + vegan: already restrictive kosher rules plus no animal products
  { a: 'kosher', b: 'vegan', weight: 0.6 },
  // Halal + nut-free: limits protein and garnish
  { a: 'halal', b: 'nut-free', weight: 0.5 },
  { a: 'halal', b: 'tree nut', weight: 0.5 },
  // Gluten-free + dairy-free: very common combo but still limits
  { a: 'gluten-free', b: 'dairy-free', weight: 0.5 },
  { a: 'gluten', b: 'milk', weight: 0.5 },
  { a: 'celiac', b: 'dairy-free', weight: 0.5 },
  { a: 'celiac', b: 'milk', weight: 0.5 },
  // Vegetarian + nut-free
  { a: 'vegetarian', b: 'nut-free', weight: 0.5 },
  { a: 'vegetarian', b: 'tree nut', weight: 0.5 },
  // Pescatarian + shellfish allergy: limits seafood options heavily
  { a: 'pescatarian', b: 'shellfish', weight: 0.7 },
  // Keto + dairy-free: removes cream/cheese-heavy keto staples
  { a: 'keto', b: 'dairy-free', weight: 0.6 },
  { a: 'keto', b: 'milk', weight: 0.6 },
  // Low-FODMAP + vegan: extremely restrictive
  { a: 'low-fodmap', b: 'vegan', weight: 0.95 },
  // Paleo + nut-free
  { a: 'paleo', b: 'nut-free', weight: 0.5 },
  { a: 'paleo', b: 'tree nut', weight: 0.5 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[-_]/g, ' ')
}

/** Map a raw count to a 0-100 score using a capped curve */
function countToScore(count: number, softCap: number): number {
  if (count <= 0) return 0
  // Logarithmic curve that approaches 100 as count grows
  // At softCap, score is ~70. At 2x softCap, score is ~85.
  const raw = (Math.log(count + 1) / Math.log(softCap + 1)) * 70
  return Math.min(100, Math.round(raw))
}

function getLevel(score: number): ComplexityLevel {
  if (score <= THRESHOLDS.low) return 'low'
  if (score <= THRESHOLDS.moderate) return 'moderate'
  if (score <= THRESHOLDS.high) return 'high'
  return 'critical'
}

// ── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Calculate the dietary complexity score for an event.
 *
 * @param params.guests - Array of guest dietary profiles
 * @param params.totalGuestCount - Total number of guests (including those without restrictions)
 * @returns Score 0-100 with breakdown and level
 */
export function calculateDietaryComplexity(
  params: DietaryComplexityParams
): DietaryComplexityResult {
  const { guests, totalGuestCount } = params

  // Edge case: no guests or zero total
  if (totalGuestCount <= 0 || guests.length === 0) {
    return {
      score: 0,
      breakdown: [],
      level: 'low',
    }
  }

  // Collect all unique restrictions and allergens across all guests
  const allRestrictions = new Set<string>()
  const allAllergens = new Set<string>()
  let guestsWithRestrictions = 0

  for (const guest of guests) {
    const hasAny = guest.dietaryRestrictions.length > 0 || guest.allergies.length > 0
    if (hasAny) guestsWithRestrictions++

    for (const r of guest.dietaryRestrictions) {
      allRestrictions.add(normalize(r))
    }
    for (const a of guest.allergies) {
      allAllergens.add(normalize(a))
    }
  }

  // If nobody has restrictions, score is 0
  if (allRestrictions.size === 0 && allAllergens.size === 0) {
    return {
      score: 0,
      breakdown: [
        { factor: 'Unique dietary restrictions', weight: WEIGHTS.uniqueRestrictions, value: 0 },
        { factor: 'Unique allergens', weight: WEIGHTS.uniqueAllergens, value: 0 },
        { factor: 'Restricted guest ratio', weight: WEIGHTS.restrictedGuestRatio, value: 0 },
        { factor: 'Cross-restriction conflicts', weight: WEIGHTS.crossConflicts, value: 0 },
        { factor: 'Allergen severity', weight: WEIGHTS.allergenSeverity, value: 0 },
      ],
      level: 'low',
    }
  }

  // ── Factor 1: Unique dietary restrictions ──
  // 1 restriction = easy, 3 = moderate, 5+ = high
  const restrictionScore = countToScore(allRestrictions.size, 5)

  // ── Factor 2: Unique allergens ──
  // 1-2 = manageable, 4+ = complex, 7+ = very complex
  const allergenScore = countToScore(allAllergens.size, 6)

  // ── Factor 3: Restricted guest ratio ──
  // What percentage of total guests have restrictions?
  // 100% restricted = max complexity for this factor
  const ratio = guestsWithRestrictions / totalGuestCount
  const ratioScore = Math.round(ratio * 100)

  // ── Factor 4: Cross-restriction conflicts ──
  // Check all conflict pairs against the combined restriction+allergen set
  const combinedSet = new Set([...allRestrictions, ...allAllergens])
  let conflictTotal = 0
  let conflictsFound = 0

  for (const conflict of CROSS_CONFLICTS) {
    const aPresent = combinedSet.has(normalize(conflict.a))
    const bPresent = combinedSet.has(normalize(conflict.b))
    if (aPresent && bPresent) {
      conflictTotal += conflict.weight
      conflictsFound++
    }
  }

  // Cap at 100; each conflict contributes its weight toward the score
  // 2 high-weight conflicts (1.8 total) would be ~90 score
  const conflictScore = Math.min(100, Math.round((conflictTotal / 2) * 100))

  // ── Factor 5: Allergen severity ──
  // What fraction of allergens are high-severity (FDA Big 9 / anaphylaxis risk)?
  let highSeverityCount = 0
  for (const allergen of allAllergens) {
    if (HIGH_SEVERITY_ALLERGENS.has(allergen) || ANAPHYLAXIS_KEYWORDS.has(allergen)) {
      highSeverityCount++
    }
  }

  // If any allergens exist, base severity on ratio of high-severity ones,
  // with a floor of 30 if there are ANY allergens (even non-severe ones still need attention)
  let severityScore = 0
  if (allAllergens.size > 0) {
    const severityRatio = highSeverityCount / allAllergens.size
    severityScore = Math.round(30 + severityRatio * 70)
  }

  // ── Weighted total ──
  const breakdown: ComplexityBreakdown[] = [
    {
      factor: 'Unique dietary restrictions',
      weight: WEIGHTS.uniqueRestrictions,
      value: restrictionScore,
    },
    { factor: 'Unique allergens', weight: WEIGHTS.uniqueAllergens, value: allergenScore },
    { factor: 'Restricted guest ratio', weight: WEIGHTS.restrictedGuestRatio, value: ratioScore },
    { factor: 'Cross-restriction conflicts', weight: WEIGHTS.crossConflicts, value: conflictScore },
    { factor: 'Allergen severity', weight: WEIGHTS.allergenSeverity, value: severityScore },
  ]

  const weightedScore = Math.round(breakdown.reduce((sum, b) => sum + b.weight * b.value, 0))

  // Clamp to 0-100
  const finalScore = Math.max(0, Math.min(100, weightedScore))

  return {
    score: finalScore,
    breakdown,
    level: getLevel(finalScore),
  }
}
