// Operational Risk Assessment Engine
// Pure computation, no DB access, no 'use server'
//
// Evaluates how risky executing a dish/menu is for a SPECIFIC EVENT context.
// Orthogonal to recipe confidence (which measures documentation quality).
// A perfectly documented recipe can still be high-risk in the wrong context.
//
// 8 risk dimensions from professional chef operations:
//   1. Scale       - cooking at untested volumes
//   2. Technique   - precision/timing/skill demands
//   3. Ingredient  - sourcing volatility and seasonal availability
//   4. Timing      - service window pressure vs prep requirements
//   5. Venue       - kitchen unfamiliarity, equipment gaps
//   6. Dietary     - allergen complexity and cross-contamination
//   7. Delegation  - staff skill requirements
//   8. Client      - expectation uncertainty, change history

// ─── Types ──────────────────────────────────────────────────────────────────────

export type RiskDimension =
  | 'scale'
  | 'technique'
  | 'ingredient'
  | 'timing'
  | 'venue'
  | 'dietary'
  | 'delegation'
  | 'client'

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export interface RiskFactor {
  dimension: RiskDimension
  score: number // 0-100
  level: RiskLevel
  label: string
  reasoning: string
  mitigations: string[]
}

export interface RiskAssessmentResult {
  overallScore: number // 0-100
  overallLevel: RiskLevel
  factors: RiskFactor[]
  topRisks: RiskFactor[] // factors with score >= 60
  mitigationPriorities: string[] // ordered list of what to address first
  confidenceInAssessment: number // 0-100, how much data we had to work with
}

// ─── Input Types ────────────────────────────────────────────────────────────────
// Each field is optional. Missing data = unknown risk (scored conservatively).

export interface DishRiskInput {
  // Scale context
  targetGuestCount: number | null
  maxPreviousGuestCount: number | null // largest batch this recipe has been used for
  timesCookedInEvents: number | null

  // Technique indicators
  ingredientCount: number | null
  subRecipeCount: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  hasMultipleTemperatureStages: boolean | null // inferred from method keywords
  requiresPrecisionTiming: boolean | null // souffles, tempering, etc.

  // Ingredient risk
  hasVolatilePricing: boolean | null // from PIE price-stability data
  seasonalMismatchCount: number | null // ingredients out of peak window
  hardToSourceCount: number | null // ingredients with low availability

  // Timing
  mustBeServedImmediately: boolean | null // temperature-sensitive plating
  holdTimeMinutes: number | null // how long can this sit before quality degrades

  // Dietary
  allergenCount: number | null // distinct allergens in this dish
  crossContaminationRisk: boolean | null // shares equipment with allergen sources
}

export interface EventRiskInput {
  // Venue context
  isFirstTimeVenue: boolean | null
  venueHasFullKitchen: boolean | null
  venueOvenCount: number | null
  venueBurnerCount: number | null
  hasRefrigeration: boolean | null
  travelDistanceMinutes: number | null

  // Timing context
  totalServiceHours: number | null
  courseCount: number | null
  simultaneousServings: number | null // guests served at once (buffet=1, plated=guestCount)

  // Staffing context
  staffCount: number | null
  hasExperiencedSousChef: boolean | null

  // Client context
  isFirstTimeClient: boolean | null
  clientChangeRequestCount: number | null // historical changes on this event
  clientEventsCompleted: number | null // past successful events with this client

  // Menu scope
  totalDishCount: number | null
  totalComponentCount: number | null
  guestCount: number | null
  dietaryRestrictionCount: number | null // distinct restrictions across all guests
}

// ─── Scoring Functions ──────────────────────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'moderate'
  return 'low'
}

