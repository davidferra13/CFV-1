'use server'

// Remy Intelligence Actions
// New capabilities that surface existing app data through Remy.
// PRIVACY: All queries are tenant-scoped. Financial data stays local.
// FORMULA > AI: Everything here is deterministic — no LLM calls.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { generateContract } from '@/lib/ai/contract-generator'
import { generateContingencyPlans } from '@/lib/ai/contingency-ai'
import { consolidateGroceryList } from '@/lib/ai/grocery-consolidation'
import { getSeasonalProduceGrouped } from '@/lib/calendar/seasonal-produce'

// ─── Phase 1: Wire Existing Features ──────────────────────────────────────────

export async function executeContractGeneration(inputs: Record<string, unknown>) {
  const eventId = await resolveEventId(String(inputs.eventName ?? inputs.eventId ?? ''))
  if (!eventId)
    return { error: 'Could not find that event. Please specify the event name or occasion.' }
  const contract = await generateContract(eventId)
  return {
    title: contract.title,
    sections: contract.sections.map((s) => `## ${s.heading}\n${s.content}`).join('\n\n'),
    disclaimer: contract.disclaimer,
    generatedAt: contract.generatedAt,
    _note:
      'This is a DRAFT. Review carefully and consult an attorney before using as a binding contract.',
  }
}

export async function executeContingencyPlanning(inputs: Record<string, unknown>) {
  const eventId = await resolveEventId(String(inputs.eventName ?? inputs.eventId ?? ''))
  if (!eventId)
    return { error: 'Could not find that event. Please specify the event name or occasion.' }
  const result = await generateContingencyPlans(eventId)
  return {
    topRisk: result.topRisk,
    plans: result.plans.map((p) => ({
      scenario: p.scenarioLabel,
      riskLevel: p.riskLevel,
      mitigation: p.mitigationNotes,
      prevention: p.preventionTip,
      timeImpact: p.timeImpact,
    })),
    generatedAt: result.generatedAt,
    _note: 'Review these plans and save the ones relevant to your event.',
  }
}

export async function executeSeasonalProduce() {
  const month = new Date().getMonth() + 1
  const data = getSeasonalProduceGrouped(month)

  const allItems = data.groups.flatMap((g) => g.items)
  const peakItems = allItems.filter((i) => i.peak).map((i) => i.name)

  return {
    season: data.seasonLabel,
    period: data.period,
    groups: data.groups.map((g) => ({
      category: g.label,
      items: g.items.map((i) => ({
        name: i.name,
        peak: i.peak,
        note: i.note ?? null,
      })),
    })),
    peakItems,
    totalItems: allItems.length,
  }
}

export async function executeGroceryConsolidation(inputs: Record<string, unknown>) {
  const eventId = await resolveEventId(String(inputs.eventName ?? inputs.eventId ?? ''))
  if (!eventId)
    return { error: 'Could not find that event. Please specify the event name or occasion.' }
  const result = await consolidateGroceryList(eventId)
  return {
    bySection: result.bySection,
    dietaryFlags: result.dietaryFlags,
    shoppingNotes: result.shoppingNotes,
    totalItems: result.ingredients.length,
    generatedAt: result.generatedAt,
  }
}

// ─── Phase 2: Financial Intelligence (all deterministic) ──────────────────────

export async function executeRevenueForecast(tenantId: string) {
  const supabase: any = createServerClient()
  const now = new Date()

  // Get upcoming events with quotes
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, quoted_price_cents, status, client_id')
    .eq('tenant_id', tenantId)
    .gte('event_date', now.toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  if (!events?.length) {
    return { forecast: [], total30: 0, total60: 0, total90: 0, eventCount: 0 }
  }

  // Get client names for display
  const clientIds = [...new Set(events.map((e: any) => e.client_id).filter(Boolean))]
  const { data: clients } = clientIds.length
    ? await supabase.from('clients').select('id, full_name').in('id', clientIds)
    : { data: [] }
  const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c.full_name]))

  const d30 = new Date(now)
  d30.setDate(d30.getDate() + 30)
  const d60 = new Date(now)
  d60.setDate(d60.getDate() + 60)
  const d90 = new Date(now)
  d90.setDate(d90.getDate() + 90)

  let total30 = 0,
    total60 = 0,
    total90 = 0

  const forecast = events.map((e: any) => {
    const date = new Date(e.event_date)
    const cents = e.quoted_price_cents ?? 0
    if (date <= d30) total30 += cents
    if (date <= d60) total60 += cents
    if (date <= d90) total90 += cents

    return {
      occasion: e.occasion,
      date: e.event_date,
      client: clientMap.get(e.client_id) ?? 'Unknown',
      guests: e.guest_count,
      quotedCents: cents,
      status: e.status,
      // Confidence: paid/confirmed = high, accepted = medium, proposed/draft = low
      confidence: ['paid', 'confirmed', 'in_progress'].includes(e.status)
        ? 'high'
        : ['accepted'].includes(e.status)
          ? 'medium'
          : 'low',
    }
  })

  return {
    forecast,
    total30Cents: total30,
    total60Cents: total60,
    total90Cents: total90,
    eventCount: events.length,
    highConfidenceCents: forecast
      .filter((f: any) => f.confidence === 'high')
      .reduce((s: number, f: any) => s + f.quotedCents, 0),
    mediumConfidenceCents: forecast
      .filter((f: any) => f.confidence === 'medium')
      .reduce((s: number, f: any) => s + f.quotedCents, 0),
    lowConfidenceCents: forecast
      .filter((f: any) => f.confidence === 'low')
      .reduce((s: number, f: any) => s + f.quotedCents, 0),
  }
}

