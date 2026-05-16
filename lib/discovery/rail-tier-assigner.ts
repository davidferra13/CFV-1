/**
 * Unified 4-tier rail assignment.
 *
 * Merges items from God Mode resolvers, Operator Rail, and Universal Rail
 * into a single tiered structure: Critical, Action, Awareness, Opportunity.
 *
 * Scoring uses the existing God Mode operating-loop score as the backbone.
 * Operator and Universal items are adapted into GodModeResolvedItem shape
 * so downstream components (RailItemRow) can render them uniformly.
 */

import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'
import type { PriorityQueue } from '@/lib/queue/types'
import type { ChefRailCandidate } from './chef-rail-contracts'
import type { UniversalRailItem } from './universal-rail-types'
import { dispatchAllResolvers } from './god-mode-dispatcher'
import {
  applyEscalation,
  dedupeOperatingLoopItems,
  getOperatingLoopScore,
} from './god-mode-assembly'
import { scoreChefRailCandidate } from './chef-rail-priority'
import { requireChef } from '@/lib/auth/get-user'
import { isItemDismissed } from './universal-rail-state'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UnifiedTier = 'critical' | 'action' | 'awareness' | 'opportunity'

export const UNIFIED_TIER_ORDER: UnifiedTier[] = ['critical', 'action', 'awareness', 'opportunity']

export interface TieredRailResult {
  critical: GodModeResolvedItem[]
  action: GodModeResolvedItem[]
  awareness: GodModeResolvedItem[]
  opportunity: GodModeResolvedItem[]
  totalItems: number
  assembledAt: string
}

// ---------------------------------------------------------------------------
// Old 5-tier to new 4-tier mapping
// ---------------------------------------------------------------------------

function mapGodModeTierToUnified(item: GodModeResolvedItem, score: number): UnifiedTier {
  // p0 items or very high scores are Critical
  if (item.tier === 'p0' || score > 90) return 'critical'
  // p1 or high scores are Action
  if (item.tier === 'p1' || score > 60) return 'action'
  // p2/p3 are Awareness
  if (item.tier === 'p2' || item.tier === 'p3' || score > 30) return 'awareness'
  // p4 and low scores are Opportunity
  return 'opportunity'
}

// ---------------------------------------------------------------------------
// Operator rail adapter: ChefRailCandidate -> GodModeResolvedItem
// ---------------------------------------------------------------------------

function operatorCategoryToIcon(category: ChefRailCandidate['category']): string {
  switch (category) {
    case 'event_risk':
      return 'calendar'
    case 'follow_up':
      return 'chat'
    case 'opening':
      return 'lightning'
    case 'menu_opportunity':
      return 'document'
    case 'partner_lead':
      return 'network'
  }
}

function adaptOperatorItem(candidate: ChefRailCandidate, now: Date): GodModeResolvedItem {
  const score = scoreChefRailCandidate(
    candidate,
    { enabledCategories: {}, categoryWeights: {} },
    now
  )

  return {
    definitionId: `operator.${candidate.category}.${candidate.id}`,
    tier: score > 80 ? 'p0' : score > 55 ? 'p1' : score > 30 ? 'p2' : 'p3',
    label: candidate.title,
    context: candidate.reason,
    destination: candidate.href,
    icon: operatorCategoryToIcon(candidate.category),
    score,
    sourceKind:
      candidate.category === 'event_risk'
        ? 'event'
        : candidate.category === 'follow_up'
          ? 'inquiry'
          : 'task',
    data: {
      operatorCategory: candidate.category,
      operatorReasonCode: candidate.reasonCode,
    },
  }
}

// ---------------------------------------------------------------------------
// Universal rail adapter: UniversalRailItem -> GodModeResolvedItem
// ---------------------------------------------------------------------------

function adaptUniversalItem(item: UniversalRailItem): GodModeResolvedItem {
  const score = item.score ?? 0

  return {
    definitionId: `universal.${item.definitionId}`,
    tier: score > 80 ? 'p0' : score > 55 ? 'p1' : score > 30 ? 'p2' : 'p4',
    label: item.label,
    context: item.sublabel ?? '',
    destination: item.href ?? '',
    icon: item.icon ?? undefined,
    score,
    data: {
      universalPresentation: item.presentation,
      universalRole: item.role,
    },
  }
}