function scoreScale(dish: DishRiskInput, event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []
  const guestCount = event.guestCount ?? dish.targetGuestCount

  if (guestCount != null && dish.maxPreviousGuestCount != null) {
    const scaleRatio = guestCount / Math.max(dish.maxPreviousGuestCount, 1)
    if (scaleRatio > 3) {
      score += 50
      mitigations.push('Test batch at smaller scale before event')
    } else if (scaleRatio > 2) {
      score += 35
      mitigations.push('Review scaling notes for non-linear ingredients')
    } else if (scaleRatio > 1.5) {
      score += 20
    }
  } else if (guestCount != null && guestCount > 20 && dish.timesCookedInEvents === 0) {
    // Never cooked this at any scale, serving 20+
    score += 45
    mitigations.push('Consider test run before event day')
  }

  if (dish.timesCookedInEvents === 0) {
    score += 25
    mitigations.push('First time executing this recipe at an event')
  } else if (dish.timesCookedInEvents != null && dish.timesCookedInEvents < 3) {
    score += 10
  }

  if (guestCount != null && guestCount > 50) {
    score += 15
    mitigations.push('Large-format service: verify equipment capacity')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'scale',
    score,
    level: scoreToLevel(score),
    label: 'Scale Risk',
    reasoning: buildScaleReasoning(dish, event, score),
    mitigations,
  }
}

function buildScaleReasoning(dish: DishRiskInput, event: EventRiskInput, score: number): string {
  if (score === 0) return 'Recipe has been executed at comparable scale'
  const parts: string[] = []
  if (dish.timesCookedInEvents === 0) parts.push('never cooked at an event')
  const guestCount = event.guestCount ?? dish.targetGuestCount
  if (guestCount != null && dish.maxPreviousGuestCount != null) {
    const ratio = guestCount / Math.max(dish.maxPreviousGuestCount, 1)
    if (ratio > 1.5) parts.push(`${ratio.toFixed(1)}x previous max scale`)
  }
  if (guestCount != null && guestCount > 50) parts.push('large-format event')
  return parts.join('; ') || 'Moderate scaling required'
}

function scoreTechnique(dish: DishRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (dish.requiresPrecisionTiming) {
    score += 30
    mitigations.push('Build timing buffer into service plan')
  }

  if (dish.hasMultipleTemperatureStages) {
    score += 20
    mitigations.push('Pre-plan temperature staging sequence')
  }

  if (dish.subRecipeCount != null && dish.subRecipeCount >= 3) {
    score += 15 + Math.min((dish.subRecipeCount - 3) * 5, 20)
    mitigations.push('Map sub-recipe dependency order; identify parallel paths')
  }

  if (dish.ingredientCount != null && dish.ingredientCount > 15) {
    score += 10
  }

  if (dish.prepTimeMinutes != null && dish.cookTimeMinutes != null) {
    const totalMinutes = dish.prepTimeMinutes + dish.cookTimeMinutes
    if (totalMinutes > 180) {
      score += 15
      mitigations.push('Begin prep day before if possible')
    }
  }

  score = Math.min(score, 100)

  return {
    dimension: 'technique',
    score,
    level: scoreToLevel(score),
    label: 'Technique Complexity',
    reasoning: buildTechniqueReasoning(dish, score),
    mitigations,
  }
}

function buildTechniqueReasoning(dish: DishRiskInput, score: number): string {
  if (score === 0) return 'Straightforward preparation'
  const parts: string[] = []
  if (dish.requiresPrecisionTiming) parts.push('precision timing required')
  if (dish.hasMultipleTemperatureStages) parts.push('multiple temperature stages')
  if (dish.subRecipeCount != null && dish.subRecipeCount >= 3) {
    parts.push(`${dish.subRecipeCount} sub-recipes`)
  }
  return parts.join('; ') || 'Moderate technique demands'
}

function scoreIngredient(dish: DishRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (dish.hasVolatilePricing) {
    score += 20
    mitigations.push('Lock in pricing with vendor before committing')
  }

  if (dish.seasonalMismatchCount != null && dish.seasonalMismatchCount > 0) {
    score += Math.min(dish.seasonalMismatchCount * 15, 40)
    mitigations.push('Identify seasonal substitutions in advance')
  }

  if (dish.hardToSourceCount != null && dish.hardToSourceCount > 0) {
    score += Math.min(dish.hardToSourceCount * 20, 50)
    mitigations.push('Source specialty items 1+ week ahead; confirm availability')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'ingredient',
    score,
    level: scoreToLevel(score),
    label: 'Ingredient Risk',
    reasoning: buildIngredientReasoning(dish, score),
    mitigations,
  }
}

