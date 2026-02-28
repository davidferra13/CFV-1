'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import type {
  ChefGoal,
  CreateGoalInput,
  GoalsDashboard,
  GoalSnapshot,
  GoalView,
  RevenueGoalEnrichment,
  PricingScenario,
  ClientSuggestion,
  GoalCategory,
  CategorySettings,
  NudgeLevel,
} from './types'
import { GOAL_TYPE_TO_CATEGORY, GOAL_CATEGORY_META, GOAL_TYPE_META } from './types'
import type { RevenueGoalSnapshot } from '@/lib/revenue-goals/types'
import { computeGoalProgress, buildPricingScenarios, isRevenueGoal, isManualGoal } from './engine'
import { buildClientSuggestions } from './client-suggestions'
import {
  fetchBookingCount,
  fetchNewClientCount,
  fetchRecipeCount,
  fetchTrailingProfitMarginBp,
  fetchTrailingExpenseRatioBp,
  fetchRepeatBookingRateBp,
  fetchTotalReviews,
  fetchReviewAverageBp,
  fetchWorkshopsAttended,
} from './signal-fetchers'
import { getRevenueGoalSnapshotForTenantAdmin } from '@/lib/revenue-goals/actions'
import { computeDinnersNeeded } from '@/lib/revenue-goals/engine'
import { getManualGoalCurrentValue, getManualGoalRecentCheckIns } from './check-in-actions'

// ── Validation ────────────────────────────────────────────────────────────────

const GOAL_TYPES = [
  'revenue_monthly',
  'revenue_annual',
  'revenue_custom',
  'profit_margin',
  'expense_ratio',
  'booking_count',
  'new_clients',
  'repeat_booking_rate',
  'referrals_received',
  'dishes_created',
  'cuisines_explored',
  'workshops_attended',
  'recipe_library',
  'review_average',
  'total_reviews',
  'staff_training_hours',
  'vendor_relationships',
  'books_read',
  'courses_completed',
  'weekly_workouts',
  'rest_days_taken',
  'family_dinners',
  'vacation_days',
  'charity_events',
  'meals_donated',
] as const

const CreateGoalSchema = z
  .object({
    goalType: z.enum(GOAL_TYPES),
    label: z.string().trim().min(1, 'Label is required').max(100, 'Label too long'),
    targetValue: z.number().int('Must be a whole number').min(0, 'Target must be positive'),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    nudgeEnabled: z.boolean().default(true),
    nudgeLevel: z.enum(['gentle', 'standard', 'aggressive']).default('standard'),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((d) => d.periodStart <= d.periodEnd, {
    message: 'Period start must be before or equal to period end',
  })

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getTrackingMethod(goalType: string): 'auto' | 'manual_count' {
  const meta = GOAL_TYPE_META.find((m) => m.type === goalType)
  return meta?.trackingMethod ?? 'auto'
}

function mapGoalRow(row: Record<string, unknown>): ChefGoal {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    goalType: row.goal_type as ChefGoal['goalType'],
    label: row.label as string,
    status: row.status as ChefGoal['status'],
    targetValue: row.target_value as number,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    nudgeEnabled: row.nudge_enabled as boolean,
    nudgeLevel: row.nudge_level as ChefGoal['nudgeLevel'],
    trackingMethod:
      (row.tracking_method as ChefGoal['trackingMethod']) ??
      getTrackingMethod(row.goal_type as string),
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createGoal(input: CreateGoalInput): Promise<{ goalId: string }> {
  const user = await requireChef()
  const parsed = CreateGoalSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(', '))
  }

  const trackingMethod = getTrackingMethod(parsed.data.goalType)

  const supabase: any = createServerClient() as any
  const { data, error } = await supabase
    .from('chef_goals')
    .insert({
      tenant_id: user.tenantId,
      goal_type: parsed.data.goalType,
      label: parsed.data.label,
      target_value: parsed.data.targetValue,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      nudge_enabled: parsed.data.nudgeEnabled,
      nudge_level: parsed.data.nudgeLevel,
      notes: parsed.data.notes ?? null,
      tracking_method: trackingMethod,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create goal')
  }

  revalidatePath('/goals')
  return { goalId: data.id as string }
}

export async function updateGoal(goalId: string, input: Partial<CreateGoalInput>): Promise<void> {
  const user = await requireChef()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.label !== undefined) updates.label = input.label.trim()
  if (input.targetValue !== undefined) updates.target_value = input.targetValue
  if (input.periodStart !== undefined) updates.period_start = input.periodStart
  if (input.periodEnd !== undefined) updates.period_end = input.periodEnd
  if (input.nudgeEnabled !== undefined) updates.nudge_enabled = input.nudgeEnabled
  if (input.nudgeLevel !== undefined) updates.nudge_level = input.nudgeLevel
  if (input.notes !== undefined) updates.notes = input.notes

  const supabase: any = createServerClient() as any
  const { error } = await supabase
    .from('chef_goals')
    .update(updates)
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/goals')
}

export async function archiveGoal(goalId: string): Promise<void> {
  const user = await requireChef()

  const supabase: any = createServerClient() as any
  const { error } = await supabase
    .from('chef_goals')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/goals')
}

export async function getActiveGoals(): Promise<ChefGoal[]> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any

  const { data, error } = await supabase
    .from('chef_goals')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data || []) as Record<string, unknown>[]).map(mapGoalRow)
}

