// Pop-Up Operating System - Server Actions
// CRUD for chef_popups table with dashboard, publishing, and cancellation.

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  Popup,
  PopupStatus,
  PopupDashboard,
  PopupGuest,
  TicketSale,
  CreatePopupInput,
  UpdatePopupInput,
} from './popup-types'

// ─── Validation Schemas ─────────────────────────────────────────────

const CreatePopupSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  venueAddress: z.string().max(500).optional().nullable(),
  venueLat: z.number().min(-90).max(90).optional().nullable(),
  venueLng: z.number().min(-180).max(180).optional().nullable(),
  eventDate: z.string().optional().nullable(),
  doorsOpen: z.string().optional().nullable(),
  serviceStart: z.string().optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  ticketPriceCents: z.number().int().min(0).optional().nullable(),
  menuId: z.string().uuid().optional().nullable(),
})

const UpdatePopupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  venueName: z.string().max(200).optional().nullable(),
  venueAddress: z.string().max(500).optional().nullable(),
  venueLat: z.number().min(-90).max(90).optional().nullable(),
  venueLng: z.number().min(-180).max(180).optional().nullable(),
  eventDate: z.string().optional().nullable(),
  doorsOpen: z.string().optional().nullable(),
  serviceStart: z.string().optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  ticketPriceCents: z.number().int().min(0).optional().nullable(),
  menuId: z.string().uuid().optional().nullable(),
})

// ─── Helpers ────────────────────────────────────────────────────────

async function assertPopupOwner(db: any, popupId: string, tenantId: string): Promise<Popup> {
  const { data: popup, error } = await db
    .from('chef_popups')
    .select('*')
    .eq('id', popupId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !popup) throw new Error('Pop-up not found')
  return popup as Popup
}

function snakeCaseUpdate(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    venueName: 'venue_name',
    venueAddress: 'venue_address',
    venueLat: 'venue_lat',
    venueLng: 'venue_lng',
    eventDate: 'event_date',
    doorsOpen: 'doors_open',
    serviceStart: 'service_start',
    ticketPriceCents: 'ticket_price_cents',
    menuId: 'menu_id',
  }
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    result[map[key] ?? key] = value
  }
  return result
}

// ─── Actions ────────────────────────────────────────────────────────

export async function createPopup(
  input: CreatePopupInput
): Promise<{ success: true; popup: Popup }> {
  const user = await requireChef()
  const validated = CreatePopupSchema.parse(input)
  const db: any = createServerClient()

  const row = {
    tenant_id: user.tenantId!,
    name: validated.name,
    description: validated.description ?? null,
    venue_name: validated.venueName ?? null,
    venue_address: validated.venueAddress ?? null,
    venue_lat: validated.venueLat ?? null,
    venue_lng: validated.venueLng ?? null,
    event_date: validated.eventDate ?? null,
    doors_open: validated.doorsOpen ?? null,
    service_start: validated.serviceStart ?? null,
    capacity: validated.capacity ?? null,
    ticket_price_cents: validated.ticketPriceCents ?? null,
    menu_id: validated.menuId ?? null,
    status: 'draft' as PopupStatus,
  }

  const { data, error } = await db
    .from('chef_popups')
    .insert(row)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create pop-up')
  revalidatePath('/popups')
  return { success: true, popup: data as Popup }
}

