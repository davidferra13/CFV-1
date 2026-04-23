export const LEARNING_PREP_ACCURACY_VALUES = ['under', 'on_target', 'over'] as const
export const LEARNING_TIME_ACCURACY_VALUES = ['ahead', 'on_time', 'behind'] as const
export const LEARNING_DISH_OUTCOME_STATUS_VALUES = [
  'planned',
  'planned_served',
  'substituted',
  'removed',
  'added',
] as const
export const LEARNING_DISH_SENTIMENT_VALUES = ['liked', 'neutral', 'disliked'] as const
export const LEARNING_ISSUE_FLAGS = [
  'timing',
  'complexity',
  'prep',
  'quality',
  'portion',
  'communication',
] as const

export type LearningPrepAccuracy = (typeof LEARNING_PREP_ACCURACY_VALUES)[number]
export type LearningTimeAccuracy = (typeof LEARNING_TIME_ACCURACY_VALUES)[number]
export type LearningDishOutcomeStatus = (typeof LEARNING_DISH_OUTCOME_STATUS_VALUES)[number]
export type LearningDishSentiment = (typeof LEARNING_DISH_SENTIMENT_VALUES)[number]
export type LearningIssueFlag = (typeof LEARNING_ISSUE_FLAGS)[number]

export type EventOutcomeMetricDishInput = {
  outcomeStatus: LearningDishOutcomeStatus
  wasServed: boolean
  issueFlags?: string[] | null
  averageRating?: number | null
  guestFeedbackCount?: number | null
  positiveFeedbackCount?: number | null
  negativeFeedbackCount?: number | null
  neutralFeedbackCount?: number | null
}

export type EventOutcomeMetricInput = {
  dishes: EventOutcomeMetricDishInput[]
  prepAccuracy: LearningPrepAccuracy | null
  timeAccuracy: LearningTimeAccuracy | null
  guestOverallRatings: number[]
  guestFoodRatings?: number[]
  guestExperienceRatings?: number[]
}

export type EventOutcomeMetrics = {
  plannedDishCount: number
  actualDishCount: number
  matchedDishCount: number
  addedDishCount: number
  removedDishCount: number
  substitutedDishCount: number
  issueCount: number
  guestResponseCount: number
  guestAvgOverall: number | null
  guestAvgFood: number | null
  guestAvgExperience: number | null
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  neutralFeedbackCount: number
  positiveFeedbackRate: number | null
  successScore: number
}

export type DishMemoryRecord = {
  outcomeStatus: LearningDishOutcomeStatus
  wasServed: boolean
  groupSize?: number | null
  issueFlags?: string[] | null
  averageRating?: number | null
  guestFeedbackCount?: number | null
  positiveFeedbackCount?: number | null
  negativeFeedbackCount?: number | null
  neutralFeedbackCount?: number | null
}

export type DishPerformanceMemory = {
  selectionFrequency: number
  servedCount: number
  acceptanceRate: number
  feedbackCount: number
  averageRating: number | null
  positiveFeedbackRate: number | null
  issueCounts: Record<string, number>
  largeGroupServedCount: number
  largeGroupIssueCount: number
  largeGroupNegativeCount: number
}

export type MenuStructurePattern = {
  courseCount: number
  comparableEvents: number
  overTimeRate: number
  prepOverRate: number
  averageSuccessScore: number | null
}

