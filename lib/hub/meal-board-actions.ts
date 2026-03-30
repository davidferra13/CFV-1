'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { MealBoardEntry, MealComment, MealRequest, DefaultMealTimes } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveProfile(db: any, profileToken: string) {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()
  if (!profile) throw new Error('Invalid profile token')
  return profile
}

async function requireChefOrAdmin(db: any, groupId: string, profileId: string) {
  const { data: membership } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .single()
  if (!membership) throw new Error('Not a member of this group')
  if (!['owner', 'admin', 'chef'].includes(membership.role)) {
    throw new Error('Only chefs and admins can modify the meal board')
  }
  return membership
}

// ---------------------------------------------------------------------------
// Get meal board entries for a date range
// ---------------------------------------------------------------------------

const GetMealBoardSchema = z.object({
  groupId: z.string().uuid(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(),
})

export async function getMealBoard(
  input: z.infer<typeof GetMealBoardSchema>
): Promise<MealBoardEntry[]> {
  const { groupId, startDate, endDate } = GetMealBoardSchema.parse(input)
  const db: any = createServerClient({ admin: true })

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

      // Update group's last_message
      await db
        .from('hub_groups')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `Menu posted for ${dateRange}`,
          message_count: db.raw('message_count + 1'),
        })
        .eq('id', validated.groupId)
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
    const sourceEnd = new Date(validated.sourceWeekStart)
    sourceEnd.setDate(sourceEnd.getDate() + 6)
    const sourceEndStr = sourceEnd.toISOString().split('T')[0]

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
      const sourceDate = new Date(e.meal_date)
      sourceDate.setDate(sourceDate.getDate() + dayOffset)
      const targetDate = sourceDate.toISOString().split('T')[0]

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

// ---------------------------------------------------------------------------
// Save current week as a named template
// ---------------------------------------------------------------------------

const SaveTemplateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  weekStart: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
})

export interface MealTemplate {
  id: string
  group_id: string
  created_by_profile_id: string
  name: string
  description: string | null
  entries: unknown[]
  created_at: string
  updated_at: string
}

