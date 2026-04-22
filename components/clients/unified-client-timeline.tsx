'use client'

// Unified Client Timeline component
// Renders a merged chronological feed of events, inquiries, messages,
// payments, and reviews for a single client.

import Link from 'next/link'
import { useState, memo } from 'react'
import type { UnifiedTimelineItem } from '@/lib/clients/unified-timeline'
import { SOURCE_CONFIG } from '@/lib/clients/unified-timeline-utils'

interface UnifiedClientTimelineProps {
  items: UnifiedTimelineItem[]
}

const INITIAL_SHOW = 20

export function UnifiedClientTimeline({ items }: UnifiedClientTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, INITIAL_SHOW)

  if (items.length === 0) {
    return <div className="text-sm text-stone-400 py-4 text-center">No activity recorded yet</div>
  }

  return (
    <div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-700" aria-hidden="true" />

        <div className="space-y-0">
          {visible.map((item, idx) => (
            <TimelineRow key={item.id} item={item} isLast={idx === visible.length - 1} />
          ))}
        </div>
      </div>

      {items.length > INITIAL_SHOW && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-xs text-brand-500 hover:text-brand-400 font-medium"
        >
          Show {items.length - INITIAL_SHOW} more entries
        </button>
      )}
    </div>
  )
}

// Memoized: rendered in .map() for each unified timeline entry. Receives stable data objects.
const TimelineRow = memo(function TimelineRow({
  item,
  isLast,
}: {
  item: UnifiedTimelineItem
  isLast: boolean
}) {
  const cfg = SOURCE_CONFIG[item.source]
  const timeLabel = formatTimeLabel(item.timestamp)

  const inner = (
    <div
      className={`flex items-start gap-3 py-2 pl-6 pr-1 rounded-md hover:bg-stone-800 transition-colors group ${isLast ? '' : ''}`}
    >
      {/* Dot */}
      <div
        className="absolute left-[3px] mt-[6px] h-2 w-2 rounded-full border-2 border-white bg-stone-300 group-hover:bg-brand-400 transition-colors"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 ${cfg.className}`}>
            {cfg.label}
          </span>
          {item.actor && item.actor !== 'system' && (
            <span
              className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                item.actor === 'client'
                  ? 'bg-brand-900 text-brand-700'
                  : 'bg-emerald-900 text-emerald-700'
              }`}
            >
              {item.actor === 'client' ? 'Client' : 'You'}
            </span>
          )}
          {item.badges?.map((badge) => (
            <span
              key={badge}
              className="text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 bg-stone-800 text-stone-300"
            >
              {badge}
            </span>
          ))}
          <span className="text-xs text-stone-300 truncate">{item.summary}</span>
        </div>
        {item.detail && <p className="text-xs text-stone-400 mt-0.5 truncate">{item.detail}</p>}
        {item.explanation && <p className="text-xxs text-stone-500 mt-1">{item.explanation}</p>}
      </div>

      <span className="text-xs-tight text-stone-400 shrink-0 mt-0.5">{timeLabel}</span>
    </div>
  )

  if (item.href) {
    return (
      <div className="relative" data-ledger-row data-ledger-source={item.source}>
        <Link href={item.href}>{inner}</Link>
      </div>
    )
  }
  return (
    <div className="relative" data-ledger-row data-ledger-source={item.source}>
      {inner}
    </div>
  )
})

function formatTimeLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  })
}
