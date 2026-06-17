'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns'
import { getChannelMeta } from '@/lib/communication/channel-meta'
import { Badge } from '@/components/ui/badge'
import type { UnifiedThreadItem } from '@/lib/communication/unified-thread-types'

interface UnifiedThreadViewProps {
  items: UnifiedThreadItem[]
  hasMore: boolean
  onLoadMore?: () => void
  loading?: boolean
}

function getTimeGroupLabel(timestamp: string): string {
  const date = new Date(timestamp)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return 'This Week'
  return format(date, 'MMMM d, yyyy')
}

function ChannelIcon({ channel }: { channel: string }) {
  const meta = getChannelMeta(channel)
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${meta.textColor}`}
      title={meta.label}
    >
      {meta.shortLabel}
    </span>
  )
}

function ThreadBubble({ item }: { item: UnifiedThreadItem }) {
  const isOutbound = item.direction === 'outbound'
  const isNote = item.type === 'note'

  // Strip email subject lines from content display
  const displayContent = item.content.replace(/^(Re:|Fwd:|Subject:)\s*/gi, '').trim()

  if (isNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-md rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ChannelIcon channel="internal_note" />
            <span className="text-xs text-stone-500">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-stone-300 whitespace-pre-wrap">{displayContent}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOutbound
            ? 'bg-brand-600/20 border border-brand-500/30 text-stone-100'
            : 'bg-stone-800 border border-stone-700 text-stone-200'
        }`}
      >
        {/* Sender + Channel */}
        <div className="flex items-center gap-2 mb-1">
          {item.senderName && (
            <span className="text-xs font-medium text-stone-400 truncate max-w-[200px]">
              {item.senderName}
            </span>
          )}
          <ChannelIcon channel={item.channel} />
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {displayContent.length > 500 ? displayContent.slice(0, 500) + '...' : displayContent}
        </p>

        {/* Timestamp + linked entity */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-stone-500">
            {format(new Date(item.timestamp), 'h:mm a')}
          </span>
          {!item.read && (
            <span className="inline-block w-2 h-2 rounded-full bg-brand-500" title="Unread" />
          )}
          {item.linkedEntityType && (
            <Badge variant="default" className="text-xs py-0 px-1.5">
              {item.linkedEntityType === 'inquiry' ? 'Inquiry' : 'Event'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

export function UnifiedThreadView({ items, hasMore, onLoadMore, loading }: UnifiedThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Group items by date
  const groups: { label: string; items: UnifiedThreadItem[] }[] = []
  let currentGroup: string | null = null

  // Items are newest-first, reverse for display (oldest at top)
  const displayItems = [...items].reverse()

  for (const item of displayItems) {
    const label = getTimeGroupLabel(item.timestamp)
    if (label !== currentGroup) {
      currentGroup = label
      groups.push({ label, items: [item] })
    } else {
      groups[groups.length - 1].items.push(item)
    }
  }

  // Scroll to bottom on initial load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Infinite scroll: observe sentinel at top for loading more
  useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, loading])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-500">
        <div className="text-center">
          <p className="text-lg mb-1">No conversations yet</p>
          <p className="text-sm">Send a message to start the thread</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="overflow-y-auto flex-1 px-4 py-3" style={{ maxHeight: '60vh' }}>
      {/* Load more sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-3">
          {loading ? (
            <span className="text-xs text-stone-500">Loading...</span>
          ) : (
            <button onClick={onLoadMore} className="text-xs text-brand-500 hover:text-brand-400">
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          {/* Date divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-stone-700" />
            <span className="text-xs font-medium text-stone-500 shrink-0">{group.label}</span>
            <div className="flex-1 h-px bg-stone-700" />
          </div>

          {group.items.map((item) => (
            <ThreadBubble key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  )
}
