// Queue List — Client component with filtering state
// Receives server-rendered items, filters client-side.

'use client'

import { useState } from 'react'
import type { QueueItem, QueueDomain, QueueUrgency } from '@/lib/queue/types'
import { QueueItemRow } from './queue-item-row'
import { QueueFilters } from './queue-filters'

interface Props {
  items: QueueItem[]
  /** Max items to show before "View all" link. 0 = unlimited. */
  limit?: number
  /** Show filter controls */
  showFilters?: boolean
}

export function QueueList({ items, limit = 0, showFilters = true }: Props) {
  const [domainFilter, setDomainFilter] = useState<QueueDomain | 'all'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<QueueUrgency | 'all'>('all')

  const filtered = items.filter(item => {
    if (domainFilter !== 'all' && item.domain !== domainFilter) return false
    if (urgencyFilter !== 'all' && item.urgency !== urgencyFilter) return false
    return true
  })

  const displayed = limit > 0 ? filtered.slice(0, limit) : filtered
  const hasMore = limit > 0 && filtered.length > limit

  return (
    <div className="space-y-4">
      {showFilters && items.length > 3 && (
        <QueueFilters
          items={items}
          domainFilter={domainFilter}
          urgencyFilter={urgencyFilter}
          onDomainChange={setDomainFilter}
          onUrgencyChange={setUrgencyFilter}
        />
      )}
      <div className="space-y-2">
        {displayed.map(item => (
          <QueueItemRow key={item.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-stone-400 py-8 text-sm">
            No items match the current filters.
          </p>
        )}
      </div>
      {hasMore && (
        <p className="text-center text-sm text-stone-500">
          Showing {displayed.length} of {filtered.length} items.{' '}
          <a href="/queue" className="text-brand-600 hover:text-brand-700 font-medium">
            View all
          </a>
        </p>
      )}
    </div>
  )
}
