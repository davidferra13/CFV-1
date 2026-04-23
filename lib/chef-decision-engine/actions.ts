'use server'

import { createHash } from 'node:crypto'
import {
  createDerivedOutputProvenance,
  type DerivedOutputProvenance,
} from '@/lib/analytics/source-provenance'
import { requireChef } from '@/lib/auth/get-user'
import { getClientCulinaryMenuSummaryForTenant } from '@/lib/clients/culinary-snapshot'
import { createServerClient } from '@/lib/db/server'
import type {
  PlanningDataQualitySummary,
  PlanningEvidenceSource,
  PlanningRunSource,
} from '@/lib/planning/contracts'
import {
  createPlanningEvidenceSource,
  summarizePlanningDataQuality,
} from '@/lib/planning/contracts'
import {
  completePlanningRun,
  createPlanningRun,
  failPlanningRun,
  getLatestCompletedPlanningArtifact,
  type PlanningArtifactEnvelope,
} from '@/lib/planning/run-store'
import { buildChefDecisionEngine } from './engine'
import type {
  ChefDecisionContext,
  ChefDecisionDishHistoryMetrics,
  ChefDecisionDishInput,
  ChefDecisionEngineResult,
  ChefDecisionGuest,
  ChefDecisionSelectionSignals,
} from './types'

type DbClient = ReturnType<typeof createServerClient>

type SelectionOptionSignal = {
  dishId: string
  voteCount: number
  selectedGuestIds: string[]
  selectedGuestNames: string[]
  source: 'poll' | 'locked' | 'menu' | 'fallback' | 'external'
  explicitLock: boolean
}

type SelectionCourseSignal = {
  courseKey: string
  courseNumber: number | null
  courseName: string
  pollId: string | null
  totalVotes: number
  lockedDishId: string | null
  lockedReason: string | null
  options: SelectionOptionSignal[]
}

const SELECTION_SOURCE_PRIORITY: Record<SelectionOptionSignal['source'], number> = {
  fallback: 1,
  menu: 2,
  poll: 3,
  external: 4,
  locked: 5,
}

type RawMenuRow = {
  id: string
  name: string | null
}

type RawDishRow = {
  id: string
  menu_id: string | null
  name: string | null
  description: string | null
  course_name: string | null
  course_number: number | null
  dietary_tags: string[] | null
  allergen_flags: string[] | null
}

type RawComponentRow = {
  id: string
  dish_id: string
  recipe_id: string | null
  name: string | null
  is_make_ahead: boolean | null
}

type RawRecipeRow = {
  id: string
  name: string | null
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  total_time_minutes: number | null
  equipment: string[] | null
}

type RawRecipeCostRow = {
  recipe_id: string
  cost_per_portion_cents: number | null
  has_all_prices: boolean | null
  ingredient_count: number | null
  last_price_updated_at: string | null
}

type RawRecipeIngredientRow = {
  recipe_id: string
  ingredient_id: string | null
  quantity: number | null
  unit: string | null
  ingredients:
    | {
        name: string | null
        allergen_flags: string[] | null
        dietary_tags: string[] | null
      }
    | {
        name: string | null
        allergen_flags: string[] | null
        dietary_tags: string[] | null
      }[]
    | null
}

type RawDishFeedbackRow = {
  dish_id: string
  rating: number | null
}

type DishFeedbackSummary = {
  avgRating: number | null
  reviewCount: number
}

type NameHistorySummary = ChefDecisionDishHistoryMetrics

type ChefDecisionPlanningRun = {
  runId: string
  runSource: PlanningRunSource
  scopeKey: string
  artifactVersion: string
  generatorVersion: string
  generatedAt: string
  asOfDate: string
  servedFromCache: boolean
}

export type ChefDecisionArtifact = ChefDecisionEngineResult & {
  planningRun: ChefDecisionPlanningRun
  evidence: PlanningEvidenceSource[]
  dataQuality: PlanningDataQualitySummary
  provenance: DerivedOutputProvenance
}

type StoredChefDecisionPayload = Record<string, unknown> &
  ChefDecisionEngineResult & {
    evidence: PlanningEvidenceSource[]
  }

type ChefDecisionBuildResult = {
  result: ChefDecisionEngineResult
  evidence: PlanningEvidenceSource[]
  dataQuality: PlanningDataQualitySummary
  provenance: DerivedOutputProvenance
  summaryPayload: Record<string, unknown>
}

const CHEF_DECISION_RUN_TYPE = 'chef_decision_engine'
const CHEF_DECISION_ARTIFACT_KEY = 'chef_decision_engine'
const CHEF_DECISION_ARTIFACT_VERSION = 'chef-decision-engine.v1'
const CHEF_DECISION_GENERATOR_VERSION = 'culinary.chef-decision-engine.v1'
const CHEF_DECISION_CACHE_MINUTES = 5

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function overlapsValue(left: string, right: string): boolean {
  const leftKey = normalizeKey(left)
  const rightKey = normalizeKey(right)

  if (!leftKey || !rightKey) return false
  if (leftKey === rightKey) return true
  return leftKey.includes(rightKey) || rightKey.includes(leftKey)
}

function deriveCourseKey(courseNumber: number | null, courseName: string | null): string {
  const safeName =
    cleanText(courseName) ?? (courseNumber != null ? `Course ${courseNumber}` : 'Course')
  return courseNumber != null
    ? `${courseNumber}:${normalizeKey(safeName)}`
    : normalizeKey(safeName) || 'course'
}

function localDateIso(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function hashSelectionSignals(input: ChefDecisionSelectionSignals | undefined): string | null {
  if (!input) return null
  const serialized = JSON.stringify(input)
  return createHash('sha256').update(serialized).digest('hex').slice(0, 16)
}

function latestIso(values: Array<string | null | undefined>): string | null {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => b.localeCompare(a))[0] ?? null
  )
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function readMetadataNumber(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function readMetadataBoolean(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): boolean {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = normalizeKey(value)
      if (normalized === 'true' || normalized === 'yes' || normalized === 'locked') return true
    }
    if (typeof value === 'number' && value === 1) return true
  }
  return false
}

function mergeOptionSignals(
  existing: SelectionOptionSignal | null,
  incoming: SelectionOptionSignal
): SelectionOptionSignal {
  if (!existing) return incoming

  const source =
    SELECTION_SOURCE_PRIORITY[incoming.source] >= SELECTION_SOURCE_PRIORITY[existing.source]
      ? incoming.source
      : existing.source

  return {
    dishId: incoming.dishId,
    voteCount: incoming.voteCount > 0 ? incoming.voteCount : existing.voteCount,
    selectedGuestIds: uniqueStrings([...existing.selectedGuestIds, ...incoming.selectedGuestIds]),
    selectedGuestNames: uniqueStrings([
      ...existing.selectedGuestNames,
      ...incoming.selectedGuestNames,
    ]),
    source,
    explicitLock: existing.explicitLock || incoming.explicitLock,
  }
}

