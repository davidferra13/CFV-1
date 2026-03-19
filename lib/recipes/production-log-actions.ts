// Recipe Production Log - Server Actions
// Tracks every time a recipe is produced: who, when, how much, shelf life.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const LogProductionSchema = z.object({
  recipe_id: z.string().uuid(),
  produced_at: z.string().optional(), // ISO date string, defaults to now
  produced_by: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1).default('servings'),
  best_before: z.string().optional(), // ISO date string
  discard_at: z.string().optional(), // ISO date string
  batch_notes: z.string().optional(),
  outcome_rating: z.number().min(1).max(5).optional(), // 1-5 star rating for batch quality
  substitutions: z.string().optional(), // Ingredient swaps made during this batch
  event_id: z.string().uuid().optional(),
})

export type LogProductionInput = z.infer<typeof LogProductionSchema>

// ============================================
// 1. LOG PRODUCTION
// ============================================

export async function logProduction(input: LogProductionInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const validated = LogProductionSchema.parse(input)

  // Verify the recipe belongs to this chef
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .select('id, times_cooked, last_cooked_at')
    .eq('id', validated.recipe_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (recipeErr || !recipe) {
    throw new Error('Recipe not found')
  }

  // Insert the production log entry
  const { data: entry, error } = await (
    supabase.from('recipe_production_log' as any).insert({
      tenant_id: user.tenantId!,
      recipe_id: validated.recipe_id,
      produced_at: validated.produced_at || new Date().toISOString(),
      produced_by: validated.produced_by || null,
      quantity: validated.quantity,
      unit: validated.unit,
      best_before: validated.best_before || null,
      discard_at: validated.discard_at || null,
      batch_notes: validated.batch_notes || null,
      outcome_rating: validated.outcome_rating || null,
      substitutions: validated.substitutions || null,
      event_id: validated.event_id || null,
    }) as any
  )
    .select()
    .single()

  if (error) {
    console.error('[logProduction] Error:', error)
    throw new Error('Failed to log production')
  }

  // Update recipe stats: increment times_cooked, only update last_cooked_at if newer
  const producedAt = validated.produced_at || new Date().toISOString()
  const existingLastCooked = (recipe as any).last_cooked_at
  const shouldUpdateLastCooked =
    !existingLastCooked || new Date(producedAt) > new Date(existingLastCooked)

  await supabase
    .from('recipes')
    .update({
      times_cooked: (recipe.times_cooked || 0) + 1,
      ...(shouldUpdateLastCooked ? { last_cooked_at: producedAt } : {}),
      updated_by: user.id,
    } as any)
    .eq('id', validated.recipe_id)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/recipes/${validated.recipe_id}`)
  revalidatePath('/recipes/production-log')
  return { success: true, entry }
}

// ============================================
// 2. GET PRODUCTION LOG
// ============================================

export type ProductionLogEntry = {
  id: string
  recipe_id: string
  produced_at: string
  produced_by: string | null
  quantity: number
  unit: string
  best_before: string | null
  discard_at: string | null
  batch_notes: string | null
  outcome_rating: number | null
  substitutions: string | null
  event_id: string | null
  created_at: string
}

export async function getProductionLog(recipeId: string): Promise<ProductionLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('recipe_production_log' as any)
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .order('produced_at', { ascending: false }) as any)

  if (error) {
    console.error('[getProductionLog] Error:', error)
    return []
  }

  return (data || []) as ProductionLogEntry[]
}

// ============================================
// 3. DELETE PRODUCTION ENTRY
// ============================================

export async function deleteProductionEntry(entryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the entry first to know which recipe to update
  const { data: entry, error: fetchErr } = await (supabase
    .from('recipe_production_log' as any)
    .select('id, recipe_id')
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (fetchErr || !entry) {
    throw new Error('Production log entry not found')
  }

  const { error } = await (supabase
    .from('recipe_production_log' as any)
    .delete()
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) {
    console.error('[deleteProductionEntry] Error:', error)
    throw new Error('Failed to delete production entry')
  }

  // Decrement times_cooked (don't go below 0)
  const { data: recipe } = await supabase
    .from('recipes')
    .select('times_cooked')
    .eq('id', (entry as any).recipe_id)
    .single()

  if (recipe) {
    await supabase
      .from('recipes')
      .update({
        times_cooked: Math.max(0, (recipe.times_cooked || 1) - 1),
        updated_by: user.id,
      } as any)
      .eq('id', (entry as any).recipe_id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/recipes/${(entry as any).recipe_id}`)
  revalidatePath('/recipes/production-log')
  return { success: true }
}

// ============================================
// 4. GET ALL PRODUCTION LOGS (global view)
// ============================================

export type GlobalProductionLogEntry = ProductionLogEntry & {
  recipe_name: string
  recipe_category: string
}

export async function getAllProductionLogs(): Promise<GlobalProductionLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all production entries with recipe name
  const { data: entries, error } = await (supabase
    .from('recipe_production_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('produced_at', { ascending: false })
    .limit(200) as any)

  if (error) {
    console.error('[getAllProductionLogs] Error:', error)
    return []
  }

  if (!entries || entries.length === 0) return []

  // Get recipe names for all entries
  const recipeIds = [...new Set((entries as any[]).map((e) => e.recipe_id))]
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, category')
    .in('id', recipeIds)

  const recipeMap = new Map<string, any>((recipes || []).map((r: any) => [r.id, r]))

  return (entries as any[]).map((entry) => {
    const recipe = recipeMap.get(entry.recipe_id)
    return {
      ...entry,
      recipe_name: recipe?.name || 'Unknown Recipe',
      recipe_category: recipe?.category || 'other',
    }
  }) as GlobalProductionLogEntry[]
}
