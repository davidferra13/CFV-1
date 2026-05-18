'use client'

import type { FeedItem } from '@/lib/feed/aggregation'
import { isAggregated } from '@/lib/feed/aggregation'
import { AggregatedItemCard } from './aggregated-item'
import { RailItemRow } from '@/components/rail/rail-item-row'
import type { GodModeResolvedItem, RailTier } from '@/lib/discovery/god-mode-types'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'

const MAX_VISIBLE = 8

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

function inferTierLabel(score: number): 'critical' | 'action' | 'awareness' | 'opportunity' {
  if (score >= 80) return 'critical'
  if (score >= 50) return 'action'
  if (score >= 20) return 'awareness'
  return 'opportunity'
}

export function FeedCard({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 px-5 py-6">
        <h2 className="text-sm font-semibold text-stone-300 tracking-wide uppercase mb-4">
          Activity Feed
        </h2>
        <p className="text-sm text-stone-500">No active signals</p>
      </section>
    )
  }

  const visible = items.slice(0, MAX_VISIBLE)
  const hasMore = items.length > MAX_VISIBLE

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/50 px-5 py-6">
      <h2 className="text-sm font-semibold text-stone-300 tracking-wide uppercase mb-4">
        Activity Feed
      </h2>

      <div className="space-y-1.5">
        {visible.map((item, idx) => {
          if (isAggregated(item)) {
            return <AggregatedItemCard key={`agg-${item.groupKey}`} group={item} />
          }

          const railItem = item as UniversalRailItem
          const tier = inferTierLabel(railItem.score)
          return (
            <RailItemRow
              key={`${railItem.definitionId}-${idx}`}
              item={toResolvedItem(railItem)}
              tier={tier}
            />
          )
        })}
      </div>

      {hasMore && (
        <div className="mt-3 text-center">
          <a
            href="/dashboard/activity"
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            View all {items.length} signals
          </a>
        </div>
      )}
    </section>
  )
}