export function normalizeLearningDishName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: number[]): number | null {
  if (!values.length) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

function normalizeAccuracyScore(
  value: LearningPrepAccuracy | LearningTimeAccuracy | null,
  perfect: LearningPrepAccuracy | LearningTimeAccuracy
): number {
  if (!value) return 60
  if (value === perfect) return 100
  return 72
}

export function computeEventSuccessScore(input: {
  plannedDishCount: number
  matchedDishCount: number
  addedDishCount: number
  removedDishCount: number
  substitutedDishCount: number
  issueCount: number
  prepAccuracy: LearningPrepAccuracy | null
  timeAccuracy: LearningTimeAccuracy | null
  guestAvgOverall: number | null
  feedbackCount: number
  negativeFeedbackCount: number
}): number {
  const guestScore = input.guestAvgOverall
    ? clamp(((input.guestAvgOverall - 1) / 4) * 100, 0, 100)
    : 70

  const fidelityBase =
    input.plannedDishCount > 0 ? (input.matchedDishCount / input.plannedDishCount) * 100 : 100
  const deviationPenalty = Math.min(
    input.addedDishCount * 5 + input.removedDishCount * 7 + input.substitutedDishCount * 6,
    30
  )
  const fidelityScore = clamp(fidelityBase - deviationPenalty, 0, 100)

  const prepScore = normalizeAccuracyScore(input.prepAccuracy, 'on_target')
  const timeScore = normalizeAccuracyScore(input.timeAccuracy, 'on_time')
  const issuePenalty = Math.min(input.issueCount * 4, 20)
  const negativePenalty =
    input.feedbackCount > 0 ? (input.negativeFeedbackCount / input.feedbackCount) * 15 : 0

  return round(
    clamp(
      guestScore * 0.45 +
        fidelityScore * 0.25 +
        prepScore * 0.15 +
        timeScore * 0.15 -
        issuePenalty -
        negativePenalty,
      0,
      100
    ),
    1
  )
}

export function computeEventOutcomeMetrics(input: EventOutcomeMetricInput): EventOutcomeMetrics {
  const plannedDishCount = input.dishes.filter((dish) => dish.outcomeStatus !== 'added').length
  const actualDishCount = input.dishes.filter((dish) => dish.wasServed).length
  const matchedDishCount = input.dishes.filter((dish) => dish.outcomeStatus === 'planned_served')
    .length
  const addedDishCount = input.dishes.filter((dish) => dish.outcomeStatus === 'added').length
  const removedDishCount = input.dishes.filter((dish) => dish.outcomeStatus === 'removed').length
  const substitutedDishCount = input.dishes.filter((dish) => dish.outcomeStatus === 'substituted')
    .length

  let issueCount = 0
  let positiveFeedbackCount = 0
  let negativeFeedbackCount = 0
  let neutralFeedbackCount = 0
  let feedbackCount = 0

  for (const dish of input.dishes) {
    issueCount += dish.issueFlags?.length ?? 0
    positiveFeedbackCount += dish.positiveFeedbackCount ?? 0
    negativeFeedbackCount += dish.negativeFeedbackCount ?? 0
    neutralFeedbackCount += dish.neutralFeedbackCount ?? 0
    feedbackCount += dish.guestFeedbackCount ?? 0
  }

  const guestAvgOverall = average(input.guestOverallRatings)
  const guestAvgFood = average(input.guestFoodRatings ?? [])
  const guestAvgExperience = average(input.guestExperienceRatings ?? [])
  const positiveFeedbackRate =
    feedbackCount > 0 ? round((positiveFeedbackCount / feedbackCount) * 100, 2) : null

  const successScore = computeEventSuccessScore({
    plannedDishCount,
    matchedDishCount,
    addedDishCount,
    removedDishCount,
    substitutedDishCount,
    issueCount,
    prepAccuracy: input.prepAccuracy,
    timeAccuracy: input.timeAccuracy,
    guestAvgOverall,
    feedbackCount,
    negativeFeedbackCount,
  })

  return {
    plannedDishCount,
    actualDishCount,
    matchedDishCount,
    addedDishCount,
    removedDishCount,
    substitutedDishCount,
    issueCount,
    guestResponseCount: input.guestOverallRatings.length,
    guestAvgOverall: guestAvgOverall ? round(guestAvgOverall, 2) : null,
    guestAvgFood: guestAvgFood ? round(guestAvgFood, 2) : null,
    guestAvgExperience: guestAvgExperience ? round(guestAvgExperience, 2) : null,
    positiveFeedbackCount,
    negativeFeedbackCount,
    neutralFeedbackCount,
    positiveFeedbackRate,
    successScore,
  }
}

export function computeDishPerformanceMemory(records: DishMemoryRecord[]): DishPerformanceMemory {
  const selectionFrequency = records.length
  const servedCount = records.filter((record) => record.wasServed).length
  const acceptanceRate =
    selectionFrequency > 0 ? round((servedCount / selectionFrequency) * 100, 2) : 0

  const allRatings = records
    .map((record) => record.averageRating)
    .filter((value): value is number => typeof value === 'number')
  const averageRating = average(allRatings)

  const feedbackCount = records.reduce((sum, record) => sum + (record.guestFeedbackCount ?? 0), 0)
  const positiveFeedbackCount = records.reduce(
    (sum, record) => sum + (record.positiveFeedbackCount ?? 0),
    0
  )
  const negativeFeedbackCount = records.reduce(
    (sum, record) => sum + (record.negativeFeedbackCount ?? 0),
    0
  )

  const issueCounts: Record<string, number> = {}
  let largeGroupServedCount = 0
  let largeGroupIssueCount = 0
  let largeGroupNegativeCount = 0

  for (const record of records) {
    for (const flag of record.issueFlags ?? []) {
      issueCounts[flag] = (issueCounts[flag] ?? 0) + 1
    }

    if ((record.groupSize ?? 0) > 12) {
      if (record.wasServed) largeGroupServedCount += 1
      largeGroupIssueCount += record.issueFlags?.length ?? 0
      largeGroupNegativeCount += record.negativeFeedbackCount ?? 0
    }
  }

  return {
    selectionFrequency,
    servedCount,
    acceptanceRate,
    feedbackCount,
    averageRating: averageRating ? round(averageRating, 2) : null,
    positiveFeedbackRate:
      feedbackCount > 0 ? round((positiveFeedbackCount / feedbackCount) * 100, 2) : null,
    issueCounts,
    largeGroupServedCount,
    largeGroupIssueCount,
    largeGroupNegativeCount,
  }
}

export function buildChefLearningInsights(input: {
  guestCount: number | null
  dishMemories: Array<{ dishName: string; summary: DishPerformanceMemory }>
  menuPattern?: MenuStructurePattern | null
}): string[] {
  const insights: string[] = []
  const guestCount = input.guestCount ?? 0

  for (const memory of input.dishMemories) {
    const { dishName, summary } = memory
    if (
      guestCount > 12 &&
      summary.largeGroupServedCount >= 2 &&
      (summary.largeGroupIssueCount > 0 || summary.largeGroupNegativeCount > 0)
    ) {
      insights.push(
        `${dishName} underperforms in groups over 12 (${summary.largeGroupIssueCount} large-group issue${summary.largeGroupIssueCount === 1 ? '' : 's'}).`
      )
      continue
    }

    if ((summary.issueCounts.timing ?? 0) >= 2) {
      insights.push(
        `${dishName} shows recurring timing risk (${summary.issueCounts.timing} event${summary.issueCounts.timing === 1 ? '' : 's'}).`
      )
      continue
    }

    if ((summary.issueCounts.complexity ?? 0) >= 2) {
      insights.push(
        `${dishName} carries repeated execution complexity (${summary.issueCounts.complexity} flagged event${summary.issueCounts.complexity === 1 ? '' : 's'}).`
      )
      continue
    }

    if (
      summary.selectionFrequency >= 3 &&
      summary.averageRating !== null &&
      summary.averageRating >= 4.5
    ) {
      insights.push(
        `${dishName} is a strong performer (${summary.averageRating.toFixed(1)}/5 across ${summary.selectionFrequency} selections).`
      )
    } else if (
      summary.selectionFrequency >= 3 &&
      summary.averageRating !== null &&
      summary.averageRating <= 3.2
    ) {
      insights.push(
        `${dishName} is underperforming (${summary.averageRating.toFixed(1)}/5 across ${summary.selectionFrequency} selections).`
      )
    }
  }

  if (input.menuPattern && input.menuPattern.comparableEvents >= 3) {
    if (input.menuPattern.overTimeRate >= 50) {
      insights.push(
        `${input.menuPattern.courseCount}+ dish menus go over time ${Math.round(input.menuPattern.overTimeRate)}% of the time.`
      )
    }
    if (input.menuPattern.prepOverRate >= 50) {
      insights.push(
        `${input.menuPattern.courseCount}+ dish menus push prep over target ${Math.round(input.menuPattern.prepOverRate)}% of the time.`
      )
    }
  }

  return insights.slice(0, 6)
}

export function resolveDishSentiment(input: {
  sentiment?: string | null
  rating?: number | null
}): LearningDishSentiment {
  const sentiment = (input.sentiment ?? '').trim().toLowerCase()
  if (sentiment === 'liked' || sentiment === 'disliked' || sentiment === 'neutral') {
    return sentiment
  }

  const rating = typeof input.rating === 'number' ? input.rating : null
  if (rating === null) return 'neutral'
  if (rating >= 4) return 'liked'
  if (rating <= 2) return 'disliked'
  return 'neutral'
}
