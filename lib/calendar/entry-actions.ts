// Chef Calendar Entry Actions — Server Actions
// Full CRUD for chef_calendar_entries.
// Handles personal, business, and intention-type calendar entries
// with revenue tracking and public availability signal support.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ENTRY_TYPE_BLOCKS_BOOKINGS, REVENUE_CAPABLE_TYPES } from './colors'

// ============================================
// TYPES
// ============================================

export type ChefCalendarEntryType =
  | 'vacation'
  | 'time_off'
  | 'personal'
  | 'market'
  | 'festival'
  | 'class'
  | 'photo_shoot'
  | 'media'
  | 'meeting'
  | 'admin_block'
  | 'other'
  | 'target_booking'
  | 'soft_preference'

export type RevenueType = 'income' | 'promotional'

export type ChefCalendarEntry = {
  id: string
  chef_id: string
  entry_type: ChefCalendarEntryType
  title: string
  description: string | null
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  blocks_bookings: boolean
  is_revenue_generating: boolean
  revenue_type: RevenueType | null
  expected_revenue_cents: number | null
  actual_revenue_cents: number | null
  revenue_notes: string | null
  is_public: boolean
  public_note: string | null
  color_override: string | null
  is_private: boolean
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

// ============================================
// SCHEMAS
// ============================================

const EntryTypeEnum = z.enum([
  'vacation',
  'time_off',
  'personal',
  'market',
  'festival',
  'class',
  'photo_shoot',
  'media',
  'meeting',
  'admin_block',
  'other',
  'target_booking',
  'soft_preference',
])

const CreateEntrySchema = z.object({
  entry_type: EntryTypeEnum,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  all_day: z.boolean().default(true),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  // Optional override; if omitted, auto-set from entry_type default
  blocks_bookings: z.boolean().optional(),
  // Revenue
  is_revenue_generating: z.boolean().default(false),
  revenue_type: z.enum(['income', 'promotional']).nullable().optional(),
  expected_revenue_cents: z.number().int().min(0).nullable().optional(),
  revenue_notes: z.string().optional(),
  // Public signal
  is_public: z.boolean().default(false),
  public_note: z.string().max(500).optional(),
  // Color override
  color_override: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

const UpdateEntrySchema = CreateEntrySchema.partial().extend({
  actual_revenue_cents: z.number().int().min(0).nullable().optional(),
})

export type CreateCalendarEntryInput = z.infer<typeof CreateEntrySchema>
export type UpdateCalendarEntryInput = z.infer<typeof UpdateEntrySchema>

// ============================================
// CREATE
// ============================================

export async function createCalendarEntry(input: CreateCalendarEntryInput) {
  const user = await requireChef()
  const validated = CreateEntrySchema.parse(input)
  const supabase = createServerClient()

  // Auto-set blocks_bookings from type default if not explicitly provided
  const blocksBookings =
    validated.blocks_bookings !== undefined
      ? validated.blocks_bookings
      : (ENTRY_TYPE_BLOCKS_BOOKINGS[validated.entry_type] ?? false)

  // Revenue fields only valid on revenue-capable types
  const isRevenue = REVENUE_CAPABLE_TYPES.has(validated.entry_type)
    ? validated.is_revenue_generating
    : false

  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .insert({
      chef_id: user.tenantId!,
      entry_type: validated.entry_type,
      title: validated.title,
      description: validated.description ?? null,
      start_date: validated.start_date,
      end_date: validated.end_date,
      all_day: validated.all_day,
      start_time: validated.all_day ? null : (validated.start_time ?? null),
      end_time: validated.all_day ? null : (validated.end_time ?? null),
      blocks_bookings: blocksBookings,
      is_revenue_generating: isRevenue,
      revenue_type: isRevenue ? (validated.revenue_type ?? null) : null,
      expected_revenue_cents: isRevenue ? (validated.expected_revenue_cents ?? null) : null,
      revenue_notes: validated.revenue_notes ?? null,
      is_public: validated.entry_type === 'target_booking' ? validated.is_public : false,
      public_note:
        validated.entry_type === 'target_booking' ? (validated.public_note ?? null) : null,
      color_override: validated.color_override ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createCalendarEntry] Error:', error)
    throw new Error('Failed to create calendar entry')
  }

  revalidatePath('/calendar')
  return data as ChefCalendarEntry
}

// ============================================
// UPDATE
// ============================================

export async function updateCalendarEntry(id: string, input: UpdateCalendarEntryInput) {
  const user = await requireChef()
  const validated = UpdateEntrySchema.parse(input)
  const supabase = createServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('chef_calendar_entries')
    .select('chef_id')
    .eq('id', id)
    .single()

  if (!existing || existing.chef_id !== user.tenantId!) {
    throw new Error('Not found or unauthorized')
  }

  const updateData: Record<string, unknown> = { ...validated }

  // Re-apply auto-logic if entry_type changed
  if (validated.entry_type !== undefined && validated.blocks_bookings === undefined) {
    updateData.blocks_bookings = ENTRY_TYPE_BLOCKS_BOOKINGS[validated.entry_type] ?? false
  }

  // Prevent is_public on non-target-booking entries
  if (validated.entry_type && validated.entry_type !== 'target_booking') {
    updateData.is_public = false
    updateData.public_note = null
  }

  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[updateCalendarEntry] Error:', error)
    throw new Error('Failed to update calendar entry')
  }

  revalidatePath('/calendar')
  return data as ChefCalendarEntry
}

// ============================================
// DELETE
// ============================================

export async function deleteCalendarEntry(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('chef_calendar_entries')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteCalendarEntry] Error:', error)
    throw new Error('Failed to delete calendar entry')
  }

  revalidatePath('/calendar')
}