export async function executePnLReport(tenantId: string, inputs: Record<string, unknown>) {
  const supabase: any = createServerClient()
  const now = new Date()

  // Default to current month
  const month = inputs.month ? Number(inputs.month) : now.getMonth() + 1
  const year = inputs.year ? Number(inputs.year) : now.getFullYear()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  // Revenue: ledger entries of type payment/deposit in period
  const { data: revenue } = await supabase
    .from('ledger_entries')
    .select('amount_cents, entry_type')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lt('created_at', endDate)

  // Expenses in period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_cents, category')
    .eq('tenant_id', tenantId)
    .gte('expense_date', startDate)
    .lt('expense_date', endDate)

  // Events completed in period
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .lt('event_date', endDate)

  const totalRevenueCents = (revenue ?? [])
    .filter((e: any) => ['payment', 'deposit', 'tip'].includes(e.entry_type))
    .reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)

  const totalRefundsCents = (revenue ?? [])
    .filter((e: any) => e.entry_type === 'refund')
    .reduce((s: number, e: any) => s + Math.abs(e.amount_cents ?? 0), 0)

  const totalExpenseCents = (expenses ?? []).reduce(
    (s: number, e: any) => s + (e.amount_cents ?? 0),
    0
  )

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {}
  for (const exp of expenses ?? []) {
    const cat = exp.category ?? 'uncategorized'
    expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + (exp.amount_cents ?? 0)
  }

  const netRevenueCents = totalRevenueCents - totalRefundsCents
  const profitCents = netRevenueCents - totalExpenseCents
  const marginPercent = netRevenueCents > 0 ? Math.round((profitCents / netRevenueCents) * 100) : 0

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    totalRevenueCents,
    totalRefundsCents,
    netRevenueCents,
    totalExpenseCents,
    profitCents,
    marginPercent,
    expensesByCategory,
    eventsCount: events?.length ?? 0,
    eventsCompleted: (events ?? []).filter((e: any) => e.status === 'completed').length,
  }
}

export async function executeTaxSummary(tenantId: string, inputs: Record<string, unknown>) {
  const supabase: any = createServerClient()
  const now = new Date()
  const year = inputs.year ? Number(inputs.year) : now.getFullYear()
  const startDate = `${year}-01-01`
  const endDate = `${year + 1}-01-01`

  // All expenses for the year
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount_cents, category, vendor, description, expense_date')
    .eq('tenant_id', tenantId)
    .gte('expense_date', startDate)
    .lt('expense_date', endDate)
    .order('expense_date', { ascending: true })

  // Mileage entries
  const { data: events } = await supabase
    .from('events')
    .select('mileage_miles, event_date, occasion')
    .eq('tenant_id', tenantId)
    .gte('event_date', startDate)
    .lt('event_date', endDate)
    .not('mileage_miles', 'is', null)

  const IRS_RATE_CENTS = 70 // $0.70/mile for 2025/2026

  const totalMileage = (events ?? []).reduce((s: number, e: any) => s + (e.mileage_miles ?? 0), 0)
  const mileageDeductionCents = totalMileage * IRS_RATE_CENTS

  // Group expenses by category for tax reporting
  const byCategory: Record<string, { totalCents: number; count: number }> = {}
  for (const exp of expenses ?? []) {
    const cat = exp.category ?? 'uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { totalCents: 0, count: 0 }
    byCategory[cat].totalCents += exp.amount_cents ?? 0
    byCategory[cat].count += 1
  }

  const totalExpenseCents = (expenses ?? []).reduce(
    (s: number, e: any) => s + (e.amount_cents ?? 0),
    0
  )

  return {
    year,
    totalExpenseCents,
    mileageDeductionCents,
    totalMileageMiles: totalMileage,
    mileageTrips: (events ?? []).length,
    irsRateCentsPerMile: IRS_RATE_CENTS,
    totalDeductibleCents: totalExpenseCents + mileageDeductionCents,
    byCategory,
    _note: 'This is an estimate for planning. Consult your accountant for final tax filings.',
  }
}

