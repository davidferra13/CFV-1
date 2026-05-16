'use client'

import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { UnifiedTier } from '@/lib/discovery/rail-tier-assigner'
import { RailItemRow } from './rail-item-row'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Visual config per tier
// ---------------------------------------------------------------------------

const TIER_VISUAL: Record<
  UnifiedTier,
  {
    label: string
    borderColor: string
    dotColor: string
    bgAccent: string
  }
> = {
  critical: {
    label: 'Critical',
    borderColor: 'border-red-500',
    dotColor: 'bg-red-500',
    bgAccent: 'bg-red-950/20',
  },
  action: {
    label: 'Action',
    borderColor: 'border-amber-500',
    dotColor: 'bg-amber-500',
    bgAccent: 'bg-amber-950/10',
  },
  awareness: {
    label: 'Awareness',
    borderColor: 'border-stone-600',
    dotColor: 'bg-stone-500',
    bgAccent: '',
  },
  opportunity: {
    label: 'Opportunity',
    borderColor: 'border-green-600',
    dotColor: 'bg-green-500',
    bgAccent: 'bg-green-950/10',
  },
}

export function TierRow({
  tier,
  items,
  className,
}: {
  tier: UnifiedTier
  items: GodModeResolvedItem[]
  className?: string
}) {
  const visual = TIER_VISUAL[tier]

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'border-l-2 rounded-r-lg',
        visual.borderColor,
        visual.bgAccent,
        tier === 'critical' && 'sticky top-0 z-40',
        className
      )}
    >
      {/* Tier header */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            visual.dotColor,
            tier === 'critical' && 'animate-pulse'
          )}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          {visual.label}
        </span>
        <span className="text-xs text-stone-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Horizontal scroll container */}
      <div
        className={cn(
          'flex gap-1 overflow-x-auto pb-1.5 px-1',
          'scrollbar-hide scroll-smooth snap-x snap-mandatory',
          // Fade edges using mask
          '[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]'
        )}
      >
        {items.map((item) => (
          <div
            key={`${item.definitionId}-${item.destination}`}
            className="snap-start flex-shrink-0 min-w-[260px] max-w-[340px]"
          >
            <RailItemRow item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