function normalizeSelectionSignals(
  input: ChefDecisionSelectionSignals | null | undefined
): SelectionCourseSignal[] {
  const courses = new Map<string, SelectionCourseSignal>()

  for (const rawCourse of input?.courses ?? []) {
    const courseNumber =
      typeof rawCourse.courseNumber === 'number' && Number.isFinite(rawCourse.courseNumber)
        ? rawCourse.courseNumber
        : null
    const courseName =
      cleanText(rawCourse.courseName) ??
      (courseNumber != null ? `Course ${courseNumber}` : 'Course')
    const courseKey = cleanText(rawCourse.courseKey) ?? deriveCourseKey(courseNumber, courseName)
    const existing = courses.get(courseKey) ?? {
      courseKey,
      courseNumber,
      courseName,
      pollId: cleanText(rawCourse.pollId) ?? null,
      totalVotes: Math.max(0, Number(rawCourse.totalVotes ?? 0)),
      lockedDishId: cleanText(rawCourse.lockedDishId) ?? null,
      lockedReason: cleanText(rawCourse.lockedReason) ?? null,
      options: [],
    }

    if (courseNumber != null) existing.courseNumber = courseNumber
    if (courseName) existing.courseName = courseName
    if (cleanText(rawCourse.pollId)) existing.pollId = cleanText(rawCourse.pollId)
    if (typeof rawCourse.totalVotes === 'number' && rawCourse.totalVotes >= 0) {
      existing.totalVotes = rawCourse.totalVotes
    }
    if (cleanText(rawCourse.lockedDishId)) existing.lockedDishId = cleanText(rawCourse.lockedDishId)
    if (cleanText(rawCourse.lockedReason)) existing.lockedReason = cleanText(rawCourse.lockedReason)

    const optionMap = new Map(existing.options.map((option) => [option.dishId, option]))
    for (const rawOption of rawCourse.options ?? []) {
      const dishId = cleanText(rawOption.dishId)
      if (!dishId) continue

      optionMap.set(
        dishId,
        mergeOptionSignals(optionMap.get(dishId) ?? null, {
          dishId,
          voteCount: Math.max(0, Number(rawOption.voteCount ?? 0)),
          selectedGuestIds: uniqueStrings(rawOption.selectedGuestIds ?? []),
          selectedGuestNames: uniqueStrings(rawOption.selectedGuestNames ?? []),
          source: rawOption.source ?? 'external',
          explicitLock: Boolean(rawOption.explicitLock),
        })
      )
    }

    existing.options = [...optionMap.values()]
    if (existing.totalVotes <= 0) {
      existing.totalVotes = existing.options.reduce((sum, option) => sum + option.voteCount, 0)
    }

    courses.set(courseKey, existing)
  }

  return [...courses.values()]
}

function mergeSelectionSignals(
  base: SelectionCourseSignal[],
  incoming: SelectionCourseSignal[]
): SelectionCourseSignal[] {
  const map = new Map(
    base.map((course) => [course.courseKey, { ...course, options: [...course.options] }])
  )

  for (const course of incoming) {
    const existing = map.get(course.courseKey) ?? {
      courseKey: course.courseKey,
      courseNumber: course.courseNumber,
      courseName: course.courseName,
      pollId: course.pollId,
      totalVotes: course.totalVotes,
      lockedDishId: course.lockedDishId,
      lockedReason: course.lockedReason,
      options: [],
    }

    existing.courseNumber = course.courseNumber ?? existing.courseNumber
    existing.courseName = course.courseName || existing.courseName
    existing.pollId = course.pollId ?? existing.pollId
    existing.totalVotes = course.totalVotes > 0 ? course.totalVotes : existing.totalVotes
    if (course.lockedDishId) existing.lockedDishId = course.lockedDishId
    if (course.lockedReason) existing.lockedReason = course.lockedReason

    const optionMap = new Map(existing.options.map((option) => [option.dishId, option]))
    for (const option of course.options) {
      optionMap.set(option.dishId, mergeOptionSignals(optionMap.get(option.dishId) ?? null, option))
    }

    existing.options = [...optionMap.values()]
    if (existing.totalVotes <= 0) {
      existing.totalVotes = existing.options.reduce((sum, option) => sum + option.voteCount, 0)
    }

    map.set(course.courseKey, existing)
  }

  return [...map.values()]
}

function collectSignalDishIds(courses: SelectionCourseSignal[]): string[] {
  return uniqueStrings(
    courses.flatMap((course) => [
      course.lockedDishId,
      ...course.options.map((option) => option.dishId),
    ])
  )
}

async function loadHubSelectionSignals(
  db: DbClient,
  eventId: string
): Promise<SelectionCourseSignal[]> {
  const { data: groups } = await (db as any)
    .from('hub_groups')
    .select('id')
    .eq('event_id', eventId)
    .eq('is_active', true)

  const groupIds = uniqueStrings((groups ?? []).map((group: { id: string }) => group.id))
  if (groupIds.length === 0) return []

  const { data: polls } = await (db as any)
    .from('hub_polls')
    .select('id, question')
    .in('group_id', groupIds)

  const pollIds = uniqueStrings((polls ?? []).map((poll: { id: string }) => poll.id))
  if (pollIds.length === 0) return []

  const [optionsResponse, votesResponse] = await Promise.all([
    (db as any)
      .from('hub_poll_options')
      .select('id, poll_id, label, metadata, sort_order')
      .in('poll_id', pollIds),
    (db as any)
      .from('hub_poll_votes')
      .select('poll_id, option_id, profile_id')
      .in('poll_id', pollIds),
  ])

  const optionRows =
    (optionsResponse.data as
      | Array<{
          id: string
          poll_id: string
          label: string | null
          metadata: Record<string, unknown> | null
        }>
      | null
      | undefined) ?? []
  const voteRows =
    (votesResponse.data as
      | Array<{ poll_id: string; option_id: string; profile_id: string }>
      | null
      | undefined) ?? []

  const profileIds = uniqueStrings(voteRows.map((vote) => vote.profile_id))
  const { data: profiles } =
    profileIds.length === 0
      ? ({ data: [] } as { data: Array<{ id: string; display_name: string | null }> })
      : await (db as any).from('hub_guest_profiles').select('id, display_name').in('id', profileIds)

  const profileNameMap = new Map(
    ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((profile) => [
      profile.id,
      cleanText(profile.display_name) ?? 'Guest',
    ])
  )

  const pollQuestionMap = new Map(
    ((polls ?? []) as Array<{ id: string; question: string | null }>).map((poll) => [
      poll.id,
      cleanText(poll.question) ?? 'Course',
    ])
  )

  const votesByOption = new Map<string, Array<{ profile_id: string }>>()
  for (const vote of voteRows) {
    const existing = votesByOption.get(vote.option_id) ?? []
    existing.push({ profile_id: vote.profile_id })
    votesByOption.set(vote.option_id, existing)
  }

  const courseMap = new Map<string, SelectionCourseSignal>()

  for (const option of optionRows) {
    const metadata = option.metadata ?? {}
    const dishId = readMetadataString(metadata, [
      'dishId',
      'dish_id',
      'canonicalDishId',
      'canonical_dish_id',
    ])
    if (!dishId) continue

    const courseNumber = readMetadataNumber(metadata, ['courseNumber', 'course_number'])
    const courseName =
      readMetadataString(metadata, ['courseName', 'course_name']) ??
      pollQuestionMap.get(option.poll_id) ??
      'Course'
    const courseKey =
      readMetadataString(metadata, ['courseKey', 'course_key']) ??
      deriveCourseKey(courseNumber, courseName)
    const votesForOption = votesByOption.get(option.id) ?? []
    const existing = courseMap.get(courseKey) ?? {
      courseKey,
      courseNumber,
      courseName,
      pollId: option.poll_id,
      totalVotes: 0,
      lockedDishId: null,
      lockedReason: null,
      options: [],
    }

    existing.totalVotes += votesForOption.length
    if (
      readMetadataBoolean(metadata, [
        'locked',
        'isLocked',
        'is_locked',
        'finalSelection',
        'final_selection',
      ])
    ) {
      existing.lockedDishId = dishId
      existing.lockedReason =
        readMetadataString(metadata, ['lockReason', 'lock_reason']) ??
        'Dinner Circle marked this dish as the final selection.'
    }

    const optionSignal: SelectionOptionSignal = {
      dishId,
      voteCount: votesForOption.length,
      selectedGuestIds: uniqueStrings(votesForOption.map((vote) => vote.profile_id)),
      selectedGuestNames: uniqueStrings(
        votesForOption.map((vote) => profileNameMap.get(vote.profile_id) ?? 'Guest')
      ),
      source: 'poll',
      explicitLock: readMetadataBoolean(metadata, ['locked', 'isLocked', 'is_locked']),
    }

    const optionMap = new Map(existing.options.map((entry) => [entry.dishId, entry]))
    optionMap.set(dishId, mergeOptionSignals(optionMap.get(dishId) ?? null, optionSignal))
    existing.options = [...optionMap.values()]
    courseMap.set(courseKey, existing)
  }

  return [...courseMap.values()]
}

