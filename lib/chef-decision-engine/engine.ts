import { DIETARY_RULES, type DietId } from '@/lib/constants/dietary-rules'
import { consolidateGroceryFormula } from '@/lib/formulas/grocery-consolidation'
import type {
  ChefDecisionConsensusState,
  ChefDecisionContext,
  ChefDecisionCourseInput,
  ChefDecisionCourseOptionInput,
  ChefDecisionCourseRecommendation,
  ChefDecisionCoverage,
  ChefDecisionDishInput,
  ChefDecisionEngineResult,
  ChefDecisionExecutionReadiness,
  ChefDecisionFactorKey,
  ChefDecisionFactorScore,
  ChefDecisionGuest,
  ChefDecisionIngredientPlan,
  ChefDecisionPrepPlan,
  ChefDecisionRiskFlag,
  ChefDecisionSeverity,
  ChefDecisionThresholds,
  ChefDecisionTraceEntry,
} from './types'

type GuestConflict = {
  guestId: string
  guestName: string
  label: string
  severity: ChefDecisionSeverity
  evidence: string[]
}

type DishSafetyAssessment = {
  criticalCount: number
  warningCount: number
  infoCount: number
  conflicts: GuestConflict[]
}

type EvaluatedOption = {
  option: ChefDecisionCourseOptionInput
  voteShare: number | null
  totalScore: number
  factorScores: ChefDecisionFactorScore[]
  safety: DishSafetyAssessment
  simplicityBurden: number
  costValue: number | null
}

type PlannedDishAllocation = {
  courseKey: string
  kind: 'primary' | 'accommodation'
  guestCount: number
  dish: ChefDecisionDishInput
}

type CourseBuildResult = {
  recommendation: ChefDecisionCourseRecommendation
  flags: ChefDecisionRiskFlag[]
  trace: ChefDecisionTraceEntry
  selected: EvaluatedOption | null
  accommodation: EvaluatedOption | null
}

const DEFAULT_THRESHOLDS: ChefDecisionThresholds = {
  weakConsensusVoteShare: 0.55,
  weakConsensusMargin: 0.12,
  consolidationVoteShareMin: 0.8,
  accommodationVoteShareMax: 0.25,
  riskPrepMinutes: 300,
  notReadyPrepMinutes: 480,
  riskOnSiteComponentCount: 8,
  notReadyOnSiteComponentCount: 12,
  riskComponentCount: 16,
  notReadyComponentCount: 24,
  riskUniqueIngredientCount: 30,
  notReadyUniqueIngredientCount: 45,
  riskUniqueEquipmentCount: 6,
  redundancyCourseCount: 2,
}

