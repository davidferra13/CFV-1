'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CircleCollaborator,
  CollaboratorRole,
  CircleOperationResult,
  SharedIngredientItem,
} from './types'

// ---------------------------------------------------------------------------
// Multi-Host Collaboration Actions
// Uses the existing circle_collaborators table for co-host management.
// ---------------------------------------------------------------------------

async function requireOwnedCircle(db: any, circleId: string, tenantId: string) {
  const { data } = await db
    .from('hub_groups')
    .select('id, name, group_token')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()
  return data ?? null
}

async function verifyCircleAccess(db: any, circleId: string, tenantId: string, userId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, name, tenant_id')
    .eq('id', circleId)
    .single()
  if (!circle) return null
  if (circle.tenant_id === tenantId) return { circle, isOwner: true as const }
  const { data: myCollab } = await db
    .from('circle_collaborators')
    .select('id')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!myCollab) return null
  return { circle, isOwner: false as const }
}

/** Invite a co-host to a circle. */
export async function inviteCoHost(
  circleId: string,
  inviteeEmail: string,
  role: CollaboratorRole = 'co_host'
): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient({ admin: true })
    const validRoles: CollaboratorRole[] = ['co_host', 'sous_chef', 'server', 'observer']
    if (!validRoles.includes(role)) return { success: false, error: 'Invalid collaborator role' }
    const circle = await requireOwnedCircle(db, circleId, tenantId)
    if (!circle) return { success: false, error: 'Circle not found' }
    const email = inviteeEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return { success: false, error: 'Valid email is required' }
    const { data: inviteeUser } = await db
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()
    if (!inviteeUser) return { success: false, error: 'No account found for that email.' }
    if (inviteeUser.id === user.userId) return { success: false, error: 'Cannot invite yourself' }
    const { data: existing } = await db
      .from('circle_collaborators')
      .select('id, status')
      .eq('circle_id', circleId)
      .eq('user_id', inviteeUser.id)
      .maybeSingle()
    if (existing) {
      if (existing.status === 'active') return { success: false, error: 'Already a co-host' }
      if (existing.status === 'pending')
        return { success: false, error: 'Invitation already pending' }
      await db
        .from('circle_collaborators')
        .update({
          status: 'pending',
          role,
          invited_by: user.userId,
          invited_at: new Date().toISOString(),
          accepted_at: null,
        })
        .eq('id', existing.id)
      revalidatePath(`/circles/${circleId}`)
      return { success: true, circleId }
    }
    const { error: insertError } = await db.from('circle_collaborators').insert({
      circle_id: circleId,
      user_id: inviteeUser.id,
      role,
      invited_by: user.userId,
      status: 'pending',
    })
    if (insertError) return { success: false, error: 'Failed to send invitation' }
    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (chefProfileId) {
      await db.from('hub_messages').insert({
        group_id: circleId,
        author_profile_id: chefProfileId,
        message_type: 'system',
        body: `Co-host invitation sent to ${email} as ${role.replace('_', ' ')}.`,
        source: 'system',
      })
    }
    revalidatePath(`/circles/${circleId}`)
    return { success: true, circleId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Accept a co-host invitation. */
export async function acceptCoHostInvitation(
  collaboratorId: string
): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })
    const { data: collab } = await db
      .from('circle_collaborators')
      .select('id, circle_id, user_id')
      .eq('id', collaboratorId)
      .eq('user_id', user.userId)
      .eq('status', 'pending')
      .single()
    if (!collab) return { success: false, error: 'Invitation not found or already responded to' }
    await db
      .from('circle_collaborators')
      .update({ status: 'active', accepted_at: new Date().toISOString() })
      .eq('id', collaboratorId)
    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const coHostProfileId = await getChefHubProfileId(user.tenantId!)
    if (coHostProfileId) {
      const { data: existingMember } = await db
        .from('hub_group_members')
        .select('id')
        .eq('group_id', collab.circle_id)
        .eq('profile_id', coHostProfileId)
        .maybeSingle()
      if (!existingMember) {
        await db.from('hub_group_members').insert({
          group_id: collab.circle_id,
          profile_id: coHostProfileId,
          role: 'host',
          can_post: true,
          can_invite: true,
          can_pin: true,
          is_co_host: true,
        })
      }
      await db.from('hub_messages').insert({
        group_id: collab.circle_id,
        author_profile_id: coHostProfileId,
        message_type: 'system',
        body: 'A new co-host has joined the circle!',
        source: 'system',
      })
    }
    revalidatePath(`/circles/${collab.circle_id}`)
    return { success: true, circleId: collab.circle_id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Decline a co-host invitation. */
export async function declineCoHostInvitation(
  collaboratorId: string
): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })
    const { data: collab } = await db
      .from('circle_collaborators')
      .select('id, circle_id')
      .eq('id', collaboratorId)
      .eq('user_id', user.userId)
      .eq('status', 'pending')
      .single()
    if (!collab) return { success: false, error: 'Invitation not found' }
    await db.from('circle_collaborators').update({ status: 'removed' }).eq('id', collaboratorId)
    return { success: true, circleId: collab.circle_id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** Remove a co-host from a circle (owner only). */
export async function removeCoHost(
  circleId: string,
  collaboratorId: string
): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })
    const circle = await requireOwnedCircle(db, circleId, user.tenantId!)
    if (!circle) return { success: false, error: 'Circle not found' }
    const { data: collab } = await db
      .from('circle_collaborators')
      .select('id, user_id')
      .eq('id', collaboratorId)
      .eq('circle_id', circleId)
      .single()
    if (!collab) return { success: false, error: 'Co-host not found' }
    await db.from('circle_collaborators').update({ status: 'removed' }).eq('id', collaboratorId)
    // Remove co-host hub membership for this specific user
    const { data: collabUser } = await db
      .from('chefs')
      .select('auth_user_id')
      .eq('id', collab.user_id)
      .maybeSingle()
    if (collabUser?.auth_user_id) {
      const { data: profile } = await db
        .from('hub_guest_profiles')
        .select('id')
        .eq('auth_user_id', collabUser.auth_user_id)
        .maybeSingle()
      if (profile) {
        await db
          .from('hub_group_members')
          .delete()
          .eq('group_id', circleId)
          .eq('profile_id', profile.id)
          .eq('is_co_host', true)
      }
    }
    revalidatePath(`/circles/${circleId}`)
    return { success: true, circleId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** List all collaborators for a circle. */
export async function listCircleCollaborators(circleId: string): Promise<CircleCollaborator[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const access = await verifyCircleAccess(db, circleId, user.tenantId!, user.userId)
  if (!access) return []
  const { data: collabs } = await db
    .from('circle_collaborators')
    .select('id, circle_id, user_id, role, status, invited_by, invited_at, accepted_at')
    .eq('circle_id', circleId)
    .in('status', ['pending', 'active'])
    .order('invited_at', { ascending: true })
  if (!collabs?.length) return []
  const userIds = collabs.map((c: any) => c.user_id)
  const { data: users } = await db.from('users').select('id, email, name').in('id', userIds)
  const userMap = new Map<string, { name: string | null; email: string }>()
  for (const u of users ?? []) userMap.set(u.id, { name: u.name, email: u.email })
  return collabs.map((c: any) => {
    const ud = userMap.get(c.user_id)
    return {
      id: c.id,
      circleId: c.circle_id,
      userId: c.user_id,
      role: c.role,
      status: c.status,
      invitedBy: c.invited_by,
      invitedAt: c.invited_at,
      acceptedAt: c.accepted_at,
      displayName: ud?.name ?? 'Unknown',
      email: ud?.email ?? null,
    }
  })
}

/** Get pending co-host invitations for the authenticated chef. */
export async function getMyPendingInvitations(): Promise<CircleCollaborator[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const { data: collabs } = await db
    .from('circle_collaborators')
    .select('id, circle_id, user_id, role, status, invited_by, invited_at, accepted_at')
    .eq('user_id', user.userId)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false })
  return (collabs ?? []).map((c: any) => ({
    id: c.id,
    circleId: c.circle_id,
    userId: c.user_id,
    role: c.role,
    status: c.status,
    invitedBy: c.invited_by,
    invitedAt: c.invited_at,
    acceptedAt: c.accepted_at,
  }))
}