function buildIngredientReasoning(dish: DishRiskInput, score: number): string {
  if (score === 0) return 'All ingredients stable and available'
  const parts: string[] = []
  if (dish.hasVolatilePricing) parts.push('volatile pricing')
  if (dish.seasonalMismatchCount != null && dish.seasonalMismatchCount > 0) {
    parts.push(`${dish.seasonalMismatchCount} out-of-season`)
  }
  if (dish.hardToSourceCount != null && dish.hardToSourceCount > 0) {
    parts.push(`${dish.hardToSourceCount} hard to source`)
  }
  return parts.join('; ') || 'Some sourcing concerns'
}

function scoreTiming(dish: DishRiskInput, event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (dish.mustBeServedImmediately) {
    score += 25
    mitigations.push('Plate and serve in tight sequence; no batch-ahead')
  }

  if (dish.holdTimeMinutes != null && dish.holdTimeMinutes < 10) {
    score += 20
    mitigations.push('Coordinate front-of-house for immediate service')
  }

  if (event.courseCount != null && event.totalServiceHours != null) {
    const minutesPerCourse = (event.totalServiceHours * 60) / event.courseCount
    if (minutesPerCourse < 15) {
      score += 30
      mitigations.push('Tight course pacing; pre-stage components')
    } else if (minutesPerCourse < 25) {
      score += 15
    }
  }

  if (event.travelDistanceMinutes != null && event.travelDistanceMinutes > 60) {
    score += 15
    mitigations.push('Long travel: pack hot/cold chain properly; plan buffer time')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'timing',
    score,
    level: scoreToLevel(score),
    label: 'Timing Pressure',
    reasoning: buildTimingReasoning(dish, event, score),
    mitigations,
  }
}

function buildTimingReasoning(dish: DishRiskInput, event: EventRiskInput, score: number): string {
  if (score === 0) return 'Comfortable service timing'
  const parts: string[] = []
  if (dish.mustBeServedImmediately) parts.push('must serve immediately')
  if (dish.holdTimeMinutes != null && dish.holdTimeMinutes < 10) parts.push('short hold time')
  if (event.courseCount != null && event.totalServiceHours != null) {
    const mpc = (event.totalServiceHours * 60) / event.courseCount
    if (mpc < 25) parts.push(`${Math.round(mpc)}min per course`)
  }
  if (event.travelDistanceMinutes != null && event.travelDistanceMinutes > 60) {
    parts.push(`${event.travelDistanceMinutes}min travel`)
  }
  return parts.join('; ') || 'Some time pressure'
}

function scoreVenue(event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (event.isFirstTimeVenue) {
    score += 30
    mitigations.push('Request kitchen photos/video; do site visit if possible')
  }

  if (event.venueHasFullKitchen === false) {
    score += 35
    mitigations.push('Plan portable equipment list; adjust menu to constraints')
  }

  if (event.venueOvenCount != null && event.venueOvenCount === 0) {
    score += 20
    mitigations.push('No oven: adjust menu or bring portable unit')
  } else if (event.venueOvenCount != null && event.venueOvenCount === 1) {
    score += 10
  }

  if (event.venueBurnerCount != null && event.venueBurnerCount < 4) {
    score += 15
    mitigations.push('Limited burners: stagger cooking; use induction backup')
  }

  if (event.hasRefrigeration === false) {
    score += 20
    mitigations.push('Bring coolers with ice; minimize perishable hold times')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'venue',
    score,
    level: scoreToLevel(score),
    label: 'Venue Risk',
    reasoning: buildVenueReasoning(event, score),
    mitigations,
  }
}

