// Client Lifetime Value (LTV) Actions
// Computes CLV from existing clients, events, and expenses tables.
// No new tables required.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- Types ---

export type ClientLTV = {
  clientId: string
  clientName: string
  clientEmail: string
  totalRevenueCents: number
  totalExpensesCents: number
  lifetimeValueCents: number
  completedEventCount: number
  firstEventDate: string | null
  lastEventDate: string | null
}

export type RetentionCohortRow = {
  cohortQuarter: string // e.g. '2025-Q1'
  totalClients: number
  returnedFor2nd: number
  returnedFor3rd: number
  returnedFor4th: number
  returnedFor5thPlus: number
}

// --- Zod Schemas ---

const ComputeCLVSchema = z.object({
  clientId: z.string().uuid(),
})

const GetTopClientsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
})

// --- Actions ---

/**
 * Compute Client Lifetime Value for a single client.
 * LTV = total revenue from completed events minus associated expenses.
 */
export async function computeCLV(clientId: string): Promise<ClientLTV> {
  const validated = ComputeCLVSchema.parse({ clientId })
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get client info
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('id', validated.clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    throw new Error('Client not found')
  }

  // Get completed events for this client
  const { data: events } = await supabase
    .from('events')
    .select('id, quoted_price_cents, event_date')
    .eq('client_id', validated.clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  const completedEvents = events || []
  const totalRevenueCents = completedEvents.reduce(
    (sum: any, e: any) => sum + (e.quoted_price_cents || 0),
    0
  )

  // Get associated expenses (business expenses linked to this client's events)
  let totalExpensesCents = 0
  if (completedEvents.length > 0) {
    const eventIds = completedEvents.map((e: any) => e.id)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('is_business', true)
      .in('event_id', eventIds)

    totalExpensesCents = (expenses || []).reduce((sum: any, e: any) => sum + e.amount_cents, 0)
  }

  const firstEventDate = completedEvents.length > 0 ? completedEvents[0].event_date : null
  const lastEventDate =
    completedEvents.length > 0 ? completedEvents[completedEvents.length - 1].event_date : null

  return {
    clientId: client.id,
    clientName: client.full_name,
    clientEmail: client.email,
    totalRevenueCents,
    totalExpensesCents,
    lifetimeValueCents: totalRevenueCents - totalExpensesCents,
    completedEventCount: completedEvents.length,
    firstEventDate,
    lastEventDate,
  }
}

/**
 * Get top clients by lifetime value (default top 10).
 */
export async function getTopClientsByLTV(limit?: number): Promise<ClientLTV[]> {
  const validated = GetTopClientsSchema.parse({ limit })
  const resultLimit = validated.limit ?? 10

  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('tenant_id', user.tenantId!)

  if (!clients || clients.length === 0) return []

  // Get all completed events with revenue
  const { data: events } = await supabase
    .from('events')
    .select('id, client_id, quoted_price_cents, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')

  // Get all business expenses linked to events
  const { data: expenses } = await supabase
    .from('expenses')
    .select('event_id, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('is_business', true)

  // Build expense-by-event map
  const expenseByEvent = new Map<string, number>()
  for (const exp of expenses || []) {
    if (exp.event_id) {
      expenseByEvent.set(exp.event_id, (expenseByEvent.get(exp.event_id) || 0) + exp.amount_cents)
    }
  }

  // Build per-client aggregations
  const clientMap = new Map<
    string,
    {
      revenueCents: number
      expenseCents: number
      eventCount: number
      firstDate: string | null
      lastDate: string | null
    }
  >()

  for (const event of events || []) {
    if (!event.client_id) continue
    const existing = clientMap.get(event.client_id) || {
      revenueCents: 0,
      expenseCents: 0,
      eventCount: 0,
      firstDate: null,
      lastDate: null,
    }

    existing.revenueCents += event.quoted_price_cents || 0
    existing.expenseCents += expenseByEvent.get(event.id) || 0
    existing.eventCount += 1

    if (!existing.firstDate || event.event_date < existing.firstDate) {
      existing.firstDate = event.event_date
    }
    if (!existing.lastDate || event.event_date > existing.lastDate) {
      existing.lastDate = event.event_date
    }

    clientMap.set(event.client_id, existing)
  }

  // Build results for all clients, sort by LTV
  const results: ClientLTV[] = clients.map((client: any) => {
    const data = clientMap.get(client.id)
    const revenueCents = data?.revenueCents ?? 0
    const expenseCents = data?.expenseCents ?? 0
    return {
      clientId: client.id,
      clientName: client.full_name,
      clientEmail: client.email,
      totalRevenueCents: revenueCents,
      totalExpensesCents: expenseCents,
      lifetimeValueCents: revenueCents - expenseCents,
      completedEventCount: data?.eventCount ?? 0,
      firstEventDate: data?.firstDate ?? null,
      lastEventDate: data?.lastDate ?? null,
    }
  })

  // Sort descending by LTV and take top N
  results.sort((a, b) => b.lifetimeValueCents - a.lifetimeValueCents)
  return results.slice(0, resultLimit)
}

/**
 * Get retention cohort analysis.
 * Groups clients by the quarter of their first event,
 * then shows how many returned for 2nd, 3rd, etc. events.
 */
export async function getRetentionCohort(): Promise<RetentionCohortRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all completed events with client_id and event_date
  const { data: events } = await supabase
    .from('events')
    .select('client_id, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  // Group events by client, sorted by date
  const clientEvents = new Map<string, string[]>() // client_id -> sorted event dates
  for (const e of events) {
    if (!e.client_id) continue
    const existing = clientEvents.get(e.client_id) || []
    existing.push(e.event_date)
    clientEvents.set(e.client_id, existing)
  }

  // For each client, determine cohort quarter (from first event date)
  const cohortData = new Map<
    string,
    {
      totalClients: number
      returnedFor2nd: number
      returnedFor3rd: number
      returnedFor4th: number
      returnedFor5thPlus: number
    }
  >()

  for (const [_clientId, dates] of clientEvents) {
    if (dates.length === 0) continue
    dates.sort()
    const firstDate = new Date(dates[0])
    const quarter = Math.ceil((firstDate.getMonth() + 1) / 3)
    const cohortKey = `${firstDate.getFullYear()}-Q${quarter}`

    const existing = cohortData.get(cohortKey) || {
      totalClients: 0,
      returnedFor2nd: 0,
      returnedFor3rd: 0,
      returnedFor4th: 0,
      returnedFor5thPlus: 0,
    }

    existing.totalClients += 1
    if (dates.length >= 2) existing.returnedFor2nd += 1
    if (dates.length >= 3) existing.returnedFor3rd += 1
    if (dates.length >= 4) existing.returnedFor4th += 1
    if (dates.length >= 5) existing.returnedFor5thPlus += 1

    cohortData.set(cohortKey, existing)
  }

  // Convert to sorted array
  const results: RetentionCohortRow[] = Array.from(cohortData.entries())
    .map(([cohortQuarter, data]) => ({
      cohortQuarter,
      ...data,
    }))
    .sort((a, b) => a.cohortQuarter.localeCompare(b.cohortQuarter))

  return results
}
