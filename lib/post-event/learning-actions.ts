'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { canonicalizeDishName } from '@/lib/menus/dish-index-constants'
import {
  buildChefLearningInsights,
  computeDishPerformanceMemory,
  computeEventOutcomeMetrics,
  normalizeLearningDishName,
  resolveDishSentiment,
  type DishPerformanceMemory,
  type LearningDishOutcomeStatus,
  type LearningIssueFlag,
  type LearningPrepAccuracy,
  type LearningTimeAccuracy,
  LEARNING_DISH_OUTCOME_STATUS_VALUES,
  LEARNING_ISSUE_FLAGS,
  LEARNING_PREP_ACCURACY_VALUES,
  LEARNING_TIME_ACCURACY_VALUES,
} from './learning-logic'

type EventRow = {
  id: string
  tenant_id: string
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  status: string
  menu_id: string | null
}

type MenuDishRow = {
  id: string
  name: string | null
  course_name: string | null
  recipe_id?: string | null
  dish_index_id?: string | null
  copied_from_dish_index_id?: string | null
}

type EventOutcomeRow = {
  id: string
  event_id: string
  tenant_id: string
  hub_group_id: string | null
  capture_status: string
  planned_menu_snapshot: unknown
  planned_dish_count: number
  actual_dish_count: number
  matched_dish_count: number
  added_dish_count: number
  removed_dish_count: number
  substituted_dish_count: number
  issue_count: number
  prep_accuracy: LearningPrepAccuracy | null
  time_accuracy: LearningTimeAccuracy | null
  execution_change_notes: string | null
  what_went_well: string | null
  what_went_wrong: string | null
  chef_notes: string | null
  guest_response_count: number
  guest_avg_overall: number | null
  guest_avg_food: number | null
  guest_avg_experience: number | null
  positive_feedback_rate: number | null
  guest_feedback_summary: unknown
  deviation_summary: unknown
  success_score: number | null
  chef_capture_started_at: string | null
  chef_capture_completed_at: string | null
  guest_feedback_last_received_at: string | null
  last_learning_refresh_at: string | null
  created_at: string
  updated_at: string
}

type EventOutcomeDishRow = {
  id: string
  event_outcome_id: string
  tenant_id: string
  event_id: string
  menu_dish_id: string | null
  dish_index_id: string | null
  recipe_id: string | null
  course_name: string | null
  planned_name: string
  actual_name: string | null
  outcome_status: LearningDishOutcomeStatus
  was_served: boolean
  issue_flags: string[] | null
  average_rating: number | null
  guest_feedback_count: number
  positive_feedback_count: number
  negative_feedback_count: number
  neutral_feedback_count: number
  chef_notes: string | null
}

type DishFeedbackPayload = {
  dish_id?: string | null
  dish_name?: string | null
  sentiment?: string | null
  rating?: number | null
  comment?: string | null
  note?: string | null
}

export type ChefOutcomeDishInput = {
  rowId?: string | null
  menuDishId?: string | null
  plannedName: string
  actualName?: string | null
  courseName?: string | null
  outcomeStatus: LearningDishOutcomeStatus
  issueFlags?: LearningIssueFlag[]
  chefNotes?: string | null
}

export type SaveChefOutcomeCaptureInput = {
  eventId: string
  prepAccuracy: LearningPrepAccuracy | null
  timeAccuracy: LearningTimeAccuracy | null
  executionChangeNotes?: string | null
  whatWentWell?: string | null
  whatWentWrong?: string | null
  chefNotes?: string | null
  dishes: ChefOutcomeDishInput[]
}

export type EventOutcomeCaptureDish = {
  rowId: string | null
  menuDishId: string | null
  plannedName: string
  actualName: string | null
  courseName: string | null
  outcomeStatus: LearningDishOutcomeStatus
  wasServed: boolean
  issueFlags: LearningIssueFlag[]
  chefNotes: string | null
  dishIndexId: string | null
  averageRating: number | null
  guestFeedbackCount: number
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  neutralFeedbackCount: number
}

export type EventDishFeedbackChoice = {
  id: string
  name: string
  courseName: string | null
}

export type EventOutcomeCaptureData = {
  event: {
    id: string
    occasion: string | null
    eventDate: string | null
    guestCount: number | null
    status: string
  }
  outcome: {
    captureStatus: string
    prepAccuracy: LearningPrepAccuracy | null
    timeAccuracy: LearningTimeAccuracy | null
    executionChangeNotes: string | null
    whatWentWell: string | null
    whatWentWrong: string | null
    chefNotes: string | null
    successScore: number | null
    guestResponseCount: number
    guestAvgOverall: number | null
    positiveFeedbackRate: number | null
    chefCaptureCompletedAt: string | null
  }
  dishes: EventOutcomeCaptureDish[]
  insights: string[]
}

