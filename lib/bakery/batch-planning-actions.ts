'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type BatchStatus =
  | 'planned'
  | 'in_progress'
  | 'proofing'
  | 'baking'
  | 'cooling'
  | 'finished'
  | 'cancelled'

const STATUS_ORDER: BatchStatus[] = [
  'planned',
  'in_progress',
  'proofing',
  'baking',
  'cooling',
  'finished',
]

export type BakeryBatch = {
  id: string
  tenant_id: string
  recipe_id: string | null
  product_name: string
  planned_date: string
  planned_quantity: number
  scale_factor: number
  status: BatchStatus
  actual_yield: number | null
  start_time: string | null
  end_time: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ScaledIngredient = {
  ingredient_id: string
  ingredient_name: string
  base_quantity: number
  scaled_quantity: number
  unit: string
}

export type ScaleResult = {
  scale_factor: number
  ingredients: ScaledIngredient[]
}

export type IngredientRequirement = {
  ingredient_id: string
  ingredient_name: string
  total_needed: number
  unit: string
  current_stock: number | null
  shortfall: number | null
}

// ---- Actions ----

export async function createBatch(input: {
  recipe_id?: string
  product_name: string
  planned_date: string
  planned_quantity: number
  scale_factor?: number
  assigned_to?: string
  notes?: string
}): Promise<BakeryBatch> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_batches')
    .insert({
      tenant_id: user.entityId!,
      recipe_id: input.recipe_id ?? null,
      product_name: input.product_name,
      planned_date: input.planned_date,
      planned_quantity: input.planned_quantity,
      scale_factor: input.scale_factor ?? 1.0,
      assigned_to: input.assigned_to ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create batch: ${error.message}`)
  revalidatePath('/bakery/batches')
  return data as unknown as BakeryBatch
}

export async function updateBatch(
  id: string,
  input: {
    recipe_id?: string | null
    product_name?: string
    planned_date?: string
    planned_quantity?: number
    scale_factor?: number
    assigned_to?: string | null
    notes?: string | null
  }
): Promise<BakeryBatch> {
  const user = await requireChef()
  const supabase = createServerClient()

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.recipe_id !== undefined) update.recipe_id = input.recipe_id
  if (input.product_name !== undefined) update.product_name = input.product_name
  if (input.planned_date !== undefined) update.planned_date = input.planned_date
  if (input.planned_quantity !== undefined) update.planned_quantity = input.planned_quantity
  if (input.scale_factor !== undefined) update.scale_factor = input.scale_factor
  if (input.assigned_to !== undefined) update.assigned_to = input.assigned_to
  if (input.notes !== undefined) update.notes = input.notes

  const { data, error } = await supabase
    .from('bakery_batches')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update batch: ${error.message}`)
  revalidatePath('/bakery/batches')
  return data as unknown as BakeryBatch
}

export async function deleteBatch(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bakery_batches')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.entityId!)

  if (error) throw new Error(`Failed to delete batch: ${error.message}`)
  revalidatePath('/bakery/batches')
}

export async function getBatchesForDate(date: string): Promise<BakeryBatch[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_batches')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .eq('planned_date', date)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch batches: ${error.message}`)
  return (data ?? []) as unknown as BakeryBatch[]
}

export async function getBatchesForWeek(weekStart: string): Promise<BakeryBatch[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Calculate week end (7 days from start)
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const weekEnd = end.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bakery_batches')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .gte('planned_date', weekStart)
    .lte('planned_date', weekEnd)
    .order('planned_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch weekly batches: ${error.message}`)
  return (data ?? []) as unknown as BakeryBatch[]
}

export async function advanceBatchStatus(id: string): Promise<BakeryBatch> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current status
  const { data: current, error: fetchError } = await supabase
    .from('bakery_batches')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .single()

  if (fetchError || !current) throw new Error('Batch not found')

  const currentStatus = current.status as BatchStatus
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  if (currentIndex === -1 || currentStatus === 'cancelled') {
    throw new Error('Cannot advance a cancelled batch')
  }
  if (currentIndex >= STATUS_ORDER.length - 1) {
    throw new Error('Batch is already finished')
  }

  const nextStatus = STATUS_ORDER[currentIndex + 1]
  const update: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  }

  // Set start_time when moving from planned to in_progress
  if (currentStatus === 'planned' && nextStatus === 'in_progress') {
    update.start_time = new Date().toISOString()
  }
  // Set end_time when finishing
  if (nextStatus === 'finished') {
    update.end_time = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('bakery_batches')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to advance batch: ${error.message}`)
  revalidatePath('/bakery/batches')
  return data as unknown as BakeryBatch
}

export async function recordYield(id: string, actualYield: number): Promise<BakeryBatch> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_batches')
    .update({
      actual_yield: actualYield,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to record yield: ${error.message}`)
  revalidatePath('/bakery/batches')
  return data as unknown as BakeryBatch
}