/** Get shared ingredient list across all events linked to a circle (visible to all co-hosts). */
export async function getSharedIngredientList(circleId: string): Promise<SharedIngredientItem[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const access = await verifyCircleAccess(db, circleId, user.tenantId!, user.userId)
  if (!access) return []
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)
  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)
  if (eventIds.length === 0) return []
  const { data: events } = await db
    .from('events')
    .select('id, title')
    .in('id', eventIds)
    .eq('tenant_id', access.circle.tenant_id)
  const titleMap: Record<string, string> = {}
  for (const e of events ?? []) titleMap[e.id] = e.title
  const ownedEventIds = Object.keys(titleMap)
  if (ownedEventIds.length === 0) return []
  const { data: lifecycle } = await db
    .from('event_ingredient_lifecycle')
    .select('*')
    .in('event_id', ownedEventIds)
  if (!lifecycle?.length) return []
  return (lifecycle as any[]).map((l: any) => ({
    ingredientId: l.ingredient_id,
    ingredientName: l.ingredient_name,
    unit: l.unit,
    totalQty: parseFloat(l.buy_qty || '0'),
    assignedTo: null,
    eventId: l.event_id,
    eventTitle: titleMap[l.event_id] ?? 'Unknown Event',
  }))
}

/** Broadcast a message to co-hosts only within a circle. */
export async function broadcastToCoHosts(
  circleId: string,
  message: string
): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const db: any = createServerClient({ admin: true })
    if (!message?.trim())
      return { success: false, recipientCount: 0, error: 'Message cannot be empty' }
    if (message.length > 500)
      return { success: false, recipientCount: 0, error: 'Message exceeds 500 characters' }
    const access = await verifyCircleAccess(db, circleId, tenantId, user.userId)
    if (!access) return { success: false, recipientCount: 0, error: 'Not authorized' }
    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const chefProfileId = await getChefHubProfileId(tenantId)
    if (!chefProfileId)
      return { success: false, recipientCount: 0, error: 'Chef profile not found' }
    const { data: coHosts } = await db
      .from('circle_collaborators')
      .select('user_id')
      .eq('circle_id', circleId)
      .eq('status', 'active')
    const count = coHosts?.length ?? 0
    if (count === 0) return { success: false, recipientCount: 0, error: 'No active co-hosts' }
    await db.from('hub_messages').insert({
      group_id: circleId,
      author_profile_id: chefProfileId,
      message_type: 'text',
      body: `[Co-Host] ${message.trim()}`,
      source: 'circle',
    })
    await db
      .from('hub_groups')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.trim().slice(0, 100),
      })
      .eq('id', circleId)
    revalidatePath(`/circles/${circleId}`)
    return { success: true, recipientCount: count }
  } catch (err) {
    return {
      success: false,
      recipientCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/** Update a co-host's role (owner only). */
export async function updateCoHostRole(
  circleId: string,
  collaboratorId: string,
  newRole: CollaboratorRole
): Promise<CircleOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })
    const validRoles: CollaboratorRole[] = ['co_host', 'sous_chef', 'server', 'observer']
    if (!validRoles.includes(newRole)) return { success: false, error: 'Invalid role' }
    const circle = await requireOwnedCircle(db, circleId, user.tenantId!)
    if (!circle) return { success: false, error: 'Circle not found' }
    const { error } = await db
      .from('circle_collaborators')
      .update({ role: newRole })
      .eq('id', collaboratorId)
      .eq('circle_id', circleId)
    if (error) return { success: false, error: 'Failed to update role' }
    revalidatePath(`/circles/${circleId}`)
    return { success: true, circleId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