export type EventOutcomeSummary = {
  captureStatus: string
  successScore: number | null
  guestResponseCount: number
  guestAvgOverall: number | null
  positiveFeedbackRate: number | null
  plannedDishCount: number
  actualDishCount: number
  matchedDishCount: number
  addedDishCount: number
  removedDishCount: number
  substitutedDishCount: number
  issueCount: number
  insights: string[]
}

type EnsureSeedResult = {
  event: EventRow
  outcome: EventOutcomeRow
  dishes: EventOutcomeDishRow[]
}

function coerceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toLearningIssueFlags(value: unknown): LearningIssueFlag[] {
  return coerceStringArray(value).filter((flag): flag is LearningIssueFlag =>
    (LEARNING_ISSUE_FLAGS as readonly string[]).includes(flag)
  )
}

function toDishOutcomeStatus(value: string | null | undefined): LearningDishOutcomeStatus {
  return (LEARNING_DISH_OUTCOME_STATUS_VALUES as readonly string[]).includes(value ?? '')
    ? (value as LearningDishOutcomeStatus)
    : 'planned'
}

function isCapturedOutcomeRow(row: EventOutcomeDishRow): boolean {
  return row.outcome_status !== 'planned' || row.was_served || Boolean(row.actual_name)
}

function parseDishFeedbackPayload(value: unknown): DishFeedbackPayload[] {
  if (!Array.isArray(value)) return []
  const parsed: DishFeedbackPayload[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    parsed.push({
      dish_id: coerceString(record.dish_id) ?? coerceString(record.dishId),
      dish_name: coerceString(record.dish_name) ?? coerceString(record.dishName),
      sentiment: coerceString(record.sentiment),
      rating: coerceNumber(record.rating),
      comment: coerceString(record.comment),
      note: coerceString(record.note),
    })
  }

  return parsed
}

async function getEventRow(db: any, eventId: string, tenantId?: string): Promise<EventRow | null> {
  let query = db
    .from('events')
    .select('id, tenant_id, occasion, event_date, guest_count, status, menu_id')
    .eq('id', eventId)
  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data } = await query.maybeSingle()
  return (data as EventRow | null) ?? null
}

