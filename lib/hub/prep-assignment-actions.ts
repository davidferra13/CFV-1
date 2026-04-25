'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Helpers (reused from meal-board-actions pattern)
// ---------------------------------------------------------------------------

async function resolveProfile(db: any, profileToken: string) {
  const { data, error } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', profileToken)
    .maybeSingle()
  if (error || !data) throw new Error('Profile not found')
  return data as { id: string; display_name: string }
}

async function requireChefOrAdmin(db: any, groupId: string, profileId: string) {
  const { data, error } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error || !data) throw new Error('Not a member of this circle')
  if (!['owner', 'admin', 'chef'].includes(data.role)) {
    throw new Error('Only circle owners, admins, or chefs can manage assignments')
  }
}

// ---------------------------------------------------------------------------
// Assign a member to a meal
// ---------------------------------------------------------------------------

const AssignSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(), // caller (must be chef/admin)
  mealEntryId: z.string().uuid(),
  assigneeProfileId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function assignMemberToMeal(
  input: z.infer<typeof AssignSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const v = AssignSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    // Auth: caller must be chef/admin
    const caller = await resolveProfile(db, v.profileToken)
    await requireChefOrAdmin(db, v.groupId, caller.id)

    // Verify meal entry belongs to this group
    const { data: meal, error: mealErr } = await db
      .from('hub_meal_board')
      .select('id, group_id')
      .eq('id', v.mealEntryId)
      .eq('group_id', v.groupId)
      .maybeSingle()
    if (mealErr || !meal) throw new Error('Meal entry not found in this circle')

    // Get assignee display name
    const { data: assignee, error: assigneeErr } = await db
      .from('hub_guest_profiles')
      .select('id, display_name')
      .eq('id', v.assigneeProfileId)
      .maybeSingle()
    if (assigneeErr || !assignee) throw new Error('Assignee profile not found')

    // Verify assignee is a member of this circle
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', v.groupId)
      .eq('profile_id', v.assigneeProfileId)
      .maybeSingle()
    if (!membership) throw new Error('Assignee is not a member of this circle')

    // Update the meal entry
    const { error: updateErr } = await db
      .from('hub_meal_board')
      .update({
        assigned_profile_id: v.assigneeProfileId,
        assigned_display_name: assignee.display_name,
        assignment_notes: v.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', v.mealEntryId)

    if (updateErr) throw new Error(`Failed to assign: ${updateErr.message}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Assignment failed' }
  }
}

// ---------------------------------------------------------------------------
// Remove assignment from a meal
// ---------------------------------------------------------------------------

const UnassignSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  mealEntryId: z.string().uuid(),
})

export async function unassignMemberFromMeal(
  input: z.infer<typeof UnassignSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const v = UnassignSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const caller = await resolveProfile(db, v.profileToken)
    await requireChefOrAdmin(db, v.groupId, caller.id)

    const { error: updateErr } = await db
      .from('hub_meal_board')
      .update({
        assigned_profile_id: null,
        assigned_display_name: null,
        assignment_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', v.mealEntryId)
      .eq('group_id', v.groupId)

    if (updateErr) throw new Error(`Failed to unassign: ${updateErr.message}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unassign failed' }
  }
}

// ---------------------------------------------------------------------------
// Get assignable members for a circle (for the dropdown)
// ---------------------------------------------------------------------------

export async function getAssignableMembers(
  groupId: string
): Promise<{ profileId: string; displayName: string }[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_group_members')
    .select('profile_id, hub_guest_profiles!inner(id, display_name)')
    .eq('group_id', groupId)
    .in('role', ['member', 'viewer', 'admin', 'owner', 'chef'])

  if (error || !data) return []

  return (data as any[])
    .filter((row: any) => row.hub_guest_profiles?.display_name)
    .map((row: any) => ({
      profileId: row.profile_id,
      displayName: row.hub_guest_profiles.display_name,
    }))
}

// ---------------------------------------------------------------------------
// Get my meal assignments for a circle (member view)
// ---------------------------------------------------------------------------

const MyAssignmentsSchema = z.object({
  groupId: z.string().uuid(),
  groupToken: z.string(),
  profileToken: z.string().uuid(),
})

export async function getMyMealAssignments(input: z.infer<typeof MyAssignmentsSchema>): Promise<{
  assignments: Array<{
    id: string
    meal_date: string
    meal_type: string
    title: string
    description: string | null
    assignment_notes: string | null
    serving_time: string | null
    status: string
  }>
}> {
  const v = MyAssignmentsSchema.parse(input)
  const db: any = createServerClient({ admin: true })

  // Verify circle access
  const { data: group, error: groupErr } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', v.groupId)
    .eq('group_token', v.groupToken)
    .maybeSingle()
  if (groupErr || !group) throw new Error('Circle not found')

  // Resolve profile
  const profile = await resolveProfile(db, v.profileToken)

  // Get assignments for the next 14 days
  const today = new Date()
  const twoWeeksOut = new Date(today)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  const startDate = today.toISOString().split('T')[0]
  const endDate = twoWeeksOut.toISOString().split('T')[0]

  const { data, error } = await db
    .from('hub_meal_board')
    .select('id, meal_date, meal_type, title, description, assignment_notes, serving_time, status')
    .eq('group_id', v.groupId)
    .eq('assigned_profile_id', profile.id)
    .neq('status', 'cancelled')
    .gte('meal_date', startDate)
    .lte('meal_date', endDate)
    .order('meal_date', { ascending: true })

  if (error) throw new Error(`Failed to load assignments: ${error.message}`)

  return { assignments: data ?? [] }
}
