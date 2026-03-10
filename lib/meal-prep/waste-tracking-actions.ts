'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Validation Schemas
// ============================================

const logBatchSchema = z.object({
  batch_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recipe_id: z.string().uuid().nullable().optional(),
  dish_name: z.string().min(1, 'Dish name is required'),
  planned_portions: z.number().int().min(0),
  actual_portions: z.number().int().min(0),
  waste_portions: z.number().int().min(0).default(0),
  waste_reason: z
    .enum(['overcooked', 'underseasoned', 'contamination', 'excess', 'other'])
    .nullable()
    .optional(),
  ingredient_waste_notes: z.string().nullable().optional(),
  cost_per_portion_cents: z.number().int().nullable().optional(),
  total_ingredient_cost_cents: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type LogBatchInput = z.infer<typeof logBatchSchema>

// ============================================
// Types
// ============================================

export interface BatchLogEntry {
  id: string
  chef_id: string
  batch_date: string
  recipe_id: string | null
  dish_name: string
  planned_portions: number
  actual_portions: number
  waste_portions: number
  waste_reason: string | null
  ingredient_waste_notes: string | null
  cost_per_portion_cents: number | null
  total_ingredient_cost_cents: number | null
  notes: string | null
  created_at: string
}

export interface WasteSummary {
  total_planned: number
  total_actual: number
  total_wasted: number
  waste_percentage: number
  yield_percentage: number
  cost_of_waste_cents: number
  total_cost_cents: number
  top_waste_reasons: { reason: string; count: number }[]
  batch_count: number
}

export interface RecipeYieldEntry {
  batch_date: string
  planned_portions: number
  actual_portions: number
  yield_percentage: number
}

// ============================================
// Actions
// ============================================

export async function logBatchResult(input: LogBatchInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = logBatchSchema.parse(input)

  const { data, error } = await supabase
    .from('meal_prep_batch_log')
    .insert({
      chef_id: user.entityId,
      batch_date: parsed.batch_date,
      recipe_id: parsed.recipe_id ?? null,
      dish_name: parsed.dish_name,
      planned_portions: parsed.planned_portions,
      actual_portions: parsed.actual_portions,
      waste_portions: parsed.waste_portions,
      waste_reason: parsed.waste_reason ?? null,
      ingredient_waste_notes: parsed.ingredient_waste_notes ?? null,
      cost_per_portion_cents: parsed.cost_per_portion_cents ?? null,
      total_ingredient_cost_cents: parsed.total_ingredient_cost_cents ?? null,
      notes: parsed.notes ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/meal-prep/waste')
  return { id: data.id }
}

export async function getBatchHistory(
  startDate?: string,
  endDate?: string
): Promise<BatchLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('meal_prep_batch_log')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('batch_date', { ascending: false })
    .limit(200)

  if (startDate) query = query.gte('batch_date', startDate)
  if (endDate) query = query.lte('batch_date', endDate)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getWasteSummary(startDate: string, endDate: string): Promise<WasteSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: rows, error } = await supabase
    .from('meal_prep_batch_log')
    .select(
      'planned_portions, actual_portions, waste_portions, waste_reason, cost_per_portion_cents, total_ingredient_cost_cents'
    )
    .eq('chef_id', user.entityId)
    .gte('batch_date', startDate)
    .lte('batch_date', endDate)

  if (error) throw new Error(error.message)

  const batches = rows ?? []
  let totalPlanned = 0
  let totalActual = 0
  let totalWasted = 0
  let totalCostCents = 0
  let costOfWasteCents = 0
  const reasonCounts: Record<string, number> = {}

  for (const b of batches) {
    totalPlanned += b.planned_portions
    totalActual += b.actual_portions
    totalWasted += b.waste_portions
    totalCostCents += b.total_ingredient_cost_cents ?? 0

    if (b.waste_portions > 0 && b.cost_per_portion_cents) {
      costOfWasteCents += b.waste_portions * b.cost_per_portion_cents
    }

    if (b.waste_reason) {
      reasonCounts[b.waste_reason] = (reasonCounts[b.waste_reason] || 0) + 1
    }
  }

  const wastePercentage =
    totalPlanned > 0 ? Math.round((totalWasted / totalPlanned) * 1000) / 10 : 0
  const yieldPercentage =
    totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 1000) / 10 : 0

  const topWasteReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total_planned: totalPlanned,
    total_actual: totalActual,
    total_wasted: totalWasted,
    waste_percentage: wastePercentage,
    yield_percentage: yieldPercentage,
    cost_of_waste_cents: costOfWasteCents,
    total_cost_cents: totalCostCents,
    top_waste_reasons: topWasteReasons,
    batch_count: batches.length,
  }
}

export async function getRecipeYieldHistory(recipeId: string): Promise<RecipeYieldEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_batch_log')
    .select('batch_date, planned_portions, actual_portions')
    .eq('chef_id', user.entityId)
    .eq('recipe_id', recipeId)
    .order('batch_date', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => ({
    batch_date: row.batch_date,
    planned_portions: row.planned_portions,
    actual_portions: row.actual_portions,
    yield_percentage:
      row.planned_portions > 0
        ? Math.round((row.actual_portions / row.planned_portions) * 1000) / 10
        : 0,
  }))
}
