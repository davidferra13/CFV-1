'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { MealBoardEntry } from '../types'
import {
  hasGroupReadAccess,
  liso as _liso,
  parseDateLocal as _parseDateLocal,
  requireChefOrAdmin,
  resolveProfile,
} from './shared'

const GetMealBoardSchema = z.object({
  groupId: z.string().uuid(),
  groupToken: z.string().optional(), // SECURITY (Q6): Required for public/browser callers
  profileToken: z.string().uuid().optional(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(),
})

export async function getMealBoard(
  input: z.infer<typeof GetMealBoardSchema>
): Promise<MealBoardEntry[]> {
  const { groupId, groupToken, profileToken, startDate, endDate } = GetMealBoardSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  if (!(await hasGroupReadAccess(db, { groupId, groupToken, profileToken }))) return []

  let query = db
    .from('hub_meal_board')
    .select('*')
    .eq('group_id', groupId)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: true })

  if (startDate) {
    query = query.gte('meal_date', startDate)
  }
  if (endDate) {
    query = query.lte('meal_date', endDate)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load meal board: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Upsert a single meal entry
// ---------------------------------------------------------------------------

const UpsertMealSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  mealDate: z.string(), // ISO date
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  dietaryTags: z.array(z.string()).optional(),
  allergenFlags: z.array(z.string()).optional(),
  menuId: z.string().uuid().optional().nullable(),
  dishId: z.string().uuid().optional().nullable(),
  headCount: z.number().int().min(0).max(100).optional().nullable(),
  prepNotes: z.string().max(1000).optional().nullable(),
  servingTime: z.string().max(10).optional().nullable(),
  status: z.enum(['planned', 'confirmed', 'served', 'cancelled']).optional(),
})

