'use server'

import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import {
  computePrepTimeline,
  type TimelineRecipeInput,
  type PrepTimeline,
} from './compute-timeline'

// --- Update peak window on a recipe ---

export async function updateRecipePeakWindow(input: {
  recipeId: string
  peakHoursMin: number | null
  peakHoursMax: number | null
  safetyHoursMax: number | null
  storageMethod: string | null
  freezable: boolean
  frozenExtendsHours: number | null
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (
    input.peakHoursMin != null &&
    input.peakHoursMax != null &&
    input.peakHoursMin > input.peakHoursMax
  ) {
    return { success: false, error: 'Earliest prep time must be greater than latest prep time.' }
  }

  if (input.peakHoursMin != null && input.peakHoursMin < 0) {
    return { success: false, error: 'Peak hours cannot be negative.' }
  }

  try {
    const db: any = createServerClient()
    await db
      .from('recipes')
      .update({
        peak_hours_min: input.peakHoursMin,
        peak_hours_max: input.peakHoursMax,
        safety_hours_max: input.safetyHoursMax,
        storage_method: input.storageMethod ?? 'fridge',
        freezable: input.freezable,
        frozen_extends_hours: input.frozenExtendsHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.recipeId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${input.recipeId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[updateRecipePeakWindow]', err)
    return { success: false, error: 'Failed to save peak window.' }
  }
}

// --- Bulk update peak windows ---

export async function bulkSetPeakWindows(
  updates: { recipeId: string; peakHoursMin: number; peakHoursMax: number }[]
): Promise<{ success: boolean; updated: number; error?: string }> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()
    let updated = 0
    for (const u of updates) {
      if (u.peakHoursMin > u.peakHoursMax) continue
      await db
        .from('recipes')
        .update({
          peak_hours_min: u.peakHoursMin,
          peak_hours_max: u.peakHoursMax,
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.recipeId)
        .eq('tenant_id', user.tenantId!)
      updated++
    }
    revalidatePath('/recipes')
    return { success: true, updated }
  } catch (err: any) {
    console.error('[bulkSetPeakWindows]', err)
    return { success: false, updated: 0, error: 'Failed to update peak windows.' }
  }
}

// --- Get prep timeline for an event ---

export async function getEventPrepTimeline(eventId: string): Promise<{
  timeline: PrepTimeline | null
  error?: string
}> {
  const user = await requireChef()

  try {
    const db: any = createServerClient()

    // Get event with service date
    const { data: event } = await db
      .from('events')
      .select('id, event_date, event_time, serve_time, status')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!event) return { timeline: null, error: 'Event not found.' }

    // Build service datetime
    const eventDate = new Date(event.event_date)
    const timeStr = event.serve_time || event.event_time
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number)
      eventDate.setHours(h, m, 0, 0)
    } else {
      eventDate.setHours(18, 0, 0, 0) // default 6pm
    }

    // Get menus for this event
    const { data: menus } = await db
      .from('menus')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)

    if (!menus || menus.length === 0) {
      return { timeline: null }
    }

    const menuIds = menus.map((m: any) => m.id)

    // Get all dishes for these menus
    const { data: dishes } = await db
      .from('dishes')
      .select('id, course_name, course_number, sort_order, menu_id')
      .in('menu_id', menuIds)
      .order('course_number', { ascending: true })

    if (!dishes || dishes.length === 0) {
      return { timeline: null }
    }

    const dishIds = dishes.map((d: any) => d.id)

    // Get all components for these dishes
    const { data: components } = await db
      .from('components')
      .select(
        'id, name, dish_id, recipe_id, is_make_ahead, make_ahead_window_hours, sort_order'
      )
      .in('dish_id', dishIds)
      .order('sort_order', { ascending: true })

    if (!components || components.length === 0) {
      return { timeline: null }
    }

    // Get linked recipes
    const recipeIds = [
      ...new Set(
        components.filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)
      ),
    ]

    let recipes: any[] = []
    if (recipeIds.length > 0) {
      const { data: recipeData } = await db
        .from('recipes')
        .select(
          'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, prep_time_minutes, dietary_tags'
        )
        .in('id', recipeIds)
      recipes = recipeData ?? []
    }

    const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))
    const dishMap = new Map(dishes.map((d: any) => [d.id, d]))

    // Get allergen flags for recipes
    const allergenMap: Record<string, string[]> = {}
    if (recipeIds.length > 0) {
      const { data: riData } = await db
        .from('recipe_ingredients')
        .select('recipe_id, ingredient_id')
        .in('recipe_id', recipeIds)

      if (riData && riData.length > 0) {
        const ingredientIds = [
          ...new Set(riData.map((ri: any) => ri.ingredient_id)),
        ]
        const { data: ingredients } = await db
          .from('ingredients')
          .select('id, allergen_flags')
          .in('id', ingredientIds)

        if (ingredients) {
          const ingMap = new Map(
            ingredients.map((i: any) => [i.id, i.allergen_flags ?? []])
          )
          for (const ri of riData) {
            const flags = ingMap.get(ri.ingredient_id) ?? []
            if (flags.length > 0) {
              const existing = allergenMap[ri.recipe_id] ?? []
              allergenMap[ri.recipe_id] = [...new Set([...existing, ...flags])]
            }
          }
        }
      }
    }

    // Build timeline items
    const timelineItems: TimelineRecipeInput[] = components.map((comp: any) => {
      const recipe = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
      const dish = dishMap.get(comp.dish_id)

      return {
        recipeId: recipe?.id ?? comp.id,
        recipeName: recipe?.name ?? comp.name,
        componentName: comp.name,
        dishName: dish?.course_name ?? 'Unknown',
        courseName: dish?.course_name ?? 'Unknown',
        category: recipe?.category ?? null,
        peakHoursMin: recipe?.peak_hours_min ?? null,
        peakHoursMax: recipe?.peak_hours_max ?? null,
        safetyHoursMax: recipe?.safety_hours_max ?? null,
        storageMethod: recipe?.storage_method ?? null,
        freezable: recipe?.freezable ?? null,
        prepTimeMinutes: recipe?.prep_time_minutes ?? 30,
        allergenFlags: allergenMap[recipe?.id] ?? [],
        makeAheadWindowHours: comp.make_ahead_window_hours ?? null,
      }
    })

    const timeline = computePrepTimeline(timelineItems, eventDate)
    return { timeline }
  } catch (err: any) {
    console.error('[getEventPrepTimeline]', err)
    return { timeline: null, error: 'Failed to compute prep timeline.' }
  }
}
