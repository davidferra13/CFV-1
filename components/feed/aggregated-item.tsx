'use client'

import { useState } from 'react'
import type { AggregatedFeedItem } from '@/lib/feed/aggregation'
import type { GodModeResolvedItem, RailTier } from '@/lib/discovery/god-mode-types'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import { RailItemRow } from '@/components/rail/rail-item-row'
import { cn } from '@/lib/utils'

const TIER_ACCENT: Record<string, string> = {
  critical: 'bg-red-500',
  action: 'bg-amber-500',
  awareness: 'bg-stone-500',
  opportunity: 'bg-green-500',
}

function inferTier(score: number): string {
  if (score >= 80) return 'critical'
  if (score >= 50) return 'action'
  if (score >= 20) return 'awareness'
  return 'opportunity'
}

function toResolvedItem(item: UniversalRailItem): GodModeResolvedItem {
  const tier: RailTier = item.baseUrgency >= 80 ? 'p0' : item.baseUrgency >= 50 ? 'p1' : 'p2'
  return {
    definitionId: item.definitionId,
    tier,
    label: item.label,
    context: item.sublabel ?? '',
    destination: item.href,
    icon: item.icon,
    score: item.score,
    data: item.metadata,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
  }
}

export function AggregatedItemCard({ group }: { group: AggregatedFeedItem }) {
  const [expanded, setExpanded] = useState(false)
  const tier = inferTier(group.representativeItem.score)

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'relative flex w-full items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150',
          'bg-[var(--glass-subtle-bg)] border border-stone-800/40',
          'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]',
          'hover:border-stone-700/60',
          'group min-h-[40px] text-left'
        )}
      >
        {/* Left accent */}
        <span
          className={cn(
            'absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-60',
            TIER_ACCENT[tier] ?? TIER_ACCENT.awareness
          )}
        />

        {/* Count badge */}
        <span
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0',
            'bg-stone-800/60 ring-1 ring-stone-600/30 text-xs font-semibold text-stone-200'
          )}
        >
          {group.count}
        </span>

        {/* Label */}
        <span className="flex-1 truncate text-sm font-medium text-stone-200">{group.label}</span>

        {/* Expand/collapse indicator */}
        <span
          className={cn(
            'text-stone-500 transition-transform duration-150 flex-shrink-0',
            expanded && 'rotate-180'
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 5.25L7 8.75L10.5 5.25" />
          </svg>
        </span>
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="pl-4 space-y-1">
          {group.items.map((item, idx) => (
            <RailItemRow
              key={`${item.definitionId}-${idx}`}
              item={toResolvedItem(item)}
              tier={tier as 'critical' | 'action' | 'awareness' | 'opportunity'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
