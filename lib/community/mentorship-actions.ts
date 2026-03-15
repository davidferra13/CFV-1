'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type MentorshipRole = 'mentor' | 'mentee' | 'both'
export type ConnectionStatus = 'pending' | 'active' | 'completed' | 'declined'

export interface MentorshipProfile {
  id: string
  chef_id: string
  role: MentorshipRole
  expertise_areas: string[]
  goals: string | null
  availability: string | null
  years_experience: number | null
  max_mentees: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MentorSearchResult {
  id: string
  chef_id: string
  role: MentorshipRole
  expertise_areas: string[]
  goals: string | null
  availability: string | null
  years_experience: number | null
  max_mentees: number
  display_name: string | null
  business_name: string | null
}

export interface MentorshipConnection {
  id: string
  mentor_id: string
  mentee_id: string
  status: ConnectionStatus
  message: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  mentor_name?: string | null
  mentee_name?: string | null
}

export interface MentorshipStats {
  active_as_mentor: number
  active_as_mentee: number
  pending_incoming: number
  pending_outgoing: number
  total_completed: number
}

// ============================================
// PROFILE ACTIONS
// ============================================

export async function getMentorshipProfile(): Promise<MentorshipProfile | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('mentorship_profiles' as any)
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  return (data as unknown as MentorshipProfile) || null
}

