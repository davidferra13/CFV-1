'use server'

import { createServerClient } from '@/lib/db/server'
import { getMealBoard } from './board-crud'
import type { RecurringMealInput } from './contracts'
import type { GroupAccessInput } from './shared'
import {
  hasManagerAccess,
  liso as _liso,
  normalizeGroupAccessInput,
  parseDateLocal as _parseDateLocal,
  requireChefOrAdmin,
  resolveProfile,
} from './shared'

export async function createRecurringMeal(
  input: RecurringMealInput
): Promise<{ success: boolean; recurring?: any; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const { data, error } = await db
      .from('hub_recurring_meals')
      .insert({
        group_id: input.groupId,
        created_by_profile_id: profile.id,
        meal_type: input.mealType,
        title: input.title,
        description: input.description ?? null,
        dietary_tags: input.dietaryTags ?? [],
        allergen_flags: input.allergenFlags ?? [],
        head_count: input.headCount ?? null,
        prep_notes: input.prepNotes ?? null,
        pattern: input.pattern,
        day_of_week: input.dayOfWeek ?? null,
        active_from: input.activeFrom ?? _liso(new Date()),
        active_until: input.activeUntil ?? null,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, recurring: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function loadRecurringMealsForGroup(db: any, groupId: string): Promise<any[]> {
  const { data, error } = await db
    .from('hub_recurring_meals')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('meal_type', { ascending: true })

  if (error) throw new Error(`Failed to load recurring meals: ${error.message}`)
  return data ?? []
}

export async function getRecurringMeals(input: string | GroupAccessInput): Promise<any[]> {
  const { groupId, profileToken } = normalizeGroupAccessInput(input)
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, groupId, profileToken))) return []
  return loadRecurringMealsForGroup(db, groupId)
}

export async function deleteRecurringMeal(input: {
  recurringId: string
  profileToken: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    const { data: recurring } = await db
      .from('hub_recurring_meals')
      .select('group_id')
      .eq('id', input.recurringId)
      .single()
    if (!recurring) throw new Error('Recurring meal not found')
    await requireChefOrAdmin(db, recurring.group_id, profile.id)

    const { error } = await db
      .from('hub_recurring_meals')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', input.recurringId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function applyRecurringMeals(input: {
  groupId: string
  profileToken: string
  weekStart: string
}): Promise<{ success: boolean; filled: number; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const recurrings = await loadRecurringMealsForGroup(db, input.groupId)
    if (recurrings.length === 0) return { success: true, filled: 0 }

    const _rws = _parseDateLocal(input.weekStart)
    const weekEndStr = _liso(new Date(_rws.getFullYear(), _rws.getMonth(), _rws.getDate() + 6))

    const existing = await getMealBoard({
      groupId: input.groupId,
      startDate: input.weekStart,
      endDate: weekEndStr,
    })

    const occupiedSlots = new Set(existing.map((e: any) => `${e.meal_date}:${e.meal_type}`))

    const toInsert: any[] = []
    const _rmws = _parseDateLocal(input.weekStart)

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateStr = _liso(
        new Date(_rmws.getFullYear(), _rmws.getMonth(), _rmws.getDate() + dayOffset)
      )
      const isWeekday = dayOffset < 5
      const dayOfWeek = dayOffset

      for (const r of recurrings) {
        const applies =
          r.pattern === 'daily' ||
          (r.pattern === 'weekdays' && isWeekday) ||
          (r.pattern === 'weekends' && !isWeekday) ||
          (r.pattern === 'weekly' && r.day_of_week === dayOfWeek)

        if (!applies) continue
        if (r.active_from && dateStr < r.active_from) continue
        if (r.active_until && dateStr > r.active_until) continue

        const slotKey = `${dateStr}:${r.meal_type}`
        if (occupiedSlots.has(slotKey)) continue

        toInsert.push({
          group_id: input.groupId,
          author_profile_id: profile.id,
          meal_date: dateStr,
          meal_type: r.meal_type,
          title: r.title,
          description: r.description,
          dietary_tags: r.dietary_tags,
          allergen_flags: r.allergen_flags,
          head_count: r.head_count,
          prep_notes: r.prep_notes,
          status: 'planned',
        })
        occupiedSlots.add(slotKey)
      }
    }

    if (toInsert.length > 0) {
      const { error } = await db.from('hub_meal_board').insert(toInsert)
      if (error) throw new Error(error.message)
    }

    return { success: true, filled: toInsert.length }
  } catch (err: any) {
    return { success: false, filled: 0, error: err.message }
  }
}
