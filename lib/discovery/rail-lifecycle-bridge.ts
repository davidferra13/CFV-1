import type { RailItem, RailTier } from '../rail/types'
import type {
  UniversalRailItem,
  UniversalRailPresentation,
  UniversalRailRole,
} from './universal-rail-types'
import { aggregateRailItems } from '../rail/aggregator'

const TIER_PRESENTATION: Record<RailTier, UniversalRailPresentation> = {
  critical: 'alert',
  action: 'card',
  awareness: 'pill',
  opportunity: 'badge',
}

const TIER_URGENCY: Record<RailTier, number> = {
  critical: 95,
  action: 70,
  awareness: 40,
  opportunity: 15,
}

const SOURCE_ICON: Record<string, string> = {
  cil: 'brain',
  communication: 'bell',
  events: 'calendar',
  finance: 'dollar-sign',
  intelligence: 'lightbulb',
}

function mapRailItem(item: RailItem, role: UniversalRailRole): UniversalRailItem {
  return {
    definitionId: `rail-lifecycle:${item.source}:${item.id}`,
    role,
    label: item.title,
    sublabel: item.subtitle,
    category: `lifecycle-${item.source}`,
    presentation: TIER_PRESENTATION[item.tier],
    icon: SOURCE_ICON[item.source] ?? 'circle',
    href: item.actionUrl || '/dashboard',
    score: item.score,
    baseUrgency: TIER_URGENCY[item.tier],
    urgencyDecayFn: 'linear',
    privacy: 'tenant_scoped',
    dismissable: true,
    expandable: false,
    hoverAction: 'none',
    clickAction: 'navigate',
    maxImpressions: item.tier === 'critical' ? 100 : 20,
    cooldownMinutes: 0,
    impressionCount: 0,
    lastSeenAt: item.seenAt?.toISOString() ?? null,
    dismissedAt: null,
    expiresAt: item.expiresAt?.toISOString() ?? null,
    metadata: item.metadata,
    debugScore: undefined,
  }
}

export async function getRailLifecycleItems(
  role: UniversalRailRole,
  userId: string,
  tenantId?: string
): Promise<UniversalRailItem[]> {
  if (!tenantId) return []

  try {
    const result = await aggregateRailItems(tenantId, userId)
    const allItems: RailItem[] = [
      ...result.critical,
      ...result.action,
      ...result.awareness,
      ...result.opportunity,
    ]
    return allItems.map((item) => mapRailItem(item, role))
  } catch {
    return []
  }
}

export async function injectRailLifecycleItems(
  existingItems: UniversalRailItem[],
  role: UniversalRailRole,
  userId: string,
  tenantId?: string
): Promise<UniversalRailItem[]> {
  const lifecycleItems = await getRailLifecycleItems(role, userId, tenantId)
  const merged = [...existingItems, ...lifecycleItems]
  merged.sort((a, b) => b.score - a.score)
  return merged
}
