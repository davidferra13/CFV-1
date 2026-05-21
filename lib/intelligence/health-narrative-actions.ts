'use server'

// Business Health Narrative Dashboard - Server Actions
// Aggregates real data from existing tables, generates narrative via Ollama or template fallback.
// Every action: auth gate + tenant scoping. Zero hallucinated numbers.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  BusinessHealthSnapshot,
  RevenueSnapshot,
  ClientPipelineSnapshot,
  EventLoadSnapshot,
  CostSnapshot,
  HealthNarrative,
  NarrativeSection,
  NarrativeSentiment,
  HealthTrends,
  TrendPoint,
  HealthAlert,
  HealthActionResult,
} from './health-narrative-types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

function periodBounds(days: number): { start: string; end: string; prevStart: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)
  const start = startDate.toISOString().split('T')[0]
  const prevDate = new Date(startDate)
  prevDate.setDate(prevDate.getDate() - days)
  const prevStart = prevDate.toISOString().split('T')[0]
  return { start, end, prevStart }
}

// ── getBusinessHealthSnapshot ───────────────────────────────────────────────

export async function getBusinessHealthSnapshot(
  periodDays = 90
): Promise<HealthActionResult<BusinessHealthSnapshot>> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db: any = createServerClient()
    const { start, end, prevStart } = periodBounds(periodDays)

    // Parallel queries for all metrics
    const [
      currentEventsRes,
      prevEventsRes,
      allClientsRes,
      newClientsRes,
      atRiskRes,
      inquiriesRes,
      cancelledRes,
      ledgerRes,
      prevLedgerRes,
    ] = await Promise.all([
      // Current period events (not cancelled)
      db
        .from('events')
        .select('id, event_date, status, amount_paid_cents, guest_count')
        .eq('tenant_id', tenantId)
        .is('deleted_at' as any, null)
        .gte('event_date', start)
        .lte('event_date', end)
        .not('status', 'in', '("cancelled")'),
      // Previous period events for comparison
      db
        .from('events')
        .select('id, amount_paid_cents')
        .eq('tenant_id', tenantId)
        .is('deleted_at' as any, null)
        .gte('event_date', prevStart)
        .lt('event_date', start)
        .not('status', 'in', '("cancelled")'),
      // Total active clients
      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      // New clients this period
      db
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', start),
      // At-risk clients (no event in 2x period)
      db
        .from('clients')
        .select('id, last_event_date')
        .eq('tenant_id', tenantId)
        .lt('last_event_date', start),
      // Open inquiries (pipeline)
      db
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('status', 'in', '("converted","declined")'),
      // Cancelled events this period
      db
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at' as any, null)
        .gte('event_date', start)
        .lte('event_date', end)
        .eq('status', 'cancelled'),
      // Ledger entries this period (ingredient costs)
      db
        .from('ledger_entries')
        .select('amount_cents, category')
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'expense')
        .gte('entry_date', start)
        .lte('entry_date', end),
      // Previous period ledger for trend
      db
        .from('ledger_entries')
        .select('amount_cents')
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'expense')
        .gte('entry_date', prevStart)
        .lt('entry_date', start),
    ])

    // ── Revenue ─────────────────────────────────────────────────────────
    const currentEvents: any[] = currentEventsRes.data ?? []
    const prevEvents: any[] = prevEventsRes.data ?? []

    const totalRevenueCents = currentEvents.reduce(
      (sum: number, e: any) => sum + (e.amount_paid_cents ?? 0),
      0
    )
    const prevRevenueCents = prevEvents.reduce(
      (sum: number, e: any) => sum + (e.amount_paid_cents ?? 0),
      0
    )

    const revenue: RevenueSnapshot = {
      totalCents: totalRevenueCents,
      periodLabel: `Last ${periodDays} days`,
      trend:
        totalRevenueCents > prevRevenueCents * 1.05
          ? 'up'
          : totalRevenueCents < prevRevenueCents * 0.95
            ? 'down'
            : 'flat',
      comparisonCents: prevRevenueCents,
      comparisonLabel: `Previous ${periodDays} days`,
      eventCount: currentEvents.length,
      avgPerEventCents:
        currentEvents.length > 0 ? Math.round(totalRevenueCents / currentEvents.length) : 0,
    }

    // ── Clients ─────────────────────────────────────────────────────────
    const totalClients = allClientsRes.count ?? 0
    const newClients = newClientsRes.count ?? 0
    const atRiskClients: any[] = atRiskRes.data ?? []
    const pipeline = inquiriesRes.count ?? 0

    // Repeat rate: clients with 2+ events in current period
    const clientEventMap = new Map<string, number>()
    for (const e of currentEvents) {
      if (e.client_id) {
        clientEventMap.set(e.client_id, (clientEventMap.get(e.client_id) ?? 0) + 1)
      }
    }
    const repeatClients = Array.from(clientEventMap.values()).filter((c) => c > 1).length
    const clientsWithEvents = clientEventMap.size

    const clients: ClientPipelineSnapshot = {
      active: totalClients,
      newThisPeriod: newClients,
      atRisk: atRiskClients.length,
      pipeline,
      repeatRate: pct(repeatClients, clientsWithEvents),
    }

    // ── Events ──────────────────────────────────────────────────────────
    const completed = currentEvents.filter((e: any) => e.status === 'completed').length
    const upcoming = currentEvents.filter(
      (e: any) => e.status !== 'completed' && new Date(e.event_date) >= new Date()
    ).length
    const cancelledCount = cancelledRes.count ?? 0
    const totalWithCancelled = currentEvents.length + cancelledCount
    const avgGuests =
      currentEvents.length > 0
        ? Math.round(
            currentEvents.reduce((s: number, e: any) => s + (e.guest_count ?? 0), 0) /
              currentEvents.length
          )
        : 0

    const events: EventLoadSnapshot = {
      upcoming,
      completedThisPeriod: completed,
      cancelledThisPeriod: cancelledCount,
      cancelRate: pct(cancelledCount, totalWithCancelled),
      avgGuestCount: avgGuests,
    }

    // ── Costs ───────────────────────────────────────────────────────────
    const ledgerEntries: any[] = ledgerRes.data ?? []
    const prevLedger: any[] = prevLedgerRes.data ?? []

    const ingredientTotalCents = ledgerEntries.reduce(
      (sum: number, e: any) => sum + Math.abs(e.amount_cents ?? 0),
      0
    )
    const prevCostCents = prevLedger.reduce(
      (sum: number, e: any) => sum + Math.abs(e.amount_cents ?? 0),
      0
    )

    // Group costs by category
    const categoryMap = new Map<string, number>()
    for (const entry of ledgerEntries) {
      const cat = entry.category || 'Uncategorized'
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Math.abs(entry.amount_cents ?? 0))
    }
    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, totalCents]) => ({ name, totalCents }))

    const costs: CostSnapshot = {
      ingredientTotalCents,
      trend:
        ingredientTotalCents > prevCostCents * 1.1
          ? 'up'
          : ingredientTotalCents < prevCostCents * 0.9
            ? 'down'
            : 'flat',
      topCategories,
    }

    const snapshot: BusinessHealthSnapshot = {
      revenue,
      clients,
      events,
      costs,
      generatedAt: new Date().toISOString(),
      periodDays,
    }

    return { success: true, data: snapshot }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate snapshot',
    }
  }
}

