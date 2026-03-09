'use server'

import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Share Card Actions
// Create, fetch, and deactivate social share cards for dinner circles.
// Share cards are frozen snapshots of a circle experience, safe for public viewing.
// ---------------------------------------------------------------------------

export interface ShareCardSnapshot {
  group_name: string
  group_emoji: string | null
  theme_name: string | null
  theme_colors: { primary: string; secondary: string; accent: string } | null
  chef_name: string | null
  chef_business: string | null
  occasion: string | null
  event_date: string | null
  guest_count: number | null
  courses: { name: string; dishes: string[] }[]
  photos: { url: string; caption: string | null }[]
  cover_image_url: string | null
}

export interface ShareCard {
  id: string
  share_token: string
  group_id: string
  event_id: string | null
  created_by_profile_id: string
  included_content: {
    menu: boolean
    chef: boolean
    theme: boolean
    photos: boolean
    photo_ids?: string[]
  }
  snapshot: ShareCardSnapshot
  is_active: boolean
  created_at: string
}

/**
 * Create a share card with a frozen snapshot of the selected content.
 */
export async function createShareCard(input: {
  groupId: string
  profileToken: string
  includeMenu: boolean
  includeChef: boolean
  includeTheme: boolean
  includePhotos: boolean
  selectedPhotoIds?: string[]
}): Promise<{ success: boolean; shareToken?: string; error?: string }> {
  const supabase = createServerClient({ admin: true })

  // Verify the caller is a member of the group
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return { success: false, error: 'Invalid profile' }

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('role')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) return { success: false, error: 'You are not a member of this circle' }

  // Load the group
  const { data: group } = await supabase
    .from('hub_groups')
    .select('*, event_themes(*)')
    .eq('id', input.groupId)
    .single()

  if (!group) return { success: false, error: 'Circle not found' }

  // Build the snapshot
  const snapshot: ShareCardSnapshot = {
    group_name: group.name,
    group_emoji: group.emoji,
    theme_name: null,
    theme_colors: null,
    chef_name: null,
    chef_business: null,
    occasion: null,
    event_date: null,
    guest_count: null,
    courses: [],
    photos: [],
    cover_image_url: group.cover_image_url,
  }

  // Theme
  if (input.includeTheme && group.event_themes) {
    const theme = group.event_themes as Record<string, unknown>
    snapshot.theme_name = (theme.name as string) ?? null
    snapshot.theme_colors = {
      primary: (theme.primary_color as string) ?? '#e88f47',
      secondary: (theme.secondary_color as string) ?? '#1c1917',
      accent: (theme.accent_color as string) ?? '#fbbf24',
    }
  }

  // Chef info
  if (input.includeChef && group.tenant_id) {
    const { data: chef } = await supabase
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', group.tenant_id)
      .single()

    if (chef) {
      snapshot.chef_name = chef.display_name
      snapshot.chef_business = chef.business_name
    }
  }

  // Event data (occasion, date, guest count, menus)
  let eventId: string | null = null

  if (group.event_id) {
    eventId = group.event_id
  } else {
    // Check hub_group_events for a linked event
    const { data: linkedEvent } = await supabase
      .from('hub_group_events')
      .select('event_id')
      .eq('group_id', input.groupId)
      .limit(1)
      .single()

    eventId = linkedEvent?.event_id ?? null
  }

  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('occasion, event_date, guest_count')
      .eq('id', eventId)
      .single()

    if (event) {
      snapshot.occasion = event.occasion
      snapshot.event_date = event.event_date
      snapshot.guest_count = event.guest_count
    }

    // Menu snapshot
    if (input.includeMenu) {
      const { data: menus } = await supabase
        .from('menus')
        .select('id, name')
        .eq('event_id', eventId)

      for (const menu of menus ?? []) {
        const { data: courses } = await supabase
          .from('menu_courses')
          .select('id, name, display_order')
          .eq('menu_id', menu.id)
          .order('display_order', { ascending: true })

        for (const course of courses ?? []) {
          const { data: dishes } = await supabase
            .from('menu_dishes')
            .select('name')
            .eq('course_id', course.id)
            .order('display_order', { ascending: true })

          snapshot.courses.push({
            name: course.name,
            dishes: (dishes ?? []).map((d) => d.name),
          })
        }
      }
    }
  }

  // Photos
  if (input.includePhotos) {
    let photoQuery = supabase
      .from('hub_media')
      .select('id, storage_path, caption')
      .eq('group_id', input.groupId)

    if (input.selectedPhotoIds?.length) {
      photoQuery = photoQuery.in('id', input.selectedPhotoIds)
    }

    const { data: photos } = await photoQuery.limit(12)

    for (const photo of photos ?? []) {
      // Build public URL from storage path
      const { data: urlData } = supabase.storage
        .from('hub-media')
        .getPublicUrl(photo.storage_path)

      snapshot.photos.push({
        url: urlData?.publicUrl ?? '',
        caption: photo.caption,
      })
    }
  }

  // Insert the share card
  const { data: card, error } = await supabase
    .from('hub_share_cards' as any)
    .insert({
      group_id: input.groupId,
      event_id: eventId,
      created_by_profile_id: profile.id,
      included_content: {
        menu: input.includeMenu,
        chef: input.includeChef,
        theme: input.includeTheme,
        photos: input.includePhotos,
        photo_ids: input.selectedPhotoIds ?? [],
      },
      snapshot,
    })
    .select('share_token')
    .single()

  if (error) return { success: false, error: `Failed to create share card: ${error.message}` }

  return { success: true, shareToken: card.share_token }
}

/**
 * Fetch a share card by its public token. No auth required.
 */
export async function getShareCard(shareToken: string): Promise<ShareCard | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('hub_share_cards' as any)
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as ShareCard
}

/**
 * Deactivate a share card. Only the creator or group owner/admin can do this.
 */
export async function deactivateShareCard(input: {
  cardId: string
  profileToken: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return { success: false, error: 'Invalid profile' }

  // Load the card
  const { data: card } = await supabase
    .from('hub_share_cards' as any)
    .select('id, group_id, created_by_profile_id')
    .eq('id', input.cardId)
    .single()

  if (!card) return { success: false, error: 'Share card not found' }

  // Check permission: creator or group admin
  const isCreator = card.created_by_profile_id === profile.id

  if (!isCreator) {
    const { data: membership } = await supabase
      .from('hub_group_members')
      .select('role')
      .eq('group_id', card.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin', 'chef'].includes(membership.role)) {
      return { success: false, error: 'Only the creator or group admin can deactivate this share' }
    }
  }

  const { error } = await supabase
    .from('hub_share_cards' as any)
    .update({ is_active: false })
    .eq('id', input.cardId)

  if (error) return { success: false, error: `Failed to deactivate: ${error.message}` }

  return { success: true }
}

/**
 * Get all active share cards for a group.
 */
export async function getGroupShareCards(input: {
  groupId: string
  profileToken: string
}): Promise<ShareCard[]> {
  const supabase = createServerClient({ admin: true })

  // Verify membership
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) return []

  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('id')
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) return []

  const { data } = await supabase
    .from('hub_share_cards' as any)
    .select('*')
    .eq('group_id', input.groupId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (data ?? []) as ShareCard[]
}