// ============================================
// FETCH FOR DATE RANGE
// ============================================

export async function getCalendarEntriesForRange(
  startDate: string,
  endDate: string
): Promise<ChefCalendarEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Entries that overlap the query window:
  // entry.start_date <= endDate AND entry.end_date >= startDate
  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date', { ascending: true })

  if (error) {
    console.error('[getCalendarEntriesForRange] Error:', error)
    return []
  }

  return (data ?? []) as ChefCalendarEntry[]
}

// ============================================
// FETCH SINGLE
// ============================================

export async function getCalendarEntry(id: string): Promise<ChefCalendarEntry | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) return null
  return data as ChefCalendarEntry
}

// ============================================
// MARK COMPLETE
// ============================================

export async function markCalendarEntryComplete(id: string, actualRevenueCents?: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('chef_calendar_entries')
    .select('chef_id, is_revenue_generating')
    .eq('id', id)
    .single()

  if (!existing || existing.chef_id !== user.tenantId!) {
    throw new Error('Not found or unauthorized')
  }

  const updateFields: Record<string, unknown> = {
    is_completed: true,
    completed_at: new Date().toISOString(),
  }

  if (existing.is_revenue_generating && actualRevenueCents !== undefined) {
    updateFields.actual_revenue_cents = actualRevenueCents
  }

  const { error } = await supabase.from('chef_calendar_entries').update(updateFields).eq('id', id)

  if (error) {
    console.error('[markCalendarEntryComplete] Error:', error)
    throw new Error('Failed to mark entry as complete')
  }

  revalidatePath('/calendar')
  revalidatePath('/financials')
}

// ============================================
// NOTIFY CLIENTS OF PUBLIC SIGNAL
// ============================================

export async function notifyClientsOfPublicSignal(calendarEntryId: string) {
  const user = await requireChef()
  const supabase = createServerClient()
  const chefId = user.tenantId!

  // Verify entry exists, belongs to this chef, and is public + target_booking
  const { data: entry } = await supabase
    .from('chef_calendar_entries')
    .select('id, entry_type, is_public, start_date, title, public_note')
    .eq('id', calendarEntryId)
    .eq('chef_id', chefId)
    .single()

  if (!entry || !entry.is_public || entry.entry_type !== 'target_booking') {
    throw new Error('Entry not found or not a public target_booking')
  }

  // Get all opted-in clients for this chef
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('availability_signal_notifications', true)

  if (!clients || clients.length === 0) return { notified: 0 }

  // Insert notification log rows (unique constraint prevents duplicates)
  const rows = clients.map((c: { id: string }) => ({
    chef_id: chefId,
    calendar_entry_id: calendarEntryId,
    client_id: c.id,
  }))

  const { data: inserted, error } = await supabase
    .from('availability_signal_notification_log')
    .insert(rows)
    .select('id')

  if (error) {
    // Unique violations expected for already-notified clients — not a hard error
    console.warn(
      '[notifyClientsOfPublicSignal] Some rows skipped (already notified):',
      error.message
    )
  }

  // TODO: trigger actual email/push notification via notification system
  // await sendAvailabilitySignalNotification(chefId, entry, clients)

  return { notified: inserted?.length ?? 0 }
}

// ============================================
// GET PUBLIC SIGNALS (for public chef profile)
// ============================================

export async function getPublicAvailabilitySignals(chefId: string) {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .select('id, entry_type, title, start_date, end_date, public_note')
    .eq('chef_id', chefId)
    .eq('entry_type', 'target_booking')
    .eq('is_public', true)
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(12) // surface up to 12 future signals on public profile

  if (error) return []
  return (data ?? []) as Array<{
    id: string
    entry_type: string
    title: string
    start_date: string
    end_date: string
    public_note: string | null
  }>
}

// ============================================
// MARKET INCOME SUMMARY (for Financials)
// ============================================

export async function getMarketIncomeSummary(year: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data, error } = await supabase
    .from('chef_calendar_entries')
    .select(
      'entry_type, title, start_date, expected_revenue_cents, actual_revenue_cents, revenue_type, is_completed'
    )
    .eq('chef_id', user.tenantId!)
    .eq('is_revenue_generating', true)
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: true })

  if (error) {
    console.error('[getMarketIncomeSummary] Error:', error)
    return []
  }

  return (data ?? []) as Array<{
    entry_type: string
    title: string
    start_date: string
    expected_revenue_cents: number | null
    actual_revenue_cents: number | null
    revenue_type: string | null
    is_completed: boolean
  }>
}
