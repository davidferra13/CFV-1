// CIL Proactive Analyzer: Client Health
// Detects dormant clients, at-risk clients, VIP activity, and churn risk signals.
// Churn-prevention-triggers integration: maps 6 trigger types to CIL signals
// so the dispatch layer can schedule differentiated re-engagement outreach.

import { createServerClient } from '@/lib/db/server'
import { computeRebookingPredictions } from '@/lib/intelligence/rebooking-predictions'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeClients(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    // 1. Dormant clients: no event in 90+ days but had events before
    await analyzeDormantClients(client, tenantId, signals, now)

    // 2. At-risk clients: cancelled last event or declining frequency
    await analyzeAtRiskClients(client, tenantId, signals, now)

    // 3. VIP activity: top 20% by revenue with recent activity
    await analyzeVIPActivity(client, tenantId, signals, now)

    // 4. Rebooking predictions: flag clients likely to rebook soon
    await analyzeRebookingOutreach(tenantId, signals, now)

    // 5. Churn prevention triggers: rich multi-factor risk signals
    await analyzeChurnPreventionTriggers(tenantId, signals, now)

    // 6. Spending decline: per-client revenue drop over 90-day windows
    await analyzeSpendingDecline(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/clients] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

async function analyzeDormantClients(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Get all clients for tenant
  const { data: clients } = await client
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)

  if (!clients || clients.length === 0) return

  for (const c of clients) {
    // Get their most recent event
    const { data: recentEvents } = await client
      .from('events')
      .select('id, event_date, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', c.id)
      .order('event_date', { ascending: false })
      .limit(1)

    if (!recentEvents || recentEvents.length === 0) continue

    const lastEvent = recentEvents[0]
    const lastDate = new Date(lastEvent.event_date)

    // Only flag if they had events before but none recently
    if (lastDate < ninetyDaysAgo && lastEvent.status !== 'cancelled') {
      const daysSince = Math.round((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
      signals.push({
        id: generateId(),
        domain: 'clients',
        urgency: 3,
        confidence: 0.75,
        title: `Dormant client: ${c.full_name}`,
        detail: `No events in ${daysSince} days. Last event was on ${lastEvent.event_date}.`,
        suggestedAction: 'Send a check-in or seasonal menu update',
        actionType: 'navigate',
        actionPayload: { path: `/clients/${c.id}` },
        entityIds: [c.id],
        source: 'clients.dormant',
        createdAt: now,
      })
    }
  }
}

async function analyzeAtRiskClients(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  // Find clients whose last event was cancelled
  const { data: clients } = await client
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)

  if (!clients || clients.length === 0) return

  for (const c of clients) {
    const { data: recentEvents } = await client
      .from('events')
      .select('id, status, event_date')
      .eq('tenant_id', tenantId)
      .eq('client_id', c.id)
      .order('event_date', { ascending: false })
      .limit(2)

    if (!recentEvents || recentEvents.length === 0) continue

    // If most recent event was cancelled
    if (recentEvents[0].status === 'cancelled') {
      signals.push({
        id: generateId(),
        domain: 'clients',
        urgency: 4,
        confidence: 0.7,
        title: `At-risk: ${c.full_name}`,
        detail: `Their most recent event was cancelled. Proactive outreach may prevent churn.`,
        suggestedAction: 'Reach out with a personalized message or offer',
        actionType: 'navigate',
        actionPayload: { path: `/clients/${c.id}` },
        entityIds: [c.id, recentEvents[0].id],
        source: 'clients.atRisk',
        createdAt: now,
      })
    }
  }
}

async function analyzeVIPActivity(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  // Get revenue per client from ledger
  const { data: allPayments } = await client
    .from('ledger_entries')
    .select('client_id, amount_cents')
    .eq('tenant_id', tenantId)
    .eq('is_refund', false)

  if (!allPayments || allPayments.length === 0) return

  // Aggregate by client
  const revenueByClient = new Map<string, number>()
  for (const p of allPayments) {
    const current = revenueByClient.get(p.client_id) || 0
    revenueByClient.set(p.client_id, current + p.amount_cents)
  }

  // Top 20% threshold
  const revenues = Array.from(revenueByClient.values()).sort((a, b) => b - a)
  const topIdx = Math.max(1, Math.floor(revenues.length * 0.2))
  const vipThreshold = revenues[topIdx - 1] || 0

  if (vipThreshold <= 0) return

  // Check if VIPs have upcoming events
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const today = new Date().toISOString().slice(0, 10)

  for (const [clientId, revenue] of revenueByClient) {
    if (revenue < vipThreshold) continue

    const { data: upcomingEvents } = await client
      .from('events')
      .select('id, event_date, occasion')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .gte('event_date', today)
      .lte('event_date', thirtyDaysFromNow.toISOString().slice(0, 10))
      .limit(1)

    if (upcomingEvents && upcomingEvents.length > 0) {
      const evt = upcomingEvents[0]
      // Get client name
      const { data: clientData } = await client
        .from('clients')
        .select('full_name')
        .eq('id', clientId)
        .limit(1)

      const clientName = clientData?.[0]?.full_name || 'VIP Client'

      signals.push({
        id: generateId(),
        domain: 'clients',
        urgency: 2,
        confidence: 0.9,
        title: `VIP upcoming: ${clientName}`,
        detail: `Top client ($${(revenue / 100).toFixed(0)} lifetime) has "${evt.occasion || 'event'}" on ${evt.event_date}. Ensure premium experience.`,
        suggestedAction: 'Review event details and add personal touches',
        actionType: 'navigate',
        actionPayload: { path: `/events/${evt.id}` },
        entityIds: [clientId, evt.id],
        source: 'clients.vipActivity',
        createdAt: now,
      })
    }
  }
}

// ── 4. Rebooking Predictions (one-way feed from intelligence layer) ──────────

async function analyzeRebookingOutreach(
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const insights = await computeRebookingPredictions(tenantId)
  if (!insights) return

  // Surface upcoming rebookers as outreach opportunities
  for (const pred of insights.upcomingRebookers) {
    if (pred.likelihood === 'unlikely') continue

    const daysUntil = pred.predictedNextBookingDate
      ? Math.round(
          (new Date(pred.predictedNextBookingDate).getTime() - now) / (24 * 60 * 60 * 1000)
        )
      : null

    const timing =
      daysUntil !== null && daysUntil > 0
        ? `predicted to rebook in ~${daysUntil} days`
        : 'predicted rebooking window is now'

    signals.push({
      id: generateId(),
      domain: 'clients',
      urgency: daysUntil !== null && daysUntil <= 7 ? 4 : 3,
      confidence: pred.rebookingScore / 100,
      title: `Rebooking opportunity: ${pred.clientName}`,
      detail: `${pred.clientName} is ${pred.likelihood} to rebook (score ${pred.rebookingScore}/100). ${timing}. ${pred.totalEvents} past events, avg ${pred.avgDaysBetweenEvents} days between bookings.`,
      suggestedAction: 'Reach out with availability or seasonal menu',
      actionType: 'navigate',
      actionPayload: { path: `/clients/${pred.clientId}` },
      entityIds: [pred.clientId],
      source: 'clients.rebookingPrediction',
      createdAt: now,
    })
  }

  // Surface overdue rebookers (past their typical interval)
  for (const pred of insights.overdueRebookers) {
    // Skip if already surfaced as upcoming
    if (insights.upcomingRebookers.some((u) => u.clientId === pred.clientId)) continue

    const overdueDays = pred.daysSinceLastEvent - pred.avgDaysBetweenEvents

    signals.push({
      id: generateId(),
      domain: 'clients',
      urgency: overdueDays > 30 ? 4 : 3,
      confidence: pred.rebookingScore / 100,
      title: `Overdue rebooker: ${pred.clientName}`,
      detail: `${pred.clientName} typically books every ${pred.avgDaysBetweenEvents} days but it has been ${pred.daysSinceLastEvent} days (~${overdueDays} days overdue). Consider reaching out.`,
      suggestedAction: 'Send a personalized check-in or menu preview',
      actionType: 'navigate',
      actionPayload: { path: `/clients/${pred.clientId}` },
      entityIds: [pred.clientId],
      source: 'clients.rebookingOverdue',
      createdAt: now,
    })
  }
}

// ── 5. Churn Prevention Triggers (rich multi-factor risk signals) ───────────

/**
 * Maps churn-prevention-triggers output into CIL ProactiveSignals.
 * Each trigger type gets a distinct source so signal-actions can schedule
 * differentiated re-engagement outreach (declining spend vs. rejected quote
 * vs. long silence all warrant different messaging).
 *
 * Dedup with existing analyzers: only emits signals for clients NOT already
 * surfaced by the simpler dormant/atRisk checks above. The churn module
 * catches nuanced patterns (declining frequency, rejected quotes, stale
 * inquiries) that the basic checks miss.
 */
async function analyzeSpendingDecline(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const currentStart = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const previousStart = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const currentEnd = new Date(now).toISOString().slice(0, 10)

  const { data: recentEvents } = await client
    .from('events')
    .select('client_id, quoted_price_cents, event_date')
    .eq('tenant_id', tenantId)
    .gte('event_date', previousStart)
    .lte('event_date', currentEnd)
    .not('quoted_price_cents', 'is', null)
    .neq('status', 'cancelled')

  if (!recentEvents || recentEvents.length === 0) return

  const currentCents = new Map<string, number>()
  const previousCents = new Map<string, number>()

  for (const evt of recentEvents) {
    const cents = evt.quoted_price_cents as number
    if (evt.event_date >= currentStart) {
      currentCents.set(evt.client_id, (currentCents.get(evt.client_id) || 0) + cents)
    } else {
      previousCents.set(evt.client_id, (previousCents.get(evt.client_id) || 0) + cents)
    }
  }

  const clientIds = new Set([...previousCents.keys()])

  const decliningClients: Array<{
    clientId: string
    current: number
    previous: number
    pct: number
  }> = []

  for (const clientId of clientIds) {
    const prev = previousCents.get(clientId) || 0
    const curr = currentCents.get(clientId) || 0
    if (prev <= 0) continue
    const decline = (prev - curr) / prev
    if (decline > 0.4) {
      decliningClients.push({
        clientId,
        current: curr,
        previous: prev,
        pct: Math.round(decline * 100),
      })
    }
  }

  if (decliningClients.length === 0) return

  const clientIdList = decliningClients.map((d) => d.clientId)
  const { data: clientNames } = await client
    .from('clients')
    .select('id, full_name')
    .in('id', clientIdList)

  const nameMap = new Map(
    (clientNames || []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])
  )

  for (const d of decliningClients) {
    const name = nameMap.get(d.clientId) || 'Client'
    signals.push({
      id: generateId(),
      domain: 'clients',
      urgency: 3,
      confidence: 0.7,
      title: `Spending decline: ${name}`,
      detail: `Revenue dropped ${d.pct}% (from $${(d.previous / 100).toFixed(0)} to $${(d.current / 100).toFixed(0)}) comparing last 90 days to prior 90 days.`,
      suggestedAction: 'Consider a personalized outreach or value package',
      actionType: 'navigate',
      actionPayload: {
        path: `/clients/${d.clientId}`,
        currentPeriodCents: d.current,
        previousPeriodCents: d.previous,
        declinePercent: d.pct,
      },
      entityIds: [d.clientId],
      source: 'clients.spendingDecline',
      createdAt: now,
    })
  }
}

