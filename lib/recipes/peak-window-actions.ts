// Recipe Peak Window Server Actions
// Quality peaks, safety ceilings, reverse prep timelines.
// Enforces tenant scoping. All mutations require chef auth.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  PeakWindow,
  PrepTimelineStep,
  ReverseTimeline,
  SetPeakWindowInput,
} from './peak-window-types'

// ============================================
// VALIDATION
// ============================================

const PeakWindowSchema = z.object({
  recipe_id: z.string().uuid('Invalid recipe ID'),
  peak_temp_f: z.number().int().min(32).max(500),
  max_hold_minutes: z.number().int().min(1).max(480),
  quality_decay_rate: z.number().min(0).max(1),
  safety_ceiling_minutes: z.number().int().min(1).max(1440),
  prep_steps: z
    .array(
      z.object({
        step_name: z.string().min(1),
        minutes_before_service: z.number().int().min(0),
        duration_minutes: z.number().int().min(1),
      })
    )
    .optional(),
})

// ============================================
// 1. SET PEAK WINDOW (upsert)
// ============================================

export async function setPeakWindow(
  input: SetPeakWindowInput
): Promise<{ success: true; data: PeakWindow } | { success: false; error: string }> {
  const user = await requireChef()
  const parsed = PeakWindowSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify recipe belongs to tenant
  const { data: recipe, error: recipeErr } = await db
    .from('recipes')
    .select('id')
    .eq('id', parsed.data.recipe_id)
    .eq('tenant_id', tenantId)
    .single()

  if (recipeErr || !recipe) {
    return { success: false, error: 'Recipe not found or access denied' }
  }

  const row = {
    recipe_id: parsed.data.recipe_id,
    peak_temp_f: parsed.data.peak_temp_f,
    max_hold_minutes: parsed.data.max_hold_minutes,
    quality_decay_rate: parsed.data.quality_decay_rate,
    safety_ceiling_minutes: parsed.data.safety_ceiling_minutes,
    prep_steps: parsed.data.prep_steps ? JSON.stringify(parsed.data.prep_steps) : null,
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  }

  // Upsert: one peak window per recipe
  const { data: existing } = await db
    .from('recipe_peak_windows')
    .select('id')
    .eq('recipe_id', parsed.data.recipe_id)
    .eq('tenant_id', tenantId)
    .single()

  let result
  if (existing) {
    const { data, error } = await db
      .from('recipe_peak_windows')
      .update(row)
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    result = { data, error }
  } else {
    const { data, error } = await db.from('recipe_peak_windows').insert(row).select().single()
    result = { data, error }
  }

  if (result.error) {
    console.error('[setPeakWindow] Error:', result.error)
    return { success: false, error: 'Failed to save peak window' }
  }

  revalidatePath('/recipes')
  return { success: true, data: result.data as PeakWindow }
}

// ============================================
// 2. GET PEAK WINDOW (single recipe)
// ============================================

export async function getPeakWindow(
  recipeId: string
): Promise<{ success: true; data: PeakWindow | null } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recipe_peak_windows')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows, which is fine
    console.error('[getPeakWindow] Error:', error)
    return { success: false, error: 'Failed to fetch peak window' }
  }

  return { success: true, data: (data as PeakWindow) ?? null }
}

// ============================================
// 3. GET ALL PEAK WINDOWS (tenant)
// ============================================

export async function getPeakWindows(): Promise<
  { success: true; data: PeakWindow[] } | { success: false; error: string }
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('recipe_peak_windows')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPeakWindows] Error:', error)
    return { success: false, error: 'Failed to fetch peak windows' }
  }

  return { success: true, data: (data as PeakWindow[]) ?? [] }
}

// ============================================
// 4. GENERATE REVERSE TIMELINE
// ============================================

/**
 * Given a service time and a recipe with a peak window (and optional prep steps),
 * works backwards to produce a reverse prep timeline.
 *
 * If no prep_steps are stored, falls back to the recipe's prep_time_minutes
 * and cook_time_minutes as two coarse steps.
 */