function buildLockedMenuSignals(menuId: string, dishes: RawDishRow[]): SelectionCourseSignal[] {
  const byCourse = new Map<string, RawDishRow[]>()

  for (const dish of dishes.filter((entry) => entry.menu_id === menuId)) {
    const courseKey = deriveCourseKey(dish.course_number, dish.course_name)
    const existing = byCourse.get(courseKey) ?? []
    existing.push(dish)
    byCourse.set(courseKey, existing)
  }

  return [...byCourse.entries()].map(([courseKey, courseDishes]) => {
    const singleDish = courseDishes.length === 1 ? courseDishes[0] : null
    return {
      courseKey,
      courseNumber: courseDishes[0]?.course_number ?? null,
      courseName: cleanText(courseDishes[0]?.course_name) ?? 'Course',
      pollId: null,
      totalVotes: 0,
      lockedDishId: singleDish?.id ?? null,
      lockedReason: singleDish ? 'The event already points to a selected execution menu.' : null,
      options: courseDishes.map((dish) => ({
        dishId: dish.id,
        voteCount: 0,
        selectedGuestIds: [],
        selectedGuestNames: [],
        source: singleDish?.id === dish.id ? 'locked' : 'menu',
        explicitLock: singleDish?.id === dish.id,
      })),
    }
  })
}

async function loadMenusForEvent(
  db: DbClient,
  tenantId: string,
  eventId: string,
  extraMenuIds: string[]
): Promise<RawMenuRow[]> {
  const { data: eventMenus } = await (db as any)
    .from('menus')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const seen = new Set(uniqueStrings((eventMenus ?? []).map((menu: RawMenuRow) => menu.id)))
  const missingIds = extraMenuIds.filter((menuId) => !seen.has(menuId))

  let extraMenus: RawMenuRow[] = []
  if (missingIds.length > 0) {
    const { data } = await (db as any)
      .from('menus')
      .select('id, name')
      .in('id', missingIds)
      .eq('tenant_id', tenantId)

    extraMenus = (data ?? []) as RawMenuRow[]
  }

  return [...((eventMenus ?? []) as RawMenuRow[]), ...extraMenus]
}

async function loadDishes(
  db: DbClient,
  tenantId: string,
  menuIds: string[],
  extraDishIds: string[]
): Promise<RawDishRow[]> {
  let menuDishes: RawDishRow[] = []
  if (menuIds.length > 0) {
    const { data } = await (db as any)
      .from('dishes')
      .select(
        'id, menu_id, name, description, course_name, course_number, dietary_tags, allergen_flags'
      )
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)

    menuDishes = (data ?? []) as RawDishRow[]
  }

  const existingIds = new Set(uniqueStrings(menuDishes.map((dish) => dish.id)))
  const missingDishIds = extraDishIds.filter((dishId) => !existingIds.has(dishId))

  let signalDishes: RawDishRow[] = []
  if (missingDishIds.length > 0) {
    const { data } = await (db as any)
      .from('dishes')
      .select(
        'id, menu_id, name, description, course_name, course_number, dietary_tags, allergen_flags'
      )
      .in('id', missingDishIds)
      .eq('tenant_id', tenantId)

    signalDishes = (data ?? []) as RawDishRow[]
  }

  const deduped = new Map<string, RawDishRow>()
  for (const dish of [...menuDishes, ...signalDishes]) {
    deduped.set(dish.id, dish)
  }

  return [...deduped.values()]
}

async function loadDishGraph(
  db: DbClient,
  tenantId: string,
  dishIds: string[]
): Promise<{
  components: RawComponentRow[]
  recipes: RawRecipeRow[]
  recipeCosts: RawRecipeCostRow[]
  recipeIngredients: RawRecipeIngredientRow[]
  dishFeedback: RawDishFeedbackRow[]
}> {
  if (dishIds.length === 0) {
    return {
      components: [],
      recipes: [],
      recipeCosts: [],
      recipeIngredients: [],
      dishFeedback: [],
    }
  }

  const { data: components } = await (db as any)
    .from('components')
    .select('id, dish_id, recipe_id, name, is_make_ahead')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)

  const recipeIds = uniqueStrings(
    ((components ?? []) as RawComponentRow[]).map((component) => component.recipe_id)
  )

  const [recipesResponse, recipeCostResponse, ingredientResponse, dishFeedbackResponse] =
    await Promise.all([
      recipeIds.length === 0
        ? ({ data: [] } as { data: RawRecipeRow[] })
        : (db as any)
            .from('recipes')
            .select(
              'id, name, servings, prep_time_minutes, cook_time_minutes, total_time_minutes, equipment'
            )
            .in('id', recipeIds)
            .eq('tenant_id', tenantId),
      recipeIds.length === 0
        ? ({ data: [] } as { data: RawRecipeCostRow[] })
        : (db as any)
            .from('recipe_cost_summary')
            .select(
              'recipe_id, cost_per_portion_cents, has_all_prices, ingredient_count, last_price_updated_at'
            )
            .in('recipe_id', recipeIds)
            .eq('tenant_id', tenantId),
      recipeIds.length === 0
        ? ({ data: [] } as { data: RawRecipeIngredientRow[] })
        : (db as any)
            .from('recipe_ingredients')
            .select(
              'recipe_id, ingredient_id, quantity, unit, ingredients(name, allergen_flags, dietary_tags)'
            )
            .in('recipe_id', recipeIds),
      (db as any)
        .from('dish_feedback')
        .select('dish_id, rating')
        .in('dish_id', dishIds)
        .eq('tenant_id', tenantId),
    ])

  return {
    components: ((components ?? []) as RawComponentRow[]) ?? [],
    recipes: (recipesResponse.data ?? []) as RawRecipeRow[],
    recipeCosts: (recipeCostResponse.data ?? []) as RawRecipeCostRow[],
    recipeIngredients: (ingredientResponse.data ?? []) as RawRecipeIngredientRow[],
    dishFeedback: (dishFeedbackResponse.data ?? []) as RawDishFeedbackRow[],
  }
}

function summarizeDishFeedback(rows: RawDishFeedbackRow[]): Map<string, DishFeedbackSummary> {
  const grouped = new Map<string, number[]>()

  for (const row of rows) {
    if (typeof row.rating !== 'number') continue
    const existing = grouped.get(row.dish_id) ?? []
    existing.push(row.rating)
    grouped.set(row.dish_id, existing)
  }

  const summary = new Map<string, DishFeedbackSummary>()
  for (const [dishId, ratings] of grouped) {
    const avg = ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    summary.set(dishId, {
      avgRating: Math.round(avg * 10) / 10,
      reviewCount: ratings.length,
    })
  }

  return summary
}