// ── generateHealthNarrative ─────────────────────────────────────────────────

export async function generateHealthNarrative(): Promise<HealthActionResult<HealthNarrative>> {
  try {
    const snapshotResult = await getBusinessHealthSnapshot()
    if (!snapshotResult.success || !snapshotResult.data) {
      return { success: false, error: snapshotResult.error ?? 'Snapshot failed' }
    }

    const snapshot = snapshotResult.data

    // Build sections from real data
    const sections = buildNarrativeSections(snapshot)

    // Calculate confidence based on data availability
    const confidence = calculateConfidence(snapshot)

    // Try Ollama for natural language narrative; fall back to template
    let generatedText: string
    let source: 'ollama' | 'template'

    try {
      generatedText = await generateWithOllama(snapshot, sections)
      source = 'ollama'
    } catch {
      generatedText = generateTemplateNarrative(snapshot, sections)
      source = 'template'
    }

    // Persist snapshot to DB (best-effort, don't fail if table missing)
    await persistSnapshot(snapshot, generatedText).catch(() => {})

    const narrative: HealthNarrative = {
      snapshot,
      sections,
      generatedText,
      generatedAt: new Date().toISOString(),
      source,
      confidence,
    }

    return { success: true, data: narrative }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate narrative',
    }
  }
}