export async function saveWeekAsTemplate(
  input: z.infer<typeof SaveTemplateSchema>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const validated = SaveTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Get week entries
    const weekEnd = new Date(validated.weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const { data: entries } = await db
      .from('hub_meal_board')
      .select('*')
      .eq('group_id', validated.groupId)
      .gte('meal_date', validated.weekStart)
      .lte('meal_date', weekEndStr)
      .neq('status', 'cancelled')

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No meals to save as template' }
    }

    // Convert to template format (day offsets from Monday)
    const mondayDate = new Date(validated.weekStart)
    const templateEntries = entries.map((e: any) => {
      const entryDate = new Date(e.meal_date)
      const dayOffset = Math.round(
        (entryDate.getTime() - mondayDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        dayOffset,
        mealType: e.meal_type,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietary_tags,
        allergenFlags: e.allergen_flags,
        headCount: e.head_count,
        prepNotes: e.prep_notes,
        servingTime: e.serving_time,
      }
    })

    const { data, error } = await db
      .from('hub_meal_templates')
      .insert({
        group_id: validated.groupId,
        created_by_profile_id: profile.id,
        name: validated.name,
        description: validated.description ?? null,
        entries: templateEntries,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, templateId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Get templates for a group
// ---------------------------------------------------------------------------

export async function getTemplates(groupId: string): Promise<MealTemplate[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('hub_meal_templates')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load templates: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Load template onto a target week
// ---------------------------------------------------------------------------

const LoadTemplateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  templateId: z.string().uuid(),
  targetWeekStart: z.string(),
})

export async function loadTemplate(
  input: z.infer<typeof LoadTemplateSchema>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const validated = LoadTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Get template
    const { data: template } = await db
      .from('hub_meal_templates')
      .select('*')
      .eq('id', validated.templateId)
      .eq('group_id', validated.groupId)
      .single()

    if (!template) throw new Error('Template not found')

    const entries = template.entries as any[]
    if (!entries || entries.length === 0) {
      return { success: false, error: 'Template has no entries' }
    }

    // Map day offsets to actual dates and upsert individually (preserves all fields)
    const targetMonday = new Date(validated.targetWeekStart)
    let loadedCount = 0
    for (const e of entries) {
      const entryDate = new Date(targetMonday)
      entryDate.setDate(entryDate.getDate() + (e.dayOffset ?? 0))
      const result = await upsertMealEntry({
        groupId: validated.groupId,
        profileToken: validated.profileToken,
        mealDate: entryDate.toISOString().split('T')[0],
        mealType: e.mealType,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietaryTags,
        allergenFlags: e.allergenFlags,
        headCount: e.headCount ?? undefined,
        prepNotes: e.prepNotes ?? undefined,
        servingTime: e.servingTime ?? undefined,
      })
      if (result.success) loadedCount++
    }
    return { success: true, count: loadedCount }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Delete a template
// ---------------------------------------------------------------------------

const DeleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

export async function deleteTemplate(
  input: z.infer<typeof DeleteTemplateSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = DeleteTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)

    // Verify the template exists and belongs to this user
    const { data: template } = await db
      .from('hub_meal_templates')
      .select('created_by_profile_id')
      .eq('id', validated.templateId)
      .single()

    if (!template) throw new Error('Template not found')
    if (template.created_by_profile_id !== profile.id) {
      throw new Error('Not your template')
    }

    const { error } = await db.from('hub_meal_templates').delete().eq('id', validated.templateId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ===========================================================================
// SCHEDULE CHANGES
// ===========================================================================

export interface ScheduleChange {
  id: string
  group_id: string
  posted_by_profile_id: string
  change_date: string
  change_type: string
  description: string
  affected_meals: string[]
  acknowledged_by_profile_id: string | null
  acknowledged_at: string | null
  resolved: boolean
  created_at: string
  updated_at: string
  posted_by?: { display_name: string }
}

// ---------------------------------------------------------------------------
// Post a schedule change flag
// ---------------------------------------------------------------------------

const PostScheduleChangeSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  changeDate: z.string(),
  changeType: z.enum([
    'extra_guests',
    'fewer_guests',
    'skip_day',
    'skip_meal',
    'time_change',
    'location_change',
    'other',
  ]),
  description: z.string().min(1).max(500),
  affectedMeals: z.array(z.string()).optional(),
})

export async function postScheduleChange(
  input: z.infer<typeof PostScheduleChangeSchema>
): Promise<{ success: boolean; change?: ScheduleChange; error?: string }> {
  try {
    const validated = PostScheduleChangeSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)

    // Verify membership
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', validated.groupId)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) throw new Error('Not a member of this group')

    const { data, error } = await db
      .from('hub_schedule_changes')
      .insert({
        group_id: validated.groupId,
        posted_by_profile_id: profile.id,
        change_date: validated.changeDate,
        change_type: validated.changeType,
        description: validated.description,
        affected_meals: validated.affectedMeals ?? [],
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    // Post system message (non-blocking)
    try {
      const dateLabel = new Date(validated.changeDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      await db.from('hub_messages').insert({
        group_id: validated.groupId,
        author_profile_id: profile.id,
        message_type: 'system',
        body: `Schedule change for ${dateLabel}: ${validated.description}`,
        system_event_type: 'schedule_change',
        system_metadata: { changeDate: validated.changeDate, changeType: validated.changeType },
      })
    } catch {
      console.error('[non-blocking] Failed to post schedule change system message')
    }

    return { success: true, change: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Get schedule changes for a date range
// ---------------------------------------------------------------------------

export async function getScheduleChanges(input: {
  groupId: string
  startDate: string
  endDate: string
}): Promise<ScheduleChange[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('hub_schedule_changes')
    .select('*, posted_by:hub_guest_profiles!posted_by_profile_id(display_name)')
    .eq('group_id', input.groupId)
    .gte('change_date', input.startDate)
    .lte('change_date', input.endDate)
    .eq('resolved', false)
    .order('change_date', { ascending: true })

  if (error) throw new Error(`Failed to load schedule changes: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Acknowledge a schedule change (chef saw it)
// ---------------------------------------------------------------------------

export async function acknowledgeScheduleChange(input: {
  changeId: string
  profileToken: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    const { error } = await db
      .from('hub_schedule_changes')
      .update({
        acknowledged_by_profile_id: profile.id,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.changeId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Resolve a schedule change (chef handled it)
// ---------------------------------------------------------------------------

export async function resolveScheduleChange(input: {
  changeId: string
  profileToken: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    const { error } = await db
      .from('hub_schedule_changes')
      .update({
        resolved: true,
        acknowledged_by_profile_id: profile.id,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.changeId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ===========================================================================
// RECURRING MEALS
// ===========================================================================

export interface RecurringMealInput {
  groupId: string
  profileToken: string
  mealType: string
  title: string
  description?: string | null
  dietaryTags?: string[]
  allergenFlags?: string[]
  headCount?: number | null
  prepNotes?: string | null
  pattern: string
  dayOfWeek?: number | null
  activeFrom?: string
  activeUntil?: string | null
}

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
        active_from: input.activeFrom ?? new Date().toISOString().split('T')[0],
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

export async function getRecurringMeals(groupId: string): Promise<any[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('hub_recurring_meals')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('meal_type', { ascending: true })

  if (error) throw new Error(`Failed to load recurring meals: ${error.message}`)
  return data ?? []
}

export async function deleteRecurringMeal(input: {
  recurringId: string
  profileToken: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    await resolveProfile(db, input.profileToken)

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

    const recurrings = await getRecurringMeals(input.groupId)
    if (recurrings.length === 0) return { success: true, filled: 0 }

    const weekEnd = new Date(input.weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const existing = await getMealBoard({
      groupId: input.groupId,
      startDate: input.weekStart,
      endDate: weekEndStr,
    })

    const occupiedSlots = new Set(existing.map((e: any) => `${e.meal_date}:${e.meal_type}`))

    const toInsert: any[] = []
    const monday = new Date(input.weekStart)

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(monday)
      date.setDate(date.getDate() + dayOffset)
      const dateStr = date.toISOString().split('T')[0]
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

// ===========================================================================
// FEEDBACK INTELLIGENCE (chef-only, pure formula)
// ===========================================================================

export interface FeedbackInsight {
  totalMeals: number
  totalFeedback: number
  overallScore: number
  topDishes: { title: string; score: number; count: number }[]
  bottomDishes: { title: string; score: number; count: number }[]
  categoryBreakdown: { category: string; avgScore: number; count: number }[]
  recentTrend: 'improving' | 'stable' | 'declining'
}

export async function getFeedbackInsights(input: {
  groupId: string
  lookbackDays?: number
}): Promise<FeedbackInsight> {
  const db: any = createServerClient({ admin: true })
  const lookback = input.lookbackDays ?? 30

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - lookback)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  const { data: meals } = await db
    .from('hub_meal_board')
    .select('id, title, meal_type, meal_date, dietary_tags')
    .eq('group_id', input.groupId)
    .gte('meal_date', cutoffStr)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: false })

  if (!meals || meals.length === 0) {
    return {
      totalMeals: 0,
      totalFeedback: 0,
      overallScore: 0,
      topDishes: [],
      bottomDishes: [],
      categoryBreakdown: [],
      recentTrend: 'stable',
    }
  }

  const mealIds = meals.map((m: any) => m.id)
  const { data: feedback } = await db
    .from('hub_meal_feedback')
    .select('meal_entry_id, reaction')
    .in('meal_entry_id', mealIds)

  const feedbackList = feedback ?? []
  const scoreMap: Record<string, number> = { loved: 100, liked: 75, neutral: 50, disliked: 0 }

  const mealScores: Record<
    string,
    { title: string; scores: number[]; mealType: string; date: string }
  > = {}
  for (const m of meals) {
    mealScores[m.id] = { title: m.title, scores: [], mealType: m.meal_type, date: m.meal_date }
  }

  let totalScore = 0
  for (const fb of feedbackList) {
    const s = scoreMap[fb.reaction] ?? 50
    totalScore += s
    if (mealScores[fb.meal_entry_id]) mealScores[fb.meal_entry_id].scores.push(s)
  }

  // Aggregate per dish title
  const dishAgg: Record<string, { title: string; totalScore: number; count: number }> = {}
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    const key = ms.title.toLowerCase().trim()
    if (!dishAgg[key]) dishAgg[key] = { title: ms.title, totalScore: 0, count: 0 }
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    dishAgg[key].totalScore += avg
    dishAgg[key].count += 1
  }

  const dishList = Object.values(dishAgg)
    .map((d) => ({ title: d.title, score: Math.round(d.totalScore / d.count), count: d.count }))
    .sort((a, b) => b.score - a.score)

  // Category breakdown
  const catAgg: Record<string, { totalScore: number; count: number }> = {}
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    if (!catAgg[ms.mealType]) catAgg[ms.mealType] = { totalScore: 0, count: 0 }
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    catAgg[ms.mealType].totalScore += avg
    catAgg[ms.mealType].count += 1
  }

  const categoryBreakdown = Object.entries(catAgg).map(([cat, a]) => ({
    category: cat,
    avgScore: Math.round(a.totalScore / a.count),
    count: a.count,
  }))

  // Trend: first half vs second half
  const midDate = new Date()
  midDate.setDate(midDate.getDate() - Math.floor(lookback / 2))
  const midStr = midDate.toISOString().split('T')[0]
  let fTotal = 0,
    fCount = 0,
    sTotal = 0,
    sCount = 0
  for (const ms of Object.values(mealScores)) {
    if (ms.scores.length === 0) continue
    const avg = ms.scores.reduce((a, b) => a + b, 0) / ms.scores.length
    if (ms.date < midStr) {
      fTotal += avg
      fCount++
    } else {
      sTotal += avg
      sCount++
    }
  }
  const diff = (sCount > 0 ? sTotal / sCount : 50) - (fCount > 0 ? fTotal / fCount : 50)
  const recentTrend: 'improving' | 'stable' | 'declining' =
    diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable'

  return {
    totalMeals: meals.length,
    totalFeedback: feedbackList.length,
    overallScore: feedbackList.length > 0 ? Math.round(totalScore / feedbackList.length) : 0,
    topDishes: dishList.slice(0, 5),
    bottomDishes: dishList.filter((d) => d.score < 50).slice(0, 3),
    categoryBreakdown,
    recentTrend,
  }
}

// ===========================================================================
// MEAL HISTORY + FAVORITES
// ===========================================================================

export interface MealHistoryEntry {
  title: string
  meal_type: string
  times_served: number
  last_served: string
  avg_score: number
  total_feedback: number
  loved_pct: number
}

export async function getMealHistory(input: {
  groupId: string
  limit?: number
}): Promise<MealHistoryEntry[]> {
  const db: any = createServerClient({ admin: true })

  const { data: meals } = await db
    .from('hub_meal_board')
    .select('id, title, meal_type, meal_date')
    .eq('group_id', input.groupId)
    .neq('status', 'cancelled')
    .order('meal_date', { ascending: false })

  if (!meals || meals.length === 0) return []

  const mealIds = meals.map((m: any) => m.id)
  const { data: feedback } = await db
    .from('hub_meal_feedback')
    .select('meal_entry_id, reaction')
    .in('meal_entry_id', mealIds)

  const feedbackList = feedback ?? []
  const scoreMap: Record<string, number> = { loved: 100, liked: 75, neutral: 50, disliked: 0 }

  const fbByMeal: Record<string, { reaction: string }[]> = {}
  for (const fb of feedbackList) {
    if (!fbByMeal[fb.meal_entry_id]) fbByMeal[fb.meal_entry_id] = []
    fbByMeal[fb.meal_entry_id].push(fb)
  }

  const agg: Record<
    string,
    { title: string; mealType: string; dates: string[]; scores: number[]; lovedCount: number }
  > = {}
  for (const m of meals) {
    const key = m.title.toLowerCase().trim()
    if (!agg[key])
      agg[key] = { title: m.title, mealType: m.meal_type, dates: [], scores: [], lovedCount: 0 }
    agg[key].dates.push(m.meal_date)
    for (const fb of fbByMeal[m.id] ?? []) {
      agg[key].scores.push(scoreMap[fb.reaction] ?? 50)
      if (fb.reaction === 'loved') agg[key].lovedCount++
    }
  }

  const results: MealHistoryEntry[] = Object.values(agg).map((a) => ({
    title: a.title,
    meal_type: a.mealType,
    times_served: a.dates.length,
    last_served: a.dates.sort().reverse()[0],
    avg_score:
      a.scores.length > 0 ? Math.round(a.scores.reduce((x, y) => x + y, 0) / a.scores.length) : 0,
    total_feedback: a.scores.length,
    loved_pct: a.scores.length > 0 ? Math.round((a.lovedCount / a.scores.length) * 100) : 0,
  }))

  results.sort((a, b) => b.avg_score - a.avg_score)
  return results.slice(0, input.limit ?? 50)
}

// ===========================================================================
// DEFAULT HEAD COUNT
// ===========================================================================

export async function updateGroupDefaultHeadCount(input: {
  groupId: string
  profileToken: string
  defaultHeadCount: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const { error } = await db
      .from('hub_groups')
      .update({ default_head_count: input.defaultHeadCount, updated_at: new Date().toISOString() })
      .eq('id', input.groupId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getGroupDefaultHeadCount(groupId: string): Promise<number | null> {
  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('hub_groups')
    .select('default_head_count')
    .eq('id', groupId)
    .single()
  return data?.default_head_count ?? null
}

// ===========================================================================
// DEFAULT MEAL TIMES
// ===========================================================================

export async function getDefaultMealTimes(groupId: string): Promise<DefaultMealTimes | null> {
  const db: any = createServerClient({ admin: true })
  const { data } = await db
    .from('hub_groups')
    .select('default_meal_times')
    .eq('id', groupId)
    .single()
  return data?.default_meal_times ?? null
}

export async function updateDefaultMealTimes(input: {
  groupId: string
  profileToken: string
  times: DefaultMealTimes
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)
    await requireChefOrAdmin(db, input.groupId, profile.id)

    const { error } = await db
      .from('hub_groups')
      .update({
        default_meal_times: input.times,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.groupId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ===========================================================================
// MEAL COMMENTS
// ===========================================================================

export async function getBatchCommentCounts(
  mealEntryIds: string[]
): Promise<Record<string, number>> {
  if (mealEntryIds.length === 0) return {}
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_meal_comments')
    .select('meal_entry_id')
    .in('meal_entry_id', mealEntryIds)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.meal_entry_id] = (counts[row.meal_entry_id] ?? 0) + 1
  }
  return counts
}

export async function getMealComments(mealEntryId: string): Promise<MealComment[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('hub_meal_comments')
    .select('*, author:hub_guest_profiles!author_profile_id(id, display_name, avatar_url)')
    .eq('meal_entry_id', mealEntryId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load comments: ${error.message}`)
  return (data ?? []).map((c: any) => ({
    ...c,
    author: c.author ?? undefined,
  }))
}

export async function addMealComment(input: {
  mealEntryId: string
  profileToken: string
  body: string
}): Promise<{ success: boolean; comment?: MealComment; error?: string }> {
  try {
    if (!input.body.trim()) return { success: false, error: 'Comment cannot be empty' }
    if (input.body.length > 500)
      return { success: false, error: 'Comment too long (max 500 chars)' }

    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Verify the meal exists and get group for membership check
    const { data: meal } = await db
      .from('hub_meal_board')
      .select('group_id')
      .eq('id', input.mealEntryId)
      .single()
    if (!meal) return { success: false, error: 'Meal not found' }

    // Verify membership
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', meal.group_id)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) return { success: false, error: 'Not a member of this circle' }

    const { data, error } = await db
      .from('hub_meal_comments')
      .insert({
        meal_entry_id: input.mealEntryId,
        author_profile_id: profile.id,
        body: input.body.trim(),
      })
      .select('*, author:hub_guest_profiles!author_profile_id(id, display_name, avatar_url)')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, comment: { ...data, author: data.author ?? undefined } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ===========================================================================
// MEAL REQUESTS
// ===========================================================================

export async function getMealRequests(input: {
  groupId: string
  status?: string
}): Promise<MealRequest[]> {
  const db: any = createServerClient({ admin: true })
  let query = db
    .from('hub_meal_requests')
    .select(
      '*, requested_by:hub_guest_profiles!requested_by_profile_id(id, display_name, avatar_url)'
    )
    .eq('group_id', input.groupId)
    .order('created_at', { ascending: false })

  if (input.status) {
    query = query.eq('status', input.status)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load meal requests: ${error.message}`)
  return (data ?? []).map((r: any) => ({
    ...r,
    requested_by: r.requested_by ?? undefined,
  }))
}

export async function createMealRequest(input: {
  groupId: string
  profileToken: string
  title: string
  notes?: string | null
}): Promise<{ success: boolean; request?: MealRequest; error?: string }> {
  try {
    if (!input.title.trim()) return { success: false, error: 'Title is required' }
    if (input.title.length > 200) return { success: false, error: 'Title too long (max 200 chars)' }

    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Verify membership
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', input.groupId)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) return { success: false, error: 'Not a member of this circle' }

    const { data, error } = await db
      .from('hub_meal_requests')
      .insert({
        group_id: input.groupId,
        requested_by_profile_id: profile.id,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
      })
      .select(
        '*, requested_by:hub_guest_profiles!requested_by_profile_id(id, display_name, avatar_url)'
      )
      .single()

    if (error) throw new Error(error.message)

    // Post system message (non-blocking)
    try {
      const { data: prof } = await db
        .from('hub_guest_profiles')
        .select('display_name')
        .eq('id', profile.id)
        .single()
      await db.from('hub_messages').insert({
        group_id: input.groupId,
        author_profile_id: profile.id,
        message_type: 'system',
        body: `${prof?.display_name ?? 'Someone'} requested: "${input.title.trim()}"`,
        system_event_type: 'meal_request',
        system_metadata: { title: input.title.trim() },
      })
    } catch {
      console.error('[non-blocking] Failed to post meal request system message')
    }

    return { success: true, request: { ...data, requested_by: data.requested_by ?? undefined } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function resolveMealRequest(input: {
  requestId: string
  profileToken: string
  status: 'planned' | 'declined'
  resolvedMealId?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Get request to check group
    const { data: request } = await db
      .from('hub_meal_requests')
      .select('group_id')
      .eq('id', input.requestId)
      .single()
    if (!request) return { success: false, error: 'Request not found' }

    await requireChefOrAdmin(db, request.group_id, profile.id)

    const { error } = await db
      .from('hub_meal_requests')
      .update({
        status: input.status,
        resolved_meal_id: input.resolvedMealId ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', input.requestId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
