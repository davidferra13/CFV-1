'use server'

import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
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

  // Validate: peakHoursMin must be <= peakHoursMax when both are set
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
    await db.query(
      `UPDATE recipes SET
        peak_hours_min = $1,
        peak_hours_max = $2,
        safety_hours_max = $3,
        storage_method = $4,
        freezable = $5,
        frozen_extends_hours = $6,
        updated_at = now()
      WHERE id = $7 AND tenant_id = $8`,
      [
        input.peakHoursMin,
        input.peakHoursMax,
        input.safetyHoursMax,
        input.storageMethod ?? 'fridge',
        input.freezable,
        input.frozenExtendsHours,
        input.recipeId,
        user.tenantId!,
      ]
    )

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
    let updated = 0
    for (const u of updates) {
      if (u.peakHoursMin > u.peakHoursMax) continue
      await db.query(
        `UPDATE recipes SET peak_hours_min = $1, peak_hours_max = $2, updated_at = now()
         WHERE id = $3 AND tenant_id = $4`,
        [u.peakHoursMin, u.peakHoursMax, u.recipeId, user.tenantId!]
      )
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
    // Get event with service date
    const eventRows = await db.query(
      `SELECT id, event_date, event_time, status FROM events WHERE id = $1 AND tenant_id = $2`,
      [eventId, user.tenantId!]
    )
    const event = eventRows.rows?.[0] ?? eventRows[0]
    if (!event) return { timeline: null, error: 'Event not found.' }

    // Build service datetime
    const eventDate = new Date(event.event_date)
    if (event.event_time) {
      const [h, m] = event.event_time.split(':').map(Number)
      eventDate.setHours(h, m, 0, 0)
    } else {
      eventDate.setHours(18, 0, 0, 0) // default 6pm
    }

    // Get all menu components with their linked recipes
    const componentRows = await db.query(
      `SELECT
        c.id AS component_id,
        c.name AS component_name,
        c.is_make_ahead,
        c.make_ahead_window_hours,
        c.recipe_id,
        d.course_name AS dish_name,
        d.course_name,
        r.id AS recipe_id,
        r.name AS recipe_name,
        r.category AS recipe_category,
        r.peak_hours_min,
        r.peak_hours_max,
        r.safety_hours_max,
        r.storage_method,
        r.freezable,
        r.prep_time_minutes,
        r.dietary_tags
      FROM menus m
      JOIN dishes d ON d.menu_id = m.id
      JOIN components c ON c.dish_id = d.id
      LEFT JOIN recipes r ON r.id = c.recipe_id
      WHERE m.event_id = $1 AND m.tenant_id = $2
      ORDER BY d.course_number, d.sort_order, c.sort_order`,
      [eventId, user.tenantId!]
    )

    const rows = componentRows.rows ?? componentRows

    if (rows.length === 0) {
      return { timeline: null }
    }

    // Get allergen flags for recipes that have them
    const recipeIds = [
      ...new Set(rows.filter((r: any) => r.recipe_id).map((r: any) => r.recipe_id)),
    ]
    let allergenMap: Record<string, string[]> = {}

    if (recipeIds.length > 0) {
      const allergenRows = await db.query(
        `SELECT ri.recipe_id, i.allergen_flags
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_id = ANY($1) AND i.allergen_flags IS NOT NULL AND array_length(i.allergen_flags, 1) > 0`,
        [recipeIds]
      )
      for (const row of allergenRows.rows ?? allergenRows) {
        const existing = allergenMap[row.recipe_id] ?? []
        allergenMap[row.recipe_id] = [...new Set([...existing, ...row.allergen_flags])]
      }
    }

    const timelineItems: TimelineRecipeInput[] = rows.map((row: any) => ({
      recipeId: row.recipe_id ?? row.component_id,
      recipeName: row.recipe_name ?? row.component_name,
      componentName: row.component_name,
      dishName: row.dish_name,
      courseName: row.course_name,
      category: row.recipe_category ?? null,
      peakHoursMin: row.peak_hours_min ?? null,
      peakHoursMax: row.peak_hours_max ?? null,
      safetyHoursMax: row.safety_hours_max ?? null,
      storageMethod: row.storage_method ?? null,
      freezable: row.freezable ?? null,
      prepTimeMinutes: row.prep_time_minutes ?? 30, // fallback 30min if not set
      allergenFlags: allergenMap[row.recipe_id] ?? [],
      makeAheadWindowHours: row.make_ahead_window_hours ?? null,
    }))

    const timeline = computePrepTimeline(timelineItems, eventDate)
    return { timeline }
  } catch (err: any) {
    console.error('[getEventPrepTimeline]', err)
    return { timeline: null, error: 'Failed to compute prep timeline.' }
  }
}