// ── getHealthTrends ─────────────────────────────────────────────────────────

export async function getHealthTrends(
  period: 'week' | 'month' | 'quarter' = 'month'
): Promise<HealthActionResult<HealthTrends>> {
  try {
    const user = await requireChef()
    const tenantId = user.entityId
    const db: any = createServerClient()

    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const lookbackDays = periodDays * 6 // 6 periods of history
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookbackDays)
    const dateStr = startDate.toISOString().split('T')[0]

    const [eventsRes, clientsRes] = await Promise.all([
      db
        .from('events')
        .select('event_date, amount_paid_cents, client_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at' as any, null)
        .gte('event_date', dateStr)
        .not('status', 'in', '("cancelled")'),
      db
        .from('clients')
        .select('id, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateStr),
    ])

    const events: any[] = eventsRes.data ?? []
    const clients: any[] = clientsRes.data ?? []

    // Build period buckets
    const points: TrendPoint[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const bucketEnd = new Date(now)
      bucketEnd.setDate(bucketEnd.getDate() - i * periodDays)
      const bucketStart = new Date(bucketEnd)
      bucketStart.setDate(bucketStart.getDate() - periodDays)

      const bStart = bucketStart.toISOString().split('T')[0]
      const bEnd = bucketEnd.toISOString().split('T')[0]

      const bucketEvents = events.filter((e: any) => e.event_date >= bStart && e.event_date < bEnd)
      const bucketClients = clients.filter(
        (c: any) => c.created_at?.split('T')[0] >= bStart && c.created_at?.split('T')[0] < bEnd
      )

      const label =
        period === 'week'
          ? `Wk ${6 - i}`
          : period === 'month'
            ? bucketStart.toLocaleDateString('en-US', { month: 'short' })
            : `Q${6 - i}`

      points.push({
        label,
        revenueCents: bucketEvents.reduce((s: number, e: any) => s + (e.amount_paid_cents ?? 0), 0),
        eventCount: bucketEvents.length,
        clientCount: bucketClients.length,
      })
    }

    return {
      success: true,
      data: { period, points, generatedAt: new Date().toISOString() },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch trends',
    }
  }
}

// ── getHealthAlerts ─────────────────────────────────────────────────────────

export async function getHealthAlerts(): Promise<HealthActionResult<HealthAlert[]>> {
  try {
    const snapshotResult = await getBusinessHealthSnapshot()
    if (!snapshotResult.success || !snapshotResult.data) {
      return { success: false, error: snapshotResult.error }
    }

    const s = snapshotResult.data
    const alerts: HealthAlert[] = []
    let alertId = 0

    // High cancel rate
    if (s.events.cancelRate > 20) {
      alerts.push({
        id: String(++alertId),
        severity: s.events.cancelRate > 40 ? 'critical' : 'warning',
        title: 'Elevated cancellation rate',
        detail: `${s.events.cancelRate}% of events cancelled this period`,
        metric: 'Cancel Rate',
        threshold: '< 20%',
        currentValue: `${s.events.cancelRate}%`,
      })
    }

    // Revenue decline
    if (s.revenue.trend === 'down' && s.revenue.comparisonCents !== null) {
      const dropPct =
        s.revenue.comparisonCents > 0
          ? Math.round(
              ((s.revenue.comparisonCents - s.revenue.totalCents) / s.revenue.comparisonCents) * 100
            )
          : 0
      alerts.push({
        id: String(++alertId),
        severity: dropPct > 30 ? 'critical' : 'warning',
        title: 'Revenue trending down',
        detail: `${dropPct}% decrease compared to previous period`,
        metric: 'Revenue Trend',
        threshold: 'Stable or growing',
        currentValue: `${dropPct}% decline`,
      })
    }

    // At-risk clients
    if (s.clients.atRisk > 0) {
      alerts.push({
        id: String(++alertId),
        severity: s.clients.atRisk > 5 ? 'warning' : 'info',
        title: `${s.clients.atRisk} client${s.clients.atRisk > 1 ? 's' : ''} at risk`,
        detail: 'No events booked in an extended period',
        metric: 'At-Risk Clients',
        threshold: '0',
        currentValue: String(s.clients.atRisk),
      })
    }

    // Cost spike
    if (s.costs.trend === 'up') {
      alerts.push({
        id: String(++alertId),
        severity: 'warning',
        title: 'Ingredient costs rising',
        detail: `Costs trending up compared to previous period`,
        metric: 'Cost Trend',
        threshold: 'Stable or decreasing',
        currentValue: centsToDisplay(s.costs.ingredientTotalCents),
      })
    }

    // Empty pipeline
    if (s.clients.pipeline === 0 && s.events.upcoming === 0) {
      alerts.push({
        id: String(++alertId),
        severity: 'critical',
        title: 'Empty pipeline',
        detail: 'No open inquiries and no upcoming events',
        metric: 'Pipeline',
        threshold: '> 0',
        currentValue: '0 inquiries, 0 upcoming',
      })
    }

    // Sort: critical first
    const order = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => order[a.severity] - order[b.severity])

    return { success: true, data: alerts }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate alerts',
    }
  }
}

