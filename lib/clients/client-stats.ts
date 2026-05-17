'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type PeriodStats = {
  revenueCents: number
  dinners: number
  covers: number
  newGuests: number
}

export type ClientStats = {
  // Financial
  lifetimeSpendCents: number
  totalPaidCents: number
  totalQuotedCents: number
  totalInvoicedCents: number
  outstandingBalanceCents: number
  averageEventValueCents: number
  highestValueEventCents: number
  highestValueEventId: string | null

  // Profitability
  totalProfitCents: number
  profitMarginPercent: number | null
  totalExpensesCents: number
  menusServed: number

  // Event counts
  totalDinners: number
  completedDinners: number
  upcomingDinners: number
  cancelledDinners: number
  cannabisDinners: number

  // Dates
  firstEventDate: string | null
  lastEventDate: string | null
  nextEventDate: string | null

  // Guest intelligence
  totalCovers: number
  uniqueGuests: number
  guestAppearances: number
  repeatGuests: number
  averagePartySize: number

  // Quote intelligence
  quotesSent: number
  quotesAccepted: number
  quotesDeclined: number
  quoteAcceptanceRate: number | null

  // Relationship
  daysSinceLastEvent: number | null
  isDormant: boolean

  // Time-period breakdowns
  thisMonth: PeriodStats
  lastMonth: PeriodStats
  thisYear: PeriodStats
  lastYear: PeriodStats

  // Data health
  eventsWithoutGuestCount: number
  completedWithoutCloseout: number
}