// ---------------------------------------------------------------------------
// Build operator candidates from PriorityQueue (same logic as chef-operator-rail)
// ---------------------------------------------------------------------------

function itemCategory(domain: string): ChefRailCandidate['category'] {
  if (domain === 'event' || domain === 'financial') return 'event_risk'
  if (domain === 'inquiry' || domain === 'quote' || domain === 'client') return 'follow_up'
  if (domain === 'culinary') return 'menu_opportunity'
  if (domain === 'network' || domain === 'prospect') return 'partner_lead'
  return 'opening'
}

function itemAction(category: ChefRailCandidate['category']): ChefRailCandidate['action'] {
  switch (category) {
    case 'event_risk':
      return 'open_workflow'
    case 'follow_up':
      return 'send_follow_up'
    case 'menu_opportunity':
      return 'create_menu_draft'
    case 'partner_lead':
      return 'open_workflow'
    case 'opening':
      return 'promote_opening'
  }
}

function urgencyScore(urgency: string): number {
  if (urgency === 'critical') return 100
  if (urgency === 'high') return 82
  if (urgency === 'normal') return 58
  return 35
}

function buildOperatorCandidates(queue: PriorityQueue): ChefRailCandidate[] {
  const now = new Date().toISOString()
  return queue.items.slice(0, 12).map((item) => {
    const category = itemCategory(item.domain)
    const urgency = urgencyScore(item.urgency)
    return {
      id: item.id,
      tenantId: 'chef-dashboard',
      category,
      title: item.title,
      reasonCode: `${category}.${item.urgency}`,
      reason:
        item.context.secondaryLabel ??
        item.context.primaryLabel ??
        (category === 'opening' ? 'Open dashboard action' : 'Needs chef attention'),
      href: item.href,
      action: itemAction(category),
      urgency,
      moneyImpact: item.domain === 'financial' || item.domain === 'quote' ? 90 : 50,
      eventRisk: category === 'event_risk' ? urgency : 25,
      relationshipValue: category === 'follow_up' ? 82 : 45,
      confidence: 78,
      freshness: 86,
      actionability: item.href ? 92 : 0,
      createdAt: item.createdAt || now,
    }
  })
}

// ---------------------------------------------------------------------------
// Main assembly
// ---------------------------------------------------------------------------

export async function assembleTieredRail(
  queue: PriorityQueue,
  universalItems: UniversalRailItem[] = []
): Promise<TieredRailResult> {
  const user = await requireChef()
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
  }

  // 1. Fetch God Mode items (all resolvers)
  const godModeItems = await dispatchAllResolvers(ctx)

  // 2. Load dismissal state
  const { loadRailUserState } = await import('./universal-rail-state')
  const state = await loadRailUserState(user.id, 'chef')
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  // 3. Filter dismissed, apply escalation
  const activeGodMode = godModeItems
    .filter((item) => !dismissedIds.has(item.definitionId))
    .map((item) => applyEscalation(item, now))
    .filter((item) => {
      if (!item.expiresAt) return true
      return item.expiresAt.getTime() > now.getTime()
    })

  // 4. Adapt operator items
  const operatorCandidates = buildOperatorCandidates(queue)
  const operatorAdapted = operatorCandidates.map((c) => adaptOperatorItem(c, now))

  // 5. Adapt universal items
  const universalAdapted = universalItems.map(adaptUniversalItem)

  // 6. Merge all sources
  const allItems = [...activeGodMode, ...operatorAdapted, ...universalAdapted]

  // 7. Deduplicate (same entity ID keeps highest scored version)
  const deduped = dedupeOperatingLoopItems(allItems, now)

  // 8. Assign to 4 tiers
  const result: TieredRailResult = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
    totalItems: 0,
    assembledAt: now.toISOString(),
  }

  for (const item of deduped) {
    const score = getOperatingLoopScore(item, now)
    const tier = mapGodModeTierToUnified(item, score)
    // Attach computed score for sorting
    const scored = { ...item, score }
    result[tier].push(scored)
  }

  // 9. Sort each tier by score descending
  for (const tier of UNIFIED_TIER_ORDER) {
    result[tier].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  result.totalItems = deduped.length

  return result
}
