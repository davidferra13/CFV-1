'use client'

import { useState } from 'react'
import type { GodModeResolvedItem, RailTier } from '@/lib/discovery/god-mode-types'
import { TIER_CONFIG, isExpandedByDefault } from '@/lib/discovery/god-mode-types'
import { RailItemRow } from './rail-item-row'
import { cn } from '@/lib/utils'

const TIER_BORDER_COLORS: Record<RailTier, string> = {
  p0: 'border-l-red-500',
  p1: 'border-l-amber-500',
  p2: 'border-l-blue-500',
  p3: 'border-l-stone-600',
  p4: 'border-l-stone-700',
}

const TIER_DOT_COLORS: Record<RailTier, string> = {
  p0: 'bg-red-500',
  p1: 'bg-amber-500',
  p2: 'bg-blue-500',
  p3: 'bg-stone-500',
  p4: 'bg-stone-600',
}

export function RailTierGroup({
  tier,
  items,
  className,
}: {
  tier: RailTier
  items: GodModeResolvedItem[]
  className?: string
}) {
  const config = TIER_CONFIG[tier]
  const [expanded, setExpanded] = useState(isExpandedByDefault(tier))

  if (items.length === 0) return null

  const canCollapse = !config.alwaysExpanded

  return (
    <div
      className={cn(
        'border-l-2 rounded-r-lg',
        TIER_BORDER_COLORS[tier],
        config.pulses && 'animate-pulse-subtle',
        className
      )}
    >
      <button
        onClick={() => canCollapse && setExpanded(!expanded)}
        disabled={!canCollapse}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-left',
          canCollapse && 'hover:bg-stone-900/40 cursor-pointer',
          !canCollapse && 'cursor-default'
        )}
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', TIER_DOT_COLORS[tier])} />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex-1">
          {config.name}
        </span>
        <span className="text-xs text-stone-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        {canCollapse && (
          <span className="text-xs text-stone-600 ml-1">{expanded ? '\u25b4' : '\u25be'}</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-0.5 pb-1">
          {items.map((item) => (
            <RailItemRow key={`${item.definitionId}-${item.destination}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
