// Availability & Waitlist Management — Server Actions
// Chefs can block dates, view monthly availability, and manage a waitlist.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const BlockDateSchema = z.object({
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  block_type: z.enum(['full_day', 'partial']).default('full_day'),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  reason: z.string().optional(),
})

const WaitlistEntrySchema = z.object({
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requested_date_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  occasion: z.string().optional(),
  guest_count_estimate: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  expires_at: z.string().nullable().optional(),
})

export type BlockDateInput       = z.infer<typeof BlockDateSchema>
export type WaitlistEntryInput   = z.infer<typeof WaitlistEntrySchema>

// ============================================
// AVAILABILITY BLOCK ACTIONS
// ============================================

export async function blockDate(input: BlockDateInput) {
  const user = await requireChef()
  const validated = BlockDateSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_availability_blocks')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
      is_event_auto: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[blockDate] Error:', error)
    throw new Error('Failed to block date')
  }

  revalidatePath('/calendar')
  return data
}

export async function unblockDate(blockId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
    .from('chef_availability_blocks')
    .delete()
    .eq('id', blockId)
    .eq('chef_id', user.tenantId!)
    .eq('is_event_auto', false) // cannot manually delete auto-blocks

  if (error) throw new Error('Failed to remove block')
  revalidatePath('/calendar')
}

/**
 * Auto-block a date when an event is confirmed.
 * Called from the event transition logic.
 */
export async function autoBlockEventDate(eventId: string, chefId: string, eventDate: string) {
  const supabase = createServerClient()

  // Idempotent: skip if already blocked for this event
  const { data: existing } = await (supabase as any)
    .from('chef_availability_blocks')
    .select('id')
    .eq('chef_id', chefId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return

  await (supabase as any)
    .from('chef_availability_blocks')
    .insert({
      chef_id: chefId,
      block_date: eventDate,
      block_type: 'full_day',
      is_event_auto: true,
      event_id: eventId,
      reason: 'Confirmed event',
    })
}

/**
 * Remove auto-block when an event is cancelled.
 */
export async function removeEventAutoBlock(eventId: string) {
  const supabase = createServerClient()
  await (supabase as any)
    .from('chef_availability_blocks')
    .delete()
    .eq('event_id', eventId)
    .eq('is_event_auto', true)
}

/**
 * Get availability for a month.
 * Returns an object keyed by ISO date string with type: 'event' | 'blocked' | 'free'
 */
export async function getAvailabilityForMonth(
  year: number,
  month: number // 1-12
): Promise<Record<string, 'event_auto' | 'blocked' | 'free'>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

  const { data: blocks } = await (supabase as any)
    .from('chef_availability_blocks')
    .select('block_date, is_event_auto')
    .eq('chef_id', user.tenantId!)
    .gte('block_date', startDate)
    .lte('block_date', endDate)

  const result: Record<string, 'event_auto' | 'blocked' | 'free'> = {}
  for (const block of blocks ?? []) {
    result[block.block_date] = block.is_event_auto ? 'event_auto' : 'blocked'
  }
  return result
}

export async function isDateAvailable(date: string): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('chef_availability_blocks')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('block_date', date)
    .maybeSingle()

  return !data
}

// ============================================
// WAITLIST ACTIONS
// ============================================

export async function addToWaitlist(input: WaitlistEntryInput) {
  const user = await requireChef()
  const validated = WaitlistEntrySchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('waitlist_entries')
    .insert({
      chef_id: user.tenantId!,
      ...validated,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) {
    console.error('[addToWaitlist] Error:', error)
    throw new Error('Failed to add to waitlist')
  }

  revalidatePath('/waitlist')
  return data
}

export async function contactWaitlistEntry(entryId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  await (supabase as any)
    .from('waitlist_entries')
    .update({ status: 'contacted', contacted_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function convertWaitlistEntry(entryId: string, eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  await (supabase as any)
    .from('waitlist_entries')
    .update({ status: 'converted', converted_event_id: eventId })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function expireWaitlistEntry(entryId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  await (supabase as any)
    .from('waitlist_entries')
    .update({ status: 'expired' })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/waitlist')
}

export async function getWaitlistEntries(status?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = (supabase as any)
    .from('waitlist_entries')
    .select(`
      *,
      clients (id, full_name, email, phone)
    `)
    .eq('chef_id', user.tenantId!)
    .order('requested_date', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error('Failed to load waitlist')
  return data ?? []
}

export async function getWaitlistForDate(date: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('waitlist_entries')
    .select(`
      *,
      clients (id, full_name, email, phone)
    `)
    .eq('chef_id', user.tenantId!)
    .eq('requested_date', date)
    .eq('status', 'waiting')
    .order('created_at')

  return data ?? []
}
