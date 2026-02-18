// Event CRUD Server Actions
// Enforces tenant scoping and RLS at database layer

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas aligned with new events table
const CreateEventSchema = z.object({
  client_id: z.string().uuid(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must be YYYY-MM-DD format'),
  serve_time: z.string().min(1, 'Serve time required'),
  guest_count: z.number().int().positive(),
  location_address: z.string().min(1, 'Address required'),
  location_city: z.string().min(1, 'City required'),
  location_state: z.string().optional(),
  location_zip: z.string().min(1, 'ZIP required'),
  occasion: z.string().optional(),
  service_style: z.enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other']).optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  quoted_price_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  special_requests: z.string().optional(),
  site_notes: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_notes: z.string().optional(),
  location_notes: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  cannabis_preference: z.boolean().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
})

const UpdateEventSchema = z.object({
  event_date: z.string().optional(),
  serve_time: z.string().optional(),
  guest_count: z.number().int().positive().optional(),
  location_address: z.string().min(1).optional(),
  location_city: z.string().min(1).optional(),
  location_state: z.string().optional(),
  location_zip: z.string().min(1).optional(),
  occasion: z.string().optional(),
  service_style: z.enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other']).optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  quoted_price_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  special_requests: z.string().optional(),
  site_notes: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_notes: z.string().optional(),
  location_notes: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  pricing_notes: z.string().optional(),
  cannabis_preference: z.boolean().optional(),
  payment_method_primary: z.enum(['cash', 'venmo', 'paypal', 'zelle', 'card', 'check', 'other']).optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>

/**
 * Create event (chef-only)
 * Status starts as 'draft'
 */
export async function createEvent(input: CreateEventInput) {
  const user = await requireChef()

  // Validate input
  const validated = CreateEventSchema.parse(input)

  const supabase = createServerClient()

  // Verify client belongs to this tenant
  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', validated.client_id)
    .single()

  if (!client || client.tenant_id !== user.tenantId) {
    throw new Error('Client not found or does not belong to your tenant')
  }

  // Create event (status defaults to 'draft' in DB)
  const insertPayload: Record<string, unknown> = {
    tenant_id: user.tenantId!,
    client_id: validated.client_id,
    event_date: validated.event_date,
    serve_time: validated.serve_time,
    guest_count: validated.guest_count,
    location_address: validated.location_address,
    location_city: validated.location_city,
    location_state: validated.location_state,
    location_zip: validated.location_zip,
    occasion: validated.occasion,
    service_style: validated.service_style,
    pricing_model: validated.pricing_model,
    quoted_price_cents: validated.quoted_price_cents,
    deposit_amount_cents: validated.deposit_amount_cents,
    dietary_restrictions: validated.dietary_restrictions,
    allergies: validated.allergies,
    special_requests: validated.special_requests,
    site_notes: validated.site_notes,
    access_instructions: validated.access_instructions,
    kitchen_notes: validated.kitchen_notes,
    location_notes: validated.location_notes,
    arrival_time: validated.arrival_time,
    departure_time: validated.departure_time,
    cannabis_preference: validated.cannabis_preference,
    location_lat: validated.location_lat,
    location_lng: validated.location_lng,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert(insertPayload as any)
    .select()
    .single()

  if (error) {
    console.error('[createEvent] Error:', error)
    throw new Error('Failed to create event')
  }

  // Log initial transition to 'draft'
  await supabase.from('event_state_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'event_created' }
  })

  revalidatePath('/events')
  return { success: true, event }
}

/**
 * Get events list (chef-only, tenant-scoped by RLS)
 */
export async function getEvents() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      client:clients(id, full_name, email)
    `)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getEvents] Error:', error)
    throw new Error('Failed to fetch events')
  }

  return events
}

/**
 * Get single event by ID (chef-only, RLS enforces tenant scoping)
 */
export async function getEventById(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      client:clients(id, full_name, email, phone)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getEventById] Error:', error)
    return null
  }

  return event
}

/**
 * Update event (chef-only, ONLY safe fields, NOT status)
 * Status changes go through transitionEvent()
 */
export async function updateEvent(eventId: string, input: UpdateEventInput) {
  const user = await requireChef()

  // Validate input
  const validated = UpdateEventSchema.parse(input)

  const supabase = createServerClient()

  // Fetch current event to verify ownership and status
  const { data: currentEvent } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!currentEvent) {
    throw new Error('Event not found')
  }

  // Only allow updates if event is in draft or proposed state
  if (!['draft', 'proposed'].includes(currentEvent.status)) {
    throw new Error('Cannot update event after it has been accepted')
  }

  // Update event (RLS enforces tenant_id match)
  const { data: event, error } = await supabase
    .from('events')
    .update({
      ...validated,
      updated_by: user.id
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateEvent] Error:', error)
    throw new Error('Failed to update event')
  }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { success: true, event }
}

/**
 * Delete event (chef-only)
 * Only allow delete if in draft status
 */
export async function deleteEvent(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event exists and is draft
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  if (event.status !== 'draft') {
    throw new Error('Can only delete events in draft status')
  }

  // Delete event (cascades to transitions via ON DELETE CASCADE)
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteEvent] Error:', error)
    throw new Error('Failed to delete event')
  }

  revalidatePath('/events')
  return { success: true }
}

// --- Event Closure Functions ---

export type EventClosureStatus = {
  aarFiled: boolean
  resetComplete: boolean
  followUpSent: boolean
  financiallyClosed: boolean
  allComplete: boolean
}

/**
 * Get closure status for a completed event
 * Returns which post-event requirements are met/pending
 */
export async function getEventClosureStatus(eventId: string): Promise<EventClosureStatus> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('aar_filed, reset_complete, follow_up_sent, financially_closed')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  return {
    aarFiled: event.aar_filed,
    resetComplete: event.reset_complete,
    followUpSent: event.follow_up_sent,
    financiallyClosed: event.financially_closed,
    allComplete: event.aar_filed && event.reset_complete && event.follow_up_sent && event.financially_closed,
  }
}

/**
 * Mark post-service reset as complete
 * (cooler cleaned, equipment put away, laundry started, car cleared)
 */
export async function markResetComplete(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { error } = await supabase
    .from('events')
    .update({
      reset_complete: true,
      reset_completed_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markResetComplete] Error:', error)
    throw new Error('Failed to mark reset complete')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Mark follow-up as sent (thank-you message to client)
 */
export async function markFollowUpSent(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { error } = await supabase
    .from('events')
    .update({
      follow_up_sent: true,
      follow_up_sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markFollowUpSent] Error:', error)
    throw new Error('Failed to mark follow-up sent')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get events needing closure (completed but missing AAR/reset/follow-up/financial closure)
 */
export async function getEventsNeedingClosure() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, guest_count,
      aar_filed, reset_complete, follow_up_sent, financially_closed,
      client:clients(id, full_name)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .or('aar_filed.eq.false,reset_complete.eq.false,follow_up_sent.eq.false,financially_closed.eq.false')
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getEventsNeedingClosure] Error:', error)
    return []
  }

  return events
}

/**
 * Update time tracking and card fields on an event
 */
export async function updateEventTimeAndCard(
  eventId: string,
  data: {
    time_shopping_minutes?: number | null
    time_prep_minutes?: number | null
    time_travel_minutes?: number | null
    time_service_minutes?: number | null
    time_reset_minutes?: number | null
    payment_card_used?: string | null
    card_cashback_percent?: number | null
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('events')
    .update(data)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateEventTimeAndCard] Error:', error)
    throw new Error('Failed to update event')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
