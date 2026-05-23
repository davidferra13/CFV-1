'use client'

import { memo, useCallback, useState } from 'react'
import Link from 'next/link'
import type { GodModeResolvedItem, GodModeStripResult } from '@/lib/discovery/god-mode-types'
import { useSSE } from '@/lib/realtime/sse-client'
import { getRailStrip } from '@/lib/discovery/universal-rail-actions'
import { cn } from '@/lib/utils'
import { useAutoScroll } from './use-auto-scroll'

const TIER_DOT_CLASSES: Record<string, string> = {
  p0: 'bg-red-500 animate-pulse',
  p1: 'bg-amber-500',
}

const StripItem = memo(function StripItem({ item }: { item: GodModeResolvedItem }) {
  return (
    <Link
      href={item.destination}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-stone-800/60 transition-colors whitespace-nowrap no-underline"
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          TIER_DOT_CLASSES[item.tier] ?? 'bg-stone-500'
        )}
      />
      {item.sourceKind && (
        <span className="text-[9px] uppercase tracking-wider text-stone-600 font-medium">
          {item.sourceKind}
        </span>
      )}
      <span className="text-xs text-stone-300 truncate max-w-[200px]">{item.label}</span>
    </Link>
  )
})

export function RailStrip({ initialData }: { initialData: GodModeStripResult }) {
  const [data, setData] = useState(initialData)

  const { scrollRef } = useAutoScroll({ tier: 'critical', itemCount: data.items.length })

  useSSE('rail', {
    onMessage: useCallback(() => {
      getRailStrip()
        .then(setData)
        .catch(() => {
          // Non-critical refresh failure
        })
    }, []),
  })

  if (data.items.length === 0) {
    return (
      <div className="flex items-center px-4 h-8 bg-stone-950/80 border-b border-stone-800/50">
        <span className="text-xs text-stone-600">No urgent items</span>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex items-center gap-1 px-3 h-8 border-b overflow-x-auto scrollbar-hide transition-colors',
        data.hasP0 ? 'bg-red-950/20 border-red-900/30' : 'bg-stone-950/80 border-stone-800/50'
      )}
    >
      {data.items.map((item) => (
        <StripItem key={`${item.definitionId}-${item.destination}`} item={item} />
      ))}
    </div>
  )
}
