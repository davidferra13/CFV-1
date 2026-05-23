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
import { applyEscalation, dedupeOperatingLoopItems } from './god-mode-assembly'
import { computeUniversalRailScore, ROLE_WEIGHT_PROFILES } from './universal-rail-scoring'
import { scoreChefRailCandidate } from './chef-rail-priority'
import { requireChef } from '@/lib/auth/get-user'
import { isItemDismissed } from './universal-rail-state'
import { DENSITY_CAPS, RAIL_ITEM_TIER_ORDER } from './rail-item-types'
import type { RailItemTier } from './rail-item-types'
import {
  getCurrentTimeWindow,
  computeTimeMultiplier,
  isNightSuppressed,
  shouldForcePromoteToCritical,
} from './rail-item-scoring'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'

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
  /** Per-item persistent state map (definitionId -> state). Absent = 'surfaced'. */
  itemStates?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Old 5-tier to new 4-tier mapping
// ---------------------------------------------------------------------------

function mapGodModeTierToUnified(item: GodModeResolvedItem, score: number): UnifiedTier {
  if (item.tier === 'p0' || score >= 80) return 'critical'
  if (item.tier === 'p1' || score >= 50) return 'action'
  if (item.tier === 'p2' || item.tier === 'p3' || score >= 20) return 'awareness'
  return 'opportunity'
}

const UNRESOLVED_TEMPLATE_TOKEN = /\{[a-zA-Z0-9_]+\}/

export function hasUnresolvedRailTemplate(item: GodModeResolvedItem): boolean {
  const visibleValues = [
    item.label,
    item.context,
    item.nextAction ?? '',
    ...(item.inlineActions?.map((action) => action.label) ?? []),
  ]
  return visibleValues.some((value) => UNRESOLVED_TEMPLATE_TOKEN.test(value))
}

// ---------------------------------------------------------------------------
// Spec-aligned multiplicative scoring adapter for GodModeResolvedItem
// ---------------------------------------------------------------------------

const LOOP_STATE_URGENCY: Record<string, number> = {
  blocked: 95,
  waiting: 80,
  active: 70,
  uncertain: 50,
  stale: 20,
  snoozed: 10,
  dismissed: 5,
  done: 0,
}

const EVIDENCE_RELEVANCE: Record<string, number> = {
  confirmed: 90,
  computed: 75,
  user_entered: 65,
  inferred: 40,
  claimed: 30,
  unknown: 15,
  stale: 10,
  disputed: 5,
}

