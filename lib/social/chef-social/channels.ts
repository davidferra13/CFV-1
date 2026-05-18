'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import type { SocialChannel } from './types'

// ============================================================
// CHANNELS
// ============================================================

export async function listChannels(input: { category?: string } = {}): Promise<SocialChannel[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  let query = db
    .from('chef_social_channels')
    .select('*')
    .eq('visibility', 'public')
    .order('is_official', { ascending: false })
    .order('member_count', { ascending: false })

  if (input.category) query = query.eq('category', input.category)

  const { data: channels } = await query
  if (!channels?.length) return []

  // Get membership status for current chef
  const channelIds = (channels as any[]).map((c) => c.id)
  const { data: memberships } = await db
    .from('chef_channel_memberships')
    .select('channel_id, notifications_enabled')
    .eq('chef_id', user.entityId)
    .in('channel_id', channelIds)

  const memberMap = new Map<string, { notifications_enabled: boolean }>()
  for (const m of (memberships || []) as any[]) {
    memberMap.set(m.channel_id, { notifications_enabled: m.notifications_enabled })
  }

  return (channels as any[]).map((ch) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    description: ch.description,
    icon: ch.icon,
    color: ch.color,
    category: ch.category,
    is_official: ch.is_official,
    member_count: ch.member_count,
    post_count: ch.post_count,
    visibility: ch.visibility,
    is_member: memberMap.has(ch.id),
    notifications_enabled: memberMap.get(ch.id)?.notifications_enabled ?? false,
  }))
}

export async function joinChannel(channelId: string) {
  const user = await requireChef()
  z.string().uuid().parse(channelId)
  const db = createServerClient({ admin: true })

  await db
    .from('chef_channel_memberships')
    .upsert({ channel_id: channelId, chef_id: user.entityId }, { onConflict: 'channel_id,chef_id' })

  revalidatePath('/network/channels')
  return { success: true }
}

export async function leaveChannel(channelId: string) {
  const user = await requireChef()
  z.string().uuid().parse(channelId)
  const db = createServerClient({ admin: true })

  await db
    .from('chef_channel_memberships')
    .delete()
    .eq('channel_id', channelId)
    .eq('chef_id', user.entityId)

  revalidatePath('/network/channels')
  return { success: true }
}

export async function getMyChannels(): Promise<SocialChannel[]> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const { data: memberships } = await db
    .from('chef_channel_memberships')
    .select('channel_id, notifications_enabled')
    .eq('chef_id', user.entityId)

  if (!memberships?.length) return []

  const channelIds = (memberships as any[]).map((m) => m.channel_id)
  const memberMap = new Map(
    (memberships as any[]).map((m) => [m.channel_id, m.notifications_enabled])
  )

  const { data: channels } = await db.from('chef_social_channels').select('*').in('id', channelIds)

  return (channels || []).map((ch: any) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    description: ch.description,
    icon: ch.icon,
    color: ch.color,
    category: ch.category,
    is_official: ch.is_official,
    member_count: ch.member_count,
    post_count: ch.post_count,
    visibility: ch.visibility,
    is_member: true,
    notifications_enabled: memberMap.get(ch.id) ?? true,
  }))
}