// ── refreshHealthCache ──────────────────────────────────────────────────────

export async function refreshHealthCache(): Promise<HealthActionResult<{ refreshedAt: string }>> {
  try {
    const result = await generateHealthNarrative()
    if (!result.success) {
      return { success: false, error: result.error }
    }
    return { success: true, data: { refreshedAt: new Date().toISOString() } }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to refresh cache',
    }
  }
}

// ── Ollama narrative generation ─────────────────────────────────────────────

async function generateWithOllama(
  snapshot: BusinessHealthSnapshot,
  sections: NarrativeSection[]
): Promise<string> {
  // Dynamic import to avoid pulling provider code into every bundle
  const { getDefaultAIProvider } = await import('@/lib/ai/provider-registry')
  const provider = getDefaultAIProvider()

  // Check health first; throw to trigger template fallback
  const health = await provider.checkHealth()
  if (!health.healthy) {
    throw new Error('Ollama unavailable')
  }

  const systemPrompt = [
    'You are a business analyst for a private chef. Write a concise (3-5 paragraph) narrative summary of their business health.',
    'Use plain, direct language. No jargon. No bullet points. Address the chef as "you".',
    'Reference specific numbers from the data provided. Never invent or estimate numbers not in the data.',
    'If a metric looks concerning, say so directly. If things are going well, acknowledge it briefly.',
    'Keep the total under 300 words.',
  ].join(' ')

  const dataPrompt = [
    `Business health snapshot for the last ${snapshot.periodDays} days:`,
    '',
    `REVENUE: ${centsToDisplay(snapshot.revenue.totalCents)} from ${snapshot.revenue.eventCount} events.`,
    snapshot.revenue.comparisonCents !== null
      ? `Previous period: ${centsToDisplay(snapshot.revenue.comparisonCents)}. Trend: ${snapshot.revenue.trend}.`
      : '',
    snapshot.revenue.avgPerEventCents > 0
      ? `Average per event: ${centsToDisplay(snapshot.revenue.avgPerEventCents)}.`
      : '',
    '',
    `CLIENTS: ${snapshot.clients.active} total, ${snapshot.clients.newThisPeriod} new this period.`,
    `At risk: ${snapshot.clients.atRisk}. Pipeline: ${snapshot.clients.pipeline} open inquiries.`,
    snapshot.clients.repeatRate > 0 ? `Repeat rate: ${snapshot.clients.repeatRate}%.` : '',
    '',
    `EVENTS: ${snapshot.events.upcoming} upcoming, ${snapshot.events.completedThisPeriod} completed.`,
    `Cancelled: ${snapshot.events.cancelledThisPeriod} (${snapshot.events.cancelRate}% rate).`,
    snapshot.events.avgGuestCount > 0 ? `Average guests: ${snapshot.events.avgGuestCount}.` : '',
    '',
    `COSTS: ${centsToDisplay(snapshot.costs.ingredientTotalCents)} in expenses. Trend: ${snapshot.costs.trend}.`,
    snapshot.costs.topCategories.length > 0
      ? `Top categories: ${snapshot.costs.topCategories.map((c) => `${c.name} (${centsToDisplay(c.totalCents)})`).join(', ')}.`
      : '',
    '',
    'Write the narrative summary now.',
  ]
    .filter(Boolean)
    .join('\n')

  const response = await provider.generate(systemPrompt, dataPrompt, {
    maxTokens: 500,
    temperature: 0.3,
    timeoutMs: 45_000,
  })

  return response.text.trim()
}