export async function executePricingAnalysis(tenantId: string) {
  const supabase: any = createServerClient()

  // Get all completed events with quotes and guests
  const { data: events } = await supabase
    .from('events')
    .select('occasion, guest_count, quoted_price_cents, service_style, event_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'paid', 'confirmed', 'in_progress'])
    .not('quoted_price_cents', 'is', null)
    .order('event_date', { ascending: false })

  if (!events?.length) {
    return { error: 'No completed events with pricing data found.' }
  }

  const perHeadRates = events
    .filter((e: any) => e.guest_count > 0)
    .map((e: any) => ({
      occasion: e.occasion,
      date: e.event_date,
      perHeadCents: Math.round(e.quoted_price_cents / e.guest_count),
      guests: e.guest_count,
      totalCents: e.quoted_price_cents,
      style: e.service_style,
    }))

  const allPerHead = perHeadRates.map((r: any) => r.perHeadCents)
  const avgPerHeadCents = Math.round(
    allPerHead.reduce((a: number, b: number) => a + b, 0) / allPerHead.length
  )
  const minPerHeadCents = Math.min(...allPerHead)
  const maxPerHeadCents = Math.max(...allPerHead)

  // By service style
  const byStyle: Record<string, { avgPerHeadCents: number; count: number }> = {}
  for (const r of perHeadRates) {
    const style = r.style ?? 'unknown'
    if (!byStyle[style]) byStyle[style] = { avgPerHeadCents: 0, count: 0 }
    byStyle[style].count += 1
  }
  for (const style of Object.keys(byStyle)) {
    const styleRates = perHeadRates.filter((r: any) => (r.style ?? 'unknown') === style)
    byStyle[style].avgPerHeadCents = Math.round(
      styleRates.reduce((s: number, r: any) => s + r.perHeadCents, 0) / styleRates.length
    )
  }

  // Trend: compare last 3 months vs prior 3 months
  const now = new Date()
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recent = perHeadRates.filter((r: any) => new Date(r.date) >= threeMonthsAgo)
  const prior = perHeadRates.filter((r: any) => {
    const d = new Date(r.date)
    return d >= sixMonthsAgo && d < threeMonthsAgo
  })

  const recentAvg = recent.length
    ? Math.round(recent.reduce((s: number, r: any) => s + r.perHeadCents, 0) / recent.length)
    : null
  const priorAvg = prior.length
    ? Math.round(prior.reduce((s: number, r: any) => s + r.perHeadCents, 0) / prior.length)
    : null

  return {
    totalEvents: events.length,
    avgPerHeadCents,
    minPerHeadCents,
    maxPerHeadCents,
    byServiceStyle: byStyle,
    trend: {
      recentAvgPerHeadCents: recentAvg,
      priorAvgPerHeadCents: priorAvg,
      direction:
        recentAvg && priorAvg
          ? recentAvg > priorAvg
            ? 'increasing'
            : recentAvg < priorAvg
              ? 'decreasing'
              : 'stable'
          : 'insufficient_data',
    },
    recentEvents: perHeadRates.slice(0, 5),
  }
}

// ─── Phase 3: Capacity & Scheduling ───────────────────────────────────────────

export async function executeUtilizationAnalysis(
  tenantId: string,
  inputs: Record<string, unknown>
) {
  const supabase: any = createServerClient()
  const days = Number(inputs.days ?? 14)
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + days)

  const { data: events } = await supabase
    .from('events')
    .select('occasion, event_date, guest_count, status, arrival_time, serve_time')
    .eq('tenant_id', tenantId)
    .gte('event_date', now.toISOString().split('T')[0])
    .lte('event_date', endDate.toISOString().split('T')[0])
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  // Count events per day
  const dayMap: Record<string, any[]> = {}
  for (const e of events ?? []) {
    const d = e.event_date
    if (!dayMap[d]) dayMap[d] = []
    dayMap[d].push(e)
  }

  // Find double-booked days, busy stretches, gaps
  const busyDays = Object.entries(dayMap)
    .filter(([, evts]) => evts.length >= 2)
    .map(([date, evts]) => ({
      date,
      eventCount: evts.length,
      events: evts.map((e: any) => e.occasion),
    }))

  // Find consecutive event days (prep pressure)
  const eventDates = Object.keys(dayMap).sort()
  const streaks: { start: string; end: string; length: number }[] = []
  let streakStart = eventDates[0]
  let prev = eventDates[0]
  for (let i = 1; i < eventDates.length; i++) {
    const curr = eventDates[i]
    const prevDate = new Date(prev)
    const currDate = new Date(curr)
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000)
    if (diffDays <= 1) {
      prev = curr
    } else {
      if (streakStart !== prev) {
        const len =
          Math.round((new Date(prev).getTime() - new Date(streakStart).getTime()) / 86400000) + 1
        if (len >= 3) streaks.push({ start: streakStart, end: prev, length: len })
      }
      streakStart = curr
      prev = curr
    }
  }
  // Check final streak
  if (eventDates.length > 1 && streakStart !== prev) {
    const len =
      Math.round((new Date(prev).getTime() - new Date(streakStart).getTime()) / 86400000) + 1
    if (len >= 3) streaks.push({ start: streakStart, end: prev, length: len })
  }

  // Free days
  const totalDays = days
  const bookedDays = eventDates.length
  const freeDays = totalDays - bookedDays
  const utilizationPercent = Math.round((bookedDays / totalDays) * 100)

  return {
    periodDays: totalDays,
    bookedDays,
    freeDays,
    utilizationPercent,
    totalEvents: (events ?? []).length,
    busyDays,
    consecutiveStreaks: streaks,
    canTakeMore: utilizationPercent < 70,
    warning:
      utilizationPercent > 85 ? 'You are heavily booked. Consider buffer days for prep.' : null,
  }
}

