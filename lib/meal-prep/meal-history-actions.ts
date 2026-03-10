'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { subWeeks, format } from 'date-fns'

// ============================================
// Types
// ============================================

export interface MealHistoryEntry {
  id: string
  chef_id: string
  client_id: string
  dish_name: string
  recipe_id: string | null
  served_date: string
  client_reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | null
  notes: string | null
  source: 'meal_prep' | 'manual'
}

export interface DishRepeatInfo {
  dish_name: string
  last_served: string
  times_served: number
  weeks_since: number
}

export interface DishFrequencyItem {
  dish_name: string
  times_served: number
  last_served: string
  avg_reaction: string | null
}

// ============================================
// Actions
// ============================================

/**
 * Record meals served to a client for a given week.
 * Called when a meal prep week is marked as delivered.
 * Uses the served_dish_history table (already exists).
 */
export async function recordMealsServed(
  programId: string,
  weekDate: string,
  meals: { dishName: string; recipeId?: string }[]
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the program to find client_id
  const { data: program, error: progErr } = await supabase
    .from('meal_prep_programs')
    .select('client_id')
    .eq('id', programId)
    .eq('tenant_id', user.entityId)
    .single()

  if (progErr || !program) {
    throw new Error('Meal prep program not found')
  }

  if (meals.length === 0) return { count: 0 }

  const inserts = meals.map((m) => ({
    chef_id: user.entityId,
    client_id: program.client_id,
    dish_name: m.dishName,
    recipe_id: m.recipeId ?? null,
    served_date: weekDate,
    notes: `Auto-recorded from meal prep program`,
  }))

  const { error } = await supabase.from('served_dish_history').insert(inserts)

  if (error) throw new Error(error.message)

  revalidatePath(`/clients/${program.client_id}`)
  revalidatePath('/meal-prep')

  return { count: meals.length }
}

/**
 * Get all meals served to a client, with dates and feedback.
 */
export async function getClientMealHistory(
  clientId: string,
  limit = 100
): Promise<MealHistoryEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('served_dish_history')
    .select('id, chef_id, client_id, dish_name, recipe_id, served_date, client_reaction, notes')
    .eq('chef_id', user.entityId)
    .eq('client_id', clientId)
    .order('served_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => ({
    ...row,
    source: row.notes?.includes('meal prep') ? 'meal_prep' : 'manual',
  }))
}

/**
 * Check if any of the given dishes were served to this client recently.
 * Returns info about recent repeats so the chef can avoid serving the same thing.
 */
export async function getDishRepeatCheck(
  clientId: string,
  dishNames: string[],
  weeksBack = 4
): Promise<DishRepeatInfo[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (dishNames.length === 0) return []

  const since = format(subWeeks(new Date(), weeksBack), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('served_dish_history')
    .select('dish_name, served_date')
    .eq('chef_id', user.entityId)
    .eq('client_id', clientId)
    .gte('served_date', since)
    .order('served_date', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = data ?? []

  // Normalize dish names for comparison (case-insensitive)
  const checkSet = new Set(dishNames.map((n) => n.toLowerCase().trim()))
  const matchMap = new Map<string, { dates: string[] }>()

  for (const row of rows) {
    const normalizedName = row.dish_name.toLowerCase().trim()
    if (checkSet.has(normalizedName)) {
      const existing = matchMap.get(normalizedName) || { dates: [] }
      existing.dates.push(row.served_date)
      matchMap.set(normalizedName, existing)
    }
  }

  const now = new Date()
  const results: DishRepeatInfo[] = []

  for (const [name, info] of matchMap) {
    const lastServedDate = new Date(info.dates[0])
    const weeksSince = Math.floor(
      (now.getTime() - lastServedDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    results.push({
      dish_name: name,
      last_served: info.dates[0],
      times_served: info.dates.length,
      weeks_since: weeksSince,
    })
  }

  return results
}

/**
 * Get dish frequency report: which dishes were served most/least often.
 */
export async function getMealFrequencyReport(clientId: string): Promise<DishFrequencyItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('served_dish_history')
    .select('dish_name, served_date, client_reaction')
    .eq('chef_id', user.entityId)
    .eq('client_id', clientId)
    .order('served_date', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const dishMap = new Map<string, { count: number; lastServed: string; reactions: string[] }>()

  for (const row of rows) {
    const name = row.dish_name
    const existing = dishMap.get(name) || { count: 0, lastServed: row.served_date, reactions: [] }
    existing.count++
    if (row.client_reaction) existing.reactions.push(row.client_reaction)
    if (!existing.lastServed || row.served_date > existing.lastServed) {
      existing.lastServed = row.served_date
    }
    dishMap.set(name, existing)
  }

  const results: DishFrequencyItem[] = []
  for (const [name, info] of dishMap) {
    // Compute average reaction as the most common one
    let avgReaction: string | null = null
    if (info.reactions.length > 0) {
      const counts: Record<string, number> = {}
      for (const r of info.reactions) {
        counts[r] = (counts[r] || 0) + 1
      }
      avgReaction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    }

    results.push({
      dish_name: name,
      times_served: info.count,
      last_served: info.lastServed,
      avg_reaction: avgReaction,
    })
  }

  // Sort by frequency descending
  results.sort((a, b) => b.times_served - a.times_served)

  return results
}

/**
 * Auto-record meals from a meal prep week when it's marked as delivered.
 * Reads dishes from custom_dishes or menu.
 */
export async function recordMealsFromMealPrepWeek(
  programId: string,
  rotationWeek: number,
  deliveredDate: string
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the week data
  const { data: week, error: weekErr } = await supabase
    .from('meal_prep_weeks')
    .select('id, menu_id, custom_dishes')
    .eq('program_id', programId)
    .eq('rotation_week', rotationWeek)
    .eq('tenant_id', user.entityId)
    .single()

  if (weekErr || !week) return { count: 0 }

  const meals: { dishName: string; recipeId?: string }[] = []

  // Get dishes from custom_dishes JSONB
  if (Array.isArray(week.custom_dishes) && week.custom_dishes.length > 0) {
    for (const cd of week.custom_dishes) {
      if (cd.name) {
        meals.push({ dishName: cd.name, recipeId: cd.recipe_id })
      }
    }
  }

  // Get dishes from menu if set
  if (week.menu_id) {
    const { data: dishRows } = await supabase
      .from('dishes')
      .select('name, recipe_id')
      .eq('menu_id', week.menu_id)

    for (const d of dishRows ?? []) {
      if (d.name) {
        meals.push({ dishName: d.name, recipeId: d.recipe_id ?? undefined })
      }
    }
  }

  if (meals.length === 0) return { count: 0 }

  return recordMealsServed(programId, deliveredDate, meals)
}
