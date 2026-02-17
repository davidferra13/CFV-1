// Chef Network Server Actions
// Cross-tenant chef-to-chef connections (friends).
// Uses admin client for cross-tenant queries since this feature
// intentionally spans across tenant boundaries.
// Note: chef_connections table added in Layer 7 migration.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type SearchableChef = {
  id: string
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
  city: string | null
  state: string | null
  connection_status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined'
  connection_id: string | null
}

export type ChefFriend = {
  id: string
  chef_id: string
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
  city: string | null
  state: string | null
  connected_since: string
}

export type PendingRequest = {
  id: string
  direction: 'sent' | 'received'
  chef_id: string
  display_name: string | null
  business_name: string
  city: string | null
  state: string | null
  request_message: string | null
  created_at: string
}

// ============================================
// VALIDATION
// ============================================

const SearchChefsSchema = z.object({
  query: z.string().min(1).max(100),
})

const SendRequestSchema = z.object({
  addressee_id: z.string().uuid(),
  message: z.string().max(500).optional(),
})

const RespondSchema = z.object({
  connection_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
})

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  profile_image_url: z.string().url().optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ============================================
// TYPE ASSERTION HELPERS
// ============================================

// chef_connections not in generated types until migration applied and types regenerated
function fromChefConnections(supabase: ReturnType<typeof createServerClient>): any {
  return (supabase as any).from('chef_connections')
}

function fromChefPreferences(supabase: ReturnType<typeof createServerClient>): any {
  return (supabase as any).from('chef_preferences')
}

// ============================================
// QUERIES
// ============================================

/**
 * Search for discoverable chefs by name.
 * Returns results annotated with connection status relative to the current chef.
 */
export async function searchChefs(input: z.infer<typeof SearchChefsSchema>): Promise<SearchableChef[]> {
  const user = await requireChef()
  const validated = SearchChefsSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Find discoverable chefs matching the search term
  const { data: chefs, error } = await (supabase as any)
    .from('chefs')
    .select(`
      id,
      display_name,
      business_name,
      bio,
      profile_image_url,
      chef_preferences!inner(home_city, home_state, network_discoverable)
    `)
    .neq('id', user.entityId)
    .eq('chef_preferences.network_discoverable', true)
    .or(`business_name.ilike.%${validated.query}%,display_name.ilike.%${validated.query}%`)
    .limit(20)

  if (error || !chefs) return []

  // Get current user's connections to annotate results
  const { data: connections } = await fromChefConnections(supabase)
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)

  const connectionMap = new Map<string, { status: string; direction: string; id: string }>()
  for (const conn of (connections || []) as any[]) {
    const otherId = conn.requester_id === user.entityId ? conn.addressee_id : conn.requester_id
    const direction = conn.requester_id === user.entityId ? 'sent' : 'received'
    connectionMap.set(otherId, { status: conn.status, direction, id: conn.id })
  }

  return (chefs as any[]).map((chef) => {
    const conn = connectionMap.get(chef.id)
    let connection_status: SearchableChef['connection_status'] = 'none'
    if (conn) {
      if (conn.status === 'accepted') connection_status = 'accepted'
      else if (conn.status === 'pending' && conn.direction === 'sent') connection_status = 'pending_sent'
      else if (conn.status === 'pending' && conn.direction === 'received') connection_status = 'pending_received'
      else if (conn.status === 'declined') connection_status = 'declined'
    }

    const prefs = Array.isArray(chef.chef_preferences) ? chef.chef_preferences[0] : chef.chef_preferences
    return {
      id: chef.id,
      display_name: chef.display_name,
      business_name: chef.business_name,
      bio: chef.bio,
      profile_image_url: chef.profile_image_url,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      connection_status,
      connection_id: conn?.id ?? null,
    }
  })
}

/**
 * Get all accepted connections (friends list).
 */
