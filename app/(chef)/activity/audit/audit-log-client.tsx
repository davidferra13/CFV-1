'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import type { RecentChangeEntry, AuditEntityType } from '@/lib/audit-trail/surface-actions'
import { fetchRecentChanges } from '@/lib/audit-trail/surface-actions'
import { ChangeDiff } from '@/components/audit-trail/change-diff'

type AuditLogClientProps = {
  entries: RecentChangeEntry[]
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

const ACTION_STYLES: Record<string, string> = {
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const PAGE_SIZE = 25

export function AuditLogClient({ entries }: AuditLogClientProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | AuditEntityType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()
  const [liveEntries, setLiveEntries] = useState(entries)

  const handleRefresh = () => {
    startRefresh(async () => {
      try {
        const fresh = await fetchRecentChanges(200)
        setLiveEntries(fresh)
        setPage(0)
      } catch (err) {
        console.error('Refresh failed:', err)
      }
    })
  }

  const availableTypes = useMemo(() => {
    const types = new Set(liveEntries.map((e) => e.entityType))
    return Array.from(types).sort() as AuditEntityType[]
  }, [liveEntries])

  const filtered = useMemo(() => {
    let result = liveEntries

    if (typeFilter !== 'all') {
      result = result.filter((e) => e.entityType === typeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          (e.entityLabel ?? '').toLowerCase().includes(q) ||
          e.userName.toLowerCase().includes(q)
      )
    }

    return result
  }, [liveEntries, typeFilter, searchQuery])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search changes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(0)
            }}
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg px-3 py-2 text-sm font-medium bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => {
            setTypeFilter('all')
            setPage(0)
          }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            typeFilter === 'all'
              ? 'bg-amber-600 text-white'
              : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
          }`}
        >
          All ({liveEntries.length})
        </button>
        {availableTypes.map((type) => {
          const count = liveEntries.filter((e) => e.entityType === type).length
          return (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type)
                setPage(0)
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              {ENTITY_TYPE_LABELS[type]} ({count})
            </button>
          )
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 px-6 py-12 text-center">
          <p className="text-stone-500">
            {searchQuery ? 'No changes matching your search.' : 'No audit records found.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/80 text-left text-stone-400">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Change</th>
                  <th className="px-4 py-3 font-medium">Who</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((entry, idx) => {
                  const link = entityLink(entry.entityType, entry.entityId)
                  const isExpanded = expandedId === entry.id
                  const hasChanges = entry.changes.length > 0

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-stone-800/50 ${
                        idx % 2 === 0 ? 'bg-stone-900/30' : 'bg-stone-900/60'
                      } ${hasChanges ? 'cursor-pointer' : ''} hover:bg-stone-800/50 transition-colors`}
                      onClick={
                        hasChanges
                          ? () => setExpandedId(isExpanded ? null : entry.id)
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                        <span title={formatTimestamp(entry.timestamp)}>
                          {relativeTime(entry.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ENTITY_TYPE_COLORS[entry.entityType]}`}
                        >
                          {ENTITY_TYPE_LABELS[entry.entityType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {link ? (
                          <Link
                            href={link}
                            className="text-brand-500 hover:text-brand-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entry.entityLabel || entry.entityId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-stone-300">
                            {entry.entityLabel || entry.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={ACTION_STYLES[entry.action] ?? 'text-stone-200'}>
                          {entry.summary}
                        </span>
                        {isExpanded && entry.changes.length > 0 && (
                          <ChangeDiff changes={entry.changes} />
                        )}
                        {!isExpanded && hasChanges && (
                          <span className="ml-2 text-xs text-stone-600">
                            ({entry.changes.length} fields)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                        {entry.userName}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-600">
                Page {page + 1} of {totalPages} ({filtered.length} records)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-md px-3 py-1.5 text-sm bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md px-3 py-1.5 text-sm bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
