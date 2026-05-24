import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'

const URGENCY_TO_TIER: Record<number, RailTier> = {
  5: 'p0',
  4: 'p1',
  3: 'p2',
  2: 'p3',
  1: 'p4',
}

const DOMAIN_ICONS: Record<SignalDomain, string> = {
  calendar: 'calendar',
  clients: 'users',
  finance: 'dollar-sign',
  inventory: 'package',
  pipeline: 'trending-up',
  reputation: 'star',
  cannabis: 'leaf',
  commitment: 'shield-check',
  event_debrief: 'clipboard-check',
  network: 'network',
}

function signalToItem(signal: ProactiveSignal): GodModeResolvedItem {
  const href =
    signal.actionType === 'navigate' && signal.actionPayload?.href
      ? String(signal.actionPayload.href)
      : '/dashboard/intelligence'

  return {
    definitionId: `cil-signal-${signal.id}`,
    tier: URGENCY_TO_TIER[signal.urgency] ?? 'p3',
    label: signal.title,
    context: signal.detail,
    destination: href,
    icon: DOMAIN_ICONS[signal.domain],
    score: signal.urgency * 20,
    confidence: signal.confidence,
    sourceKind: 'system',
    nextAction: signal.suggestedAction,
    data: {
      cilSignalId: signal.id,
      domain: signal.domain,
      source: signal.source,
    },
  }
}

export async function resolveCILSignals(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const { getProactiveSignals } = await import('@/lib/cil/api')
    const signals = await getProactiveSignals(ctx.tenantId)
    return signals.filter((s) => s.confidence >= 0.3).map(signalToItem)
  } catch (err) {
    console.error('[cil-signal-resolver] Failed:', err)
    return []
  }
}