// ── Template fallback narrative ─────────────────────────────────────────────

function generateTemplateNarrative(
  snapshot: BusinessHealthSnapshot,
  sections: NarrativeSection[]
): string {
  const parts: string[] = []

  // Revenue
  const rev = snapshot.revenue
  if (rev.eventCount > 0) {
    let revLine = `Over the last ${snapshot.periodDays} days, you generated ${centsToDisplay(rev.totalCents)} from ${rev.eventCount} event${rev.eventCount !== 1 ? 's' : ''}`
    if (rev.comparisonCents !== null && rev.comparisonCents > 0) {
      const delta = rev.totalCents - rev.comparisonCents
      const pctChange = Math.round((Math.abs(delta) / rev.comparisonCents) * 100)
      revLine +=
        delta > 0
          ? `, up ${pctChange}% from the previous period`
          : delta < 0
            ? `, down ${pctChange}% from the previous period`
            : ', consistent with the previous period'
    }
    parts.push(revLine + '.')
  } else {
    parts.push(`No events recorded in the last ${snapshot.periodDays} days.`)
  }

  // Clients
  const cl = snapshot.clients
  const clientParts: string[] = []
  if (cl.newThisPeriod > 0)
    clientParts.push(`${cl.newThisPeriod} new client${cl.newThisPeriod !== 1 ? 's' : ''}`)
  if (cl.atRisk > 0) clientParts.push(`${cl.atRisk} at risk of churning`)
  if (cl.pipeline > 0)
    clientParts.push(`${cl.pipeline} open inquir${cl.pipeline !== 1 ? 'ies' : 'y'} in the pipeline`)
  if (clientParts.length > 0) {
    parts.push(`Your client base stands at ${cl.active} total: ${clientParts.join(', ')}.`)
  }

  // Events
  const ev = snapshot.events
  if (ev.upcoming > 0 || ev.completedThisPeriod > 0) {
    let evLine = ''
    if (ev.completedThisPeriod > 0) {
      evLine += `${ev.completedThisPeriod} event${ev.completedThisPeriod !== 1 ? 's' : ''} completed`
    }
    if (ev.upcoming > 0) {
      evLine += evLine
        ? `, ${ev.upcoming} upcoming`
        : `${ev.upcoming} upcoming event${ev.upcoming !== 1 ? 's' : ''}`
    }
    if (ev.cancelRate > 10) {
      evLine += ` (${ev.cancelRate}% cancellation rate needs attention)`
    }
    parts.push(evLine + '.')
  }

  // Costs
  const co = snapshot.costs
  if (co.ingredientTotalCents > 0) {
    let costLine = `Ingredient costs: ${centsToDisplay(co.ingredientTotalCents)}`
    if (co.trend === 'up') costLine += ', trending higher than last period'
    else if (co.trend === 'down') costLine += ', trending lower than last period'
    parts.push(costLine + '.')
  }

  return parts.join(' ')
}

// ── Section builder ─────────────────────────────────────────────────────────

