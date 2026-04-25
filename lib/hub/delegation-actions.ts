'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Delegation: assign an assistant to operate circles on behalf of a client
// ---------------------------------------------------------------------------

const AssignDelegateSchema = z.object({
  delegateProfileId: z.string().uuid(),
  onBehalfOfProfileId: z.string().uuid(),
  groupId: z.string().uuid(),
})

/**
 * Add a delegate (assistant) to a single circle on behalf of a client.
 * The delegate gets 'admin' role with on_behalf_of attribution.
 */
export async function assignDelegateToCircle(
  input: z.infer<typeof AssignDelegateSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const validated = AssignDelegateSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Verify the on_behalf_of profile exists
  const { data: targetProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('id', validated.onBehalfOfProfileId)
    .maybeSingle()

  if (!targetProfile) {
    return { success: false, error: 'Target profile not found' }
  }

  // Verify delegate profile exists
  const { data: delegateProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('id', validated.delegateProfileId)
    .maybeSingle()

  if (!delegateProfile) {
    return { success: false, error: 'Delegate profile not found' }
  }

  // Check if delegate is already a member
  const { data: existing } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', validated.groupId)
    .eq('profile_id', validated.delegateProfileId)
    .maybeSingle()

  if (existing) {
    // Update existing membership with delegation attribution
    const { error } = await db
      .from('hub_group_members')
      .update({
        on_behalf_of_profile_id: validated.onBehalfOfProfileId,
        role: 'admin',
        can_post: true,
        can_invite: true,
        can_pin: true,
      })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Add delegate as new member with attribution
    const { error } = await db.from('hub_group_members').insert({
      group_id: validated.groupId,
      profile_id: validated.delegateProfileId,
      role: 'admin',
      can_post: true,
      can_invite: true,
      can_pin: true,
      on_behalf_of_profile_id: validated.onBehalfOfProfileId,
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

/**
 * Bulk-assign a delegate to ALL circles where the target client is a member.
 * Used when a client says "my assistant handles everything."
 */
export async function bulkAssignDelegate(input: {
  delegateProfileId: string
  onBehalfOfProfileId: string
}): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  // Find all circles where the target profile is a member
  const { data: clientMemberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', input.onBehalfOfProfileId)

  if (!clientMemberships || clientMemberships.length === 0) {
    return { success: true, assignedCount: 0 }
  }

  let assignedCount = 0

  for (const membership of clientMemberships) {
    const result = await assignDelegateToCircle({
      delegateProfileId: input.delegateProfileId,
      onBehalfOfProfileId: input.onBehalfOfProfileId,
      groupId: membership.group_id,
    })
    if (result.success) assignedCount++
  }

  return { success: true, assignedCount }
}

/**
 * Get all delegates for a given profile across all circles.
 */
export async function getDelegatesForProfile(profileId: string): Promise<{
  delegates: { profileId: string; displayName: string; circleCount: number }[]
}> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  const { data: delegateMembers } = await db
    .from('hub_group_members')
    .select('profile_id, hub_guest_profiles!inner(display_name)')
    .eq('on_behalf_of_profile_id', profileId)

  if (!delegateMembers || delegateMembers.length === 0) {
    return { delegates: [] }
  }

  // Group by delegate profile
  const grouped = new Map<string, { displayName: string; count: number }>()
  for (const m of delegateMembers) {
    const pid = m.profile_id
    const existing = grouped.get(pid)
    const name = (m as any).hub_guest_profiles?.display_name || 'Unknown'
    if (existing) {
      existing.count++
    } else {
      grouped.set(pid, { displayName: name, count: 1 })
    }
  }

  return {
    delegates: Array.from(grouped.entries()).map(([profileId, data]) => ({
      profileId,
      displayName: data.displayName,
      circleCount: data.count,
    })),
  }
}
