'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { GodModeResolvedItem, GodModeStripResult } from '@/lib/discovery/god-mode-types'
import { useSSE } from '@/lib/realtime/sse-client'
import { getRailStrip } from '@/lib/discovery/universal-rail-actions'
import { cn } from '@/lib/utils'

const TIER_DOT_CLASSES: Record<string, string> = {
  p0: 'bg-red-500 animate-pulse',
  p1: 'bg-amber-500',
}

const MAX_VISIBLE = 5
const ROTATE_INTERVAL_MS = 8000

function StripItem({ item }: { item: GodModeResolvedItem }) {
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
      <span className="text-xs text-stone-300 truncate max-w-[200px]">{item.label}</span>
    </Link>
  )
}

export function RailStrip({ initialData }: { initialData: GodModeStripResult }) {
  const [data, setData] = useState(initialData)
  const [offset, setOffset] = useState(0)

  useSSE('rail', {
    onMessage: useCallback(() => {
      getRailStrip()
        .then(setData)
        .catch(() => {
          // Non-critical refresh failure
        })
    }, []),
  })

  useEffect(() => {
    if (data.items.length <= MAX_VISIBLE) return
    const timer = setInterval(() => {
      setOffset((prev) => (prev + 1) % data.items.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [data.items.length])

  if (data.items.length === 0) {
    return (
      <div className="flex items-center px-4 h-8 bg-stone-950/80 border-b border-stone-800/50">
        <span className="text-xs text-stone-600">No urgent items</span>
      </div>
    )
  }

  const visible: GodModeResolvedItem[] = []
  for (let i = 0; i < Math.min(MAX_VISIBLE, data.items.length); i++) {
    visible.push(data.items[(offset + i) % data.items.length])
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 h-8 border-b overflow-hidden transition-colors',
        data.hasP0 ? 'bg-red-950/20 border-red-900/30' : 'bg-stone-950/80 border-stone-800/50'
      )}
    >
      {visible.map((item) => (
        <StripItem key={`${item.definitionId}-${item.destination}`} item={item} />
      ))}
      {data.totalUrgent > MAX_VISIBLE && (
        <span className="text-[10px] text-stone-600 ml-1">+{data.totalUrgent - MAX_VISIBLE}</span>
      )}
    </div>
  )
}
