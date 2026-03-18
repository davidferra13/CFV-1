'use client'

import { memo } from 'react'
import Link from 'next/link'
import type { ActivityEvent } from '@/lib/activity/types'

interface ClientActivityFeedProps {
  events: ActivityEvent[]
}

const EVENT_DESCRIPTIONS: Record<string, string> = {
  portal_login: 'Logged into the portal',
  event_viewed: 'Viewed an event',
  quote_viewed: 'Viewed a quote',
  invoice_viewed: 'Viewed an invoice',
  proposal_viewed: 'Viewed a proposal',
  chat_message_sent: 'Sent a chat message',
  rsvp_submitted: 'Submitted an RSVP',
  form_submitted: 'Submitted a form',
  page_viewed: 'Visited a page',
  payment_page_visited: 'On the payment page',
  document_downloaded: 'Downloaded a document',
  events_list_viewed: 'Browsed event list',
  quotes_list_viewed: 'Browsed quotes',
  chat_opened: 'Opened messages',
  rewards_viewed: 'Browsed rewards',
}

// Never shown in display feeds - written to DB for engagement scoring only
const HIDDEN_FROM_FEED = new Set(['session_heartbeat'])

export function ClientActivityFeed({ events }: ClientActivityFeedProps) {
  const displayEvents = events.filter((e) => !HIDDEN_FROM_FEED.has(e.event_type))

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-sm">
        No client activity recorded for this filter.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {displayEvents.map((event) => (
        <ClientActivityRow key={event.id} event={event} />
      ))}
    </div>
  )
}

const ClientActivityRow = memo(function ClientActivityRow({ event }: { event: ActivityEvent }) {
  const href = event.client_id
    ? `/clients/${event.client_id}`
    : event.entity_type === 'event' && event.entity_id
      ? `/events/${event.entity_id}`
      : null

  const detailParts = buildMetadataParts(event)
  const content = (
    <div className="flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-stone-50 transition-colors">
      <ActorBadge type={event.actor_type} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-700 leading-snug">
          {EVENT_DESCRIPTIONS[event.event_type] || event.event_type}
          {event.entity_type && <span className="text-stone-400"> ({event.entity_type})</span>}
        </p>
        {detailParts.length > 0 && (
          <p className="text-xs text-stone-400 mt-0.5 truncate">{detailParts.join(' | ')}</p>
        )}
      </div>
      <span className="text-xs text-stone-400 shrink-0 mt-0.5">
        {formatTimeAgo(event.created_at)}
      </span>
    </div>
  )

  if (href)
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  return content
})

function formatCents(cents: unknown): string | null {
  if (typeof cents !== 'number' || cents <= 0) return null
  return `$${(cents / 100).toFixed(0)}`
}

function buildMetadataParts(event: ActivityEvent): string[] {
  const metadata = event.metadata || {}
  const parts: string[] = []

  // Legacy fields
  const pagePath = typeof metadata.page_path === 'string' ? metadata.page_path : null
  const quoteNumber = typeof metadata.quote_number === 'string' ? metadata.quote_number : null
  const invoiceNumber = typeof metadata.invoice_number === 'string' ? metadata.invoice_number : null
  const amountDisplay = typeof metadata.amount_display === 'string' ? metadata.amount_display : null

  if (pagePath) parts.push(pagePath)
  if (quoteNumber) parts.push(`Quote ${quoteNumber}`)
  if (invoiceNumber) parts.push(`Invoice ${invoiceNumber}`)
  if (amountDisplay) parts.push(amountDisplay)

  // New rich metadata fields
  const occasion = typeof metadata.occasion === 'string' ? metadata.occasion : null
  const eventStatus = typeof metadata.event_status === 'string' ? metadata.event_status : null
  const paymentAmountCents =
    typeof metadata.payment_amount_cents === 'number' ? metadata.payment_amount_cents : null
  const totalQuotedCents =
    typeof metadata.total_quoted_cents === 'number' ? metadata.total_quoted_cents : null
  const documentType = typeof metadata.document_type === 'string' ? metadata.document_type : null
  const isPending = metadata.is_pending === true

  if (occasion) parts.push(occasion)
  if (eventStatus && !occasion) parts.push(eventStatus)
  if (paymentAmountCents) {
    const formatted = formatCents(paymentAmountCents)
    if (formatted) parts.push(formatted)
  } else if (totalQuotedCents) {
    const formatted = formatCents(totalQuotedCents)
    if (formatted) parts.push(formatted + (isPending ? ' - needs response' : ''))
  }
  if (documentType === 'receipt') parts.push('Receipt')
  else if (documentType === 'foh_menu') parts.push('Menu PDF')

  return parts
}

function ActorBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    client: { bg: 'bg-blue-900 text-blue-700', label: 'Client' },
    chef: { bg: 'bg-emerald-900 text-emerald-700', label: 'Chef' },
    system: { bg: 'bg-stone-100 text-stone-600', label: 'System' },
  }
  const c = config[type] || config.system
  return (
    <span className={`text-xxs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${c.bg}`}>
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
