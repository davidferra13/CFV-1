// Dashboard-Specific Data Fetching
// Lightweight aggregation queries designed for the dashboard surface.
// Each function is independently authenticated and safe to call in Promise.all.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// 1. Outstanding Payments — events with money owed
// ============================================

export async function getOutstandingPayments() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: summaries, error } = await supabase
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, quoted_price_cents, total_paid_cents')
    .eq('tenant_id', user.tenantId!)
    .gt('outstanding_balance_cents', 0)

  if (error || !summaries || summaries.length === 0) {
    if (error) console.error('[getOutstandingPayments] Error:', error)
    return { events: [] as OutstandingEvent[], totalOutstandingCents: 0 }
  }

  const eventIds = summaries.map(s => s.event_id).filter(Boolean) as string[]

  // Only show non-draft, non-cancelled events where payment is expected
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(id, full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('id', eventIds)
    .not('status', 'in', '("draft","cancelled")')
    .order('event_date', { ascending: true })

  const enriched: OutstandingEvent[] = (events || []).map(event => {
    const fin = summaries.find(s => s.event_id === event.id)
    return {
      eventId: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      clientName: (event.client as any)?.full_name ?? 'Unknown',
      outstandingCents: fin?.outstanding_balance_cents ?? 0,
    }
  })

  const totalOutstandingCents = enriched.reduce((sum, e) => sum + e.outstandingCents, 0)

  return { events: enriched, totalOutstandingCents }
}

export type OutstandingEvent = {
  eventId: string
  occasion: string | null
  eventDate: string
  clientName: string
  outstandingCents: number
}

// ============================================
// 2. Quote Pipeline Stats
// ============================================

export async function getDashboardQuoteStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('status, valid_until, total_quoted_cents, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['draft', 'sent'])

  if (error) {
    console.error('[getDashboardQuoteStats] Error:', error)
    return { draft: 0, sent: 0, expiringSoon: 0, total: 0, expiringDetails: [] as { clientName: string; validUntil: string; amountCents: number }[] }
  }

  const allQuotes = quotes || []
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const draft = allQuotes.filter(q => q.status === 'draft').length
  const sent = allQuotes.filter(q => q.status === 'sent').length

  const expiringQuotes = allQuotes.filter(q =>
    q.status === 'sent' && q.valid_until && q.valid_until <= threeDaysFromNow
  )

  const expiringDetails = expiringQuotes.map(q => ({
    clientName: (q.client as any)?.full_name ?? 'Unknown',
    validUntil: q.valid_until!,
    amountCents: q.total_quoted_cents ?? 0,
  }))

  return { draft, sent, expiringSoon: expiringQuotes.length, total: draft + sent, expiringDetails }
}

// ============================================
// 3. Event Counts — this month + YTD
// ============================================

export async function getDashboardEventCounts() {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const yearStart = `${now.getFullYear()}-01-01`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date, status, guest_count')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', yearStart)
    .not('status', 'eq', 'cancelled')

  if (error) {
    console.error('[getDashboardEventCounts] Error:', error)
    return { thisMonth: 0, ytd: 0, completedThisMonth: 0, completedYtd: 0, upcomingThisMonth: 0, totalGuestsThisMonth: 0, totalGuestsYtd: 0 }
  }

  const allEvents = events || []
  const thisMonthEvents = allEvents.filter(e => e.event_date >= monthStart)
  const today = new Date().toISOString().split('T')[0]
  const completedThisMonth = thisMonthEvents.filter(e => e.status === 'completed').length
  const upcomingThisMonth = thisMonthEvents.filter(e => e.event_date >= today && e.status !== 'completed').length

  return {
    thisMonth: thisMonthEvents.length,
    ytd: allEvents.length,
    completedThisMonth,
    completedYtd: allEvents.filter(e => e.status === 'completed').length,
    upcomingThisMonth,
    totalGuestsThisMonth: thisMonthEvents.reduce((sum, e) => sum + (e.guest_count || 0), 0),
    totalGuestsYtd: allEvents.reduce((sum, e) => sum + (e.guest_count || 0), 0),
  }
}

// ============================================
// 4. Month-over-Month Revenue Comparison
// ============================================

export async function getMonthOverMonthRevenue() {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

  const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const nextMonthStart = currentMonth === 12
    ? `${currentYear + 1}-01-01`
    : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`

  // Get events for current and previous months
  const { data: events } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', prevMonthStart)
    .lt('event_date', nextMonthStart)
    .not('status', 'eq', 'cancelled')

  if (!events || events.length === 0) {
    return {
      currentMonthRevenueCents: 0,
      previousMonthRevenueCents: 0,
      currentMonthProfitCents: 0,
      changePercent: 0,
    }
  }

  const currentIds = events.filter(e => e.event_date >= currentMonthStart).map(e => e.id)
  const prevIds = events.filter(e => e.event_date < currentMonthStart).map(e => e.id)
  const allIds = [...currentIds, ...prevIds]

  if (allIds.length === 0) {
    return {
      currentMonthRevenueCents: 0,
      previousMonthRevenueCents: 0,
      currentMonthProfitCents: 0,
      changePercent: 0,
    }
  }

  const { data: summaries } = await supabase
    .from('event_financial_summary')
    .select('event_id, total_paid_cents, profit_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', allIds)

  let currentRevenue = 0
  let prevRevenue = 0
  let currentProfit = 0

  for (const s of (summaries || [])) {
    if (s.event_id && currentIds.includes(s.event_id)) {
      currentRevenue += (s.total_paid_cents ?? 0)
      currentProfit += (s.profit_cents ?? 0)
    } else if (s.event_id && prevIds.includes(s.event_id)) {
      prevRevenue += (s.total_paid_cents ?? 0)
    }
  }

  const changePercent = prevRevenue > 0
    ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
    : currentRevenue > 0 ? 100 : 0

  return {
    currentMonthRevenueCents: currentRevenue,
    previousMonthRevenueCents: prevRevenue,
    currentMonthProfitCents: currentProfit,
    changePercent,
  }
}

// ============================================
// 5. Current Month Expense Totals
// ============================================

export async function getCurrentMonthExpenseSummary() {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('expenses')
    .select('amount_cents, is_business')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', monthStart)

  if (error) {
    console.error('[getCurrentMonthExpenseSummary] Error:', error)
    return { totalCents: 0, businessCents: 0 }
  }

  let businessCents = 0
  let totalCents = 0

  for (const exp of (data || [])) {
    totalCents += exp.amount_cents
    if (exp.is_business) {
      businessCents += exp.amount_cents
    }
  }

  return { totalCents, businessCents }
}

// ============================================
// 6. Next Upcoming Event (when today is free)
// ============================================

export async function getNextUpcomingEvent() {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('events')
    .select('id, occasion, event_date, serve_time, guest_count, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gt('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getNextUpcomingEvent] Error:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    occasion: data.occasion,
    eventDate: data.event_date,
    serveTime: data.serve_time,
    guestCount: data.guest_count,
    clientName: (data.client as any)?.full_name ?? 'Unknown',
  }
}