function buildNameHistoryMap(input: {
  servedDishHistory: Array<{
    dish_name?: string | null
    client_reaction?: string | null
    served_date?: string | null
  }>
  mealRequests: Array<{
    dish_name?: string | null
    request_type?: string | null
    status?: string | null
  }>
}): Map<string, NameHistorySummary> {
  const history = new Map<string, NameHistorySummary>()

  function ensureEntry(name: string): NameHistorySummary {
    const normalized = normalizeKey(name)
    const existing = history.get(normalized)
    if (existing) return existing

    const created: NameHistorySummary = {
      avgRating: null,
      reviewCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      repeatCount: 0,
      wasRejected: false,
      recentlyServedOn: null,
      requestCount: 0,
      avoidCount: 0,
    }
    history.set(normalized, created)
    return created
  }

  for (const row of input.servedDishHistory) {
    const name = cleanText(row.dish_name)
    if (!name) continue
    const entry = ensureEntry(name)
    entry.repeatCount += 1
    if (row.served_date && (!entry.recentlyServedOn || row.served_date > entry.recentlyServedOn)) {
      entry.recentlyServedOn = row.served_date
    }

    const reaction = normalizeKey(row.client_reaction)
    if (reaction === 'liked' || reaction === 'loved') {
      entry.positiveCount += 1
    }
    if (reaction === 'disliked') {
      entry.negativeCount += 1
      entry.wasRejected = true
    }
  }

  for (const request of input.mealRequests) {
    const status = normalizeKey(request.status)
    if (status === 'withdrawn' || status === 'declined') continue

    const name = cleanText(request.dish_name)
    if (!name) continue
    const entry = ensureEntry(name)
    const type = normalizeKey(request.request_type)
    if (type === 'repeat_dish' || type === 'new_idea') entry.requestCount += 1
    if (type === 'avoid_dish') {
      entry.avoidCount += 1
      entry.wasRejected = true
    }
  }

  return history
}

function resolveDishHistory(
  dishName: string,
  historyMap: Map<string, NameHistorySummary>
): NameHistorySummary {
  const exact = historyMap.get(normalizeKey(dishName))
  if (exact) return exact

  for (const [key, value] of historyMap) {
    if (overlapsValue(key, dishName) || overlapsValue(dishName, key)) {
      return value
    }
  }

  return {
    avgRating: null,
    reviewCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    repeatCount: 0,
    wasRejected: false,
    recentlyServedOn: null,
    requestCount: 0,
    avoidCount: 0,
  }
}

function normalizeIngredientRelation(value: RawRecipeIngredientRow['ingredients']): {
  name: string | null
  allergen_flags: string[] | null
  dietary_tags: string[] | null
} | null {
  if (Array.isArray(value)) {
    return (
      (value[0] as {
        name: string | null
        allergen_flags: string[] | null
        dietary_tags: string[] | null
      } | null) ?? null
    )
  }

  return value ?? null
}

function buildDishInputs(input: {
  dishes: RawDishRow[]
  components: RawComponentRow[]
  recipes: RawRecipeRow[]
  recipeCosts: RawRecipeCostRow[]
  recipeIngredients: RawRecipeIngredientRow[]
  dishFeedback: Map<string, DishFeedbackSummary>
  historyMap: Map<string, NameHistorySummary>
}): Map<string, ChefDecisionDishInput> {
  const componentsByDish = new Map<string, RawComponentRow[]>()
  for (const component of input.components) {
    const existing = componentsByDish.get(component.dish_id) ?? []
    existing.push(component)
    componentsByDish.set(component.dish_id, existing)
  }

  const recipesById = new Map(input.recipes.map((recipe) => [recipe.id, recipe]))
  const recipeCostById = new Map(input.recipeCosts.map((cost) => [cost.recipe_id, cost]))
  const ingredientsByRecipe = new Map<string, RawRecipeIngredientRow[]>()
  for (const ingredient of input.recipeIngredients) {
    const existing = ingredientsByRecipe.get(ingredient.recipe_id) ?? []
    existing.push(ingredient)
    ingredientsByRecipe.set(ingredient.recipe_id, existing)
  }

  const result = new Map<string, ChefDecisionDishInput>()

  for (const dish of input.dishes) {
    const components = componentsByDish.get(dish.id) ?? []
    const recipeIds = uniqueStrings(components.map((component) => component.recipe_id))
    const recipes = recipeIds
      .map((recipeId) => recipesById.get(recipeId))
      .filter((recipe): recipe is RawRecipeRow => Boolean(recipe))

    const ingredientNames = uniqueStrings(
      recipeIds.flatMap((recipeId) =>
        (ingredientsByRecipe.get(recipeId) ?? [])
          .map((row) => normalizeIngredientRelation(row.ingredients)?.name)
          .filter(Boolean)
      )
    )

    const ingredientLines = recipeIds.flatMap((recipeId) => {
      const recipe = recipesById.get(recipeId)
      return (ingredientsByRecipe.get(recipeId) ?? []).map((row) => {
        const ingredient = normalizeIngredientRelation(row.ingredients)
        const quantityPerGuest =
          recipe?.servings && recipe.servings > 0 && typeof row.quantity === 'number'
            ? Number(row.quantity) / Number(recipe.servings)
            : null

        return {
          ingredientId: row.ingredient_id ?? null,
          ingredientName: cleanText(ingredient?.name) ?? 'Unknown ingredient',
          unit: cleanText(row.unit) ?? 'piece',
          quantityPerGuest,
          allergenFlags: (ingredient?.allergen_flags ?? []).filter(Boolean),
          dietaryTags: (ingredient?.dietary_tags ?? []).filter(Boolean),
          sourceRecipeId: recipe?.id ?? null,
          sourceRecipeName: cleanText(recipe?.name) ?? null,
        }
      })
    })

    const recipeCosts = recipeIds
      .map((recipeId) => recipeCostById.get(recipeId))
      .filter((cost): cost is RawRecipeCostRow => Boolean(cost))

    const feedback = input.dishFeedback.get(dish.id) ?? { avgRating: null, reviewCount: 0 }
    const nameHistory = resolveDishHistory(cleanText(dish.name) ?? 'Dish', input.historyMap)

    result.set(dish.id, {
      id: dish.id,
      menuId: dish.menu_id ?? null,
      courseKey: deriveCourseKey(dish.course_number, dish.course_name),
      courseNumber: dish.course_number ?? null,
      courseName: cleanText(dish.course_name) ?? 'Course',
      name: cleanText(dish.name) ?? 'Untitled dish',
      description: cleanText(dish.description) ?? null,
      dietaryTags: (dish.dietary_tags ?? []).filter(Boolean),
      allergenFlags: (dish.allergen_flags ?? []).filter(Boolean),
      ingredientNames,
      equipment: uniqueStrings(recipes.flatMap((recipe) => recipe.equipment ?? [])),
      ingredients: ingredientLines,
      operationalMetrics: {
        componentCount: components.length,
        makeAheadComponentCount: components.filter((component) => Boolean(component.is_make_ahead))
          .length,
        onSiteComponentCount: components.filter((component) => !component.is_make_ahead).length,
        totalPrepMinutes: recipes.reduce(
          (sum, recipe) => sum + Number(recipe.prep_time_minutes ?? 0),
          0
        ),
        totalCookMinutes: recipes.reduce(
          (sum, recipe) => sum + Number(recipe.cook_time_minutes ?? 0),
          0
        ),
        totalTimeMinutes: recipes.reduce(
          (sum, recipe) =>
            sum +
            Number(
              recipe.total_time_minutes ??
                Number(recipe.prep_time_minutes ?? 0) + Number(recipe.cook_time_minutes ?? 0)
            ),
          0
        ),
        missingRecipeComponentCount: components.filter(
          (component) => !component.recipe_id || !recipesById.has(component.recipe_id)
        ).length,
      },
      costMetrics: {
        costPerPortionCents:
          recipeCosts.length > 0
            ? recipeCosts.reduce((sum, cost) => sum + Number(cost.cost_per_portion_cents ?? 0), 0)
            : null,
        hasCompleteCostData:
          recipeCosts.length > 0 &&
          recipeIds.length > 0 &&
          recipeCosts.length === recipeIds.length &&
          recipeCosts.every((cost) => Boolean(cost.has_all_prices)),
        ingredientCount: recipeCosts.reduce(
          (sum, cost) => sum + Number(cost.ingredient_count ?? 0),
          0
        ),
        lastPriceUpdatedAt: latestIso(recipeCosts.map((cost) => cost.last_price_updated_at)),
      },
      history: {
        avgRating: feedback.avgRating,
        reviewCount: feedback.reviewCount,
        positiveCount: nameHistory.positiveCount,
        negativeCount: nameHistory.negativeCount,
        repeatCount: nameHistory.repeatCount,
        wasRejected: nameHistory.wasRejected,
        recentlyServedOn: nameHistory.recentlyServedOn,
        requestCount: nameHistory.requestCount,
        avoidCount: nameHistory.avoidCount,
      },
    })
  }

  return result
}

