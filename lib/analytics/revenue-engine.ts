import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

export interface MetricResult {
  value: number
  definition: string
}

export interface DashboardKPIs {
  totalRevenue: MetricResult
  totalBookedValue: MetricResult
  inquiriesCount: MetricResult
  conversionRate: MetricResult
  eventsCompleted: MetricResult
  averageEventValue: MetricResult
}

export interface RevenueByPeriod {
  period: string
  revenue: number
}

export interface TopClient {
  clientId: string
  clientName: string
  revenue: number
  eventCount: number
}

export interface SeasonalMonth {
  month: string
  eventCount: number
  revenue: number
  avgGuestCount: number
  cancellationRate: number
}

// ─── Revenue Strategy ───────────────────────────────────────────────────────

export interface RevenueStrategy {
  strategy: string
  targetCount: number
  targetValue: number
  achievable: boolean
}

export function solveRevenueClosure(
  goalCents: number,
  bookedCents: number,
  remainingDays: number
): { strategies: RevenueStrategy[]; gap: number; achievable: boolean } {
  const gap = goalCents - bookedCents
  if (gap <= 0) {
    return { strategies: [], gap: 0, achievable: true }
  }

  const strategies: RevenueStrategy[] = []

  // Strategy tiers based on typical private chef events
  const tiers = [
    { label: 'intimate dinner (2-4 guests)', avg: 80000 }, // $800
    { label: 'dinner party (6-8 guests)', avg: 150000 }, // $1,500
    { label: 'large event (10-20 guests)', avg: 300000 }, // $3,000
    { label: 'premium tasting (4-6 guests)', avg: 200000 }, // $2,000
  ]

  for (const tier of tiers) {
    const count = Math.ceil(gap / tier.avg)
    const feasible = remainingDays >= count * 3 // need ~3 days per event
    strategies.push({
      strategy: `Book ${count} x ${tier.label}`,
      targetCount: count,
      targetValue: tier.avg,
      achievable: feasible,
    })
  }

  return {
    strategies,
    gap,
    achievable: strategies.some((s) => s.achievable),
  }
}

// ─── Dashboard KPIs ─────────────────────────────────────────────────────────

export async function computeDashboardKPIs(range: DateRange): Promise<DashboardKPIs> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Events in range
  const { data: events } = await db
    .from('events')
    .select('id, status, quoted_price_cents, guest_count, event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', range.start)
    .lte('event_date', range.end)

  // Ledger entries for revenue
  const { data: ledger } = await db
    .from('ledger_entries')
    .select('id, entry_type, amount_cents')
    .eq('tenant_id', tenantId)
    .gte('created_at', range.start)
    .lte('created_at', range.end)

  // Inquiries in range
  const { data: inquiries } = await db
    .from('inquiries')
    .select('id, status, converted_to_event_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', range.start)
    .lte('created_at', range.end)

  const allEvents = events || []
  const allLedger = ledger || []
  const allInquiries = inquiries || []

  // Revenue from ledger
  const income = allLedger
    .filter((l: any) => l.entry_type === 'payment')
    .reduce((s: any, l: any) => s + l.amount_cents, 0)
  const refunds = allLedger
    .filter((l: any) => l.entry_type === 'refund')
    .reduce((s: any, l: any) => s + Math.abs(l.amount_cents), 0)

  // Booked value (using quoted_price_cents instead of total_price)
  const nonCancelled = allEvents.filter((e: any) => e.status !== 'cancelled')
  const bookedValue = nonCancelled.reduce((s: any, e: any) => s + (e.quoted_price_cents || 0), 0)

  // Completed
  const completed = allEvents.filter((e: any) => e.status === 'completed')

  // Conversion (inquiries that converted to events)
  const converted = allInquiries.filter((i: any) => i.converted_to_event_id != null)

  // Average event value
  const avgValue = nonCancelled.length > 0 ? Math.round(bookedValue / nonCancelled.length) : 0

  return {
    totalRevenue: {
      value: income - refunds,
      definition: 'Ledger income minus refunds in period',
    },
    totalBookedValue: {
      value: bookedValue,
      definition: 'Sum of quoted_price_cents for non-cancelled events in period',
    },
    inquiriesCount: {
      value: allInquiries.length,
      definition: 'Count of inquiries created in period',
    },
    conversionRate: {
      value:
        allInquiries.length > 0
          ? Math.round((converted.length / allInquiries.length) * 1000) / 10
          : 0,
      definition: 'Percentage of inquiries that converted to events',
    },
    eventsCompleted: {
      value: completed.length,
      definition: 'Count of events with status completed in period',
    },
    averageEventValue: {
      value: avgValue,
      definition: 'Mean quoted_price_cents of non-cancelled events in period',
    },
  }
}

