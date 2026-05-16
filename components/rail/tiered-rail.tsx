import type { PriorityQueue } from '@/lib/queue/types'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import { assembleTieredRail, UNIFIED_TIER_ORDER } from '@/lib/discovery/rail-tier-assigner'
import { TierRow } from './tier-row'
import { cn } from '@/lib/utils'

/**
 * TieredRail: unified 4-tier horizontal-scroll rail system.
 *
 * Server component. Fetches data from all 3 former rail sources
 * (God Mode, Operator, Universal) and renders them as 4 horizontal
 * scroll rows: Critical (sticky), Action, Awareness, Opportunity.
 *
 * Empty tiers are hidden. If all tiers are empty, shows an all-clear message.
 */
export async function TieredRail({
  queuePromise,
  universalItems = [],
  className,
}: {
  queuePromise: Promise<PriorityQueue>
  universalItems?: UniversalRailItem[]
  className?: string
}) {
  let queue: PriorityQueue
  try {
    queue = await queuePromise
  } catch {
    queue = {
      items: [],
      nextAction: null,
      summary: {
        totalItems: 0,
        byDomain: {
          inquiry: 0,
          message: 0,
          quote: 0,
          event: 0,
          financial: 0,
          post_event: 0,
          client: 0,
          culinary: 0,
          network: 0,
          prospect: 0,
        },
        byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
        allCaughtUp: true,
      },
      computedAt: new Date().toISOString(),
    }
  }

  let result
  try {
    result = await assembleTieredRail(queue, universalItems)
  } catch (err) {
    console.error('[TieredRail] Assembly failed:', err)
    return (
      <div className={cn('px-4 py-8 text-center', className)}>
        <p className="text-sm text-stone-400">Rail temporarily unavailable.</p>
      </div>
    )
  }

  const nonEmptyTiers = UNIFIED_TIER_ORDER.filter((tier) => result[tier].length > 0)

  if (nonEmptyTiers.length === 0) {
    return (
      <div className={cn('px-4 py-8 text-center', className)}>
        <p className="text-sm text-stone-400">All clear. Nothing needs attention.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {nonEmptyTiers.map((tier) => (
        <TierRow key={tier} tier={tier} items={result[tier]} />
      ))}
    </div>
  )
}

export function TieredRailSkeleton() {
  return (
    <div className="space-y-1">
      <div className="h-14 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-red-500/30" />
      <div className="h-14 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-amber-500/30" />
      <div className="h-14 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-stone-600/30" />
    </div>
  )
}
