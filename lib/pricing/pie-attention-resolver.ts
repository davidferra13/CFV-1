/**
 * PIE Attention Resolver
 *
 * Rail resolver that surfaces price intelligence items into the dashboard.
 * Registered in god-mode-dispatcher as a warm resolver.
 *
 * Queries PIE data for the chef's upcoming events and returns attention
 * items (spikes, opportunities, overruns) as GodModeResolvedItems.
 */

import type {
  GodModeResolvedItem,
  GodModeResolverContext,
  RailTier,
} from '@/lib/discovery/god-mode-types'
import type { PieAttentionItem } from './pie-attention-actions'

// ---------------------------------------------------------------------------
// Urgency -> Tier mapping
// ---------------------------------------------------------------------------

function urgencyToTier(urgency: PieAttentionItem['urgency']): RailTier {
  switch (urgency) {
    case 'critical':
      return 'p1'
    case 'high':
      return 'p2'
    case 'medium':
      return 'p3'
    case 'low':
      return 'p4'
  }
}

// ---------------------------------------------------------------------------
// Kind -> Icon mapping
// ---------------------------------------------------------------------------

function kindToIcon(kind: PieAttentionItem['kind']): string {
  switch (kind) {
    case 'price_spike':
      return 'dollar'
    case 'seasonal_opportunity':
      return 'calendar'
    case 'cost_overrun_risk':
      return 'dollar'
    case 'better_alternative':
      return 'document'
    case 'bulk_buy_window':
      return 'dollar'
  }
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export async function resolvePieAttention(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  // Dynamic import to keep the server action boundary clean
  const { getPieAttentionItems } = await import('./pie-attention-actions')

  let items: PieAttentionItem[]
  try {
    items = await getPieAttentionItems()
  } catch {
    // PIE bridge unavailable or DB error; never block dashboard
    return []
  }

  if (items.length === 0) return []

  return items.map((item) => {
    const eventContext =
      item.affectedEvents.length > 0
        ? ` (${item.affectedEvents[0].occasion}${item.affectedEvents.length > 1 ? ` +${item.affectedEvents.length - 1}` : ''})`
        : ''

    return {
      definitionId: `pie.${item.kind}.${item.id}`,
      tier: urgencyToTier(item.urgency),
      label: item.title,
      context: `${item.suggestion}${eventContext}`,
      destination: item.href ?? '/pricing/ingredients',
      icon: kindToIcon(item.kind),
      score: urgencyToScore(item.urgency, item.changePct),
      sourceKind: 'task' as const,
      data: {
        pieKind: item.kind,
        ingredientName: item.ingredientName,
        changePct: item.changePct,
        currentCents: item.currentCents,
        previousCents: item.previousCents,
        affectedEventCount: item.affectedEvents.length,
      },
    }
  })
}

function urgencyToScore(urgency: PieAttentionItem['urgency'], changePct: number | null): number {
  const base = { critical: 85, high: 68, medium: 45, low: 25 }[urgency]
  // Boost score slightly by magnitude of change
  const boost = changePct ? Math.min(Math.abs(changePct) / 5, 10) : 0
  return Math.round(base + boost)
}