const ALLERGEN_EQUIVALENTS: Record<string, string[]> = {
  dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'ghee',
    'lactose',
  ],
  gluten: ['wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'noodles', 'breadcrumbs'],
  'gluten-free': ['gluten', 'wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'noodles'],
  'dairy-free': ['dairy', 'milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein'],
  nut: ['nut', 'nuts', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut'],
  nuts: ['nut', 'nuts', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut'],
  'tree nut': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'pine nut'],
  'tree nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'pine nut'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'trout', 'anchovy', 'sardine'],
  soy: ['soy', 'soy sauce', 'tofu', 'tempeh', 'edamame', 'miso'],
  sesame: ['sesame', 'tahini', 'sesame oil'],
  egg: ['egg', 'eggs', 'mayonnaise', 'aioli'],
  eggs: ['egg', 'eggs', 'mayonnaise', 'aioli'],
  peanut: ['peanut', 'peanuts', 'peanut butter', 'peanut oil'],
  peanuts: ['peanut', 'peanuts', 'peanut butter', 'peanut oil'],
}

const GENERIC_REDUNDANCY_INGREDIENTS = new Set([
  'salt',
  'pepper',
  'olive oil',
  'water',
  'butter',
  'garlic',
  'onion',
  'shallot',
  'lemon',
  'lime',
  'parsley',
  'thyme',
  'rosemary',
  'basil',
  'cilantro',
])

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned : null
}

function normalizeKey(value: string | null | undefined): string {
  return cleanText(value)?.toLowerCase() ?? ''
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = cleanText(raw)
    if (!value) continue
    const key = normalizeKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

function tokenize(value: string): string[] {
  return normalizeKey(value)
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
    .flatMap((part) => {
      if (part.endsWith('s') && part.length > 3) {
        return [part, part.slice(0, -1)]
      }
      return [part]
    })
}

function overlapsValue(left: string, right: string): boolean {
  const leftKey = normalizeKey(left)
  const rightKey = normalizeKey(right)

  if (!leftKey || !rightKey) return false
  if (leftKey === rightKey) return true
  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) return true

  const leftTokens = new Set(tokenize(left))
  return tokenize(right).some((token) => leftTokens.has(token))
}

function normalizeDishName(name: string | null | undefined): string {
  return normalizeKey(name)
}

function matchDietId(concern: string): DietId | null {
  const lower = concern.toLowerCase().trim().replace(/[-_]/g, '-').replace(/\s+/g, '-')
  if (lower in DIETARY_RULES) return lower as DietId

  const aliases: Record<string, DietId> = {
    celiac: 'gluten-free',
    coeliac: 'gluten-free',
    'gluten free': 'gluten-free',
    gluten: 'gluten-free',
    'dairy free': 'dairy-free',
    lactose: 'dairy-free',
    'low fodmap': 'low-fodmap',
    fodmap: 'low-fodmap',
    ketogenic: 'keto',
    whole30: 'whole30',
    'whole 30': 'whole30',
  }

  return aliases[lower] ?? null
}

function buildDishSearchValues(dish: ChefDecisionDishInput): string[] {
  return uniqueStrings([
    dish.name,
    dish.description,
    ...dish.dietaryTags,
    ...dish.allergenFlags,
    ...dish.ingredientNames,
  ])
}

function buildConstraintTerms(label: string): string[] {
  const key = normalizeKey(label)
  return uniqueStrings([key, ...(ALLERGEN_EQUIVALENTS[key] ?? [])])
}

function assessDishAgainstConstraint(
  dish: ChefDecisionDishInput,
  label: string,
  type: 'dietary' | 'allergy'
): { matched: boolean; evidence: string[]; caution: boolean } {
  const key = normalizeKey(label)
  const searchableValues = buildDishSearchValues(dish)
  const searchableText = searchableValues.map(normalizeKey).join(' ')
  const dietaryTagSet = new Set(dish.dietaryTags.map(normalizeKey))
  const allergenFlagSet = new Set(dish.allergenFlags.map(normalizeKey))
  const ingredientNames = dish.ingredientNames.map(normalizeKey)

  const dietId = type === 'dietary' ? matchDietId(label) : null
  if (dietId && (dietaryTagSet.has(key) || dietaryTagSet.has(dietId))) {
    return { matched: false, evidence: [], caution: false }
  }

  if (dietId) {
    const rules = DIETARY_RULES[dietId]
    const violations = uniqueStrings(
      rules.violationKeywords.filter((keyword) => searchableText.includes(normalizeKey(keyword)))
    )
    if (violations.length > 0) {
      return { matched: true, evidence: violations.slice(0, 3), caution: false }
    }

    const cautions = uniqueStrings(
      rules.cautionKeywords.filter((keyword) => searchableText.includes(normalizeKey(keyword)))
    )
    if (cautions.length > 0) {
      return { matched: true, evidence: cautions.slice(0, 3), caution: true }
    }
  }

  const terms = buildConstraintTerms(label)
  const evidence = uniqueStrings(
    searchableValues.filter((value) =>
      terms.some((term) => overlapsValue(term, value) || searchableText.includes(normalizeKey(term)))
    )
  )

  if (evidence.length > 0) {
    const caution =
      type === 'dietary' &&
      !terms.some((term) => allergenFlagSet.has(term) || ingredientNames.some((name) => overlapsValue(term, name)))
    return { matched: true, evidence: evidence.slice(0, 3), caution }
  }

  return { matched: false, evidence: [], caution: false }
}

function assessDishForGuests(
  dish: ChefDecisionDishInput,
  guests: ChefDecisionGuest[]
): DishSafetyAssessment {
  const conflicts: GuestConflict[] = []

  for (const guest of guests) {
    if (!guest.attending) continue

    for (const constraint of guest.constraints) {
      const assessment = assessDishAgainstConstraint(dish, constraint.label, constraint.type)
      if (!assessment.matched) continue

      let severity: ChefDecisionSeverity = 'warning'
      if (assessment.caution) {
        severity = 'info'
      } else if (constraint.severity === 'anaphylaxis') {
        severity = 'critical'
      } else if (constraint.type === 'allergy' || constraint.severity === 'intolerance') {
        severity = 'warning'
      } else {
        severity = 'warning'
      }

      conflicts.push({
        guestId: guest.id,
        guestName: guest.name,
        label: constraint.label,
        severity,
        evidence: assessment.evidence,
      })
    }
  }

  return {
    criticalCount: conflicts.filter((conflict) => conflict.severity === 'critical').length,
    warningCount: conflicts.filter((conflict) => conflict.severity === 'warning').length,
    infoCount: conflicts.filter((conflict) => conflict.severity === 'info').length,
    conflicts,
  }
}

function calculateSimplicityBurden(dish: ChefDecisionDishInput): number {
  const operational = dish.operationalMetrics
  return (
    operational.componentCount +
    operational.onSiteComponentCount * 2.5 +
    operational.makeAheadComponentCount * 0.75 +
    operational.totalPrepMinutes / 35 +
    operational.totalCookMinutes / 45 +
    dish.equipment.length * 1.5 +
    operational.missingRecipeComponentCount * 4
  )
}

function lowerIsBetterScore(value: number | null, values: number[], fallback = 70): number {
  if (value == null || values.length === 0) return fallback
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return fallback
  return round1(((max - value) / (max - min)) * 100)
}

function buildHistoryScore(
  dish: ChefDecisionDishInput,
  context: ChefDecisionContext
): { score: number; detail: string } {
  const clientSignals = context.clientSignals
  const dishName = dish.name

  let score = 55
  const notes: string[] = []

  if (clientSignals.favoriteDishes.some((entry) => overlapsValue(entry, dishName))) {
    score += 18
    notes.push('matches a named favorite')
  }
  if (clientSignals.loved.some((entry) => overlapsValue(entry, dishName))) {
    score += 12
    notes.push('aligns with prior positive feedback')
  }
  if (clientSignals.disliked.some((entry) => overlapsValue(entry, dishName))) {
    score -= 36
    notes.push('clashes with a known dislike')
  }

  score += Math.min(20, dish.history.positiveCount * 8)
  score -= Math.min(28, dish.history.negativeCount * 12)

  if (typeof dish.history.avgRating === 'number') {
    score += (dish.history.avgRating - 3) * 10
    notes.push(`average feedback ${dish.history.avgRating.toFixed(1)}/5`)
  }

  if (dish.history.repeatCount >= 2) {
    score -= Math.min(18, (dish.history.repeatCount - 1) * 5)
    notes.push(`served ${dish.history.repeatCount} times already`)
  }
  if (dish.history.wasRejected) {
    score -= 24
    notes.push('previously rejected')
  }
  if (dish.history.requestCount > 0) {
    score += Math.min(16, dish.history.requestCount * 10)
    notes.push('explicitly requested before')
  }
  if (dish.history.avoidCount > 0) {
    score -= Math.min(25, dish.history.avoidCount * 15)
    notes.push('previously marked to avoid')
  }

  return {
    score: round1(clamp(score, 0, 100)),
    detail: notes[0] ?? 'balances prior client reactions and repetition history',
  }
}

function buildVoteScore(
  option: ChefDecisionCourseOptionInput,
  course: ChefDecisionCourseInput,
  effectiveGuestCount: number
): { score: number; voteShare: number | null; detail: string } {
  const totalVotes =
    course.totalVotes > 0
      ? course.totalVotes
      : course.options.reduce((sum, entry) => sum + Math.max(0, entry.voteCount), 0)

  if (totalVotes > 0) {
    const voteShare = clamp(option.voteCount / totalVotes, 0, 1)
    return {
      score: round1(voteShare * 100),
      voteShare: voteShare,
      detail: `${Math.round(voteShare * 100)}% of recorded votes`,
    }
  }

  if (option.selectedGuestIds.length > 0 && effectiveGuestCount > 0) {
    const voteShare = clamp(option.selectedGuestIds.length / effectiveGuestCount, 0, 1)
    return {
      score: round1(voteShare * 100),
      voteShare,
      detail: `${option.selectedGuestIds.length} guest-specific selections`,
    }
  }

  return {
    score: 50,
    voteShare: null,
    detail: 'no stable poll majority yet',
  }
}

function buildSafetyScore(safety: DishSafetyAssessment): { score: number; detail: string } {
  const score = clamp(
    100 - safety.criticalCount * 45 - safety.warningCount * 20 - safety.infoCount * 6,
    0,
    100
  )

  if (safety.criticalCount > 0) {
    return {
      score: round1(score),
      detail: `${safety.criticalCount} critical guest conflict${safety.criticalCount === 1 ? '' : 's'}`,
    }
  }

  if (safety.warningCount > 0) {
    return {
      score: round1(score),
      detail: `${safety.warningCount} guest accommodation warning${safety.warningCount === 1 ? '' : 's'}`,
    }
  }

  if (safety.infoCount > 0) {
    return { score: round1(score), detail: 'contains soft dietary cautions only' }
  }

  return { score: round1(score), detail: 'no guest-specific conflicts detected' }
}

function buildFactor(
  key: ChefDecisionFactorKey,
  weight: number,
  score: number,
  detail: string
): ChefDecisionFactorScore {
  return {
    key,
    weight,
    score: round1(score),
    contribution: round1(score * weight),
    detail,
  }
}

function evaluateCourseOptions(
  context: ChefDecisionContext,
  course: ChefDecisionCourseInput,
  effectiveGuestCount: number
): EvaluatedOption[] {
  const burdens = course.options.map((option) => calculateSimplicityBurden(option.dish))
  const comparableCosts = course.options
    .map((option) => option.dish.costMetrics.costPerPortionCents)
    .filter((value): value is number => typeof value === 'number' && value >= 0)

  return course.options.map((option, index) => {
    const dish = option.dish
    const vote = buildVoteScore(option, course, effectiveGuestCount)
    const safety = assessDishForGuests(dish, context.guests)
    const safetyScore = buildSafetyScore(safety)
    const historyScore = buildHistoryScore(dish, context)

    const simplicityScore = lowerIsBetterScore(
      burdens[index] ?? null,
      burdens.filter((value) => Number.isFinite(value))
    )

    const rawCostScore = lowerIsBetterScore(dish.costMetrics.costPerPortionCents, comparableCosts, 65)
    const costScore = clamp(
      rawCostScore - (dish.costMetrics.hasCompleteCostData ? 0 : 12),
      0,
      100
    )

    const factorScores = [
      buildFactor('votes', 0.4, vote.score, vote.detail),
      buildFactor('simplicity', 0.2, simplicityScore, 'lower on-site and prep burden'),
      buildFactor(
        'cost',
        0.15,
        costScore,
        dish.costMetrics.hasCompleteCostData
          ? 'lower per-cover cost profile'
          : 'cost coverage is incomplete'
      ),
      buildFactor('history', 0.15, historyScore.score, historyScore.detail),
      buildFactor('safety', 0.1, safetyScore.score, safetyScore.detail),
    ]

    const totalScore = round1(
      factorScores.reduce((sum, factor) => sum + factor.contribution, 0)
    )

    return {
      option,
      voteShare: vote.voteShare,
      totalScore,
      factorScores,
      safety,
      simplicityBurden: burdens[index] ?? 0,
      costValue: dish.costMetrics.costPerPortionCents,
    }
  })
}

function sortEvaluations(evaluations: EvaluatedOption[]): EvaluatedOption[] {
  return [...evaluations].sort((left, right) => {
    if (right.totalScore !== left.totalScore) return right.totalScore - left.totalScore
    if ((right.voteShare ?? -1) !== (left.voteShare ?? -1)) {
      return (right.voteShare ?? -1) - (left.voteShare ?? -1)
    }
    if (left.safety.criticalCount !== right.safety.criticalCount) {
      return left.safety.criticalCount - right.safety.criticalCount
    }
    return left.option.dish.name.localeCompare(right.option.dish.name)
  })
}

function buildAccommodationCount(
  option: EvaluatedOption,
  effectiveGuestCount: number
): number {
  if (option.option.selectedGuestIds.length > 0) {
    return option.option.selectedGuestIds.length
  }
  if (option.voteShare != null && effectiveGuestCount > 0) {
    return Math.max(1, Math.round(option.voteShare * effectiveGuestCount))
  }
  return 0
}

function pickAccommodationOption(
  selected: EvaluatedOption,
  sorted: EvaluatedOption[],
  effectiveGuestCount: number,
  thresholds: ChefDecisionThresholds
): { option: EvaluatedOption | null; strategy: 'single_path' | 'main_plus_accommodation' | 'split_menu' } {
  const alternatives = sorted.filter((entry) => entry.option.dish.id !== selected.option.dish.id)
  const primaryVoteShare = selected.voteShare ?? 0

  const criticalGuestIds = new Set(
    selected.safety.conflicts
      .filter((conflict) => conflict.severity === 'critical')
      .map((conflict) => conflict.guestId)
  )

  if (criticalGuestIds.size > 0) {
    const safeAlternative = alternatives.find(
      (entry) =>
        entry.safety.criticalCount === 0 &&
        [...criticalGuestIds].every(
          (guestId) =>
            !entry.safety.conflicts.some(
              (conflict) => conflict.guestId === guestId && conflict.severity === 'critical'
            )
        )
    )

    if (safeAlternative) {
      const accommodationCount = Math.max(
        criticalGuestIds.size,
        buildAccommodationCount(safeAlternative, effectiveGuestCount)
      )
      const strategy =
        accommodationCount <=
        Math.max(1, Math.round(effectiveGuestCount * thresholds.accommodationVoteShareMax))
          ? 'main_plus_accommodation'
          : 'split_menu'
      return { option: safeAlternative, strategy }
    }
  }

  const runnerUp = alternatives[0] ?? null
  if (!runnerUp || primaryVoteShare < thresholds.consolidationVoteShareMin) {
    return { option: null, strategy: 'single_path' }
  }

  const runnerUpShare = runnerUp.voteShare ?? 0
  if (runnerUpShare <= 0 || runnerUpShare > thresholds.accommodationVoteShareMax) {
    return { option: null, strategy: 'single_path' }
  }

  return { option: runnerUp, strategy: 'main_plus_accommodation' }
}

function voteMargin(top: EvaluatedOption | null, second: EvaluatedOption | null): number | null {
  if (!top || !second || top.voteShare == null || second.voteShare == null) return null
  return round1((top.voteShare - second.voteShare) * 100)
}

function buildCourseRecommendation(
  context: ChefDecisionContext,
  course: ChefDecisionCourseInput,
  thresholds: ChefDecisionThresholds,
  effectiveGuestCount: number
): CourseBuildResult {
  if (course.options.length === 0) {
    const message = `No canonical dish candidates were available for ${course.courseName}.`
    const flag: ChefDecisionRiskFlag = {
      code: 'selection_gap',
      severity: 'critical',
      scope: 'course',
      courseKey: course.courseKey,
      message,
      suggestedResolution: 'Attach candidate dishes or pass the Dinner Circle selection output into the engine.',
    }

    return {
      recommendation: {
        courseKey: course.courseKey,
        courseNumber: course.courseNumber,
        courseName: course.courseName,
        resolution: 'recommended',
        consensus: 'fallback',
        selectedDishId: null,
        selectedDishName: null,
        selectedMenuId: null,
        totalVotes: course.totalVotes,
        voteShare: null,
        marginOverNext: null,
        branchStrategy: 'single_path',
        allocatedGuestCount: effectiveGuestCount,
        accommodation: null,
        warnings: [message],
        factorScores: [],
      },
      flags: [flag],
      trace: {
        scope: 'course',
        courseKey: course.courseKey,
        title: course.courseName,
        explanation: message,
        evidence: [],
      },
      selected: null,
      accommodation: null,
    }
  }

  const evaluations = evaluateCourseOptions(context, course, effectiveGuestCount)
  const sorted = sortEvaluations(evaluations)
  const locked =
    (course.lockedDishId
      ? sorted.find((entry) => entry.option.dish.id === course.lockedDishId)
      : null) ??
    sorted.find((entry) => entry.option.explicitLock) ??
    null
  const selected = locked ?? sorted[0] ?? null
  const runnerUp = sorted.find((entry) => entry.option.dish.id !== selected?.option.dish.id) ?? null
  const flags: ChefDecisionRiskFlag[] = []

  let consensus: ChefDecisionConsensusState = locked ? 'locked' : 'fallback'
  if (!locked) {
    const topVoteCount = selected?.option.voteCount ?? 0
    const runnerUpVoteCount = runnerUp?.option.voteCount ?? 0
    const topVoteShare = selected?.voteShare ?? null
    const margin =
      topVoteShare != null && runnerUp?.voteShare != null ? topVoteShare - runnerUp.voteShare : null

    if (course.totalVotes <= 0 && topVoteShare == null) {
      consensus = 'fallback'
    } else if (topVoteCount > 0 && topVoteCount === runnerUpVoteCount) {
      consensus = 'tie'
      flags.push({
        code: 'selection_tie',
        severity: 'warning',
        scope: 'course',
        courseKey: course.courseKey,
        dishId: selected?.option.dish.id ?? null,
        message: `Votes are tied for ${course.courseName}.`,
        suggestedResolution: 'Use the recommendation trace to break the tie or lock the preferred dish manually.',
      })
    } else if (
      topVoteShare != null &&
      (topVoteShare < thresholds.weakConsensusVoteShare ||
        (margin != null && margin < thresholds.weakConsensusMargin))
    ) {
      consensus = 'weak'
      flags.push({
        code: 'weak_consensus',
        severity: 'warning',
        scope: 'course',
        courseKey: course.courseKey,
        dishId: selected?.option.dish.id ?? null,
        message: `${course.courseName} has weak consensus at ${Math.round(topVoteShare * 100)}% support.`,
        suggestedResolution: 'Confirm the recommendation or lock a dish before execution documents are generated.',
      })
    } else if (topVoteShare != null) {
      consensus = 'strong'
    } else {
      consensus = 'fallback'
    }
  }

  const accommodationDecision =
    selected == null
      ? { option: null, strategy: 'single_path' as const }
      : pickAccommodationOption(selected, sorted, effectiveGuestCount, thresholds)
  const accommodationOption = accommodationDecision.option
  const criticalGuestFloor = new Set(
    (selected?.safety.conflicts ?? [])
      .filter((conflict) => conflict.severity === 'critical')
      .map((conflict) => conflict.guestId)
  ).size
  const accommodationCount =
    accommodationOption == null
      ? 0
      : Math.max(
          criticalGuestFloor,
          buildAccommodationCount(accommodationOption, effectiveGuestCount)
        )

  if (selected?.safety.criticalCount) {
    const guestNames = uniqueStrings(
      selected.safety.conflicts
        .filter((conflict) => conflict.severity === 'critical')
        .map((conflict) => conflict.guestName)
    )

    flags.push({
      code: 'dietary_conflict',
      severity: 'critical',
      scope: 'course',
      courseKey: course.courseKey,
      dishId: selected.option.dish.id,
      guestIds: selected.safety.conflicts
        .filter((conflict) => conflict.severity === 'critical')
        .map((conflict) => conflict.guestId),
      message: `${selected.option.dish.name} conflicts with critical guest constraints${guestNames.length > 0 ? ` for ${guestNames.join(', ')}` : ''}.`,
      suggestedResolution:
        accommodationOption != null
          ? `Keep ${selected.option.dish.name} as the primary path and stage ${accommodationOption.option.dish.name} as an accommodation.`
          : 'Swap this dish or add a safe accommodation before locking the menu.',
    })
  }

  if (selected?.safety.warningCount) {
    flags.push({
      code: 'guest_deviation',
      severity: 'warning',
      scope: 'course',
      courseKey: course.courseKey,
      dishId: selected.option.dish.id,
      message: `${selected.option.dish.name} needs guest-specific accommodations.`,
      suggestedResolution:
        accommodationOption != null
          ? `Route minority guests to ${accommodationOption.option.dish.name}.`
          : 'Document the accommodation path or choose a simpler universal dish.',
    })
  }

  const selectedDish = selected?.option.dish ?? null
  const accommodation =
    accommodationOption == null
      ? null
      : {
          dishId: accommodationOption.option.dish.id,
          dishName: accommodationOption.option.dish.name,
          guestCount: accommodationCount,
          guestIds: accommodationOption.option.selectedGuestIds,
          guestNames: accommodationOption.option.selectedGuestNames,
          reason:
            accommodationDecision.strategy === 'split_menu'
              ? 'Guest conflict volume is too large for a single-path recommendation.'
              : selected?.safety.criticalCount
                ? 'Protects guests with critical dietary conflicts while keeping the majority path intact.'
                : 'Covers minority preference without fragmenting the full menu.',
        }

  const warnings = flags
    .filter((flag) => flag.courseKey === course.courseKey)
    .map((flag) => flag.message)

  if (!locked && course.totalVotes <= 0) {
    warnings.push('No stable poll outcome was available, so the system fell back to operational scoring.')
  }

  const factorScores = selected?.factorScores ?? []
  const strongestFactor = [...factorScores].sort((left, right) => right.contribution - left.contribution)[0]
  const trace: ChefDecisionTraceEntry = {
    scope: 'course',
    courseKey: course.courseKey,
    title: `${course.courseName}: ${selectedDish?.name ?? 'No selection'}`,
    explanation:
      selectedDish == null
        ? `No recommendation was possible for ${course.courseName}.`
        : locked
          ? `${selectedDish.name} stayed selected because the course is already locked.${course.lockedReason ? ` ${course.lockedReason}` : ''}`
          : `${selectedDish.name} leads ${course.courseName}${selected?.voteShare != null ? ` at ${Math.round(selected.voteShare * 100)}% vote share` : ''} and scores best on ${strongestFactor?.key ?? 'overall balance'}.`,
    evidence: factorScores
      .map((factor) => `${factor.key}: ${factor.score}/100 (${factor.detail})`)
      .slice(0, 5),
  }

  return {
    recommendation: {
      courseKey: course.courseKey,
      courseNumber: course.courseNumber,
      courseName: course.courseName,
      resolution: locked ? 'locked' : 'recommended',
      consensus,
      selectedDishId: selectedDish?.id ?? null,
      selectedDishName: selectedDish?.name ?? null,
      selectedMenuId: selectedDish?.menuId ?? null,
      totalVotes: course.totalVotes,
      voteShare: selected?.voteShare != null ? round1(selected.voteShare * 100) : null,
      marginOverNext: voteMargin(selected, runnerUp),
      branchStrategy: accommodationDecision.strategy,
      allocatedGuestCount: Math.max(0, effectiveGuestCount - accommodationCount),
      accommodation,
      warnings: uniqueStrings(warnings),
      factorScores,
    },
    flags,
    trace,
    selected,
    accommodation: accommodationOption,
  }
}

function buildIngredientPlan(
  context: ChefDecisionContext,
  allocations: PlannedDishAllocation[]
): ChefDecisionIngredientPlan {
  const ingredientInputs: Array<{
    recipeName: string
    ingredientName: string
    quantity: string
    unit: string
  }> = []
  const missingDishIds = new Set<string>()

  for (const allocation of allocations) {
    if (allocation.guestCount <= 0) continue

    if (allocation.dish.ingredients.length === 0) {
      missingDishIds.add(allocation.dish.id)
      continue
    }

    let hasQuantifiedIngredient = false
    for (const ingredient of allocation.dish.ingredients) {
      if (typeof ingredient.quantityPerGuest !== 'number') {
        missingDishIds.add(allocation.dish.id)
        continue
      }

      hasQuantifiedIngredient = true
      ingredientInputs.push({
        recipeName: allocation.dish.name,
        ingredientName: ingredient.ingredientName,
        quantity: `${round1(ingredient.quantityPerGuest * allocation.guestCount)}`,
        unit: ingredient.unit,
      })
    }

    if (!hasQuantifiedIngredient) {
      missingDishIds.add(allocation.dish.id)
    }
  }

  const restrictions = uniqueStrings([
    ...context.event.allergies,
    ...context.event.dietaryRestrictions,
    ...context.guests.flatMap((guest) => guest.constraints.map((constraint) => constraint.label)),
  ])

  if (ingredientInputs.length === 0) {
    return {
      coverage: missingDishIds.size > 0 ? 'missing' : 'full',
      servingsPlanned: allocations.reduce((sum, allocation) => sum + allocation.guestCount, 0),
      ingredients: [],
      bySection: {},
      dietaryFlags: [],
      shoppingNotes:
        missingDishIds.size > 0
          ? 'Ingredient scaling is unavailable for at least one selected dish.'
          : 'No ingredient scaling was needed for the current selection.',
      missingDishIds: [...missingDishIds],
    }
  }

  const consolidated = consolidateGroceryFormula(ingredientInputs, restrictions)
  const coverage: ChefDecisionCoverage =
    missingDishIds.size === 0 ? 'full' : ingredientInputs.length > 0 ? 'partial' : 'missing'

  return {
    coverage,
    servingsPlanned: allocations.reduce((sum, allocation) => sum + allocation.guestCount, 0),
    ingredients: consolidated.ingredients,
    bySection: consolidated.bySection,
    dietaryFlags: consolidated.dietaryFlags,
    shoppingNotes: consolidated.shoppingNotes,
    missingDishIds: [...missingDishIds],
  }
}

function collectUniqueAllocatedDishes(allocations: PlannedDishAllocation[]): ChefDecisionDishInput[] {
  const uniqueDishes = new Map<string, ChefDecisionDishInput>()
  for (const allocation of allocations) {
    uniqueDishes.set(allocation.dish.id, allocation.dish)
  }
  return [...uniqueDishes.values()]
}

function buildPrepPlan(allocations: PlannedDishAllocation[]): ChefDecisionPrepPlan {
  const dishes = collectUniqueAllocatedDishes(allocations)
  const uniqueEquipment = uniqueStrings(dishes.flatMap((dish) => dish.equipment)).sort((a, b) =>
    a.localeCompare(b)
  )

  const plan: ChefDecisionPrepPlan = {
    totalPrepMinutes: dishes.reduce(
      (sum, dish) => sum + (dish.operationalMetrics.totalPrepMinutes || 0),
      0
    ),
    totalCookMinutes: dishes.reduce(
      (sum, dish) => sum + (dish.operationalMetrics.totalCookMinutes || 0),
      0
    ),
    totalTimeMinutes: dishes.reduce(
      (sum, dish) => sum + (dish.operationalMetrics.totalTimeMinutes || 0),
      0
    ),
    componentCount: dishes.reduce((sum, dish) => sum + dish.operationalMetrics.componentCount, 0),
    makeAheadComponentCount: dishes.reduce(
      (sum, dish) => sum + dish.operationalMetrics.makeAheadComponentCount,
      0
    ),
    onSiteComponentCount: dishes.reduce(
      (sum, dish) => sum + dish.operationalMetrics.onSiteComponentCount,
      0
    ),
    branchCount: allocations.filter((allocation) => allocation.kind === 'accommodation').length,
    uniqueEquipment,
    steps: [],
  }

  if (plan.makeAheadComponentCount > 0) {
    plan.steps.push(
      `Front-load ${plan.makeAheadComponentCount} make-ahead component${plan.makeAheadComponentCount === 1 ? '' : 's'} before service day.`
    )
  }
  if (plan.onSiteComponentCount > 0) {
    plan.steps.push(
      `Reserve on-site finishing time for ${plan.onSiteComponentCount} live component${plan.onSiteComponentCount === 1 ? '' : 's'}.`
    )
  }
  if (plan.branchCount > 0) {
    plan.steps.push('Label and separate accommodation paths before packing to avoid service confusion.')
  }
  if (plan.uniqueEquipment.length > 0) {
    plan.steps.push(`Stage equipment early: ${plan.uniqueEquipment.join(', ')}.`)
  }
  if (plan.steps.length === 0) {
    plan.steps.push('Execution path is simple enough to run without additional prep staging.')
  }

  return plan
}

function buildRecipeCoverageFlags(allocations: PlannedDishAllocation[]): ChefDecisionRiskFlag[] {
  const missingDishes = collectUniqueAllocatedDishes(allocations).filter(
    (dish) => dish.operationalMetrics.missingRecipeComponentCount > 0
  )

  return missingDishes.map((dish) => ({
    code: 'recipe_component_gap',
    severity: 'warning',
    scope: 'dish',
    dishId: dish.id,
    message: `${dish.name} is missing ${dish.operationalMetrics.missingRecipeComponentCount} recipe-linked component${dish.operationalMetrics.missingRecipeComponentCount === 1 ? '' : 's'}.`,
    suggestedResolution:
      'Attach recipes to every component before relying on the execution simulation for prep and sourcing.',
  }))
}

function buildRedundancyFlags(
  allocations: PlannedDishAllocation[],
  thresholds: ChefDecisionThresholds
): ChefDecisionRiskFlag[] {
  const ingredientCourses = new Map<string, Set<string>>()
  const ingredientLabels = new Map<string, string>()

  for (const allocation of allocations.filter((entry) => entry.kind === 'primary')) {
    for (const ingredient of allocation.dish.ingredientNames) {
      const normalized = normalizeKey(ingredient)
      if (!normalized || GENERIC_REDUNDANCY_INGREDIENTS.has(normalized)) continue

      const existing = ingredientCourses.get(normalized) ?? new Set<string>()
      existing.add(allocation.courseKey)
      ingredientCourses.set(normalized, existing)
      if (!ingredientLabels.has(normalized)) {
        ingredientLabels.set(normalized, ingredient)
      }
    }
  }

  const repeated = [...ingredientCourses.entries()]
    .filter(([, courses]) => courses.size >= thresholds.redundancyCourseCount)
    .sort((left, right) => right[1].size - left[1].size)
    .slice(0, 3)

  return repeated.map(([normalized]) => ({
    code: 'cross_course_redundancy',
    severity: 'warning',
    scope: 'event',
    message: `${ingredientLabels.get(normalized) ?? normalized} repeats across multiple courses.`,
    suggestedResolution:
      'Swap one course for more contrast or explicitly lean into the repeated ingredient with distinct textures and prep paths.',
  }))
}

function buildEquipmentGapFlags(
  context: ChefDecisionContext,
  prepPlan: ChefDecisionPrepPlan
): ChefDecisionRiskFlag[] {
  const available = new Set(
    uniqueStrings([
      ...context.event.confirmedEquipment,
      ...context.event.equipmentAvailable,
    ]).map(normalizeKey)
  )

  const missing = prepPlan.uniqueEquipment.filter((equipment) => !available.has(normalizeKey(equipment)))

  return missing.map((equipment) => ({
    code: 'equipment_gap',
    severity: 'critical',
    scope: 'event',
    message: `${equipment} is required but not confirmed as available.`,
    suggestedResolution:
      'Assign the equipment to the event, confirm it is available on-site, or swap the dish for a simpler prep path.',
  }))
}

function buildComplexityFlags(
  prepPlan: ChefDecisionPrepPlan,
  ingredientPlan: ChefDecisionIngredientPlan,
  thresholds: ChefDecisionThresholds
): ChefDecisionRiskFlag[] {
  const flags: ChefDecisionRiskFlag[] = []

  if (prepPlan.totalPrepMinutes >= thresholds.notReadyPrepMinutes) {
    flags.push({
      code: 'prep_overload',
      severity: 'critical',
      scope: 'event',
      message: `Prep load is ${prepPlan.totalPrepMinutes} minutes, beyond the safe execution threshold.`,
      suggestedResolution: 'Simplify one or more courses or increase make-ahead coverage before locking.',
    })
  } else if (prepPlan.totalPrepMinutes >= thresholds.riskPrepMinutes) {
    flags.push({
      code: 'prep_overload',
      severity: 'warning',
      scope: 'event',
      message: `Prep load is ${prepPlan.totalPrepMinutes} minutes and may compress the execution window.`,
      suggestedResolution: 'Move more components to make-ahead or choose a lower-burden dish.',
    })
  }

  if (prepPlan.onSiteComponentCount >= thresholds.notReadyOnSiteComponentCount) {
    flags.push({
      code: 'service_complexity',
      severity: 'critical',
      scope: 'event',
      message: `${prepPlan.onSiteComponentCount} on-site components create too much live-service complexity.`,
      suggestedResolution: 'Reduce the number of live-fired components or split prep earlier.',
    })
  } else if (prepPlan.onSiteComponentCount >= thresholds.riskOnSiteComponentCount) {
    flags.push({
      code: 'service_complexity',
      severity: 'warning',
      scope: 'event',
      message: `${prepPlan.onSiteComponentCount} on-site components may overload service.`,
      suggestedResolution: 'Consolidate finishing steps or simplify a course.',
    })
  }

  if (prepPlan.componentCount >= thresholds.notReadyComponentCount) {
    flags.push({
      code: 'menu_complexity',
      severity: 'critical',
      scope: 'event',
      message: `${prepPlan.componentCount} unique components make this menu too fragmented to execute cleanly.`,
      suggestedResolution: 'Consolidate garnishes, sauces, or side components before locking the menu.',
    })
  } else if (prepPlan.componentCount >= thresholds.riskComponentCount) {
    flags.push({
      code: 'menu_complexity',
      severity: 'warning',
      scope: 'event',
      message: `${prepPlan.componentCount} unique components create a high-complexity menu.`,
      suggestedResolution: 'Trim low-impact components or merge prep paths across dishes.',
    })
  }

  const uniqueIngredientCount = ingredientPlan.ingredients.length
  if (uniqueIngredientCount >= thresholds.notReadyUniqueIngredientCount) {
    flags.push({
      code: 'ingredient_sprawl',
      severity: 'critical',
      scope: 'event',
      message: `${uniqueIngredientCount} unique ingredients create too much sourcing and prep sprawl.`,
      suggestedResolution: 'Reduce ingredient variety or consolidate dishes around shared mise en place.',
    })
  } else if (uniqueIngredientCount >= thresholds.riskUniqueIngredientCount) {
    flags.push({
      code: 'ingredient_sprawl',
      severity: 'warning',
      scope: 'event',
      message: `${uniqueIngredientCount} unique ingredients raise sourcing and prep complexity.`,
      suggestedResolution: 'Tighten the menu around more shared components.',
    })
  }

  if (prepPlan.uniqueEquipment.length >= thresholds.riskUniqueEquipmentCount) {
    flags.push({
      code: 'equipment_sprawl',
      severity: 'warning',
      scope: 'event',
      message: `${prepPlan.uniqueEquipment.length} equipment categories are required for this menu.`,
      suggestedResolution: 'Prefer dishes with shared equipment to reduce setup surprises.',
    })
  }

  return flags
}

function buildReadiness(
  recommendations: ChefDecisionCourseRecommendation[],
  flags: ChefDecisionRiskFlag[],
  prepPlan: ChefDecisionPrepPlan,
  ingredientPlan: ChefDecisionIngredientPlan,
  missingRecipeComponentCount: number
): ChefDecisionExecutionReadiness {
  const blockers = uniqueStrings(
    flags.filter((flag) => flag.severity === 'critical').map((flag) => flag.message)
  )
  const warnings = uniqueStrings(
    flags.filter((flag) => flag.severity !== 'critical').map((flag) => flag.message)
  )

  if (ingredientPlan.coverage === 'missing') {
    blockers.push('Ingredient scaling is missing for the selected menu.')
  } else if (ingredientPlan.coverage === 'partial') {
    warnings.push('Ingredient scaling is only partially available for the selected menu.')
  }

  if (recommendations.some((course) => course.selectedDishId == null)) {
    blockers.push('At least one course still has no canonical dish recommendation.')
  }

  const state =
    blockers.length > 0 ? 'not_ready' : warnings.length > 0 ? 'risk' : ('ready' as const)

  const reasons =
    state === 'ready'
      ? ['Selection, sourcing, and execution signals align under current constraints.']
      : state === 'risk'
        ? [...warnings].slice(0, 5)
        : [...blockers].slice(0, 5)

  return {
    state,
    reasons,
    blockers,
    warnings,
    metrics: {
      selectedCourseCount: recommendations.filter((course) => Boolean(course.selectedDishId)).length,
      totalCourseCount: recommendations.length,
      branchCount: prepPlan.branchCount,
      criticalConflictCount: flags.filter(
        (flag) => flag.code === 'dietary_conflict' && flag.severity === 'critical'
      ).length,
      warningConflictCount: flags.filter(
        (flag) =>
          (flag.code === 'dietary_conflict' || flag.code === 'guest_deviation') &&
          flag.severity !== 'critical'
      ).length,
      missingRecipeComponentCount,
      missingIngredientDishCount: ingredientPlan.missingDishIds.length,
      unmatchedEquipment: flags
        .filter((flag) => flag.code === 'equipment_gap')
        .map((flag) => flag.message.replace(' is required but not confirmed as available.', '')),
      totalPrepMinutes: prepPlan.totalPrepMinutes,
      onSiteComponentCount: prepPlan.onSiteComponentCount,
      uniqueIngredientCount: ingredientPlan.ingredients.length,
    },
  }
}

function buildSummary(readiness: ChefDecisionExecutionReadiness, recommendations: ChefDecisionCourseRecommendation[]): string {
  const resolved = recommendations.filter((course) => course.selectedDishId != null).length
  const total = recommendations.length

  if (readiness.state === 'ready') {
    return `Ready: ${resolved}/${total} courses resolved with no blocking execution risks.`
  }

  if (readiness.state === 'risk') {
    return `Risk: ${resolved}/${total} courses resolved, but execution still carries ${readiness.warnings.length} warning${readiness.warnings.length === 1 ? '' : 's'}.`
  }

  return `Not ready: ${resolved}/${total} courses resolved, with ${readiness.blockers.length} blocking issue${readiness.blockers.length === 1 ? '' : 's'}.`
}

export function buildChefDecisionEngine(
  context: ChefDecisionContext
): ChefDecisionEngineResult {
  const thresholds: ChefDecisionThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(context.thresholds ?? {}),
  }

  const generatedAt = context.generatedAt ?? new Date().toISOString()
  const activeGuests = context.guests.filter((guest) => guest.attending)
  const effectiveGuestCount = Math.max(
    context.event.guestCount || 0,
    activeGuests.length,
    1
  )

  const courseResults = context.courses.map((course) =>
    buildCourseRecommendation(context, course, thresholds, effectiveGuestCount)
  )
  const recommendations = courseResults.map((result) => result.recommendation)
  const courseFlags = courseResults.flatMap((result) => result.flags)
  const traces = courseResults.map((result) => result.trace)

  const allocations: PlannedDishAllocation[] = []
  for (const result of courseResults) {
    if (result.selected?.option.dish) {
      allocations.push({
        courseKey: result.recommendation.courseKey,
        kind: 'primary',
        guestCount: result.recommendation.allocatedGuestCount,
        dish: result.selected.option.dish,
      })
    }
    if (result.accommodation?.option.dish && result.recommendation.accommodation) {
      allocations.push({
        courseKey: result.recommendation.courseKey,
        kind: 'accommodation',
        guestCount: result.recommendation.accommodation.guestCount,
        dish: result.accommodation.option.dish,
      })
    }
  }

  const ingredientPlan = buildIngredientPlan(context, allocations)
  const prepPlan = buildPrepPlan(allocations)
  const missingRecipeComponentCount = collectUniqueAllocatedDishes(allocations).reduce(
    (sum, dish) => sum + dish.operationalMetrics.missingRecipeComponentCount,
    0
  )
  const globalFlags = [
    ...buildRecipeCoverageFlags(allocations),
    ...buildEquipmentGapFlags(context, prepPlan),
    ...buildComplexityFlags(prepPlan, ingredientPlan, thresholds),
    ...buildRedundancyFlags(allocations, thresholds),
  ]
  const riskFlags = [...courseFlags, ...globalFlags]
  const executionReadiness = buildReadiness(
    recommendations,
    riskFlags,
    prepPlan,
    ingredientPlan,
    missingRecipeComponentCount
  )
  const summary = buildSummary(executionReadiness, recommendations)

  const eventTrace: ChefDecisionTraceEntry = {
    scope: 'event',
    title: 'Execution readiness',
    explanation: summary,
    evidence: [
      `prep_minutes: ${prepPlan.totalPrepMinutes}`,
      `on_site_components: ${prepPlan.onSiteComponentCount}`,
      `ingredient_coverage: ${ingredientPlan.coverage}`,
      `risk_flags: ${riskFlags.length}`,
    ],
  }

  return {
    generatedAt,
    summary,
    finalMenu: {
      status: recommendations.every((course) => course.resolution === 'locked')
        ? 'locked'
        : 'recommended',
      courses: recommendations,
    },
    ingredientPlan,
    prepPlan,
    riskFlags,
    decisionTrace: [...traces, eventTrace],
    executionReadiness,
  }
}

export const __testOnly = {
  assessDishAgainstConstraint,
  assessDishForGuests,
  calculateSimplicityBurden,
  matchDietId,
}
