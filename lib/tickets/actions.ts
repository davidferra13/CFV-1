// Event Ticketing System - Chef-Side Server Actions
// CRUD for ticket types, ticket management, and sales queries.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { appendLedgerEntryInternal } from '@/lib/ledger/append-internal'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  EventTicketType,
  EventTicket,
  EventTicketSummary,
  EventTicketAddon,
  EventTicketAddonPurchase,
} from './types'

// ─── Schemas ─────────────────────────────────────────────────────────

const CreateTicketTypeSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.number().int().min(0),
  capacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  saleStartsAt: z.string().datetime().optional().nullable(),
  saleEndsAt: z.string().datetime().optional().nullable(),
  earlyAccessMinutes: z.number().int().min(0).max(10080).optional().nullable(),
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
  saleStartsAt: z.string().datetime().optional().nullable(),
  saleEndsAt: z.string().datetime().optional().nullable(),
  earlyAccessMinutes: z.number().int().min(0).max(10080).optional().nullable(),
})

const CreateAddonSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.number().int().min(0),
  maxPerTicket: z.number().int().positive().optional().nullable(),
  totalCapacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

const UpdateAddonSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  maxPerTicket: z.number().int().positive().optional().nullable(),
  totalCapacity: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

const UpdateTicketAttendanceSchema = z.object({
  eventId: z.string().uuid(),
  ticketId: z.string().uuid(),
  attended: z.boolean(),
})

type TicketCapacityCheck = {
  ok: boolean
  remaining: number | null
  error?: string
}

function calculateTicketTypeCapacity(input: {
  capacity: number | null
  soldCount: number
  quantity: number
  label?: string
}): TicketCapacityCheck {
  if (input.quantity <= 0 || !Number.isFinite(input.quantity)) {
    return { ok: false, remaining: input.capacity, error: 'Quantity must be greater than zero' }
  }

  if (input.capacity === null) {
    return { ok: true, remaining: null }
  }

  const remaining = Math.max(0, input.capacity - input.soldCount)
  if (input.quantity > remaining) {
    const label = input.label || 'ticket type'
    return {
      ok: false,
      remaining,
      error:
        remaining > 0 ? `Only ${remaining} unit(s) remaining for ${label}` : `${label} is sold out`,
    }
  }

  return { ok: true, remaining }
}

function isCapacityReleased(ticket: any) {
  return (
    ['cancelled', 'failed', 'refunded'].includes(ticket.payment_status) ||
    Boolean(ticket.capacity_released_at) ||
    Boolean(ticket.deleted_at)
  )
}

async function assertEventCapacityAvailable(db: any, eventId: string, quantity: number) {
  const { data: event } = await db.from('events').select('guest_count').eq('id', eventId).single()
  const eventCapacity = Number(event?.guest_count) || 0
  if (eventCapacity <= 0) return

  const { data: tickets } = await db
    .from('event_tickets')
    .select('quantity, payment_status, capacity_released_at, deleted_at')
    .eq('event_id', eventId)

  const reserved = (tickets ?? [])
    .filter((ticket: any) => !isCapacityReleased(ticket))
    .reduce((sum: number, ticket: any) => sum + (Number(ticket.quantity) || 0), 0)
  const remaining = Math.max(0, eventCapacity - reserved)

  if (quantity > remaining) {
    throw new Error(
      remaining > 0
        ? `Only ${remaining} spot(s) remaining for this event`
        : 'This event is sold out'
    )
  }
}

