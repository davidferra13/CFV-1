'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CircleCollaboratorRole,
  CircleCollaborator,
  CollaborationInvite,
} from './collaborator-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const InviteSchema = z.object({
  circleId: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['co_host', 'sous_chef', 'server', 'observer']),
})

const AcceptSchema = z.object({
  inviteId: z.string().uuid(),
})

const UpdateRoleSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['co_host', 'sous_chef', 'server', 'observer']),
})

const RemoveSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertCircleOwner(db: any, circleId: string, tenantId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) throw new Error('Circle not found or unauthorized')
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Invite a chef or staff member to collaborate on a circle.
 * Only the circle owner can send invitations.
 */
export async function inviteCollaborator(
  circleId: string,
  email: string,
  role: CircleCollaboratorRole
): Promise<{ success: boolean; error?: string }> {
  const parsed = InviteSchema.parse({ circleId, email, role })
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, parsed.circleId, user.tenantId!)

  // Look up the target chef by email
  const { data: targetChef } = await db
    .from('chefs')
    .select('id, auth_user_id, email')
    .eq('email', parsed.email.toLowerCase().trim())
    .maybeSingle()

  if (!targetChef || !targetChef.auth_user_id) {
    return { success: false, error: 'No chef account found for that email address' }
  }

  // Cannot invite yourself
  if (targetChef.auth_user_id === user.authUserId) {
    return { success: false, error: 'You cannot invite yourself to your own circle' }
  }

  // Check for existing collaborator row
  const { data: existing } = await db
    .from('circle_collaborators')
    .select('id, status')
    .eq('circle_id', parsed.circleId)
    .eq('user_id', targetChef.auth_user_id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return { success: false, error: 'This person is already a collaborator on this circle' }
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'An invitation is already pending for this person' }
    }
    // If removed, re-invite by updating the existing row
    await db
      .from('circle_collaborators')
      .update({
        role: parsed.role,
        status: 'pending',
        invited_by: user.authUserId,
        invited_at: new Date().toISOString(),
        accepted_at: null,
      })
      .eq('id', existing.id)

    revalidatePath('/dashboard')
    return { success: true }
  }

  // Insert new collaborator row
  const { error } = await db.from('circle_collaborators').insert({
    circle_id: parsed.circleId,
    user_id: targetChef.auth_user_id,
    role: parsed.role,
    invited_by: user.authUserId,
    status: 'pending',
  })

  if (error) {
    console.error('[inviteCollaborator]', error)
    return { success: false, error: 'Failed to send invitation' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Accept a collaboration invite. Called by the invited user.
 */
export async function acceptCollaboration(
  inviteId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = AcceptSchema.parse({ inviteId })
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the invite belongs to the caller and is pending
  const { data: invite, error: fetchErr } = await db
    .from('circle_collaborators')
    .select('id, circle_id, user_id, status')
    .eq('id', parsed.inviteId)
    .eq('user_id', user.authUserId)
    .single()

  if (fetchErr || !invite) {
    return { success: false, error: 'Invitation not found or access denied' }
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'This invitation has already been responded to' }
  }

  const { error } = await db
    .from('circle_collaborators')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', parsed.inviteId)

  if (error) {
    console.error('[acceptCollaboration]', error)
    return { success: false, error: 'Failed to accept invitation' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get all collaborators for a circle. Only the circle owner can view.
 */
export async function getCircleCollaborators(circleId: string): Promise<CircleCollaborator[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, circleId, user.tenantId!)

  const { data: rows, error } = await db
    .from('circle_collaborators')
    .select('id, circle_id, user_id, role, status, invited_by, invited_at, accepted_at')
    .eq('circle_id', circleId)
    .neq('status', 'removed')
    .order('invited_at', { ascending: true })

  if (error) {
    console.error('[getCircleCollaborators]', error)
    return []
  }

  return (rows || []) as CircleCollaborator[]
}

/**
 * Update a collaborator's role. Only the circle owner can change roles.
 */
export async function updateCollaboratorRole(
  circleId: string,
  userId: string,
  role: CircleCollaboratorRole
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateRoleSchema.parse({ circleId, userId, role })
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, parsed.circleId, user.tenantId!)

  const { error } = await db
    .from('circle_collaborators')
    .update({ role: parsed.role })
    .eq('circle_id', parsed.circleId)
    .eq('user_id', parsed.userId)
    .eq('status', 'active')

  if (error) {
    console.error('[updateCollaboratorRole]', error)
    return { success: false, error: 'Failed to update role' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Remove a collaborator from a circle. Only the circle owner can remove.
 */
export async function removeCollaborator(
  circleId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = RemoveSchema.parse({ circleId, userId })
  const user = await requireChef()
  const db: any = createServerClient()

  await assertCircleOwner(db, parsed.circleId, user.tenantId!)

  const { error } = await db
    .from('circle_collaborators')
    .update({ status: 'removed' })
    .eq('circle_id', parsed.circleId)
    .eq('user_id', parsed.userId)

  if (error) {
    console.error('[removeCollaborator]', error)
    return { success: false, error: 'Failed to remove collaborator' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get all circles where the current user is a collaborator (pending or active).
 */
export async function getMyCollaborations(): Promise<CollaborationInvite[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: rows, error } = await db
    .from('circle_collaborators')
    .select('id, circle_id, role, status, invited_by, invited_at')
    .eq('user_id', user.authUserId)
    .in('status', ['pending', 'active'])
    .order('invited_at', { ascending: false })

  if (error) {
    console.error('[getMyCollaborations]', error)
    return []
  }

  if (!rows || rows.length === 0) return []

  // Enrich with circle names and inviter names
  const circleIds = [...new Set(rows.map((r: any) => r.circle_id))]
  const inviterIds = [...new Set(rows.map((r: any) => r.invited_by))]

  const [circleResult, inviterResult] = await Promise.all([
    db.from('hub_groups').select('id, name').in('id', circleIds),
    db.from('chefs').select('auth_user_id, display_name').in('auth_user_id', inviterIds),
  ])

  const circleMap = new Map<string, string>()
  for (const c of circleResult.data || []) {
    circleMap.set(c.id, c.name)
  }

  const inviterMap = new Map<string, string | null>()
  for (const i of inviterResult.data || []) {
    inviterMap.set(i.auth_user_id, i.display_name)
  }

  return rows.map((r: any) => ({
    id: r.id,
    circle_id: r.circle_id,
    circle_name: circleMap.get(r.circle_id) || 'Unknown Circle',
    role: r.role as CircleCollaboratorRole,
    status: r.status,
    invited_by: r.invited_by,
    invited_by_name: inviterMap.get(r.invited_by) || null,
    invited_at: r.invited_at,
  })) as CollaborationInvite[]
}
