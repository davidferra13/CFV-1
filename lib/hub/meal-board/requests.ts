'use server'

import { createServerClient } from '@/lib/db/server'
import type { MealRequest } from '../types'
import { hasMemberAccess, requireChefOrAdmin, resolveProfile } from './shared'

export async function getMealRequests(input: {
  groupId: string
  profileToken?: string
  status?: string
}): Promise<MealRequest[]> {
  const db: any = createServerClient({ admin: true })
  if (!(await hasMemberAccess(db, input.groupId, input.profileToken))) return []

  let query = db
    .from('hub_meal_requests')
    .select(
      '*, requested_by:hub_guest_profiles!requested_by_profile_id(id, display_name, avatar_url)'
    )
    .eq('group_id', input.groupId)
    .order('created_at', { ascending: false })

  if (input.status) {
    query = query.eq('status', input.status)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load meal requests: ${error.message}`)
  return (data ?? []).map((r: any) => ({
    ...r,
    requested_by: r.requested_by ?? undefined,
  }))
}

export async function createMealRequest(input: {
  groupId: string
  profileToken: string
  title: string
  notes?: string | null
}): Promise<{ success: boolean; request?: MealRequest; error?: string }> {
  try {
    if (!input.title.trim()) return { success: false, error: 'Title is required' }
    if (input.title.length > 200) return { success: false, error: 'Title too long (max 200 chars)' }

    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Verify membership
    const { data: membership } = await db
      .from('hub_group_members')
      .select('id')
      .eq('group_id', input.groupId)
      .eq('profile_id', profile.id)
      .single()
    if (!membership) return { success: false, error: 'Not a member of this circle' }

    const { data, error } = await db
      .from('hub_meal_requests')
      .insert({
        group_id: input.groupId,
        requested_by_profile_id: profile.id,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
      })
      .select(
        '*, requested_by:hub_guest_profiles!requested_by_profile_id(id, display_name, avatar_url)'
      )
      .single()

    if (error) throw new Error(error.message)

    // Post system message (non-blocking)
    try {
      const { data: prof } = await db
        .from('hub_guest_profiles')
        .select('display_name')
        .eq('id', profile.id)
        .single()
      await db.from('hub_messages').insert({
        group_id: input.groupId,
        author_profile_id: profile.id,
        message_type: 'system',
        body: `${prof?.display_name ?? 'Someone'} requested: "${input.title.trim()}"`,
        system_event_type: 'meal_request',
        system_metadata: { title: input.title.trim() },
      })
    } catch {
      console.error('[non-blocking] Failed to post meal request system message')
    }

    return { success: true, request: { ...data, requested_by: data.requested_by ?? undefined } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function resolveMealRequest(input: {
  requestId: string
  profileToken: string
  status: 'planned' | 'declined'
  resolvedMealId?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db: any = createServerClient({ admin: true })
    const profile = await resolveProfile(db, input.profileToken)

    // Get request to check group
    const { data: request } = await db
      .from('hub_meal_requests')
      .select('group_id')
      .eq('id', input.requestId)
      .single()
    if (!request) return { success: false, error: 'Request not found' }

    await requireChefOrAdmin(db, request.group_id, profile.id)

    const { error } = await db
      .from('hub_meal_requests')
      .update({
        status: input.status,
        resolved_meal_id: input.resolvedMealId ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', input.requestId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
