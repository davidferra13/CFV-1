// LivePresencePanel - real-time client activity signal panel for the chef dashboard.
// Subscribes to activity_events via SSE and updates as clients browse the portal.
'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSSE, useSSEPresence } from '@/lib/realtime/sse-client'
import type { ActiveClient, ActivityEventType } from '@/lib/activity/types'
import {
  getClientPresenceSessions,
  getConnectedClientIds,
} from '@/lib/activity/live-client-presence'
import {
  ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES,
  formatActivitySignalAge,
  formatActivityWindowLabel,
  getActiveSignalExplanation,
  isActiveClientSignal,
} from '@/lib/activity/presence-copy'

const RECENT_WINDOW_MINUTES = 30
const RECENT_WINDOW_MS = RECENT_WINDOW_MINUTES * 60 * 1000

// Human-readable labels for each event type (including all new ones)
const EVENT_LABELS: Record<string, string> = {
  portal_login: 'logged in',
  event_viewed: 'viewing an event',
  quote_viewed: 'reviewing a quote',
  invoice_viewed: 'viewing an invoice',
  proposal_viewed: 'reviewing your proposal',
  chat_message_sent: 'sent a message',
  rsvp_submitted: 'submitted RSVP',
  form_submitted: 'submitted a form',
  page_viewed: 'browsing portal',
  // New high-intent events
  payment_page_visited: 'on the payment page',
  document_downloaded: 'downloaded a document',
  events_list_viewed: 'browsing events',
  quotes_list_viewed: 'browsing quotes',
  chat_opened: 'reading messages',
  rewards_viewed: 'browsing rewards',
  session_heartbeat: 'active on portal',
}

function getLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || 'on the portal'
}

interface LivePresencePanelProps {
  tenantId: string
  initialClients: ActiveClient[]
}

