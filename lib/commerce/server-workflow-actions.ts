// Server Workflow Integration (FOH-BOH)
// Connects table service to KDS so servers can fire courses, see status, and manage checks.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTicket } from './kds-actions'
import type { KDSTicketItem } from './kds-actions'

// ─── Types ──────────────────────────────────────────────────────

export interface ServerTableView {
  tableId: string
  tableLabel: string
  zoneId: string
  zoneName: string
  status: string
  seatCapacity: number
  check: {
    id: string
    guestName: string | null
    guestCount: number | null
    openedAt: string
    notes: string | null
    saleId: string | null
    totalCents: number
  } | null
  courseStatuses: CourseStatus[]
}

export interface CourseStatus {
  courseNumber: number
  status: 'pending' | 'fired' | 'ready' | 'served'
  ticketCount: number
  readyCount: number
  servedCount: number
}

export interface CheckCourseOverview {
  checkId: string
  courses: CourseStatus[]
  totalTickets: number
  allFired: boolean
  allReady: boolean
  allServed: boolean
}

// ─── Get Server Table View ──────────────────────────────────────

export async function getServerTableView(): Promise<ServerTableView[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Get all zones, tables, open checks, and active KDS tickets
  const [zonesRes, tablesRes, checksRes, ticketsRes] = await Promise.all([
    supabase
      .from('commerce_dining_zones' as any)
      .select('id, name')
      .eq('tenant_id', user.tenantId!),
    supabase
      .from('commerce_dining_tables' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('commerce_dining_checks' as any)
      .select('*')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'open'),
    supabase
      .from('kds_tickets' as any)
      .select('id, check_id, course_number, status')
      .eq('chef_id', user.tenantId!)
      .in('status', ['new', 'in_progress', 'ready', 'served']),
  ])

  if (zonesRes.error) throw new Error(`Failed to load zones: ${zonesRes.error.message}`)
  if (tablesRes.error) throw new Error(`Failed to load tables: ${tablesRes.error.message}`)
  if (checksRes.error) throw new Error(`Failed to load checks: ${checksRes.error.message}`)

  const zoneMap = new Map<string, string>()
  for (const z of zonesRes.data ?? []) {
    zoneMap.set(String((z as any).id), String((z as any).name))
  }

  // Map checks by table
  const checksByTable = new Map<string, any>()
  for (const c of checksRes.data ?? []) {
    checksByTable.set(String((c as any).table_id), c)
  }

  // Group tickets by check for course status
  const ticketsByCheck = new Map<string, any[]>()
  for (const t of ticketsRes.data ?? []) {
    if (!(t as any).check_id) continue
    const checkId = String((t as any).check_id)
    const list = ticketsByCheck.get(checkId) ?? []
    list.push(t)
    ticketsByCheck.set(checkId, list)
  }

  function getCourseStatuses(checkId: string): CourseStatus[] {
    const tickets = ticketsByCheck.get(checkId) ?? []
    if (tickets.length === 0) return []

    const courseMap = new Map<
      number,
      { total: number; fired: number; ready: number; served: number }
    >()
    for (const t of tickets) {
      const cn = Number((t as any).course_number ?? 1)
      const existing = courseMap.get(cn) ?? { total: 0, fired: 0, ready: 0, served: 0 }
      existing.total++
      const st = String((t as any).status)
      if (st === 'in_progress') existing.fired++
      if (st === 'ready') existing.ready++
      if (st === 'served') existing.served++
      courseMap.set(cn, existing)
    }

    return Array.from(courseMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([courseNumber, counts]) => {
        let status: CourseStatus['status'] = 'pending'
        if (counts.served === counts.total) status = 'served'
        else if (counts.ready === counts.total) status = 'ready'
        else if (counts.fired > 0 || counts.ready > 0 || counts.served > 0) status = 'fired'

        return {
          courseNumber,
          status,
          ticketCount: counts.total,
          readyCount: counts.ready,
          servedCount: counts.served,
        }
      })
  }

  return (tablesRes.data ?? []).map((table: any) => {
    const check = checksByTable.get(String(table.id))
    const checkId = check ? String(check.id) : null

    return {
      tableId: String(table.id),
      tableLabel: String(table.table_label),
      zoneId: String(table.zone_id),
      zoneName: zoneMap.get(String(table.zone_id)) ?? 'Unknown Zone',
      status: String(table.status ?? 'available'),
      seatCapacity: Number(table.seat_capacity ?? 1),
      check: check
        ? {
            id: String(check.id),
            guestName: check.guest_name ? String(check.guest_name) : null,
            guestCount: check.guest_count != null ? Number(check.guest_count) : null,
            openedAt: String(check.opened_at),
            notes: check.notes ? String(check.notes) : null,
            saleId: check.sale_id ? String(check.sale_id) : null,
            totalCents: 0, // Will be computed from sale items if sale exists
          }
        : null,
      courseStatuses: checkId ? getCourseStatuses(checkId) : [],
    }
  })
}

