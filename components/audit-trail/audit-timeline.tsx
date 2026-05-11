'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChangeDiff } from './change-diff'
import type { AuditHistoryEntry } from '@/lib/audit-trail/surface-actions'

type AuditTimelineProps = {
  entries: AuditHistoryEntry[]
  title?: string
  maxVisible?: number
}

const ACTION_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  created: {
    dot: 'bg-emerald-500',
    label: 'Created',
    badge: 'bg-emerald-950 text-emerald-400',
  },
  updated: {
    dot: 'bg-brand-500',
    label: 'Updated',
    badge: 'bg-brand-950 text-brand-400',
  },
  deleted: {
    dot: 'bg-red-500',
    label: 'Deleted',
    badge: 'bg-red-950 text-red-400',
  },
  transition: {
    dot: 'bg-blue-500',
    label: 'Transition',
    badge: 'bg-blue-950 text-blue-400',
  },
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

export function AuditTimeline({
  entries,
  title = 'Change History',
  maxVisible = 10,
}: AuditTimelineProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const visible = expanded ? entries : entries.slice(0, maxVisible)
  const hasMore = entries.length > maxVisible

  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">{title}</h2>
        <p className="text-sm text-stone-500">No changes recorded yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
        <span className="text-xs text-stone-500">
          {entries.length} {entries.length === 1 ? 'change' : 'changes'}
        </span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-700" />

        <div className="space-y-0">
          {visible.map((entry) => {
            const style = ACTION_STYLES[entry.action] ?? ACTION_STYLES.updated
            const isExpanded = expandedEntries.has(entry.id)
            const hasChanges = entry.changes.length > 0

            return (
              <div key={entry.id} className="relative pl-7 pb-4">
                {/* Dot */}
                <div
                  className={`absolute left-0.5 top-1.5 w-3 h-3 rounded-full border-2 border-stone-900 ${style.dot}`}
                />

                {/* Content */}
                <div
                  className={`rounded-lg border border-stone-800/50 p-3 transition-colors ${
                    hasChanges ? 'cursor-pointer hover:bg-stone-800/30' : ''
                  }`}
                  onClick={hasChanges ? () => toggleEntry(entry.id) : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${style.badge}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                        {entry.userName}
                      </span>
                      {hasChanges && !isExpanded && (
                        <span className="text-xs text-stone-600">
                          ({entry.changes.length} {entry.changes.length === 1 ? 'field' : 'fields'})
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs text-stone-500 whitespace-nowrap"
                      title={formatTimestamp(entry.timestamp)}
                    >
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm text-stone-200">{entry.summary}</p>

                  {isExpanded && <ChangeDiff changes={entry.changes} />}
                  {!isExpanded && hasChanges && (
                    <ChangeDiff changes={entry.changes} compact />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-brand-500 hover:text-brand-400 transition-colors"
        >
          {expanded
            ? 'Show less'
            : `Show ${entries.length - maxVisible} more changes`}
        </button>
      )}
    </Card>
  )
}
