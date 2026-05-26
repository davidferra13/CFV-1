'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  SeriesHost,
  SeriesHostInviteInput,
  SeriesHostPermissions,
  SeriesOperationResult,
} from './types'

function mapHostRow(row: any): SeriesHost {
  return {
    id: row.id,
    seriesId: row.series_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    externalName: row.external_name,
    externalEmail: row.external_email,
    externalBio: row.external_bio,
    externalAvatarUrl: row.external_avatar_url,
    externalRole: row.external_role,
    displayName: row.display_name,
    displayRole: row.display_role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    websiteUrl: row.website_url,
    permissions: {
      canCreateEvents: row.can_create_events,
      canPublishPosts: row.can_publish_posts,
      canManageMembers: row.can_manage_members,
      canManageTickets: row.can_manage_tickets,
      canManageFinances: row.can_manage_finances,
      canEditSeries: row.can_edit_series,
    },
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    removedAt: row.removed_at,
  }
}

async function requireActiveHost(
  db: any,
  seriesId: string,
  userId: string
): Promise<SeriesHost | null> {
  const { data } = await db
    .from('series_hosts')
    .select('*')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data ? mapHostRow(data) : null
}

export async function inviteSeriesHost(
  input: SeriesHostInviteInput
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, input.seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to invite hosts' }
    }

    if (input.email) {
      const email = input.email.trim().toLowerCase()
      if (!email.includes('@')) return { success: false, error: 'Valid email required' }

      const { data: inviteeUser } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (inviteeUser) {
        if (inviteeUser.id === user.userId) {
          return { success: false, error: 'Cannot invite yourself' }
        }
        const { data: existing } = await db
          .from('series_hosts')
          .select('id, status')
          .eq('series_id', input.seriesId)
          .eq('user_id', inviteeUser.id)
          .maybeSingle()

        if (existing?.status === 'active') return { success: false, error: 'Already a host' }
        if (existing?.status === 'invited')
          return { success: false, error: 'Invitation already pending' }

        if (existing?.status === 'removed') {
          await db
            .from('series_hosts')
            .update({
              status: 'invited',
              display_name: input.displayName,
              display_role: input.displayRole,
              bio: input.bio ?? null,
              invited_at: new Date().toISOString(),
              accepted_at: null,
              removed_at: null,
            })
            .eq('id', existing.id)
          revalidatePath(`/series/${input.seriesId}`)
          return { success: true, seriesId: input.seriesId, hostId: existing.id }
        }

        const { data: inviteeChef } = await db
          .from('chefs')
          .select('id')
          .eq('auth_user_id', inviteeUser.id)
          .maybeSingle()

        const { data: newHost, error } = await db
          .from('series_hosts')
          .insert({
            series_id: input.seriesId,
            user_id: inviteeUser.id,
            tenant_id: inviteeChef?.id ?? null,
            display_name: input.displayName,
            display_role: input.displayRole,
            bio: input.bio ?? null,
            status: 'invited',
          })
          .select('id')
          .single()

        if (error) return { success: false, error: 'Failed to create invitation' }
        revalidatePath(`/series/${input.seriesId}`)
        return { success: true, seriesId: input.seriesId, hostId: newHost.id }
      }
    }

    if (input.externalName && input.externalEmail) {
      const extEmail = input.externalEmail.trim().toLowerCase()
      const { data: existing } = await db
        .from('series_hosts')
        .select('id, status')
        .eq('series_id', input.seriesId)
        .eq('external_email', extEmail)
        .maybeSingle()

      if (existing?.status === 'active') return { success: false, error: 'Already a host' }

      if (existing) {
        await db
          .from('series_hosts')
          .update({
            status: 'active',
            external_name: input.externalName,
            external_role: input.externalRole ?? null,
            display_name: input.displayName,
            display_role: input.displayRole,
            bio: input.bio ?? null,
            accepted_at: new Date().toISOString(),
            removed_at: null,
          })
          .eq('id', existing.id)
        revalidatePath(`/series/${input.seriesId}`)
        return { success: true, seriesId: input.seriesId, hostId: existing.id }
      }

      const { data: newHost, error } = await db
        .from('series_hosts')
        .insert({
          series_id: input.seriesId,
          external_name: input.externalName,
          external_email: extEmail,
          external_role: input.externalRole ?? null,
          display_name: input.displayName,
          display_role: input.displayRole,
          bio: input.bio ?? null,
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) return { success: false, error: 'Failed to add external host' }
      revalidatePath(`/series/${input.seriesId}`)
      return { success: true, seriesId: input.seriesId, hostId: newHost.id }
    }

    return { success: false, error: 'Either email or external name+email is required' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function acceptSeriesHostInvitation(seriesId: string): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const { data: invite } = await db
      .from('series_hosts')
      .select('id')
      .eq('series_id', seriesId)
      .eq('user_id', user.userId)
      .eq('status', 'invited')
      .maybeSingle()

    if (!invite) return { success: false, error: 'No pending invitation found' }

    await db
      .from('series_hosts')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const profileId = await getChefHubProfileId(user.tenantId!)
    if (profileId) {
      const { data: existingMember } = await db
        .from('hub_group_members')
        .select('id')
        .eq('group_id', seriesId)
        .eq('profile_id', profileId)
        .maybeSingle()
      if (!existingMember) {
        await db.from('hub_group_members').insert({
          group_id: seriesId,
          profile_id: profileId,
          role: 'host',
          can_post: true,
          can_invite: true,
          can_pin: true,
          is_co_host: true,
        })
      }
    }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, hostId: invite.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function removeSeriesHost(
  seriesId: string,
  hostId: string
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to remove hosts' }
    }
    if (myHost.id === hostId) return { success: false, error: 'Cannot remove yourself' }

    const { data: activeHosts } = await db
      .from('series_hosts')
      .select('id')
      .eq('series_id', seriesId)
      .eq('status', 'active')
    if ((activeHosts?.length ?? 0) <= 1) {
      return { success: false, error: 'Cannot remove the last host' }
    }

    await db
      .from('series_hosts')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
      })
      .eq('id', hostId)
      .eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSeriesHostPermissions(
  seriesId: string,
  hostId: string,
  permissions: Partial<SeriesHostPermissions>
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to manage hosts' }
    }

    const patch: Record<string, boolean> = {}
    if (permissions.canCreateEvents !== undefined)
      patch.can_create_events = permissions.canCreateEvents
    if (permissions.canPublishPosts !== undefined)
      patch.can_publish_posts = permissions.canPublishPosts
    if (permissions.canManageMembers !== undefined)
      patch.can_manage_members = permissions.canManageMembers
    if (permissions.canManageTickets !== undefined)
      patch.can_manage_tickets = permissions.canManageTickets
    if (permissions.canManageFinances !== undefined)
      patch.can_manage_finances = permissions.canManageFinances
    if (permissions.canEditSeries !== undefined) patch.can_edit_series = permissions.canEditSeries

    if (Object.keys(patch).length === 0) return { success: true, seriesId }

    await db
      .from('series_hosts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', hostId)
      .eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function listSeriesHosts(seriesId: string): Promise<SeriesHost[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const myHost = await requireActiveHost(db, seriesId, user.userId)
  if (!myHost) return []

  const { data: hosts } = await db
    .from('series_hosts')
    .select('*')
    .eq('series_id', seriesId)
    .in('status', ['active', 'invited'])
    .order('invited_at', { ascending: true })

  return (hosts ?? []).map(mapHostRow)
}

export async function updateSeriesHostProfile(
  seriesId: string,
  updates: {
    displayName?: string
    displayRole?: string
    bio?: string | null
    avatarUrl?: string | null
    websiteUrl?: string | null
  }
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.displayName !== undefined) patch.display_name = updates.displayName
    if (updates.displayRole !== undefined) patch.display_role = updates.displayRole
    if (updates.bio !== undefined) patch.bio = updates.bio
    if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl
    if (updates.websiteUrl !== undefined) patch.website_url = updates.websiteUrl

    await db.from('series_hosts').update(patch).eq('id', myHost.id).eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, hostId: myHost.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