async function analyzeChurnPreventionTriggers(
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  try {
    const { getChurnPreventionTriggersForTenant } =
      await import('@/lib/intelligence/churn-prevention-triggers-internal')
    const result = await getChurnPreventionTriggersForTenant(tenantId)
    if (!result || result.atRiskClients.length === 0) return

    // Collect client IDs already surfaced by dormant/atRisk/rebooking analyzers
    const alreadySurfaced = new Set(
      signals
        .filter(
          (s) =>
            s.source === 'clients.dormant' ||
            s.source === 'clients.atRisk' ||
            s.source === 'clients.rebookingOverdue'
        )
        .flatMap((s) => s.entityIds)
    )

    for (const client of result.atRiskClients) {
      // Skip if this client was already surfaced by a simpler analyzer
      if (alreadySurfaced.has(client.clientId)) continue

      // Pick the most severe trigger to determine signal source and messaging
      const primaryTrigger = client.triggers[0] // sorted by severity in the module
      if (!primaryTrigger) continue

      const sourceMap: Record<string, string> = {
        overdue: 'clients.churnOverdue',
        declining_frequency: 'clients.churnDecliningFrequency',
        declining_spend: 'clients.churnDecliningSpend',
        rejected_quote: 'clients.churnRejectedQuote',
        no_response: 'clients.churnNoResponse',
        long_silence: 'clients.churnLongSilence',
      }

      const actionMap: Record<string, string> = {
        overdue: 'Check in about upcoming plans or share seasonal availability',
        declining_frequency: 'Send a personalized update or new menu concept',
        declining_spend: 'Offer a tailored experience or value package',
        rejected_quote: 'Follow up with adjusted pricing or alternative menu options',
        no_response: 'Send a brief check-in or clear stale inquiries',
        long_silence: 'Reconnect with a seasonal menu highlight or personal note',
      }

      const urgency: 1 | 2 | 3 | 4 | 5 =
        client.riskLevel === 'critical'
          ? 5
          : client.riskLevel === 'high'
            ? 4
            : client.riskLevel === 'moderate'
              ? 3
              : 2

      const triggerSummary = client.triggers.map((t) => t.description).join('; ')

      signals.push({
        id: generateId(),
        domain: 'clients',
        urgency,
        confidence: Math.min(0.95, client.riskScore / 100),
        title: `Churn risk: ${client.clientName}`,
        detail: `Risk score ${client.riskScore}/100 (${client.riskLevel}). ${triggerSummary}`,
        suggestedAction: actionMap[primaryTrigger.type] || client.suggestedAction,
        actionType: 'navigate',
        actionPayload: {
          path: `/clients/${client.clientId}`,
          churnRiskLevel: client.riskLevel,
          churnTriggerType: primaryTrigger.type,
          daysSinceLastEvent: client.daysSinceLastEvent,
          totalRevenueCents: client.totalRevenueCents,
        },
        entityIds: [client.clientId],
        source: sourceMap[primaryTrigger.type] || 'clients.churnGeneric',
        createdAt: now,
      })
    }
  } catch (err) {
    console.error(
      '[CIL/clients] churn-prevention-triggers analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
  }
}
