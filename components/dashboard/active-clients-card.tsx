// Active Clients Card - recent client activity signal widget for chef dashboard
import Link from 'next/link'
import type { ActiveClient } from '@/lib/activity/types'
import {
  ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES,
  formatActivitySignalAge,
  formatActivityWindowLabel,
  getActiveSignalExplanation,
  isActiveClientSignal,
} from '@/lib/activity/presence-copy'

interface ActiveClientsCardProps {
  clients: ActiveClient[]
}

const RECENT_WINDOW_MINUTES = 30

const EVENT_LABELS: Record<string, string> = {
  portal_login: 'logged in',
  event_viewed: 'viewing an event',
  quote_viewed: 'viewing a quote',
  invoice_viewed: 'viewing an invoice',
  proposal_viewed: 'viewing a proposal',
  chat_message_sent: 'sent a message',
  rsvp_submitted: 'submitted RSVP',
  form_submitted: 'submitted a form',
  page_viewed: 'browsing portal',
  payment_page_visited: 'on the payment page',
  document_downloaded: 'downloaded a document',
  events_list_viewed: 'browsing events',
  quotes_list_viewed: 'browsing quotes',
  chat_opened: 'reading messages',
  rewards_viewed: 'browsing rewards',
  session_heartbeat: 'active on portal',
}

export function ActiveClientsCard({ clients }: ActiveClientsCardProps) {
  const activeSignals = clients.filter((client) => isActiveClientSignal(client.last_activity))

  if (clients.length === 0) {
    return (
      <div className="border border-stone-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-2">Client Activity</h3>
        <p className="text-xs text-stone-400">
          No client activity signals in the {formatActivityWindowLabel(RECENT_WINDOW_MINUTES)}
        </p>
        <p className="mt-1 text-xxs text-stone-400">
          Clients can browse privately, so no signal does not mean no review.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-700">Client Activity</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span
            className={`w-2 h-2 rounded-full ${
              activeSignals.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
            }`}
          />
          {activeSignals.length} active signal{activeSignals.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-xxs text-stone-400 mb-2">{getActiveSignalExplanation()}</p>
      <p className="text-xxs text-stone-400 mb-2">
        Live signals appear only when clients allow passive visibility.
      </p>
      <div className="space-y-2">
        {clients.map((client) => (
          <Link
            key={client.client_id}
            href={`/clients/${client.client_id}`}
            className="flex items-center justify-between gap-3 text-xs hover:bg-stone-50 rounded px-2 py-1.5 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-brand-900 text-brand-700 flex items-center justify-center text-xxs font-bold">
                {client.client_name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-stone-800 truncate">{client.client_name}</span>
            </div>
            <span className="text-stone-400 text-right shrink-0 max-w-[50%]">
              <span className="block truncate">
                {EVENT_LABELS[client.event_type] || client.event_type}
              </span>
              <span className="block text-xxs">
                {isActiveClientSignal(client.last_activity)
                  ? `signal under ${ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES}m`
                  : formatActivitySignalAge(client.last_activity)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