async function reserveTicketTypeCapacity(input: {
  db: any
  ticketTypeId: string
  eventId: string
  tenantId: string
  quantity: number
  soldOutMessage?: string
}) {
  const { db, ticketTypeId, eventId, tenantId, quantity } = input

  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('id, name, capacity, sold_count, is_active')
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ticketType || ticketType.is_active === false) {
    throw new Error('Ticket type not found or inactive')
  }

  const check = calculateTicketTypeCapacity({
    capacity: ticketType.capacity,
    soldCount: ticketType.sold_count,
    quantity,
    label: ticketType.name,
  })
  if (!check.ok) {
    throw new Error(
      input.soldOutMessage ?? check.error ?? 'Not enough capacity for this ticket type'
    )
  }

  if (ticketType.capacity === null) return

  const { data: reserved, error: reserveError } = await db
    .from('event_ticket_types')
    .update({ sold_count: ticketType.sold_count + quantity })
    .eq('id', ticketTypeId)
    .eq('tenant_id', tenantId)
    .eq('sold_count', ticketType.sold_count)
    .select('id')
    .maybeSingle()

  if (reserveError || !reserved) {
    throw new Error('Capacity changed while adding this ticket. Please try again.')
  }
}

async function releaseTicketTypeCapacity(input: {
  db: any
  ticketTypeId: string
  tenantId: string
  quantity: number
}) {
  const { data: ticketType } = await input.db
    .from('event_ticket_types')
    .select('sold_count')
    .eq('id', input.ticketTypeId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!ticketType) return

  await input.db
    .from('event_ticket_types')
    .update({ sold_count: Math.max(0, Number(ticketType.sold_count ?? 0) - input.quantity) })
    .eq('id', input.ticketTypeId)
    .eq('tenant_id', input.tenantId)
    .eq('sold_count', ticketType.sold_count)
}

async function getOrCreateRefundTicketBuyerClient(input: {
  db: any
  tenantId: string
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
}) {
  const normalizedEmail = input.buyerEmail.toLowerCase().trim()
  if (!normalizedEmail) {
    throw new Error('Ticket buyer email is required to record refund ledger entry')
  }

  const { data: existing, error: existingError } = await input.db
    .from('clients')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing?.id) return existing.id as string

  const { data: created, error: createError } = await input.db
    .from('clients')
    .insert({
      tenant_id: input.tenantId,
      full_name: input.buyerName.trim() || normalizedEmail,
      email: normalizedEmail,
      phone: input.buyerPhone ?? null,
      status: 'active',
      referral_source: 'website',
    })
    .select('id')
    .single()

  if (createError) {
    if (createError.code === '23505') {
      const { data: raced } = await input.db
        .from('clients')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (raced?.id) return raced.id as string
    }

    throw createError
  }

  return created.id as string
}

async function appendTicketRefundLedgerEntry(input: {
  db: any
  ticket: any
  event: any
  tenantId: string
  userId: string
  userEmail: string | null | undefined
  refundAmountCents: number
}) {
  if (input.refundAmountCents <= 0) return

  const clientId =
    input.event.client_id ??
    (await getOrCreateRefundTicketBuyerClient({
      db: input.db,
      tenantId: input.tenantId,
      buyerName: input.ticket.buyer_name,
      buyerEmail: input.ticket.buyer_email,
      buyerPhone: input.ticket.buyer_phone ?? null,
    }))

  const transactionReference = `ticket_refund_${input.ticket.id}`
  const eventLabel = input.event.occasion ? ` for ${input.event.occasion}` : ''

  await appendLedgerEntryInternal({
    tenant_id: input.tenantId,
    client_id: clientId,
    entry_type: 'refund',
    amount_cents: -Math.abs(input.refundAmountCents),
    payment_method: input.ticket.stripe_payment_intent_id ? 'card' : 'cash',
    description: `Ticket refund${eventLabel}`,
    event_id: input.event.id,
    transaction_reference: transactionReference,
    internal_notes:
      `Chef-initiated ticket refund by ${input.userEmail ?? input.userId}; ticket ${input.ticket.id}`,
    is_refund: true,
    refund_reason: 'Ticket refund',
    received_at: new Date().toISOString(),
    created_by: input.userId,
  })
}

