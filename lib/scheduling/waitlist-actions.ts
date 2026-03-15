'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type WaitlistStatus = 'waiting' | 'contacted' | 'booked' | 'expired'

export interface WaitlistEntry {
  id: string
  chef_id: string
  client_id: string | null
  status: string
  requested_date: string
  requested_date_end: string | null
  occasion: string | null
  guest_count_estimate: number | null
  notes: string | null
  contacted_at: string | null
  converted_event_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    email: string | null
  } | null
}

export interface AddToWaitlistInput {
  client_id?: string | null
  requested_date: string
  requested_date_end?: string | null
  occasion?: string | null
  guest_count_estimate?: number | null
  notes?: string | null
  expires_at?: string | null
}

export interface UpdateWaitlistInput {
  status?: WaitlistStatus
  notes?: string | null
  contacted_at?: string | null
  expires_at?: string | null
  guest_count_estimate?: number | null
  occasion?: string | null
}

export interface WaitlistStats {
  total: number
  waiting: number
  contacted: number
  booked: number
  expired: number
  conversionRate: number
}

// ============================================
// ACTIONS
// ============================================

export async function getWaitlistEntries(status?: WaitlistStatus): Promise<WaitlistEntry[]> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  let query = supabase
    .from('waitlist_entries')
    .select('*, client:clients(id, name, email)')
    .eq('chef_id', chefId)
    .order('requested_date', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[waitlist] Failed to fetch entries:', error)
    throw new Error('Failed to load waitlist entries')
  }

  return (data ?? []) as unknown as WaitlistEntry[]
}

export async function addToWaitlist(input: AddToWaitlistInput): Promise<WaitlistEntry> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await supabase
    .from('waitlist_entries')
    .insert({
      chef_id: chefId,
      client_id: input.client_id ?? null,
      requested_date: input.requested_date,
      requested_date_end: input.requested_date_end ?? null,
      occasion: input.occasion ?? null,
      guest_count_estimate: input.guest_count_estimate ?? null,
      notes: input.notes ?? null,
      expires_at: input.expires_at ?? null,
      status: 'waiting',
    })
    .select('*, client:clients(id, name, email)')
    .single()

  if (error) {
    console.error('[waitlist] Failed to add entry:', error)
    throw new Error('Failed to add to waitlist')
  }

  revalidatePath('/schedule')
  return data as unknown as WaitlistEntry
}

export async function updateWaitlistEntry(
  entryId: string,
  input: UpdateWaitlistInput
): Promise<WaitlistEntry> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  const updateData: Record<string, unknown> = {}
  if (input.status !== undefined) updateData.status = input.status
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.contacted_at !== undefined) updateData.contacted_at = input.contacted_at
  if (input.expires_at !== undefined) updateData.expires_at = input.expires_at
  if (input.guest_count_estimate !== undefined)
    updateData.guest_count_estimate = input.guest_count_estimate
  if (input.occasion !== undefined) updateData.occasion = input.occasion

  const { data, error } = await supabase
    .from('waitlist_entries')
    .update(updateData)
    .eq('id', entryId)
    .eq('chef_id', chefId)
    .select('*, client:clients(id, name, email)')
    .single()

  if (error) {
    console.error('[waitlist] Failed to update entry:', error)
    throw new Error('Failed to update waitlist entry')
  }

  revalidatePath('/schedule')
  return data as unknown as WaitlistEntry
}

export async function removeFromWaitlist(entryId: string): Promise<void> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  const { error } = await supabase
    .from('waitlist_entries')
    .delete()
    .eq('id', entryId)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[waitlist] Failed to remove entry:', error)
    throw new Error('Failed to remove from waitlist')
  }

  revalidatePath('/schedule')
}

export async function notifyWaitlistOpening(date: string): Promise<WaitlistEntry[]> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  // Find waitlist entries where the opened date falls within their requested range
  // An entry matches if: requested_date <= date AND (requested_date_end >= date OR requested_date_end is null)
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*, client:clients(id, name, email)')
    .eq('chef_id', chefId)
    .eq('status', 'waiting')
    .lte('requested_date', date)
    .or(`requested_date_end.gte.${date},requested_date_end.is.null`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[waitlist] Failed to find matching entries:', error)
    throw new Error('Failed to find matching waitlist entries')
  }

  return (data ?? []) as unknown as WaitlistEntry[]
}

export async function getWaitlistStats(): Promise<WaitlistStats> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('status')
    .eq('chef_id', chefId)

  if (error) {
    console.error('[waitlist] Failed to fetch stats:', error)
    throw new Error('Failed to load waitlist stats')
  }

  const entries = data ?? []
  const total = entries.length
  const waiting = entries.filter((e) => e.status === 'waiting').length
  const contacted = entries.filter((e) => e.status === 'contacted').length
  const booked = entries.filter((e) => e.status === 'booked').length
  const expired = entries.filter((e) => e.status === 'expired').length

  // Conversion rate: booked / (total entries that are no longer waiting)
  const resolved = booked + expired
  const conversionRate = resolved > 0 ? (booked / resolved) * 100 : 0

  return { total, waiting, contacted, booked, expired, conversionRate }
}

export async function convertWaitlistToEvent(entryId: string): Promise<string> {
  const user = await requireChef()
  const supabase = await createServerClient()
  const chefId = user.tenantId!

  // Fetch the waitlist entry
  const { data: entry, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('*, client:clients(id, name, email)')
    .eq('id', entryId)
    .eq('chef_id', chefId)
    .single()

  if (fetchError || !entry) {
    console.error('[waitlist] Entry not found:', fetchError)
    throw new Error('Waitlist entry not found')
  }

  if (entry.status === 'booked') {
    throw new Error('This waitlist entry has already been converted')
  }

  // Create a draft event from the waitlist entry
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: chefId,
      client_id: entry.client_id,
      occasion: entry.occasion ? `${entry.occasion} (from waitlist)` : 'Event (from waitlist)',
      event_date: entry.requested_date,
      guest_count: entry.guest_count_estimate ?? 0,
      status: 'draft' as const,
      notes: entry.notes,
      created_by: user.id,
    } as any)
    .select('id')
    .single()

  if (eventError || !event) {
    console.error('[waitlist] Failed to create event:', eventError)
    throw new Error('Failed to create event from waitlist entry')
  }

  // Mark the waitlist entry as booked and link it to the new event
  const { error: updateError } = await supabase
    .from('waitlist_entries')
    .update({
      status: 'booked',
      converted_event_id: event.id,
    })
    .eq('id', entryId)
    .eq('chef_id', chefId)

  if (updateError) {
    console.error('[waitlist] Failed to update entry after conversion:', updateError)
    // Event was created but waitlist entry not updated. Log but don't fail.
  }

  revalidatePath('/schedule')
  revalidatePath('/events')

  return event.id
}
