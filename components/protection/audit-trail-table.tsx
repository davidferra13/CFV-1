'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { AuditEntry } from '@/lib/protection/audit-trail-actions'

const TYPE_FILTERS = ['all', 'event', 'quote', 'ledger'] as const
type TypeFilter = (typeof TYPE_FILTERS)[number]

const TYPE_COLORS: Record<AuditEntry['entity_type'], string> = {
  event: 'bg-blue-500/15 text-blue-400',
  quote: 'bg-purple-500/15 text-purple-400',
  ledger: 'bg-emerald-500/15 text-emerald-400',
}

const TYPE_LABELS: Record<AuditEntry['entity_type'], string> = {
  event: 'Event',
  quote: 'Quote',
  ledger: 'Ledger',
}

function entityLink(entry: AuditEntry): string | null {
  switch (entry.entity_type) {
    case 'event':
      return `/events/${entry.entity_id}`
    case 'quote':
      return `/quotes/${entry.entity_id}`
    case 'ledger':
      // Ledger entity_id is the event_id if present, otherwise the ledger entry id
      return `/finance/ledger`
    default:
      return null
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function AuditTrailTable({ entries }: { entries: AuditEntry[] }) {
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return entries
    return entries.filter((e) => e.entity_type === activeFilter)
  }, [entries, activeFilter])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-amber-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
            }`}
          >
            {filter === 'all' ? 'All' : TYPE_LABELS[filter]}
            {filter !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({entries.filter((e) => e.entity_type === filter).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 px-6 py-12 text-center">
          <p className="text-stone-500">No audit records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900/80 text-left text-stone-400">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => {
                const link = entityLink(entry)
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-stone-800/50 ${
                      idx % 2 === 0 ? 'bg-stone-900/30' : 'bg-stone-900/60'
                    } hover:bg-stone-800/50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                      <span title={new Date(entry.timestamp).toLocaleString()}>
                        {relativeTime(entry.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[entry.entity_type]}`}
                      >
                        {TYPE_LABELS[entry.entity_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {link ? (
                        <Link
                          href={link}
                          className="text-amber-500 hover:text-amber-400 hover:underline"
                        >
                          {entry.entity_label || entry.entity_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-stone-300">
                          {entry.entity_label || entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-200 font-mono text-xs">{entry.action}</td>
                    <td className="px-4 py-3 text-stone-400 max-w-xs truncate">
                      {entry.details || '\u2014'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-stone-600">
        Showing {filtered.length} of {entries.length} records
      </p>
    </div>
  )
}
