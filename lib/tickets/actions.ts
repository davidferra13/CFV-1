// Event Ticketing System - Chef-Side Server Actions
// CRUD for ticket types, ticket management, and sales queries.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { EventTicketType, EventTicket, EventTicketSummary } from './types'

// ─── Schemas ─────────────────────────────────────────────────────────

const CreateTicketTypeSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.number().int().min(0),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

const UpdateTicketTypeSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// ─── Ticket Type CRUD ────────────────────────────────────────────────

export async function createTicketType(
  input: z.infer<typeof CreateTicketTypeSchema>
): Promise<EventTicketType> {
  const user = await requireChef()
  const validated = CreateTicketTypeSchema.parse(input)
  const db: any = createServerClient()

  // Verify chef owns this event
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data, error } = await db
    .from('event_ticket_types')
    .insert({
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description ?? null,
      price_cents: validated.priceCents,
      capacity: validated.capacity ?? null,
      sort_order: validated.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create ticket type: ${error.message}`)

  revalidatePath(`/events/${validated.eventId}`)
  return data as EventTicketType
}

export async function updateTicketType(
  input: z.infer<typeof UpdateTicketTypeSchema>
): Promise<EventTicketType> {
  const user = await requireChef()
  const validated = UpdateTicketTypeSchema.parse(input)
  const db: any = createServerClient()

  // Verify ownership
  const { data: existing } = await db
    .from('event_ticket_types')
    .select('id, sold_count')
    .eq('id', validated.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Ticket type not found')

  // Cannot reduce capacity below sold_count
  if (validated.capacity !== undefined && validated.capacity !== null) {
    if (validated.capacity < existing.sold_count) {
      throw new Error(
        `Cannot set capacity to ${validated.capacity}; ${existing.sold_count} tickets already sold`
      )
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.description !== undefined) updates.description = validated.description
  if (validated.priceCents !== undefined) updates.price_cents = validated.priceCents
  if (validated.capacity !== undefined) updates.capacity = validated.capacity
  if (validated.sortOrder !== undefined) updates.sort_order = validated.sortOrder
  if (validated.isActive !== undefined) updates.is_active = validated.isActive

  const { data, error } = await db
    .from('event_ticket_types')
    .update(updates)
    .eq('id', validated.id)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update ticket type: ${error.message}`)

  revalidatePath(`/events/${validated.eventId}`)
  return data as EventTicketType
}

export async function deleteTicketType(input: { id: string; eventId: string }): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check no paid tickets exist for this type
  const { count } = await db
    .from('event_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('ticket_type_id', input.id)
    .eq('tenant_id', user.tenantId!)
    .eq('payment_status', 'paid')

  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} paid tickets exist for this type. Deactivate instead.`)
  }

  const { error } = await db
    .from('event_ticket_types')
    .delete()
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete ticket type: ${error.message}`)

  revalidatePath(`/events/${input.eventId}`)
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function getEventTicketTypes(eventId: string): Promise<EventTicketType[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load ticket types: ${error.message}`)

  return (data ?? []).map((tt: any) => ({
    ...tt,
    remaining: tt.capacity !== null ? Math.max(0, tt.capacity - tt.sold_count) : null,
  })) as EventTicketType[]
}

export async function getEventTickets(eventId: string): Promise<EventTicket[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_tickets')
    .select('*, event_ticket_types(*)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .neq('payment_status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load tickets: ${error.message}`)

  return (data ?? []).map((t: any) => ({
    ...t,
    ticket_type: t.event_ticket_types ?? null,
    event_ticket_types: undefined,
  })) as EventTicket[]
}

export async function getEventTicketSummary(eventId: string): Promise<EventTicketSummary | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_ticket_summary')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) return null
  return data as EventTicketSummary | null
}

// ─── Comp Tickets (free/manual add) ─────────────────────────────────

