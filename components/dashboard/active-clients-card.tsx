// Active Clients Card - "Who's Online" widget for chef dashboard
import Link from 'next/link'
import type { ActiveClient } from '@/lib/activity/types'

interface ActiveClientsCardProps {
  clients: ActiveClient[]
}

const EVENT_LABELS: Record<string, string> = {
  portal_login: 'logged in',
  event_viewed: 'viewing an event',
  quote_viewed: 'viewing a quote',
  invoice_viewed: 'viewing an invoice',
  proposal_viewed: 'viewing a proposal',
  chat_message_sent: 'sent a message',
  rsvp_submitted: 'submitted RSVP',
  page_viewed: 'browsing portal',
}

export function ActiveClientsCard({ clients }: ActiveClientsCardProps) {
  if (clients.length === 0) {
    return (
      <div className="border border-stone-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-2">Active Now</h3>
        <p className="text-xs text-stone-400">No clients active in the last 15 minutes</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-700">Active Now</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {clients.length} online
        </span>
      </div>
      <div className="space-y-2">
        {clients.map((client) => (
          <Link
            key={client.client_id}
            href={`/clients/${client.client_id}`}
            className="flex items-center justify-between text-xs hover:bg-stone-50 rounded px-2 py-1.5 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-900 text-brand-700 flex items-center justify-center text-xxs font-bold">
                {client.client_name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-stone-800">{client.client_name}</span>
            </div>
            <span className="text-stone-400">
              {EVENT_LABELS[client.event_type] || client.event_type}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
