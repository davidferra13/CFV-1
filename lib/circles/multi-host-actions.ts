'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CoHostRole,
  CoHostPermissions,
  CircleCoHost,
  CoHostInvite,
  SharedIngredientItem,
} from './multi-host-types'
import { DEFAULT_PERMISSIONS } from './multi-host-types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PermissionsSchema = z.object({
  canEditEvents: z.boolean(),
  canManageGuests: z.boolean(),
  canPostBroadcasts: z.boolean(),
  canManageIngredients: z.boolean(),
})

const InviteCoHostSchema = z.object({
  circleId: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['co-host', 'collaborator', 'viewer']),
  permissions: PermissionsSchema.optional(),
})

const AcceptInviteSchema = z.object({
  inviteId: z.string().uuid(),
})

const UpdatePermissionsSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
  permissions: PermissionsSchema,
})

const RemoveCoHostSchema = z.object({
  circleId: z.string().uuid(),
  userId: z.string().uuid(),
})

const GetCoHostsSchema = z.object({
  circleId: z.string().uuid(),
})

const SharedIngredientSchema = z.object({
  circleId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertCircleOwnerOrCoHost(
  db: any,
  circleId: string,
  tenantId: string,
  userId: string
): Promise<'owner' | 'co-host'> {
  // Check ownership first
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (circle) return 'owner'

  // Check if user is an active co-host with appropriate role
  const { data: coHost } = await db
    .from('circle_co_hosts')
    .select('id, role')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .in('role', ['co-host'])
    .maybeSingle()

  if (coHost) return 'co-host'

  throw new Error('Circle not found or unauthorized')
}

async function assertCircleOwner(db: any, circleId: string, tenantId: string) {
  const { data: circle } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) throw new Error('Circle not found or unauthorized')
}

function normalizePermissions(
  role: CoHostRole,
  permissions?: CoHostPermissions | null
): CoHostPermissions {
  if (permissions) return permissions
  return DEFAULT_PERMISSIONS[role]
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Invite a user to a circle as a co-host with specified role and permissions.
 * Only the circle owner can send co-host invitations.
 */
export async function inviteCoHost(
  input: z.infer<typeof InviteCoHostSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = InviteCoHostSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  if (!user.tenantId) {
    return { success: false, error: 'Tenant context required' }
  }

  await assertCircleOwner(db, parsed.circleId, user.tenantId)

  // Find target user by email
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
    return { success: false, error: 'You cannot invite yourself as a co-host' }
  }

  // Check for existing co-host row
  const { data: existing } = await db
    .from('circle_co_hosts')
    .select('id, accepted_at')
    .eq('circle_id', parsed.circleId)
    .eq('user_id', targetChef.auth_user_id)
    .maybeSingle()

  const permissions = normalizePermissions(parsed.role, parsed.permissions ?? null)

  if (existing) {
    if (existing.accepted_at) {
      return { success: false, error: 'This person is already a co-host on this circle' }
    }
    // Re-invite: update existing pending row
    const { error } = await db
      .from('circle_co_hosts')
      .update({
        role: parsed.role,
        permissions,
        invited_by: user.authUserId,
        invited_at: new Date().toISOString(),
        accepted_at: null,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('[inviteCoHost] re-invite failed:', error)
      return { success: false, error: 'Failed to resend invitation' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  }

  // Insert new co-host row
  const { error } = await db.from('circle_co_hosts').insert({
    circle_id: parsed.circleId,
    user_id: targetChef.auth_user_id,
    role: parsed.role,
    permissions,
    invited_by: user.authUserId,
    tenant_id: user.tenantId,
  })

  if (error) {
    console.error('[inviteCoHost]', error)
    return { success: false, error: 'Failed to send co-host invitation' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Accept a pending co-host invitation. Called by the invited user.
 */
export async function acceptCoHostInvite(
  input: z.infer<typeof AcceptInviteSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = AcceptInviteSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the invite belongs to the caller and is pending
  const { data: invite, error: fetchErr } = await db
    .from('circle_co_hosts')
    .select('id, circle_id, user_id, accepted_at')
    .eq('id', parsed.inviteId)
    .eq('user_id', user.authUserId)
    .single()

  if (fetchErr || !invite) {
    return { success: false, error: 'Invitation not found or access denied' }
  }

  if (invite.accepted_at) {
    return { success: false, error: 'This invitation has already been accepted' }
  }

  const { error } = await db
    .from('circle_co_hosts')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', parsed.inviteId)

  if (error) {
    console.error('[acceptCoHostInvite]', error)
    return { success: false, error: 'Failed to accept invitation' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Update permissions for an existing co-host. Only the circle owner can modify permissions.
 */
export async function updateCoHostPermissions(
  input: z.infer<typeof UpdatePermissionsSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdatePermissionsSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  if (!user.tenantId) {
    return { success: false, error: 'Tenant context required' }
  }

  await assertCircleOwner(db, parsed.circleId, user.tenantId)

  const { error } = await db
    .from('circle_co_hosts')
    .update({ permissions: parsed.permissions })
    .eq('circle_id', parsed.circleId)
    .eq('user_id', parsed.userId)
    .not('accepted_at', 'is', null)

  if (error) {
    console.error('[updateCoHostPermissions]', error)
    return { success: false, error: 'Failed to update permissions' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Remove a co-host from a circle. Only the circle owner can remove co-hosts.
 * Performs a soft delete by removing the row.
 */
export async function removeCoHost(
  input: z.infer<typeof RemoveCoHostSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = RemoveCoHostSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  if (!user.tenantId) {
    return { success: false, error: 'Tenant context required' }
  }

  await assertCircleOwner(db, parsed.circleId, user.tenantId)

  // Cannot remove yourself (as owner, you are not in co-hosts)
  if (parsed.userId === user.authUserId) {
    return { success: false, error: 'Cannot remove yourself from a circle you own' }
  }

  const { error } = await db
    .from('circle_co_hosts')
    .delete()
    .eq('circle_id', parsed.circleId)
    .eq('user_id', parsed.userId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[removeCoHost]', error)
    return { success: false, error: 'Failed to remove co-host' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * List all co-hosts for a circle. Accessible by circle owner or active co-hosts.
 */
export async function getCircleCoHosts(
  input: z.infer<typeof GetCoHostsSchema>
): Promise<CircleCoHost[]> {
  const parsed = GetCoHostsSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  if (!user.tenantId) return []

  await assertCircleOwnerOrCoHost(db, parsed.circleId, user.tenantId, user.authUserId)

  const { data: rows, error } = await db
    .from('circle_co_hosts')
    .select(
      'id, circle_id, user_id, role, permissions, invited_by, invited_at, accepted_at, tenant_id'
    )
    .eq('circle_id', parsed.circleId)
    .eq('tenant_id', user.tenantId)
    .order('invited_at', { ascending: true })

  if (error) {
    console.error('[getCircleCoHosts]', error)
    return []
  }

  if (!rows || rows.length === 0) return []

  // Enrich with chef profile data
  const userIds = [...new Set(rows.map((r: any) => r.user_id))]
  const { data: profiles } = await db
    .from('chefs')
    .select('auth_user_id, display_name, email, profile_image_url')
    .in('auth_user_id', userIds)

  const profileMap = new Map<
    string,
    { displayName: string | null; email: string | null; profileImageUrl: string | null }
  >()
  for (const p of profiles || []) {
    profileMap.set(p.auth_user_id, {
      displayName: p.display_name,
      email: p.email,
      profileImageUrl: p.profile_image_url,
    })
  }

  return rows.map((r: any) => {
    const profile = profileMap.get(r.user_id)
    return {
      id: r.id,
      circleId: r.circle_id,
      userId: r.user_id,
      role: r.role as CoHostRole,
      permissions: r.permissions as CoHostPermissions,
      invitedBy: r.invited_by,
      invitedAt: r.invited_at,
      acceptedAt: r.accepted_at,
      tenantId: r.tenant_id,
      displayName: profile?.displayName ?? null,
      email: profile?.email ?? null,
      profileImageUrl: profile?.profileImageUrl ?? null,
    } satisfies CircleCoHost
  })
}

/**
 * Get shared ingredient lists between co-hosts for a circle.
 * Pulls from the circle's adaptive sourcing config and maps
 * ingredient allocations to co-host assignments.
 */
export async function getSharedIngredientList(
  input: z.infer<typeof SharedIngredientSchema>
): Promise<SharedIngredientItem[]> {
  const parsed = SharedIngredientSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  if (!user.tenantId) return []

  await assertCircleOwnerOrCoHost(db, parsed.circleId, user.tenantId, user.authUserId)

  // Find events linked to this circle
  const eventFilter = parsed.eventId ? { event_id: parsed.eventId } : null

  // Get circle events
  const circleEventsQuery = db
    .from('hub_group_members')
    .select('entity_id')
    .eq('hub_group_id', parsed.circleId)
    .eq('entity_type', 'event')

  const { data: memberRows } = await circleEventsQuery

  if (!memberRows || memberRows.length === 0) return []

  const eventIds = eventFilter ? [parsed.eventId!] : memberRows.map((m: any) => m.entity_id)

  // Fetch circle configs for those events
  const { data: shareRows } = await db
    .from('event_share_settings')
    .select('event_id, circle_config')
    .in('event_id', eventIds)
    .eq('tenant_id', user.tenantId)

  if (!shareRows || shareRows.length === 0) return []

  // Aggregate ingredient items from adaptive configs
  const items: SharedIngredientItem[] = []
  const coHostsResult = await getCircleCoHosts({ circleId: parsed.circleId })
  const coHostMap = new Map<string, string>()
  for (const ch of coHostsResult) {
    coHostMap.set(ch.userId, ch.displayName ?? ch.email ?? 'Unknown')
  }

  for (const row of shareRows) {
    const config = row.circle_config as any
    const adaptive = config?.adaptive
    if (!adaptive?.availabilityItems) continue

    for (const item of adaptive.availabilityItems) {
      const assignedUserId = item.allocatedTo ?? null
      items.push({
        ingredient: item.ingredient,
        quantity: item.quantity ?? null,
        assignedToUserId: assignedUserId,
        assignedToName: assignedUserId ? (coHostMap.get(assignedUserId) ?? null) : null,
        status: item.status === 'confirmed' ? 'acquired' : assignedUserId ? 'claimed' : 'needed',
        notes: item.flavorRole ?? null,
      })
    }
  }

  return items
}