export async function getClientStats(clientId: string): Promise<ClientStats | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clientCheck } = await db
    .from('clients')
    .select('id, total_guests_served')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (!clientCheck) return null

  const eventSubquery = db
    .from('events')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)

  const [
    financialResult,
    eventsResult,
    guestsResult,
    quotesResult,
    cannabisResult,
    profitResult,
    menusResult,
  ] = await Promise.all([
    db.from('client_financial_summary').select('*').eq('client_id', clientId).single(),
    db
      .from('events')
      .select(
        'id, status, event_date, guest_count, quoted_price_cents, debrief_completed_at, financially_closed'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .is('deleted_at' as any, null)
      .order('event_date', { ascending: false }),
    db
      .from('event_guests')
      .select('id, event_id, email, full_name')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventSubquery),
    db
      .from('quotes')
      .select('id, status, total_quoted_cents')
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!),
    db
      .from('cannabis_event_details')
      .select('id, event_id')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventSubquery),
    db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, total_expenses_cents, profit_cents, profit_margin')
      .eq('tenant_id', user.tenantId!)
      .in('event_id', eventSubquery),
    db.from('menus').select('id').eq('tenant_id', user.tenantId!).in('event_id', eventSubquery),
  ])

  const financial = financialResult.data
  const events = eventsResult.data ?? []
  const guests = guestsResult.data ?? []
  const quotes = quotesResult.data ?? []
  const cannabisEvents = cannabisResult.data ?? []
  const profitRows = profitResult.data ?? []
  const menusCount = (menusResult.data ?? []).length

  // Event breakdowns
  const completed = events.filter((e: any) => e.status === 'completed')
  const upcoming = events.filter(
    (e: any) =>
      ['accepted', 'confirmed', 'paid', 'in_progress', 'proposed'].includes(e.status) &&
      e.event_date &&
      new Date(e.event_date) >= new Date()
  )
  const cancelled = events.filter((e: any) => e.status === 'cancelled')

  // Guest intelligence
  const guestIdentities = new Map<string, Set<string>>()
  for (const g of guests) {
    const key = (g.email || g.full_name || '').toLowerCase().trim()
    if (!key) continue
    if (!guestIdentities.has(key)) guestIdentities.set(key, new Set())
    guestIdentities.get(key)!.add(g.event_id)
  }

  const uniqueGuests = guestIdentities.size
  const guestAppearances = guests.length
  const repeatGuests = Array.from(guestIdentities.values()).filter(
    (events) => events.size > 1
  ).length

  // Total covers: sum of guest_count across all non-cancelled events (fallback to total_guests_served)
  const totalCovers =
    events
      .filter((e: any) => e.status !== 'cancelled')
      .reduce((sum: number, e: any) => sum + (e.guest_count ?? 0), 0) ||
    (clientCheck.total_guests_served ?? 0)

  // Average party size from events with guest_count
  const eventsWithGuests = events.filter((e: any) => e.status !== 'cancelled' && e.guest_count > 0)
  const averagePartySize =
    eventsWithGuests.length > 0
      ? Math.round(
          eventsWithGuests.reduce((s: number, e: any) => s + e.guest_count, 0) /
            eventsWithGuests.length
        )
      : 0

  // Highest-value event
  let highestValueCents = 0
  let highestValueEventId: string | null = null
  for (const e of events) {
    if ((e.quoted_price_cents ?? 0) > highestValueCents) {
      highestValueCents = e.quoted_price_cents
      highestValueEventId = e.id
    }
  }

  // Upcoming/next event date
  const sortedUpcoming = upcoming.sort(
    (a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )
  const nextEventDate = sortedUpcoming[0]?.event_date ?? null

  // Quote intelligence
  const quotesSent = quotes.filter((q: any) => q.status !== 'draft').length
  const quotesAccepted = quotes.filter((q: any) => q.status === 'accepted').length
  const quotesDeclined = quotes.filter((q: any) => q.status === 'rejected').length
  const quoteAcceptanceRate =
    quotesSent > 0 ? Math.round((quotesAccepted / quotesSent) * 100) : null

  // Total quoted (all non-draft quotes)
  const totalQuotedCents = quotes
    .filter((q: any) => q.status !== 'draft')
    .reduce((s: number, q: any) => s + (q.total_quoted_cents ?? 0), 0)

  // Total invoiced = sum of quoted_price on events that have been invoiced or paid
  const totalInvoicedCents = events
    .filter((e: any) => e.status !== 'cancelled' && e.quoted_price_cents > 0)
    .reduce((s: number, e: any) => s + (e.quoted_price_cents ?? 0), 0)

  // Data health
  const eventsWithoutGuestCount = events.filter(
    (e: any) => e.status !== 'cancelled' && e.status !== 'draft' && !e.guest_count
  ).length
  const completedWithoutCloseout = completed.filter(
    (e: any) => !e.debrief_completed_at && !e.financially_closed
  ).length

  // Profitability from event_financial_summary
  const totalProfitCents = profitRows.reduce((s: number, r: any) => s + (r.profit_cents ?? 0), 0)
  const totalNetRevenue = profitRows.reduce(
    (s: number, r: any) => s + (r.net_revenue_cents ?? 0),
    0
  )
  const totalExpensesCents = profitRows.reduce(
    (s: number, r: any) => s + (r.total_expenses_cents ?? 0),
    0
  )
  const profitMarginPercent =
    totalNetRevenue > 0 ? Math.round((totalProfitCents / totalNetRevenue) * 100) : null

  // Time-period breakdowns
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const thisYearStart = new Date(now.getFullYear(), 0, 1)
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)

  function computePeriod(start: Date, end: Date): PeriodStats {
    const periodEvents = completed.filter((e: any) => {
      const d = new Date(e.event_date)
      return d >= start && d <= end
    })
    return {
      revenueCents: periodEvents.reduce((s: number, e: any) => s + (e.quoted_price_cents ?? 0), 0),
      dinners: periodEvents.length,
      covers: periodEvents.reduce((s: number, e: any) => s + (e.guest_count ?? 0), 0),
      newGuests: 0,
    }
  }

  const thisMonth = computePeriod(thisMonthStart, now)
  const lastMonth = computePeriod(lastMonthStart, lastMonthEnd)
  const thisYear = computePeriod(thisYearStart, now)
  const lastYear = computePeriod(lastYearStart, lastYearEnd)

  // Days since last event
  const lastEventDate = financial?.last_event_date ?? null
  const daysSinceLastEvent = lastEventDate
    ? Math.floor((Date.now() - new Date(lastEventDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    lifetimeSpendCents: financial?.lifetime_value_cents ?? 0,
    totalPaidCents: financial?.lifetime_value_cents ?? 0,
    totalQuotedCents,
    totalInvoicedCents,
    outstandingBalanceCents: financial?.outstanding_balance_cents ?? 0,
    averageEventValueCents: financial?.average_spend_per_event ?? 0,
    highestValueEventCents: highestValueCents,
    highestValueEventId,

    totalProfitCents,
    profitMarginPercent,
    totalExpensesCents,
    menusServed: menusCount,

    totalDinners: events.length,
    completedDinners: completed.length,
    upcomingDinners: upcoming.length,
    cancelledDinners: cancelled.length,
    cannabisDinners: cannabisEvents.length,

    firstEventDate: financial?.first_event_date ?? null,
    lastEventDate,
    nextEventDate,

    totalCovers,
    uniqueGuests,
    guestAppearances,
    repeatGuests,
    averagePartySize,

    quotesSent,
    quotesAccepted,
    quotesDeclined,
    quoteAcceptanceRate,

    daysSinceLastEvent,
    isDormant: (daysSinceLastEvent ?? 0) > 180,

    thisMonth,
    lastMonth,
    thisYear,
    lastYear,

    eventsWithoutGuestCount,
    completedWithoutCloseout,
  }
}
