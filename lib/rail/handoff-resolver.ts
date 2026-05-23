// lib/rail/handoff-resolver.ts
// Returns the highest-priority rail item for a specific entity (menu or recipe).
// Used by the HandoffBar component to surface the next action inline on detail pages.

import { requireChef } from '@/lib/auth/get-user'
import { aggregateRailItems, type AggregatedRailResult } from './aggregator'
import type { RailItem } from './types'

export interface HandoffAction {
  title: string
  subtitle: string | null
  actionUrl: string | null
  tier: 'critical' | 'action' | 'awareness' | 'opportunity'
  source: string
}

type EntityType = 'menu' | 'recipe'

/**
 * Returns the single highest-priority next action relevant to the given entity.
 * Pulls from the live aggregated rail, filters by entity association in metadata.
 * Falls back to null (no handoff to show) if nothing is relevant.
 */
export async function getHandoffAction(
  entityType: EntityType,
  entityId: string
): Promise<HandoffAction | null> {
  try {
    const user = await requireChef()
    if (!user.tenantId) return null

    const result: AggregatedRailResult = await aggregateRailItems(user.tenantId, user.id)

    // Walk tiers in priority order
    const allItems = [
      ...result.critical,
      ...result.action,
      ...result.awareness,
      ...result.opportunity,
    ]

    // Filter to items that reference this specific entity
    const entityItems = allItems.filter((item) => isEntityMatch(item, entityType, entityId))

    if (entityItems.length > 0) {
      const top = entityItems[0]
      return {
        title: top.title,
        subtitle: top.subtitle ?? null,
        actionUrl: top.actionUrl ?? null,
        tier: top.tier,
        source: top.source,
      }
    }

    // No entity-specific item — fall back to the top critical or action item
    // so the bar still shows something useful
    const fallback = result.critical[0] ?? result.action[0] ?? null
    if (!fallback) return null

    return {
      title: fallback.title,
      subtitle: fallback.subtitle ?? null,
      actionUrl: fallback.actionUrl ?? null,
      tier: fallback.tier,
      source: fallback.source,
    }
  } catch {
    // Never crash the page over a rail fetch failure
    return null
  }
}

function isEntityMatch(item: RailItem, entityType: EntityType, entityId: string): boolean {
  const meta = item.metadata ?? {}
  // Check common metadata keys that sources use to associate items with entities
  if (entityType === 'menu') {
    return (
      meta.menuId === entityId ||
      meta.menu_id === entityId ||
      (typeof meta.entityType === 'string' &&
        meta.entityType === 'menu' &&
        (meta.entityId === entityId || meta.id === entityId))
    )
  }
  if (entityType === 'recipe') {
    return (
      meta.recipeId === entityId ||
      meta.recipe_id === entityId ||
      (typeof meta.entityType === 'string' &&
        meta.entityType === 'recipe' &&
        (meta.entityId === entityId || meta.id === entityId))
    )
  }
  return false
}
