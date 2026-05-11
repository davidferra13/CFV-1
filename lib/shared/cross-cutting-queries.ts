// Cross-Cutting Aggregate Queries
// Pull invoices, prep tasks, and shopping data ACROSS all events
// so chefs can see "all invoices this month" or "all prep this week" in one view.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import type { PrepTimeline, PrepDay, PrepItem } from '@/lib/prep-timeline/compute-timeline'

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceFilters = {
  status?: string | string[]
  startDate?: string // ISO date
  endDate?: string // ISO date
  clientId?: string
}

export type AggregateInvoice = {
  eventId: string
  eventDate: string
  occasion: string | null
  status: string
  clientName: string | null
  clientEmail: string | null
  guestCount: number
  quotedPriceCents: number
  depositAmountCents: number
  totalPaidCents: number
  totalRefundedCents: number
  balanceDueCents: number
  paymentStatus: 'unpaid' | 'deposit_paid' | 'partially_paid' | 'paid' | 'overpaid' | 'refunded'
  locationCity: string | null
}

export type DateRange = {
  startDate: string // ISO date
  endDate: string // ISO date
}

export type AggregatePrepTask = {
  eventId: string
  eventDate: string
  occasion: string | null
  clientName: string | null
  prepDate: string // ISO date when this prep happens
  daysBeforeService: number
  isServiceDay: boolean
  isToday: boolean
  recipeName: string
  componentName: string
  dishName: string
  courseName: string
  activeMinutes: number
  passiveMinutes: number
  totalMinutes: number
  symbols: string[]
  storageMethod: string
  freezable: boolean
}

export type ShoppingOptions = {
  startDate?: string
  endDate?: string
  eventIds?: string[]
}

export type AggregateShoppingItem = {
  ingredientId: string
  ingredientName: string
  category: string
  unit: string
  totalRequired: number
  toBuy: number
  estimatedCostCents: number
  eventCount: number
  allergenFlags: string[]
}

export type WeeklyAggregate = {
  weekStart: string
  weekEnd: string
  events: WeeklyEvent[]
  invoiceSummary: {
    totalOutstanding: number
    totalOverdue: number
    overdueCount: number
    awaitingPaymentCount: number
    paidThisWeekCount: number
    paidThisWeekCents: number
  }
  prepSummary: {
    totalActiveMinutes: number
    totalPassiveMinutes: number
    heavyDayCount: number
    taskCount: number
    days: {
      date: string
      dayOfWeek: string
      activeMinutes: number
      passiveMinutes: number
      taskCount: number
      events: { id: string; occasion: string }[]
    }[]
  }
  shoppingSummary: {
    totalItems: number
    totalEstimatedCostCents: number
    shortageCount: number
  }
}

export type WeeklyEvent = {
  id: string
  eventDate: string
  occasion: string | null
  clientName: string | null
  guestCount: number
  status: string
  quotedPriceCents: number
  hasMenu: boolean
  hasPrepTimeline: boolean
}

// ── Invoice Aggregation ────────────────────────────────────────────────────────

/**
 * All invoices across all events, with event context.
 * Invoices are derived from events + ledger entries (no separate invoice table).
 */