// ─── Fire Courses for Table ─────────────────────────────────────

export async function fireCoursesForTable(checkId: string, courseNumber: number): Promise<number> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const now = new Date().toISOString()

  // Fire all 'new' tickets for this course on this check
  const { data, error } = await (supabase
    .from('kds_tickets' as any)
    .update({ status: 'in_progress', fired_at: now } as any)
    .eq('chef_id', user.tenantId!)
    .eq('check_id', checkId)
    .eq('course_number', courseNumber)
    .eq('status', 'new')
    .select('id') as any)

  if (error) throw new Error(`Failed to fire course: ${error.message}`)

  revalidatePath('/commerce/kds')
  revalidatePath('/commerce/table-service')
  return (data ?? []).length
}

// ─── Add Item to Check (and auto-create KDS ticket) ─────────────

export async function addItemToCheck(input: {
  checkId: string
  productId: string
  quantity: number
  modifiers?: string[]
  notes?: string
  courseNumber?: number
}): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Verify check exists and is open
  const { data: check, error: checkErr } = await (supabase
    .from('commerce_dining_checks' as any)
    .select('id, table_id, guest_name, guest_count, sale_id')
    .eq('tenant_id', user.tenantId!)
    .eq('id', input.checkId)
    .eq('status', 'open')
    .single() as any)

  if (checkErr || !check) throw new Error('Check not found or already closed')

  // Get product info
  const { data: product, error: prodErr } = await (supabase
    .from('products' as any)
    .select('id, name, category, station_id, price_cents')
    .eq('id', input.productId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (prodErr || !product) throw new Error('Product not found')

  // Get table label for the ticket
  const { data: table } = await (supabase
    .from('commerce_dining_tables' as any)
    .select('table_label')
    .eq('id', (check as any).table_id)
    .single() as any)

  // Determine station (from product, or first station)
  let stationId = (product as any).station_id
  if (!stationId) {
    const { data: firstStation } = await supabase
      .from('stations')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .order('display_order')
      .limit(1)
      .single()
    stationId = firstStation ? String((firstStation as any).id) : null
  }

  if (!stationId)
    throw new Error('No kitchen station available. Create at least one station first.')

  // Create KDS ticket for this item
  const ticketItem: KDSTicketItem = {
    name: String((product as any).name),
    quantity: input.quantity,
    modifiers: input.modifiers ?? [],
    notes: input.notes ?? null,
    allergens: [],
  }

  await createTicket({
    stationId,
    items: [ticketItem],
    checkId: input.checkId,
    tableNumber: table ? String((table as any).table_label) : null,
    guestCount: (check as any).guest_count != null ? Number((check as any).guest_count) : null,
    courseNumber: input.courseNumber ?? 1,
  })

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/kds')
}

// ─── Remove Item from Check (void ticket) ───────────────────────

export async function removeItemFromCheck(checkId: string, ticketId: string): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Verify ticket belongs to this check
  const { data: ticket, error: tErr } = await (supabase
    .from('kds_tickets' as any)
    .select('id, check_id')
    .eq('id', ticketId)
    .eq('chef_id', user.tenantId!)
    .single() as any)

  if (tErr || !ticket) throw new Error('Ticket not found')
  if (String((ticket as any).check_id) !== checkId)
    throw new Error('Ticket does not belong to this check')

  // Void the ticket
  const { error } = await (supabase
    .from('kds_tickets' as any)
    .update({ status: 'voided', void_reason: 'Removed from check' } as any)
    .eq('id', ticketId)
    .eq('chef_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to void ticket: ${error.message}`)

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/kds')
}

// ─── Get Check Course Status ────────────────────────────────────

export async function getCheckCourseStatus(checkId: string): Promise<CheckCourseOverview> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data: tickets, error } = await (supabase
    .from('kds_tickets' as any)
    .select('id, course_number, status')
    .eq('chef_id', user.tenantId!)
    .eq('check_id', checkId)
    .neq('status', 'voided') as any)

  if (error) throw new Error(`Failed to load course status: ${error.message}`)

  const allTickets = tickets ?? []
  const courseMap = new Map<
    number,
    { total: number; new: number; fired: number; ready: number; served: number }
  >()

  for (const t of allTickets) {
    const cn = Number((t as any).course_number ?? 1)
    const existing = courseMap.get(cn) ?? { total: 0, new: 0, fired: 0, ready: 0, served: 0 }
    existing.total++
    const st = String((t as any).status)
    if (st === 'new') existing.new++
    if (st === 'in_progress') existing.fired++
    if (st === 'ready') existing.ready++
    if (st === 'served') existing.served++
    courseMap.set(cn, existing)
  }

  const courses: CourseStatus[] = Array.from(courseMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([courseNumber, counts]) => {
      let status: CourseStatus['status'] = 'pending'
      if (counts.served === counts.total) status = 'served'
      else if (counts.ready === counts.total) status = 'ready'
      else if (counts.fired > 0 || counts.ready > 0 || counts.served > 0) status = 'fired'

      return {
        courseNumber,
        status,
        ticketCount: counts.total,
        readyCount: counts.ready,
        servedCount: counts.served,
      }
    })

  return {
    checkId,
    courses,
    totalTickets: allTickets.length,
    allFired: courses.every((c) => c.status !== 'pending'),
    allReady: courses.every((c) => c.status === 'ready' || c.status === 'served'),
    allServed: courses.every((c) => c.status === 'served'),
  }
}