export async function createCompTicket(input: {
  eventId: string
  ticketTypeId?: string
  buyerName: string
  buyerEmail: string
  quantity?: number
  notes?: string
}): Promise<EventTicket> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const qty = input.quantity ?? 1

  // If ticket type specified, update sold_count with CAS guard
  if (input.ticketTypeId) {
    const { data: updated, error: casError } = await db.rpc('increment_sold_count', {
      p_ticket_type_id: input.ticketTypeId,
      p_quantity: qty,
    })

    // Fallback: manual CAS if rpc not available
    if (casError) {
      const { data: tt } = await db
        .from('event_ticket_types')
        .select('capacity, sold_count')
        .eq('id', input.ticketTypeId)
        .single()

      if (tt?.capacity !== null && tt.sold_count + qty > tt.capacity) {
        throw new Error('Not enough capacity for this ticket type')
      }

      await db
        .from('event_ticket_types')
        .update({ sold_count: tt.sold_count + qty })
        .eq('id', input.ticketTypeId)
        .eq('sold_count', tt.sold_count) // CAS guard
    }
  }

  const { data, error } = await db
    .from('event_tickets')
    .insert({
      event_id: input.eventId,
      tenant_id: user.tenantId!,
      ticket_type_id: input.ticketTypeId ?? null,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail.toLowerCase().trim(),
      quantity: qty,
      unit_price_cents: 0,
      total_cents: 0,
      payment_status: 'paid',
      source: 'comp',
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create comp ticket: ${error.message}`)

  revalidatePath(`/events/${input.eventId}`)
  return data as EventTicket
}

// ─── Walk-In Tickets ─────────────────────────────────────────────────

export async function createWalkInTicket(input: {
  eventId: string
  ticketTypeId?: string
  buyerName: string
  buyerEmail?: string
  quantity?: number
  paidCents: number
  notes?: string
}): Promise<EventTicket> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const qty = input.quantity ?? 1

  // CAS guard on ticket type if specified
  if (input.ticketTypeId) {
    const { data: tt } = await db
      .from('event_ticket_types')
      .select('capacity, sold_count, price_cents')
      .eq('id', input.ticketTypeId)
      .single()

    if (tt?.capacity !== null && tt.sold_count + qty > tt.capacity) {
      throw new Error('Sold out for this ticket type')
    }

    await db
      .from('event_ticket_types')
      .update({ sold_count: tt.sold_count + qty })
      .eq('id', input.ticketTypeId)
      .eq('sold_count', tt.sold_count) // CAS guard
  }

  const { data, error } = await db
    .from('event_tickets')
    .insert({
      event_id: input.eventId,
      tenant_id: user.tenantId!,
      ticket_type_id: input.ticketTypeId ?? null,
      buyer_name: input.buyerName,
      buyer_email: (input.buyerEmail ?? '').toLowerCase().trim() || 'walkin@cheflowhq.com',
      quantity: qty,
      unit_price_cents: Math.round(input.paidCents / qty),
      total_cents: input.paidCents,
      payment_status: 'paid',
      source: 'walkin',
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create walk-in ticket: ${error.message}`)

  revalidatePath(`/events/${input.eventId}`)
  return data as EventTicket
}

// ─── Refund Ticket ───────────────────────────────────────────────────

export async function refundTicket(input: {
  ticketId: string
  eventId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, payment_status, ticket_type_id, quantity, stripe_payment_intent_id')
    .eq('id', input.ticketId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.payment_status !== 'paid') {
    return { success: false, error: 'Only paid tickets can be refunded' }
  }

  // If Stripe payment, initiate Stripe refund
  if (ticket.stripe_payment_intent_id) {
    try {
      const StripeLib = require('stripe')
      const StripeCtor = StripeLib.default || StripeLib
      const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-12-18.acacia',
      })
      await stripe.refunds.create({
        payment_intent: ticket.stripe_payment_intent_id,
      })
    } catch (err: any) {
      return { success: false, error: `Stripe refund failed: ${err.message}` }
    }
  }

  // Update ticket status
  await db
    .from('event_tickets')
    .update({
      payment_status: 'refunded',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', input.ticketId)
    .eq('payment_status', 'paid') // CAS guard

  // Decrement sold_count on ticket type
  if (ticket.ticket_type_id) {
    const { data: tt } = await db
      .from('event_ticket_types')
      .select('sold_count')
      .eq('id', ticket.ticket_type_id)
      .single()

    if (tt && tt.sold_count > 0) {
      await db
        .from('event_ticket_types')
        .update({ sold_count: Math.max(0, tt.sold_count - ticket.quantity) })
        .eq('id', ticket.ticket_type_id)
        .eq('sold_count', tt.sold_count) // CAS guard
    }
  }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

// ─── Toggle Ticketing on Event ───────────────────────────────────────

export async function toggleEventTicketing(input: {
  eventId: string
  enabled: boolean
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Upsert share settings with tickets_enabled
  const { data: existing } = await db
    .from('event_share_settings')
    .select('id')
    .eq('event_id', input.eventId)
    .maybeSingle()

  if (existing) {
    await db
      .from('event_share_settings')
      .update({ tickets_enabled: input.enabled })
      .eq('event_id', input.eventId)
  } else {
    await db.from('event_share_settings').insert({
      event_id: input.eventId,
      tenant_id: user.tenantId!,
      tickets_enabled: input.enabled,
    })
  }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}
