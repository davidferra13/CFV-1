// Inbox Feed — Client component with source filters and chronological feed
'use client'

import { useState } from 'react'
import { InboxFilters } from './inbox-filters'
import { InboxItemCard } from './inbox-item-card'
import type { UnifiedInboxItem, InboxSource, InboxStats } from '@/lib/inbox/types'

interface InboxFeedProps {
  items: UnifiedInboxItem[]
  stats: InboxStats
}

export function InboxFeed({ items, stats }: InboxFeedProps) {
  const [activeSources, setActiveSources] = useState<InboxSource[]>([
    'chat', 'message', 'wix', 'notification',
  ])

  const handleToggle = (source: InboxSource) => {
    setActiveSources((prev) => {
      if (prev.includes(source)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev
        return prev.filter((s) => s !== source)
      }
      return [...prev, source]
    })
  }

  const filteredItems = items.filter((item) =>
    activeSources.includes(item.source as InboxSource)
  )

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <span>{stats.total} items this week</span>
          {stats.unread > 0 && (
            <span className="text-brand-600 font-medium">{stats.unread} unread</span>
          )}
        </div>
      </div>

      {/* Source filters */}
      <InboxFilters
        activeSources={activeSources}
        onToggle={handleToggle}
        stats={stats.bySource}
      />

      {/* Feed */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-lg">Nothing here yet</p>
            <p className="text-sm mt-1">
              Activity from chat, messages, Wix forms, and notifications will appear here.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <InboxItemCard key={`${item.source}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </div>
  )
}
