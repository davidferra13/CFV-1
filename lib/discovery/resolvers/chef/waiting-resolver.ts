import { collectWaitingItems } from '@/lib/waiting-radar/collect'
import type { WaitingRadarItem } from '@/lib/waiting-radar/types'
import type { SourceKind, WaitingOnKind } from '@/lib/operating-loop/types'
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

function waitingOwnerToKind(owner: WaitingRadarItem['waitingOn']): WaitingOnKind {
  switch (owner) {
    case 'client':
      return 'reply'
    case 'vendor':
      return 'vendor'
    case 'system':
      return 'system'
    case 'time':
      return 'time'
    case 'decision':
      return 'decision'
    case 'payment':
      return 'payment'
    default:
      return 'person'
  }
}

function tierForWaiting(item: WaitingRadarItem, now: Date): RailTier {
  const overdue = item.followUpAt != null && new Date(item.followUpAt).getTime() <= now.getTime()
  if (item.riskLevel === 'critical' || overdue) return 'p0'
  if (item.riskLevel === 'high') return 'p1'
  if (item.followUpAt) return 'p2'
  return 'p3'
}

function iconForWaiting(item: WaitingRadarItem): string {
  if (item.waitingOn === 'payment') return 'dollar'
  if (item.sourceKind === 'event') return 'calendar'
  if (item.waitingOn === 'client') return 'chat'
  return 'document'
}

const WAITING_SOURCE_TO_SOURCE_KIND: Record<string, SourceKind> = {
  import: 'system',
  client: 'client_profile',
  contract: 'event',
}

function sourceKindForWaiting(item: WaitingRadarItem): SourceKind {
  return WAITING_SOURCE_TO_SOURCE_KIND[item.sourceKind] ?? (item.sourceKind as SourceKind)
}

function waitingItemToRailItem(item: WaitingRadarItem, now: Date): GodModeResolvedItem {
  return {
    definitionId: `chef.waiting_${item.sourceKind}`,
    tier: tierForWaiting(item, now),
    label: item.title,
    context: item.waitingReason,
    destination: item.proofHref,
    icon: iconForWaiting(item),
    loopState: 'waiting',
    sourceKind: sourceKindForWaiting(item),
    evidenceLabel: 'computed',
    confidence: 0.85,
    proofHref: item.proofHref,
    nextAction: `Follow up: ${item.waitingReason}`,
    waitingOn: {
      kind: waitingOwnerToKind(item.waitingOn),
      label: item.waitingReason,
      followUpAt: item.followUpAt,
    },
    data: {
      waitingOn: item.waitingOn,
      riskLevel: item.riskLevel,
      waitingSince: item.waitingSince,
    },
  }
}

export function resolveWaitingRadarItems(
  items: WaitingRadarItem[],
  now: Date
): GodModeResolvedItem[] {
  return items.slice(0, 6).map((item: WaitingRadarItem) => waitingItemToRailItem(item, now))
}

export async function resolveWaitingItems(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  try {
    const items = await collectWaitingItems()
    return resolveWaitingRadarItems(items, ctx.now)
  } catch (err) {
    console.error('[waiting-resolver] Query failed:', err)
    return []
  }
}