// Fetch a single goal by ID regardless of status (used by history page).
export async function getGoalById(goalId: string): Promise<ChefGoal | null> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any

  const { data } = await supabase
    .from('chef_goals')
    .select('*')
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!data) return null
  return mapGoalRow(data as Record<string, unknown>)
}

// ── Category settings ─────────────────────────────────────────────────────────

export async function getCategorySettings(): Promise<CategorySettings> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any

  const { data } = await supabase
    .from('chef_preferences')
    .select('enabled_goal_categories, category_nudge_levels')
    .eq('chef_id', user.tenantId)
    .single()

  const defaults = GOAL_CATEGORY_META.filter((c) => c.defaultEnabled).map(
    (c) => c.id
  ) as GoalCategory[]

  if (!data) {
    return { enabledCategories: defaults, nudgeLevels: {} }
  }

  const row = data as {
    enabled_goal_categories: string[] | null
    category_nudge_levels: Record<string, string> | null
  }
  const enabled = (row.enabled_goal_categories ?? defaults) as GoalCategory[]
  const nudgeLevels = (row.category_nudge_levels ?? {}) as Partial<Record<GoalCategory, NudgeLevel>>

  return { enabledCategories: enabled, nudgeLevels }
}

export async function updateCategorySettings(
  enabledCategories: GoalCategory[],
  nudgeLevels: Partial<Record<GoalCategory, NudgeLevel>>
): Promise<void> {
  const user = await requireChef()

  // Always include the always-enabled categories
  const alwaysOn = GOAL_CATEGORY_META.filter((c) => c.alwaysEnabled).map((c) => c.id)
  const merged = Array.from(new Set([...alwaysOn, ...enabledCategories])) as GoalCategory[]

  const supabase: any = createServerClient() as any
  const { error } = await supabase.from('chef_preferences').upsert(
    {
      chef_id: user.tenantId,
      enabled_goal_categories: merged,
      category_nudge_levels: nudgeLevels,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/goals')
}

// ── Category progress (pure, no I/O) ─────────────────────────────────────────
// Returns average progress % per category across active goals.
// This is a plain function (not a server action) — no 'use server' needed.

function computeCategoryProgress(goals: GoalView[]): Partial<Record<GoalCategory, number>> {
  const categoryGroups: Partial<Record<GoalCategory, number[]>> = {}

  for (const { goal, progress } of goals) {
    const category = GOAL_TYPE_TO_CATEGORY[goal.goalType]
    if (!category) continue
    if (!categoryGroups[category]) categoryGroups[category] = []
    categoryGroups[category]!.push(Math.min(100, progress.progressPercent))
  }

  const result: Partial<Record<GoalCategory, number>> = {}
  for (const [cat, percents] of Object.entries(categoryGroups)) {
    const avg = percents!.reduce((sum, p) => sum + p, 0) / percents!.length
    result[cat as GoalCategory] = Math.round(avg)
  }
  return result
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getGoalsDashboard(): Promise<GoalsDashboard> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any
  const tenantId = user.tenantId!
  const now = new Date()

  const [{ data: goalRows, error }, categorySettings] = await Promise.all([
    supabase
      .from('chef_goals')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    getCategorySettings(),
  ])

  if (error) throw new Error(error.message)
  const goals = ((goalRows || []) as Record<string, unknown>[]).map(mapGoalRow)

  const hasRevenueGoal = goals.some((g) => isRevenueGoal(g.goalType))
  const revenueSnapshot: RevenueGoalSnapshot | null = hasRevenueGoal
    ? await getRevenueGoalSnapshotForTenantAdmin(
        tenantId,
        now,
        supabase as unknown as SupabaseClient
      )
    : null

  const activeGoals = await Promise.all(
    goals.map((goal) => computeGoalView(supabase, tenantId, goal, now, revenueSnapshot))
  )

  const categoryProgress = computeCategoryProgress(activeGoals)

  return {
    activeGoals,
    categoryProgress,
    enabledCategories: categorySettings.enabledCategories,
    computedAt: now.toISOString(),
  }
}

async function computeGoalView(
  supabase: SupabaseClient,
  tenantId: string,
  goal: ChefGoal,
  now: Date,
  revenueSnapshot: RevenueGoalSnapshot | null
): Promise<GoalView> {
  if (isRevenueGoal(goal.goalType)) {
    return computeRevenueGoalView(supabase, tenantId, goal, now, revenueSnapshot)
  }
  if (isManualGoal(goal.trackingMethod)) {
    return computeManualGoalView(supabase, tenantId, goal)
  }
  return computeAutoGoalView(supabase, tenantId, goal, now)
}

async function computeRevenueGoalView(
  supabase: SupabaseClient,
  tenantId: string,
  goal: ChefGoal,
  now: Date,
  precomputedSnapshot: RevenueGoalSnapshot | null
): Promise<GoalView> {
  const snapshot =
    precomputedSnapshot ?? (await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, supabase))

  let realizedCents = snapshot.monthly.realizedCents
  let projectedCents = snapshot.monthly.projectedCents

  if (goal.goalType === 'revenue_annual') {
    realizedCents = snapshot.annual?.realizedCents ?? 0
    projectedCents = snapshot.annual?.projectedCents ?? 0
  }

  const progress = computeGoalProgress({
    goalId: goal.id,
    goalType: goal.goalType,
    label: goal.label,
    targetValue: goal.targetValue,
    currentValue: projectedCents,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
  })

  const gapCents = progress.gapValue
  const avgBookingValueCents = snapshot.avgBookingValueCents
  const eventsNeeded = computeDinnersNeeded(gapCents, avgBookingValueCents)

  const enrichment: RevenueGoalEnrichment = {
    realizedCents,
    projectedCents,
    pipelineWeightedCents: projectedCents - realizedCents,
    avgBookingValueCents,
    eventsNeeded,
    openDatesThisMonth: snapshot.openDatesThisMonth,
  }

  const pricingScenarios: PricingScenario[] = buildPricingScenarios(gapCents, avgBookingValueCents)
  const clientSuggestions: ClientSuggestion[] = await buildClientSuggestions(
    supabase,
    tenantId,
    gapCents,
    goal.id
  )

  return { goal, progress, enrichment, pricingScenarios, clientSuggestions, recentCheckIns: [] }
}

async function computeManualGoalView(
  supabase: SupabaseClient,
  tenantId: string,
  goal: ChefGoal
): Promise<GoalView> {
  const [currentValue, recentCheckIns] = await Promise.all([
    getManualGoalCurrentValue(
      supabase as unknown as { from: (t: string) => unknown },
      tenantId,
      goal
    ),
    getManualGoalRecentCheckIns(
      supabase as unknown as { from: (t: string) => unknown },
      tenantId,
      goal.id,
      3
    ),
  ])

  const progress = computeGoalProgress({
    goalId: goal.id,
    goalType: goal.goalType,
    label: goal.label,
    targetValue: goal.targetValue,
    currentValue,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
  })

  return {
    goal,
    progress,
    enrichment: null,
    pricingScenarios: [],
    clientSuggestions: [],
    recentCheckIns,
  }
}

async function computeAutoGoalView(
  supabase: SupabaseClient,
  tenantId: string,
  goal: ChefGoal,
  _now: Date
): Promise<GoalView> {
  let currentValue = 0

  switch (goal.goalType) {
    case 'booking_count':
      currentValue = await fetchBookingCount(supabase, tenantId, goal.periodStart, goal.periodEnd)
      break
    case 'new_clients':
      currentValue = await fetchNewClientCount(supabase, tenantId, goal.periodStart, goal.periodEnd)
      break
    case 'recipe_library':
      currentValue = await fetchRecipeCount(supabase, tenantId)
      break
    case 'profit_margin':
      currentValue = await fetchTrailingProfitMarginBp(supabase, tenantId, 90)
      break
    case 'expense_ratio':
      currentValue = await fetchTrailingExpenseRatioBp(supabase, tenantId, 90)
      break
    case 'repeat_booking_rate':
      currentValue = await fetchRepeatBookingRateBp(supabase, tenantId)
      break
    case 'total_reviews':
      currentValue = await fetchTotalReviews(supabase, tenantId)
      break
    case 'review_average':
      currentValue = await fetchReviewAverageBp(supabase, tenantId)
      break
    case 'workshops_attended':
      currentValue = await fetchWorkshopsAttended(
        supabase,
        tenantId,
        goal.periodStart,
        goal.periodEnd
      )
      break
    default:
      currentValue = 0
  }

  const progress = computeGoalProgress({
    goalId: goal.id,
    goalType: goal.goalType,
    label: goal.label,
    targetValue: goal.targetValue,
    currentValue,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
  })

  return {
    goal,
    progress,
    enrichment: null,
    pricingScenarios: [],
    clientSuggestions: [],
    recentCheckIns: [],
  }
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getGoalHistory(goalId: string, limit = 12): Promise<GoalSnapshot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any

  const { data: goal } = await supabase
    .from('chef_goals')
    .select('id')
    .eq('id', goalId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!goal) throw new Error('Goal not found')

  const { data, error } = await supabase
    .from('goal_snapshots')
    .select('*')
    .eq('goal_id', goalId)
    .eq('tenant_id', user.tenantId)
    .order('snapshot_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    goalId: row.goal_id as string,
    snapshotDate: row.snapshot_date as string,
    snapshotMonth: row.snapshot_month as string,
    currentValue: row.current_value as number,
    targetValue: row.target_value as number,
    gapValue: row.gap_value as number,
    progressPercent: row.progress_percent as number,
    realizedCents: (row.realized_cents as number | null) ?? null,
    projectedCents: (row.projected_cents as number | null) ?? null,
    avgBookingValueCents: (row.avg_booking_value_cents as number | null) ?? null,
    eventsNeeded: (row.events_needed as number | null) ?? null,
    pricingScenarios: (row.pricing_scenarios as PricingScenario[]) ?? [],
    clientSuggestionsJson: (row.client_suggestions_json as ClientSuggestion[]) ?? [],
    computedAt: row.computed_at as string,
  }))
}

