'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateClientHubProfile } from './client-hub-actions'
import type { HubGuestProfile } from './types'

// ---------------------------------------------------------------------------
// Hub Guest Friends - peer-to-peer friend connections
// ---------------------------------------------------------------------------

export interface HubFriend {
  friendship_id: string
  status: 'pending' | 'accepted' | 'declined'
  is_requester: boolean
  created_at: string
  accepted_at: string | null
  profile: HubGuestProfile
}

type FriendRequestInsertStatus = 'sent' | 'already_friends' | 'already_pending'

async function createOrReuseFriendRequest(input: {
  supabase: any
  requesterProfileId: string
  addresseeProfileId: string
}): Promise<FriendRequestInsertStatus> {
  const { supabase, requesterProfileId, addresseeProfileId } = input

  // Check if friendship already exists (in either direction)
  const { data: existing } = await supabase
    .from('hub_guest_friends')
    .select('id, status')
    .or(
      `and(requester_id.eq.${requesterProfileId},addressee_id.eq.${addresseeProfileId}),and(requester_id.eq.${addresseeProfileId},addressee_id.eq.${requesterProfileId})`
    )
    .limit(1)
    .single()

  if (existing) {
    if (existing.status === 'accepted') return 'already_friends'
    if (existing.status === 'pending') return 'already_pending'
    // If declined, allow re-request by updating
    if (existing.status === 'declined') {
      await supabase
        .from('hub_guest_friends')
        .update({
          requester_id: requesterProfileId,
          addressee_id: addresseeProfileId,
          status: 'pending',
          declined_at: null,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      return 'sent'
    }
  }

  const { error } = await supabase.from('hub_guest_friends').insert({
    requester_id: requesterProfileId,
    addressee_id: addresseeProfileId,
  })

  if (error) {
    if (error.code === '23505') return 'already_pending'
    throw new Error(`Failed to send friend request: ${error.message}`)
  }

  return 'sent'
}

/**
 * Send a friend request to another hub guest profile.
 */
export async function sendFriendRequest(addresseeProfileId: string): Promise<{ success: boolean }> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  if (myProfile.id === addresseeProfileId) {
    throw new Error("You can't add yourself as a friend")
  }

  const status = await createOrReuseFriendRequest({
    supabase,
    requesterProfileId: myProfile.id,
    addresseeProfileId,
  })

  if (status === 'already_friends') throw new Error('Already friends')
  if (status === 'already_pending') throw new Error('Friend request already pending')

  // Non-blocking: notify addressee via email
  try {
    const { notifyFriendRequest } = await import('./circle-notification-actions')
    void notifyFriendRequest({
      requesterProfileId: myProfile.id,
      addresseeProfileId,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}

/**
 * Invite-link-only path: request to join someone's dinner circle by profile token.
 */
export async function requestDinnerCircleInviteByProfileToken(
  addresseeProfileToken: string
): Promise<{
  success: true
  status: 'sent' | 'already_friends' | 'already_pending' | 'self'
}> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { data: addresseeProfile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', addresseeProfileToken)
    .maybeSingle()

  if (!addresseeProfile?.id) {
    throw new Error('This invite link is invalid or expired.')
  }

  if (addresseeProfile.id === myProfile.id) {
    return { success: true, status: 'self' }
  }

  const status = await createOrReuseFriendRequest({
    supabase,
    requesterProfileId: myProfile.id,
    addresseeProfileId: addresseeProfile.id,
  })

  return { success: true, status }
}

/**
 * Accept a friend request.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<{ success: boolean }> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('hub_guest_friends')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', friendshipId)
    .eq('addressee_id', myProfile.id)
    .eq('status', 'pending')

  if (error) throw new Error(`Failed to accept request: ${error.message}`)
  return { success: true }
}

/**
 * Decline a friend request.
 */
export async function declineFriendRequest(friendshipId: string): Promise<{ success: boolean }> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('hub_guest_friends')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
    })
    .eq('id', friendshipId)
    .eq('addressee_id', myProfile.id)
    .eq('status', 'pending')

  if (error) throw new Error(`Failed to decline request: ${error.message}`)
  return { success: true }
}

/**
 * Remove a friend (unfriend).
 */
export async function removeFriend(friendshipId: string): Promise<{ success: boolean }> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  // Only allow removing if you're part of the friendship
  const { error } = await supabase
    .from('hub_guest_friends')
    .delete()
    .eq('id', friendshipId)
    .or(`requester_id.eq.${myProfile.id},addressee_id.eq.${myProfile.id}`)

  if (error) throw new Error(`Failed to remove friend: ${error.message}`)
  return { success: true }
}

/**
 * Get all friends (accepted) for the current client.
 */
export async function getMyFriends(): Promise<HubFriend[]> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { data: friendships, error } = await supabase
    .from('hub_guest_friends')
    .select('*')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${myProfile.id},addressee_id.eq.${myProfile.id}`)
    .order('accepted_at', { ascending: false })

  if (error || !friendships?.length) return []

  // Get profile IDs of friends (the "other" person in each friendship)
  const profileIds = friendships.map((f: any) =>
    f.requester_id === myProfile.id ? f.addressee_id : f.requester_id
  )

  const { data: profiles } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .in('id', profileIds)

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  return friendships
    .map((f: any) => {
      const otherId = f.requester_id === myProfile.id ? f.addressee_id : f.requester_id
      return {
        friendship_id: f.id,
        status: f.status,
        is_requester: f.requester_id === myProfile.id,
        created_at: f.created_at,
        accepted_at: f.accepted_at,
        profile: profileMap.get(otherId) as HubGuestProfile,
      }
    })
    .filter((f: HubFriend) => f.profile)
}

/**
 * Get pending friend requests (received).
 */
export async function getPendingFriendRequests(): Promise<HubFriend[]> {
  await requireClient()
  const myProfile = await getOrCreateClientHubProfile()
  const supabase = createServerClient({ admin: true })

  const { data: requests, error } = await supabase
    .from('hub_guest_friends')
    .select('*')
    .eq('addressee_id', myProfile.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !requests?.length) return []

  const requesterIds = requests.map((r: any) => r.requester_id)
  const { data: profiles } = await supabase
    .from('hub_guest_profiles')
    .select('*')
    .in('id', requesterIds)

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  return requests
    .map((r: any) => ({
      friendship_id: r.id,
      status: r.status,
      is_requester: false,
      created_at: r.created_at,
      accepted_at: r.accepted_at,
      profile: profileMap.get(r.requester_id) as HubGuestProfile,
    }))
    .filter((f: HubFriend) => f.profile)
}

/**
 * Search for people to add as friends (by name or email).
 * Only finds users who have hub guest profiles.
 */
export async function searchPeople(query: string): Promise<{
  profiles: HubGuestProfile[]
  existing_friend_ids: string[]
  pending_request_ids: string[]
}> {
  void query
  return { profiles: [], existing_friend_ids: [], pending_request_ids: [] }
}