export async function getAllInvoices(filters?: InvoiceFilters): Promise<AggregateInvoice[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch events with client info
  let eventsQuery = db
    .from('events')
    .select(
      `
      id, event_date, occasion, status, guest_count,
      quoted_price_cents, deposit_amount_cents,
      location_city,
      client:clients(id, full_name, email)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })

  // Apply filters
  if (filters?.startDate) {
    eventsQuery = eventsQuery.gte('event_date', filters.startDate)
  }
  if (filters?.endDate) {
    eventsQuery = eventsQuery.lte('event_date', filters.endDate)
  }
  if (filters?.clientId) {
    eventsQuery = eventsQuery.eq('client_id', filters.clientId)
  }
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    eventsQuery = eventsQuery.in('status', statuses)
  }

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) {
    console.error('[getAllInvoices] Events error:', eventsError)
    throw new Error('Failed to fetch events for invoice aggregation')
  }

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  // Fetch all ledger entries for these events in one query
  const { data: ledgerEntries, error: ledgerError } = await db
    .from('ledger_entries')
    .select('event_id, entry_type, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)

  if (ledgerError) {
    console.error('[getAllInvoices] Ledger error:', ledgerError)
    throw new Error('Failed to fetch ledger entries')
  }

  // Aggregate ledger by event
  const ledgerByEvent = new Map<string, { paid: number; refunded: number }>()
  for (const entry of (ledgerEntries ?? []) as any[]) {
    if (!entry.event_id) continue
    const agg = ledgerByEvent.get(entry.event_id) ?? { paid: 0, refunded: 0 }
    const cents = Number(entry.amount_cents) || 0
    if (entry.entry_type === 'refund') {
      agg.refunded += Math.abs(cents)
    } else if (['payment', 'deposit', 'tip'].includes(entry.entry_type)) {
      agg.paid += Math.abs(cents)
    }
    ledgerByEvent.set(entry.event_id, agg)
  }

  return events.map((event: any) => {
    const client = Array.isArray(event.client) ? event.client[0] : event.client
    const quoted = Number(event.quoted_price_cents) || 0
    const deposit = Number(event.deposit_amount_cents) || 0
    const ledger = ledgerByEvent.get(event.id) ?? { paid: 0, refunded: 0 }
    const netPaid = ledger.paid - ledger.refunded
    const balance = Math.max(0, quoted - netPaid)

    let paymentStatus: AggregateInvoice['paymentStatus'] = 'unpaid'
    if (ledger.refunded > 0 && ledger.paid === 0) {
      paymentStatus = 'refunded'
    } else if (netPaid >= quoted && quoted > 0) {
      paymentStatus = netPaid > quoted ? 'overpaid' : 'paid'
    } else if (netPaid > 0 && netPaid >= deposit && deposit > 0) {
      paymentStatus = 'deposit_paid'
    } else if (netPaid > 0) {
      paymentStatus = 'partially_paid'
    }

    return {
      eventId: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      status: event.status,
      clientName: client?.full_name ?? null,
      clientEmail: client?.email ?? null,
      guestCount: Number(event.guest_count) || 0,
      quotedPriceCents: quoted,
      depositAmountCents: deposit,
      totalPaidCents: ledger.paid,
      totalRefundedCents: ledger.refunded,
      balanceDueCents: balance,
      paymentStatus,
      locationCity: event.location_city ?? null,
    }
  })
}

// ── Prep Task Aggregation ──────────────────────────────────────────────────────

/**
 * All prep tasks across all events for a date range.
 * Fetches prep timelines for upcoming events and flattens them into
 * a unified list with event context.
 */
export async function getAllPrepTasks(dateRange?: DateRange): Promise<AggregatePrepTask[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date()
  const defaultEnd = new Date(today)
  defaultEnd.setDate(defaultEnd.getDate() + 14)

  const startDate = dateRange?.startDate ?? today.toISOString().slice(0, 10)
  const endDate = dateRange?.endDate ?? defaultEnd.toISOString().slice(0, 10)

  // Get active events in the window (extend range to catch prep that starts before event date)
  const extendedEnd = new Date(endDate)
  extendedEnd.setDate(extendedEnd.getDate() + 7) // events up to 7 days after range end

  const { data: events, error } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startDate)
    .lte('event_date', extendedEnd.toISOString().slice(0, 10))
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getAllPrepTasks] Events error:', error)
    throw new Error('Failed to fetch events for prep aggregation')
  }

  if (!events || events.length === 0) return []

  // Fetch prep timelines in parallel
  const timelines = await Promise.all(
    events.map(async (event: any) => {
      try {
        const { timeline } = await getEventPrepTimeline(event.id)
        return { event, timeline }
      } catch {
        return { event, timeline: null }
      }
    })
  )

  // Flatten into aggregate prep tasks, filtering to the requested date range
  const tasks: AggregatePrepTask[] = []

  for (const { event, timeline } of timelines) {
    if (!timeline) continue
    const client = Array.isArray(event.client) ? event.client[0] : event.client

    for (const day of timeline.days) {
      const dateStr = day.date.toISOString().slice(0, 10)

      // Only include days within the requested range
      if (dateStr < startDate || dateStr > endDate) continue

      for (const item of day.items) {
        tasks.push({
          eventId: event.id,
          eventDate: event.event_date,
          occasion: event.occasion,
          clientName: client?.full_name ?? null,
          prepDate: dateStr,
          daysBeforeService: day.daysBeforeService,
          isServiceDay: day.isServiceDay,
          isToday: day.isToday,
          recipeName: item.recipeName,
          componentName: item.componentName,
          dishName: item.dishName,
          courseName: item.courseName,
          activeMinutes: item.activeMinutes,
          passiveMinutes: item.passiveMinutes,
          totalMinutes: item.activeMinutes + item.passiveMinutes,
          symbols: item.symbols,
          storageMethod: item.storageMethod,
          freezable: item.freezable,
        })
      }
    }
  }

  // Sort by prep date, then by event date
  tasks.sort((a, b) => {
    const dateDiff = a.prepDate.localeCompare(b.prepDate)
    if (dateDiff !== 0) return dateDiff
    return a.eventDate.localeCompare(b.eventDate)
  })

  return tasks
}

// ── Shopping Aggregation ───────────────────────────────────────────────────────

/**
 * Delegates to the existing shopping list generator which already
 * aggregates across events. Re-exported here for consistent cross-cutting API.
 */
export async function getAggregateShoppingList(
  ...args: Parameters<typeof import('@/lib/culinary/shopping-list-actions').generateShoppingList>
) {
  const { generateShoppingList } = await import('@/lib/culinary/shopping-list-actions')
  return generateShoppingList(...args)
}

// ── Weekly Aggregate (Dashboard Widget Data) ───────────────────────────────────

/**
 * Builds a comprehensive "this week" aggregate for dashboard display.
 * Combines events, invoice status, prep pressure, and shopping needs.
 */
export async function getWeeklyAggregate(): Promise<WeeklyAggregate> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date()
  const weekStart = new Date(today)
  // Start from today
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const startStr = weekStart.toISOString().slice(0, 10)
  const endStr = weekEnd.toISOString().slice(0, 10)

  // 1. Events this week
  const { data: weekEvents } = await db
    .from('events')
    .select(
      `
      id, event_date, occasion, guest_count, status,
      quoted_price_cents,
      client:clients(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', startStr)
    .lte('event_date', endStr)
    .is('deleted_at' as any, null)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  const events: WeeklyEvent[] = []
  const eventIds: string[] = []

  for (const event of (weekEvents ?? []) as any[]) {
    const client = Array.isArray(event.client) ? event.client[0] : event.client
    eventIds.push(event.id)
    events.push({
      id: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
      clientName: client?.full_name ?? null,
      guestCount: Number(event.guest_count) || 0,
      status: event.status,
      quotedPriceCents: Number(event.quoted_price_cents) || 0,
      hasMenu: false,
      hasPrepTimeline: false,
    })
  }

  // Check which events have menus
  if (eventIds.length > 0) {
    const { data: menus } = await db
      .from('menus')
      .select('event_id')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventIds)

    const menuEventIds = new Set((menus ?? []).map((m: any) => m.event_id))
    for (const ev of events) {
      ev.hasMenu = menuEventIds.has(ev.id)
    }
  }

  // 2. Invoice summary (outstanding across ALL events, not just this week)
  const allInvoices = await getAllInvoices().catch(() => [])
  const todayStr = today.toISOString().slice(0, 10)

  const overdueInvoices = allInvoices.filter(
    (inv) =>
      inv.balanceDueCents > 0 && inv.eventDate < todayStr && !['completed'].includes(inv.status)
  )

  const awaitingPayment = allInvoices.filter(
    (inv) => inv.balanceDueCents > 0 && inv.paymentStatus !== 'paid'
  )

  const invoiceSummary = {
    totalOutstanding: awaitingPayment.reduce((s, inv) => s + inv.balanceDueCents, 0),
    totalOverdue: overdueInvoices.reduce((s, inv) => s + inv.balanceDueCents, 0),
    overdueCount: overdueInvoices.length,
    awaitingPaymentCount: awaitingPayment.length,
    paidThisWeekCount: 0,
    paidThisWeekCents: 0,
  }

  // 3. Prep summary for this week
  const prepTasks = await getAllPrepTasks({ startDate: startStr, endDate: endStr }).catch(() => [])

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const prepDayMap = new Map<
    string,
    {
      activeMinutes: number
      passiveMinutes: number
      taskCount: number
      events: Map<string, string>
    }
  >()

  for (const task of prepTasks) {
    const entry = prepDayMap.get(task.prepDate) ?? {
      activeMinutes: 0,
      passiveMinutes: 0,
      taskCount: 0,
      events: new Map(),
    }
    entry.activeMinutes += task.activeMinutes
    entry.passiveMinutes += task.passiveMinutes
    entry.taskCount += 1
    entry.events.set(task.eventId, task.occasion ?? 'Event')
    prepDayMap.set(task.prepDate, entry)
  }

  const prepDays = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const entry = prepDayMap.get(dateStr)
    prepDays.push({
      date: dateStr,
      dayOfWeek: dayNames[d.getDay()],
      activeMinutes: entry?.activeMinutes ?? 0,
      passiveMinutes: entry?.passiveMinutes ?? 0,
      taskCount: entry?.taskCount ?? 0,
      events: entry
        ? Array.from(entry.events.entries()).map(([id, occasion]) => ({ id, occasion }))
        : [],
    })
  }

  const prepSummary = {
    totalActiveMinutes: prepDays.reduce((s, d) => s + d.activeMinutes, 0),
    totalPassiveMinutes: prepDays.reduce((s, d) => s + d.passiveMinutes, 0),
    heavyDayCount: prepDays.filter((d) => d.activeMinutes >= 240).length,
    taskCount: prepTasks.length,
    days: prepDays,
  }

  // Mark events that have prep timelines
  const eventsWithPrep = new Set(prepTasks.map((t) => t.eventId))
  for (const ev of events) {
    ev.hasPrepTimeline = eventsWithPrep.has(ev.id)
  }

  // 4. Shopping summary for upcoming events
  let shoppingSummary = { totalItems: 0, totalEstimatedCostCents: 0, shortageCount: 0 }
  try {
    const { generateShoppingList } = await import('@/lib/culinary/shopping-list-actions')
    const shopping = await generateShoppingList({ startDate: startStr, endDate: endStr })
    shoppingSummary = {
      totalItems: shopping.items.length,
      totalEstimatedCostCents: shopping.totalEstimatedCostCents,
      shortageCount: shopping.shortageCount,
    }
  } catch {
    // Shopping list may fail if no events have menus with recipes
  }

  return {
    weekStart: startStr,
    weekEnd: endStr,
    events,
    invoiceSummary,
    prepSummary,
    shoppingSummary,
  }
}
