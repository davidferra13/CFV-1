'use server'

import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath, revalidateTag } from 'next/cache'
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
  activeMinutes: number | null
  passiveMinutes: number | null
  holdClass: string | null
  prepTier: string | null
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

  if (
    input.safetyHoursMax != null &&
    input.peakHoursMin != null &&
    input.safetyHoursMax < input.peakHoursMin
  ) {
    return {
      success: false,
      error:
        'Safety ceiling is shorter than earliest peak time. This recipe cannot reach peak quality within its safety window.',
    }
  }

  if (
    input.holdClass != null &&
    !['serve_immediately', 'hold_warm', 'hold_cold_reheat'].includes(input.holdClass)
  ) {
    return { success: false, error: 'Invalid hold class.' }
  }
  if (
    input.prepTier != null &&
    !['base', 'secondary', 'tertiary', 'finishing'].includes(input.prepTier)
  ) {
    return { success: false, error: 'Invalid prep tier.' }
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
        active_prep_minutes: input.activeMinutes,
        passive_prep_minutes: input.passiveMinutes,
        hold_class: input.holdClass,
        prep_tier: input.prepTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.recipeId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${input.recipeId}`)
    // Bust event pages + cached prep timelines that use this recipe's peak window data
    revalidatePath('/events', 'layout')
    revalidateTag(`prep-timeline-${user.tenantId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[updateRecipePeakWindow]', err)
    return { success: false, error: 'Failed to save peak window.' }
  }
}

// --- Prep completion persistence (cross-device sync) ---

export async function togglePrepCompletion(
  eventId: string,
  itemKey: string,
  completed: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    if (completed) {
      await db.from('prep_completions').upsert(
        {
          event_id: eventId,
          chef_id: user.tenantId!,
          item_key: itemKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,item_key' }
      )
    } else {
      await db.from('prep_completions').delete().eq('event_id', eventId).eq('item_key', itemKey)
    }
    return { success: true }
  } catch (err: any) {
    console.error('[togglePrepCompletion]', err)
    return { success: false }
  }
}

export async function getPrepCompletions(eventId: string): Promise<string[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data } = await db
      .from('prep_completions')
      .select('item_key')
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)

    return (data ?? []).map((row: any) => row.item_key)
  } catch {
    return []
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
      .select('id, name, dish_id, recipe_id, is_make_ahead, make_ahead_window_hours, sort_order')
      .in('dish_id', dishIds)
      .order('sort_order', { ascending: true })

    if (!components || components.length === 0) {
      return { timeline: null }
    }

    // Get linked recipes
    const recipeIds = [
      ...new Set(components.filter((c: any) => c.recipe_id).map((c: any) => c.recipe_id)),
    ]

    let recipes: any[] = []
    if (recipeIds.length > 0) {
      const { data: recipeData } = await db
        .from('recipes')
        .select(
          'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, prep_time_minutes, dietary_tags, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier'
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

      const riArr = riData as any[]
      if (riArr && riArr.length > 0) {
        const ingredientIds = [...new Set(riArr.map((ri: any) => ri.ingredient_id))]
        const { data: ingredients } = await db
          .from('ingredients')
          .select('id, allergen_flags')
          .in('id', ingredientIds)

        if (ingredients) {
          const ingMap = new Map(
            (ingredients as any[]).map((i: any) => [i.id, i.allergen_flags ?? []])
          )
          for (const ri of riArr) {
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
      const recipe: any = comp.recipe_id ? recipeMap.get(comp.recipe_id) : null
      const dish: any = dishMap.get(comp.dish_id)

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
        frozenExtendsHours: recipe?.frozen_extends_hours ?? null,
        prepTimeMinutes: recipe?.prep_time_minutes ?? 30,
        activeMinutes: recipe?.active_prep_minutes ?? null,
        passiveMinutes: recipe?.passive_prep_minutes ?? null,
        holdClass: recipe?.hold_class ?? null,
        prepTier: recipe?.prep_tier ?? null,
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