export async function generateReverseTimeline(
  recipeId: string,
  serviceTimeIso: string
): Promise<{ success: true; data: ReverseTimeline } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch peak window (includes prep_steps if stored)
  const { data: pw, error: pwErr } = await db
    .from('recipe_peak_windows')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (pwErr || !pw) {
    return { success: false, error: 'No peak window defined for this recipe' }
  }

  // Fetch recipe for fallback times
  const { data: recipe, error: recipeErr } = await db
    .from('recipes')
    .select('id, name, prep_time_minutes, cook_time_minutes')
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (recipeErr || !recipe) {
    return { success: false, error: 'Recipe not found' }
  }

  const serviceTime = new Date(serviceTimeIso)
  if (isNaN(serviceTime.getTime())) {
    return { success: false, error: 'Invalid service time' }
  }

  // Build steps: prefer stored prep_steps, fall back to recipe time fields
  let steps: PrepTimelineStep[]

  const storedSteps = pw.prep_steps
    ? typeof pw.prep_steps === 'string'
      ? JSON.parse(pw.prep_steps)
      : pw.prep_steps
    : null

  if (Array.isArray(storedSteps) && storedSteps.length > 0) {
    // Use stored steps, sorted by minutes_before_service descending
    steps = (storedSteps as PrepTimelineStep[]).sort(
      (a, b) => b.minutes_before_service - a.minutes_before_service
    )
  } else {
    // Fallback: build coarse timeline from recipe fields
    steps = []
    const prepMin = recipe.prep_time_minutes ?? 30
    const cookMin = recipe.cook_time_minutes ?? 30
    const totalMin = prepMin + cookMin

    steps.push({
      step_name: 'Mise en place',
      minutes_before_service: totalMin,
      duration_minutes: prepMin,
    })
    steps.push({
      step_name: 'Cook',
      minutes_before_service: cookMin,
      duration_minutes: cookMin,
    })
  }

  // Earliest offset = the step that starts furthest from service
  const earliestOffset =
    steps.length > 0
      ? Math.max(...steps.map((s) => s.minutes_before_service + s.duration_minutes))
      : 0

  const prepStart = new Date(serviceTime.getTime() - earliestOffset * 60_000)

  const timeline: ReverseTimeline = {
    recipe_id: recipeId,
    service_time: serviceTimeIso,
    steps,
    prep_start_time: prepStart.toISOString(),
    total_prep_minutes: earliestOffset,
  }

  return { success: true, data: timeline }
}

// ============================================
// 5. GET SAFETY CEILING
// ============================================

/**
 * Returns the maximum safe hold time at a given temperature for a recipe.
 * Uses the stored safety_ceiling_minutes as the baseline, then adjusts
 * if the actual holding temp differs from peak_temp_f.
 *
 * Conservative model: if holding temp is in the danger zone (40-140F),
 * the ceiling drops to a hard 120 minutes per food safety guidelines.
 * If holding above 140F, uses the stored ceiling.
 * If holding below 40F (refrigerated), ceiling is extended 4x.
 */
export async function getSafetyCeiling(
  recipeId: string,
  holdingTempF: number
): Promise<
  | { success: true; data: { safe_hold_minutes: number; warning: string | null } }
  | { success: false; error: string }
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: pw, error } = await db
    .from('recipe_peak_windows')
    .select('safety_ceiling_minutes, peak_temp_f')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !pw) {
    return { success: false, error: 'No peak window defined for this recipe' }
  }

  const baseCeiling = pw.safety_ceiling_minutes as number
  let safeMinutes: number
  let warning: string | null = null

  if (holdingTempF >= 40 && holdingTempF <= 140) {
    // Danger zone: hard cap per food safety
    safeMinutes = Math.min(baseCeiling, 120)
    warning = 'Holding temperature is in the danger zone (40-140F). Maximum 2 hours.'
  } else if (holdingTempF > 140) {
    // Hot holding: use stored ceiling
    safeMinutes = baseCeiling
  } else {
    // Cold holding (below 40F): extended window
    safeMinutes = baseCeiling * 4
    warning = 'Cold holding extends safe window, but quality may degrade.'
  }

  return { success: true, data: { safe_hold_minutes: safeMinutes, warning } }
}