function scoreGodModeItem(
  item: GodModeResolvedItem,
  now: Date,
  currentPage: string | null = null
): number {
  const baseUrgency = LOOP_STATE_URGENCY[item.loopState ?? ''] ?? 50
  const relevance = EVIDENCE_RELEVANCE[item.evidenceLabel ?? ''] ?? 30
  const confidence = typeof item.confidence === 'number' ? item.confidence * 100 : 50

  let ageMs = 0
  let windowMs = 0
  if (item.expiresAt) {
    const totalWindow = item.expiresAt.getTime() - now.getTime() + 7 * 86_400_000
    windowMs = Math.max(totalWindow, 1)
    ageMs = Math.max(0, windowMs - (item.expiresAt.getTime() - now.getTime()))
  }

  let boostValue = 0
  if (item.nextAction) boostValue += 8
  if (item.proofHref) boostValue += 4
  if (item.waitingOn?.followUpAt) {
    const hrs = (Date.parse(item.waitingOn.followUpAt) - now.getTime()) / 3_600_000
    if (hrs <= 0) boostValue += 15
    else if (hrs <= 24) boostValue += 10
    else if (hrs <= 72) boostValue += 5
  }

  const breakdown = computeUniversalRailScore({
    definition: {
      id: item.definitionId,
      role: 'chef',
      label: item.label,
      labelTemplate: '',
      category: item.sourceKind ?? 'system',
      baseUrgency,
      urgencyDecayFn: item.expiresAt ? 'deadline' : 'none',
      relevanceSignals: [],
      freshnessWindow: '7d',
      pageAffinity: '',
      pageAffinityBoost: 0,
      href: item.destination,
      hrefTemplate: '',
      dataSources: [],
      privacy: 'tenant_scoped',
      dismissable: true,
      expandable: false,
      hoverAction: 'none',
      clickAction: 'navigate',
      renderHints: { presentation: 'card' },
      maxImpressions: -1,
      cooldownMinutes: 0,
      scoringNotes: '',
    },
    weights: ROLE_WEIGHT_PROFILES.chef,
    now,
    ageMs,
    windowMs,
    relevanceScore: relevance,
    userAffinityScore: confidence,
    impressionCount: 0,
    lastSeenAt: null,
    currentPage,
    boostValue,
  })

  return breakdown.final
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

  const { headers } = await import('next/headers')
  const currentPage = headers().get(PATHNAME_HEADER) ?? null

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
    ...(currentPage ? { currentPage } : {}),
  }

  // 1. Fetch God Mode items (all resolvers)
  const godModeItems = await dispatchAllResolvers(ctx)

  // 2. Load dismissal state + persistent rail item states
  const { loadRailUserState } = await import('./universal-rail-state')
  const { getSuppressedItemKeys } = await import('./rail-item-state-actions')
  const tenantId = user.tenantId ?? user.entityId
  const [state, suppressedKeys] = await Promise.all([
    loadRailUserState(user.id, 'chef'),
    getSuppressedItemKeys(tenantId, user.id).catch(() => new Set<string>()),
  ])
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  // 3. Filter dismissed + persistent state suppressed, apply escalation
  const activeGodMode = godModeItems
    .filter(
      (item) => !dismissedIds.has(item.definitionId) && !suppressedKeys.has(item.definitionId)
    )
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
  const dedupedRaw = dedupeOperatingLoopItems(allItems, now)

  // 7b. Apply persistent rail item state filter to all sources
  // (God Mode items were pre-filtered in step 3, but operator + universal
  // items need this filter applied here after adaptation.)
  const deduped = dedupedRaw.filter(
    (item) => !suppressedKeys.has(item.definitionId) && !hasUnresolvedRailTemplate(item)
  )

  // 8. Score items and apply time-of-day multiplier
  const timeWindow = getCurrentTimeWindow(now)

  const scoredItems: Array<{ item: GodModeResolvedItem; score: number; tier: UnifiedTier }> = []

  for (const item of deduped) {
    let score = scoreGodModeItem(item, now, currentPage)

    // Apply time-of-day multiplier based on preliminary tier
    const prelimTier = mapGodModeTierToUnified(item, score)
    const timeMult = computeTimeMultiplier(prelimTier as RailItemTier, timeWindow)
    score = Math.max(0, Math.min(100, score * timeMult))

    // Force-promote to critical if expiring within 2 hours
    if (shouldForcePromoteToCritical(item.expiresAt, now)) {
      score = Math.max(score, 80)
    }

    const tier = mapGodModeTierToUnified(item, score)
    scoredItems.push({ item: { ...item, score }, score, tier })
  }

  // 9. Night suppression: only Critical surfaces at night
  const afterNight = scoredItems.filter((s) => {
    return !isNightSuppressed(s.tier as RailItemTier, now)
  })

  // 10. Distribute to tiers
  const result: TieredRailResult = {
    critical: [],
    action: [],
    awareness: [],
    opportunity: [],
    totalItems: 0,
    assembledAt: now.toISOString(),
  }

  for (const s of afterNight) {
    result[s.tier].push(s.item)
  }

  // 11. Sort each tier by score descending
  for (const tier of UNIFIED_TIER_ORDER) {
    result[tier].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  // 12. Apply density caps per tier
  for (const tier of UNIFIED_TIER_ORDER) {
    const cap = DENSITY_CAPS[tier as RailItemTier].maxVisible
    result[tier] = result[tier].slice(0, cap)
  }

  result.totalItems = UNIFIED_TIER_ORDER.reduce((sum, tier) => sum + result[tier].length, 0)

  // 13. Attach persistent item states for UI (seen vs surfaced styling)
  const { getRailItemStateMap } = await import('./rail-item-state-actions')
  const stateMap = await getRailItemStateMap(tenantId, user.id).catch(() => new Map())
  if (stateMap.size > 0) {
    const states: Record<string, string> = {}
    for (const tier of UNIFIED_TIER_ORDER) {
      for (const item of result[tier]) {
        const s = stateMap.get(item.definitionId)
        if (s) states[item.definitionId] = s
      }
    }
    if (Object.keys(states).length > 0) {
      result.itemStates = states
    }
  }

  return result
}
