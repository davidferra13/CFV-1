'use client'

import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import type { ActivityEvent } from '@/lib/activity/types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import Link from 'next/link'

interface ClientActivityTimelineProps {
  chefActivity: ChefActivityEntry[]
  clientActivity: ActivityEvent[]
}

type TimelineEntry = {
  id: string
  source: 'chef' | 'client'
  description: string
  domain?: string
  created_at: string
  href?: string | null
}

const CLIENT_EVENT_DESCRIPTIONS: Record<string, string> = {
  portal_login: 'Logged into the portal',
  event_viewed: 'Viewed an event',
  quote_viewed: 'Viewed a quote',
  invoice_viewed: 'Viewed an invoice',
  proposal_viewed: 'Viewed a proposal',
  chat_message_sent: 'Sent a chat message',
  rsvp_submitted: 'Submitted an RSVP',
  form_submitted: 'Submitted a form',
  page_viewed: 'Visited the portal',
}

export function ClientActivityTimeline({
  chefActivity,
  clientActivity,
}: ClientActivityTimelineProps) {
  // Merge and sort by time
  const merged: TimelineEntry[] = [
    ...chefActivity.map((e) => ({
      id: e.id,
      source: 'chef' as const,
      description: e.summary,
      domain: e.domain,
      created_at: e.created_at,
      href: e.entity_id ? getEntityHref(e.entity_type, e.entity_id) : null,
    })),
    ...clientActivity.map((e) => ({
      id: e.id,
      source: 'client' as const,
      description: CLIENT_EVENT_DESCRIPTIONS[e.event_type] || e.event_type,
      created_at: e.created_at,
      href: null,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (merged.length === 0) {
    return (
      <div className="border border-stone-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-300 mb-2">Activity Timeline</h3>
        <p className="text-xs text-stone-400">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-stone-300 mb-3">Activity Timeline</h3>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {merged.slice(0, 30).map((entry) => (
          <TimelineRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const timeAgo = formatTimeAgo(entry.created_at)

  const badge =
    entry.source === 'chef'
      ? { bg: 'bg-emerald-900 text-emerald-700', label: 'You' }
      : { bg: 'bg-brand-900 text-brand-700', label: 'Client' }

  const domainBadge = entry.domain
    ? DOMAIN_CONFIG[entry.domain as keyof typeof DOMAIN_CONFIG]
    : null

  const inner = (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-stone-800 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 ${badge.bg}`}>
          {badge.label}
        </span>
        {domainBadge && (
          <span
            className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 ${domainBadge.bgColor} ${domainBadge.color}`}
          >
            {domainBadge.label}
          </span>
        )}
        <span className="text-stone-300 truncate">{entry.description}</span>
      </div>
      <span className="text-stone-400 shrink-0 ml-2">{timeAgo}</span>
    </div>
  )

  if (entry.href) {
    return <Link href={entry.href}>{inner}</Link>
  }
  return inner
}

function getEntityHref(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'event':
      return `/pipeline/events/${entityId}`
    case 'inquiry':
      return `/pipeline/inquiries/${entityId}`
    case 'quote':
      return `/pipeline/quotes/${entityId}`
    case 'menu':
      return `/culinary/menus/${entityId}`
    case 'recipe':
      return `/culinary/recipes/${entityId}`
    case 'client':
      return `/clients/${entityId}`
    default:
      return null
  }
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