function buildVenueReasoning(event: EventRiskInput, score: number): string {
  if (score === 0) return 'Familiar venue with adequate facilities'
  const parts: string[] = []
  if (event.isFirstTimeVenue) parts.push('first time at this venue')
  if (event.venueHasFullKitchen === false) parts.push('no full kitchen')
  if (event.venueOvenCount === 0) parts.push('no oven')
  if (event.venueBurnerCount != null && event.venueBurnerCount < 4) {
    parts.push(`only ${event.venueBurnerCount} burners`)
  }
  if (event.hasRefrigeration === false) parts.push('no refrigeration')
  return parts.join('; ') || 'Some venue constraints'
}

function scoreDietary(dish: DishRiskInput, event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (event.dietaryRestrictionCount != null && event.dietaryRestrictionCount > 3) {
    score += 20 + Math.min((event.dietaryRestrictionCount - 3) * 5, 25)
    mitigations.push('Create allergen matrix; brief any staff on restrictions')
  }

  if (dish.allergenCount != null && dish.allergenCount > 2) {
    score += 15
    mitigations.push('This dish touches multiple allergen groups')
  }

  if (dish.crossContaminationRisk) {
    score += 25
    mitigations.push('Separate prep surfaces, utensils, and timing for allergen-free versions')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'dietary',
    score,
    level: scoreToLevel(score),
    label: 'Dietary Complexity',
    reasoning: buildDietaryReasoning(dish, event, score),
    mitigations,
  }
}

function buildDietaryReasoning(dish: DishRiskInput, event: EventRiskInput, score: number): string {
  if (score === 0) return 'No significant dietary complexity'
  const parts: string[] = []
  if (event.dietaryRestrictionCount != null && event.dietaryRestrictionCount > 3) {
    parts.push(`${event.dietaryRestrictionCount} dietary restrictions across guests`)
  }
  if (dish.crossContaminationRisk) parts.push('cross-contamination risk')
  if (dish.allergenCount != null && dish.allergenCount > 2) {
    parts.push(`${dish.allergenCount} allergen groups`)
  }
  return parts.join('; ') || 'Some dietary considerations'
}

function scoreDelegation(event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  const needsHelp =
    (event.guestCount != null && event.guestCount > 12) ||
    (event.totalDishCount != null && event.totalDishCount > 6) ||
    (event.totalComponentCount != null && event.totalComponentCount > 15)

  if (needsHelp && (event.staffCount == null || event.staffCount === 0)) {
    score += 40
    mitigations.push('Solo execution at this scale is high-risk; consider hiring help')
  } else if (needsHelp && event.staffCount === 1 && !event.hasExperiencedSousChef) {
    score += 25
    mitigations.push('Inexperienced helper: pre-assign simple tasks with clear instructions')
  }

  if (event.totalComponentCount != null && event.totalComponentCount > 20) {
    score += 15
    mitigations.push('High component count: create detailed task assignment sheet')
  }

  if (
    event.guestCount != null &&
    event.guestCount > 30 &&
    (event.staffCount == null || event.staffCount < 2)
  ) {
    score += 20
    mitigations.push('30+ guests with minimal staff: plating logistics are critical')
  }

  score = Math.min(score, 100)

  return {
    dimension: 'delegation',
    score,
    level: scoreToLevel(score),
    label: 'Delegation Risk',
    reasoning: buildDelegationReasoning(event, score),
    mitigations,
  }
}

function buildDelegationReasoning(event: EventRiskInput, score: number): string {
  if (score === 0) return 'Staffing adequate for scope'
  const parts: string[] = []
  if (event.staffCount == null || event.staffCount === 0) parts.push('solo execution')
  if (event.guestCount != null && event.guestCount > 30) parts.push(`${event.guestCount} guests`)
  if (event.totalComponentCount != null && event.totalComponentCount > 20) {
    parts.push(`${event.totalComponentCount} components`)
  }
  return parts.join('; ') || 'Some staffing concerns'
}

