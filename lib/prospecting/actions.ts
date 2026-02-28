'use server'

// Prospecting Hub — CRUD Server Actions
// Admin-only. All actions gate with requireAdmin() + requireChef() for tenant scoping.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PROSPECT_CATEGORIES, PROSPECT_STATUSES, PROSPECT_PRIORITIES } from './constants'
import type { Prospect, ProspectNote, ProspectStats, ProspectsFilter } from './types'

// ── Schemas ──────────────────────────────────────────────────────────────────

const ManualProspectSchema = z.object({
  name: z.string().min(1).max(500),
  prospect_type: z.enum(['organization', 'individual']).default('organization'),
  category: z.enum(PROSPECT_CATEGORIES as unknown as [string, ...string[]]).default('other'),
  description: z.string().max(2000).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  region: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(300).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  contact_title: z.string().max(200).nullable().optional(),
  contact_direct_phone: z.string().max(50).nullable().optional(),
  contact_direct_email: z.string().max(300).nullable().optional(),
  gatekeeper_name: z.string().max(200).nullable().optional(),
  gatekeeper_notes: z.string().max(1000).nullable().optional(),
  best_time_to_call: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(PROSPECT_PRIORITIES as unknown as [string, ...string[]]).default('normal'),
})

const UpdateProspectSchema = ManualProspectSchema.partial()

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getProspects(filter?: ProspectsFilter): Promise<Prospect[]> {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase.from('prospects').select('*').eq('chef_id', user.tenantId!)

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status)
    } else {
      query = query.eq('status', filter.status)
    }
  }
  if (filter?.category) query = query.eq('category', filter.category)
  if (filter?.region) query = query.ilike('region', `%${filter.region}%`)
  if (filter?.priority) query = query.eq('priority', filter.priority)
  if (filter?.search) {
    query = query.or(
      `name.ilike.%${filter.search}%,city.ilike.%${filter.search}%,contact_person.ilike.%${filter.search}%,region.ilike.%${filter.search}%`
    )
  }

  query = query
    .order('priority', { ascending: true }) // high first
    .order('updated_at', { ascending: false })
    .limit(filter?.limit ?? 200)

  if (filter?.offset) query = query.range(filter.offset, filter.offset + (filter.limit ?? 200) - 1)

  const { data, error } = await query
  if (error) {
    console.error('[getProspects] Error:', error)
    return []
  }
  return (data ?? []) as Prospect[]
}

export async function getProspect(id: string): Promise<Prospect | null> {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getProspect] Error:', error)
    return null
  }
  return data as Prospect
}

export async function getProspectStats(): Promise<ProspectStats> {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .select('status')
    .eq('chef_id', user.tenantId!)

  if (error || !data)
    return {
      total: 0,
      new: 0,
      queued: 0,
      called: 0,
      follow_up: 0,
      converted: 0,
      dead: 0,
      not_interested: 0,
    }

  const stats: ProspectStats = {
    total: data.length,
    new: 0,
    queued: 0,
    called: 0,
    follow_up: 0,
    converted: 0,
    dead: 0,
    not_interested: 0,
  }
  for (const row of data) {
    const s = row.status as keyof Omit<ProspectStats, 'total'>
    if (s in stats) stats[s]++
  }
  return stats
}

export async function getProspectNotes(prospectId: string): Promise<ProspectNote[]> {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospect_notes')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getProspectNotes] Error:', error)
    return []
  }
  return (data ?? []) as ProspectNote[]
}

export async function getScrubSessions() {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospect_scrub_sessions')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getScrubSessions] Error:', error)
    return []
  }
  return data ?? []
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function addProspectManually(input: z.infer<typeof ManualProspectSchema>) {
  await requireAdmin()
  const user = await requireChef()
  const validated = ManualProspectSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .insert({
      ...validated,
      chef_id: user.tenantId!,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    console.error('[addProspectManually] Error:', error)
    throw new Error('Failed to add prospect')
  }

  revalidatePath('/prospecting')
  return { success: true as const, prospect: data as Prospect }
}

export async function addProspectNote(prospectId: string, content: string, noteType = 'general') {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospect_notes')
    .insert({
      prospect_id: prospectId,
      chef_id: user.tenantId!,
      note_type: noteType,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) {
    console.error('[addProspectNote] Error:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath(`/prospecting/${prospectId}`)
  return { success: true as const, note: data as ProspectNote }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateProspect(id: string, input: z.infer<typeof UpdateProspectSchema>) {
  await requireAdmin()
  const user = await requireChef()
  const validated = UpdateProspectSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .update(validated)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateProspect] Error:', error)
    throw new Error('Failed to update prospect')
  }

  revalidatePath('/prospecting')
  revalidatePath(`/prospecting/${id}`)
  return { success: true as const, prospect: data as Prospect }
}

export async function updateProspectStatus(id: string, status: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'converted') updates.converted_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateProspectStatus] Error:', error)
    throw new Error('Failed to update prospect status')
  }

  revalidatePath('/prospecting')
  revalidatePath(`/prospecting/${id}`)
  return { success: true as const, prospect: data as Prospect }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteScrubSession(sessionId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Delete associated prospects first (FK), then the session
  const { error: prospectsError } = await supabase
    .from('prospects')
    .delete()
    .eq('scrub_session_id', sessionId)
    .eq('chef_id', user.tenantId!)

  if (prospectsError) {
    console.error('[deleteScrubSession] Prospects delete error:', prospectsError)
    throw new Error('Failed to delete session prospects')
  }

  const { error: sessionError } = await supabase
    .from('prospect_scrub_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('chef_id', user.tenantId!)

  if (sessionError) {
    console.error('[deleteScrubSession] Session delete error:', sessionError)
    throw new Error('Failed to delete scrub session')
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/scrub')
  return { success: true as const }
}

export async function deleteProspect(id: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteProspect] Error:', error)
    throw new Error('Failed to delete prospect')
  }

  revalidatePath('/prospecting')
  return { success: true as const }
}
