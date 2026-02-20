'use client'

import Link from 'next/link'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'

interface ChefActivityFeedProps {
  entries: ChefActivityEntry[]
  compact?: boolean
}

export function ChefActivityFeed({ entries, compact = false }: ChefActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-sm">
        No activity recorded yet. Actions you take will appear here.
      </div>
    )
  }

  // Group by day
  const grouped = groupByDay(entries)

  return (
    <div className="space-y-4">
      {grouped.map(({ label, entries: dayEntries }) => (
        <div key={label}>
          {!compact && (
            <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
              {label}
            </div>
          )}
          <div className="space-y-1">
            {dayEntries.map(entry => (
              <ActivityRow key={entry.id} entry={entry} compact={compact} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivityRow({ entry, compact }: { entry: ChefActivityEntry; compact: boolean }) {
  const config = DOMAIN_CONFIG[entry.domain] || DOMAIN_CONFIG.operational
  const timeAgo = formatTimeAgo(entry.created_at)
  const href = getEntityHref(entry)

  const content = (
    <div className={`flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-50 transition-colors ${compact ? 'py-1.5' : ''}`}>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${config.bgColor} ${config.color}`}>
        {config.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-700 leading-snug">
          {entry.summary}
        </p>
        {!compact && entry.context && Object.keys(entry.context).length > 0 && (
          <ContextLine context={entry.context} />
        )}
      </div>
      <span className="text-xs text-stone-400 shrink-0 mt-0.5">{timeAgo}</span>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }
  return content
}

function ContextLine({ context }: { context: Record<string, unknown> }) {
  const parts: string[] = []

  if (context.client_name) parts.push(context.client_name as string)
  if (context.event_date) {
    const d = new Date(context.event_date as string)
    parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  if (context.guest_count) parts.push(`${context.guest_count} guests`)
  if (context.channel) parts.push(`via ${context.channel}`)
  if (context.amount_display) parts.push(context.amount_display as string)

  if (parts.length === 0) return null

  return (
    <p className="text-xs text-stone-400 mt-0.5 truncate">
      {parts.join(' | ')}
    </p>
  )
}

function getEntityHref(entry: ChefActivityEntry): string | null {
  const id = entry.entity_id
  if (!id) return null

  switch (entry.entity_type) {
    case 'event': return `/pipeline/events/${id}`
    case 'inquiry': return `/pipeline/inquiries/${id}`
    case 'quote': return `/pipeline/quotes/${id}`
    case 'menu': return `/culinary/menus/${id}`
    case 'recipe': return `/culinary/recipes/${id}`
    case 'client': return `/clients/${id}`
    default: return null
  }
}

function groupByDay(entries: ChefActivityEntry[]): { label: string; entries: ChefActivityEntry[] }[] {
  const groups = new Map<string, ChefActivityEntry[]>()

  for (const entry of entries) {
    const date = new Date(entry.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }))
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