function scoreClient(event: EventRiskInput): RiskFactor {
  let score = 0
  const mitigations: string[] = []

  if (event.isFirstTimeClient) {
    score += 20
    mitigations.push('Set expectations early; send detailed timeline')
  }

  if (event.clientChangeRequestCount != null && event.clientChangeRequestCount > 3) {
    score += 15 + Math.min((event.clientChangeRequestCount - 3) * 5, 20)
    mitigations.push('Lock menu earlier; communicate change cutoff date')
  }

  if (event.clientEventsCompleted != null && event.clientEventsCompleted >= 3) {
    // Established relationship reduces risk
    score = Math.max(score - 15, 0)
  }

  score = Math.min(score, 100)

  return {
    dimension: 'client',
    score,
    level: scoreToLevel(score),
    label: 'Client Risk',
    reasoning: buildClientReasoning(event, score),
    mitigations,
  }
}

function buildClientReasoning(event: EventRiskInput, score: number): string {
  if (score === 0) return 'Established client relationship'
  const parts: string[] = []
  if (event.isFirstTimeClient) parts.push('first-time client')
  if (event.clientChangeRequestCount != null && event.clientChangeRequestCount > 3) {
    parts.push(`${event.clientChangeRequestCount} change requests`)
  }
  return parts.join('; ') || 'Some client uncertainty'
}

// ─── Main Assessment Function ───────────────────────────────────────────────────

/**
 * Assess operational risk for a single dish within an event context.
 * Returns per-dimension scores and an overall risk level.
 */
export function assessDishRisk(dish: DishRiskInput, event: EventRiskInput): RiskAssessmentResult {
  const factors: RiskFactor[] = [
    scoreScale(dish, event),
    scoreTechnique(dish),
    scoreIngredient(dish),
    scoreTiming(dish, event),
    scoreVenue(event),
    scoreDietary(dish, event),
    scoreDelegation(event),
    scoreClient(event),
  ]

  // Weighted overall: venue and scale matter more than client feelings
  const weights: Record<RiskDimension, number> = {
    scale: 1.5,
    technique: 1.3,
    ingredient: 1.0,
    timing: 1.4,
    venue: 1.5,
    dietary: 1.2,
    delegation: 1.1,
    client: 0.7,
  }

  let weightedSum = 0
  let totalWeight = 0
  for (const factor of factors) {
    const w = weights[factor.dimension]
    weightedSum += factor.score * w
    totalWeight += w
  }

  const overallScore = Math.round(Math.min(weightedSum / totalWeight, 100))
  const overallLevel = scoreToLevel(overallScore)

  const topRisks = factors.filter((f) => f.score >= 50).sort((a, b) => b.score - a.score)

  // Flatten mitigations from top risks, deduplicated
  const seen = new Set<string>()
  const mitigationPriorities: string[] = []
  for (const risk of topRisks) {
    for (const m of risk.mitigations) {
      if (!seen.has(m)) {
        seen.add(m)
        mitigationPriorities.push(m)
      }
    }
  }

  // Confidence: how many inputs did we actually have data for?
  const confidenceInAssessment = calculateAssessmentConfidence(dish, event)

  return {
    overallScore,
    overallLevel,
    factors,
    topRisks,
    mitigationPriorities,
    confidenceInAssessment,
  }
}

/**
 * Assess overall operational risk for an entire event menu.
 * Combines individual dish risks with event-level factors.
 */
