// Multi-Station Kitchen Display System (KDS) - Server Actions
// Manages KDS tickets: creation from sales, station routing, status transitions,
// expeditor overview, and performance stats.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { KDSTicketStatus } from './constants'
import { KDS_STATUS_TRANSITIONS } from './constants'

// ─── Types ──────────────────────────────────────────────────────

export interface KDSTicketItem {
  name: string
  quantity: number
  modifiers: string[]
  notes: string | null
  allergens: string[]
}

export interface KDSTicket {
  id: string
  chefId: string
  saleId: string | null
  checkId: string | null
  stationId: string
  stationName: string
  ticketNumber: number
  items: KDSTicketItem[]
  status: KDSTicketStatus
  priority: string
  fireAt: string | null
  firedAt: string | null
  readyAt: string | null
  servedAt: string | null
  tableNumber: string | null
  serverName: string | null
  guestCount: number | null
  allergyAlert: string | null
  notes: string | null
  courseNumber: number | null
  voidReason: string | null
  createdAt: string
  updatedAt: string
}

function toKDSTicket(row: any): KDSTicket {
  return {
    id: String(row.id),
    chefId: String(row.chef_id),
    saleId: row.sale_id ? String(row.sale_id) : null,
    checkId: row.check_id ? String(row.check_id) : null,
    stationId: String(row.station_id),
    stationName: row.stations?.name ?? row.station_name ?? 'Unknown',
    ticketNumber: Number(row.ticket_number ?? 0),
    items: Array.isArray(row.items) ? row.items : [],
    status: String(row.status ?? 'new') as KDSTicketStatus,
    priority: String(row.priority ?? 'normal'),
    fireAt: row.fire_at ? String(row.fire_at) : null,
    firedAt: row.fired_at ? String(row.fired_at) : null,
    readyAt: row.ready_at ? String(row.ready_at) : null,
    servedAt: row.served_at ? String(row.served_at) : null,
    tableNumber: row.table_number ? String(row.table_number) : null,
    serverName: row.server_name ? String(row.server_name) : null,
    guestCount: row.guest_count != null ? Number(row.guest_count) : null,
    allergyAlert: row.allergy_alert ? String(row.allergy_alert) : null,
    notes: row.notes ? String(row.notes) : null,
    courseNumber: row.course_number != null ? Number(row.course_number) : null,
    voidReason: row.void_reason ? String(row.void_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

// ─── Get Station Tickets ────────────────────────────────────────

export async function getStationTickets(stationId: string): Promise<KDSTicket[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('kds_tickets' as any)
    .select('*, stations!inner(name)')
    .eq('chef_id', user.tenantId!)
    .eq('station_id', stationId)
    .in('status', ['new', 'in_progress', 'ready'])
    .order('priority', { ascending: true }) // rush/vip first (alphabetically: normal > rush > vip, so ascending puts normal last... we fix in sort)
    .order('created_at', { ascending: true }) as any)

  if (error) throw new Error(`Failed to load station tickets: ${error.message}`)

  const tickets = (data ?? []).map(toKDSTicket)

  // Sort: vip first, then rush, then normal. Within same priority, oldest first.
  const priorityOrder: Record<string, number> = { vip: 0, rush: 1, normal: 2 }
  tickets.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2
    const pb = priorityOrder[b.priority] ?? 2
    if (pa !== pb) return pa - pb
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return tickets
}

// ─── Get All Station Tickets (Expeditor View) ───────────────────

export async function getAllStationTickets(): Promise<{
  stations: Array<{ id: string; name: string; tickets: KDSTicket[] }>
}> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const [ticketsRes, stationsRes] = await Promise.all([
    supabase
      .from('kds_tickets' as any)
      .select('*, stations!inner(name)')
      .eq('chef_id', user.tenantId!)
      .in('status', ['new', 'in_progress', 'ready'])
      .order('created_at', { ascending: true }),
    supabase
      .from('stations')
      .select('id, name, display_order')
      .eq('chef_id', user.tenantId!)
      .order('display_order', { ascending: true }),
  ])

  if (ticketsRes.error) throw new Error(`Failed to load tickets: ${ticketsRes.error.message}`)
  if (stationsRes.error) throw new Error(`Failed to load stations: ${stationsRes.error.message}`)

  const allTickets = (ticketsRes.data ?? []).map(toKDSTicket)
  const ticketsByStation = new Map<string, KDSTicket[]>()
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

// ─── Create Ticket From Sale ────────────────────────────────────

export async function createTicketFromSale(input: {
  saleId: string
  tableNumber?: string
  serverName?: string
  guestCount?: number
  allergyAlert?: string
  notes?: string
  courseNumber?: number
  priority?: string
  checkId?: string
}): Promise<KDSTicket[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Fetch sale items
  const { data: saleItems, error: saleErr } = await (supabase
    .from('sale_items' as any)
    .select('*, products!inner(name, category, station_id)')
    .eq('sale_id', input.saleId) as any)

  if (saleErr) throw new Error(`Failed to load sale items: ${saleErr.message}`)
  if (!saleItems || saleItems.length === 0) throw new Error('Sale has no items')

  // Get next ticket number
  const { data: nextNumData } = await (supabase.rpc('next_kds_ticket_number', {
    p_chef_id: user.tenantId!,
  }) as any)
  let nextTicketNum = Number(nextNumData ?? 1)

  // Group items by station
  const itemsByStation = new Map<string, KDSTicketItem[]>()
  const defaultStationId: string | null = null

  for (const item of saleItems ?? []) {
    const product = (item as any).products
    const stationId = product?.station_id

    if (!stationId) {
      // If product has no station, try to find a default or skip
      continue
    }

    const list = itemsByStation.get(stationId) ?? []
    list.push({
      name: product?.name ?? 'Unknown Item',
      quantity: Number((item as any).quantity ?? 1),
      modifiers: Array.isArray((item as any).modifiers) ? (item as any).modifiers : [],
      notes: (item as any).notes ? String((item as any).notes) : null,
      allergens: [],
    })
    itemsByStation.set(stationId, list)
  }

  // If no items had station assignments, put everything in one ticket
  // with whatever station we can find
  if (itemsByStation.size === 0) {
    const { data: firstStation } = await supabase
      .from('stations')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .order('display_order')
      .limit(1)
      .single()

    if (!firstStation)
      throw new Error('No stations configured. Create at least one kitchen station first.')

    const allItems: KDSTicketItem[] = (saleItems ?? []).map((item: any) => ({
      name: item.products?.name ?? String(item.product_name ?? 'Item'),
      quantity: Number(item.quantity ?? 1),
      modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
      notes: item.notes ? String(item.notes) : null,
      allergens: [],
    }))

    itemsByStation.set(String((firstStation as any).id), allItems)
  }

  // Create one ticket per station
  const createdTickets: KDSTicket[] = []

  for (const [stationId, items] of itemsByStation) {
    const { data: ticket, error: insertErr } = await (supabase
      .from('kds_tickets' as any)
      .insert({
        chef_id: user.tenantId!,
        sale_id: input.saleId,
        check_id: input.checkId ?? null,
        station_id: stationId,
        ticket_number: nextTicketNum,
        items,
        status: 'new',
        priority: input.priority ?? 'normal',
        table_number: input.tableNumber ?? null,
        server_name: input.serverName ?? null,
        guest_count: input.guestCount ?? null,
        allergy_alert: input.allergyAlert ?? null,
        notes: input.notes ?? null,
        course_number: input.courseNumber ?? null,
      } as any)
      .select('*, stations!inner(name)')
      .single() as any)

    if (insertErr) throw new Error(`Failed to create KDS ticket: ${insertErr.message}`)
    createdTickets.push(toKDSTicket(ticket))
    nextTicketNum++
  }

  revalidatePath('/commerce/kds')
  return createdTickets
}

// ─── Create Ticket Directly ─────────────────────────────────────

export async function createTicket(input: {
  stationId: string
  items: KDSTicketItem[]
  tableNumber?: string
  serverName?: string
  guestCount?: number
  allergyAlert?: string
  notes?: string
  courseNumber?: number
  priority?: string
  checkId?: string
  saleId?: string
  fireAt?: string
}): Promise<KDSTicket> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: nextNumData } = await (supabase.rpc('next_kds_ticket_number', {
    p_chef_id: user.tenantId!,
  }) as any)

  const { data: ticket, error } = await (supabase
    .from('kds_tickets' as any)
    .insert({
      chef_id: user.tenantId!,
      sale_id: input.saleId ?? null,
      check_id: input.checkId ?? null,
      station_id: input.stationId,
      ticket_number: Number(nextNumData ?? 1),
      items: input.items,
      status: 'new',
      priority: input.priority ?? 'normal',
      fire_at: input.fireAt ?? null,
      table_number: input.tableNumber ?? null,
      server_name: input.serverName ?? null,
      guest_count: input.guestCount ?? null,
      allergy_alert: input.allergyAlert ?? null,
      notes: input.notes ?? null,
      course_number: input.courseNumber ?? null,
    } as any)
    .select('*, stations!inner(name)')
    .single() as any)

  if (error) throw new Error(`Failed to create ticket: ${error.message}`)

  revalidatePath('/commerce/kds')
  return toKDSTicket(ticket)
}

