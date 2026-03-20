'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ---- Types ----

export type CommunityProfile = {
  id: string
  chef_id: string
  display_name: string
  cuisine_types: string[]
  years_experience: number | null
  service_area: string | null
  bio: string | null
  is_visible: boolean
  accepting_referrals: boolean
  specialties: string[]
  created_at: string
  updated_at: string
}

export type CommunityBenchmark = {
  id: string
  chef_id: string
  metric_type: string
  value: number
  period: string
  created_at: string
}

export type CommunityMessage = {
  id: string
  sender_id: string
  recipient_id: string
  subject: string | null
  body: string
  read_at: string | null
  created_at: string
}

export type BenchmarkAggregate = {
  metric_type: string
  period: string
  average: number
  contributor_count: number
}

// ---- Profile Actions ----

export async function getCommunityProfile(): Promise<CommunityProfile | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('community_profiles')
    .select('*')
    .eq('chef_id', user.entityId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[Community] getCommunityProfile failed:', error)
    return null
  }

  return data ?? null
}

export async function updateCommunityProfile(profileData: {
  display_name: string
  cuisine_types?: string[]
  years_experience?: number | null
  service_area?: string | null
  bio?: string | null
  is_visible?: boolean
  accepting_referrals?: boolean
  specialties?: string[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const trimmedName = profileData.display_name?.trim()
  if (!trimmedName || trimmedName.length > 100) {
    return { success: false, error: 'Display name must be 1-100 characters' }
  }

  const payload = {
    chef_id: user.entityId,
    display_name: trimmedName,
    cuisine_types: profileData.cuisine_types ?? [],
    years_experience: profileData.years_experience ?? null,
    service_area: profileData.service_area?.trim() || null,
    bio: profileData.bio?.trim() || null,
    is_visible: profileData.is_visible ?? true,
    accepting_referrals: profileData.accepting_referrals ?? false,
    specialties: profileData.specialties ?? [],
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase as any)
    .from('community_profiles')
    .upsert(payload, { onConflict: 'chef_id' })

  if (error) {
    console.error('[Community] updateCommunityProfile failed:', error)
    return { success: false, error: 'Failed to update profile' }
  }

  revalidatePath('/community')
  return { success: true }
}

// ---- Directory Search ----

export async function searchChefs(filters?: {
  cuisine?: string
  area?: string
  acceptingReferrals?: boolean
}): Promise<CommunityProfile[]> {
  await requireChef()
  const supabase: any = createServerClient()

  let query = (supabase as any)
    .from('community_profiles')
    .select('*')
    .eq('is_visible', true)
    .order('display_name', { ascending: true })

  if (filters?.acceptingReferrals) {
    query = query.eq('accepting_referrals', true)
  }

  if (filters?.area) {
    query = query.ilike('service_area', `%${filters.area}%`)
  }

  if (filters?.cuisine) {
    query = query.contains('cuisine_types', [filters.cuisine])
  }

  const { data, error } = await query

  if (error) {
    console.error('[Community] searchChefs failed:', error)
    return []
  }

  return data ?? []
}

export async function getChefProfile(chefId: string): Promise<CommunityProfile | null> {
  await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await (supabase as any)
    .from('community_profiles')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_visible', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[Community] getChefProfile failed:', error)
    }
    return null
  }

  return data ?? null
}

// ---- Benchmarking Actions ----

export async function submitBenchmark(
  metricType: string,
  value: number,
  period: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const validMetrics = [
    'avg_event_price',
    'events_per_month',
    'food_cost_pct',
    'client_retention_rate',
    'avg_party_size',
  ]
  if (!validMetrics.includes(metricType)) {
    return { success: false, error: 'Invalid metric type' }
  }

  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return { success: false, error: 'Value must be a non-negative number' }
  }

  const periodPattern = /^\d{4}-(Q[1-4]|\d{2})$/
  if (!periodPattern.test(period)) {
    return { success: false, error: 'Period must be like 2026-Q1 or 2026-03' }
  }

  // Upsert: one entry per chef per metric per period
  const { error } = await (supabase as any).from('community_benchmarks').upsert(
    {
      chef_id: user.entityId,
      metric_type: metricType,
      value,
      period,
    },
    { onConflict: 'chef_id,metric_type,period', ignoreDuplicates: false }
  )

  if (error) {
    console.error('[Community] submitBenchmark failed:', error)
    return { success: false, error: 'Failed to submit benchmark' }
  }

  revalidatePath('/community/benchmarks')
  return { success: true }
}

export async function getAggregateBenchmarks(
  metricType: string,
  period?: string
): Promise<BenchmarkAggregate[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // "Give to get" - check if chef has contributed this metric
  const { data: ownContribution } = await (supabase as any)
    .from('community_benchmarks')
    .select('id')
    .eq('chef_id', user.entityId)
    .eq('metric_type', metricType)
    .limit(1)

  if (!ownContribution || ownContribution.length === 0) {
    return [] // Must contribute to see aggregates
  }

  // Get raw benchmark data to compute aggregates
  let query = (supabase as any)
    .from('community_benchmarks')
    .select('metric_type, value, period')
    .eq('metric_type', metricType)

  if (period) {
    query = query.eq('period', period)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Community] getAggregateBenchmarks failed:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Group by period and compute averages, only if 5+ contributors
  const grouped: Record<string, number[]> = {}
  for (const row of data) {
    if (!grouped[row.period]) grouped[row.period] = []
    grouped[row.period].push(Number(row.value))
  }

  const results: BenchmarkAggregate[] = []
  for (const [p, values] of Object.entries(grouped)) {
    if (values.length >= 5) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      results.push({
        metric_type: metricType,
        period: p,
        average: Math.round(avg * 100) / 100,
        contributor_count: values.length,
      })
    }
  }

  return results.sort((a, b) => b.period.localeCompare(a.period))
}

// ---- Messaging Actions ----

export async function sendMessage(
  recipientId: string,
  subject: string | null,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const trimmedBody = body?.trim()
  if (!trimmedBody || trimmedBody.length > 5000) {
    return { success: false, error: 'Message body must be 1-5000 characters' }
  }

  if (recipientId === user.entityId) {
    return { success: false, error: 'Cannot send a message to yourself' }
  }

  // Verify recipient exists and is visible
  const { data: recipient } = await (supabase as any)
    .from('community_profiles')
    .select('id')
    .eq('chef_id', recipientId)
    .eq('is_visible', true)
    .single()

  if (!recipient) {
    return { success: false, error: 'Recipient not found' }
  }

  const { error } = await (supabase as any).from('community_messages').insert({
    sender_id: user.entityId,
    recipient_id: recipientId,
    subject: subject?.trim() || null,
    body: trimmedBody,
  })

  if (error) {
    console.error('[Community] sendMessage failed:', error)
    return { success: false, error: 'Failed to send message' }
  }

  revalidatePath('/community/messages')
  return { success: true }
}

export async function getMessages(folder: 'inbox' | 'sent'): Promise<CommunityMessage[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const column = folder === 'inbox' ? 'recipient_id' : 'sender_id'

  const { data, error } = await (supabase as any)
    .from('community_messages')
    .select('*')
    .eq(column, user.entityId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[Community] getMessages failed:', error)
    return []
  }

  return data ?? []
}

export async function markMessageRead(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await (supabase as any)
    .from('community_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('recipient_id', user.entityId)

  if (error) {
    console.error('[Community] markMessageRead failed:', error)
    return { success: false, error: 'Failed to mark message as read' }
  }

  return { success: true }
}
