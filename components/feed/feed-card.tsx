'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { FeedItem } from '@/lib/feed/aggregation'
import { isAggregated } from '@/lib/feed/aggregation'
import { RailItemRow } from '@/components/rail/rail-item-row'
import type { GodModeResolvedItem, RailTier } from '@/lib/discovery/god-mode-types'
import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'
import { ArrowRight, ChevronDown } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

const MAX_VISIBLE_GROUPS = 6

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

type SignalGroup = {
  key: string
  label: string
  summary: string
  source: string
  urgency: 'critical' | 'action' | 'watch' | 'quiet'
  maxScore: number
  representative: UniversalRailItem
  items: UniversalRailItem[]
}

const URGENCY_CLASS: Record<SignalGroup['urgency'], string> = {
  critical: 'bg-red-500',
  action: 'bg-amber-500',
  watch: 'bg-sky-500',
  quiet: 'bg-stone-500',
}

const URGENCY_LABEL: Record<SignalGroup['urgency'], string> = {
  critical: 'Now',
  action: 'Action',
  watch: 'Watch',
  quiet: 'FYI',
}

function flattenFeedItem(item: FeedItem): UniversalRailItem[] {
  return isAggregated(item) ? item.items : [item]
}

function actionNounFor(item: UniversalRailItem): string {
  const text =
    `${item.label} ${item.sublabel ?? ''} ${item.href ?? ''} ${item.category}`.toLowerCase()

  if (text.includes('invoice') || text.includes('payment') || text.includes('payout')) {
    return 'money signals'
  }
  if (text.includes('inbox') || text.includes('message') || text.includes('reply')) {
    return 'messages to answer'
  }
  if (text.includes('event') || text.includes('calendar') || text.includes('schedule')) {
    return 'calendar signals'
  }
  if (text.includes('prep') || text.includes('shopping') || text.includes('task')) {
    return 'prep work'
  }
  if (text.includes('client') || text.includes('follow')) {
    return 'client follow-ups'
  }
  if (text.includes('lead') || text.includes('inquiry') || text.includes('opportun')) {
    return 'growth opportunities'
  }

  return 'operating signals'
}

function sourceFor(item: UniversalRailItem): string {
  const category = item.category.replace(/[_-]/g, ' ')
  if (!category.trim()) return 'Dashboard'
  return category
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function urgencyFor(score: number): SignalGroup['urgency'] {
  if (score >= 80) return 'critical'
  if (score >= 50) return 'action'
  if (score >= 20) return 'watch'
  return 'quiet'
}

function buildSignalGroups(items: FeedItem[]): SignalGroup[] {
  const groups = new Map<string, UniversalRailItem[]>()

  for (const feedItem of items) {
    for (const item of flattenFeedItem(feedItem)) {
      const urgency = urgencyFor(item.score)
      const noun = actionNounFor(item)
      const key = urgency === 'critical' ? `critical::${noun}` : `${item.category}::${noun}`
      const existing = groups.get(key)
      if (existing) existing.push(item)
      else groups.set(key, [item])
    }
  }

  return Array.from(groups.entries())
    .map(([key, groupItems]) => {
      const sorted = [...groupItems].sort((a, b) => b.score - a.score)
      const representative = sorted[0]
      const urgency = urgencyFor(representative.score)
      const noun = actionNounFor(representative)
      const count = sorted.length
      const label = count === 1 ? representative.label : `${count} ${noun}`
      const summary =
        count === 1
          ? representative.sublabel || 'Open the signal for the next action.'
          : `${representative.label}${representative.sublabel ? ` - ${representative.sublabel}` : ''}`

      return {
        key,
        label,
        summary,
        source: sourceFor(representative),
        urgency,
        maxScore: representative.score,
        representative,
        items: sorted,
      }
    })
    .sort((a, b) => b.maxScore - a.maxScore)
}

export function FeedCard({
  items,
  maxVisibleGroups = MAX_VISIBLE_GROUPS,
  viewAllHref = '/dashboard/activity',
}: {
  items: FeedItem[]
  maxVisibleGroups?: number
  viewAllHref?: string
}) {
  if (items.length === 0) {
    return (
      <section className="dashboard-section-card rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-300">
          Activity Feed
        </h2>
        <p className="text-sm text-stone-500">No active signals</p>
      </section>
    )
  }

  const groups = buildSignalGroups(items)
  const visible = groups.slice(0, maxVisibleGroups)
  const hiddenCount = groups.length - maxVisibleGroups
  const totalSignals = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <section className="dashboard-section-card rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-300">
            Activity Feed
          </h2>
          <p className="text-xs text-stone-500">
            {totalSignals} signal{totalSignals === 1 ? '' : 's'} grouped into {groups.length}{' '}
            readout{groups.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 transition-colors hover:text-stone-300"
        >
          View all signals
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="space-y-1.5">
        {visible.map((group) => (
          <SignalGroupCard key={group.key} group={group} />
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-3 text-center">
          <Link
            href={viewAllHref}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            {hiddenCount} more grouped readout{hiddenCount === 1 ? '' : 's'}
          </Link>
        </div>
      )}
    </section>
  )
}

function SignalGroupCard({ group }: { group: SignalGroup }) {
  const [expanded, setExpanded] = useState(group.urgency === 'critical')
  const firstHref = group.representative.href

  return (
    <div className="rounded-lg border border-stone-800/60 bg-stone-900/40">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-stone-800/50"
          aria-expanded={expanded}
        >
          <span className={cn('h-8 w-1 rounded-full', URGENCY_CLASS[group.urgency])} />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-sm font-semibold text-stone-200">{group.label}</span>
              <span className="rounded-full border border-stone-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                {URGENCY_LABEL[group.urgency]}
              </span>
              <span className="text-[11px] text-stone-500">{group.source}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-stone-500">{group.summary}</span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-stone-500 transition-transform',
              expanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
        {firstHref && (
          <Link
            href={firstHref}
            className="hidden items-center border-l border-stone-800 px-3 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-800/50 hover:text-stone-200 sm:flex"
          >
            Open
          </Link>
        )}
      </div>

      {expanded && (
        <div className="space-y-1 border-t border-stone-800/60 p-2">
          {group.items.map((item, index) => (
            <RailItemRow
              key={`${item.definitionId}-${index}`}
              item={toResolvedItem(item)}
              tier={inferTierLabel(item.score)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