export async function checkTicketTypeCapacity(input: {
  eventId: string
  ticketTypeId: string
  quantity: number
}): Promise<TicketCapacityCheck> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: ticketType } = await db
    .from('event_ticket_types')
    .select('name, capacity, sold_count, is_active')
    .eq('id', input.ticketTypeId)
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ticketType || ticketType.is_active === false) {
    return { ok: false, remaining: 0, error: 'Ticket type not found or inactive' }
  }

  return calculateTicketTypeCapacity({
    capacity: ticketType.capacity,
    soldCount: ticketType.sold_count,
    quantity: input.quantity,
    label: ticketType.name,
  })
}

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
      sale_starts_at: validated.saleStartsAt ?? null,
      sale_ends_at: validated.saleEndsAt ?? null,
      early_access_minutes: validated.earlyAccessMinutes ?? null,
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
  if (validated.saleStartsAt !== undefined) updates.sale_starts_at = validated.saleStartsAt
  if (validated.saleEndsAt !== undefined) updates.sale_ends_at = validated.saleEndsAt
  if (validated.earlyAccessMinutes !== undefined)
    updates.early_access_minutes = validated.earlyAccessMinutes

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
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to deactivate ticket type: ${error.message}`)

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

  const now = new Date()
  return (data ?? []).map((tt: any) => ({
    ...tt,
    remaining: tt.capacity !== null ? Math.max(0, tt.capacity - tt.sold_count) : null,
    sale_status: computeSaleStatus(tt, now),
  })) as EventTicketType[]
}

function computeSaleStatus(
  tt: {
    sale_starts_at: string | null
    sale_ends_at: string | null
    early_access_minutes: number | null
  },
  now: Date
): EventTicketType['sale_status'] {
  if (tt.sale_ends_at && new Date(tt.sale_ends_at) <= now) return 'ended'
  if (!tt.sale_starts_at) return 'on_sale'
  const saleStart = new Date(tt.sale_starts_at)
  if (saleStart <= now) return 'on_sale'
  if (tt.early_access_minutes) {
    const earlyStart = new Date(saleStart.getTime() - tt.early_access_minutes * 60_000)
    if (earlyStart <= now) return 'early_access'
  }
  return 'not_started'
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

export async function updateTicketAttendance(input: z.infer<typeof UpdateTicketAttendanceSchema>) {
  const user = await requireChef()
  const validated = UpdateTicketAttendanceSchema.parse(input)
  const db: any = createServerClient()

  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, event_id, tenant_id, event_guest_id, payment_status')
    .eq('id', validated.ticketId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ticket) {
    return { success: false, error: 'Ticket not found' }
  }

  if (ticket.payment_status !== 'paid') {
    return { success: false, error: 'Only paid tickets can be checked in' }
  }

  const { error } = await db
    .from('event_tickets')
    .update({ attended: validated.attended })
    .eq('id', validated.ticketId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    return { success: false, error: `Failed to update attendance: ${error.message}` }
  }

  if (ticket.event_guest_id) {
    await db
      .from('event_guests')
      .update({
        actual_attended: validated.attended ? 'attended' : null,
        reconciled_at: new Date().toISOString(),
        reconciled_by: user.id,
      })
      .eq('id', ticket.event_guest_id)
      .eq('event_id', validated.eventId)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/events/${validated.eventId}`)
  return { success: true }
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
  await assertEventCapacityAvailable(db, input.eventId, qty)
  let reservedTicketTypeCapacity = false

  if (input.ticketTypeId) {
    await reserveTicketTypeCapacity({
      db,
      ticketTypeId: input.ticketTypeId,
      eventId: input.eventId,
      tenantId: user.tenantId!,
      quantity: qty,
      soldOutMessage: 'Not enough capacity for this ticket type',
    })
    reservedTicketTypeCapacity = true
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

  if (error) {
    if (reservedTicketTypeCapacity && input.ticketTypeId) {
      await releaseTicketTypeCapacity({
        db,
        ticketTypeId: input.ticketTypeId,
        tenantId: user.tenantId!,
        quantity: qty,
      })
    }
    throw new Error(`Failed to create comp ticket: ${error.message}`)
  }

  // Auto-join comp ticket buyer to dinner circle (non-blocking)
  try {
    const normalizedEmail = input.buyerEmail.toLowerCase().trim()
    const db2: any = createServerClient({ admin: true })

    // Find or create hub profile
    let hubProfileId: string | null = null
    const { data: existingProfile } = await db2
      .from('hub_guest_profiles')
      .select('id')
      .eq('email_normalized', normalizedEmail)
      .maybeSingle()

    if (existingProfile) {
      hubProfileId = existingProfile.id
    } else {
      const crypto = await import('crypto')
      const { data: newProfile } = await db2
        .from('hub_guest_profiles')
        .insert({
          email: input.buyerEmail,
          email_normalized: normalizedEmail,
          display_name: input.buyerName,
          profile_token: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (newProfile) hubProfileId = newProfile.id
    }

    if (hubProfileId) {
      // Find circle for event
      const { data: group } = await db2
        .from('hub_groups')
        .select('id, group_token')
        .eq('event_id', input.eventId)
        .eq('is_active', true)
        .maybeSingle()

      if (group) {
        // Check if already a member
        const { data: existingMember } = await db2
          .from('hub_group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('profile_id', hubProfileId)
          .maybeSingle()

        if (!existingMember) {
          await db2.from('hub_group_members').insert({
            group_id: group.id,
            profile_id: hubProfileId,
            role: 'member',
            can_post: true,
            can_invite: false,
            can_pin: false,
          })

          await db2.from('hub_messages').insert({
            group_id: group.id,
            author_profile_id: hubProfileId,
            message_type: 'system',
            system_event_type: 'member_joined',
            body: `${input.buyerName} was added as a guest`,
            system_metadata: { display_name: input.buyerName, source: 'comp_ticket' },
          })
        }
      }

      // Link profile to ticket
      await db2.from('event_tickets').update({ hub_profile_id: hubProfileId }).eq('id', data.id)
    }
  } catch (circleErr) {
    console.error('[createCompTicket] Circle join failed (non-blocking):', circleErr)
  }

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
  await assertEventCapacityAvailable(db, input.eventId, qty)
  let reservedTicketTypeCapacity = false

  if (input.ticketTypeId) {
    await reserveTicketTypeCapacity({
      db,
      ticketTypeId: input.ticketTypeId,
      eventId: input.eventId,
      tenantId: user.tenantId!,
      quantity: qty,
      soldOutMessage: 'Sold out for this ticket type',
    })
    reservedTicketTypeCapacity = true
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

  if (error) {
    if (reservedTicketTypeCapacity && input.ticketTypeId) {
      await releaseTicketTypeCapacity({
        db,
        ticketTypeId: input.ticketTypeId,
        tenantId: user.tenantId!,
        quantity: qty,
      })
    }
    throw new Error(`Failed to create walk-in ticket: ${error.message}`)
  }

  // Auto-join walk-in ticket buyer to dinner circle (non-blocking)
  // Only if buyer has an email (walk-ins may not provide one)
  if (input.buyerEmail && input.buyerEmail !== 'walkin@cheflowhq.com') {
    try {
      const normalizedEmail = input.buyerEmail.toLowerCase().trim()
      const db2: any = createServerClient({ admin: true })

      let hubProfileId: string | null = null
      const { data: existingProfile } = await db2
        .from('hub_guest_profiles')
        .select('id')
        .eq('email_normalized', normalizedEmail)
        .maybeSingle()

      if (existingProfile) {
        hubProfileId = existingProfile.id
      } else {
        const crypto = await import('crypto')
        const { data: newProfile } = await db2
          .from('hub_guest_profiles')
          .insert({
            email: input.buyerEmail,
            email_normalized: normalizedEmail,
            display_name: input.buyerName,
            profile_token: crypto.randomUUID(),
          })
          .select('id')
          .single()
        if (newProfile) hubProfileId = newProfile.id
      }

      if (hubProfileId) {
        const { data: group } = await db2
          .from('hub_groups')
          .select('id')
          .eq('event_id', input.eventId)
          .eq('is_active', true)
          .maybeSingle()

        if (group) {
          const { data: existingMember } = await db2
            .from('hub_group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('profile_id', hubProfileId)
            .maybeSingle()

          if (!existingMember) {
            await db2.from('hub_group_members').insert({
              group_id: group.id,
              profile_id: hubProfileId,
              role: 'member',
              can_post: true,
              can_invite: false,
              can_pin: false,
            })

            await db2.from('hub_messages').insert({
              group_id: group.id,
              author_profile_id: hubProfileId,
              message_type: 'system',
              system_event_type: 'member_joined',
              body: `${input.buyerName} joined at the door`,
              system_metadata: { display_name: input.buyerName, source: 'walkin_ticket' },
            })
          }
        }

        await db2.from('event_tickets').update({ hub_profile_id: hubProfileId }).eq('id', data.id)
      }
    } catch (circleErr) {
      console.error('[createWalkInTicket] Circle join failed (non-blocking):', circleErr)
    }
  }

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
    .select(
      'id, event_id, tenant_id, payment_status, ticket_type_id, quantity, total_cents, buyer_name, buyer_email, buyer_phone, stripe_payment_intent_id'
    )
    .eq('id', input.ticketId)
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!ticket) return { success: false, error: 'Ticket not found' }
  if (ticket.payment_status !== 'paid') {
    return { success: false, error: 'Only paid tickets can be refunded' }
  }

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, occasion')
    .eq('id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (!event) return { success: false, error: 'Event not found' }

  let ledgerRefundCents = Number(ticket.total_cents ?? 0)

  // If Stripe payment, initiate Stripe refund
  if (ticket.stripe_payment_intent_id) {
    try {
      const StripeLib = require('stripe')
      const StripeCtor = StripeLib.default || StripeLib
      const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-12-18.acacia',
      })
      const refund = await stripe.refunds.create(
        {
          payment_intent: ticket.stripe_payment_intent_id,
        },
        {
          idempotencyKey: `ticket_refund_${ticket.id}`,
        }
      )
      if (Number.isInteger(refund?.amount) && refund.amount > 0) {
        ledgerRefundCents = refund.amount
      }
    } catch (err: any) {
      return { success: false, error: `Stripe refund failed: ${err.message}` }
    }
  }

  try {
    await appendTicketRefundLedgerEntry({
      db,
      ticket,
      event,
      tenantId: user.tenantId!,
      userId: user.id,
      userEmail: user.email,
      refundAmountCents: ledgerRefundCents,
    })
  } catch (err: any) {
    return { success: false, error: `Failed to record refund in ledger: ${err.message}` }
  }

  // Update ticket status
  const { data: refundedTicket, error: refundUpdateError } = await db
    .from('event_tickets')
    .update({
      payment_status: 'refunded',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', input.ticketId)
    .eq('event_id', input.eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('payment_status', 'paid') // CAS guard
    .select('id')
    .maybeSingle()

  if (refundUpdateError) {
    return {
      success: false,
      error: `Failed to update ticket refund status: ${refundUpdateError.message}`,
    }
  }

  if (!refundedTicket) {
    const { data: currentTicket } = await db
      .from('event_tickets')
      .select('payment_status')
      .eq('id', input.ticketId)
      .eq('event_id', input.eventId)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle()

    if (currentTicket?.payment_status !== 'refunded') {
      return {
        success: false,
        error: 'Ticket refund state changed. Please refresh and try again.',
      }
    }

    revalidatePath(`/events/${input.eventId}`)
    return { success: true }
  }

  // Decrement sold_count on ticket type
  if (ticket.ticket_type_id) {
    const { data: tt } = await db
      .from('event_ticket_types')
      .select('sold_count')
      .eq('id', ticket.ticket_type_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (tt && tt.sold_count > 0) {
      await db
        .from('event_ticket_types')
        .update({ sold_count: Math.max(0, tt.sold_count - ticket.quantity) })
        .eq('id', ticket.ticket_type_id)
        .eq('tenant_id', user.tenantId!)
        .eq('sold_count', tt.sold_count) // CAS guard
    }
  }

  // Remove refunded buyer from circle (non-blocking)
  try {
    const db2: any = createServerClient({ admin: true })

    // Get the hub_profile_id from the ticket
    const { data: ticketProfile } = await db2
      .from('event_tickets')
      .select('hub_profile_id, buyer_name, event_guest_id')
      .eq('id', input.ticketId)
      .single()

    if (ticketProfile?.hub_profile_id) {
      // Find circle for event
      const { data: group } = await db2
        .from('hub_groups')
        .select('id')
        .eq('event_id', input.eventId)
        .eq('is_active', true)
        .maybeSingle()

      if (group) {
        // Change role to viewer (can see history but not post)
        await db2
          .from('hub_group_members')
          .update({ role: 'viewer', can_post: false, can_invite: false, can_pin: false })
          .eq('group_id', group.id)
          .eq('profile_id', ticketProfile.hub_profile_id)

        // Post system message
        await db2.from('hub_messages').insert({
          group_id: group.id,
          author_profile_id: ticketProfile.hub_profile_id,
          message_type: 'system',
          system_event_type: 'member_left',
          body: `${ticketProfile.buyer_name || 'A guest'}'s ticket was refunded`,
          system_metadata: { source: 'ticket_refund' },
        })
      }

      // Update RSVP status if event_guest record exists
      if (ticketProfile.event_guest_id) {
        await db2
          .from('event_guests')
          .update({ rsvp_status: 'cancelled' })
          .eq('id', ticketProfile.event_guest_id)
      }
    }
  } catch (circleErr) {
    console.error('[refundTicket] Circle cleanup failed (non-blocking):', circleErr)
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

  // Auto-create dinner circle when ticketing is enabled
  if (input.enabled) {
    let circleGroupId: string | null = null
    try {
      const { ensureCircleForEvent } = await import('@/lib/hub/chef-circle-actions')
      const circle = await ensureCircleForEvent(input.eventId, user.tenantId!)
      if (circle) {
        // ensureCircleForEvent returns groupToken; look up the group ID
        const { data: circleGroup } = await db
          .from('hub_groups')
          .select('id')
          .eq('event_id', input.eventId)
          .maybeSingle()
        circleGroupId = circleGroup?.id ?? null
      }
    } catch (err) {
      // Non-blocking: circle creation failure should not prevent ticketing toggle
      console.error('[toggleEventTicketing] Circle auto-creation failed (non-blocking):', err)
    }

    // Broadcast to circle members that a new ticketed event is available
    if (circleGroupId) {
      try {
        // Load event details for the broadcast
        const { data: eventData } = await db
          .from('events')
          .select('occasion, event_date, serve_time, location_city, status')
          .eq('id', input.eventId)
          .single()

        const { data: shareData } = await db
          .from('event_share_settings')
          .select('share_token')
          .eq('event_id', input.eventId)
          .single()

        const { data: ticketTypes } = await db
          .from('event_ticket_types')
          .select('price_cents, capacity, sold_count')
          .eq('event_id', input.eventId)
          .eq('is_active', true)

        if (eventData && shareData) {
          const { data: chef } = await db
            .from('chefs')
            .select('business_name, full_name')
            .eq('id', user.tenantId!)
            .single()

          const chefName = chef?.business_name || chef?.full_name || 'Your chef'

          // Build price range from ticket types
          let priceRange = 'See event page'
          if (ticketTypes && ticketTypes.length > 0) {
            const prices = ticketTypes.map((t: any) => t.price_cents)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            if (minPrice === maxPrice) {
              priceRange = `$${(minPrice / 100).toFixed(0)}/person`
            } else {
              priceRange = `$${(minPrice / 100).toFixed(0)} - $${(maxPrice / 100).toFixed(0)}`
            }
          }

          // Build spots available
          let spotsAvailable = 'Limited spots'
          if (ticketTypes && ticketTypes.length > 0) {
            const totalCapacity = ticketTypes.reduce(
              (sum: number, t: any) => sum + (t.capacity ?? 0),
              0
            )
            const totalSold = ticketTypes.reduce(
              (sum: number, t: any) => sum + (t.sold_count ?? 0),
              0
            )
            const remaining = totalCapacity - totalSold
            if (totalCapacity > 0 && remaining > 0) {
              spotsAvailable = `${remaining} spots available`
            }
          }

          const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/e/${shareData.share_token}`
          const eventDate = eventData.event_date
            ? new Date(eventData.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Date TBD'

          const { broadcastEventToCircleMembers } =
            await import('@/lib/hub/circle-notification-actions')
          await broadcastEventToCircleMembers({
            groupId: circleGroupId,
            chefName,
            eventName: eventData.occasion || 'Upcoming Dinner',
            eventDate,
            eventLocation: eventData.location_city || 'Location TBD',
            priceRange,
            spotsAvailable,
            ticketUrl,
          })
        }
      } catch (err) {
        console.error('[toggleEventTicketing] Circle broadcast failed (non-blocking):', err)
      }
    }
  }

  revalidatePath(`/events/${input.eventId}`)
  return { success: true }
}

// ─── Addon CRUD ─────────────────────────────────────────────────────

export async function createTicketAddon(
  input: z.infer<typeof CreateAddonSchema>
): Promise<EventTicketAddon> {
  const user = await requireChef()
  const validated = CreateAddonSchema.parse(input)
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data, error } = await db
    .from('event_ticket_addons')
    .insert({
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description ?? null,
      price_cents: validated.priceCents,
      max_per_ticket: validated.maxPerTicket ?? null,
      total_capacity: validated.totalCapacity ?? null,
      sort_order: validated.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create addon: ${error.message}`)

  revalidatePath(`/events/${validated.eventId}`)
  return data as EventTicketAddon
}

export async function updateTicketAddon(
  input: z.infer<typeof UpdateAddonSchema>
): Promise<EventTicketAddon> {
  const user = await requireChef()
  const validated = UpdateAddonSchema.parse(input)
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('event_ticket_addons')
    .select('id')
    .eq('id', validated.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) throw new Error('Addon not found')

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.description !== undefined) updates.description = validated.description
  if (validated.priceCents !== undefined) updates.price_cents = validated.priceCents
  if (validated.maxPerTicket !== undefined) updates.max_per_ticket = validated.maxPerTicket
  if (validated.totalCapacity !== undefined) updates.total_capacity = validated.totalCapacity
  if (validated.sortOrder !== undefined) updates.sort_order = validated.sortOrder
  if (validated.isActive !== undefined) updates.is_active = validated.isActive

  const { data, error } = await db
    .from('event_ticket_addons')
    .update(updates)
    .eq('id', validated.id)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update addon: ${error.message}`)

  revalidatePath(`/events/${validated.eventId}`)
  return data as EventTicketAddon
}

export async function deleteTicketAddon(input: { id: string; eventId: string }): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { count } = await db
    .from('event_ticket_addon_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('addon_id', input.id)

  if (count && count > 0) {
    await db
      .from('event_ticket_addons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('tenant_id', user.tenantId!)
  } else {
    await db.from('event_ticket_addons').delete().eq('id', input.id).eq('tenant_id', user.tenantId!)
  }

  revalidatePath(`/events/${input.eventId}`)
}

export async function getEventTicketAddons(eventId: string): Promise<EventTicketAddon[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_ticket_addons')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to load addons: ${error.message}`)
  return (data ?? []) as EventTicketAddon[]
}
