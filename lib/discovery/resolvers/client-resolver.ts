import { pgClient } from '@/lib/db'
import type { RailResolverResult } from './types'

// ---------------------------------------------------------------------------
// Client Universal Rail Data Resolver
// Fetches live event, quote, and message data for the client role.
// ---------------------------------------------------------------------------

export async function resolveClientRailData(
  userId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}

  const today = new Date()
  const todayStr = formatDate(today)
  const tomorrowStr = formatDate(addDays(today, 1))
  const weekEndStr = formatDate(addDays(today, 7))

  const [events, unreadCount] = await Promise.all([
    fetchClientEvents(tenantId),
    fetchUnreadMessageCount(userId),
  ])

  // Map events by date and status
  for (const evt of events) {
    const date = evt.event_date?.slice(0, 10) ?? ''

    if (date === todayStr) {
      result['client.event_today'] = {
        eventTitle: evt.occasion,
        eventId: evt.id,
        chefName: evt.chef_name,
      }
    } else if (date === tomorrowStr) {
      result['client.event_tomorrow'] = {
        eventTitle: evt.occasion,
        eventId: evt.id,
        chefName: evt.chef_name,
      }
    } else if (date > todayStr && date <= weekEndStr && !result['client.event_this_week']) {
      result['client.event_this_week'] = {
        eventTitle: evt.occasion,
        eventId: evt.id,
        chefName: evt.chef_name,
      }
    }

    if (evt.status === 'proposed' && !result['client.quote_received']) {
      result['client.quote_received'] = {
        chefName: evt.chef_name,
        eventId: evt.id,
      }
    }

    if (evt.status === 'accepted' && !result['client.payment_due']) {
      result['client.payment_due'] = {
        chefName: evt.chef_name,
        eventId: evt.id,
      }
    }

    if (evt.status === 'draft' && !result['client.event_draft']) {
      result['client.event_draft'] = {
        eventTitle: evt.occasion,
        eventId: evt.id,
      }
    }
  }

  // Unread messages
  if (unreadCount > 0) {
    result['client.message_unread'] = { count: unreadCount }
  }

  return result
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

interface ClientEvent {
  id: string
  occasion: string | null
  event_date: string | null
  status: string
  chef_name: string | null
}

async function fetchClientEvents(tenantId: string | undefined): Promise<ClientEvent[]> {
  if (!tenantId) return []
  try {
    const rows = await pgClient`
      SELECT e.id, e.occasion, e.event_date::text, e.status,
             c.display_name as chef_name
      FROM events e
      JOIN chefs c ON c.id = e.chef_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status NOT IN ('cancelled', 'completed')
      ORDER BY e.event_date ASC
      LIMIT 20
    `
    return rows as unknown as ClientEvent[]
  } catch {
    return []
  }
}

async function fetchUnreadMessageCount(userId: string): Promise<number> {
  try {
    const rows = await pgClient`
      SELECT COUNT(*)::int as count
      FROM chat_messages cm
      JOIN conversation_participants cp
        ON cp.conversation_id = cm.conversation_id
        AND cp.auth_user_id = ${userId}
      WHERE cm.sender_id != ${userId}
        AND cm.deleted_at IS NULL
        AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    `
    return rows[0]?.count ?? 0
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}