async function getLinkedHubGroupId(db: any, eventId: string): Promise<string | null> {
  const { data } = await db
    .from('hub_groups')
    .select('id')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

async function getMenuDishesForMenu(db: any, menuId: string | null, tenantId: string): Promise<MenuDishRow[]> {
  if (!menuId) return []

  const { data } = await db
    .from('dishes')
    .select(
      'id, name, course_name, recipe_id, dish_index_id, copied_from_dish_index_id'
    )
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  return ((data as MenuDishRow[] | null) ?? []).map((dish) => ({
    ...dish,
    name: dish.name ?? null,
    course_name: dish.course_name ?? null,
    recipe_id: (dish as any).recipe_id ?? null,
    dish_index_id: (dish as any).dish_index_id ?? null,
    copied_from_dish_index_id: (dish as any).copied_from_dish_index_id ?? null,
  }))
}

async function resolveDishIndexIds(
  db: any,
  tenantId: string,
  dishes: MenuDishRow[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  const unresolved = dishes.filter(
    (dish) => !(dish.dish_index_id ?? dish.copied_from_dish_index_id ?? null)
  )

  for (const dish of dishes) {
    map.set(dish.id, dish.dish_index_id ?? dish.copied_from_dish_index_id ?? null)
  }

  if (!unresolved.length) return map

  const canonicalNames = [...new Set(unresolved.map((dish) => canonicalizeDishName(dish.name ?? '')))]
  const { data } = await db
    .from('dish_index')
    .select('id, canonical_name')
    .eq('tenant_id', tenantId)
    .in('canonical_name', canonicalNames)

  const canonicalMap = new Map<string, string>()
  for (const row of (data as Array<{ id: string; canonical_name: string }> | null) ?? []) {
    canonicalMap.set(row.canonical_name, row.id)
  }

  for (const dish of unresolved) {
    map.set(dish.id, canonicalMap.get(canonicalizeDishName(dish.name ?? '')) ?? null)
  }

  return map
}

async function ensureEventOutcomeSeedInternal(
  db: any,
  eventId: string,
  tenantId?: string
): Promise<EnsureSeedResult | null> {
  const event = await getEventRow(db, eventId, tenantId)
  if (!event) return null

  const hubGroupId = await getLinkedHubGroupId(db, eventId)
  const menuDishes = await getMenuDishesForMenu(db, event.menu_id, event.tenant_id)
  const dishIndexIdMap = await resolveDishIndexIds(db, event.tenant_id, menuDishes)

  const plannedSnapshot = menuDishes.map((dish) => ({
    menuDishId: dish.id,
    dishIndexId: dishIndexIdMap.get(dish.id) ?? null,
    recipeId: dish.recipe_id ?? null,
    plannedName: dish.name ?? dish.course_name ?? 'Untitled Dish',
    courseName: dish.course_name ?? null,
  }))

  await db
    .from('event_outcomes')
    .upsert(
      {
        tenant_id: event.tenant_id,
        event_id: event.id,
        hub_group_id: hubGroupId,
        planned_menu_snapshot: plannedSnapshot,
        planned_dish_count: plannedSnapshot.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' }
    )
    .select()

  const { data: outcomeData } = await db
    .from('event_outcomes')
    .select('*')
    .eq('event_id', event.id)
    .eq('tenant_id', event.tenant_id)
    .maybeSingle()

  if (!outcomeData) return null
  const outcome = outcomeData as EventOutcomeRow

  const { data: existingRows } = await db
    .from('event_outcome_dishes')
    .select('*')
    .eq('event_outcome_id', outcome.id)
    .eq('tenant_id', event.tenant_id)
    .order('created_at', { ascending: true })

  let dishes = (existingRows as EventOutcomeDishRow[] | null) ?? []

  if (dishes.length === 0 && plannedSnapshot.length > 0) {
    const inserts = plannedSnapshot.map((dish) => ({
      event_outcome_id: outcome.id,
      tenant_id: event.tenant_id,
      event_id: event.id,
      menu_dish_id: dish.menuDishId,
      dish_index_id: dish.dishIndexId,
      recipe_id: dish.recipeId,
      course_name: dish.courseName,
      planned_name: dish.plannedName,
      actual_name: null,
      outcome_status: 'planned',
      was_served: false,
      issue_flags: [],
      guest_feedback_count: 0,
      positive_feedback_count: 0,
      negative_feedback_count: 0,
      neutral_feedback_count: 0,
      chef_notes: null,
    }))

    const { data: insertedRows } = await db
      .from('event_outcome_dishes')
      .insert(inserts)
      .select('*')

    dishes = (insertedRows as EventOutcomeDishRow[] | null) ?? []
  }

  return { event, outcome, dishes }
}

function buildSurveyChoiceRows(outcome: EventOutcomeRow, dishes: EventOutcomeDishRow[]): EventDishFeedbackChoice[] {
  const useCapturedRows =
    Boolean(outcome.chef_capture_completed_at) || dishes.some((dish) => isCapturedOutcomeRow(dish))

  const sourceRows = useCapturedRows
    ? dishes.filter((dish) => dish.was_served || dish.outcome_status === 'added')
    : dishes

  return sourceRows.map((dish) => ({
    id: dish.menu_dish_id ?? dish.id,
    name: dish.actual_name ?? dish.planned_name,
    courseName: dish.course_name ?? null,
  }))
}

function matchFeedbackToOutcomeDish(
  rows: EventOutcomeDishRow[],
  feedback: DishFeedbackPayload
): EventOutcomeDishRow | null {
  if (feedback.dish_id) {
    const directMatch = rows.find(
      (row) => row.id === feedback.dish_id || row.menu_dish_id === feedback.dish_id
    )
    if (directMatch) return directMatch
  }

  const normalizedName = normalizeLearningDishName(feedback.dish_name)
  if (!normalizedName) return null

  return (
    rows.find(
      (row) =>
        normalizeLearningDishName(row.actual_name ?? row.planned_name) === normalizedName ||
        normalizeLearningDishName(row.planned_name) === normalizedName
    ) ?? null
  )
}

function buildComparableMenuPattern(
  courseCount: number,
  rows: Array<{
    eventId: string
    eventGuestCount: number | null
    plannedDishCount: number
    timeAccuracy: LearningTimeAccuracy | null
    prepAccuracy: LearningPrepAccuracy | null
    successScore: number | null
  }>,
  guestCount: number | null
) {
  const comparable = rows.filter((row) => {
    if (row.plannedDishCount < courseCount) return false
    if (guestCount === null || row.eventGuestCount === null) return true
    return Math.abs(row.eventGuestCount - guestCount) <= 4
  })

  if (!comparable.length) return null

  const overTimeRate =
    comparable.filter((row) => row.timeAccuracy === 'behind').length / comparable.length
  const prepOverRate =
    comparable.filter((row) => row.prepAccuracy === 'over').length / comparable.length
  const averageSuccessScore =
    comparable
      .map((row) => row.successScore)
      .filter((value): value is number => typeof value === 'number')
      .reduce((sum, value, _, array) => sum + value / array.length, 0) || null

  return {
    courseCount,
    comparableEvents: comparable.length,
    overTimeRate: overTimeRate * 100,
    prepOverRate: prepOverRate * 100,
    averageSuccessScore: averageSuccessScore === null ? null : Number(averageSuccessScore.toFixed(2)),
  }
}

async function getDishPerformanceMemoryByTenant(
  db: any,
  tenantId: string,
  dishIndexIds: string[]
): Promise<Map<string, DishPerformanceMemory>> {
  if (!dishIndexIds.length) return new Map()

  const { data: outcomeRowsRaw } = await db
    .from('event_outcome_dishes')
    .select(
      'dish_index_id, event_id, outcome_status, was_served, issue_flags, average_rating, guest_feedback_count, positive_feedback_count, negative_feedback_count, neutral_feedback_count'
    )
    .eq('tenant_id', tenantId)
    .in('dish_index_id', dishIndexIds)

  const outcomeRows = (outcomeRowsRaw as Array<Record<string, unknown>> | null) ?? []
  const eventIds = [...new Set(outcomeRows.map((row) => String(row.event_id)))]

  const { data: eventRows } = await db
    .from('events')
    .select('id, guest_count')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  const guestCountByEvent = new Map<string, number | null>()
  for (const row of (eventRows as Array<{ id: string; guest_count: number | null }> | null) ?? []) {
    guestCountByEvent.set(row.id, row.guest_count ?? null)
  }

  const grouped = new Map<string, Array<any>>()
  for (const row of outcomeRows) {
    const dishIndexId = coerceString(row.dish_index_id)
    if (!dishIndexId) continue
    const list = grouped.get(dishIndexId) ?? []
    list.push({
      outcomeStatus: toDishOutcomeStatus(coerceString(row.outcome_status)),
      wasServed: Boolean(row.was_served),
      groupSize: guestCountByEvent.get(String(row.event_id)) ?? null,
      issueFlags: coerceStringArray(row.issue_flags),
      averageRating: coerceNumber(row.average_rating),
      guestFeedbackCount: coerceNumber(row.guest_feedback_count) ?? 0,
      positiveFeedbackCount: coerceNumber(row.positive_feedback_count) ?? 0,
      negativeFeedbackCount: coerceNumber(row.negative_feedback_count) ?? 0,
      neutralFeedbackCount: coerceNumber(row.neutral_feedback_count) ?? 0,
    })
    grouped.set(dishIndexId, list)
  }

  const result = new Map<string, DishPerformanceMemory>()
  for (const [dishIndexId, records] of grouped) {
    result.set(dishIndexId, computeDishPerformanceMemory(records))
  }
  return result
}

async function buildInsightsForEvent(
  db: any,
  event: EventRow,
  outcome: EventOutcomeRow,
  dishes: EventOutcomeDishRow[]
): Promise<string[]> {
  const currentDishIds = [
    ...new Set(
      dishes
        .map((dish) => dish.dish_index_id)
        .filter((dishIndexId): dishIndexId is string => typeof dishIndexId === 'string')
    ),
  ]

  const dishMemoryMap = await getDishPerformanceMemoryByTenant(db, event.tenant_id, currentDishIds)
  const dishMemories = dishes
    .filter((dish) => dish.dish_index_id && dish.was_served)
    .map((dish) => ({
      dishName: dish.actual_name ?? dish.planned_name,
      summary: dishMemoryMap.get(dish.dish_index_id!) ?? computeDishPerformanceMemory([]),
    }))

  const { data: comparableOutcomesRaw } = await db
    .from('event_outcomes')
    .select(
      'event_id, planned_dish_count, time_accuracy, prep_accuracy, success_score'
    )
    .eq('tenant_id', event.tenant_id)
    .not('event_id', 'is', null)

  const comparableOutcomes =
    (comparableOutcomesRaw as Array<Record<string, unknown>> | null) ?? []
  const comparableEventIds = comparableOutcomes
    .map((row) => coerceString(row.event_id))
    .filter((row): row is string => row !== null)

  const { data: comparableEventRows } = await db
    .from('events')
    .select('id, guest_count')
    .eq('tenant_id', event.tenant_id)
    .in('id', comparableEventIds)

  const comparableGuestCountMap = new Map<string, number | null>()
  for (const row of
    (comparableEventRows as Array<{ id: string; guest_count: number | null }> | null) ?? []) {
    comparableGuestCountMap.set(row.id, row.guest_count ?? null)
  }

  const menuPattern = buildComparableMenuPattern(
    outcome.planned_dish_count,
    comparableOutcomes.map((row) => ({
      eventId: coerceString(row.event_id) ?? '',
      eventGuestCount: comparableGuestCountMap.get(coerceString(row.event_id) ?? '') ?? null,
      plannedDishCount: coerceNumber(row.planned_dish_count) ?? 0,
      timeAccuracy: (coerceString(row.time_accuracy) as LearningTimeAccuracy | null) ?? null,
      prepAccuracy: (coerceString(row.prep_accuracy) as LearningPrepAccuracy | null) ?? null,
      successScore: coerceNumber(row.success_score),
    })),
    event.guest_count ?? null
  )

  return buildChefLearningInsights({
    guestCount: event.guest_count ?? null,
    dishMemories,
    menuPattern,
  })
}

export async function ensureEventOutcomeSeedByTenant(
  eventId: string,
  tenantId?: string
): Promise<void> {
  const db: any = createServerClient({ admin: true })
  await ensureEventOutcomeSeedInternal(db, eventId, tenantId)
}

export async function getEventDishFeedbackChoicesByTenant(
  eventId: string,
  tenantId?: string
): Promise<EventDishFeedbackChoice[]> {
  const db: any = createServerClient({ admin: true })
  const seeded = await ensureEventOutcomeSeedInternal(db, eventId, tenantId)
  if (!seeded) return []
  return buildSurveyChoiceRows(seeded.outcome, seeded.dishes)
}

export async function refreshEventOutcomeLearningByTenant(
  eventId: string,
  tenantId?: string
): Promise<void> {
  const db: any = createServerClient({ admin: true })
  const seeded = await ensureEventOutcomeSeedInternal(db, eventId, tenantId)
  if (!seeded) return

  const { event, outcome, dishes } = seeded

  const { data: hostSurvey } = await db
    .from('post_event_surveys')
    .select(
      'overall, food_quality, completed_at, dish_feedback'
    )
    .eq('event_id', event.id)
    .eq('tenant_id', event.tenant_id)
    .maybeSingle()

  const { data: guestFeedbackRowsRaw } = await db
    .from('guest_feedback')
    .select('overall_rating, food_rating, experience_rating, submitted_at, dish_feedback')
    .eq('event_id', event.id)
    .eq('tenant_id', event.tenant_id)
    .not('submitted_at', 'is', null)

  const guestFeedbackRows =
    (guestFeedbackRowsRaw as Array<Record<string, unknown>> | null) ?? []

  const aggregateByDish = new Map<
    string,
    {
      ratings: number[]
      guestFeedbackCount: number
      positiveFeedbackCount: number
      negativeFeedbackCount: number
      neutralFeedbackCount: number
    }
  >()

  for (const dish of dishes) {
    aggregateByDish.set(dish.id, {
      ratings: [],
      guestFeedbackCount: 0,
      positiveFeedbackCount: 0,
      negativeFeedbackCount: 0,
      neutralFeedbackCount: 0,
    })
  }

  const allDishFeedback = [
    ...parseDishFeedbackPayload(hostSurvey?.dish_feedback),
    ...guestFeedbackRows.flatMap((row) => parseDishFeedbackPayload(row.dish_feedback)),
  ]

  for (const feedback of allDishFeedback) {
    const row = matchFeedbackToOutcomeDish(dishes, feedback)
    if (!row) continue

    const aggregate = aggregateByDish.get(row.id)
    if (!aggregate) continue

    const sentiment = resolveDishSentiment({
      sentiment: feedback.sentiment,
      rating: feedback.rating,
    })

    aggregate.guestFeedbackCount += 1
    if (feedback.rating !== null && feedback.rating !== undefined) {
      aggregate.ratings.push(feedback.rating)
    }

    if (sentiment === 'liked') aggregate.positiveFeedbackCount += 1
    else if (sentiment === 'disliked') aggregate.negativeFeedbackCount += 1
    else aggregate.neutralFeedbackCount += 1
  }

  const guestOverallRatings: number[] = []
  const guestFoodRatings: number[] = []
  const guestExperienceRatings: number[] = []
  const feedbackTimestamps: string[] = []

  if (coerceNumber(hostSurvey?.overall) !== null) guestOverallRatings.push(coerceNumber(hostSurvey?.overall)!)
  if (coerceNumber(hostSurvey?.food_quality) !== null) guestFoodRatings.push(coerceNumber(hostSurvey?.food_quality)!)
  if (coerceString(hostSurvey?.completed_at)) feedbackTimestamps.push(coerceString(hostSurvey?.completed_at)!)

  for (const row of guestFeedbackRows) {
    const overall = coerceNumber(row.overall_rating)
    const food = coerceNumber(row.food_rating)
    const experience = coerceNumber(row.experience_rating)
    const submittedAt = coerceString(row.submitted_at)
    if (overall !== null) guestOverallRatings.push(overall)
    if (food !== null) guestFoodRatings.push(food)
    if (experience !== null) guestExperienceRatings.push(experience)
    if (submittedAt) feedbackTimestamps.push(submittedAt)
  }

  const updatedDishRows = dishes.map((dish) => {
    const aggregate = aggregateByDish.get(dish.id)
    const avgRating =
      aggregate && aggregate.ratings.length
        ? aggregate.ratings.reduce((sum, rating) => sum + rating, 0) / aggregate.ratings.length
        : null

    return {
      ...dish,
      average_rating: avgRating === null ? null : Number(avgRating.toFixed(2)),
      guest_feedback_count: aggregate?.guestFeedbackCount ?? 0,
      positive_feedback_count: aggregate?.positiveFeedbackCount ?? 0,
      negative_feedback_count: aggregate?.negativeFeedbackCount ?? 0,
      neutral_feedback_count: aggregate?.neutralFeedbackCount ?? 0,
    }
  })

  const metrics = computeEventOutcomeMetrics({
    dishes: updatedDishRows.map((dish) => ({
      outcomeStatus: dish.outcome_status,
      wasServed: dish.was_served,
      issueFlags: dish.issue_flags ?? [],
      averageRating: dish.average_rating,
      guestFeedbackCount: dish.guest_feedback_count,
      positiveFeedbackCount: dish.positive_feedback_count,
      negativeFeedbackCount: dish.negative_feedback_count,
      neutralFeedbackCount: dish.neutral_feedback_count,
    })),
    prepAccuracy: outcome.prep_accuracy,
    timeAccuracy: outcome.time_accuracy,
    guestOverallRatings,
    guestFoodRatings,
    guestExperienceRatings,
  })

  for (const dish of updatedDishRows) {
    await db
      .from('event_outcome_dishes')
      .update({
        average_rating: dish.average_rating,
        guest_feedback_count: dish.guest_feedback_count,
        positive_feedback_count: dish.positive_feedback_count,
        negative_feedback_count: dish.negative_feedback_count,
        neutral_feedback_count: dish.neutral_feedback_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dish.id)
      .eq('tenant_id', event.tenant_id)
  }

  const captureStatus = outcome.chef_capture_completed_at
    ? metrics.guestResponseCount > 0
      ? 'learning_complete'
      : 'captured'
    : 'pending'

  await db
    .from('event_outcomes')
    .update({
      capture_status: captureStatus,
      planned_dish_count: metrics.plannedDishCount,
      actual_dish_count: metrics.actualDishCount,
      matched_dish_count: metrics.matchedDishCount,
      added_dish_count: metrics.addedDishCount,
      removed_dish_count: metrics.removedDishCount,
      substituted_dish_count: metrics.substitutedDishCount,
      issue_count: metrics.issueCount,
      guest_response_count: metrics.guestResponseCount,
      guest_avg_overall: metrics.guestAvgOverall,
      guest_avg_food: metrics.guestAvgFood,
      guest_avg_experience: metrics.guestAvgExperience,
      positive_feedback_rate: metrics.positiveFeedbackRate,
      guest_feedback_summary: {
        responseCount: metrics.guestResponseCount,
        positiveFeedbackCount: metrics.positiveFeedbackCount,
        negativeFeedbackCount: metrics.negativeFeedbackCount,
        neutralFeedbackCount: metrics.neutralFeedbackCount,
      },
      deviation_summary: {
        matched: metrics.matchedDishCount,
        added: metrics.addedDishCount,
        removed: metrics.removedDishCount,
        substituted: metrics.substitutedDishCount,
        issues: metrics.issueCount,
      },
      success_score: metrics.successScore,
      guest_feedback_last_received_at: feedbackTimestamps.sort().slice(-1)[0] ?? null,
      last_learning_refresh_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', outcome.id)
    .eq('tenant_id', event.tenant_id)

  revalidatePath(`/events/${event.id}`)
  revalidatePath(`/events/${event.id}/outcome`)
  revalidatePath(`/events/${event.id}/debrief`)
}

export async function getEventOutcomeCapture(eventId: string): Promise<EventOutcomeCaptureData | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const seeded = await ensureEventOutcomeSeedInternal(db, eventId, user.tenantId!)
  if (!seeded) return null

  const insights = await buildInsightsForEvent(db, seeded.event, seeded.outcome, seeded.dishes)

  return {
    event: {
      id: seeded.event.id,
      occasion: seeded.event.occasion,
      eventDate: seeded.event.event_date,
      guestCount: seeded.event.guest_count,
      status: seeded.event.status,
    },
    outcome: {
      captureStatus: seeded.outcome.capture_status,
      prepAccuracy: seeded.outcome.prep_accuracy,
      timeAccuracy: seeded.outcome.time_accuracy,
      executionChangeNotes: seeded.outcome.execution_change_notes,
      whatWentWell: seeded.outcome.what_went_well,
      whatWentWrong: seeded.outcome.what_went_wrong,
      chefNotes: seeded.outcome.chef_notes,
      successScore: seeded.outcome.success_score,
      guestResponseCount: seeded.outcome.guest_response_count,
      guestAvgOverall: seeded.outcome.guest_avg_overall,
      positiveFeedbackRate: seeded.outcome.positive_feedback_rate,
      chefCaptureCompletedAt: seeded.outcome.chef_capture_completed_at,
    },
    dishes: seeded.dishes.map((dish) => ({
      rowId: dish.id,
      menuDishId: dish.menu_dish_id,
      plannedName: dish.planned_name,
      actualName: dish.actual_name,
      courseName: dish.course_name,
      outcomeStatus: dish.outcome_status,
      wasServed: dish.was_served,
      issueFlags: toLearningIssueFlags(dish.issue_flags),
      chefNotes: dish.chef_notes,
      dishIndexId: dish.dish_index_id,
      averageRating: dish.average_rating,
      guestFeedbackCount: dish.guest_feedback_count,
      positiveFeedbackCount: dish.positive_feedback_count,
      negativeFeedbackCount: dish.negative_feedback_count,
      neutralFeedbackCount: dish.neutral_feedback_count,
    })),
    insights,
  }
}

export async function getEventOutcomeSummary(eventId: string): Promise<EventOutcomeSummary | null> {
  const capture = await getEventOutcomeCapture(eventId)
  if (!capture) return null

  return {
    captureStatus: capture.outcome.captureStatus,
    successScore: capture.outcome.successScore,
    guestResponseCount: capture.outcome.guestResponseCount,
    guestAvgOverall: capture.outcome.guestAvgOverall,
    positiveFeedbackRate: capture.outcome.positiveFeedbackRate,
    plannedDishCount: capture.dishes.filter((dish) => dish.outcomeStatus !== 'added').length,
    actualDishCount: capture.dishes.filter((dish) => dish.wasServed).length,
    matchedDishCount: capture.dishes.filter((dish) => dish.outcomeStatus === 'planned_served').length,
    addedDishCount: capture.dishes.filter((dish) => dish.outcomeStatus === 'added').length,
    removedDishCount: capture.dishes.filter((dish) => dish.outcomeStatus === 'removed').length,
    substitutedDishCount: capture.dishes.filter((dish) => dish.outcomeStatus === 'substituted').length,
    issueCount: capture.dishes.reduce((sum, dish) => sum + dish.issueFlags.length, 0),
    insights: capture.insights,
  }
}

export async function saveChefOutcomeCapture(
  input: SaveChefOutcomeCaptureInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (!(LEARNING_PREP_ACCURACY_VALUES as readonly string[]).includes(input.prepAccuracy ?? '')) {
    if (input.prepAccuracy !== null) {
      return { success: false, error: 'Invalid prep accuracy value.' }
    }
  }
  if (!(LEARNING_TIME_ACCURACY_VALUES as readonly string[]).includes(input.timeAccuracy ?? '')) {
    if (input.timeAccuracy !== null) {
      return { success: false, error: 'Invalid time accuracy value.' }
    }
  }
  if (!Array.isArray(input.dishes) || input.dishes.length === 0) {
    return { success: false, error: 'Capture at least one dish outcome.' }
  }

  const db: any = createServerClient()
  const seeded = await ensureEventOutcomeSeedInternal(db, input.eventId, user.tenantId!)
  if (!seeded) return { success: false, error: 'Event not found.' }

  const menuDishes = await getMenuDishesForMenu(db, seeded.event.menu_id, user.tenantId!)
  const menuDishMap = new Map(menuDishes.map((dish) => [dish.id, dish]))

  const canonicalNames = [
    ...new Set(input.dishes.map((dish) => canonicalizeDishName(dish.actualName ?? dish.plannedName))),
  ]
  const { data: dishIndexRows } = await db
    .from('dish_index')
    .select('id, canonical_name')
    .eq('tenant_id', user.tenantId!)
    .in('canonical_name', canonicalNames)

  const dishIndexMap = new Map(
    ((dishIndexRows as Array<{ id: string; canonical_name: string }> | null) ?? []).map((row) => [
      row.canonical_name,
      row.id,
    ])
  )

  const inserts = input.dishes.map((dish) => {
    const status = toDishOutcomeStatus(dish.outcomeStatus)
    const menuDish = dish.menuDishId ? menuDishMap.get(dish.menuDishId) ?? null : null
    const resolvedActualName = coerceString(dish.actualName)
    const resolvedPlannedName = coerceString(dish.plannedName) ?? 'Untitled Dish'
    const dishIndexId =
      menuDish?.dish_index_id ??
      menuDish?.copied_from_dish_index_id ??
      dishIndexMap.get(canonicalizeDishName(resolvedActualName ?? resolvedPlannedName)) ??
      null
    const recipeId = menuDish?.recipe_id ?? null
    const issueFlags = (dish.issueFlags ?? []).filter((flag): flag is LearningIssueFlag =>
      (LEARNING_ISSUE_FLAGS as readonly string[]).includes(flag)
    )

    return {
      event_outcome_id: seeded.outcome.id,
      tenant_id: user.tenantId!,
      event_id: input.eventId,
      menu_dish_id: dish.menuDishId ?? null,
      dish_index_id: dishIndexId,
      recipe_id: recipeId,
      course_name: coerceString(dish.courseName) ?? menuDish?.course_name ?? null,
      planned_name: resolvedPlannedName,
      actual_name: status === 'removed' ? null : resolvedActualName ?? resolvedPlannedName,
      outcome_status: status,
      was_served: status !== 'removed' && status !== 'planned',
      issue_flags: issueFlags,
      chef_notes: coerceString(dish.chefNotes),
      updated_at: new Date().toISOString(),
    }
  })

  await db
    .from('event_outcome_dishes')
    .delete()
    .eq('event_outcome_id', seeded.outcome.id)
    .eq('tenant_id', user.tenantId!)

  const { error: insertError } = await db.from('event_outcome_dishes').insert(inserts)
  if (insertError) {
    console.error('[event-outcomes] Failed to save outcome dishes:', insertError)
    return { success: false, error: 'Failed to save dish outcomes.' }
  }

  const now = new Date().toISOString()
  const { error: outcomeError } = await db
    .from('event_outcomes')
    .update({
      prep_accuracy: input.prepAccuracy,
      time_accuracy: input.timeAccuracy,
      execution_change_notes: coerceString(input.executionChangeNotes),
      what_went_well: coerceString(input.whatWentWell),
      what_went_wrong: coerceString(input.whatWentWrong),
      chef_notes: coerceString(input.chefNotes),
      chef_capture_started_at: seeded.outcome.chef_capture_started_at ?? now,
      chef_capture_completed_at: now,
      capture_status: 'captured',
      updated_at: now,
    })
    .eq('id', seeded.outcome.id)
    .eq('tenant_id', user.tenantId!)

  if (outcomeError) {
    console.error('[event-outcomes] Failed to save outcome summary:', outcomeError)
    return { success: false, error: 'Failed to save outcome summary.' }
  }

  await refreshEventOutcomeLearningByTenant(input.eventId, user.tenantId!)

  revalidatePath(`/events/${input.eventId}`)
  revalidatePath(`/events/${input.eventId}/outcome`)
  revalidatePath(`/events/${input.eventId}/debrief`)
  revalidatePath(`/events/${input.eventId}/aar`)

  return { success: true }
}
