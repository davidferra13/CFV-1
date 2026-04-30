// ClientPresenceMonitor - Full-page real-time client portal monitoring panel.
// Expanded version of LivePresencePanel: shows engagement scores, entity context,
// and a live activity stream. Subscribes via SSE for instant updates.
'use client'

import { useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSSE, useSSEPresence } from '@/lib/realtime/sse-client'
import type {
  ActiveClientWithContext,
  ActivityEvent,
  ActivityEventType,
} from '@/lib/activity/types'
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
import { EngagementBadge } from './engagement-badge'

const RECENT_WINDOW_MINUTES = 60
const RECENT_WINDOW_MS = RECENT_WINDOW_MINUTES * 60 * 1000

// Max events to keep in the live stream
const MAX_STREAM_EVENTS = 50

// Human-readable labels for each event type
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
  payment_page_visited: 'on the payment page',
  document_downloaded: 'downloaded a document',
  events_list_viewed: 'browsing events',
  quotes_list_viewed: 'browsing quotes',
  chat_opened: 'reading messages',
  rewards_viewed: 'browsing rewards',
  session_heartbeat: 'active on portal',
}

const STREAM_LABELS: Record<string, string> = {
  portal_login: 'Logged into the portal',
  event_viewed: 'Viewed an event',
  quote_viewed: 'Viewed a quote',
  invoice_viewed: 'Viewed an invoice',
  proposal_viewed: 'Viewed a proposal',
  chat_message_sent: 'Sent a chat message',
  rsvp_submitted: 'Submitted RSVP',
  form_submitted: 'Submitted a form',
  page_viewed: 'Visited a page',
  payment_page_visited: 'On the payment page',
  document_downloaded: 'Downloaded a document',
  events_list_viewed: 'Browsed event list',
  quotes_list_viewed: 'Browsed quotes',
  chat_opened: 'Opened messages',
  rewards_viewed: 'Browsed rewards',
}

// Never shown in the activity stream
const HIDDEN_FROM_STREAM = new Set(['session_heartbeat'])

const HIGH_INTENT = new Set(['payment_page_visited', 'proposal_viewed'])

type StreamItem = {
  event: ActivityEvent
  clientName: string
}

function getLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || 'on the portal'
}

interface ClientPresenceMonitorProps {
  tenantId: string
  initialClients: ActiveClientWithContext[]
  initialActivity: ActivityEvent[]
}

