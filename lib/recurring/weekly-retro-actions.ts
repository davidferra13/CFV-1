'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { startOfWeek, endOfWeek, format, parseISO, subWeeks } from 'date-fns'

// ============================================
// Types
// ============================================

export interface WeeklyRetroSummary {
  weekStart: string // ISO date
  weekEnd: string // ISO date
  weekLabel: string // e.g. "Apr 14 - Apr 20, 2026"

  // Delivery stats
  totalDeliveries: number
  clientsServed: string[] // unique client names

  // Dish performance
  dishesServed: DishPerformance[]
  totalDishesServed: number
  lovedCount: number
  likedCount: number
  neutralCount: number
  dislikedCount: number

  // Container tracking
  containersSent: number
  containersReturned: number
  containersOutstanding: number

  // Revenue
  invoicedAmountCents: number
  paidAmountCents: number
  overdueAmountCents: number

  // Client requests fulfilled
  requestsFulfilled: number
  requestsDeclined: number
  requestsPending: number

  // Available weeks for navigation
  availableWeeks: { weekStart: string; label: string }[]
}

export interface DishPerformance {
  dishName: string
  timesServed: number
  reactions: {
    loved: number
    liked: number
    neutral: number
    disliked: number
    none: number // served but no reaction recorded
  }
  clientNames: string[]
}

// ============================================
// Main Action
// ============================================

/**
 * Get a weekly retrospective summary for meal prep operations.
 * Defaults to the most recent completed week if no weekStart is provided.
 */
export async function getWeeklyRetrospective(weekStartInput?: string): Promise<WeeklyRetroSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Determine the target week
  const now = new Date()
  const targetDate = weekStartInput ? parseISO(weekStartInput) : subWeeks(now, 1)
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }) // Sunday
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`

  // --- Parallel queries ---
  const [dishResult, deliveryResult, invoiceResult, requestResult, weeksResult] = await Promise.all(
    [
      // 1. Served dish history for this week
      db
        .from('served_dish_history')
        .select('dish_name, served_date, client_reaction, client_id, clients(full_name)')
        .eq('tenant_id', tenantId)
        .gte('served_date', weekStartStr)
        .lte('served_date', weekEndStr)
        .order('served_date', { ascending: true }),

      // 2. Meal prep weeks that were delivered this week
      db
        .from('meal_prep_weeks')
        .select(
          'id, program_id, rotation_week, prepped_at, delivered_at, containers_sent, containers_back'
        )
        .eq('tenant_id', tenantId)
        .gte('delivered_at', weekStartStr + 'T00:00:00Z')
        .lte('delivered_at', weekEndStr + 'T23:59:59Z'),

      // 3. Recurring invoice history for this period
      db
        .from('recurring_invoice_history')
        .select('amount_cents, status, recurring_invoice_id, recurring_invoices(tenant_id)')
        .gte('period_start', weekStartStr)
        .lte('period_start', weekEndStr),

      // 4. Client meal requests for this week
      db
        .from('client_meal_requests')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('requested_for_week_start', weekStartStr)
        .lte('requested_for_week_start', weekEndStr),

      // 5. Get available weeks (weeks that have any delivered meals, last 12 weeks)
      db
        .from('meal_prep_weeks')
        .select('delivered_at')
        .eq('tenant_id', tenantId)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(100),
    ]
  )

  // --- Process dish performance ---
  const dishes = (dishResult.data ?? []) as any[]
  const dishMap = new Map<string, DishPerformance>()
  const servedClientNames = new Set<string>()

  for (const row of dishes) {
    const name = row.dish_name || 'Unknown Dish'
    const clientName = row.clients?.full_name || 'Unknown'
    servedClientNames.add(clientName)

    const existing: DishPerformance = dishMap.get(name) ?? {
      dishName: name,
      timesServed: 0,
      reactions: { loved: 0, liked: 0, neutral: 0, disliked: 0, none: 0 },
      clientNames: [],
    }

    existing.timesServed++
    const reaction = row.client_reaction as string | null
    if (reaction && reaction in existing.reactions) {
      existing.reactions[reaction as keyof typeof existing.reactions]++
    } else {
      existing.reactions.none++
    }
    if (!existing.clientNames.includes(clientName)) {
      existing.clientNames.push(clientName)
    }
    dishMap.set(name, existing)
  }

  const dishesServed = Array.from(dishMap.values()).sort((a, b) => b.timesServed - a.timesServed)

  // --- Process container tracking ---
  const deliveries = (deliveryResult.data ?? []) as any[]
  let containersSent = 0
  let containersReturned = 0
  for (const d of deliveries) {
    containersSent += d.containers_sent || 0
    containersReturned += d.containers_back || 0
  }

  // --- Process revenue ---
  // Filter to only this tenant's invoices
  const invoices = ((invoiceResult.data ?? []) as any[]).filter(
    (inv: any) => inv.recurring_invoices?.tenant_id === tenantId
  )
  let invoicedAmountCents = 0
  let paidAmountCents = 0
  let overdueAmountCents = 0
  for (const inv of invoices) {
    const amount = inv.amount_cents || 0
    invoicedAmountCents += amount
    if (inv.status === 'paid') paidAmountCents += amount
    if (inv.status === 'overdue') overdueAmountCents += amount
  }

  // --- Process requests ---
  const requests = (requestResult.data ?? []) as any[]
  let requestsFulfilled = 0
  let requestsDeclined = 0
  let requestsPending = 0
  for (const r of requests) {
    if (r.status === 'fulfilled') requestsFulfilled++
    else if (r.status === 'declined') requestsDeclined++
    else if (['requested', 'reviewed', 'scheduled'].includes(r.status)) requestsPending++
  }

  // --- Build available weeks for navigation ---
  const weekSet = new Set<string>()
  for (const w of (weeksResult.data ?? []) as any[]) {
    if (w.delivered_at) {
      const d =
        typeof w.delivered_at === 'string' ? parseISO(w.delivered_at) : new Date(w.delivered_at)
      const ws = startOfWeek(d, { weekStartsOn: 1 })
      weekSet.add(format(ws, 'yyyy-MM-dd'))
    }
  }
  const availableWeeks = Array.from(weekSet)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 12)
    .map((ws) => {
      const start = parseISO(ws)
      const end = endOfWeek(start, { weekStartsOn: 1 })
      return {
        weekStart: ws,
        label: `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`,
      }
    })

  // Reaction totals
  let lovedCount = 0,
    likedCount = 0,
    neutralCount = 0,
    dislikedCount = 0
  for (const d of dishesServed) {
    lovedCount += d.reactions.loved
    likedCount += d.reactions.liked
    neutralCount += d.reactions.neutral
    dislikedCount += d.reactions.disliked
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    weekLabel,
    totalDeliveries: deliveries.length,
    clientsServed: Array.from(servedClientNames),
    dishesServed,
    totalDishesServed: dishes.length,
    lovedCount,
    likedCount,
    neutralCount,
    dislikedCount,
    containersSent,
    containersReturned,
    containersOutstanding: containersSent - containersReturned,
    invoicedAmountCents,
    paidAmountCents,
    overdueAmountCents,
    requestsFulfilled,
    requestsDeclined,
    requestsPending,
    availableWeeks,
  }
}