export async function updateMentorshipProfile(profileData: {
  role: MentorshipRole
  expertise_areas: string[]
  goals?: string
  availability?: string
  years_experience?: number
  max_mentees?: number
  is_active?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const payload = {
    chef_id: user.entityId,
    role: profileData.role,
    expertise_areas: profileData.expertise_areas,
    goals: profileData.goals || null,
    availability: profileData.availability || null,
    years_experience: profileData.years_experience || null,
    max_mentees: profileData.max_mentees ?? 3,
    is_active: profileData.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  // Upsert: create if not exists, update if exists
  const { error } = await supabase
    .from('mentorship_profiles' as any)
    .upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[mentorship] Failed to update profile:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community/mentorship')
  return { success: true }
}

// ============================================
// SEARCH
// ============================================

export async function searchMentors(filters?: {
  expertise?: string
  maxExperience?: number
}): Promise<MentorSearchResult[]> {
  await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('mentorship_profiles' as any)
    .select(
      'id, chef_id, role, expertise_areas, goals, availability, years_experience, max_mentees'
    )
    .eq('is_active', true)
    .in('role', ['mentor', 'both'])
    .order('years_experience', { ascending: false })
    .limit(50)

  if (filters?.expertise) {
    query = query.contains('expertise_areas', [filters.expertise])
  }

  if (filters?.maxExperience) {
    query = query.lte('years_experience', filters.maxExperience)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Fetch chef display names for results
  const chefIds = (data as any[]).map((d: any) => d.chef_id)
  const { data: chefs } = await supabase
    .from('chefs' as any)
    .select('id, display_name, business_name')
    .in('id', chefIds)

  const chefMap = new Map(
    ((chefs as any[]) || []).map((c: any) => [c.id, c])
  )

  return (data as any[]).map((profile: any) => {
    const chef = chefMap.get(profile.chef_id) as any
    return {
      ...profile,
      display_name: chef?.display_name || null,
      business_name: chef?.business_name || null,
    } as MentorSearchResult
  })
}

// ============================================
// CONNECTION ACTIONS
// ============================================

export async function requestMentorship(
  mentorId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (mentorId === user.entityId) {
    return { success: false, error: 'You cannot mentor yourself' }
  }

  // Check if connection already exists
  const { data: existing } = await supabase
    .from('mentorship_connections' as any)
    .select('id, status')
    .eq('mentor_id', mentorId)
    .eq('mentee_id', user.entityId)
    .single()

  if (existing) {
    const status = (existing as any).status
    if (status === 'pending') {
      return { success: false, error: 'You already have a pending request with this mentor' }
    }
    if (status === 'active') {
      return { success: false, error: 'You already have an active connection with this mentor' }
    }
  }

  const { error } = await supabase
    .from('mentorship_connections' as any)
    .insert({
      mentor_id: mentorId,
      mentee_id: user.entityId,
      message: message || null,
      status: 'pending',
    })

  if (error) {
    console.error('[mentorship] Failed to request mentorship:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community/mentorship')
  return { success: true }
}

export async function respondToRequest(
  connectionId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify the user is the mentor on this connection
  const { data: connection } = await supabase
    .from('mentorship_connections' as any)
    .select('id, mentor_id, status')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return { success: false, error: 'Connection not found' }
  }

  if ((connection as any).mentor_id !== user.entityId) {
    return { success: false, error: 'Only the mentor can respond to requests' }
  }

  if ((connection as any).status !== 'pending') {
    return { success: false, error: 'This request has already been handled' }
  }

  const updateData = accept
    ? { status: 'active', started_at: new Date().toISOString() }
    : { status: 'declined' }

  const { error } = await supabase
    .from('mentorship_connections' as any)
    .update(updateData)
    .eq('id', connectionId)

  if (error) {
    console.error('[mentorship] Failed to respond to request:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community/mentorship')
  return { success: true }
}

export async function getConnections(
  role?: 'mentor' | 'mentee'
): Promise<MentorshipConnection[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('mentorship_connections' as any)
    .select('*')
    .order('created_at', { ascending: false })

  if (role === 'mentor') {
    query = query.eq('mentor_id', user.entityId)
  } else if (role === 'mentee') {
    query = query.eq('mentee_id', user.entityId)
  } else {
    query = query.or(
      `mentor_id.eq.${user.entityId},mentee_id.eq.${user.entityId}`
    )
  }

  const { data } = await query
  if (!data || data.length === 0) return []

  // Fetch chef names for all connections
  const allChefIds = new Set<string>()
  for (const conn of data as any[]) {
    allChefIds.add(conn.mentor_id)
    allChefIds.add(conn.mentee_id)
  }

  const { data: chefs } = await supabase
    .from('chefs' as any)
    .select('id, display_name, business_name')
    .in('id', Array.from(allChefIds))

  const chefMap = new Map(
    ((chefs as any[]) || []).map((c: any) => [c.id, c])
  )

  return (data as any[]).map((conn: any) => {
    const mentor = chefMap.get(conn.mentor_id) as any
    const mentee = chefMap.get(conn.mentee_id) as any
    return {
      ...conn,
      mentor_name: mentor?.display_name || mentor?.business_name || null,
      mentee_name: mentee?.display_name || mentee?.business_name || null,
    } as MentorshipConnection
  })
}

export async function endConnection(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify user is part of this connection
  const { data: connection } = await supabase
    .from('mentorship_connections' as any)
    .select('id, mentor_id, mentee_id, status')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return { success: false, error: 'Connection not found' }
  }

  const conn = connection as any
  if (conn.mentor_id !== user.entityId && conn.mentee_id !== user.entityId) {
    return { success: false, error: 'You are not part of this connection' }
  }

  if (conn.status !== 'active') {
    return { success: false, error: 'Only active connections can be ended' }
  }

  const { error } = await supabase
    .from('mentorship_connections' as any)
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  if (error) {
    console.error('[mentorship] Failed to end connection:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/community/mentorship')
  return { success: true }
}

// ============================================
// STATS
// ============================================

export async function getMentorshipStats(): Promise<MentorshipStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: connections } = await supabase
    .from('mentorship_connections' as any)
    .select('id, mentor_id, mentee_id, status')
    .or(
      `mentor_id.eq.${user.entityId},mentee_id.eq.${user.entityId}`
    )

  const conns = (connections as any[]) || []

  return {
    active_as_mentor: conns.filter(
      (c) => c.mentor_id === user.entityId && c.status === 'active'
    ).length,
    active_as_mentee: conns.filter(
      (c) => c.mentee_id === user.entityId && c.status === 'active'
    ).length,
    pending_incoming: conns.filter(
      (c) => c.mentor_id === user.entityId && c.status === 'pending'
    ).length,
    pending_outgoing: conns.filter(
      (c) => c.mentee_id === user.entityId && c.status === 'pending'
    ).length,
    total_completed: conns.filter((c) => c.status === 'completed').length,
  }
}