export async function getMyConnections(): Promise<ChefFriend[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: connections, error } = await fromChefConnections(supabase)
    .select('id, requester_id, addressee_id, accepted_at')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)
    .order('accepted_at', { ascending: false })

  if (error || !connections?.length) return []

  const friendChefIds = (connections as any[]).map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )

  const { data: chefs } = await (supabase as any)
    .from('chefs')
    .select(`
      id, display_name, business_name, bio, profile_image_url,
      chef_preferences(home_city, home_state)
    `)
    .in('id', friendChefIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) {
    chefMap.set(chef.id, chef)
  }

  return (connections as any[]).map((conn: any) => {
    const friendId = conn.requester_id === user.entityId ? conn.addressee_id : conn.requester_id
    const chef = chefMap.get(friendId)
    const prefs = Array.isArray(chef?.chef_preferences) ? chef.chef_preferences[0] : chef?.chef_preferences
    return {
      id: conn.id,
      chef_id: friendId,
      display_name: chef?.display_name ?? null,
      business_name: chef?.business_name ?? 'Unknown',
      bio: chef?.bio ?? null,
      profile_image_url: chef?.profile_image_url ?? null,
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      connected_since: conn.accepted_at,
    }
  })
}

/**
 * Get pending connection requests (both sent and received).
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const { data: pending, error } = await fromChefConnections(supabase)
    .select('id, requester_id, addressee_id, request_message, created_at')
    .eq('status', 'pending')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)
    .order('created_at', { ascending: false })

  if (error || !pending?.length) return []

  const otherIds = (pending as any[]).map((p: any) =>
    p.requester_id === user.entityId ? p.addressee_id : p.requester_id
  )

  const { data: chefs } = await (supabase as any)
    .from('chefs')
    .select('id, display_name, business_name, chef_preferences(home_city, home_state)')
    .in('id', otherIds)

  const chefMap = new Map<string, any>()
  for (const chef of (chefs || []) as any[]) chefMap.set(chef.id, chef)

  return (pending as any[]).map((p: any) => {
    const isSent = p.requester_id === user.entityId
    const otherId = isSent ? p.addressee_id : p.requester_id
    const chef = chefMap.get(otherId)
    const prefs = Array.isArray(chef?.chef_preferences) ? chef.chef_preferences[0] : chef?.chef_preferences
    return {
      id: p.id,
      direction: isSent ? 'sent' as const : 'received' as const,
      chef_id: otherId,
      display_name: chef?.display_name ?? null,
      business_name: chef?.business_name ?? 'Unknown',
      city: prefs?.home_city ?? null,
      state: prefs?.home_state ?? null,
      request_message: p.request_message,
      created_at: p.created_at,
    }
  })
}

/**
 * Get network discoverability setting for current chef.
 */
export async function getNetworkDiscoverable(): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await fromChefPreferences(supabase)
    .select('network_discoverable')
    .eq('chef_id', user.entityId)
    .single()

  return (data as any)?.network_discoverable ?? false
}

/**
 * Get current chef's profile fields for the profile edit form.
 */
