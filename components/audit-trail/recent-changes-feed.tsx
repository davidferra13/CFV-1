'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ChangeDiff } from './change-diff'
import type { RecentChangeEntry, AuditEntityType } from '@/lib/audit-trail/surface-actions'

type RecentChangesFeedProps = {
  entries: RecentChangeEntry[]
  showFilters?: boolean
}

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  event: 'Event',
  quote: 'Quote',
  menu: 'Menu',
  contract: 'Contract',
  client: 'Client',
  ledger: 'Ledger',
}

const ENTITY_TYPE_COLORS: Record<AuditEntityType, string> = {
  event: 'bg-blue-500/15 text-blue-400',
  quote: 'bg-purple-500/15 text-purple-400',
  menu: 'bg-amber-500/15 text-amber-400',
  contract: 'bg-teal-500/15 text-teal-400',
  client: 'bg-pink-500/15 text-pink-400',
  ledger: 'bg-emerald-500/15 text-emerald-400',
}

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-400',
  updated: 'text-brand-400',
  deleted: 'text-red-400',
  transition: 'text-blue-400',
}

function entityLink(entityType: AuditEntityType, entityId: string): string | null {
  switch (entityType) {
    case 'event':
      return `/events/${entityId}`
    case 'quote':
      return `/quotes/${entityId}`
    case 'menu':
      return `/menus/${entityId}`
    case 'contract':
      return `/contracts/${entityId}`
    case 'client':
      return `/clients/${entityId}`
    case 'ledger':
      return `/finance/ledger`
    default:
      return null
  }
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

type FilterType = 'all' | AuditEntityType

export function RecentChangesFeed({
  entries,
  showFilters = true,
}: RecentChangesFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const availableTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.entityType))
    return Array.from(types) as AuditEntityType[]
  }, [entries])

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((e) => e.entityType === filter)
  }, [entries, filter])

  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-800">
          <svg
            className="h-6 w-6 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <p className="text-stone-400">No recent changes recorded.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {showFilters && availableTypes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            All ({entries.length})
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              {ENTITY_TYPE_LABELS[type]} (
              {entries.filter((e) => e.entityType === type).length})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => {
          const link = entityLink(entry.entityType, entry.entityId)
          const isExpanded = expandedId === entry.id
          const hasChanges = entry.changes.length > 0

          return (
            <div
              key={entry.id}
              className={`rounded-lg border border-stone-800/50 p-3 transition-colors ${
                hasChanges ? 'cursor-pointer hover:bg-stone-800/30' : ''
              }`}
              onClick={hasChanges ? () => setExpandedId(isExpanded ? null : entry.id) : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${ENTITY_TYPE_COLORS[entry.entityType]}`}
                  >
                    {ENTITY_TYPE_LABELS[entry.entityType]}
                  </span>
                  {link && entry.entityLabel ? (
                    <Link
                      href={link}
                      className="text-sm text-brand-500 hover:text-brand-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.entityLabel}
                    </Link>
                  ) : entry.entityLabel ? (
                    <span className="text-sm text-stone-300">{entry.entityLabel}</span>
                  ) : null}
                </div>
                <span
                  className="text-xs text-stone-500 whitespace-nowrap"
                  title={formatTimestamp(entry.timestamp)}
                >
                  {relativeTime(entry.timestamp)}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <span className={`text-sm ${ACTION_COLORS[entry.action] ?? 'text-stone-300'}`}>
                  {entry.summary}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                <span>{entry.userName}</span>
                {hasChanges && !isExpanded && (
                  <span>
                    ({entry.changes.length} {entry.changes.length === 1 ? 'field' : 'fields'} changed)
                  </span>
                )}
              </div>

              {isExpanded && <ChangeDiff changes={entry.changes} />}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-stone-600">
        Showing {filtered.length} of {entries.length} changes
      </p>
    </div>
  )
}
