'use server'

import type { UniversalRailRole } from './universal-rail-types'
import type { UniversalRailAssemblyResult } from './universal-rail-types'
import type { RailDismissType, RailAuditEventType } from './universal-rail-state'
import type {
  GodModeResolverContext,
  GodModeRailResult,
  GodModeStripResult,
} from './god-mode-types'
import { assembleUniversalRail, assembleRailForPage } from './universal-rail-assembly'
import { assembleTieredRail } from './rail-tier-assigner'
import type { TieredRailResult } from './rail-tier-assigner'
import { getPriorityQueue } from '@/lib/queue/actions'
import {
  recordImpression,
  recordImpressionBatch,
  dismissRailItem,
  undismissRailItem,
  saveRailItem,
  unsaveRailItem,
  recordRailAuditEvent,
  isItemDismissed,
} from './universal-rail-state'
import { dispatchAllResolvers, dispatchHotResolvers } from './god-mode-dispatcher'
import { assembleGodModeRail, extractStrip, applyEscalation } from './god-mode-assembly'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Rail assembly action
// ---------------------------------------------------------------------------

export async function getUniversalRail(
  role: UniversalRailRole,
  pageContext: string,
  userId?: string,
  tenantId?: string
): Promise<UniversalRailAssemblyResult> {
  return assembleUniversalRail({
    role,
    userId,
    tenantId,
    pageContext,
    limit: role === 'admin' ? 100 : 50,
  })
}

// ---------------------------------------------------------------------------
// Interaction actions
// ---------------------------------------------------------------------------

export async function trackRailImpression(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string
): Promise<void> {
  await recordImpression(userId, tenantId, itemDefinitionId, role)
}

export async function trackRailImpressionBatch(
  userId: string,
  tenantId: string | null,
  role: string,
  itemDefinitionIds: string[]
): Promise<void> {
  await recordImpressionBatch(userId, tenantId, role, itemDefinitionIds)
}

export async function dismissRailItemAction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  dismissType: RailDismissType = 'permanent'
): Promise<void> {
  await dismissRailItem(userId, tenantId, itemDefinitionId, role, dismissType)
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: dismissType === 'permanent' ? 'dismiss' : 'snooze',
  })
}

export async function undismissRailItemAction(
  userId: string,
  itemDefinitionId: string
): Promise<void> {
  await undismissRailItem(userId, itemDefinitionId)
}

export async function saveRailItemAction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  pinned = false
): Promise<void> {
  await saveRailItem(userId, tenantId, itemDefinitionId, role, pinned)
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: pinned ? 'pin' : 'save',
  })
}

export async function unsaveRailItemAction(
  userId: string,
  itemDefinitionId: string,
  role: string
): Promise<void> {
  await unsaveRailItem(userId, itemDefinitionId)
  await recordRailAuditEvent({
    userId,
    itemDefinitionId,
    role,
    event: 'unsave',
  })
}

export async function trackRailClick(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  pageContext?: string
): Promise<void> {
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: 'click',
    pageContext,
  })
}

export async function trackRailInteraction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  event: RailAuditEventType,
  pageContext?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event,
    pageContext,
    metadata,
  })
}

// ---------------------------------------------------------------------------
// God Mode actions
// NOTE: For dashboard consumers that need all 3 sources merged into the
// unified 4-tier structure, use getTieredRail() instead.
// ---------------------------------------------------------------------------

export async function getGodModeRail(): Promise<GodModeRailResult> {
  const user = await requireChef()
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
  }

  const rawItems = await dispatchAllResolvers(ctx)

  const { loadRailUserState } = await import('./universal-rail-state')
  const state = await loadRailUserState(user.id, 'chef')
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  return assembleGodModeRail(rawItems, dismissedIds, now)
}

export async function getRailStrip(): Promise<GodModeStripResult> {
  const user = await requireChef()
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
  }

  const rawItems = await dispatchHotResolvers(ctx)

  const { loadRailUserState } = await import('./universal-rail-state')
  const state = await loadRailUserState(user.id, 'chef')
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  const active = rawItems.filter((item) => !dismissedIds.has(item.definitionId))
  const escalated = active.map((item) => applyEscalation(item, now))

  return extractStrip(escalated, now, 5)
}

// ---------------------------------------------------------------------------
// Tiered Rail action (canonical unified path for dashboard consumers)
// Merges God Mode + Operator Queue + Universal Rail into 4 tiers:
// critical, action, awareness, opportunity.
// ---------------------------------------------------------------------------

export async function getTieredRail(): Promise<TieredRailResult> {
  const user = await requireChef()

  const [queue, universalResult] = await Promise.all([
    getPriorityQueue(),
    assembleRailForPage('chef', 'dashboard', user.id, user.tenantId ?? undefined).catch(() => ({
      items: [] as import('./universal-rail-types').UniversalRailItem[],
    })),
  ])

  return assembleTieredRail(queue, universalResult.items)
}

// ---------------------------------------------------------------------------
// Rail group priorities for collapsed sidebar ordering
// ---------------------------------------------------------------------------

const SOURCE_KIND_TO_NAV_GROUP: Record<string, string> = {
  event: 'events',
  inquiry: 'pipeline',
  quote: 'pipeline',
  payment: 'finance',
  menu: 'culinary',
  recipe: 'culinary',
  vendor: 'supply-chain',
  client_profile: 'clients',
  message: 'clients',
  task: 'operations',
  handoff: 'operations',
}

const TIER_WEIGHT: Record<string, number> = {
  critical: 100,
  action: 60,
  awareness: 30,
  opportunity: 10,
}

export type RailGroupPriority = { groupId: string; score: number }

export async function getRailGroupPriorities(): Promise<RailGroupPriority[]> {
  let tiered: TieredRailResult
  try {
    tiered = await getTieredRail()
  } catch {
    return []
  }

  const scores = new Map<string, number>()

  for (const tier of ['critical', 'action', 'awareness', 'opportunity'] as const) {
    const weight = TIER_WEIGHT[tier]
    for (const item of tiered[tier]) {
      const groupId = SOURCE_KIND_TO_NAV_GROUP[item.sourceKind ?? '']
      if (!groupId) continue
      scores.set(groupId, (scores.get(groupId) ?? 0) + weight)
    }
  }

  return Array.from(scores.entries())
    .map(([groupId, score]) => ({ groupId, score }))
    .sort((a, b) => b.score - a.score)
}