export function ClientPresenceMonitor({
  tenantId,
  initialClients,
  initialActivity,
}: ClientPresenceMonitorProps) {
  const [clients, setClients] = useState<ActiveClientWithContext[]>(initialClients)

  // Build initial stream with resolved client names from the initial clients list
  const initialNameMap = new Map(initialClients.map((c) => [c.client_id, c.client_name]))
  const [stream, setStream] = useState<StreamItem[]>(
    initialActivity
      .filter((e) => !HIDDEN_FROM_STREAM.has(e.event_type))
      .map((e) => ({
        event: e,
        clientName: (e.client_id && initialNameMap.get(e.client_id)) || 'Client',
      }))
  )

  // Cache of client names so Realtime rows can be enriched without a round-trip
  const clientNamesRef = useRef<Map<string, string>>(
    new Map(initialClients.map((c) => [c.client_id, c.client_name]))
  )

  const handleMessage = useCallback((msg: { event: string; data: any }) => {
    const row = msg.data as {
      id: string
      client_id: string | null
      actor_type: string
      event_type: string
      entity_type: string | null
      entity_id: string | null
      metadata: Record<string, unknown> | null
      created_at: string
      tenant_id: string
      actor_id: string
    }

    if (row.actor_type !== 'client' || !row.client_id) return

    const clientId = row.client_id
    const cachedName = clientNamesRef.current.get(clientId)
    const resolvedName = cachedName || (row.metadata?.client_name as string) || 'Client'
    if (resolvedName !== 'Client') {
      clientNamesRef.current.set(clientId, resolvedName)
    }

    const now = Date.now()

    // Update the presence list
    setClients((prev) => {
      const stillVisible = prev.filter(
        (c) => now - new Date(c.last_activity).getTime() < RECENT_WINDOW_MS
      )
      const existing = stillVisible.find((c) => c.client_id === clientId)
      const updatedEntry: ActiveClientWithContext = existing
        ? {
            ...existing,
            last_activity: row.created_at,
            event_type: row.event_type as ActivityEventType,
            entity_type: row.entity_type,
            last_entity_id: row.entity_id,
            metadata: row.metadata ?? undefined,
          }
        : {
            client_id: clientId,
            client_name: resolvedName,
            last_activity: row.created_at,
            event_type: row.event_type as ActivityEventType,
            entity_type: row.entity_type,
            last_entity_id: row.entity_id,
            metadata: row.metadata ?? undefined,
            engagement_level: 'none',
            engagement_signals: [],
            entity_title: null,
          }

      const withoutClient = stillVisible.filter((c) => c.client_id !== clientId)
      return [updatedEntry, ...withoutClient].sort(
        (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      )
    })

    // Prepend to the activity stream (if not a heartbeat)
    if (!HIDDEN_FROM_STREAM.has(row.event_type)) {
      const newEvent: ActivityEvent = {
        id: row.id,
        tenant_id: row.tenant_id,
        actor_id: row.actor_id,
        client_id: clientId,
        actor_type: 'client',
        event_type: row.event_type as ActivityEventType,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        metadata: row.metadata ?? {},
        created_at: row.created_at,
      }
      setStream((prev) =>
        [{ event: newEvent, clientName: resolvedName }, ...prev].slice(0, MAX_STREAM_EVENTS)
      )
    }
  }, [])

  useSSE(`activity_events:${tenantId}`, { onMessage: handleMessage })
  const { presenceState } = useSSEPresence(`activity_events:${tenantId}`)

  const liveSessions = getClientPresenceSessions(presenceState)
  const connectedClientIds = getConnectedClientIds(liveSessions)
  const activeSignals = clients.filter((c) => isActiveClientSignal(c.last_activity))
  const recentlyActive = clients.filter((c) => !isActiveClientSignal(c.last_activity))
  const knownClientIds = new Set(clients.map((client) => client.client_id))
  const connectedKnownClients = clients.filter((c) => connectedClientIds.has(c.client_id))
  const connectedClientCount = connectedClientIds.size

  return (
    <div className="space-y-6">
      {/* ── Active Clients ── */}
      <div className="border border-stone-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-300">Active Clients</h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {connectedClientCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {connectedClientCount} connected now
              </span>
            )}
            {activeSignals.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-stone-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-stone-500" />
                {activeSignals.length} activity signal{activeSignals.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {clients.length === 0 && liveSessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-300 text-sm">
            No client activity signals in the {formatActivityWindowLabel(RECENT_WINDOW_MINUTES)}.
            Activity will appear here as clients browse the portal.
          </div>
        ) : (
          <div>
            {connectedKnownClients.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-emerald-950 border-b border-emerald-100">
                  <p className="text-xs-tight font-semibold text-emerald-700 uppercase tracking-wide">
                    Connected Now
                  </p>
                  <p className="text-xxs text-emerald-700 mt-0.5">
                    Live client portal sessions from realtime presence.
                  </p>
                </div>
                <div className="divide-y divide-stone-800">
                  {connectedKnownClients.map((client) => (
                    <ClientPresenceRow
                      key={`connected-${client.client_id}`}
                      client={client}
                      isActiveSignal
                      isConnected
                    />
                  ))}
                </div>
              </div>
            )}

            {liveSessions.length > connectedKnownClients.length && (
              <div>
                <div className="px-4 py-2 bg-stone-800 border-b border-stone-800">
                  <p className="text-xs-tight font-semibold text-stone-300 uppercase tracking-wide">
                    Connected Sessions
                  </p>
                </div>
                <div className="divide-y divide-stone-800">
                  {liveSessions
                    .filter((session) => !session.clientId || !knownClientIds.has(session.clientId))
                    .map((session) => (
                      <div
                        key={session.sessionId}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-stone-300"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{session.clientName}</p>
                          <p className="text-xs text-stone-400 truncate">{session.page}</p>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active signals */}
            {activeSignals.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-emerald-950 border-b border-emerald-100">
                  <p className="text-xs-tight font-semibold text-emerald-700 uppercase tracking-wide">
                    Active Signals (last {ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES} min)
                  </p>
                  <p className="text-xxs text-emerald-700 mt-0.5">{getActiveSignalExplanation()}</p>
                  <p className="text-xxs text-emerald-700 mt-0.5">
                    Passive visibility depends on each client&apos;s live privacy controls.
                  </p>
                </div>
                <div className="divide-y divide-stone-800">
                  {activeSignals
                    .filter((client) => !connectedClientIds.has(client.client_id))
                    .map((client) => (
                      <ClientPresenceRow key={client.client_id} client={client} isActiveSignal />
                    ))}
                </div>
              </div>
            )}

            {/* Earlier activity signals */}
            {recentlyActive.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-stone-800 border-b border-stone-800">
                  <p className="text-xs-tight font-semibold text-stone-300 uppercase tracking-wide">
                    Earlier Signals ({formatActivityWindowLabel(RECENT_WINDOW_MINUTES)})
                  </p>
                </div>
                <div className="divide-y divide-stone-800">
                  {recentlyActive.map((client) => (
                    <ClientPresenceRow
                      key={client.client_id}
                      client={client}
                      isActiveSignal={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Live Activity Stream ── */}
      <div className="border border-stone-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-300">Live Activity Stream</h2>
          <p className="text-xs text-stone-300 mt-0.5">
            All client portal actions in the past 24 hours
          </p>
        </div>

        {stream.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-300 text-sm">
            No client activity in the past 24 hours.
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {stream.map((item) => (
              <StreamRow key={item.event.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Row: one client in the presence list ──

function ClientPresenceRow({
  client,
  isActiveSignal,
  isConnected = false,
}: {
  client: ActiveClientWithContext
  isActiveSignal: boolean
  isConnected?: boolean
}) {
  const isHighIntent = HIGH_INTENT.has(client.event_type)

  return (
    <Link
      href={`/clients/${client.client_id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-800 transition-colors ${
        isActiveSignal ? '' : 'opacity-70'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isHighIntent ? 'bg-amber-900 text-amber-700' : 'bg-brand-900 text-brand-400'
          }`}
        >
          {client.client_name.charAt(0).toUpperCase()}
        </span>
        {isActiveSignal && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"
            title={`Activity signal in the last ${ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES} minutes`}
          />
        )}
      </div>

      {/* Name + activity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-stone-200 truncate">{client.client_name}</span>
          {client.engagement_level !== 'none' && (
            <EngagementBadge level={client.engagement_level} signals={client.engagement_signals} />
          )}
        </div>
        <p
          className={`text-xs truncate mt-0.5 ${isHighIntent ? 'text-amber-600 font-medium' : 'text-stone-300'}`}
        >
          {isConnected && <span className="text-emerald-600 font-medium">Connected now - </span>}
          {getLabel(client.event_type)}
          {client.entity_title && (
            <span className="text-stone-300 font-normal"> - {client.entity_title}</span>
          )}
        </p>
      </div>

      {/* Time */}
      <span className="text-xs text-stone-300 shrink-0">
        {formatActivitySignalAge(client.last_activity)}
      </span>
    </Link>
  )
}

// ── Row: one event in the activity stream ──

function StreamRow({ item }: { item: StreamItem }) {
  const { event, clientName } = item
  const isHighIntent = HIGH_INTENT.has(event.event_type)
  const label = STREAM_LABELS[event.event_type] || event.event_type

  const href = event.client_id ? `/clients/${event.client_id}` : null

  const content = (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${isHighIntent ? 'bg-amber-950' : ''}`}>
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${isHighIntent ? 'bg-amber-400' : 'bg-stone-300'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-300 truncate">
          <span className="font-medium">{clientName}</span>
          <span className="text-stone-300"> - </span>
          {label}
        </p>
      </div>
      <span className="text-xs text-stone-300 shrink-0">
        {formatActivitySignalAge(event.created_at)}
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:bg-stone-800 transition-colors">
        {content}
      </Link>
    )
  }
  return content
}