// ─── Phase 4: Relationship Intelligence ───────────────────────────────────────

export async function executeClientMilestones(tenantId: string) {
  const supabase: any = createServerClient()
  const now = new Date()
  const twoWeeksOut = new Date(now)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)

  // Get all clients with event history
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, created_at, birthday, anniversary, notes, vibe_notes')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!clients?.length) return { milestones: [] }

  // Get event counts per client
  const { data: events } = await supabase
    .from('events')
    .select('client_id, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'paid', 'confirmed', 'in_progress'])

  const eventCounts: Record<string, number> = {}
  for (const e of events ?? []) {
    if (e.client_id) eventCounts[e.client_id] = (eventCounts[e.client_id] ?? 0) + 1
  }

  const milestones: any[] = []

  for (const client of clients) {
    const count = eventCounts[client.id] ?? 0

    // Nth-event milestones
    if ([5, 10, 15, 20, 25, 50].includes(count)) {
      milestones.push({
        clientName: client.full_name,
        type: 'event_milestone',
        detail: `${count}th event together`,
        suggestedAction:
          count >= 10
            ? 'Consider a personalized gift or handwritten note'
            : 'Send a milestone recognition email',
      })
    }

    // Birthday coming up
    if (client.birthday) {
      const bday = parseDateThisYear(client.birthday, now)
      if (bday && bday >= now && bday <= twoWeeksOut) {
        milestones.push({
          clientName: client.full_name,
          type: 'birthday',
          date: bday.toISOString().split('T')[0],
          detail: `Birthday on ${bday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          suggestedAction: 'Send a birthday greeting or surprise treat at next event',
        })
      }
    }

    // Anniversary coming up
    if (client.anniversary) {
      const anniv = parseDateThisYear(client.anniversary, now)
      if (anniv && anniv >= now && anniv <= twoWeeksOut) {
        milestones.push({
          clientName: client.full_name,
          type: 'anniversary',
          date: anniv.toISOString().split('T')[0],
          detail: `Anniversary on ${anniv.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          suggestedAction: 'Mention it at next event or send a card',
        })
      }
    }

    // Client anniversary (time as your client)
    const clientSince = new Date(client.created_at)
    const yearsAsClient = now.getFullYear() - clientSince.getFullYear()
    if (yearsAsClient > 0) {
      const clientAnniv = new Date(clientSince)
      clientAnniv.setFullYear(now.getFullYear())
      if (clientAnniv >= now && clientAnniv <= twoWeeksOut) {
        milestones.push({
          clientName: client.full_name,
          type: 'client_anniversary',
          date: clientAnniv.toISOString().split('T')[0],
          detail: `${yearsAsClient}-year anniversary as your client`,
          suggestedAction: 'Send a milestone recognition or loyalty gesture',
        })
      }
    }
  }

  return {
    milestones: milestones.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    totalChecked: clients.length,
  }
}

export async function executeReEngagementScoring(tenantId: string) {
  const supabase: any = createServerClient()
  const now = new Date()
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Get clients with no recent events
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, status, created_at')
    .eq('tenant_id', tenantId)

  if (!clients?.length) return { candidates: [] }

  // Get all events with dates for these clients
  const { data: events } = await supabase
    .from('events')
    .select('client_id, event_date, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'paid', 'confirmed'])
    .order('event_date', { ascending: false })

  // Build per-client stats
  const clientStats: Record<
    string,
    {
      lastEvent: string
      eventCount: number
      totalSpentCents: number
      avgSpacingDays: number
    }
  > = {}

  for (const e of events ?? []) {
    if (!e.client_id) continue
    if (!clientStats[e.client_id]) {
      clientStats[e.client_id] = {
        lastEvent: e.event_date,
        eventCount: 0,
        totalSpentCents: 0,
        avgSpacingDays: 0,
      }
    }
    clientStats[e.client_id].eventCount += 1
    clientStats[e.client_id].totalSpentCents += e.quoted_price_cents ?? 0
  }

  // Score dormant clients
  const candidates = clients
    .filter((c: any) => {
      const stats = clientStats[c.id]
      if (!stats) return false // never had an event
      return new Date(stats.lastEvent) < ninetyDaysAgo
    })
    .map((c: any) => {
      const stats = clientStats[c.id]
      const daysSinceLastEvent = Math.round(
        (now.getTime() - new Date(stats.lastEvent).getTime()) / 86400000
      )

      // Score: higher = more worth re-engaging
      // Factors: event count (loyalty), total spend (value), recency (not TOO long ago)
      let score = 0
      score += Math.min(stats.eventCount * 15, 50) // up to 50 for loyalty
      score += Math.min(stats.totalSpentCents / 10000, 30) // up to 30 for spend ($100+)
      // Recency penalty: more than a year = lower score
      if (daysSinceLastEvent > 365) score -= 10
      if (daysSinceLastEvent > 180) score -= 5
      score = Math.max(0, Math.min(100, Math.round(score)))

      return {
        clientName: c.full_name,
        lastEventDate: stats.lastEvent,
        daysSinceLastEvent,
        eventCount: stats.eventCount,
        totalSpentCents: stats.totalSpentCents,
        reEngagementScore: score,
        suggestedApproach:
          score >= 60
            ? 'High-value dormant client. Personal outreach recommended.'
            : score >= 30
              ? 'Worth a friendly check-in email.'
              : 'Low priority — may have moved on.',
      }
    })
    .sort((a: any, b: any) => b.reEngagementScore - a.reEngagementScore)

  return {
    candidates: candidates.slice(0, 15),
    totalDormant: candidates.length,
  }
}

export async function executeAcquisitionFunnel(tenantId: string) {
  const supabase: any = createServerClient()

  // All inquiries
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, status, source, created_at, chef_likelihood')
    .eq('tenant_id', tenantId)

  // All events (to check conversions)
  const { data: events } = await supabase
    .from('events')
    .select('id, status, inquiry_id, quoted_price_cents')
    .eq('tenant_id', tenantId)

  const totalInquiries = (inquiries ?? []).length
  const convertedInquiries = (events ?? []).filter((e: any) => e.inquiry_id).length

  // By source
  const bySource: Record<string, { inquiries: number; converted: number; revenueCents: number }> =
    {}
  for (const inq of inquiries ?? []) {
    const src = inq.source ?? 'unknown'
    if (!bySource[src]) bySource[src] = { inquiries: 0, converted: 0, revenueCents: 0 }
    bySource[src].inquiries += 1
  }

  // Match events to inquiry sources
  for (const evt of events ?? []) {
    if (!evt.inquiry_id) continue
    const inq = (inquiries ?? []).find((i: any) => i.id === evt.inquiry_id)
    if (!inq) continue
    const src = inq.source ?? 'unknown'
    if (bySource[src]) {
      bySource[src].converted += 1
      bySource[src].revenueCents += evt.quoted_price_cents ?? 0
    }
  }

  // Compute conversion rates
  const sourceAnalysis = Object.entries(bySource)
    .map(([source, stats]) => ({
      source,
      ...stats,
      conversionRate:
        stats.inquiries > 0 ? Math.round((stats.converted / stats.inquiries) * 100) : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)

  return {
    totalInquiries,
    totalConverted: convertedInquiries,
    overallConversionRate:
      totalInquiries > 0 ? Math.round((convertedInquiries / totalInquiries) * 100) : 0,
    bySource: sourceAnalysis,
    bestSource: sourceAnalysis[0]?.source ?? 'N/A',
  }
}

// ─── Phase 5: Multi-Event Intelligence ────────────────────────────────────────

export async function executeMultiEventComparison(
  inputs: Record<string, unknown>,
  tenantId: string
) {
  const supabase: any = createServerClient()

  // Get event names to compare
  const event1Name = String(inputs.event1 ?? inputs.eventName1 ?? '')
  const event2Name = String(inputs.event2 ?? inputs.eventName2 ?? '')

  if (!event1Name || !event2Name) {
    return {
      error:
        'Please specify two events to compare, e.g., "Compare the Henderson wedding to the Miller dinner"',
    }
  }

  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, quoted_price_cents, status, service_style, client_id'
    )
    .eq('tenant_id', tenantId)
    .or(`occasion.ilike.%${event1Name}%,occasion.ilike.%${event2Name}%`)

  if (!events || events.length < 2) {
    return { error: 'Could not find both events. Please check the event names.' }
  }

  // Get expenses for both
  const eventIds = events.map((e: any) => e.id)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('event_id, amount_cents')
    .in('event_id', eventIds)

  const expenseByEvent: Record<string, number> = {}
  for (const exp of expenses ?? []) {
    if (exp.event_id)
      expenseByEvent[exp.event_id] = (expenseByEvent[exp.event_id] ?? 0) + (exp.amount_cents ?? 0)
  }

  const comparison = events.slice(0, 2).map((e: any) => {
    const expenseCents = expenseByEvent[e.id] ?? 0
    const revenueCents = e.quoted_price_cents ?? 0
    const profitCents = revenueCents - expenseCents
    const perHeadCents = e.guest_count > 0 ? Math.round(revenueCents / e.guest_count) : 0
    const marginPercent = revenueCents > 0 ? Math.round((profitCents / revenueCents) * 100) : 0

    return {
      occasion: e.occasion,
      date: e.event_date,
      guests: e.guest_count,
      revenueCents,
      expenseCents,
      profitCents,
      perHeadCents,
      marginPercent,
      style: e.service_style,
      status: e.status,
    }
  })

  return { events: comparison }
}

// ─── Phase 5: Entity Awareness ────────────────────────────────────────────────

export async function executeGoalsDashboard() {
  const { getGoalsDashboard } = await import('@/lib/goals/actions')
  const dashboard = await getGoalsDashboard()
  return dashboard
}

export async function executeEquipmentList() {
  const { getEquipmentWithDepreciation } = await import('@/lib/equipment/depreciation-actions')
  const items = await getEquipmentWithDepreciation(new Date().getFullYear())
  return {
    items: (items ?? []).map((item: any) => ({
      name: item.name,
      category: item.category,
      purchaseDate: item.purchase_date,
      purchasePriceCents: item.purchase_price_cents,
      currentValueCents: item.current_value_cents,
      condition: item.condition,
      nextMaintenanceDate: item.next_maintenance_date,
      maintenanceOverdue: item.maintenance_overdue,
    })),
    totalItems: (items ?? []).length,
  }
}

export async function executeEquipmentMaintenance() {
  const { getEquipmentDueForMaintenance } = await import('@/lib/equipment/actions')
  const items = await getEquipmentDueForMaintenance()
  return {
    items: (items ?? []).map((item: any) => ({
      name: item.name,
      category: item.category,
      nextMaintenanceDate: item.next_maintenance_date,
      lastMaintenanceDate: item.last_maintenance_date,
      condition: item.condition,
    })),
    totalDue: (items ?? []).length,
  }
}

export async function executeVendorsList(tenantId: string) {
  const supabase: any = createServerClient()
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, category, phone, email, website, notes, rating')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  return {
    vendors: (vendors ?? []).map((v: any) => ({
      name: v.name,
      category: v.category,
      phone: v.phone,
      email: v.email,
      rating: v.rating,
      notes: v.notes,
    })),
    totalVendors: (vendors ?? []).length,
  }
}

// ─── Phase 7: Day-of Support ─────────────────────────────────────────────────

export async function executeMorningBriefing(tenantId: string) {
  const supabase: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // Today's events with full details
  const { data: events } = await supabase
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, arrival_time, serve_time, location_address, service_style, dietary_restrictions, allergies, special_requests, client_id'
    )
    .eq('tenant_id', tenantId)
    .eq('event_date', today)
    .not('status', 'eq', 'cancelled')
    .order('serve_time', { ascending: true })

  // Get client names
  const clientIds = (events ?? []).map((e: any) => e.client_id).filter(Boolean)
  const { data: clients } = clientIds.length
    ? await supabase
        .from('clients')
        .select('id, full_name, dietary_restrictions, allergies')
        .in('id', clientIds)
    : { data: [] as any[] }
  const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c]))

  // Staff assignments for today
  const eventIds = (events ?? []).map((e: any) => e.id)
  const { data: staffAssignments } = eventIds.length
    ? await supabase.from('event_staff').select('event_id, staff_id, role').in('event_id', eventIds)
    : { data: [] }

  // Overdue todos
  const { data: todos } = await supabase
    .from('todos')
    .select('id, title, due_date, priority')
    .eq('tenant_id', tenantId)
    .eq('completed', false)
    .lte('due_date', today)
    .order('priority', { ascending: false })
    .limit(10)

  // New inquiries (last 24 hours)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const { data: newInquiries } = await supabase
    .from('inquiries')
    .select('id, client_name, occasion, event_date, source')
    .eq('tenant_id', tenantId)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })

  // Pending payments
  const { data: pendingPayments } = await supabase
    .from('events')
    .select('id, occasion, quoted_price_cents, client_id, event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['accepted', 'confirmed'])
    .not('quoted_price_cents', 'is', null)

  const todayEvents = (events ?? []).map((e: any) => {
    const client = clientMap.get(e.client_id)
    const staff = (staffAssignments ?? []).filter((s: any) => s.event_id === e.id)
    return {
      occasion: e.occasion,
      client: (client as any)?.full_name ?? 'Unknown',
      guests: e.guest_count,
      arrivalTime: e.arrival_time,
      serveTime: e.serve_time,
      location: e.location_address,
      serviceStyle: e.service_style,
      dietaryRestrictions: e.dietary_restrictions,
      allergies: e.allergies,
      specialRequests: e.special_requests,
      staffCount: staff.length,
      status: e.status,
    }
  })

  return {
    date: today,
    todayEvents,
    eventCount: todayEvents.length,
    overdueTodos: (todos ?? []).map((t: any) => ({
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
    })),
    overdueCount: (todos ?? []).length,
    newInquiries: (newInquiries ?? []).map((i: any) => ({
      clientName: i.client_name,
      occasion: i.occasion,
      eventDate: i.event_date,
      source: i.source,
    })),
    newInquiryCount: (newInquiries ?? []).length,
    pendingPaymentCount: (pendingPayments ?? []).length,
    greeting: getTimeOfDayGreeting(),
  }
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning, chef'
  if (hour < 17) return 'Good afternoon, chef'
  return 'Good evening, chef'
}