// ─── Revenue by Month ───────────────────────────────────────────────────────

export async function computeRevenueByMonth(range: DateRange): Promise<RevenueByPeriod[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: ledger } = await db
    .from('ledger_entries')
    .select('entry_type, amount_cents, created_at')
    .eq('tenant_id', chef.tenantId!)
    .gte('created_at', range.start)
    .lte('created_at', range.end)

  const monthMap = new Map<string, number>()

  for (const entry of ledger || []) {
    const key = entry.created_at.slice(0, 7) // YYYY-MM
    const current = monthMap.get(key) || 0
    const amount =
      entry.entry_type === 'refund' ? -Math.abs(entry.amount_cents) : entry.amount_cents
    monthMap.set(key, current + amount)
  }

  return Array.from(monthMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

// ─── Top Clients ────────────────────────────────────────────────────────────

export async function computeTopClients(range: DateRange): Promise<TopClient[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, client_id, quoted_price_cents, status, client:clients(full_name)')
    .eq('tenant_id', chef.tenantId!)
    .gte('event_date', range.start)
    .lte('event_date', range.end)
    .neq('status', 'cancelled')

  const clientMap = new Map<string, { name: string; revenue: number; count: number }>()

  for (const e of events || []) {
    const clientId = e.client_id
    if (!clientId) continue
    const clientData = e.client as unknown as { full_name: string } | null
    const entry = clientMap.get(clientId) || {
      name: clientData?.full_name || 'Unknown',
      revenue: 0,
      count: 0,
    }
    entry.revenue += e.quoted_price_cents || 0
    entry.count++
    clientMap.set(clientId, entry)
  }

  return Array.from(clientMap.entries())
    .map(([clientId, d]) => ({
      clientId,
      clientName: d.name,
      revenue: d.revenue,
      eventCount: d.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ─── Seasonal Performance ───────────────────────────────────────────────────

export async function computeSeasonalPerformance(range: DateRange): Promise<SeasonalMonth[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('id, event_date, status, guest_count, quoted_price_cents')
    .eq('tenant_id', chef.tenantId!)
    .gte('event_date', range.start)
    .lte('event_date', range.end)

  const monthMap = new Map<
    string,
    {
      total: number
      cancelled: number
      guestSum: number
      guestCount: number
      revenue: number
    }
  >()

  for (const e of events || []) {
    const key = e.event_date.slice(0, 7)
    const entry = monthMap.get(key) || {
      total: 0,
      cancelled: 0,
      guestSum: 0,
      guestCount: 0,
      revenue: 0,
    }
    entry.total++
    if (e.status === 'cancelled') entry.cancelled++
    if (e.guest_count > 0) {
      entry.guestSum += e.guest_count
      entry.guestCount++
    }
    entry.revenue += e.quoted_price_cents || 0
    monthMap.set(key, entry)
  }

  return Array.from(monthMap.entries())
    .map(([month, d]) => ({
      month,
      eventCount: d.total,
      revenue: d.revenue,
      avgGuestCount: d.guestCount > 0 ? Math.round(d.guestSum / d.guestCount) : 0,
      cancellationRate: d.total > 0 ? Math.round((d.cancelled / d.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

export function exportToCSV(rows: Record<string, unknown>[], filename: string): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h]
          if (val == null) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]
  // filename parameter reserved for future use (download trigger)
  void filename
  return csvLines.join('\n')
}

// ─── Range Helpers ──────────────────────────────────────────────────────────

export function defaultRange(days = 30): DateRange {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86400000)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function yearRange(): DateRange {
  const now = new Date()
  return {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  }
}
