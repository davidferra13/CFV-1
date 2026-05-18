'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AggregatedFeedItem, isAggregated } from '@/lib/feed/aggregation'
import { RailItemRow } from '@/components/rail/rail-item-row'
import { cn } from '@/lib/utils'

interface AggregatedItemProps {
  group: AggregatedFeedItem
  className?: string
}

export function AggregatedItem({ group, className }: AggregatedItemProps) {
  const [expanded, setExpanded] = useState(false)

  const { representative, items, count } = group

  return (
    <div
      className={cn(
        'bg-[var(--glass-subtle-bg)] border border-stone-800/40 rounded-lg',
        'transition-all duration-150',
        'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]',
        className
      )}
    >
      {/* Summary header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-700/60 text-stone-300 font-medium">
          {count}
        </span>
        <span className="flex-1 text-sm text-stone-200 truncate">
          {representative.label ?? 'items'} need attention
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-stone-400 transition-transform duration-150',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-stone-800/40 px-1 pb-1">
          <div className="flex flex-col gap-0.5 pt-1">
            {items.map((item) => (
              <RailItemRow key={item.id} item={item} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full mt-1.5 py-1 text-xs text-stone-400 hover:text-stone-300 transition-colors duration-150"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  )
}