// ─── Phase 6: Workflow Chains ─────────────────────────────────────────────────

export async function executeCancellationImpact(inputs: Record<string, unknown>, tenantId: string) {
  const supabase: any = createServerClient()
  const eventName = String(inputs.eventName ?? '')
  const eventId = await resolveEventId(eventName)
  if (!eventId) return { error: 'Could not find that event.' }

  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, quoted_price_cents, client_id, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return { error: 'Event not found.' }

  const eventDate = new Date(event.event_date)
  const lostRevenueCents = event.quoted_price_cents ?? 0

  // Month's other events for impact calculation
  const monthStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const monthEnd = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 1)
    .toISOString()
    .split('T')[0]

  const { data: monthEvents } = await supabase
    .from('events')
    .select('id, quoted_price_cents, status')
    .eq('tenant_id', tenantId)
    .gte('event_date', monthStart)
    .lt('event_date', monthEnd)
    .not('status', 'eq', 'cancelled')

  const monthRevenueCents = (monthEvents ?? []).reduce(
    (s: number, e: any) => s + (e.quoted_price_cents ?? 0),
    0
  )
  const impactPercent =
    monthRevenueCents > 0 ? Math.round((lostRevenueCents / monthRevenueCents) * 100) : 0

  // Check waitlist for the freed date
  const { data: waitlistEntries } = await supabase
    .from('waitlist_entries')
    .select('id, client_name, requested_date, occasion')
    .eq('tenant_id', tenantId)
    .eq('status', 'waiting')

  const nearbyWaitlist = (waitlistEntries ?? []).filter((w: any) => {
    if (!w.requested_date) return false
    const diff = Math.abs(new Date(w.requested_date).getTime() - eventDate.getTime()) / 86400000
    return diff <= 7
  })

  return {
    cancelledEvent: {
      occasion: event.occasion,
      date: event.event_date,
      guests: event.guest_count,
      lostRevenueCents,
    },
    monthlyImpact: {
      monthRevenueBefore: monthRevenueCents,
      monthRevenueAfter: monthRevenueCents - lostRevenueCents,
      impactPercent,
    },
    rebookingOpportunities: nearbyWaitlist.map((w: any) => ({
      clientName: w.client_name,
      requestedDate: w.requested_date,
      occasion: w.occasion,
    })),
    freedDate: event.event_date,
    _suggestion:
      nearbyWaitlist.length > 0
        ? `You have ${nearbyWaitlist.length} waitlisted client(s) near this date. Consider reaching out.`
        : 'No waitlisted clients for this date. Consider posting availability or re-engaging dormant clients.',
  }
}