export function assessEventRisk(
  dishes: DishRiskInput[],
  event: EventRiskInput
): RiskAssessmentResult {
  if (dishes.length === 0) {
    return {
      overallScore: 0,
      overallLevel: 'low',
      factors: [],
      topRisks: [],
      mitigationPriorities: [],
      confidenceInAssessment: 0,
    }
  }

  // Assess each dish
  const dishAssessments = dishes.map((d) => assessDishRisk(d, event))

  // Event risk = max of each dimension across all dishes
  // (one high-risk dish makes the whole event risky in that dimension)
  const dimensionMaxes = new Map<RiskDimension, RiskFactor>()

  for (const assessment of dishAssessments) {
    for (const factor of assessment.factors) {
      const current = dimensionMaxes.get(factor.dimension)
      if (!current || factor.score > current.score) {
        dimensionMaxes.set(factor.dimension, factor)
      }
    }
  }

  const factors = Array.from(dimensionMaxes.values())

  // Additional event-level risk: complexity multiplier
  // More dishes = more coordination risk
  if (dishes.length > 5) {
    const complexityBonus = Math.min((dishes.length - 5) * 3, 20)
    const timingFactor = factors.find((f) => f.dimension === 'timing')
    if (timingFactor) {
      timingFactor.score = Math.min(timingFactor.score + complexityBonus, 100)
      timingFactor.level = scoreToLevel(timingFactor.score)
      if (dishes.length > 8) {
        timingFactor.mitigations.push(
          `${dishes.length} dishes: create detailed fire-order timeline`
        )
      }
    }
  }

  // Recalculate overall from merged factors
  const weights: Record<RiskDimension, number> = {
    scale: 1.5,
    technique: 1.3,
    ingredient: 1.0,
    timing: 1.4,
    venue: 1.5,
    dietary: 1.2,
    delegation: 1.1,
    client: 0.7,
  }

  let weightedSum = 0
  let totalWeight = 0
  for (const factor of factors) {
    const w = weights[factor.dimension]
    weightedSum += factor.score * w
    totalWeight += w
  }

  const overallScore = Math.round(Math.min(weightedSum / totalWeight, 100))
  const overallLevel = scoreToLevel(overallScore)

  const topRisks = factors.filter((f) => f.score >= 50).sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const mitigationPriorities: string[] = []
  for (const risk of topRisks) {
    for (const m of risk.mitigations) {
      if (!seen.has(m)) {
        seen.add(m)
        mitigationPriorities.push(m)
      }
    }
  }

  // Average confidence across dishes
  const avgConfidence =
    dishAssessments.reduce((sum, a) => sum + a.confidenceInAssessment, 0) / dishAssessments.length

  return {
    overallScore,
    overallLevel,
    factors,
    topRisks,
    mitigationPriorities,
    confidenceInAssessment: Math.round(avgConfidence),
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function calculateAssessmentConfidence(dish: DishRiskInput, event: EventRiskInput): number {
  // Count how many inputs we actually have (non-null)
  const dishFields: (keyof DishRiskInput)[] = [
    'targetGuestCount',
    'maxPreviousGuestCount',
    'timesCookedInEvents',
    'ingredientCount',
    'subRecipeCount',
    'prepTimeMinutes',
    'cookTimeMinutes',
    'hasMultipleTemperatureStages',
    'requiresPrecisionTiming',
    'hasVolatilePricing',
    'seasonalMismatchCount',
    'hardToSourceCount',
    'mustBeServedImmediately',
    'holdTimeMinutes',
    'allergenCount',
    'crossContaminationRisk',
  ]

  const eventFields: (keyof EventRiskInput)[] = [
    'isFirstTimeVenue',
    'venueHasFullKitchen',
    'venueOvenCount',
    'venueBurnerCount',
    'hasRefrigeration',
    'travelDistanceMinutes',
    'totalServiceHours',
    'courseCount',
    'simultaneousServings',
    'staffCount',
    'hasExperiencedSousChef',
    'isFirstTimeClient',
    'clientChangeRequestCount',
    'clientEventsCompleted',
    'totalDishCount',
    'totalComponentCount',
    'guestCount',
    'dietaryRestrictionCount',
  ]

  let filled = 0
  const total = dishFields.length + eventFields.length

  for (const field of dishFields) {
    if (dish[field] != null) filled++
  }
  for (const field of eventFields) {
    if (event[field] != null) filled++
  }

  return Math.round((filled / total) * 100)
}
