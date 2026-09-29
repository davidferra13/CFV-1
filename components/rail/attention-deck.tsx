'use client'

import Link from 'next/link'
import { useState } from 'react'
import type {
  ContextualRailData,
  ContextualRailItem,
  RailCategory,
} from '@/lib/discovery/contextual-rail-types'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  RAIL_CATEGORIES,
} from '@/lib/discovery/contextual-rail-types'
import { cn } from '@/lib/utils'
import { useAutoScroll } from './use-auto-scroll'

type TickerDirection = 'forward' | 'reverse'
type MotionTier = 'critical' | 'action' | 'awareness' | 'opportunity'

type TickerConfig = {
  direction: TickerDirection
  tier: MotionTier
}

const TICKER_CONFIG: Record<RailCategory, TickerConfig> = {
  readiness: { direction: 'forward', tier: 'awareness' },
  money: { direction: 'reverse', tier: 'awareness' },
  people: { direction: 'forward', tier: 'awareness' },
  time: { direction: 'forward', tier: 'action' },
  risk: { direction: 'reverse', tier: 'critical' },
  intelligence: { direction: 'forward', tier: 'awareness' },
  communication: { direction: 'reverse', tier: 'action' },
  actions: { direction: 'forward', tier: 'action' },
}

const PRIORITY_DOT: Record<string, string> = {
  p0: 'bg-red-500',
  p1: 'bg-amber-500',
}

function TickerItem({ item }: { item: ContextualRailItem }) {
  const content = (
    <span
      className={cn(
        'inline-flex min-h-9 max-w-[22rem] items-center gap-2 rounded-lg border px-3 py-1.5',
        'border-stone-800/70 bg-stone-900/65 text-left transition-colors',
        item.destination && 'hover:border-stone-600 hover:bg-stone-800/80'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          PRIORITY_DOT[item.tier] ?? 'bg-stone-500'
        )}
      />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-stone-200">{item.label}</span>{' '}
        {item.context ? (
          <span className="hidden truncate text-[10px] text-stone-500 sm:block">
            {item.context}
          </span>
        ) : null}
      </span>
    </span>
  )

  if (!item.destination) return content

  return (
    <Link href={item.destination} className="shrink-0 no-underline">
      {content}
    </Link>
  )
}

function AttentionTickerRow({
  category,
  items,
  motionEnabled,
}: {
  category: RailCategory
  items: ContextualRailItem[]
  motionEnabled: boolean
}) {
  const config = TICKER_CONFIG[category]
  const colors = CATEGORY_COLORS[category]
  const { scrollRef } = useAutoScroll({
    tier: config.tier,
    itemCount: items.length,
    enabled: motionEnabled && items.length > 1,
    direction: config.direction,
  })
  return (
    <section
      data-attention-ticker={category}
      aria-label={`${CATEGORY_LABELS[category]} attention ticker`}
      className="grid min-h-12 grid-cols-[104px_minmax(0,1fr)] items-center border-t border-stone-800/55 sm:grid-cols-[136px_minmax(0,1fr)]"
    >
      <div className="flex min-w-0 items-center gap-2 px-3">
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 shrink-0 rounded-full', colors.bg, colors.text)}
        />
        <span
          className={cn(
            'truncate text-[10px] font-semibold uppercase tracking-[0.14em]',
            colors.text
          )}
        >
          {CATEGORY_LABELS[category]}
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-stone-600">{items.length}</span>
        <span aria-hidden="true" className="hidden text-[10px] text-stone-700 sm:inline">
          {config.direction === 'forward' ? '→' : '←'}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'flex min-w-0 items-center gap-2 overflow-x-auto px-2 py-1.5 scrollbar-hide',
          'overscroll-x-contain touch-pan-x',
          '[mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-10px),transparent)]'
        )}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <TickerItem key={`${item.definitionId}-${item.destination}`} item={item} />
          ))
        ) : (
          <span className="px-2 text-xs text-stone-600">clear</span>
        )}
      </div>
    </section>
  )
}

export function AttentionDeck({
  data,
  onCollapse,
}: {
  data: ContextualRailData
  onCollapse: () => void
}) {
  const [motionEnabled, setMotionEnabled] = useState(true)

  return (
    <section
      aria-label="ChefFlow attention system"
      data-cf-attention-system="dashboard"
      className="overflow-hidden border-y border-stone-800/70 bg-stone-950/95 shadow-lg shadow-black/15 backdrop-blur-md"
    >
      <header className="flex min-h-11 items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-200">
              Attention
            </span>
            <span className="text-[10px] text-stone-600">8 live channels</span>
          </div>
          <p className="mt-0.5 hidden text-[10px] text-stone-500 sm:block">
            What is ready, changing, risky, and actionable across ChefFlow.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={!motionEnabled}
          onClick={() => setMotionEnabled((value) => !value)}
          className="min-h-9 rounded-lg border border-stone-800 px-3 text-[11px] font-medium text-stone-400 hover:bg-stone-900 hover:text-stone-200"
        >
          {motionEnabled ? 'Pause motion' : 'Resume motion'}
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="min-h-9 rounded-lg px-3 text-[11px] font-medium text-stone-500 hover:bg-stone-900 hover:text-stone-200"
          aria-label="Collapse attention system"
        >
          Collapse
        </button>
      </header>

      <div>
        {RAIL_CATEGORIES.map((category) => (
          <AttentionTickerRow
            key={category}
            category={category}
            items={data.categories[category]?.items ?? []}
            motionEnabled={motionEnabled}
          />
        ))}
      </div>
    </section>
  )
}
