// Data Reconciliation Engine
// Identifies actionable gaps: events without expenses, invoices without payments, etc.
// No 'use server' here; pure logic consumed by server actions.

import { createServerClient } from '@/lib/db/server'

// ---- Types ----

export interface GapItem {
  id: string
  label: string
  sublabel?: string
  date?: string
  href: string
}

export interface GapCategory {
  key: string
  title: string
  description: string
  count: number
  items: GapItem[]
}

export interface ReconciliationSummary {
  categories: GapCategory[]
  totalGaps: number
  healthScore: number // 0-100
}

// ---- Helpers ----

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ---- Gap Detectors ----

export async function findEventsWithoutExpenses(tenantId: string): Promise<GapItem[]> {
  const db: any = createServerClient()

  // Past events with status completed or confirmed but no expense records
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'confirmed'])
    .lt('event_date', new Date().toISOString().slice(0, 10))
    .order('event_date', { ascending: false })
    .limit(200)

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  // Find which events have at least one expense
  const { data: expenseRows } = await db
    .from('expenses')
    .select('event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventsWithExpenses = new Set((expenseRows || []).map((r: any) => r.event_id))

  return events
    .filter((e: any) => !eventsWithExpenses.has(e.id))
    .map((e: any) => ({
      id: e.id,
      label: e.occasion || 'Untitled event',
      sublabel: e.client?.full_name || 'No client',
      date: formatDate(e.event_date),
      href: `/events/${e.id}`,
    }))
}

export async function findInvoicesWithoutPayments(tenantId: string): Promise<GapItem[]> {
  const db: any = createServerClient()

  // Sent invoices where status is not 'paid'
  const { data: invoices } = await db
    .from('invoices')
    .select('id, due_date, total_cents, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .order('due_date', { ascending: true })
    .limit(100)

  if (!invoices || invoices.length === 0) return []

  return invoices.map((inv: any) => {
    const amount = inv.total_cents ? `$${(inv.total_cents / 100).toFixed(2)}` : ''
    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date()
    return {
      id: inv.id,
      label: `${amount} invoice${isOverdue ? ' (overdue)' : ''}`,
      sublabel: inv.client?.full_name || 'No client',
      date: inv.due_date ? formatDate(inv.due_date) : '',
      href: `/finance/invoices/${inv.id}`,
    }
  })
}

export async function findClientsWithoutDietary(tenantId: string): Promise<GapItem[]> {
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, dietary_restrictions, allergies')
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true })
    .limit(200)

  if (!clients || clients.length === 0) return []

  return clients
    .filter((c: any) => {
      const hasDietary =
        Array.isArray(c.dietary_restrictions) &&
        c.dietary_restrictions.some((d: string) => d && d.trim() !== '')
      const hasAllergies =
        Array.isArray(c.allergies) && c.allergies.some((a: string) => a && a.trim() !== '')
      return !hasDietary && !hasAllergies
    })
    .map((c: any) => ({
      id: c.id,
      label: c.full_name,
      sublabel: 'No dietary or allergy info',
      href: `/clients/${c.id}`,
    }))
}

export async function findEventsWithoutContracts(tenantId: string): Promise<GapItem[]> {
  const db: any = createServerClient()

  // Future events that are confirmed but have no signed contract
  const today = new Date().toISOString().slice(0, 10)

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'confirmed')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(100)

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  // Check for signed contracts
  const { data: contractRows } = await db
    .from('event_contracts')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'signed')

  const eventsWithContracts = new Set((contractRows || []).map((r: any) => r.event_id))

  return events
    .filter((e: any) => !eventsWithContracts.has(e.id))
    .map((e: any) => ({
      id: e.id,
      label: e.occasion || 'Untitled event',
      sublabel: e.client?.full_name || 'No client',
      date: formatDate(e.event_date),
      href: `/events/${e.id}`,
    }))
}

export async function findEventsWithoutAAR(tenantId: string): Promise<GapItem[]> {
  const db: any = createServerClient()

  // Past events (>3 days ago) that are completed but have no AAR
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .lt('event_date', threeDaysAgo)
    .order('event_date', { ascending: false })
    .limit(200)

  if (!events || events.length === 0) return []

  const eventIds = events.map((e: any) => e.id)

  const { data: aarRows } = await db
    .from('after_action_reviews')
    .select('event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const eventsWithAAR = new Set((aarRows || []).map((r: any) => r.event_id))

  return events
    .filter((e: any) => !eventsWithAAR.has(e.id))
    .map((e: any) => ({
      id: e.id,
      label: e.occasion || 'Untitled event',
      sublabel: e.client?.full_name || 'No client',
      date: formatDate(e.event_date),
      href: `/events/${e.id}/debrief`,
    }))
}

// ---- Aggregate ----

export async function getReconciliationSummary(tenantId: string): Promise<ReconciliationSummary> {
  const [
    eventsNoExpenses,
    invoicesNoPay,
    clientsNoDietary,
    eventsNoContract,
    eventsNoAAR,
  ] = await Promise.all([
    findEventsWithoutExpenses(tenantId),
    findInvoicesWithoutPayments(tenantId),
    findClientsWithoutDietary(tenantId),
    findEventsWithoutContracts(tenantId),
    findEventsWithoutAAR(tenantId),
  ])

  const categories: GapCategory[] = [
    {
      key: 'events-no-expenses',
      title: 'Events without expenses',
      description: 'Past events with no expense records logged',
      count: eventsNoExpenses.length,
      items: eventsNoExpenses,
    },
    {
      key: 'invoices-no-payment',
      title: 'Unpaid invoices',
      description: 'Sent invoices with no payment recorded',
      count: invoicesNoPay.length,
      items: invoicesNoPay,
    },
    {
      key: 'clients-no-dietary',
      title: 'Clients missing dietary info',
      description: 'Clients with no dietary restrictions or allergies documented',
      count: clientsNoDietary.length,
      items: clientsNoDietary,
    },
    {
      key: 'events-no-contract',
      title: 'Upcoming events without contracts',
      description: 'Confirmed future events with no signed contract',
      count: eventsNoContract.length,
      items: eventsNoContract,
    },
    {
      key: 'events-no-aar',
      title: 'Events without debrief',
      description: 'Completed events (>3 days old) with no after-action review',
      count: eventsNoAAR.length,
      items: eventsNoAAR,
    },
  ]

  const totalGaps = categories.reduce((sum, c) => sum + c.count, 0)

  // Health score: weighted by category importance.
  // Each category contributes 20 points max. Score = 100 - (penalty per category).
  // Penalty = min(count * 5, 20) per category, so even 4 gaps in one category maxes the penalty.
  let penalty = 0
  for (const cat of categories) {
    penalty += Math.min(cat.count * 5, 20)
  }
  const healthScore = Math.max(0, 100 - penalty)

  return { categories, totalGaps, healthScore }
}
