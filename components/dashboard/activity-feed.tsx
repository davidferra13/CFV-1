// Activity Feed - Recent client/system actions for chef dashboard
import Link from 'next/link'
import type { ActivityEvent } from '@/lib/activity/types'

interface ActivityFeedProps {
  events: ActivityEvent[]
}

const EVENT_DESCRIPTIONS: Record<string, string> = {
  portal_login: 'logged into the portal',
  event_viewed: 'viewed an event',
  quote_viewed: 'viewed a quote',
  invoice_viewed: 'viewed an invoice',
  proposal_viewed: 'viewed a proposal',
  chat_message_sent: 'sent a chat message',
  rsvp_submitted: 'submitted an RSVP',
  form_submitted: 'submitted a form',
  page_viewed: 'visited the portal',
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="border border-stone-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-2">Recent Activity</h3>
        <p className="text-xs text-stone-400">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-stone-700 mb-3">Recent Activity</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {events.map((event) => (
          <ActivityRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const description = EVENT_DESCRIPTIONS[event.event_type] || event.event_type
  const timeAgo = formatTimeAgo(event.created_at)

  const href = event.client_id
    ? `/clients/${event.client_id}`
    : event.entity_type === 'event' && event.entity_id
      ? `/events/${event.entity_id}`
      : null

  const content = (
    <div className="flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <ActorBadge type={event.actor_type} />
        <span className="text-stone-700 truncate">
          {description}
          {event.entity_type && <span className="text-stone-400"> ({event.entity_type})</span>}
        </span>
      </div>
      <span className="text-stone-400 shrink-0 ml-2">{timeAgo}</span>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function ActorBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    client: { bg: 'bg-blue-900 text-blue-700', label: 'Client' },
    chef: { bg: 'bg-emerald-900 text-emerald-700', label: 'Chef' },
    system: { bg: 'bg-stone-100 text-stone-600', label: 'System' },
  }
  const c = config[type] || config.system
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${c.bg}`}>
      {c.label}
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

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