export async function executePostEventSequence(inputs: Record<string, unknown>) {
  const eventId = await resolveEventId(String(inputs.eventName ?? ''))
  if (!eventId) return { error: 'Could not find that event.' }

  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { error: 'Event not found.' }

  let clientName = 'the client'
  if (event.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()
    if (client) clientName = client.full_name
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)
  const hasExpenses = (expenses ?? []).length > 0

  const steps = [
    {
      step: 1,
      action: 'Log final expenses',
      command: `log expense for ${event.occasion}`,
      done: hasExpenses,
    },
    {
      step: 2,
      action: 'Save event debrief',
      command: `save debrief for ${event.occasion}`,
      done: false,
    },
    {
      step: 3,
      action: `Send thank-you to ${clientName}`,
      command: `draft thank-you for ${clientName}`,
      done: false,
    },
    {
      step: 4,
      action: `Request testimonial from ${clientName}`,
      command: `draft testimonial request for ${clientName}`,
      done: false,
    },
    {
      step: 5,
      action: 'Log mileage for tax deduction',
      command: `log mileage for ${event.occasion}`,
      done: false,
    },
  ]

  return {
    event: event.occasion,
    client: clientName,
    date: event.event_date,
    steps,
    nextStep: steps.find((s) => !s.done) ?? null,
    _note: "Tell me to run any of these steps and I'll help you through it.",
  }
}

