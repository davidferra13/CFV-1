// ── Booking count ─────────────────────────────────────────────────────────────
// Returns the number of completed events in the period [start, end].

export async function fetchBookingCount(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await db
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
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await db
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

export async function fetchRecipeCount(db: any, tenantId: string): Promise<number> {
  const { count } = await db
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
  db: any,
  tenantId: string,
  trailingDays: number
): Promise<number> {
  const _cn = new Date()
  const _co = new Date(_cn.getFullYear(), _cn.getMonth(), _cn.getDate() - trailingDays)
  const cutoffStr = `${_co.getFullYear()}-${String(_co.getMonth() + 1).padStart(2, '0')}-${String(_co.getDate()).padStart(2, '0')}`

  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', cutoffStr)

  const eventIds = ((events || []) as Array<{ id: string }>).map((e) => e.id)
  if (eventIds.length === 0) return 0

  const { data: summaries } = await db
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
  db: any,
  tenantId: string,
  trailingDays: number
): Promise<number> {
  const _cn = new Date()
  const _co = new Date(_cn.getFullYear(), _cn.getMonth(), _cn.getDate() - trailingDays)
  const cutoffStr = `${_co.getFullYear()}-${String(_co.getMonth() + 1).padStart(2, '0')}-${String(_co.getDate()).padStart(2, '0')}`

  const [{ data: expenses }, { data: events }] = await Promise.all([
    db
      .from('expenses')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .gte('expense_date', cutoffStr),
    db
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', cutoffStr),
  ])

  const totalExpenses = ((expenses || []) as Array<{ amount_cents: number | null }>).reduce(
    (sum, e) => sum + (e.amount_cents ?? 0),
    0
  )

  const eventIds = ((events || []) as Array<{ id: string }>).map((e) => e.id)
  if (eventIds.length === 0 || totalExpenses === 0) return 0

  const { data: summaries } = await db
    .from('event_financial_summary')
    .select('net_revenue_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  const totalRevenue = ((summaries || []) as Array<{ net_revenue_cents: number | null }>).reduce(
    (sum, s) => sum + (s.net_revenue_cents ?? 0),
    0
  )

  if (totalRevenue <= 0) return 0
  return Math.round((totalExpenses / totalRevenue) * 10000)
}

// ── Repeat booking rate ───────────────────────────────────────────────────────
// Returns the % of clients who have completed 2+ events with this chef,
// expressed as basis points (e.g. 4000 = 40.00%).

export async function fetchRepeatBookingRateBp(db: any, tenantId: string): Promise<number> {
  // Get all clients and count how many have 2+ completed events
  const { data: clientEvents } = await db
    .from('events')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('client_id', 'is', null)

  if (!clientEvents || clientEvents.length === 0) return 0

  const rows = clientEvents as Array<{ client_id: string }>
  const countByClient: Record<string, number> = {}
  for (const row of rows) {
    countByClient[row.client_id] = (countByClient[row.client_id] ?? 0) + 1
  }

  const total = Object.keys(countByClient).length
  if (total === 0) return 0
  const repeaters = Object.values(countByClient).filter((c) => c >= 2).length
  return Math.round((repeaters / total) * 10000)
}

// ── Total reviews ─────────────────────────────────────────────────────────────
// Returns total external reviews synced for this tenant.

export async function fetchTotalReviews(db: any, tenantId: string): Promise<number> {
  const { count } = await db
    .from('external_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  return count ?? 0
}

// ── Review average ────────────────────────────────────────────────────────────
// Returns average rating from external_reviews, expressed in basis points
// (e.g. 450 = 4.50 stars). Returns 0 if no reviews.

export async function fetchReviewAverageBp(db: any, tenantId: string): Promise<number> {
  const { data } = await db
    .from('external_reviews')
    .select('rating')
    .eq('tenant_id', tenantId)
    .not('rating', 'is', null)

  const rows = (data || []) as Array<{ rating: number | null }>
  const ratings = rows.map((r) => r.rating ?? 0).filter((r) => r > 0)
  if (ratings.length === 0) return 0
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  return Math.round(avg * 100) // e.g. 4.5 → 450
}

// ── Workshops attended ────────────────────────────────────────────────────────
// Returns the count of professional_achievements with achieve_type IN
// ('course', 'certification') - these map to "workshop attended".
// NOTE: professional_achievements uses chef_id, NOT tenant_id.
// We resolve chef_id from user_roles using the admin client.

export async function fetchWorkshopsAttended(
  db: any,
  tenantId: string,
  start: string,
  end: string
): Promise<number> {
  const { count } = await db
    .from('professional_achievements')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', tenantId)
    .in('achieve_type', ['course', 'certification'])
    .gte('achieve_date', start)
    .lte('achieve_date', end)

  return count ?? 0
}
