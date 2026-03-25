'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef, requireAuth } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type FeatureRequest = {
  id: string
  title: string
  description: string | null
  submitted_by: string | null
  status: string
  category: string
  vote_count: number
  admin_response: string | null
  shipped_at: string | null
  created_at: string
  updated_at: string
  has_voted?: boolean
}

export type VotingStats = {
  total: number
  by_status: Record<string, number>
  top_voted: FeatureRequest[]
}

// -------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------

export async function getFeatureRequests(
  status?: string,
  category?: string
): Promise<FeatureRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('feature_requests')
    .select('*')
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[feature-voting] Failed to fetch feature requests:', error)
    throw new Error('Failed to load feature requests')
  }

  // Check which ones the current chef has voted on
  const { data: votes } = await db
    .from('feature_votes')
    .select('feature_id')
    .eq('chef_id', user.entityId)

  const votedIds = new Set((votes ?? []).map((v: { feature_id: string }) => v.feature_id))

  return (data ?? []).map((fr: FeatureRequest) => ({
    ...fr,
    has_voted: votedIds.has(fr.id),
  }))
}

export async function getFeatureRequest(id: string): Promise<FeatureRequest | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db.from('feature_requests').select('*').eq('id', id).single()

  if (error) {
    console.error('[feature-voting] Failed to fetch feature request:', error)
    return null
  }

  // Check if current chef voted
  const { data: vote } = await db
    .from('feature_votes')
    .select('id')
    .eq('feature_id', id)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  return { ...data, has_voted: !!vote } as FeatureRequest
}

export async function getMyVotes(): Promise<FeatureRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: votes, error: votesError } = await db
    .from('feature_votes')
    .select('feature_id')
    .eq('chef_id', user.entityId)

  if (votesError || !votes?.length) {
    return []
  }

  const featureIds = votes.map((v: { feature_id: string }) => v.feature_id)

  const { data, error } = await db
    .from('feature_requests')
    .select('*')
    .in('id', featureIds)
    .order('vote_count', { ascending: false })

  if (error) {
    console.error('[feature-voting] Failed to fetch voted features:', error)
    throw new Error('Failed to load your votes')
  }

  return (data ?? []).map((fr: FeatureRequest) => ({ ...fr, has_voted: true }))
}

export async function getVotingStats(): Promise<VotingStats> {
  await requireChef()
  const db: any = createServerClient()

  const { data: all, error } = await db
    .from('feature_requests')
    .select('*')
    .order('vote_count', { ascending: false })

  if (error) {
    console.error('[feature-voting] Failed to fetch voting stats:', error)
    throw new Error('Failed to load voting stats')
  }

  const features = all ?? []
  const by_status: Record<string, number> = {}
  for (const f of features) {
    by_status[f.status] = (by_status[f.status] || 0) + 1
  }

  return {
    total: features.length,
    by_status,
    top_voted: features.slice(0, 10) as FeatureRequest[],
  }
}

export async function getRoadmap(): Promise<{
  planned: FeatureRequest[]
  in_progress: FeatureRequest[]
  shipped: FeatureRequest[]
}> {
  await requireAuth()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('feature_requests')
    .select('*')
    .in('status', ['planned', 'in_progress', 'shipped'])
    .order('vote_count', { ascending: false })

  if (error) {
    console.error('[feature-voting] Failed to fetch roadmap:', error)
    throw new Error('Failed to load roadmap')
  }

  const features = data ?? []

  return {
    planned: features.filter((f: FeatureRequest) => f.status === 'planned'),
    in_progress: features.filter((f: FeatureRequest) => f.status === 'in_progress'),
    shipped: features.filter((f: FeatureRequest) => f.status === 'shipped'),
  }
}

// -------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------

export async function submitFeatureRequest(
  title: string,
  description: string,
  category: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!title.trim()) {
    return { success: false, error: 'Title is required' }
  }

  const { data, error } = await db
    .from('feature_requests')
    .insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      submitted_by: user.entityId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[feature-voting] Failed to submit feature request:', error)
    return { success: false, error: 'Failed to submit feature request' }
  }

  return { success: true, id: data.id }
}

export async function voteForFeature(
  featureId: string
): Promise<{ success: boolean; voted: boolean; newCount: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if already voted
  const { data: existing } = await db
    .from('feature_votes')
    .select('id')
    .eq('feature_id', featureId)
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (existing) {
    // Remove vote
    const { error: deleteError } = await db.from('feature_votes').delete().eq('id', existing.id)

    if (deleteError) {
      console.error('[feature-voting] Failed to remove vote:', deleteError)
      return { success: false, voted: true, newCount: 0, error: 'Failed to remove vote' }
    }

    // Decrement vote_count using admin client to bypass RLS for update
    const adminDb = createServerClient({ admin: true })
    const { data: current } = await adminDb
      .from('feature_requests')
      .select('vote_count')
      .eq('id', featureId)
      .single()

    const newCount = Math.max(0, (current?.vote_count ?? 1) - 1)
    await adminDb.from('feature_requests').update({ vote_count: newCount }).eq('id', featureId)

    return { success: true, voted: false, newCount }
  } else {
    // Add vote
    const { error: insertError } = await db
      .from('feature_votes')
      .insert({ feature_id: featureId, chef_id: user.entityId })

    if (insertError) {
      console.error('[feature-voting] Failed to add vote:', insertError)
      return { success: false, voted: false, newCount: 0, error: 'Failed to add vote' }
    }

    // Increment vote_count
    const adminDb = createServerClient({ admin: true })
    const { data: current } = await adminDb
      .from('feature_requests')
      .select('vote_count')
      .eq('id', featureId)
      .single()

    const newCount = (current?.vote_count ?? 0) + 1
    await adminDb.from('feature_requests').update({ vote_count: newCount }).eq('id', featureId)

    return { success: true, voted: true, newCount }
  }
}

export async function updateFeatureStatus(
  featureId: string,
  status: string,
  adminResponse?: string
): Promise<{ success: boolean; error?: string }> {
  await requireChef()
  const admin = await isAdmin()
  if (!admin) {
    return { success: false, error: 'Admin access required' }
  }

  const adminDb = createServerClient({ admin: true })

  const updateData: Record<string, unknown> = { status }
  if (adminResponse !== undefined) {
    updateData.admin_response = adminResponse || null
  }
  if (status === 'shipped') {
    updateData.shipped_at = new Date().toISOString()
  }

  const { error } = await adminDb.from('feature_requests').update(updateData).eq('id', featureId)

  if (error) {
    console.error('[feature-voting] Failed to update feature status:', error)
    return { success: false, error: 'Failed to update feature status' }
  }

  return { success: true }
}