// ─── Phase 8-9: Ingredient Substitution & Weather ─────────────────────────────

// Deterministic allergen-safe substitution database (Formula > AI)
const SUBSTITUTION_DB: Record<string, { sub: string; reason: string }[]> = {
  'pine nuts': [
    { sub: 'sunflower seeds', reason: 'Tree nut allergy safe, similar texture' },
    { sub: 'pepitas (pumpkin seeds)', reason: 'Tree nut allergy safe, earthy flavor' },
    { sub: 'toasted hemp seeds', reason: 'Nut-free, similar crunch' },
  ],
  peanuts: [
    { sub: 'sunflower seed butter', reason: 'Peanut allergy safe' },
    { sub: 'soy nut butter', reason: 'Peanut allergy safe (check soy allergy)' },
    { sub: 'toasted coconut flakes', reason: 'Different profile but nut-free' },
  ],
  milk: [
    { sub: 'oat milk', reason: 'Dairy-free, creamy, good for baking' },
    { sub: 'coconut milk', reason: 'Dairy-free, rich, good for sauces' },
    { sub: 'almond milk', reason: 'Dairy-free (check tree nut allergy)' },
  ],
  butter: [
    { sub: 'coconut oil', reason: 'Dairy-free, solid at room temp' },
    { sub: 'olive oil', reason: 'Dairy-free, for savory applications' },
    { sub: 'vegan butter', reason: 'Dairy-free, 1:1 replacement' },
  ],
  eggs: [
    { sub: 'flax egg (1 tbsp ground flax + 3 tbsp water)', reason: 'Egg-free, good for baking' },
    { sub: 'aquafaba (3 tbsp per egg)', reason: 'Egg-free, good for meringues and binding' },
    { sub: 'mashed banana (1/4 cup per egg)', reason: 'Egg-free, adds sweetness' },
  ],
  'wheat flour': [
    { sub: 'almond flour', reason: 'Gluten-free (check tree nut allergy)' },
    { sub: 'rice flour', reason: 'Gluten-free, neutral flavor' },
    { sub: 'oat flour', reason: 'Gluten-free (if certified), similar texture' },
  ],
  'soy sauce': [
    { sub: 'coconut aminos', reason: 'Soy-free, similar umami flavor' },
    { sub: 'tamari (gluten-free)', reason: 'Gluten-free soy option' },
  ],
  shrimp: [
    { sub: 'hearts of palm', reason: 'Shellfish allergy safe, similar texture' },
    { sub: 'king oyster mushroom', reason: 'Shellfish allergy safe, meaty texture' },
  ],
  cream: [
    { sub: 'coconut cream', reason: 'Dairy-free, rich and thick' },
    { sub: 'cashew cream', reason: 'Dairy-free (check tree nut allergy)' },
  ],
  cheese: [
    { sub: 'nutritional yeast', reason: 'Dairy-free, cheesy flavor' },
    { sub: 'cashew cheese', reason: 'Dairy-free (check tree nut allergy)' },
  ],
  honey: [
    { sub: 'maple syrup', reason: 'Vegan, similar sweetness profile' },
    { sub: 'agave nectar', reason: 'Vegan, neutral flavor' },
  ],
  gelatin: [
    { sub: 'agar agar', reason: 'Vegan, sets firmer' },
    { sub: 'pectin', reason: 'Vegan, fruit-based' },
  ],
}

