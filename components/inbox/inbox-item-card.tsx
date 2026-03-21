// Inbox Item Card - Renders a single unified inbox item
// Different visual treatments per source type.
import Link from 'next/link'
import type { UnifiedInboxItem } from '@/lib/inbox/types'

interface InboxItemCardProps {
  item: UnifiedInboxItem
}

export function InboxItemCard({ item }: InboxItemCardProps) {
  const href = getItemHref(item)
  const timeAgo = formatTimeAgo(item.activity_at)

  return (
    <Link
      href={href}
      className={`
        block border rounded-lg p-3 transition-colors hover:bg-stone-50
        ${!item.is_read ? 'border-l-4 border-l-brand-500 bg-brand-50/30' : 'border-stone-200'}
      `}
    >
      <div className="flex items-start gap-3">
        <SourceIcon source={item.source} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <SourceBadge source={item.source} contentType={item.content_type} />
            <span className="text-xs text-stone-400 shrink-0">{timeAgo}</span>
          </div>
          <p className="text-sm text-stone-800 line-clamp-2">
            {item.preview || 'No preview available'}
          </p>
        </div>
        {!item.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" />}
      </div>
    </Link>
  )
}

function getItemHref(item: UnifiedInboxItem): string {
  switch (item.source) {
    case 'chat':
      // For conversations, the item.id IS the conversation id
      return `/chat/${item.id}`
    case 'message':
      if (item.inquiry_id) return `/inquiries/${item.inquiry_id}`
      if (item.event_id) return `/events/${item.event_id}`
      return '/inquiries'
    case 'wix':
      if (item.inquiry_id) return `/inquiries/${item.inquiry_id}`
      return `/wix-submissions/${item.id}`
    case 'notification':
      if (item.inquiry_id) return `/inquiries/${item.inquiry_id}`
      if (item.event_id) return `/events/${item.event_id}`
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

function SourceIcon({ source }: { source: string }) {
  const icons: Record<string, string> = {
    chat: '💬',
    message: '✉️',
    wix: '🌐',
    notification: '🔔',
  }
  return (
    <span className="text-lg shrink-0 mt-0.5" aria-hidden>
      {icons[source] || '📋'}
    </span>
  )
}

function SourceBadge({ source, contentType }: { source: string; contentType: string | null }) {
  const colors: Record<string, string> = {
    chat: 'bg-brand-900 text-brand-700',
    message: 'bg-emerald-900 text-emerald-700',
    wix: 'bg-purple-900 text-purple-700',
    notification: 'bg-amber-900 text-amber-700',
  }

  const labels: Record<string, string> = {
    chat: 'Chat',
    message: contentType || 'Message',
    wix: 'Wix Form',
    notification: contentType || 'Notification',
  }

  return (
    <span
      className={`text-xxs font-medium px-1.5 py-0.5 rounded ${colors[source] || 'bg-stone-100 text-stone-600'}`}
    >
      {labels[source]}
    </span>
  )
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
