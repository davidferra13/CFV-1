// Public KDS Actions - no session auth, validated by tenant ID + PIN
// Used by the public /kds/[tenantId] route for kitchen monitors.

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { KDSTicketStatus } from './constants'
import { KDS_STATUS_TRANSITIONS } from './constants'

// ─── Types (duplicated from kds-actions to avoid requireChef imports) ────

export interface KDSTicketItem {
  name: string
  quantity: number
  modifiers: string[]
  notes: string | null
  allergens: string[]
}

export interface PublicKDSTicket {
  id: string
  stationId: string
  stationName: string
  ticketNumber: number
  items: KDSTicketItem[]
  status: KDSTicketStatus
  priority: string
  fireAt: string | null
  firedAt: string | null
  readyAt: string | null
  tableNumber: string | null
  serverName: string | null
  guestCount: number | null
  allergyAlert: string | null
  notes: string | null
  courseNumber: number | null
  createdAt: string
}

function toPublicTicket(row: any): PublicKDSTicket {
  return {
    id: String(row.id),
    stationId: String(row.station_id),
    stationName: row.stations?.name ?? 'Unknown',
    ticketNumber: Number(row.ticket_number ?? 0),
    items: Array.isArray(row.items) ? row.items : [],
    status: String(row.status ?? 'new') as KDSTicketStatus,
    priority: String(row.priority ?? 'normal'),
    fireAt: row.fire_at ? String(row.fire_at) : null,
    firedAt: row.fired_at ? String(row.fired_at) : null,
    readyAt: row.ready_at ? String(row.ready_at) : null,
    tableNumber: row.table_number ? String(row.table_number) : null,
    serverName: row.server_name ? String(row.server_name) : null,
    guestCount: row.guest_count != null ? Number(row.guest_count) : null,
    allergyAlert: row.allergy_alert ? String(row.allergy_alert) : null,
    notes: row.notes ? String(row.notes) : null,
    courseNumber: row.course_number != null ? Number(row.course_number) : null,
    createdAt: String(row.created_at),
  }
}

// ─── PIN Validation ──────────────────────────────────────────────

async function validateKdsPin(tenantId: string, pin: string): Promise<boolean> {
  if (!tenantId || !pin) return false
  // PIN must be 4-6 digits
  if (!/^\d{4,6}$/.test(pin)) return false

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('chefs').select('kds_pin').eq('id', tenantId).single()

  if (error || !data) return false
  const storedPin = (data as any).kds_pin
  if (!storedPin) return false

  return storedPin === pin
}

// ─── Verify PIN (called from client on entry) ───────────────────

export async function verifyKdsPin(
  tenantId: string,
  pin: string
): Promise<{ valid: boolean; stations: Array<{ id: string; name: string }> }> {
  const valid = await validateKdsPin(tenantId, pin)
  if (!valid) return { valid: false, stations: [] }

  const supabase = createAdminClient()
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, display_order')
    .eq('chef_id', tenantId)
    .eq('status', 'active')
    .order('display_order', { ascending: true })

  return {
    valid: true,
    stations: (stations ?? []).map((s: any) => ({
      id: String(s.id),
      name: String(s.name),
    })),
  }
}

// ─── Get All Tickets (Expeditor) ─────────────────────────────────

export async function getPublicKdsTickets(
  tenantId: string,
  pin: string,
  stationId?: string
): Promise<{
  stations: Array<{ id: string; name: string; tickets: PublicKDSTicket[] }>
}> {
  const valid = await validateKdsPin(tenantId, pin)
  if (!valid) throw new Error('Invalid PIN')

  const supabase = createAdminClient()

  const ticketsQuery = supabase
    .from('kds_tickets' as any)
    .select('*, stations!inner(name)')
    .eq('chef_id', tenantId)
    .in('status', ['new', 'in_progress', 'ready'])
    .order('created_at', { ascending: true })

  if (stationId) {
    ticketsQuery.eq('station_id', stationId)
  }

  const [ticketsRes, stationsRes] = await Promise.all([
    ticketsQuery,
    supabase
      .from('stations')
      .select('id, name, display_order')
      .eq('chef_id', tenantId)
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ])

  if (ticketsRes.error) throw new Error('Failed to load tickets')

  const allTickets = (ticketsRes.data ?? []).map(toPublicTicket)
  const ticketsByStation = new Map<string, PublicKDSTicket[]>()
  for (const t of allTickets) {
    const list = ticketsByStation.get(t.stationId) ?? []
    list.push(t)
    ticketsByStation.set(t.stationId, list)
  }

  // Sort within each station by priority then time
  const priorityOrder: Record<string, number> = { vip: 0, rush: 1, normal: 2 }
  for (const [, tickets] of ticketsByStation) {
    tickets.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2
      const pb = priorityOrder[b.priority] ?? 2
      if (pa !== pb) return pa - pb
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  const stations = (stationsRes.data ?? []).map((s: any) => ({
    id: String(s.id),
    name: String(s.name),
    tickets: ticketsByStation.get(String(s.id)) ?? [],
  }))

  return { stations }
}

// ─── Bump Ticket (Public) ────────────────────────────────────────

export async function bumpPublicKdsTicket(
  tenantId: string,
  pin: string,
  ticketId: string
): Promise<KDSTicketStatus | null> {
  const valid = await validateKdsPin(tenantId, pin)
  if (!valid) throw new Error('Invalid PIN')

  const supabase = createAdminClient()

  const { data: ticket, error: fetchErr } = await (supabase
    .from('kds_tickets' as any)
    .select('status')
    .eq('id', ticketId)
    .eq('chef_id', tenantId)
    .single() as any)

  if (fetchErr || !ticket) throw new Error('Ticket not found')

  const currentStatus = String((ticket as any).status) as KDSTicketStatus
  const nextStatus = KDS_STATUS_TRANSITIONS[currentStatus]
  if (!nextStatus) throw new Error(`Cannot bump from ${currentStatus}`)

  const now = new Date().toISOString()
  const updates: Record<string, any> = { status: nextStatus }
  switch (nextStatus) {
    case 'in_progress':
      updates.fired_at = now
      break
    case 'ready':
      updates.ready_at = now
      break
    case 'served':
      updates.served_at = now
      break
  }

  const { error } = await (supabase
    .from('kds_tickets' as any)
    .update(updates as any)
    .eq('id', ticketId)
    .eq('chef_id', tenantId) as any)

  if (error) throw new Error('Failed to bump ticket')
  return nextStatus
}

// ─── Fire All for Course (Public) ────────────────────────────────

export async function fireAllPublicKdsCourse(
  tenantId: string,
  pin: string,
  courseNumber: number
): Promise<number> {
  const valid = await validateKdsPin(tenantId, pin)
  if (!valid) throw new Error('Invalid PIN')

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await (supabase
    .from('kds_tickets' as any)
    .update({ status: 'in_progress', fired_at: now } as any)
    .eq('chef_id', tenantId)
    .eq('course_number', courseNumber)
    .eq('status', 'new')
    .select('id') as any)

  if (error) throw new Error('Failed to fire course')
  return (data ?? []).length
}