export async function upsertMealEntry(
  input: z.infer<typeof UpsertMealSchema>
): Promise<{ success: boolean; entry?: MealBoardEntry; error?: string }> {
  try {
    const validated = UpsertMealSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Check if entry already exists for this slot
    const { data: existing } = await db
      .from('hub_meal_board')
      .select('id')
      .eq('group_id', validated.groupId)
      .eq('meal_date', validated.mealDate)
      .eq('meal_type', validated.mealType)
      .single()

    const entryData: Record<string, unknown> = {
      group_id: validated.groupId,
      author_profile_id: profile.id,
      meal_date: validated.mealDate,
      meal_type: validated.mealType,
      title: validated.title,
      description: validated.description ?? null,
      dietary_tags: validated.dietaryTags ?? [],
      allergen_flags: validated.allergenFlags ?? [],
      menu_id: validated.menuId ?? null,
      dish_id: validated.dishId ?? null,
      status: validated.status ?? 'planned',
      updated_at: new Date().toISOString(),
    }
    // Only include head_count, prep_notes, serving_time if explicitly provided
    if (validated.headCount !== undefined) entryData.head_count = validated.headCount
    if (validated.prepNotes !== undefined) entryData.prep_notes = validated.prepNotes
    if (validated.servingTime !== undefined) entryData.serving_time = validated.servingTime

    let entry: MealBoardEntry

    if (existing) {
      // Update existing
      const { data, error } = await db
        .from('hub_meal_board')
        .update(entryData)
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      entry = data
    } else {
      // Insert new
      const { data, error } = await db.from('hub_meal_board').insert(entryData).select('*').single()
      if (error) throw new Error(error.message)
      entry = data
    }

    return { success: true, entry }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Delete a meal entry
// ---------------------------------------------------------------------------

const DeleteMealSchema = z.object({
  entryId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

export async function deleteMealEntry(
  input: z.infer<typeof DeleteMealSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = DeleteMealSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)

    // Get the entry to check group membership
    const { data: entry } = await db
      .from('hub_meal_board')
      .select('group_id')
      .eq('id', validated.entryId)
      .single()

    if (!entry) throw new Error('Meal entry not found')

    await requireChefOrAdmin(db, entry.group_id, profile.id)

    const { error } = await db.from('hub_meal_board').delete().eq('id', validated.entryId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Update meal status (planned -> confirmed -> served | cancelled)
// ---------------------------------------------------------------------------

export async function updateMealStatus(input: {
  entryId: string
  profileToken: string
  status: 'planned' | 'confirmed' | 'served' | 'cancelled'
}): Promise<{ success: boolean; entry?: MealBoardEntry; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    const { data: entry } = await db
      .from('hub_meal_board')
      .select('group_id, status')
      .eq('id', input.entryId)
      .single()

    if (!entry) throw new Error('Meal entry not found')
    await requireChefOrAdmin(db, entry.group_id, profile.id)

    const { data, error } = await db
      .from('hub_meal_board')
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq('id', input.entryId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, entry: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Bulk upsert meal entries (for posting a full week)
// ---------------------------------------------------------------------------

const BulkUpsertSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  entries: z
    .array(
      z.object({
        mealDate: z.string(),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        title: z.string().min(1).max(200),
        description: z.string().max(500).optional().nullable(),
        dietaryTags: z.array(z.string()).optional(),
        allergenFlags: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(42), // Max 6 weeks x 7 days (safety limit)
})

export async function bulkUpsertMealEntries(
  input: z.infer<typeof BulkUpsertSchema>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const validated = BulkUpsertSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    let upsertedCount = 0

    for (const entry of validated.entries) {
      const { data: existing } = await db
        .from('hub_meal_board')
        .select('id')
        .eq('group_id', validated.groupId)
        .eq('meal_date', entry.mealDate)
        .eq('meal_type', entry.mealType)
        .single()

      const entryData = {
        group_id: validated.groupId,
        author_profile_id: profile.id,
        meal_date: entry.mealDate,
        meal_type: entry.mealType,
        title: entry.title,
        description: entry.description ?? null,
        dietary_tags: entry.dietaryTags ?? [],
        allergen_flags: entry.allergenFlags ?? [],
        status: 'planned',
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await db.from('hub_meal_board').update(entryData).eq('id', existing.id)
      } else {
        await db.from('hub_meal_board').insert(entryData)
      }
      upsertedCount++
    }

    // Post a system message to the group chat
    try {
      const dates = validated.entries.map((e) => e.mealDate).sort()
      const startDate = dates[0]
      const endDate = dates[dates.length - 1]
      const dateRange =
        startDate === endDate
          ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      await db.from('hub_messages').insert({
        group_id: validated.groupId,
        author_profile_id: profile.id,
        message_type: 'system',
        body: `Weekly menu posted for ${dateRange} (${upsertedCount} meals)`,
        system_event_type: 'menu_update',
        system_metadata: { startDate, endDate, count: upsertedCount },
      })

      const { data: currentGroup } = await db
        .from('hub_groups')
        .select('message_count')
        .eq('id', validated.groupId)
        .single()

      if (currentGroup) {
        await db
          .from('hub_groups')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: `Menu posted for ${dateRange}`,
            message_count: (currentGroup.message_count ?? 0) + 1,
          })
          .eq('id', validated.groupId)
      }
    } catch {
      // Non-blocking: system message failure doesn't affect meal board
      console.error('[non-blocking] Failed to post system message for meal board update')
    }

    return { success: true, count: upsertedCount }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Clone a week's meals to a target week
// ---------------------------------------------------------------------------

const CloneWeekSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  sourceWeekStart: z.string(), // ISO date (Monday)
  targetWeekStart: z.string(), // ISO date (Monday)
})

export async function cloneWeekMeals(
  input: z.infer<typeof CloneWeekSchema>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const validated = CloneWeekSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Get source week entries (Mon-Sun)
    const _sw = _parseDateLocal(validated.sourceWeekStart as string)
    const sourceEndStr = _liso(new Date(_sw.getFullYear(), _sw.getMonth(), _sw.getDate() + 6))

    const { data: sourceEntries } = await db
      .from('hub_meal_board')
      .select('*')
      .eq('group_id', validated.groupId)
      .gte('meal_date', validated.sourceWeekStart)
      .lte('meal_date', sourceEndStr)
      .neq('status', 'cancelled')

    if (!sourceEntries || sourceEntries.length === 0) {
      return { success: false, error: 'No meals to clone from source week' }
    }

    // Calculate day offset between source and target
    const sourceStart = new Date(validated.sourceWeekStart)
    const targetStart = new Date(validated.targetWeekStart)
    const dayOffset = Math.round(
      (targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Remap entries to target dates (preserve per-meal serving times)
    let clonedCount = 0
    for (const e of sourceEntries) {
      const _sd = _parseDateLocal(e.meal_date)
      const targetDate = _liso(
        new Date(_sd.getFullYear(), _sd.getMonth(), _sd.getDate() + dayOffset)
      )

      const result = await upsertMealEntry({
        groupId: validated.groupId,
        profileToken: validated.profileToken,
        mealDate: targetDate,
        mealType: e.meal_type,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietary_tags,
        allergenFlags: e.allergen_flags,
        headCount: e.head_count,
        prepNotes: e.prep_notes,
        servingTime: e.serving_time ?? undefined,
      })
      if (result.success) clonedCount++
    }

    // Post system message (non-blocking)
    try {
      const dates = sourceEntries.map((e: any) => e.meal_date).sort()
      const startDate = dates[0]
      const endDate = dates[dates.length - 1]
      const dateRange =
        startDate === endDate
          ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      const db2: any = createServerClient({ admin: true })
      await db2.from('hub_messages').insert({
        group_id: validated.groupId,
        author_profile_id: profile.id,
        message_type: 'system',
        body: `Week cloned to ${dateRange} (${clonedCount} meals)`,
        system_event_type: 'menu_update',
      })
    } catch {
      console.error('[non-blocking] Failed to post clone system message')
    }

    return { success: true, count: clonedCount }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
