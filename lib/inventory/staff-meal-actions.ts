// Staff Meal Server Actions
// Chef-only: Log staff meals, track per-item costs, view cost summaries

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type StaffMeal = {
  id: string
  chefId: string
  eventId: string | null
  mealDate: string
  staffCount: number
  description: string | null
  recipeId: string | null
  totalCostCents: number | null
  photoUrl: string | null
  notes: string | null
  createdAt: string
  items?: StaffMealItem[]
}

export type StaffMealItem = {
  id: string
  ingredientId: string | null
  ingredientName: string
  quantity: number
  unit: string
  costCents: number | null
}

export type StaffMealCostSummary = {
  totalCostCents: number
  mealCount: number
  averagePerMealCents: number
  totalStaffServed: number
  averagePerPersonCents: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const StaffMealItemSchema = z.object({
  ingredientId: z.string().uuid().optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
})

const LogStaffMealSchema = z.object({
  mealDate: z.string().min(1, 'Meal date is required'),
  staffCount: z.number().int().positive('Staff count must be at least 1'),
  description: z.string().optional(),
  recipeId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  items: z.array(StaffMealItemSchema).min(1, 'At least one item is required'),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

export type LogStaffMealInput = z.infer<typeof LogStaffMealSchema>

const StaffMealFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventId: z.string().uuid().optional(),
})

export type StaffMealFilters = z.infer<typeof StaffMealFilterSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Log a staff meal with line items.
 * For each item with an ingredientId, looks up last_price_cents to compute cost.
 * Creates negative inventory_transactions (type: 'staff_meal') per item.
 * Sums total_cost_cents and updates the staff_meal record.
 */
export async function logStaffMeal(input: LogStaffMealInput): Promise<StaffMeal> {
  const user = await requireChef()
  const parsed = LogStaffMealSchema.parse(input)
  const db: any = createServerClient()

  // Insert the staff meal header
  const { data: meal, error: mealError } = await db
    .from('staff_meals' as any)
    .insert({
      chef_id: user.tenantId!,
      event_id: parsed.eventId ?? null,
      meal_date: parsed.mealDate,
      staff_count: parsed.staffCount,
      description: parsed.description ?? null,
      recipe_id: parsed.recipeId ?? null,
      total_cost_cents: 0, // will update after computing item costs
      photo_url: parsed.photoUrl ?? null,
      notes: parsed.notes ?? null,
    })
    .select()
    .single()

  if (mealError || !meal) throw new Error(`Failed to create staff meal: ${mealError?.message}`)

  const mealData = meal as any

  // Look up ingredient prices for items that have an ingredientId
  const ingredientIds = parsed.items
    .map((item) => item.ingredientId)
    .filter((id): id is string => !!id)

  let priceMap = new Map<string, number>()

  if (ingredientIds.length > 0) {
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, last_price_cents')
      .in('id', ingredientIds)

    if (ingredients) {
      for (const ing of ingredients as any[]) {
        if (ing.last_price_cents != null) {
          priceMap.set(ing.id, Number(ing.last_price_cents))
        }
      }
    }
  }

  // Insert items and compute costs
  let totalCostCents = 0
  const insertedItems: StaffMealItem[] = []

  for (const item of parsed.items) {
    const lastPriceCents = item.ingredientId ? (priceMap.get(item.ingredientId) ?? null) : null
    const costCents = lastPriceCents != null ? Math.round(item.quantity * lastPriceCents) : null

    if (costCents != null) {
      totalCostCents += costCents
    }

    const { data: itemRow, error: itemError } = await db
      .from('staff_meal_items' as any)
      .insert({
        staff_meal_id: mealData.id,
        ingredient_id: item.ingredientId ?? null,
        ingredient_name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        cost_cents: costCents,
      })
      .select()
      .single()

    if (itemError) throw new Error(`Failed to create staff meal item: ${itemError.message}`)

    const itemData = itemRow as any
    insertedItems.push({
      id: itemData.id,
      ingredientId: itemData.ingredient_id ?? null,
      ingredientName: itemData.ingredient_name,
      quantity: parseFloat(itemData.quantity) || 0,
      unit: itemData.unit,
      costCents: itemData.cost_cents != null ? Number(itemData.cost_cents) : null,
    })

    // Create a negative inventory transaction (non-blocking side effect)
    try {
      await db.from('inventory_transactions' as any).insert({
        chef_id: user.tenantId!,
        ingredient_id: item.ingredientId ?? null,
        ingredient_name: item.ingredientName,
        transaction_type: 'staff_meal',
        quantity: -item.quantity,
        unit: item.unit,
        cost_cents: costCents ?? 0,
        event_id: parsed.eventId ?? null,
        notes: `Staff meal: ${parsed.description || 'unlabeled'} (${parsed.staffCount} staff)`,
        created_by: user.id,
        confidence_status: 'confirmed',
        confidence_score: 1,
        source_quantity: item.quantity,
        source_unit: item.unit,
        canonical_quantity: item.quantity,
        canonical_unit: item.unit,
        conversion_status: 'not_required',
        review_status: 'approved',
      })
    } catch (err) {
      console.error('[non-blocking] Failed to log inventory transaction for staff meal item', err)
    }
  }

  // Update total cost on the staff meal record
  if (totalCostCents > 0) {
    const { error: updateError } = await db
      .from('staff_meals' as any)
      .update({ total_cost_cents: totalCostCents })
      .eq('id', mealData.id)
      .eq('chef_id', user.tenantId!)

    if (updateError) {
      console.error('[non-blocking] Failed to update staff meal total cost', updateError)
    }
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/staff-meals')
  if (parsed.eventId) {
    revalidatePath(`/events/${parsed.eventId}`)
  }

  return {
    id: mealData.id,
    chefId: mealData.chef_id,
    eventId: mealData.event_id ?? null,
    mealDate: mealData.meal_date,
    staffCount: mealData.staff_count,
    description: mealData.description ?? null,
    recipeId: mealData.recipe_id ?? null,
    totalCostCents,
    photoUrl: mealData.photo_url ?? null,
    notes: mealData.notes ?? null,
    createdAt: mealData.created_at,
    items: insertedItems,
  }
}

/**
 * Get staff meals with optional date range and event filters.
 * Each meal includes its line items.
 */
export async function getStaffMeals(filters?: StaffMealFilters): Promise<StaffMeal[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('staff_meals' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('meal_date', { ascending: false })
    .limit(200)

  if (filters?.startDate) query = query.gte('meal_date', filters.startDate)
  if (filters?.endDate) query = query.lte('meal_date', filters.endDate)
  if (filters?.eventId) query = query.eq('event_id', filters.eventId)

  const { data: meals, error } = await query

  if (error) throw new Error(`Failed to fetch staff meals: ${error.message}`)

  if (!meals || (meals as any[]).length === 0) return []

  // Fetch all items for these meals in one query
  const mealIds = (meals as any[]).map((m: any) => m.id)

  const { data: allItems, error: itemsError } = await db
    .from('staff_meal_items' as any)
    .select('*')
    .in('staff_meal_id', mealIds)

  if (itemsError) throw new Error(`Failed to fetch staff meal items: ${itemsError.message}`)

  // Group items by meal id
  const itemsByMeal = new Map<string, any[]>()
  for (const item of (allItems as any[]) || []) {
    const list = itemsByMeal.get(item.staff_meal_id) || []
    list.push(item)
    itemsByMeal.set(item.staff_meal_id, list)
  }

  return (meals as any[]).map((meal: any) => ({
    id: meal.id,
    chefId: meal.chef_id,
    eventId: meal.event_id ?? null,
    mealDate: meal.meal_date,
    staffCount: meal.staff_count,
    description: meal.description ?? null,
    recipeId: meal.recipe_id ?? null,
    totalCostCents: meal.total_cost_cents != null ? Number(meal.total_cost_cents) : null,
    photoUrl: meal.photo_url ?? null,
    notes: meal.notes ?? null,
    createdAt: meal.created_at,
    items: (itemsByMeal.get(meal.id) || []).map((item: any) => ({
      id: item.id,
      ingredientId: item.ingredient_id ?? null,
      ingredientName: item.ingredient_name,
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit,
      costCents: item.cost_cents != null ? Number(item.cost_cents) : null,
    })),
  }))
}

/**
 * Get aggregated staff meal cost summary for a date range.
 * Returns total cost, meal count, average per meal, total staff served, average per person.
 */
export async function getStaffMealCostSummary(
  startDate: string,
  endDate: string
): Promise<StaffMealCostSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: meals, error } = await db
    .from('staff_meals' as any)
    .select('total_cost_cents, staff_count')
    .eq('chef_id', user.tenantId!)
    .gte('meal_date', startDate)
    .lte('meal_date', endDate)

  if (error) throw new Error(`Failed to fetch staff meal cost summary: ${error.message}`)

  const rows = (meals as any[]) || []
  const mealCount = rows.length
  const totalCostCents = rows.reduce(
    (sum: number, r: any) => sum + (Number(r.total_cost_cents) || 0),
    0
  )
  const totalStaffServed = rows.reduce(
    (sum: number, r: any) => sum + (Number(r.staff_count) || 0),
    0
  )

  return {
    totalCostCents,
    mealCount,
    averagePerMealCents: mealCount > 0 ? Math.round(totalCostCents / mealCount) : 0,
    totalStaffServed,
    averagePerPersonCents: totalStaffServed > 0 ? Math.round(totalCostCents / totalStaffServed) : 0,
  }
}