// ─── Update Ticket Status ───────────────────────────────────────

export async function updateTicketStatus(
  ticketId: string,
  newStatus: KDSTicketStatus
): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const now = new Date().toISOString()
  const updates: Record<string, any> = { status: newStatus }

  switch (newStatus) {
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
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to update ticket status: ${error.message}`)

  revalidatePath('/commerce/kds')
}

// ─── Bump Ticket (advance to next status) ───────────────────────

export async function bumpTicket(ticketId: string): Promise<KDSTicketStatus | null> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Get current status
  const { data: ticket, error: fetchErr } = await (supabase
    .from('kds_tickets' as any)
    .select('status')
    .eq('id', ticketId)
    .eq('chef_id', user.tenantId!)
    .single() as any)

  if (fetchErr || !ticket) throw new Error('Ticket not found')

  const currentStatus = String((ticket as any).status) as KDSTicketStatus
  const nextStatus = KDS_STATUS_TRANSITIONS[currentStatus]

  if (!nextStatus) throw new Error(`Cannot bump ticket from ${currentStatus} status`)

  await updateTicketStatus(ticketId, nextStatus)
  return nextStatus
}

// ─── Fire Ticket ────────────────────────────────────────────────

export async function fireTicket(ticketId: string): Promise<void> {
  await updateTicketStatus(ticketId, 'in_progress')
}

// ─── Mark Ticket Ready ──────────────────────────────────────────

export async function markTicketReady(ticketId: string): Promise<void> {
  await updateTicketStatus(ticketId, 'ready')
}

// ─── Mark Ticket Served ─────────────────────────────────────────

export async function markTicketServed(ticketId: string): Promise<void> {
  await updateTicketStatus(ticketId, 'served')
}

// ─── Void Ticket ────────────────────────────────────────────────

export async function voidTicket(ticketId: string, reason?: string): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const updates: Record<string, any> = {
    status: 'voided',
    void_reason: reason ?? null,
  }

  const { error } = await (supabase
    .from('kds_tickets' as any)
    .update(updates as any)
    .eq('id', ticketId)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to void ticket: ${error.message}`)

  revalidatePath('/commerce/kds')
}

