// CIL Proactive Analyzer: Commitment
// Detects patterns in readiness gate overrides, menu unlocks, and self-binding violations

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function analyzeCommitment(tenantId: string): Promise<ProactiveSignal[]> {
  try {
    const client = createServerClient()
    const signals: ProactiveSignal[] = []
    const now = Date.now()

    await analyzeGateOverrideFrequency(client, tenantId, signals, now)
    await analyzeTimePressureOverrides(client, tenantId, signals, now)
    await analyzeClientCorrelatedOverrides(client, tenantId, signals, now)
    await analyzeConfidenceErosion(client, tenantId, signals, now)
    await analyzeMenuUnlockPattern(client, tenantId, signals, now)

    return signals
  } catch (err) {
    console.error(
      '[CIL/commitment] analyzer failed (non-fatal)',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

// ── Pattern 1: Frequent Gate Override ───────────────────────────────────────

const GATE_LABELS: Record<string, string> = {
  prep_timeline: 'Prep Timeline',
  dietary_constraints: 'Dietary Constraints',
  arrival_logistics: 'Arrival Logistics',
  service_plan_flow: 'Service Plan',
  packing_list: 'Packing List',
}

async function analyzeGateOverrideFrequency(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('event_readiness_gates' as any)
    .select('gate, override_reason, resolved_at, event_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .gte('resolved_at', ninetyDaysAgo.toISOString())

  if (!overrides || overrides.length === 0) return

  const byGate = new Map<string, Array<{ reason: string; eventId: string }>>()
  for (const row of overrides) {
    const list = byGate.get(row.gate) || []
    list.push({ reason: row.override_reason || '', eventId: row.event_id })
    byGate.set(row.gate, list)
  }

  for (const [gate, entries] of byGate) {
    if (entries.length < 3) continue

    const reasons = entries.map((e) => e.reason).filter(Boolean)
    const reasonCounts = new Map<string, number>()
    for (const r of reasons) {
      const normalized = r.toLowerCase().trim()
      reasonCounts.set(normalized, (reasonCounts.get(normalized) || 0) + 1)
    }
    const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'various'

    const label = GATE_LABELS[gate] || gate
    signals.push({
      id: generateId(),
      domain: 'commitment',
      urgency: 3,
      confidence: 0.8,
      title: `${label} overridden ${entries.length} times`,
      detail: `You've overridden the ${label} readiness gate ${entries.length} times in the last 90 days. Most common reason: "${topReason}".`,
      suggestedAction: 'Review whether this gate needs adjustment or if prep habits should change',
      actionType: 'dismiss',
      entityIds: entries.map((e) => e.eventId),
      source: 'commitment.gateFrequency',
      createdAt: now,
    })
  }
}

// ── Pattern 2: Time-Pressure Override Clustering ────────────────────────────

async function analyzeTimePressureOverrides(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('event_readiness_gates' as any)
    .select('event_id, resolved_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .gte('resolved_at', ninetyDaysAgo.toISOString())

  if (!overrides || overrides.length === 0) return

  const eventIds = [...new Set(overrides.map((o: any) => o.event_id))]
  if (eventIds.length === 0) return

  const { data: events } = await client.from('events').select('id, event_date').in('id', eventIds)

  if (!events) return

  const eventDateMap = new Map<string, string>()
  for (const e of events) {
    if (e.event_date) eventDateMap.set(e.id, e.event_date)
  }

  let timePressureCount = 0
  const timePressureEventIds: string[] = []

  for (const override of overrides) {
    const eventDate = eventDateMap.get(override.event_id)
    if (!eventDate || !override.resolved_at) continue

    const eventMs = new Date(eventDate).getTime()
    const overrideMs = new Date(override.resolved_at).getTime()
    const daysBeforeEvent = (eventMs - overrideMs) / (24 * 60 * 60 * 1000)

    if (daysBeforeEvent >= 0 && daysBeforeEvent < 3) {
      timePressureCount++
      timePressureEventIds.push(override.event_id)
    }
  }

  if (timePressureCount >= 2) {
    signals.push({
      id: generateId(),
      domain: 'commitment',
      urgency: 4,
      confidence: 0.85,
      title: `${timePressureCount} overrides under time pressure`,
      detail: `${timePressureCount} readiness overrides happened within 48 hours of the event. Time-pressure overrides carry higher risk of missed preparation steps.`,
      suggestedAction: 'Consider setting earlier prep deadlines or finalizing events sooner',
      actionType: 'navigate',
      actionPayload: { path: '/calendar' },
      entityIds: [...new Set(timePressureEventIds)],
      source: 'commitment.timePressure',
      createdAt: now,
    })
  }
}

// ── Pattern 3: Client-Correlated Overrides ──────────────────────────────────

async function analyzeClientCorrelatedOverrides(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const { data: overrides } = await client
    .from('event_readiness_gates' as any)
    .select('event_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')

  if (!overrides || overrides.length === 0) return

  const eventIds = [...new Set(overrides.map((o: any) => o.event_id))]
  if (eventIds.length === 0) return

  const { data: events } = await client.from('events').select('id, client_id').in('id', eventIds)

  if (!events) return

  const overrideCountByEvent = new Map<string, number>()
  for (const o of overrides) {
    overrideCountByEvent.set(o.event_id, (overrideCountByEvent.get(o.event_id) || 0) + 1)
  }

  const clientOverrides = new Map<string, { count: number; eventIds: string[] }>()
  for (const event of events) {
    if (!event.client_id) continue
    const existing = clientOverrides.get(event.client_id) || { count: 0, eventIds: [] }
    existing.count += overrideCountByEvent.get(event.id) || 0
    existing.eventIds.push(event.id)
    clientOverrides.set(event.client_id, existing)
  }

  for (const [clientId, data] of clientOverrides) {
    if (data.count < 3) continue

    const { data: clientRow } = await client
      .from('clients')
      .select('display_name')
      .eq('id', clientId)
      .single()

    const clientName = clientRow?.display_name || 'a client'

    signals.push({
      id: generateId(),
      domain: 'commitment',
      urgency: 2,
      confidence: 0.7,
      title: `${data.count} overrides linked to ${clientName}`,
      detail: `Events for ${clientName} have accumulated ${data.count} readiness overrides across ${data.eventIds.length} events. This client's events may need different preparation standards.`,
      suggestedAction: "Review this client's event patterns",
      actionType: 'navigate',
      actionPayload: { path: `/clients/${clientId}` },
      entityIds: [clientId, ...data.eventIds],
      source: 'commitment.clientCorrelation',
      createdAt: now,
    })
  }
}

// ── Pattern 4: Confidence Erosion ───────────────────────────────────────────

async function analyzeConfidenceErosion(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('event_readiness_gates' as any)
    .select('metadata, event_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .gte('resolved_at', ninetyDaysAgo.toISOString())

  if (!overrides || overrides.length < 3) return

  const confidences: number[] = []
  const eventIds: string[] = []

  for (const row of overrides) {
    const meta = row.metadata as Record<string, unknown> | null
    if (meta && typeof meta.confidence === 'number') {
      confidences.push(meta.confidence)
      eventIds.push(row.event_id)
    }
  }

  if (confidences.length < 3) return

  const avg = confidences.reduce((s, c) => s + c, 0) / confidences.length

  if (avg < 0.5) {
    const avgPercent = Math.round(avg * 100)
    signals.push({
      id: generateId(),
      domain: 'commitment',
      urgency: 3,
      confidence: 0.75,
      title: `Low confidence at override (${avgPercent}% avg)`,
      detail: `Your average readiness confidence when overriding gates is ${avgPercent}%. Overriding at low confidence means more preparation gaps slip through.`,
      suggestedAction: 'Consider addressing blockers instead of overriding when confidence is low',
      actionType: 'dismiss',
      entityIds: [...new Set(eventIds)],
      source: 'commitment.confidenceErosion',
      createdAt: now,
    })
  }
}

// ── Pattern 5: Menu Unlock Pattern ──────────────────────────────────────────

async function analyzeMenuUnlockPattern(
  client: ReturnType<typeof createServerClient>,
  tenantId: string,
  signals: ProactiveSignal[],
  now: number
): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data: unlocks } = await client
    .from('menu_state_transitions' as any)
    .select('event_id, transitioned_at, reason')
    .eq('tenant_id', tenantId)
    .eq('from_status', 'locked')
    .eq('to_status', 'draft')
    .gte('transitioned_at', thirtyDaysAgo.toISOString())

  if (!unlocks || unlocks.length < 2) return

  signals.push({
    id: generateId(),
    domain: 'commitment',
    urgency: 2,
    confidence: 0.7,
    title: `${unlocks.length} menus unlocked this month`,
    detail: `You've unlocked ${unlocks.length} finalized menus in the last 30 days. Frequent unlocks suggest menus are being finalized before they're truly ready.`,
    suggestedAction:
      'Consider finalizing menus later in the planning process, or use draft sharing',
    actionType: 'dismiss',
    entityIds: unlocks.map((u: any) => u.event_id).filter(Boolean),
    source: 'commitment.menuUnlocks',
    createdAt: now,
  })
}
