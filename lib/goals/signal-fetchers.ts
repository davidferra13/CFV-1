import type { SupabaseClient } from '@supabase/supabase-js'

// ── Booking count ─────────────────────────────────────────────────────────────
// Returns the number of completed events in the period [start, end].

export async function fetchBookingCount(
  supabase: SupabaseClient,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await (supabase as any)
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', start)
    .lte('event_date', end)

  return count ?? 0
}

// ── New clients ───────────────────────────────────────────────────────────────
// Returns the number of clients first created in the period.

export async function fetchNewClientCount(
  supabase: SupabaseClient,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await (supabase as any)
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lte('created_at', `${end}T23:59:59.999Z`)

  return count ?? 0
}

// ── Recipe library ────────────────────────────────────────────────────────────
// Returns the total number of recipes in the chef's library.
// This is a cumulative "library size" goal, not period-scoped.

export async function fetchRecipeCount(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { count } = await (supabase as any)
    .from('recipes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  return count ?? 0
}

// ── Profit margin ─────────────────────────────────────────────────────────────
// Returns the average profit margin across completed events in trailing N days,
// expressed as basis points (e.g. 6500 = 65.00%).
// Falls back to 0 if no data.

export async function fetchTrailingProfitMarginBp(
  supabase: SupabaseClient,
  tenantId: string,
  trailingDays: number
): Promise<number> {
  const cutoff = new Date(Date.now() - trailingDays * 24 * 60 * 60 * 1000)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: events } = await (supabase as any)
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)

  const eventIds = ((events || []) as Array<{ id: string }>).map((e) => e.id)
  if (eventIds.length === 0) return 0

  const { data: summaries } = await (supabase as any)
    .from('event_financial_summary')
    .select('profit_margin')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const margins = (summaries || [])
    .map((s: { profit_margin: number | null }) => s.profit_margin ?? 0)
    .filter((m: number) => m !== 0)

  if (margins.length === 0) return 0
  const avg = margins.reduce((sum: number, m: number) => sum + m, 0) / margins.length
  return Math.round(avg * 10000)
}

// ── Expense ratio ─────────────────────────────────────────────────────────────
// Returns total expenses / total revenue across trailing N days,
// expressed as basis points.

export async function fetchTrailingExpenseRatioBp(
  supabase: SupabaseClient,
  tenantId: string,
  trailingDays: number
): Promise<number> {
  const cutoff = new Date(Date.now() - trailingDays * 24 * 60 * 60 * 1000)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [{ data: expenses }, { data: events }] = await Promise.all([
    (supabase as any)
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', cutoffStr),
    (supabase as any)
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', cutoffStr),
  ])

  const totalExpenses = ((expenses || []) as Array<{ amount_cents: number | null }>)
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0)

  const eventIds = ((events || []) as Array<{ id: string }>).map((e) => e.id)
  if (eventIds.length === 0 || totalExpenses === 0) return 0

  const { data: summaries } = await (supabase as any)
    .from('event_financial_summary')
    .select('net_revenue_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const totalRevenue = ((summaries || []) as Array<{ net_revenue_cents: number | null }>)
    .reduce((sum, s) => sum + (s.net_revenue_cents ?? 0), 0)

  if (totalRevenue <= 0) return 0
  return Math.round((totalExpenses / totalRevenue) * 10000)
}
