// LivePresencePanel - Real-time "who's online" panel for the chef dashboard.
// Subscribes to activity_events Realtime and updates as clients browse the portal.
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ActiveClient, ActivityEventType } from '@/lib/activity/types'

// Presence buckets
const ONLINE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes = "Online Now"
const RECENT_WINDOW_MS = 30 * 60 * 1000 // 30 minutes = "Recently Active"

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

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins === 1) return '1m ago'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diffMs / 3600000)
  if (hrs === 1) return '1h ago'
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(diffMs / 86400000)}d ago`
}

function isOnlineNow(lastActivity: string): boolean {
  return Date.now() - new Date(lastActivity).getTime() < ONLINE_WINDOW_MS
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

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`client-presence:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as {
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

          function applyPresenceUpdate(resolvedName: string) {
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
                  (a, b) =>
                    new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
                )
              }
              return [updatedEntry, ...still_visible]
            })
          }

          const cachedName = clientNamesRef.current.get(clientId)
          if (cachedName) {
            applyPresenceUpdate(cachedName)
          } else {
            // Client wasn't in the 30-minute seed window - look them up once, cache, then update
            void (async () => {
              const { data } = await supabase
                .from('clients')
                .select('full_name')
                .eq('id', clientId)
                .single()
              const resolvedName = data?.full_name || 'Client'
              if (resolvedName !== 'Client') {
                clientNamesRef.current.set(clientId, resolvedName)
              }
              applyPresenceUpdate(resolvedName)
            })()
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tenantId])

  const onlineNow = clients.filter((c) => isOnlineNow(c.last_activity))
  const recentlyActive = clients.filter((c) => !isOnlineNow(c.last_activity))

  if (clients.length === 0) {
    return (
      <div className="border border-stone-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-stone-300">Client Activity</h3>
          <span className="w-2 h-2 rounded-full bg-stone-300" />
        </div>
        <p className="text-xs text-stone-300">No clients active in the last 30 minutes</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-300">Client Activity</h3>
        <div className="flex items-center gap-3">
          {onlineNow.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineNow.length} online now
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

      <div className="space-y-1">
        {/* Online Now */}
        {onlineNow.map((client) => (
          <ClientRow key={client.client_id} client={client} isOnline={true} />
        ))}

        {/* Recently Active */}
        {recentlyActive.length > 0 && onlineNow.length > 0 && (
          <div className="pt-1 mt-1 border-t border-stone-800">
            <p className="text-[10px] text-stone-300 px-2 py-1">Recently Active</p>
          </div>
        )}
        {recentlyActive.map((client) => (
          <ClientRow key={client.client_id} client={client} isOnline={false} />
        ))}
      </div>
    </div>
  )
}

function ClientRow({ client, isOnline }: { client: ActiveClient; isOnline: boolean }) {
  const isHighIntent =
    client.event_type === 'payment_page_visited' || client.event_type === 'proposal_viewed'

  return (
    <Link
      href={`/clients/${client.client_id}`}
      className={`flex items-center justify-between text-xs rounded px-2 py-1.5 -mx-2 transition-colors group ${
        isOnline ? 'hover:bg-stone-800' : 'opacity-60 hover:opacity-80 hover:bg-stone-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Avatar with online indicator */}
        <div className="relative shrink-0">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isHighIntent ? 'bg-amber-900 text-amber-700' : 'bg-brand-900 text-brand-400'
            }`}
          >
            {client.client_name.charAt(0).toUpperCase()}
          </span>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
          )}
        </div>

        <div className="min-w-0">
          <span
            className={`font-medium block truncate ${isOnline ? 'text-stone-200' : 'text-stone-300'}`}
          >
            {client.client_name}
          </span>
          <span
            className={`block truncate ${isHighIntent ? 'text-amber-600 font-medium' : 'text-stone-300'}`}
          >
            {getLabel(client.event_type)}
          </span>
        </div>
      </div>

      <span className="text-stone-300 shrink-0 ml-2">{formatTimeAgo(client.last_activity)}</span>
    </Link>
  )
}