export async function updatePopup(
  popupId: string,
  input: UpdatePopupInput
): Promise<{ success: true; popup: Popup }> {
  const user = await requireChef()
  const validated = UpdatePopupSchema.parse(input)
  const db: any = createServerClient()

  const popup = await assertPopupOwner(db, popupId, user.tenantId!)

  if (popup.status === 'cancelled') {
    throw new Error('Cannot update a cancelled pop-up')
  }

  const updates = snakeCaseUpdate(validated)
  if (Object.keys(updates).length === 0) {
    return { success: true, popup }
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await db
    .from('chef_popups')
    .update(updates)
    .eq('id', popupId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update pop-up')
  revalidatePath('/popups')
  revalidatePath(`/popups/${popupId}`)
  return { success: true, popup: data as Popup }
}

export async function getChefPopups(): Promise<Popup[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_popups')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Popup[]
}

export async function getPopupDashboard(
  popupId: string
): Promise<PopupDashboard> {
  const user = await requireChef()
  const db: any = createServerClient()

  const popup = await assertPopupOwner(db, popupId, user.tenantId!)

  // Fetch tickets linked to this popup via event_tickets where notes contain popup reference,
  // or via a ticket_type that shares the popup name. For the dedicated table approach,
  // we query event_tickets that reference ticket types matching this popup.
  const { data: tickets } = await db
    .from('event_tickets')
    .select(
      'id, buyer_name, buyer_email, quantity, total_cents, payment_status, source, created_at'
    )
    .eq('tenant_id', user.tenantId!)
    .ilike('notes', `%popup:${popupId}%`)
    .neq('payment_status', 'cancelled')
    .order('created_at', { ascending: false })

  const activeTickets = (tickets ?? []) as PopupGuest[]

  const ticketsSold = activeTickets
    .filter((t: any) => t.payment_status === 'paid')
    .reduce((sum: number, t: any) => sum + (t.quantity ?? 0), 0)

  const ticketsPending = activeTickets
    .filter((t: any) => t.payment_status === 'pending')
    .reduce((sum: number, t: any) => sum + (t.quantity ?? 0), 0)

  const totalRevenueCents = activeTickets
    .filter((t: any) => t.payment_status === 'paid')
    .reduce((sum: number, t: any) => sum + (t.total_cents ?? 0), 0)

  const refundedCents = activeTickets
    .filter((t: any) => t.payment_status === 'refunded')
    .reduce((sum: number, t: any) => sum + (t.total_cents ?? 0), 0)

  const capacityRemaining =
    popup.capacity !== null ? Math.max(0, popup.capacity - ticketsSold) : null

  const salesBySource: Record<string, number> = {}
  for (const ticket of activeTickets) {
    const src = (ticket as any).source ?? 'unknown'
    salesBySource[src] = (salesBySource[src] ?? 0) + ((ticket as any).quantity ?? 0)
  }

  return {
    popup,
    ticketsSold,
    ticketsPending,
    totalRevenueCents,
    refundedCents,
    capacityRemaining,
    guestList: activeTickets,
    salesBySource,
  }
}

export async function publishPopup(
  popupId: string
): Promise<{ success: true; popup: Popup }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const popup = await assertPopupOwner(db, popupId, user.tenantId!)

  if (popup.status !== 'draft') {
    throw new Error(`Cannot publish a pop-up with status "${popup.status}"`)
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('chef_popups')
    .update({
      status: 'published' as PopupStatus,
      published_at: now,
      updated_at: now,
    })
    .eq('id', popupId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to publish pop-up')
  revalidatePath('/popups')
  revalidatePath(`/popups/${popupId}`)
  return { success: true, popup: data as Popup }
}

export async function cancelPopup(
  popupId: string,
  reason?: string
): Promise<{ success: true; popup: Popup }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const popup = await assertPopupOwner(db, popupId, user.tenantId!)

  if (popup.status === 'cancelled') {
    throw new Error('Pop-up is already cancelled')
  }
  if (popup.status === 'completed') {
    throw new Error('Cannot cancel a completed pop-up')
  }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('chef_popups')
    .update({
      status: 'cancelled' as PopupStatus,
      cancelled_at: now,
      cancel_reason: reason?.trim() || null,
      updated_at: now,
    })
    .eq('id', popupId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to cancel pop-up')
  revalidatePath('/popups')
  revalidatePath(`/popups/${popupId}`)
  return { success: true, popup: data as Popup }
}

export async function getPopupTicketSales(
  popupId: string
): Promise<TicketSale[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  await assertPopupOwner(db, popupId, user.tenantId!)

  const { data: tickets, error } = await db
    .from('event_tickets')
    .select(
      'id, ticket_type_id, buyer_name, buyer_email, quantity, unit_price_cents, total_cents, payment_status, source, created_at'
    )
    .eq('tenant_id', user.tenantId!)
    .ilike('notes', `%popup:${popupId}%`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Enrich with ticket type names
  const typeIds = [
    ...new Set((tickets ?? []).map((t: any) => t.ticket_type_id).filter(Boolean)),
  ] as string[]

  let typeMap = new Map<string, string>()
  if (typeIds.length) {
    const { data: types } = await db
      .from('event_ticket_types')
      .select('id, name')
      .in('id', typeIds)
      .eq('tenant_id', user.tenantId!)
    for (const tt of types ?? []) {
      typeMap.set(tt.id, tt.name)
    }
  }

  return (tickets ?? []).map((t: any) => ({
    id: t.id,
    popup_id: popupId,
    ticket_type_id: t.ticket_type_id,
    ticket_type_name: t.ticket_type_id ? (typeMap.get(t.ticket_type_id) ?? null) : null,
    buyer_name: t.buyer_name,
    buyer_email: t.buyer_email,
    quantity: t.quantity,
    unit_price_cents: t.unit_price_cents,
    total_cents: t.total_cents,
    payment_status: t.payment_status,
    source: t.source ?? 'unknown',
    created_at: t.created_at,
  })) as TicketSale[]
}