// ─── Request Check Split ────────────────────────────────────────

export async function requestCheckSplit(
  checkId: string,
  splitType: 'even' | 'by_item'
): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Store split request in notes (simple approach without new columns)
  const { data: check, error: fetchErr } = await (supabase
    .from('commerce_dining_checks' as any)
    .select('notes')
    .eq('id', checkId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'open')
    .single() as any)

  if (fetchErr || !check) throw new Error('Check not found or already closed')

  const existingNotes = String((check as any).notes ?? '').trim()
  const splitNote = `[SPLIT REQUEST: ${splitType}]`
  const newNotes = existingNotes ? `${existingNotes}\n${splitNote}` : splitNote

  const { error } = await (supabase
    .from('commerce_dining_checks' as any)
    .update({ notes: newNotes } as any)
    .eq('id', checkId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to request split: ${error.message}`)

  revalidatePath('/commerce/table-service')
}

// ─── Close Check ────────────────────────────────────────────────

export async function closeServerCheck(input: {
  checkId: string
  paymentMethod: string
  tipCents?: number
}): Promise<void> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const tipNote = input.tipCents
    ? `Payment: ${input.paymentMethod}, Tip: $${(input.tipCents / 100).toFixed(2)}`
    : `Payment: ${input.paymentMethod}`

  // Mark all remaining tickets as served
  await (supabase
    .from('kds_tickets' as any)
    .update({ status: 'served', served_at: new Date().toISOString() } as any)
    .eq('chef_id', user.tenantId!)
    .eq('check_id', input.checkId)
    .in('status', ['new', 'in_progress', 'ready']) as any)

  // Close the dining check using existing action pattern
  const { data: check, error: fetchErr } = await (supabase
    .from('commerce_dining_checks' as any)
    .select('id, table_id, notes')
    .eq('tenant_id', user.tenantId!)
    .eq('id', input.checkId)
    .eq('status', 'open')
    .single() as any)

  if (fetchErr || !check) throw new Error('Check not found or already closed')

  const existingNotes = String((check as any).notes ?? '').trim()
  const mergedNotes = [existingNotes, tipNote].filter(Boolean).join('\n')

  const { error } = await (supabase
    .from('commerce_dining_checks' as any)
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      notes: mergedNotes || null,
    } as any)
    .eq('tenant_id', user.tenantId!)
    .eq('id', input.checkId)
    .eq('status', 'open') as any)

  if (error) throw new Error(`Failed to close check: ${error.message}`)

  // Reset table status if no other open checks
  const { count: openCount } = await (supabase
    .from('commerce_dining_checks' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('table_id', (check as any).table_id)
    .eq('status', 'open') as any)

  if ((openCount ?? 0) === 0) {
    await (supabase
      .from('commerce_dining_tables' as any)
      .update({ status: 'available' } as any)
      .eq('tenant_id', user.tenantId!)
      .eq('id', (check as any).table_id)
      .neq('status', 'out_of_service') as any)
  }

  revalidatePath('/commerce/table-service')
  revalidatePath('/commerce/kds')
}