function buildGuests(input: {
  eventClientName: string | null
  eventDietary: string[]
  eventAllergies: string[]
  clientDietary: string[]
  clientAllergies: string[]
  eventGuests: Array<{
    id: string
    full_name: string | null
    rsvp_status: string | null
    dietary_restrictions: string[] | null
    allergies: string[] | null
    plus_one_name: string | null
    plus_one_dietary: string[] | null
    plus_one_allergies: string[] | null
  }>
  guestDietaryItems: Array<{
    guest_id: string
    subject: string | null
    item_type: string | null
    label: string | null
    severity: string | null
  }>
}): ChefDecisionGuest[] {
  const guests: ChefDecisionGuest[] = []
  const dietaryItemsByGuest = new Map<
    string,
    Array<{
      subject: string | null
      item_type: string | null
      label: string | null
      severity: string | null
    }>
  >()

  for (const item of input.guestDietaryItems) {
    const existing = dietaryItemsByGuest.get(item.guest_id) ?? []
    existing.push(item)
    dietaryItemsByGuest.set(item.guest_id, existing)
  }

  const primaryConstraints = [
    ...input.eventDietary.map((label) => ({
      label,
      type: 'dietary' as const,
      severity: 'preference' as const,
    })),
    ...input.eventAllergies.map((label) => ({
      label,
      type: 'allergy' as const,
      severity: 'anaphylaxis' as const,
    })),
    ...input.clientDietary.map((label) => ({
      label,
      type: 'dietary' as const,
      severity: 'preference' as const,
    })),
    ...input.clientAllergies.map((label) => ({
      label,
      type: 'allergy' as const,
      severity: 'anaphylaxis' as const,
    })),
  ]

  if (primaryConstraints.length > 0) {
    guests.push({
      id: 'primary-client',
      name: input.eventClientName ?? 'Primary client',
      attending: true,
      constraints: uniqueStrings(
        primaryConstraints.map(
          (constraint) => `${constraint.type}:${constraint.severity}:${constraint.label}`
        )
      ).map((entry) => {
        const [type, severity, ...label] = entry.split(':')
        return {
          type: type as 'dietary' | 'allergy',
          severity: severity as 'preference' | 'intolerance' | 'anaphylaxis',
          label: label.join(':'),
        }
      }),
    })
  }

  for (const guest of input.eventGuests) {
    const attending = normalizeKey(guest.rsvp_status) === 'attending'
    const structured = dietaryItemsByGuest.get(guest.id) ?? []
    const constraints = [
      ...((guest.dietary_restrictions ?? []).map((label) => ({
        label,
        type: 'dietary' as const,
        severity: 'preference' as const,
      })) ?? []),
      ...((guest.allergies ?? []).map((label) => ({
        label,
        type: 'allergy' as const,
        severity: 'anaphylaxis' as const,
      })) ?? []),
      ...structured
        .filter((item) => normalizeKey(item.subject) !== 'plus_one')
        .map((item) => ({
          label: cleanText(item.label) ?? '',
          type:
            normalizeKey(item.item_type) === 'allergy'
              ? ('allergy' as const)
              : ('dietary' as const),
          severity:
            normalizeKey(item.severity) === 'anaphylaxis'
              ? ('anaphylaxis' as const)
              : normalizeKey(item.severity) === 'intolerance'
                ? ('intolerance' as const)
                : ('preference' as const),
        })),
    ]

    guests.push({
      id: guest.id,
      name: cleanText(guest.full_name) ?? 'Guest',
      attending,
      constraints: uniqueStrings(
        constraints.map(
          (constraint) => `${constraint.type}:${constraint.severity}:${constraint.label}`
        )
      ).map((entry) => {
        const [type, severity, ...label] = entry.split(':')
        return {
          type: type as 'dietary' | 'allergy',
          severity: severity as 'preference' | 'intolerance' | 'anaphylaxis',
          label: label.join(':'),
        }
      }),
    })

    const plusOneConstraints = [
      ...((guest.plus_one_dietary ?? []).map((label) => ({
        label,
        type: 'dietary' as const,
        severity: 'preference' as const,
      })) ?? []),
      ...((guest.plus_one_allergies ?? []).map((label) => ({
        label,
        type: 'allergy' as const,
        severity: 'anaphylaxis' as const,
      })) ?? []),
      ...structured
        .filter((item) => normalizeKey(item.subject) === 'plus_one')
        .map((item) => ({
          label: cleanText(item.label) ?? '',
          type:
            normalizeKey(item.item_type) === 'allergy'
              ? ('allergy' as const)
              : ('dietary' as const),
          severity:
            normalizeKey(item.severity) === 'anaphylaxis'
              ? ('anaphylaxis' as const)
              : normalizeKey(item.severity) === 'intolerance'
                ? ('intolerance' as const)
                : ('preference' as const),
        })),
    ]

    if (plusOneConstraints.length > 0 || cleanText(guest.plus_one_name)) {
      guests.push({
        id: `${guest.id}:plus-one`,
        name: cleanText(guest.plus_one_name) ?? `${cleanText(guest.full_name) ?? 'Guest'}'s guest`,
        attending,
        constraints: uniqueStrings(
          plusOneConstraints.map(
            (constraint) => `${constraint.type}:${constraint.severity}:${constraint.label}`
          )
        ).map((entry) => {
          const [type, severity, ...label] = entry.split(':')
          return {
            type: type as 'dietary' | 'allergy',
            severity: severity as 'preference' | 'intolerance' | 'anaphylaxis',
            label: label.join(':'),
          }
        }),
      })
    }
  }

  return guests
}