export function LivePresencePanel({ tenantId, initialClients }: LivePresencePanelProps) {
  const [clients, setClients] = useState<ActiveClient[]>(initialClients)

  // Cache of client names we've seen, so Realtime rows can be enriched without a DB call
  const clientNamesRef = useRef<Map<string, string>>(
    new Map(initialClients.map((c) => [c.client_id, c.client_name]))
  )

  const handleMessage = useCallback((msg: { event: string; data: any }) => {
    const row = msg.data as {
      client_id: string | null
      actor_type: string
      event_type: string
      entity_type: string | null
      entity_id: string | null
      metadata: Record<string, unknown> | null
      created_at: string
    }

    // Only care about client activity
    if (row.actor_type !== 'client' || !row.client_id) return

    const clientId = row.client_id
    const cachedName = clientNamesRef.current.get(clientId)
    const resolvedName = cachedName || (row.metadata?.client_name as string) || 'Client'
    if (resolvedName !== 'Client') {
      clientNamesRef.current.set(clientId, resolvedName)
    }

    setClients((prev) => {
      const now = Date.now()
      // Remove clients older than RECENT_WINDOW_MS
      const still_visible = prev.filter(
        (c) => now - new Date(c.last_activity).getTime() < RECENT_WINDOW_MS
      )
      const updatedEntry: ActiveClient = {
        client_id: clientId,
        client_name: resolvedName,
        last_activity: row.created_at,
        event_type: row.event_type as ActivityEventType,
        entity_type: row.entity_type,
        last_entity_id: row.entity_id,
        metadata: row.metadata ?? undefined,
      }
      const existingIndex = still_visible.findIndex((c) => c.client_id === clientId)
      if (existingIndex >= 0) {
        const next = [...still_visible]
        next[existingIndex] = updatedEntry
        return next.sort(
          (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        )
      }
      return [updatedEntry, ...still_visible]
    })
  }, [])

  useSSE(`activity_events:${tenantId}`, { onMessage: handleMessage })
  const { presenceState } = useSSEPresence(`activity_events:${tenantId}`)

  const liveSessions = getClientPresenceSessions(presenceState)
  const connectedClientIds = getConnectedClientIds(liveSessions)
  const activeSignals = clients.filter((c) => isActiveClientSignal(c.last_activity))
  const recentlyActive = clients.filter((c) => !isActiveClientSignal(c.last_activity))
  const connectedKnownClients = clients.filter((c) => connectedClientIds.has(c.client_id))

  if (clients.length === 0 && liveSessions.length === 0) {
    return (
      <div className="border border-stone-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-stone-300">Client Activity</h3>
          <span className="w-2 h-2 rounded-full bg-stone-300" />
        </div>
        <p className="text-xs text-stone-300">
          No client activity signals in the {formatActivityWindowLabel(RECENT_WINDOW_MINUTES)}
        </p>
        <p className="mt-1 text-xxs text-stone-400">
          Clients can browse privately, so absence of a signal is not treated as absence of review.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-300">Client Activity</h3>
        <div className="flex items-center gap-3">
          {connectedClientIds.size > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {connectedClientIds.size} connected now
            </span>
          )}
          {activeSignals.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-stone-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-stone-500" />
              {activeSignals.length} activity signal{activeSignals.length === 1 ? '' : 's'}
            </span>
          )}
          <Link
            href="/clients/presence"
            className="text-xs text-brand-500 hover:text-brand-400 font-medium"
          >
            View all →
          </Link>
        </div>
      </div>

      <p className="text-xxs text-stone-300 mb-2">{getActiveSignalExplanation()}</p>
      <p className="text-xxs text-stone-400 mb-2">
        Live signals appear only when clients allow passive visibility.
      </p>

      <div className="space-y-1">
        {clients.length === 0 && liveSessions.length > 0 && (
          <>
            <p className="text-xxs text-emerald-600 px-2 py-1">Connected Sessions</p>
            {liveSessions.slice(0, 4).map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between gap-3 text-xs rounded px-2 py-1.5 -mx-2"
              >
                <div className="min-w-0">
                  <span className="font-medium block truncate text-stone-200">
                    {session.clientName}
                  </span>
                  <span className="block truncate text-stone-300">{session.page}</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
            ))}
          </>
        )}

        {connectedKnownClients.length > 0 && (
          <>
            <p className="text-xxs text-emerald-600 px-2 py-1">Connected Now</p>
            {connectedKnownClients.map((client) => (
              <ClientRow
                key={`connected-${client.client_id}`}
                client={client}
                isActiveSignal={true}
                isConnected
              />
            ))}
          </>
        )}

        {/* Active signals */}
        {activeSignals
          .filter((client) => !connectedClientIds.has(client.client_id))
          .map((client) => (
            <ClientRow key={client.client_id} client={client} isActiveSignal={true} />
          ))}

        {/* Earlier activity signals */}
        {recentlyActive.length > 0 && activeSignals.length > 0 && (
          <div className="pt-1 mt-1 border-t border-stone-800">
            <p className="text-xxs text-stone-300 px-2 py-1">
              Earlier signals ({formatActivityWindowLabel(RECENT_WINDOW_MINUTES)})
            </p>
          </div>
        )}
        {recentlyActive.map((client) => (
          <ClientRow key={client.client_id} client={client} isActiveSignal={false} />
        ))}
      </div>
    </div>
  )
}

function ClientRow({
  client,
  isActiveSignal,
  isConnected = false,
}: {
  client: ActiveClient
  isActiveSignal: boolean
  isConnected?: boolean
}) {
  const isHighIntent =
    client.event_type === 'payment_page_visited' || client.event_type === 'proposal_viewed'

  return (
    <Link
      href={`/clients/${client.client_id}`}
      className={`flex items-center justify-between text-xs rounded px-2 py-1.5 -mx-2 transition-colors group ${
        isActiveSignal ? 'hover:bg-stone-800' : 'opacity-60 hover:opacity-80 hover:bg-stone-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Avatar with recent activity signal indicator */}
        <div className="relative shrink-0">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xxs font-bold ${
              isHighIntent ? 'bg-amber-900 text-amber-700' : 'bg-brand-900 text-brand-400'
            }`}
          >
            {client.client_name.charAt(0).toUpperCase()}
          </span>
          {isActiveSignal && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"
              title={`Activity signal in the last ${ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES} minutes`}
            />
          )}
        </div>

        <div className="min-w-0">
          <span
            className={`font-medium block truncate ${isActiveSignal ? 'text-stone-200' : 'text-stone-300'}`}
          >
            {client.client_name}
          </span>
          <span
            className={`block truncate ${isHighIntent ? 'text-amber-600 font-medium' : 'text-stone-300'}`}
          >
            {isConnected && <span className="text-emerald-600 font-medium">Connected - </span>}
            {getLabel(client.event_type)}
          </span>
        </div>
      </div>

      <span className="text-stone-300 shrink-0 ml-2">
        {formatActivitySignalAge(client.last_activity)}
      </span>
    </Link>
  )
}