function buildNarrativeSections(snapshot: BusinessHealthSnapshot): NarrativeSection[] {
  const sections: NarrativeSection[] = []
  const rev = snapshot.revenue
  const cl = snapshot.clients
  const ev = snapshot.events
  const co = snapshot.costs

  // Revenue section
  const revSentiment: NarrativeSentiment =
    rev.trend === 'up' ? 'positive' : rev.trend === 'down' ? 'warning' : 'neutral'
  sections.push({
    title: 'Revenue Overview',
    content:
      rev.eventCount > 0
        ? `${centsToDisplay(rev.totalCents)} earned from ${rev.eventCount} events. ${rev.trend === 'up' ? 'Revenue is growing.' : rev.trend === 'down' ? 'Revenue has declined.' : 'Revenue is steady.'}`
        : 'No revenue recorded this period.',
    sentiment: rev.eventCount === 0 ? 'critical' : revSentiment,
    metrics: [
      { label: 'Total Revenue', value: centsToDisplay(rev.totalCents) },
      { label: 'Events', value: String(rev.eventCount) },
      { label: 'Avg per Event', value: centsToDisplay(rev.avgPerEventCents) },
      { label: 'Trend', value: rev.trend },
    ],
  })

  // Client Pipeline section
  const clSentiment: NarrativeSentiment =
    cl.atRisk > cl.active * 0.3 ? 'warning' : cl.newThisPeriod > 0 ? 'positive' : 'neutral'
  sections.push({
    title: 'Client Pipeline',
    content: `${cl.active} active clients with ${cl.pipeline} open inquiries. ${cl.atRisk > 0 ? `${cl.atRisk} at risk of churning.` : 'No clients at immediate risk.'}`,
    sentiment: clSentiment,
    metrics: [
      { label: 'Active Clients', value: String(cl.active) },
      { label: 'New This Period', value: String(cl.newThisPeriod) },
      { label: 'At Risk', value: String(cl.atRisk) },
      { label: 'Pipeline', value: `${cl.pipeline} inquiries` },
    ],
  })

  // Event Load section
  const evSentiment: NarrativeSentiment =
    ev.cancelRate > 30
      ? 'critical'
      : ev.cancelRate > 15
        ? 'warning'
        : ev.upcoming > 0
          ? 'positive'
          : 'neutral'
  sections.push({
    title: 'Event Load',
    content: `${ev.upcoming} upcoming, ${ev.completedThisPeriod} completed. ${ev.cancelRate > 0 ? `Cancellation rate: ${ev.cancelRate}%.` : 'No cancellations.'}`,
    sentiment: evSentiment,
    metrics: [
      { label: 'Upcoming', value: String(ev.upcoming) },
      { label: 'Completed', value: String(ev.completedThisPeriod) },
      { label: 'Cancel Rate', value: `${ev.cancelRate}%` },
      { label: 'Avg Guests', value: String(ev.avgGuestCount) },
    ],
  })

  // Cost Trends section
  const coSentiment: NarrativeSentiment =
    co.trend === 'up' ? 'warning' : co.trend === 'down' ? 'positive' : 'neutral'
  sections.push({
    title: 'Cost Trends',
    content:
      co.ingredientTotalCents > 0
        ? `${centsToDisplay(co.ingredientTotalCents)} in expenses. ${co.trend === 'up' ? 'Costs are rising.' : co.trend === 'down' ? 'Costs are decreasing.' : 'Costs are stable.'}`
        : 'No expense data recorded.',
    sentiment: co.ingredientTotalCents === 0 ? 'neutral' : coSentiment,
    metrics: [
      { label: 'Total Expenses', value: centsToDisplay(co.ingredientTotalCents) },
      { label: 'Trend', value: co.trend },
      ...(co.topCategories.length > 0
        ? [{ label: 'Top Category', value: co.topCategories[0].name }]
        : []),
    ],
  })

  return sections
}

// ── Confidence calculator ───────────────────────────────────────────────────

function calculateConfidence(snapshot: BusinessHealthSnapshot): number {
  let score = 0
  const checks = 6

  if (snapshot.revenue.eventCount > 0) score++
  if (snapshot.revenue.comparisonCents !== null && snapshot.revenue.comparisonCents > 0) score++
  if (snapshot.clients.active > 0) score++
  if (snapshot.events.completedThisPeriod > 0 || snapshot.events.upcoming > 0) score++
  if (snapshot.costs.ingredientTotalCents > 0) score++
  if (snapshot.clients.pipeline > 0) score++

  return Math.round((score / checks) * 100) / 100
}

// ── Persist snapshot to DB ──────────────────────────────────────────────────

async function persistSnapshot(
  snapshot: BusinessHealthSnapshot,
  narrativeText: string
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.entityId
  const db: any = createServerClient()

  await db.from('health_snapshots').insert({
    chef_id: tenantId,
    snapshot_data: snapshot,
    narrative_text: narrativeText,
    period: `${snapshot.periodDays}d`,
  })
}
