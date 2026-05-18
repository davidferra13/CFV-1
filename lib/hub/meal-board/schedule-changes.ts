'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { ScheduleChange } from './contracts'
import { hasMemberAccess, requireChefOrAdmin, resolveProfile } from './shared'

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
  profileToken?: string
  startDate: string
  endDate: string
}): Promise<ScheduleChange[]> {
  const db: any = createServerClient({ admin: true })
  if (!(await hasMemberAccess(db, input.groupId, input.profileToken))) return []

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

    const { data: change } = await db
      .from('hub_schedule_changes')
      .select('group_id')
      .eq('id', input.changeId)
      .single()
    if (!change) throw new Error('Schedule change not found')
    await requireChefOrAdmin(db, change.group_id, profile.id)

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

    const { data: change } = await db
      .from('hub_schedule_changes')
      .select('group_id')
      .eq('id', input.changeId)
      .single()
    if (!change) throw new Error('Schedule change not found')
    await requireChefOrAdmin(db, change.group_id, profile.id)

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