export async function executeIngredientSubstitution(inputs: Record<string, unknown>) {
  const ingredient = String(inputs.ingredient ?? '')
    .toLowerCase()
    .trim()
  if (!ingredient) return { error: 'Please specify an ingredient to find substitutions for.' }

  // Exact match
  if (SUBSTITUTION_DB[ingredient]) {
    return {
      original: ingredient,
      substitutions: SUBSTITUTION_DB[ingredient],
      source: 'deterministic',
    }
  }

  // Partial match
  const partialMatches = Object.keys(SUBSTITUTION_DB).filter(
    (k) => k.includes(ingredient) || ingredient.includes(k)
  )
  if (partialMatches.length > 0) {
    return {
      original: ingredient,
      substitutions: SUBSTITUTION_DB[partialMatches[0]],
      matchedAs: partialMatches[0],
      source: 'deterministic',
    }
  }

  return {
    original: ingredient,
    substitutions: [],
    _note: `No substitutions found in the database for "${ingredient}". Try asking with a more specific ingredient name, or use web search for suggestions.`,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveEventId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null

  // If it looks like a UUID, use directly
  if (/^[0-9a-f]{8}-/.test(nameOrId)) return nameOrId

  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${nameOrId}%`)
    .limit(1)

  return events?.[0]?.id ?? null
}

function parseDateThisYear(dateStr: string, now: Date): Date | null {
  try {
    const parts = dateStr.split('-')
    if (parts.length >= 2) {
      const month = parseInt(parts[parts.length - 2]) - 1
      const day = parseInt(parts[parts.length - 1])
      return new Date(now.getFullYear(), month, day)
    }
    return null
  } catch {
    return null
  }
}