function buildCourseInputs(input: {
  dishes: RawDishRow[]
  dishMap: Map<string, ChefDecisionDishInput>
  selectionSignals: SelectionCourseSignal[]
}): ChefDecisionContext['courses'] {
  const dishIdsByCourse = new Map<string, string[]>()
  const courseMeta = new Map<string, { courseName: string; courseNumber: number | null }>()

  for (const dish of input.dishes) {
    const courseKey = deriveCourseKey(dish.course_number, dish.course_name)
    const existing = dishIdsByCourse.get(courseKey) ?? []
    existing.push(dish.id)
    dishIdsByCourse.set(courseKey, uniqueStrings(existing))
    if (!courseMeta.has(courseKey)) {
      courseMeta.set(courseKey, {
        courseName: cleanText(dish.course_name) ?? 'Course',
        courseNumber: dish.course_number ?? null,
      })
    }
  }

  const signalMap = new Map(input.selectionSignals.map((course) => [course.courseKey, course]))
  const allCourseKeys = uniqueStrings([
    ...dishIdsByCourse.keys(),
    ...input.selectionSignals.map((course) => course.courseKey),
  ])

  return allCourseKeys
    .map((courseKey) => {
      const fallbackDishIds = dishIdsByCourse.get(courseKey) ?? []
      const signal = signalMap.get(courseKey)
      const optionIds =
        signal && signal.options.length > 0
          ? uniqueStrings([...signal.options.map((option) => option.dishId), signal.lockedDishId])
          : fallbackDishIds

      const options = optionIds
        .map((dishId) => {
          const canonicalDish = input.dishMap.get(dishId)
          if (!canonicalDish) return null
          const signalOption = signal?.options.find((option) => option.dishId === dishId)
          return {
            dish: canonicalDish,
            voteCount: signalOption?.voteCount ?? 0,
            selectedGuestIds: signalOption?.selectedGuestIds ?? [],
            selectedGuestNames: signalOption?.selectedGuestNames ?? [],
            source: signalOption?.source ?? 'menu',
            explicitLock: signalOption?.explicitLock ?? false,
          }
        })
        .filter((option): option is NonNullable<typeof option> => Boolean(option))

      const meta = courseMeta.get(courseKey)
      return {
        courseKey,
        courseNumber:
          signal?.courseNumber ?? meta?.courseNumber ?? options[0]?.dish.courseNumber ?? null,
        courseName:
          signal?.courseName ?? meta?.courseName ?? options[0]?.dish.courseName ?? 'Course',
        pollId: signal?.pollId ?? null,
        totalVotes:
          signal?.totalVotes ?? options.reduce((sum, option) => sum + option.voteCount, 0),
        lockedDishId: signal?.lockedDishId ?? null,
        lockedReason: signal?.lockedReason ?? null,
        options,
      }
    })
    .sort((left, right) => {
      if ((left.courseNumber ?? 999) !== (right.courseNumber ?? 999)) {
        return (left.courseNumber ?? 999) - (right.courseNumber ?? 999)
      }
      return left.courseName.localeCompare(right.courseName)
    })
}