export async function calculateScaleFactor(
  recipeId: string,
  targetQuantity: number
): Promise<ScaleResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get recipe yield
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('yield_quantity, yield_unit')
    .eq('id', recipeId)
    .eq('tenant_id', user.entityId!)
    .single()

  if (recipeError || !recipe) throw new Error('Recipe not found')

  const baseYield = Number(recipe.yield_quantity) || 1
  const scaleFactor = targetQuantity / baseYield

  // Get recipe ingredients and scale them
  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select(
      `
      ingredient_id,
      quantity,
      unit,
      ingredients!inner(name)
    `
    )
    .eq('recipe_id', recipeId)
    .order('sort_order', { ascending: true })

  if (ingError) throw new Error(`Failed to fetch ingredients: ${ingError.message}`)

  const scaledIngredients: ScaledIngredient[] = (ingredients ?? []).map(
    (ri: Record<string, unknown>) => {
      const ing = ri.ingredients as Record<string, unknown> | null
      return {
        ingredient_id: ri.ingredient_id as string,
        ingredient_name: (ing?.name as string) ?? 'Unknown',
        base_quantity: Number(ri.quantity),
        scaled_quantity: Math.round(Number(ri.quantity) * scaleFactor * 1000) / 1000,
        unit: ri.unit as string,
      }
    }
  )

  return {
    scale_factor: Math.round(scaleFactor * 10000) / 10000,
    ingredients: scaledIngredients,
  }
}

export async function getIngredientRequirements(date: string): Promise<IngredientRequirement[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all batches for date that have recipes
  const { data: batches, error: batchError } = await supabase
    .from('bakery_batches')
    .select('id, recipe_id, scale_factor')
    .eq('tenant_id', user.entityId!)
    .eq('planned_date', date)
    .not('recipe_id', 'is', null)
    .neq('status', 'cancelled')

  if (batchError) throw new Error(`Failed to fetch batches: ${batchError.message}`)
  if (!batches || batches.length === 0) return []

  // For each batch, get scaled ingredient requirements
  const requirementMap = new Map<
    string,
    {
      ingredient_id: string
      ingredient_name: string
      total_needed: number
      unit: string
    }
  >()

  for (const batch of batches) {
    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select(
        `
        ingredient_id,
        quantity,
        unit,
        ingredients!inner(name)
      `
      )
      .eq('recipe_id', batch.recipe_id!)

    if (ingError) continue

    for (const ri of ingredients ?? []) {
      const ing = (ri as Record<string, unknown>).ingredients as Record<string, unknown> | null
      const ingredientId = ri.ingredient_id as string
      const scaledQty = Number(ri.quantity) * Number(batch.scale_factor)
      const existing = requirementMap.get(ingredientId)

      if (existing) {
        existing.total_needed += scaledQty
      } else {
        requirementMap.set(ingredientId, {
          ingredient_id: ingredientId,
          ingredient_name: (ing?.name as string) ?? 'Unknown',
          total_needed: scaledQty,
          unit: ri.unit as string,
        })
      }
    }
  }

  // Compare against inventory_counts
  const ingredientIds = Array.from(requirementMap.keys())
  const { data: inventory } = await supabase
    .from('inventory_counts')
    .select('ingredient_id, current_qty, unit')
    .eq('chef_id', user.entityId!)
    .in('ingredient_id', ingredientIds)

  const inventoryMap = new Map<string, number>()
  for (const inv of inventory ?? []) {
    inventoryMap.set(inv.ingredient_id as string, Number(inv.current_qty))
  }

  const results: IngredientRequirement[] = []
  for (const [, req] of requirementMap) {
    const stock = inventoryMap.get(req.ingredient_id) ?? null
    const shortfall = stock !== null ? Math.max(0, req.total_needed - stock) : null
    results.push({
      ingredient_id: req.ingredient_id,
      ingredient_name: req.ingredient_name,
      total_needed: Math.round(req.total_needed * 1000) / 1000,
      unit: req.unit,
      current_stock: stock,
      shortfall: shortfall !== null ? Math.round(shortfall * 1000) / 1000 : null,
    })
  }

  return results.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
}
