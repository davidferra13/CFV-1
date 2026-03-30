'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { MealBoardEntry } from './types'

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

    const entryData = {
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

    // Remap entries to target dates
    const remappedEntries = sourceEntries.map((e: any) => {
      const sourceDate = new Date(e.meal_date)
      sourceDate.setDate(sourceDate.getDate() + dayOffset)
      return {
        mealDate: sourceDate.toISOString().split('T')[0],
        mealType: e.meal_type,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietary_tags,
        allergenFlags: e.allergen_flags,
      }
    })

    // Use bulk upsert
    return await bulkUpsertMealEntries({
      groupId: validated.groupId,
      profileToken: validated.profileToken,
      entries: remappedEntries,
    })
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

    // Map day offsets to actual dates
    const targetMonday = new Date(validated.targetWeekStart)
    const remappedEntries = entries.map((e: any) => {
      const entryDate = new Date(targetMonday)
      entryDate.setDate(entryDate.getDate() + (e.dayOffset ?? 0))
      return {
        mealDate: entryDate.toISOString().split('T')[0],
        mealType: e.mealType,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietaryTags,
        allergenFlags: e.allergenFlags,
      }
    })

    return await bulkUpsertMealEntries({
      groupId: validated.groupId,
      profileToken: validated.profileToken,
      entries: remappedEntries,
    })
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
