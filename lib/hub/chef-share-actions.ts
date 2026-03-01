'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateClientHubProfile } from './client-hub-actions'
import type { HubGuestProfile } from './types'

// ---------------------------------------------------------------------------
// Chef Sharing — recommend chefs to friends
// ---------------------------------------------------------------------------

export interface ShareableChef {
  id: string
  business_name: string
  slug: string | null
  city: string | null
  specialty: string | null
  event_count: number
}

export interface ChefRecommendation {
  id: string
  chef_id: string
  chef_business_name: string
  chef_slug: string | null
  from_profile_id: string
  from_display_name: string
  to_profile_id: string
  message: string | null
  created_at: string
}

/**
 * Get chefs the client has worked with (via events).
 */
export async function getMyChefsToShare(): Promise<ShareableChef[]> {
  const user = await requireClient()
  const supabase = createServerClient({ admin: true })

  // Get all events for this client → distinct chefs
  const { data: events } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('client_id', user.entityId)
    .neq('status', 'cancelled')

  if (!events?.length) return []

  // Count events per chef
  const chefCounts: Record<string, number> = {}
  for (const e of events) {
    chefCounts[e.tenant_id] = (chefCounts[e.tenant_id] || 0) + 1
  }

  const chefIds = Object.keys(chefCounts)

  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, slug, city, specialty')
    .in('id', chefIds)

  if (!chefs?.length) return []

  return chefs.map((c) => ({
    id: c.id,
    business_name: c.business_name,
    slug: c.slug,
    city: c.city,
    specialty: c.specialty,
    event_count: chefCounts[c.id] || 0,
  }))
}

/**
 * Share/recommend a chef with a friend.
 * Stores in hub_chef_recommendations table.
 */
export async function shareChefWithFriend(input: {
  chefId: string
  friendProfileId: string
  message?: string
}): Promise<{ success: boolean }> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  // Get chef info for the recommendation
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, slug')
    .eq('id', input.chefId)
    .single()

  if (!chef) throw new Error('Chef not found')

  // Insert recommendation
  const { error } = await supabase.from('hub_chef_recommendations').insert({
    chef_id: input.chefId,
    chef_business_name: chef.business_name,
    chef_slug: chef.slug,
    from_profile_id: myProfile.id,
    to_profile_id: input.friendProfileId,
    message: input.message || null,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Already recommended this chef to this friend')
    throw new Error(`Failed to share chef: ${error.message}`)
  }

  return { success: true }
}

/**
 * Get chef recommendations I've received from friends.
 */
export async function getMyChefRecommendations(): Promise<
  (ChefRecommendation & { from: HubGuestProfile })[]
> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { data: recs } = await supabase
    .from('hub_chef_recommendations')
    .select('*')
    .eq('to_profile_id', myProfile.id)
    .order('created_at', { ascending: false })

  if (!recs?.length) return []

  const fromIds = [...new Set(recs.map((r: any) => r.from_profile_id))]
  const { data: profiles } = await supabase.from('hub_guest_profiles').select('*').in('id', fromIds)

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  return recs
    .map((r: any) => ({
      ...r,
      from: profileMap.get(r.from_profile_id),
    }))
    .filter((r: any) => r.from) as (ChefRecommendation & { from: HubGuestProfile })[]
}