async function buildChefDecisionContextForEvent(
  eventId: string,
  selectionSignals?: ChefDecisionSelectionSignals
): Promise<{
  context: ChefDecisionContext
  evidence: PlanningEvidenceSource[]
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id,
      tenant_id,
      client_id,
      event_date,
      guest_count,
      service_style,
      special_requests,
      menu_id,
      dietary_restrictions,
      allergies,
      client:clients(
        full_name,
        allergies,
        dietary_restrictions,
        kitchen_constraints,
        equipment_available,
        equipment_must_bring
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found')
  }

  const clientData = (event.client ?? null) as {
    full_name: string | null
    allergies: string[] | null
    dietary_restrictions: string[] | null
    kitchen_constraints: string | null
    equipment_available: string[] | null
    equipment_must_bring: string[] | null
  } | null

  const normalizedExternalSignals = normalizeSelectionSignals(selectionSignals)

  const [
    menuPreferencesResponse,
    hubSignals,
    eventGuestsResponse,
    guestDietaryResponse,
    equipmentAssignmentsResponse,
    ownedEquipmentResponse,
    legacyEquipmentResponse,
  ] = await Promise.all([
    db.from('menu_preferences').select('selected_menu_id').eq('event_id', eventId).maybeSingle(),
    loadHubSelectionSignals(db, eventId),
    db
      .from('event_guests')
      .select(
        'id, full_name, rsvp_status, dietary_restrictions, allergies, plus_one_name, plus_one_dietary, plus_one_allergies'
      )
      .eq('event_id', eventId),
    db
      .from('event_guest_dietary_items')
      .select('guest_id, subject, item_type, label, severity')
      .eq('event_id', eventId),
    db
      .from('event_equipment_assignments')
      .select('equipment_item_id, custom_name')
      .eq('chef_id', tenantId)
      .eq('event_id', eventId),
    db
      .from('equipment_items')
      .select('id, name, canonical_name')
      .eq('chef_id', tenantId)
      .eq('status', 'owned'),
    db.from('chef_equipment').select('name').eq('chef_id', tenantId),
  ])

  const menuPreferenceMenuId = cleanText(
    (menuPreferencesResponse.data as { selected_menu_id?: string | null } | null)?.selected_menu_id
  )
  const lockedMenuId =
    cleanText((event.menu_id as string | null) ?? null) ?? menuPreferenceMenuId ?? null
  const menus = await loadMenusForEvent(
    db,
    tenantId,
    eventId,
    uniqueStrings([lockedMenuId, menuPreferenceMenuId])
  )
  const menuIds = uniqueStrings([
    ...menus.map((menu) => menu.id),
    lockedMenuId,
    menuPreferenceMenuId,
  ])

  const mergedSignals = mergeSelectionSignals(hubSignals, normalizedExternalSignals)
  const dishes = await loadDishes(db, tenantId, menuIds, collectSignalDishIds(mergedSignals))
  const lockedMenuSignals = lockedMenuId ? buildLockedMenuSignals(lockedMenuId, dishes) : []
  const finalSignals = mergeSelectionSignals(mergedSignals, lockedMenuSignals)

  const dishGraph = await loadDishGraph(
    db,
    tenantId,
    dishes.map((dish) => dish.id)
  )

  const dishFeedback = summarizeDishFeedback(dishGraph.dishFeedback)

  let clientSignals = {
    loved: [] as string[],
    disliked: [] as string[],
    favoriteDishes: [] as string[],
    cuisinePreferences: [] as string[],
    spicePreference: null as string | null,
    pastEventCount: 0,
  }
  let servedDishHistory: Array<{
    dish_name?: string | null
    client_reaction?: string | null
    served_date?: string | null
  }> = []
  let mealRequests: Array<{
    dish_name?: string | null
    request_type?: string | null
    status?: string | null
  }> = []

  if (event.client_id) {
    const [summary, servedResponse, requestResponse] = await Promise.all([
      getClientCulinaryMenuSummaryForTenant(event.client_id as string, tenantId, db),
      db
        .from('served_dish_history')
        .select('dish_name, client_reaction, served_date')
        .eq('client_id', event.client_id)
        .eq('chef_id', tenantId)
        .order('served_date', { ascending: false }),
      db
        .from('client_meal_requests')
        .select('dish_name, request_type, status')
        .eq('client_id', event.client_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ])

    if (summary) {
      clientSignals = {
        loved: summary.loved,
        disliked: summary.disliked,
        favoriteDishes: summary.favoriteDishes,
        cuisinePreferences: summary.cuisinePreferences,
        spicePreference: summary.spicePreference,
        pastEventCount: summary.pastEventCount,
      }
    }
    servedDishHistory =
      (servedResponse.data as
        | Array<{
            dish_name?: string | null
            client_reaction?: string | null
            served_date?: string | null
          }>
        | null
        | undefined) ?? []
    mealRequests =
      (requestResponse.data as
        | Array<{ dish_name?: string | null; request_type?: string | null; status?: string | null }>
        | null
        | undefined) ?? []
  }

  const historyMap = buildNameHistoryMap({ servedDishHistory, mealRequests })
  const dishMap = buildDishInputs({
    dishes,
    components: dishGraph.components,
    recipes: dishGraph.recipes,
    recipeCosts: dishGraph.recipeCosts,
    recipeIngredients: dishGraph.recipeIngredients,
    dishFeedback,
    historyMap,
  })

  const courseInputs = buildCourseInputs({
    dishes,
    dishMap,
    selectionSignals: finalSignals,
  })

  const eventGuests =
    (eventGuestsResponse.data as
      | Array<{
          id: string
          full_name: string | null
          rsvp_status: string | null
          dietary_restrictions: string[] | null
          allergies: string[] | null
          plus_one_name: string | null
          plus_one_dietary: string[] | null
          plus_one_allergies: string[] | null
        }>
      | null
      | undefined) ?? []
  const guestDietaryItems =
    (guestDietaryResponse.data as
      | Array<{
          guest_id: string
          subject: string | null
          item_type: string | null
          label: string | null
          severity: string | null
        }>
      | null
      | undefined) ?? []

  const guests = buildGuests({
    eventClientName: cleanText(clientData?.full_name) ?? null,
    eventDietary: (event.dietary_restrictions as string[] | null) ?? [],
    eventAllergies: (event.allergies as string[] | null) ?? [],
    clientDietary: clientData?.dietary_restrictions ?? [],
    clientAllergies: clientData?.allergies ?? [],
    eventGuests,
    guestDietaryItems,
  })

  const assignments =
    (equipmentAssignmentsResponse.data as
      | Array<{ equipment_item_id: string | null; custom_name: string | null }>
      | null
      | undefined) ?? []
  const ownedEquipment =
    (ownedEquipmentResponse.data as
      | Array<{ id: string; name: string | null; canonical_name: string | null }>
      | null
      | undefined) ?? []
  const legacyEquipment =
    (legacyEquipmentResponse.data as Array<{ name: string | null }> | null | undefined) ?? []
  const ownedById = new Map(ownedEquipment.map((item) => [item.id, item]))
  const confirmedEquipment = uniqueStrings([
    ...(clientData?.equipment_available ?? []),
    ...assignments.flatMap((assignment) => [
      assignment.custom_name,
      assignment.equipment_item_id
        ? (ownedById.get(assignment.equipment_item_id)?.name ?? null)
        : null,
      assignment.equipment_item_id
        ? (ownedById.get(assignment.equipment_item_id)?.canonical_name ?? null)
        : null,
    ]),
    ...ownedEquipment.flatMap((item) => [item.name, item.canonical_name]),
    ...legacyEquipment.map((item) => item.name),
  ])

  const context: ChefDecisionContext = {
    referenceDate: localDateIso(),
    event: {
      id: event.id as string,
      clientId: (event.client_id as string | null) ?? null,
      clientName: cleanText(clientData?.full_name) ?? null,
      eventDate: (event.event_date as string | null) ?? null,
      guestCount: Math.max(Number(event.guest_count ?? 0), 0),
      serviceStyle: cleanText(event.service_style as string | null) ?? null,
      specialRequests: cleanText(event.special_requests as string | null) ?? null,
      kitchenConstraints: cleanText(clientData?.kitchen_constraints) ?? null,
      equipmentAvailable: clientData?.equipment_available ?? [],
      equipmentMustBring: clientData?.equipment_must_bring ?? [],
      confirmedEquipment,
      allergies: uniqueStrings([
        ...((event.allergies as string[] | null) ?? []),
        ...(clientData?.allergies ?? []),
      ]),
      dietaryRestrictions: uniqueStrings([
        ...((event.dietary_restrictions as string[] | null) ?? []),
        ...(clientData?.dietary_restrictions ?? []),
      ]),
    },
    clientSignals,
    guests,
    courses: courseInputs,
  }

  const effectiveGuestCount = Math.max(
    context.event.guestCount,
    guests.filter((guest) => guest.attending).length,
    1
  )

  const evidence = [
    createPlanningEvidenceSource({
      key: 'selection_signals',
      label: 'Selection signals',
      asOf: new Date().toISOString(),
      recordCount: finalSignals.length,
      coveragePercent:
        courseInputs.length > 0
          ? Math.round(
              (courseInputs.filter((course) => course.totalVotes > 0 || course.lockedDishId)
                .length /
                courseInputs.length) *
                100
            )
          : 100,
      note:
        finalSignals.length > 0
          ? 'Dinner Circle poll outputs and locked selections were normalized into course decisions.'
          : 'No poll outputs were available; the engine will fall back to canonical menu candidates.',
    }),
    createPlanningEvidenceSource({
      key: 'dishes',
      label: 'Canonical dishes',
      asOf: new Date().toISOString(),
      recordCount: dishes.length,
      note: 'Only canonical menu dishes and their linked recipe graphs are loaded.',
    }),
    createPlanningEvidenceSource({
      key: 'guest_constraints',
      label: 'Guest constraints',
      asOf: new Date().toISOString(),
      recordCount: guests.length,
      coveragePercent:
        effectiveGuestCount > 0
          ? Math.min(100, Math.round((guests.length / effectiveGuestCount) * 100))
          : 100,
      note: 'Primary client, RSVP guest, plus-one, and structured dietary items are merged.',
    }),
    createPlanningEvidenceSource({
      key: 'client_history',
      label: 'Client history',
      asOf: new Date().toISOString(),
      recordCount: servedDishHistory.length + mealRequests.length,
      note: 'Served dish reactions and meal requests bias recommendations away from known misses.',
    }),
    createPlanningEvidenceSource({
      key: 'equipment',
      label: 'Equipment coverage',
      asOf: new Date().toISOString(),
      recordCount: confirmedEquipment.length,
      note: 'On-site equipment, assigned event equipment, and chef-owned inventory are merged.',
    }),
  ]

  return { context, evidence }
}

function buildChefDecisionDataQuality(input: {
  result: ChefDecisionEngineResult
  context: ChefDecisionContext
  evidence: PlanningEvidenceSource[]
}): PlanningDataQualitySummary {
  const selectionCoveragePercent =
    input.context.courses.length > 0
      ? Math.round(
          (input.context.courses.filter((course) => course.totalVotes > 0 || course.lockedDishId)
            .length /
            input.context.courses.length) *
            100
        )
      : 100

  return summarizePlanningDataQuality([
    {
      key: 'canonical-course-candidates',
      label: 'Canonical course candidates',
      status: input.context.courses.length > 0 ? 'pass' : 'fail',
      message:
        input.context.courses.length > 0
          ? `${input.context.courses.length} course bucket${input.context.courses.length === 1 ? '' : 's'} were built from canonical dishes.`
          : 'No canonical course candidates were available for this event.',
    },
    {
      key: 'selection-signal-coverage',
      label: 'Selection signal coverage',
      status:
        selectionCoveragePercent >= 100 ? 'pass' : selectionCoveragePercent >= 50 ? 'warn' : 'fail',
      message:
        selectionCoveragePercent >= 100
          ? 'Every course has either a poll outcome or a locked dish.'
          : `${selectionCoveragePercent}% of courses have stable selection signals; the rest use fallback scoring.`,
    },
    {
      key: 'guest-constraint-coverage',
      label: 'Guest constraint coverage',
      status:
        input.context.guests.length > 0 || input.context.event.guestCount <= 1 ? 'pass' : 'warn',
      message:
        input.context.guests.length > 0
          ? `${input.context.guests.length} guest record${input.context.guests.length === 1 ? '' : 's'} contribute dietary truth.`
          : 'Guest-level dietary truth is sparse, so safety scoring depends on event/client-level data only.',
    },
    {
      key: 'ingredient-scaling-coverage',
      label: 'Ingredient scaling coverage',
      status:
        input.result.ingredientPlan.coverage === 'full'
          ? 'pass'
          : input.result.ingredientPlan.coverage === 'partial'
            ? 'warn'
            : 'fail',
      message:
        input.result.ingredientPlan.coverage === 'full'
          ? 'All selected dishes have scaled ingredient coverage.'
          : input.result.ingredientPlan.coverage === 'partial'
            ? 'Some selected dishes are missing recipe or servings data for full ingredient scaling.'
            : 'Ingredient scaling is missing for the selected menu.',
    },
    {
      key: 'equipment-confirmation-source',
      label: 'Equipment confirmation',
      status:
        input.result.prepPlan.uniqueEquipment.length === 0 ||
        input.result.executionReadiness.metrics.unmatchedEquipment.length === 0
          ? 'pass'
          : 'warn',
      message:
        input.result.executionReadiness.metrics.unmatchedEquipment.length === 0
          ? 'Required equipment is covered by the merged equipment sources.'
          : `${input.result.executionReadiness.metrics.unmatchedEquipment.length} required equipment item${input.result.executionReadiness.metrics.unmatchedEquipment.length === 1 ? '' : 's'} still need confirmation.`,
    },
  ])
}

function buildChefDecisionSummaryPayload(
  result: ChefDecisionArtifact | ChefDecisionBuildResult['result']
) {
  return {
    readinessState: result.executionReadiness.state,
    totalCourses: result.finalMenu.courses.length,
    resolvedCourses: result.finalMenu.courses.filter((course) => course.selectedDishId).length,
    blockerCount: result.executionReadiness.blockers.length,
    warningCount: result.executionReadiness.warnings.length,
    ingredientCoverage: result.ingredientPlan.coverage,
    totalPrepMinutes: result.prepPlan.totalPrepMinutes,
    totalRiskFlags: result.riskFlags.length,
  }
}

function buildStoredPayload(input: ChefDecisionBuildResult): StoredChefDecisionPayload {
  return {
    ...input.result,
    evidence: input.evidence,
  }
}

function isStoredChefDecisionPayload(
  payload: Record<string, unknown> | null | undefined
): payload is StoredChefDecisionPayload {
  return (
    isObjectRecord(payload) &&
    typeof payload.generatedAt === 'string' &&
    isObjectRecord(payload.summary) &&
    isObjectRecord(payload.finalMenu) &&
    isObjectRecord(payload.ingredientPlan) &&
    isObjectRecord(payload.prepPlan) &&
    isObjectRecord(payload.executionReadiness) &&
    Array.isArray(payload.riskFlags) &&
    Array.isArray(payload.trace) &&
    Array.isArray(payload.evidence)
  )
}

function materializeChefDecisionResponse(
  artifactEnvelope: PlanningArtifactEnvelope,
  payload: StoredChefDecisionPayload
): ChefDecisionArtifact {
  return {
    ...payload,
    planningRun: {
      runId: artifactEnvelope.run.id,
      runSource: artifactEnvelope.run.runSource,
      scopeKey: artifactEnvelope.run.scopeKey,
      artifactVersion: artifactEnvelope.artifact.artifactVersion,
      generatorVersion: artifactEnvelope.run.generatorVersion,
      generatedAt: artifactEnvelope.run.completedAt ?? artifactEnvelope.artifact.createdAt,
      asOfDate: artifactEnvelope.run.asOfDate,
      servedFromCache: true,
    },
    dataQuality: artifactEnvelope.artifact.dataQuality,
    provenance: artifactEnvelope.artifact.provenance,
  }
}

async function buildChefDecisionForEvent(
  eventId: string,
  selectionSignals?: ChefDecisionSelectionSignals
): Promise<ChefDecisionBuildResult> {
  const { context, evidence } = await buildChefDecisionContextForEvent(eventId, selectionSignals)
  const generatedAt = new Date().toISOString()
  const result = buildChefDecisionEngine({
    ...context,
    generatedAt,
  })

  const dataQuality = buildChefDecisionDataQuality({
    result,
    context,
    evidence,
  })
  const provenance = createDerivedOutputProvenance({
    asOf: generatedAt,
    derivationMethod: 'deterministic',
    derivationSource: 'lib/chef-decision-engine/actions.ts',
    generatedAt,
    inputs: [
      { kind: 'event', id: context.event.id, label: 'event', asOf: generatedAt },
      { kind: 'menu', label: 'canonical dishes', asOf: generatedAt },
      { kind: 'document', label: 'selection signals', asOf: generatedAt },
      { kind: 'report', label: 'client history', asOf: generatedAt },
    ],
    moduleId: 'culinary.chef-decision-engine',
  })

  return {
    result,
    evidence,
    dataQuality,
    provenance,
    summaryPayload: buildChefDecisionSummaryPayload(result),
  }
}

export async function getChefDecisionForEvent(
  eventId: string,
  options?: {
    runSource?: PlanningRunSource
    forceFresh?: boolean
    maxAgeMinutes?: number
    selectionSignals?: ChefDecisionSelectionSignals
  }
): Promise<ChefDecisionArtifact> {
  const user = await requireChef()
  const runSource = options?.runSource ?? 'interactive'
  const selectionFingerprint = hashSelectionSignals(options?.selectionSignals)
  const shouldAllowCache = !options?.selectionSignals && !options?.forceFresh

  if (shouldAllowCache) {
    const cached = await getLatestCompletedPlanningArtifact({
      tenantId: user.tenantId!,
      runType: CHEF_DECISION_RUN_TYPE,
      scopeKey: eventId,
      artifactKey: CHEF_DECISION_ARTIFACT_KEY,
      horizonMonths: 1,
      maxAgeMinutes:
        typeof options?.maxAgeMinutes === 'number'
          ? options.maxAgeMinutes
          : CHEF_DECISION_CACHE_MINUTES,
    })

    if (cached && isStoredChefDecisionPayload(cached.artifact.payload)) {
      return materializeChefDecisionResponse(cached, cached.artifact.payload)
    }
  }

  const run = await createPlanningRun({
    tenantId: user.tenantId!,
    runType: CHEF_DECISION_RUN_TYPE,
    runSource,
    scopeKey: eventId,
    asOfDate: localDateIso(),
    horizonMonths: 1,
    generatorVersion: CHEF_DECISION_GENERATOR_VERSION,
    requestPayload: {
      eventId,
      forceFresh: Boolean(options?.forceFresh),
      selectionFingerprint,
    },
  })

  try {
    const buildResult = await buildChefDecisionForEvent(eventId, options?.selectionSignals)
    const payload = buildStoredPayload(buildResult)
    const completed = await completePlanningRun({
      runId: run.id,
      summaryPayload: buildResult.summaryPayload,
      artifact: {
        tenantId: user.tenantId!,
        artifactKey: CHEF_DECISION_ARTIFACT_KEY,
        artifactVersion: CHEF_DECISION_ARTIFACT_VERSION,
        payload,
        provenance: buildResult.provenance,
        dataQuality: buildResult.dataQuality,
      },
    })

    return {
      ...payload,
      planningRun: {
        runId: completed.run.id,
        runSource: completed.run.runSource,
        scopeKey: completed.run.scopeKey,
        artifactVersion: completed.artifact.artifactVersion,
        generatorVersion: completed.run.generatorVersion,
        generatedAt: completed.run.completedAt ?? completed.artifact.createdAt,
        asOfDate: completed.run.asOfDate,
        servedFromCache: false,
      },
      dataQuality: completed.artifact.dataQuality,
      provenance: completed.artifact.provenance,
    }
  } catch (error) {
    await failPlanningRun({
      runId: run.id,
      errorPayload: {
        message: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

export const __testOnly = {
  buildLockedMenuSignals,
  isStoredChefDecisionPayload,
  mergeSelectionSignals,
  normalizeSelectionSignals,
}