export async function getChefProfile(): Promise<{
  display_name: string | null
  business_name: string
  bio: string | null
  profile_image_url: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chefs')
    .select('display_name, business_name, bio, profile_image_url')
    .eq('id', user.entityId)
    .single()

  if (error || !data) {
    throw new Error('Failed to load profile')
  }

  return data as any
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Send a connection request to another chef.
 */
export async function sendConnectionRequest(input: z.infer<typeof SendRequestSchema>) {
  const user = await requireChef()
  const validated = SendRequestSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  if (validated.addressee_id === user.entityId) {
    throw new Error('Cannot send a connection request to yourself')
  }

  // Check addressee is discoverable
  const { data: prefs } = await fromChefPreferences(supabase)
    .select('network_discoverable')
    .eq('chef_id', validated.addressee_id)
    .single()

  if (!(prefs as any)?.network_discoverable) {
    throw new Error('This chef is not accepting connection requests')
  }

  // Check for existing connection in either direction
  const { data: existing } = await fromChefConnections(supabase)
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.entityId},addressee_id.eq.${validated.addressee_id}),` +
      `and(requester_id.eq.${validated.addressee_id},addressee_id.eq.${user.entityId})`
    )
    .limit(1)
    .maybeSingle()

  if (existing) {
    const ex = existing as any
    if (ex.status === 'accepted') throw new Error('Already connected')
    if (ex.status === 'pending') throw new Error('Connection request already pending')
    // If declined, allow re-requesting by resetting to pending
    if (ex.status === 'declined') {
      const { error } = await fromChefConnections(supabase)
        .update({
          status: 'pending',
          request_message: validated.message ?? null,
          declined_at: null,
        })
        .eq('id', ex.id)

      if (error) throw new Error('Failed to resend request')
      revalidatePath('/network')
      return { success: true }
    }
  }

  // Insert new connection request
  const { error } = await fromChefConnections(supabase)
    .insert({
      requester_id: user.entityId,
      addressee_id: validated.addressee_id,
      request_message: validated.message ?? null,
    })

  if (error) {
    console.error('[sendConnectionRequest] Error:', error)
    throw new Error('Failed to send connection request')
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Accept or decline a connection request (addressee only).
 */
export async function respondToConnectionRequest(input: z.infer<typeof RespondSchema>) {
  const user = await requireChef()
  const validated = RespondSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Verify this request is addressed to the current chef and is pending
  const { data: connection, error: fetchError } = await fromChefConnections(supabase)
    .select('*')
    .eq('id', validated.connection_id)
    .eq('addressee_id', user.entityId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !connection) {
    throw new Error('Connection request not found or already responded to')
  }

  const updateData = validated.action === 'accept'
    ? { status: 'accepted' as const, accepted_at: new Date().toISOString() }
    : { status: 'declined' as const, declined_at: new Date().toISOString() }

  const { error } = await fromChefConnections(supabase)
    .update(updateData)
    .eq('id', validated.connection_id)

  if (error) {
    throw new Error(`Failed to ${validated.action} connection request`)
  }

  revalidatePath('/network')
  return { success: true }
}

/**
 * Remove an existing connection (soft remove - sets to declined).
 */
export async function removeConnection(connectionId: string) {
  const user = await requireChef()
  z.string().uuid().parse(connectionId)
  const supabase = createServerClient({ admin: true })

  // Verify the user is part of this connection
  const { data: conn } = await fromChefConnections(supabase)
    .select('requester_id, addressee_id')
    .eq('id', connectionId)
    .single()

  const c = conn as any
  if (!c || (c.requester_id !== user.entityId && c.addressee_id !== user.entityId)) {
    throw new Error('Connection not found')
  }

  const { error } = await fromChefConnections(supabase)
    .update({ status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) throw new Error('Failed to remove connection')

  revalidatePath('/network')
  return { success: true }
}

/**
 * Toggle network discoverability on/off.
 */
export async function toggleNetworkDiscoverable(discoverable: boolean) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Upsert pattern (same as updateChefPreferences)
  const { data: existing } = await fromChefPreferences(supabase)
    .select('id')
    .eq('chef_id', user.entityId)
    .single()

  if (existing) {
    const { error } = await fromChefPreferences(supabase)
      .update({ network_discoverable: discoverable })
      .eq('chef_id', user.entityId)

    if (error) throw new Error('Failed to update discoverability')
  } else {
    const { error } = await fromChefPreferences(supabase)
      .insert({
        chef_id: user.entityId,
        tenant_id: user.tenantId!,
        network_discoverable: discoverable,
      })

    if (error) throw new Error('Failed to save discoverability')
  }

  revalidatePath('/network')
  revalidatePath('/settings')
  return { success: true }
}

/**
 * Update chef profile fields (display name, bio, image).
 */
export async function updateChefProfile(input: UpdateProfileInput) {
  const user = await requireChef()
  const validated = UpdateProfileSchema.parse(input)
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('chefs')
    .update(validated)
    .eq('id', user.entityId)

  if (error) {
    console.error('[updateChefProfile] Error:', error)
    throw new Error('Failed to update profile')
  }

  revalidatePath('/network')
  revalidatePath('/settings')
  return { success: true }
}
