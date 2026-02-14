// Event CRUD Server Actions
// Enforces tenant scoping and RLS at database layer

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Validation schemas
const CreateEventSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1, 'Title required'),
  event_date: z.string().datetime(), // ISO 8601 format
  guest_count: z.number().int().positive(),
  location: z.string().min(1, 'Location required'),
  notes: z.string().optional(),
  total_amount_cents: z.number().int().nonnegative(),
  deposit_amount_cents: z.number().int().nonnegative(),
  deposit_required: z.boolean().default(true)
})

const UpdateEventSchema = z.object({
  title: z.string().min(1).optional(),
  event_date: z.string().datetime().optional(),
  guest_count: z.number().int().positive().optional(),
  location: z.string().min(1).optional(),
  notes: z.string().optional(),
  total_amount_cents: z.number().int().nonnegative().optional(),
  deposit_amount_cents: z.number().int().nonnegative().optional(),
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

  // Create event (RLS automatically enforces tenant_id)
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      title: validated.title,
      event_date: validated.event_date,
      guest_count: validated.guest_count,
      location: validated.location,
      notes: validated.notes,
      total_amount_cents: validated.total_amount_cents,
      deposit_amount_cents: validated.deposit_amount_cents,
      deposit_required: validated.deposit_required,
      status: 'draft',
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('[createEvent] Error:', error)
    throw new Error(`Failed to create event: ${error.message}`)
  }

  // Log initial transition to 'draft'
  await supabase.from('event_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'event_created' }
  })

  revalidatePath('/chef/events')
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
    .eq('tenant_id', user.tenantId!) // Explicit filter (RLS also enforces)
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
    .eq('tenant_id', user.tenantId!) // Explicit + RLS
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
      updated_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateEvent] Error:', error)
    throw new Error('Failed to update event')
  }

  revalidatePath('/chef/events')
  revalidatePath(`/chef/events/${eventId}`)
  return { success: true, event }
}

/**
 * Delete event (chef-only, soft delete recommended in future)
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

  revalidatePath('/chef/events')
  return { success: true }
}