// ─── Fire All Tickets for a Course ──────────────────────────────

export async function fireAllForCourse(courseNumber: number): Promise<number> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const now = new Date().toISOString()

  const { data, error } = await (supabase
    .from('kds_tickets' as any)
    .update({ status: 'in_progress', fired_at: now } as any)
    .eq('chef_id', user.tenantId!)
    .eq('course_number', courseNumber)
    .eq('status', 'new')
    .select('id') as any)

  if (error) throw new Error(`Failed to fire course tickets: ${error.message}`)

  revalidatePath('/commerce/kds')
  return (data ?? []).length
}

// ─── KDS Stats ──────────────────────────────────────────────────

export async function getKDSStats(): Promise<{
  avgTicketTimeMinutes: number
  ticketsPerHour: number
  backlogByStation: Array<{ stationId: string; stationName: string; count: number }>
  totalActive: number
  totalServedToday: number
}> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [activeRes, servedRes, stationsRes] = await Promise.all([
    // Active (backlog)
    supabase
      .from('kds_tickets' as any)
      .select('station_id, stations!inner(name)')
      .eq('chef_id', user.tenantId!)
      .in('status', ['new', 'in_progress']),
    // Served today (for avg time and throughput)
    supabase
      .from('kds_tickets' as any)
      .select('created_at, served_at')
      .eq('chef_id', user.tenantId!)
      .eq('status', 'served')
      .gte('created_at', todayStart.toISOString()),
    // All stations
    supabase.from('stations').select('id, name').eq('chef_id', user.tenantId!),
  ])

  if (activeRes.error) throw new Error(`Failed to load KDS stats: ${activeRes.error.message}`)

  // Backlog per station
  const backlogMap = new Map<string, { name: string; count: number }>()
  for (const row of activeRes.data ?? []) {
    const sid = String((row as any).station_id)
    const existing = backlogMap.get(sid) ?? {
      name: (row as any).stations?.name ?? 'Unknown',
      count: 0,
    }
    existing.count++
    backlogMap.set(sid, existing)
  }

  const backlogByStation = Array.from(backlogMap.entries()).map(([stationId, v]) => ({
    stationId,
    stationName: v.name,
    count: v.count,
  }))

  // Average ticket time from served tickets
  const servedTickets = servedRes.data ?? []
  let avgTicketTimeMinutes = 0
  if (servedTickets.length > 0) {
    const totalMs = servedTickets.reduce((sum: number, t: any) => {
      if (!t.served_at || !t.created_at) return sum
      return sum + (new Date(t.served_at).getTime() - new Date(t.created_at).getTime())
    }, 0)
    avgTicketTimeMinutes = Math.round((totalMs / servedTickets.length / 60000) * 10) / 10
  }

  // Tickets per hour (based on served count and hours elapsed today)
  const hoursElapsed = Math.max(1, (Date.now() - todayStart.getTime()) / 3600000)
  const ticketsPerHour = Math.round((servedTickets.length / hoursElapsed) * 10) / 10

  return {
    avgTicketTimeMinutes,
    ticketsPerHour,
    backlogByStation,
    totalActive: (activeRes.data ?? []).length,
    totalServedToday: servedTickets.length,
  }
}

// ─── KDS PIN Management ─────────────────────────────────────────

export async function getKdsPin(): Promise<string | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { data } = await supabase.from('chefs').select('kds_pin').eq('id', user.tenantId!).single()
  return (data as any)?.kds_pin ?? null
}

export async function setKdsPin(pin: string | null): Promise<{ success: boolean }> {
  const user = await requireChef()
  if (pin !== null && !/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits')
  }
  const supabase: any = createServerClient()
  const { error } = await supabase.from('chefs').update({ kds_pin: pin }).eq('id', user.tenantId!)
  if (error) throw new Error(`Failed to update KDS PIN: ${error.message}`)
  return { success: true }
}
