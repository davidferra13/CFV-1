// CIL Scanner Dispatch
// Wires scanner insights into the notification pipeline.
// Converts CILInsight[] to ProactiveSignal[], persists, dispatches notifications.
// Called from scanner-handler after each hourly scan.

import type { CILInsight } from './scanner'
import type { ProactiveSignal, SignalDomain } from './types'
import type { NotificationAction, NotificationCategory } from '@/lib/notifications/types'
import { persistSignals } from './api'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

// ── 24h Notification Dedup (matches comm-bridge pattern) ─────────────────────

const DEDUP_TTL_MS = 24 * 60 * 60 * 1000
const dispatchDedup = new Map<string, number>()

function shouldNotify(key: string): boolean {
  const now = Date.now()
  for (const [k, ts] of dispatchDedup) {
    if (now - ts > DEDUP_TTL_MS) dispatchDedup.delete(k)
  }
  const last = dispatchDedup.get(key)
  return !last || now - last > DEDUP_TTL_MS
}

function markNotified(key: string): void {
  dispatchDedup.set(key, Date.now())
}

// ── Insight to ProactiveSignal Conversion ────────────────────────────────────

const DOMAIN_MAP: Record<CILInsight['type'], SignalDomain> = {
  opportunity: 'clients',
  drift: 'clients',
  gap: 'clients',
  anomaly: 'clients',
  milestone: 'clients',
}

const URGENCY_MAP: Record<CILInsight['severity'], 1 | 2 | 3 | 4 | 5> = {
  high: 4,
  medium: 3,
  low: 1,
}

const SUGGESTED_ACTIONS: Record<string, string> = {
  'scanner.dormantClient': 'Consider reaching out to re-engage this dormant client.',
  'scanner.weakRelation':
    'This relationship is weakening. Schedule a check-in or send a personal note.',
  'scanner.highVelocity': 'Unusual activity spike detected. Review recent interactions.',
  'scanner.paymentGap': 'Client has bookings but no recorded payments. Verify payment status.',
  'scanner.isolated': 'Entity has no connections. May need data enrichment.',
  'scanner.milestone': 'Interaction milestone reached. CIL confidence growing.',
}

function resolveSource(insight: CILInsight): string {
  if (insight.type === 'opportunity') return 'scanner.dormantClient'
  if (insight.type === 'drift') return 'scanner.weakRelation'
  if (insight.type === 'anomaly') return 'scanner.highVelocity'
  if (insight.type === 'milestone') return 'scanner.milestone'
  if (insight.type === 'gap' && insight.title.toLowerCase().includes('payment'))
    return 'scanner.paymentGap'
  return 'scanner.isolated'
}

function resolveDomain(insight: CILInsight): SignalDomain {
  if (insight.type === 'gap' && insight.title.toLowerCase().includes('payment')) return 'finance'
  return DOMAIN_MAP[insight.type] || 'clients'
}

export function insightsToSignals(insights: CILInsight[]): ProactiveSignal[] {
  return insights
    .filter((i) => i.severity !== 'low')
    .map((insight) => {
      const source = resolveSource(insight)
      return {
        id: `scan_${insight.type}_${insight.entityIds[0] || Date.now()}`,
        domain: resolveDomain(insight),
        urgency: URGENCY_MAP[insight.severity],
        confidence: insight.severity === 'high' ? 0.85 : 0.65,
        title: insight.title,
        detail: insight.detail,
        suggestedAction: SUGGESTED_ACTIONS[source] || 'Review this insight.',
        actionType:
          insight.type === 'opportunity' || insight.type === 'drift'
            ? ('navigate' as const)
            : ('dismiss' as const),
        actionPayload: { insightType: insight.type },
        entityIds: insight.entityIds,
        source,
        createdAt: Date.now(),
      }
    })
}

// ── Notification Mapping ─────────────────────────────────────────────────────

function resolveAction(source: string): NotificationAction {
  switch (source) {
    case 'scanner.dormantClient':
    case 'scanner.weakRelation':
      return 'relationship_cooling'
    case 'scanner.paymentGap':
      return 'payment_overdue'
    default:
      return 'system_alert'
  }
}

function resolveCategory(source: string): NotificationCategory {
  switch (source) {
    case 'scanner.dormantClient':
    case 'scanner.weakRelation':
      return 'client'
    case 'scanner.paymentGap':
      return 'payment'
    default:
      return 'ops'
  }
}

function resolveActionUrl(signal: ProactiveSignal): string {
  const entityId = signal.entityIds[0] || ''
  const clientId = entityId.startsWith('client_') ? entityId.replace('client_', '') : null

  switch (signal.source) {
    case 'scanner.dormantClient':
    case 'scanner.weakRelation':
      return clientId ? `/clients/${clientId}` : '/clients'
    case 'scanner.paymentGap':
      return clientId ? `/clients/${clientId}?tab=billing` : '/analytics/finance'
    default:
      return '/intelligence'
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function dispatchScannerInsights(
  tenantId: string,
  insights: CILInsight[]
): Promise<{ persisted: number; notified: number }> {
  const signals = insightsToSignals(insights)
  if (signals.length === 0) return { persisted: 0, notified: 0 }

  await persistSignals(tenantId, signals)

  let notified = 0
  const notifiable = signals.filter((s) => s.urgency >= 3)

  if (notifiable.length === 0) return { persisted: signals.length, notified: 0 }

  try {
    const { createNotification } = await import('@/lib/notifications/actions')

    for (const signal of notifiable) {
      const dedupKey = `scanner:${tenantId}:${signal.source}:${signal.entityIds[0] || signal.id}`
      if (!shouldNotify(dedupKey)) continue

      await createNotification({
        tenantId,
        recipientId: tenantId,
        category: resolveCategory(signal.source),
        action: resolveAction(signal.source),
        title: signal.title,
        body: signal.suggestedAction,
        actionUrl: resolveActionUrl(signal),
        clientId: signal.entityIds[0]?.startsWith('client_')
          ? signal.entityIds[0].replace('client_', '')
          : undefined,
        metadata: { origin: 'cil', scannerInsight: true, insightSource: signal.source },
      })

      markNotified(dedupKey)
      notified++
    }
  } catch (err) {
    recordSideEffectFailure({
      source: 'cil',
      operation: 'scanner-dispatch-notifications',
      errorMessage: err instanceof Error ? err.message : String(err),
      severity: 'low',
    })
  }

  return { persisted: signals.length, notified }
}