// ── Snapshot writing (called from cron with admin supabase client) ─────────────

export async function writeGoalSnapshot(
  supabase: SupabaseClient,
  tenantId: string,
  goalId: string,
  goalView: GoalView,
  snapshotDate: Date
): Promise<void> {
  const dateStr = isoDate(snapshotDate)
  const monthStr = dateStr.slice(0, 7)
  const { progress, enrichment, pricingScenarios, clientSuggestions } = goalView

  await supabase.from('goal_snapshots').upsert(
    {
      tenant_id: tenantId,
      goal_id: goalId,
      snapshot_date: dateStr,
      snapshot_month: monthStr,
      current_value: progress.currentValue,
      target_value: progress.targetValue,
      gap_value: progress.gapValue,
      progress_percent: progress.progressPercent,
      realized_cents: enrichment?.realizedCents ?? null,
      projected_cents: enrichment?.projectedCents ?? null,
      avg_booking_value_cents: enrichment?.avgBookingValueCents ?? null,
      events_needed: enrichment?.eventsNeeded ?? null,
      pricing_scenarios: pricingScenarios,
      client_suggestions_json: clientSuggestions.map((s) => ({
        clientId: s.clientId,
        clientName: s.clientName,
        daysDormant: s.daysDormant,
        avgSpendCents: s.avgSpendCents,
        reason: s.reason,
      })),
    },
    { onConflict: 'goal_id,snapshot_date', ignoreDuplicates: true }
  )
}

// ── Client suggestion status ──────────────────────────────────────────────────

export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'contacted' | 'booked' | 'declined' | 'dismissed',
  bookedEventId?: string
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient() as any

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'contacted') updates.contacted_at = new Date().toISOString()
  if (status === 'booked' && bookedEventId) updates.booked_event_id = bookedEventId

  const { error } = await supabase
    .from('goal_client_suggestions')
    .update(updates)
    .eq('id', suggestionId)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/goals')
}
