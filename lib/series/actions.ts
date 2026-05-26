'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { createDefaultSeriesConfig } from './defaults'
import type {
  SeriesCreateInput,
  SeriesConfig,
  SeriesSummary,
  SeriesHost,
  SeriesOperationResult,
} from './types'

async function requireSeriesHost(
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
  if (!data) return null
  return mapHostRow(data)
}

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

export async function createSeries(input: SeriesCreateInput): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const name = input.name.trim()
    if (!name || name.length < 1) return { success: false, error: 'Series name is required' }
    if (name.length > 100) return { success: false, error: 'Series name is too long' }

    if (input.slug) {
      const slug = input.slug.trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          error: 'Slug must be lowercase letters, numbers, and hyphens only',
        }
      }
      const { data: existingSlug } = await db
        .from('hub_groups')
        .select('id')
        .eq('series_slug', slug)
        .maybeSingle()
      if (existingSlug) return { success: false, error: 'That URL slug is already taken' }
    }

    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const chefProfileId = await getChefHubProfileId(user.tenantId!)
    if (!chefProfileId) return { success: false, error: 'Chef hub profile not found' }

    const config = createDefaultSeriesConfig({
      tagline: input.tagline,
      slug: input.slug ?? null,
    })

    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name,
        description: input.description?.trim() || null,
        group_type: 'series',
        tenant_id: null,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: input.visibility ?? 'public',
        series_config: config,
        series_slug: input.slug?.trim().toLowerCase() || null,
      })
      .select('id, group_token')
      .single()

    if (groupError || !group) {
      return { success: false, error: groupError?.message ?? 'Failed to create series' }
    }

    const { error: hostError } = await db.from('series_hosts').insert({
      series_id: group.id,
      user_id: user.userId,
      tenant_id: user.tenantId,
      display_name: user.email.split('@')[0],
      display_role: 'Chef',
      status: 'active',
      accepted_at: new Date().toISOString(),
    })

    if (hostError) {
      await db.from('hub_groups').delete().eq('id', group.id)
      return { success: false, error: 'Failed to set up host' }
    }

    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    revalidatePath('/circles')
    return { success: true, seriesId: group.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getSeries(seriesId: string): Promise<{
  id: string
  name: string
  description: string | null
  groupToken: string
  slug: string | null
  config: SeriesConfig
  isActive: boolean
  createdAt: string
  myHost: SeriesHost | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: g } = await db
    .from('hub_groups')
    .select('id, name, description, group_token, series_slug, series_config, is_active, created_at')
    .eq('id', seriesId)
    .eq('group_type', 'series')
    .single()

  if (!g) return null

  const myHost = await requireSeriesHost(db, seriesId, user.userId)
  if (!myHost) return null

  return {
    id: g.id,
    name: g.name,
    description: g.description,
    groupToken: g.group_token,
    slug: g.series_slug,
    config: g.series_config as SeriesConfig,
    isActive: g.is_active,
    createdAt: g.created_at,
    myHost,
  }
}

export async function listMySeries(): Promise<SeriesSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: hostRows } = await db
    .from('series_hosts')
    .select('series_id')
    .eq('user_id', user.userId)
    .eq('status', 'active')

  if (!hostRows?.length) return []

  const seriesIds = hostRows.map((r: any) => r.series_id)

  const { data: groups } = await db
    .from('hub_groups')
    .select('id, name, description, group_token, series_slug, series_config, is_active, created_at')
    .in('id', seriesIds)
    .eq('group_type', 'series')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!groups?.length) return []

  const groupIds = groups.map((g: any) => g.id)

  const { data: memberRows } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)
  const memberCounts = new Map<string, number>()
  for (const r of memberRows ?? []) {
    memberCounts.set(r.group_id, (memberCounts.get(r.group_id) ?? 0) + 1)
  }

  const { data: hostCounts } = await db
    .from('series_hosts')
    .select('series_id')
    .in('series_id', groupIds)
    .eq('status', 'active')
  const hostCountMap = new Map<string, number>()
  for (const r of hostCounts ?? []) {
    hostCountMap.set(r.series_id, (hostCountMap.get(r.series_id) ?? 0) + 1)
  }

  const { data: eventCounts } = await db
    .from('events')
    .select('series_circle_id')
    .in('series_circle_id', groupIds)
  const eventCountMap = new Map<string, number>()
  for (const r of eventCounts ?? []) {
    eventCountMap.set(r.series_circle_id, (eventCountMap.get(r.series_circle_id) ?? 0) + 1)
  }

  return groups.map((g: any) => {
    const config = g.series_config as SeriesConfig | null
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      slug: g.series_slug,
      groupToken: g.group_token,
      coverImageUrl: config?.coverImageUrl ?? null,
      tagline: config?.tagline ?? null,
      memberCount: memberCounts.get(g.id) ?? 0,
      hostCount: hostCountMap.get(g.id) ?? 0,
      eventCount: eventCountMap.get(g.id) ?? 0,
      isActive: g.is_active,
      createdAt: g.created_at,
    }
  })
}

export async function updateSeriesConfig(
  seriesId: string,
  configPatch: Partial<SeriesConfig>
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requireSeriesHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'Not a host of this series' }
    if (!host.permissions.canEditSeries)
      return { success: false, error: 'No permission to edit series' }

    const { data: existing } = await db
      .from('hub_groups')
      .select('series_config')
      .eq('id', seriesId)
      .single()
    if (!existing) return { success: false, error: 'Series not found' }

    const currentConfig = (existing.series_config ?? {}) as SeriesConfig
    const newConfig = { ...currentConfig, ...configPatch }

    if (configPatch.slug !== undefined) {
      const slug = configPatch.slug?.trim().toLowerCase() || null
      if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          error: 'Slug must be lowercase letters, numbers, and hyphens only',
        }
      }
      if (slug) {
        const { data: taken } = await db
          .from('hub_groups')
          .select('id')
          .eq('series_slug', slug)
          .neq('id', seriesId)
          .maybeSingle()
        if (taken) return { success: false, error: 'That URL slug is already taken' }
      }
      await db.from('hub_groups').update({ series_slug: slug }).eq('id', seriesId)
    }

    const { error } = await db
      .from('hub_groups')
      .update({
        series_config: newConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seriesId)

    if (error) return { success: false, error: 'Failed to update config' }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSeriesDetails(
  seriesId: string,
  updates: { name?: string; description?: string | null }
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requireSeriesHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'Not a host of this series' }
    if (!host.permissions.canEditSeries)
      return { success: false, error: 'No permission to edit series' }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) {
      const name = updates.name.trim()
      if (!name) return { success: false, error: 'Name is required' }
      patch.name = name
    }
    if (updates.description !== undefined) {
      patch.description = updates.description?.trim() || null
    }

    const { error } = await db.from('hub_groups').update(patch).eq('id', seriesId)
    if (error) return { success: false, error: 'Failed to update series' }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
