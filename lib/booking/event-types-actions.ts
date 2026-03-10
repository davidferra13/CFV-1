// Booking Event Types - Server Actions
// Chef-side CRUD for bookable service types (Tasting, Dinner Party, etc.)
// Public read for the booking page (no auth).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

// ---- Types ----

export type BookingEventType = {
  id: string
  chef_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number | null
  guest_count_min: number
  guest_count_max: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_hours: number
  color: string | null
  sort_order: number
  is_active: boolean
}

export type PublicEventType = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number | null
  guest_count_min: number
  guest_count_max: number
}

// ---- Schemas ----

const EventTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  duration_minutes: z.number().int().min(15).max(1440).default(180),
  price_cents: z.number().int().min(0).optional().nullable(),
  guest_count_min: z.number().int().min(1).default(1),
  guest_count_max: z.number().int().min(1).default(50),
  buffer_before_minutes: z.number().int().min(0).max(480).default(0),
  buffer_after_minutes: z.number().int().min(0).max(480).default(0),
  min_notice_hours: z.number().int().min(0).max(2160).default(168),
  color: z.string().max(7).optional().or(z.literal('')),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
})

// ---- Chef Actions ----

export async function getEventTypes(): Promise<BookingEventType[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('booking_event_types')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventTypes] Error:', error)
    return []
  }

  return (data ?? []) as BookingEventType[]
}

export async function createEventType(
  input: z.infer<typeof EventTypeSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const validated = EventTypeSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('booking_event_types')
    .insert({
      chef_id: user.entityId,
      name: validated.name.trim(),
      description: validated.description?.trim() || null,
      duration_minutes: validated.duration_minutes,
      price_cents: validated.price_cents ?? null,
      guest_count_min: validated.guest_count_min,
      guest_count_max: validated.guest_count_max,
      buffer_before_minutes: validated.buffer_before_minutes,
      buffer_after_minutes: validated.buffer_after_minutes,
      min_notice_hours: validated.min_notice_hours,
      color: validated.color?.trim() || null,
      sort_order: validated.sort_order,
      is_active: validated.is_active,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true, id: data.id }
}

export async function updateEventType(
  id: string,
  input: Partial<z.infer<typeof EventTypeSchema>>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name.trim()
  if (input.description !== undefined) update.description = input.description?.trim() || null
  if (input.duration_minutes !== undefined) update.duration_minutes = input.duration_minutes
  if (input.price_cents !== undefined) update.price_cents = input.price_cents ?? null
  if (input.guest_count_min !== undefined) update.guest_count_min = input.guest_count_min
  if (input.guest_count_max !== undefined) update.guest_count_max = input.guest_count_max
  if (input.buffer_before_minutes !== undefined)
    update.buffer_before_minutes = input.buffer_before_minutes
  if (input.buffer_after_minutes !== undefined)
    update.buffer_after_minutes = input.buffer_after_minutes
  if (input.min_notice_hours !== undefined) update.min_notice_hours = input.min_notice_hours
  if (input.color !== undefined) update.color = input.color?.trim() || null
  if (input.sort_order !== undefined) update.sort_order = input.sort_order
  if (input.is_active !== undefined) update.is_active = input.is_active

  const { error } = await supabase
    .from('booking_event_types')
    .update(update)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

export async function deleteEventType(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('booking_event_types')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) return { success: false, error: error.message }

  revalidateTag('chef-booking-profile')
  return { success: true }
}

// ---- Public Actions (no auth) ----

export async function getPublicEventTypes(chefId: string): Promise<PublicEventType[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('booking_event_types')
    .select(
      'id, name, description, duration_minutes, price_cents, guest_count_min, guest_count_max'
    )
    .eq('chef_id', chefId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getPublicEventTypes] Error:', error)
    return []
  }

  return (data ?? []) as PublicEventType[]
}
