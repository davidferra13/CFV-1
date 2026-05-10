'use client'

// Unified Client Timeline component
// Renders a merged chronological feed of events, inquiries, messages,
// payments, and reviews for a single client.
// Per-source filtering, preset groups, and text search.

import Link from 'next/link'
import { useState, useMemo, memo } from 'react'
import type { UnifiedTimelineItem } from '@/lib/clients/unified-timeline'
import {
  SOURCE_CONFIG,
  COMMUNICATION_SOURCES,
  type TimelineItemSource,
} from '@/lib/clients/unified-timeline-utils'

type FilterPreset = 'all' | 'comms'

interface UnifiedClientTimelineProps {
  items: UnifiedTimelineItem[]
  /** When 'comms', default to the communication sources only. */
  defaultFilter?: FilterPreset
}

const INITIAL_SHOW = 20
const ALL_SOURCES = Object.keys(SOURCE_CONFIG) as TimelineItemSource[]

function defaultSources(preset: FilterPreset): Set<TimelineItemSource> {
  if (preset === 'comms') return new Set(COMMUNICATION_SOURCES)
  return new Set(ALL_SOURCES)
}

export function UnifiedClientTimeline({
  items,
  defaultFilter = 'all',
}: UnifiedClientTimelineProps) {
  const [activeSources, setActiveSources] = useState<Set<TimelineItemSource>>(() =>
    defaultSources(defaultFilter)
  )
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Sources that actually appear in the data
  const presentSources = useMemo(() => {
    const s = new Set<TimelineItemSource>()
    for (const item of items) s.add(item.source as TimelineItemSource)
    return s
  }, [items])

  const isAllActive =
    activeSources.size === presentSources.size &&
    [...presentSources].every((s) => activeSources.has(s))
  const isCommsActive =
    COMMUNICATION_SOURCES.every((s) => !presentSources.has(s) || activeSources.has(s)) &&
    [...activeSources].every((s) => COMMUNICATION_SOURCES.includes(s))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((item) => {
      if (!activeSources.has(item.source as TimelineItemSource)) return false
      if (q && !(item.summary?.toLowerCase().includes(q) || item.detail?.toLowerCase().includes(q)))
        return false
      return true
    })
  }, [items, activeSources, search])

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_SHOW)

  function toggleSource(src: TimelineItemSource) {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(src)) next.delete(src)
      else next.add(src)
      return next
    })
    setShowAll(false)
  }

  function selectPreset(preset: FilterPreset) {
    setActiveSources(
      preset === 'comms'
        ? new Set(COMMUNICATION_SOURCES.filter((s) => presentSources.has(s)))
        : new Set(presentSources)
    )
    setShowAll(false)
  }

  if (items.length === 0) {
    return <div className="text-sm text-stone-400 py-4 text-center">No activity recorded yet</div>
  }

  return (
    <div>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setShowAll(false)
        }}
        placeholder="Search timeline..."
        className="w-full mb-2 px-3 py-1.5 text-xs bg-stone-800 text-stone-200 rounded-md border border-stone-700 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-brand-600"
      />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => selectPreset('all')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            isAllActive
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => selectPreset('comms')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
            isCommsActive && !isAllActive
              ? 'bg-brand-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          Comms
        </button>
        {ALL_SOURCES.filter((s) => presentSources.has(s)).map((src) => {
          const cfg = SOURCE_CONFIG[src]
          return (
            <button
              key={src}
              onClick={() => toggleSource(src)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                activeSources.has(src)
                  ? cfg.className
                  : 'bg-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Count */}
      <div className="text-xxs text-stone-500 mb-2">
        Showing {filtered.length} of {items.length}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-stone-400 py-4 text-center">No matching activity</div>
      ) : (
        <>
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-700"
              aria-hidden="true"
            />

            <div className="space-y-0">
              {visible.map((item, idx) => (
                <TimelineRow key={item.id} item={item} isLast={idx === visible.length - 1} />
              ))}
            </div>
          </div>

          {filtered.length > INITIAL_SHOW && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 text-xs text-brand-500 hover:text-brand-400 font-medium"
            >
              Show {filtered.length - INITIAL_SHOW} more entries
            </button>
          )}
        </>
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
  const cfg = SOURCE_CONFIG[item.source] ?? SOURCE_CONFIG.message
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
