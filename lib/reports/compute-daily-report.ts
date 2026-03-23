// Daily Report Computation
// Pure function - no 'use server', no requireChef().
// Accepts a tenantId and admin Supabase client so it works from both:
//   - The cron route (no user session)
//   - The app page server action (via requireChef + admin client)

import type { DailyReportContent, HighIntentVisit, DailyReportEvent } from './types'

// Accept any client with a Supabase-compatible query builder API
type AdminClient = { from: (table: string) => any; rpc: (fn: string, params?: any) => any }

/**
 * Safe wrapper - if a fetch fails, return the fallback instead of throwing.
 */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[daily-report] ${label} failed:`, err)
    return fallback
  }
}

/**
 * Compute the full daily report for a given tenant/date.
 * All queries use the admin client for service-role access.
 */
export async function computeDailyReport(
  supabase: AdminClient,
  tenantId: string,
  reportDate: string // YYYY-MM-DD
): Promise<DailyReportContent> {
  const now = new Date()

  // Date calculations
  const reportDateObj = new Date(reportDate + 'T00:00:00Z')
  const yesterdayStart = new Date(reportDateObj)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayStr = yesterdayStart.toISOString().split('T')[0]

  const sevenDaysOut = new Date(reportDateObj)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const sevenDaysOutStr = sevenDaysOut.toISOString().split('T')[0]

  // Current month boundaries
  const monthStart = `${reportDate.slice(0, 7)}-01`
  const prevMonthDate = new Date(reportDateObj)
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
  const prevMonthStart = `${prevMonthDate.toISOString().slice(0, 7)}-01`
  const prevMonthEnd = new Date(reportDateObj.getFullYear(), reportDateObj.getMonth(), 0)
    .toISOString()
    .split('T')[0]

  // ─── Parallel fetches ─────────────────────────────────────────────────

  const [
    eventsToday,
    upcomingEvents,
    inquiryStats,
    quoteStats,
    staleInquiries,
    currentMonthPayments,
    prevMonthPayments,
    outstandingEvents,
    clientActivity,
    closureTasks,
    pipelineForecast,
    responseTime,
    foodCost,
    closureStreak,
    milestones,
    dormantClients,
    multiEventDays,
    nextBestActions,
  ] = await Promise.all([
    // 1. Events today
    safe(
      'eventsToday',
      async () => {
        const { data } = await supabase
          .from('events')
          .select('id, occasion, serve_time, guest_count, status, client:clients(full_name)')
          .eq('tenant_id', tenantId)
          .eq('event_date', reportDate)
          .not('status', 'eq', 'cancelled')
          .order('serve_time', { ascending: true })
        return (data || []) as any[]
      },
      []
    ),

    // 2. Upcoming events next 7 days
    safe(
      'upcomingEvents',
      async () => {
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gt('event_date', reportDate)
          .lte('event_date', sevenDaysOutStr)
          .not('status', 'in', '("cancelled","completed")')
        return count ?? 0
      },
      0
    ),

    // 3. Inquiry stats
    safe(
      'inquiryStats',
      async () => {
        const { data } = await supabase
          .from('inquiries')
          .select('status')
          .eq('tenant_id', tenantId)
          .not('status', 'in', '("declined","expired")')
        const stats: Record<string, number> = {}
        for (const row of data || []) {
          stats[row.status] = (stats[row.status] || 0) + 1
        }
        return stats
      },
      {}
    ),

    // 4. Quote stats
    safe(
      'quoteStats',
      async () => {
        const { data } = await supabase
          .from('quotes')
          .select(
            'id, valid_until, total_quoted_cents, inquiry:inquiries(client:clients(full_name))'
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'sent')
          .lte('valid_until', sevenDaysOutStr)
          .gte('valid_until', reportDate)
        return (data || []) as any[]
      },
      []
    ),

    // 5. Stale inquiries (awaiting client for 3+ days)
    safe(
      'staleInquiries',
      async () => {
        const threeDaysAgo = new Date(reportDateObj)
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const { count } = await supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .in('status', ['awaiting_client', 'quoted'])
          .lte('updated_at', threeDaysAgo.toISOString())
        return count ?? 0
      },
      0
    ),

    // 6. Current month payments (revenue MTD)
    safe(
      'currentMonthPayments',
      async () => {
        const { data } = await supabase
          .from('ledger_entries')
          .select('amount_cents, is_refund')
          .eq('tenant_id', tenantId)
          .eq('entry_type', 'payment')
          .gte('created_at', monthStart + 'T00:00:00Z')
          .lte('created_at', reportDate + 'T23:59:59Z')
        let total = 0
        for (const e of data || []) {
          total += e.is_refund ? -e.amount_cents : e.amount_cents
        }
        return total
      },
      0
    ),

    // 7. Previous month payments (for MoM comparison)
    safe(
      'prevMonthPayments',
      async () => {
        const { data } = await supabase
          .from('ledger_entries')
          .select('amount_cents, is_refund')
          .eq('tenant_id', tenantId)
          .eq('entry_type', 'payment')
          .gte('created_at', prevMonthStart + 'T00:00:00Z')
          .lte('created_at', prevMonthEnd + 'T23:59:59Z')
        let total = 0
        for (const e of data || []) {
          total += e.is_refund ? -e.amount_cents : e.amount_cents
        }
        return total
      },
      0
    ),

    // 8. Outstanding balances
    safe(
      'outstandingEvents',
      async () => {
        const { data } = await supabase
          .from('event_financial_summary')
          .select('outstanding_balance_cents')
          .eq('tenant_id', tenantId)
          .gt('outstanding_balance_cents', 0)
        let total = 0
        for (const e of data || []) {
          total += e.outstanding_balance_cents ?? 0
        }
        return total
      },
      0
    ),

    // 9. Client activity yesterday (high intent)
    safe(
      'clientActivity',
      async () => {
        const { data } = await supabase
          .from('activity_events')
          .select('client_id, event_type, created_at, metadata')
          .eq('tenant_id', tenantId)
          .eq('actor_type', 'client')
          .in('event_type', [
            'portal_login',
            'payment_page_visited',
            'proposal_viewed',
            'quote_viewed',
          ])
          .gte('created_at', yesterdayStr + 'T00:00:00Z')
          .lte('created_at', reportDate + 'T00:00:00Z')
          .order('created_at', { ascending: false })
          .limit(20)
        return (data || []) as any[]
      },
      []
    ),

    // 10. Open closure tasks
    safe(
      'closureTasks',
      async () => {
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .or(
            'aar_filed.eq.false,reset_complete.eq.false,follow_up_sent.eq.false,financially_closed.eq.false'
          )
        return count ?? 0
      },
      0
    ),

    // 11. Pipeline forecast
    safe(
      'pipelineForecast',
      async () => {
        const { data } = await supabase
          .from('quotes')
          .select('total_quoted_cents, status')
          .eq('tenant_id', tenantId)
          .in('status', ['sent', 'draft'])
        let expected = 0
        for (const q of data || []) {
          const prob = q.status === 'sent' ? 0.4 : 0.15
          expected += Math.round((q.total_quoted_cents ?? 0) * prob)
        }
        return expected
      },
      0
    ),

    // 12. Response time
    safe(
      'responseTime',
      async () => {
        const { data } = await supabase
          .from('inquiries')
          .select('created_at, first_response_at')
          .eq('tenant_id', tenantId)
          .not('first_response_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20)
        if (!data || data.length === 0) return { avg: null, overdue: 0 }
        let totalHours = 0
        let count = 0
        for (const inq of data) {
          if (inq.first_response_at) {
            const diff =
              new Date(inq.first_response_at).getTime() - new Date(inq.created_at).getTime()
            totalHours += diff / (1000 * 60 * 60)
            count++
          }
        }
        // Count overdue (no response in 24h)
        const { count: overdueCount } = await supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .is('first_response_at', null)
          .in('status', ['new', 'awaiting_chef'])
          .lte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        return {
          avg: count > 0 ? Math.round((totalHours / count) * 10) / 10 : null,
          overdue: overdueCount ?? 0,
        }
      },
      { avg: null, overdue: 0 }
    ),

    // 13. Food cost trend
    safe(
      'foodCost',
      async () => {
        const { data } = await supabase
          .from('event_financial_summary')
          .select('food_cost_percentage')
          .eq('tenant_id', tenantId)
          .not('food_cost_percentage', 'is', null)
          .gt('food_cost_percentage', 0)
          .order('event_id', { ascending: false })
          .limit(10)
        if (!data || data.length === 0) return { avg: null, trending: 'stable' as const }
        const avg =
          data.reduce((sum: any, d: any) => sum + (d.food_cost_percentage ?? 0), 0) / data.length
        // Compare first half vs second half
        const mid = Math.floor(data.length / 2)
        const recentAvg =
          data.slice(0, mid).reduce((s: any, d: any) => s + (d.food_cost_percentage ?? 0), 0) / mid
        const olderAvg =
          data.slice(mid).reduce((s: any, d: any) => s + (d.food_cost_percentage ?? 0), 0) /
          (data.length - mid)
        const trending =
          recentAvg > olderAvg * 1.05
            ? ('rising' as const)
            : recentAvg < olderAvg * 0.95
              ? ('falling' as const)
              : ('stable' as const)
        return { avg: Math.round(avg * 10) / 10, trending }
      },
      { avg: null, trending: 'stable' as const }
    ),

    // 14. Closure streak
    safe(
      'closureStreak',
      async () => {
        const { data } = await supabase
          .from('events')
          .select('event_date, aar_filed, reset_complete, follow_up_sent, financially_closed')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(50)
        if (!data) return { current: 0, longest: 0 }
        let current = 0
        let longest = 0
        let streak = 0
        for (const e of data) {
          const closed = e.aar_filed && e.reset_complete && e.follow_up_sent && e.financially_closed
          if (closed) {
            streak++
            if (streak > longest) longest = streak
          } else {
            if (current === 0) current = streak
            streak = 0
          }
        }
        if (current === 0) current = streak
        return { current, longest }
      },
      { current: 0, longest: 0 }
    ),

    // 15. Client milestones (next 14 days)
    safe(
      'milestones',
      async () => {
        const { data } = await supabase
          .from('clients')
          .select('id, full_name, birthday, anniversary')
          .eq('tenant_id', tenantId)
          .or(`birthday.not.is.null,anniversary.not.is.null`)
        if (!data) return []
        const results: any[] = []
        const today = new Date(reportDate + 'T00:00:00Z')
        for (const c of data) {
          for (const [field, type] of [
            ['birthday', 'birthday'],
            ['anniversary', 'anniversary'],
          ] as const) {
            const dateVal = c[field as keyof typeof c] as string | null
            if (!dateVal) continue
            const d = new Date(dateVal)
            // Set to this year
            d.setFullYear(today.getFullYear())
            if (d < today) d.setFullYear(today.getFullYear() + 1)
            const daysUntil = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            if (daysUntil <= 14) {
              results.push({
                clientId: c.id,
                clientName: c.full_name,
                type,
                label: `${type === 'birthday' ? 'Birthday' : 'Anniversary'} in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
                date: d.toISOString().split('T')[0],
                daysUntil,
              })
            }
          }
        }
        return results.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5)
      },
      []
    ),

    // 16. Dormant clients (90+ days since last event)
    safe(
      'dormantClients',
      async () => {
        const ninetyDaysAgo = new Date(reportDateObj)
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        const { data } = await supabase
          .from('clients')
          .select('id, full_name')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
        if (!data || data.length === 0) return []
        const results: any[] = []
        for (const client of data.slice(0, 50)) {
          const { data: lastEvent } = await supabase
            .from('events')
            .select('event_date')
            .eq('tenant_id', tenantId)
            .eq('client_id', client.id)
            .not('status', 'eq', 'cancelled')
            .order('event_date', { ascending: false })
            .limit(1)
          if (lastEvent && lastEvent.length > 0) {
            const lastDate = new Date(lastEvent[0].event_date)
            const daysSince = Math.ceil(
              (reportDateObj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSince >= 90) {
              results.push({
                clientId: client.id,
                clientName: client.full_name,
                daysSinceLastEvent: daysSince,
                lifetimeValueCents: 0,
              })
            }
          }
        }
        return results.sort((a, b) => b.daysSinceLastEvent - a.daysSinceLastEvent).slice(0, 5)
      },
      []
    ),

    // 17. Multi-event days (schedule conflicts next 30 days)
    safe(
      'multiEventDays',
      async () => {
        const thirtyDaysOut = new Date(reportDateObj)
        thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
        const { data } = await supabase
          .from('events')
          .select('event_date')
          .eq('tenant_id', tenantId)
          .gte('event_date', reportDate)
          .lte('event_date', thirtyDaysOut.toISOString().split('T')[0])
          .not('status', 'in', '("cancelled","completed")')
        if (!data) return []
        const counts: Record<string, number> = {}
        for (const e of data) {
          counts[e.event_date] = (counts[e.event_date] || 0) + 1
        }
        return Object.entries(counts)
          .filter(([, count]) => count > 1)
          .map(([date, eventCount]) => ({ date, eventCount }))
          .sort((a, b) => a.date.localeCompare(b.date))
      },
      []
    ),

    // 18. Next best actions (top 3)
    safe(
      'nextBestActions',
      async () => {
        // Simplified: find clients needing attention
        const { data } = await supabase
          .from('inquiries')
          .select('id, status, confirmed_occasion, client:clients(id, full_name)')
          .eq('tenant_id', tenantId)
          .in('status', ['new', 'awaiting_chef'])
          .order('created_at', { ascending: true })
          .limit(3)
        return (data || []).map((inq: any) => ({
          clientName: inq.client?.full_name ?? 'Unknown',
          label: inq.status === 'new' ? 'Respond to inquiry' : 'Follow up',
          description: `${inq.confirmed_occasion || 'Event'} - waiting for your response`,
          href: `/inquiries/${inq.id}`,
          urgency: 'high' as const,
        }))
      },
      []
    ),
  ])

  // ─── Assemble ─────────────────────────────────────────────────────────

  // Process events today
  const eventsTodayMapped: DailyReportEvent[] = eventsToday.map((e: any) => ({
    eventId: e.id,
    occasion: e.occasion,
    clientName: e.client?.full_name ?? 'Unknown',
    serveTime: e.serve_time,
    guestCount: e.guest_count,
    status: e.status,
  }))

  // Process high-intent visits
  const clientIds = [...new Set(clientActivity.map((a: any) => a.client_id).filter(Boolean))]
  let clientNames: Record<string, string> = {}
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, full_name')
      .in('id', clientIds)
    for (const c of clients || []) {
      clientNames[c.id] = c.full_name
    }
  }

  const highIntentVisits: HighIntentVisit[] = clientActivity
    .filter((a: any) =>
      ['payment_page_visited', 'proposal_viewed', 'quote_viewed'].includes(a.event_type)
    )
    .map((a: any) => ({
      clientName: clientNames[a.client_id] ?? 'Unknown',
      clientId: a.client_id,
      eventType: a.event_type,
      time: a.created_at,
    }))
    .slice(0, 5)

  const clientLoginsYesterday = clientActivity.filter(
    (a: any) => a.event_type === 'portal_login'
  ).length

  // Quote expiring details
  const expiringQuoteDetails = quoteStats.map((q: any) => ({
    clientName: q.inquiry?.client?.full_name ?? 'Unknown',
    validUntil: q.valid_until,
    amountCents: q.total_quoted_cents ?? 0,
  }))

  // Today's payments
  const todayPayments = await safe(
    'todayPayments',
    async () => {
      const { data } = await supabase
        .from('ledger_entries')
        .select('amount_cents, is_refund')
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'payment')
        .gte('created_at', reportDate + 'T00:00:00Z')
        .lte('created_at', reportDate + 'T23:59:59Z')
      let total = 0
      for (const e of data || []) {
        total += e.is_refund ? -e.amount_cents : e.amount_cents
      }
      return total
    },
    0
  )

  // MoM change
  const momChange =
    prevMonthPayments > 0
      ? Math.round(((currentMonthPayments - prevMonthPayments) / prevMonthPayments) * 100)
      : 0

  // Count new inquiries today
  const newInquiriesToday = await safe(
    'newInquiriesToday',
    async () => {
      const { count } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', reportDate + 'T00:00:00Z')
        .lte('created_at', reportDate + 'T23:59:59Z')
      return count ?? 0
    },
    0
  )

  return {
    eventsToday: eventsTodayMapped,
    upcomingEventsNext7d: upcomingEvents,
    newInquiriesToday,
    inquiryStats,
    quotesExpiringSoon: quoteStats.length,
    expiringQuoteDetails,
    staleFollowUps: staleInquiries,
    paymentsReceivedTodayCents: todayPayments,
    monthRevenueToDateCents: currentMonthPayments,
    monthOverMonthChangePercent: momChange,
    outstandingBalanceCents: outstandingEvents,
    pipelineForecastCents: pipelineForecast,
    avgResponseTimeHours: responseTime.avg,
    overdueResponses: responseTime.overdue,
    foodCostAvgPercent: foodCost.avg,
    foodCostTrending: foodCost.trending,
    closureStreak: closureStreak.current,
    longestStreak: closureStreak.longest,
    highIntentVisits,
    clientLoginsYesterday,
    upcomingMilestones: milestones,
    dormantClients,
    scheduleConflicts: multiEventDays,
    nextBestActions,
    openClosureTasks: closureTasks,
    generatedAt: now.toISOString(),
  }
}
