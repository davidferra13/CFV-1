import { pgClient } from '@/lib/db'
import type { RailResolverResult } from './types'

// ---------------------------------------------------------------------------
// Client Universal Rail Data Resolver
// Fetches live event, quote, message, payment, dietary, contract, and
// feedback data for the client role. Keys MUST match definition IDs in
// lib/discovery/registries/client-rail-registry.ts for template hydration.
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

  const [events, latestChefMessage] = await Promise.all([
    fetchClientEvents(tenantId),
    fetchLatestChefMessage(userId),
  ])

  // Map events by date and status
  for (const evt of events) {
    const date = evt.event_date?.slice(0, 10) ?? ''

    if (date === todayStr) {
      result['client.event_today'] = {
        eventTitle: evt.occasion,
        id: evt.id,
        chefName: evt.chef_name,
      }
    } else if (date === tomorrowStr) {
      result['client.event_tomorrow'] = {
        eventTitle: evt.occasion,
        id: evt.id,
        chefName: evt.chef_name,
      }
    } else if (date > todayStr && date <= weekEndStr && !result['client.event_upcoming']) {
      // Compute days until event for template "{eventTitle} in {n} days"
      const eventDate = new Date(date)
      const diffMs = eventDate.getTime() - today.getTime()
      const n = Math.max(1, Math.ceil(diffMs / 86_400_000))
      result['client.event_upcoming'] = {
        eventTitle: evt.occasion,
        id: evt.id,
        chefName: evt.chef_name,
        n,
      }
    }

    // Quote received (proposed event = quote sent to client)
    if (evt.status === 'proposed' && !result['client.quote_received']) {
      result['client.quote_received'] = {
        name: evt.chef_name,
        id: evt.id,
      }
    }

    // Event proposed (same data, different registry item)
    if (evt.status === 'proposed' && !result['client.event_proposed']) {
      result['client.event_proposed'] = {
        name: evt.chef_name,
        id: evt.id,
        eventTitle: evt.occasion,
      }
    }

    // Payment gap (accepted but not yet paid)
    if (evt.status === 'accepted' && !result['client.gap_payment_due']) {
      result['client.gap_payment_due'] = {
        eventTitle: evt.occasion,
        id: evt.id,
      }
    }
  }

  // Chef messages with excerpt (hydrates client.new_chef_message)
  if (latestChefMessage) {
    result['client.new_chef_message'] = {
      name: latestChefMessage.chefName,
      chefId: latestChefMessage.chefId,
      excerpt: latestChefMessage.excerpt,
      count: latestChefMessage.unreadCount,
    }
  }

  // Additional resolver groups (parallel, each with try/catch)
  const [menuApprovals, payments, dietaryForms, contracts, feedback] = await Promise.all([
    fetchMenuApprovalsPending(tenantId),
    fetchPaymentReminders(tenantId),
    fetchDietaryFormRequests(userId),
    fetchContractsPending(tenantId),
    fetchFeedbackRequested(tenantId),
  ])

  Object.assign(result, menuApprovals, payments, dietaryForms, contracts, feedback)

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

// ---------------------------------------------------------------------------
// Chef message fetcher (with excerpt for client.new_chef_message hydration)
// ---------------------------------------------------------------------------

interface ChefMessageResult {
  chefName: string | null
  chefId: string
  excerpt: string
  unreadCount: number
}

async function fetchLatestChefMessage(userId: string): Promise<ChefMessageResult | null> {
  try {
    const rows = await pgClient`
      SELECT
        cm.body,
        cm.sender_id AS chef_user_id,
        c.display_name AS chef_name,
        c.id AS chef_id,
        (
          SELECT COUNT(*)::int
          FROM chat_messages cm2
          JOIN conversation_participants cp2
            ON cp2.conversation_id = cm2.conversation_id
            AND cp2.auth_user_id = ${userId}
          WHERE cm2.sender_id != ${userId}
            AND cm2.deleted_at IS NULL
            AND cm2.created_at > COALESCE(cp2.last_read_at, '1970-01-01'::timestamptz)
        ) AS unread_count
      FROM chat_messages cm
      JOIN conversation_participants cp
        ON cp.conversation_id = cm.conversation_id
        AND cp.auth_user_id = ${userId}
      JOIN users u ON u.id = cm.sender_id
      JOIN chefs c ON c.user_id = u.id
      WHERE cm.sender_id != ${userId}
        AND cm.deleted_at IS NULL
        AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
      ORDER BY cm.created_at DESC
      LIMIT 1
    `
    const row = rows[0] as
      | {
          body: string
          chef_user_id: string
          chef_name: string | null
          chef_id: string
          unread_count: number
        }
      | undefined
    if (!row || row.unread_count === 0) return null
    return {
      chefName: row.chef_name,
      chefId: row.chef_id,
      excerpt: (row.body ?? '').slice(0, 120),
      unreadCount: row.unread_count,
    }
  } catch (err) {
    console.error('[resolveClientRailData] chef message fetch failed:', err)
    return null
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

// ---------------------------------------------------------------------------
// Menu approval (hydrates client.gap_menu_unconfirmed)
// ---------------------------------------------------------------------------

async function fetchMenuApprovalsPending(
  tenantId: string | undefined
): Promise<RailResolverResult> {
  if (!tenantId) return {}
  try {
    const rows = await pgClient`
      SELECT e.id AS event_id, e.occasion AS event_title, c.display_name AS chef_name
      FROM events e
      JOIN chefs c ON c.id = e.chef_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status = 'proposed'
        AND NOT EXISTS (
          SELECT 1 FROM menus m
          WHERE m.event_id = e.id AND m.approved_at IS NOT NULL
        )
      LIMIT 1
    `
    const row = rows[0] as
      | { event_id: string; event_title: string | null; chef_name: string | null }
      | undefined
    if (row) {
      return {
        'client.gap_menu_unconfirmed': {
          eventTitle: row.event_title,
          id: row.event_id,
          chefName: row.chef_name,
        },
      }
    }
  } catch (err) {
    console.error('[resolveClientRailData] menu approvals group failed:', err)
  }
  return {}
}

// ---------------------------------------------------------------------------
// Payment reminders (hydrates client.payment_overdue or client.gap_payment_due)
// ---------------------------------------------------------------------------

async function fetchPaymentReminders(tenantId: string | undefined): Promise<RailResolverResult> {
  if (!tenantId) return {}
  try {
    const rows = await pgClient`
      SELECT e.id AS event_id, e.occasion AS event_title, c.display_name AS chef_name,
             le.amount_cents, le.entry_type, le.due_date
      FROM ledger_entries le
      JOIN events e ON e.id = le.event_id
      JOIN chefs c ON c.id = e.chef_id
      WHERE le.tenant_id = ${tenantId}
        AND le.status = 'unpaid'
        AND le.entry_type IN ('deposit', 'balance_due', 'invoice')
      ORDER BY le.due_date ASC NULLS LAST
      LIMIT 1
    `
    const row = rows[0] as
      | {
          event_id: string
          event_title: string | null
          chef_name: string | null
          amount_cents: number
          entry_type: string
          due_date: string | null
        }
      | undefined
    if (row) {
      const amount = (row.amount_cents / 100).toFixed(2)
      const isOverdue = row.due_date && new Date(row.due_date) < new Date()
      // Overdue payments hydrate the high-urgency payment_overdue item;
      // upcoming payments hydrate gap_payment_due
      const defId = isOverdue ? 'client.payment_overdue' : 'client.gap_payment_due'
      return {
        [defId]: {
          eventTitle: row.event_title,
          id: row.event_id,
          chefName: row.chef_name,
          amount,
          amountCents: row.amount_cents,
        },
      }
    }
  } catch (err) {
    console.error('[resolveClientRailData] payment reminders group failed:', err)
  }
  return {}
}

// ---------------------------------------------------------------------------
// Dietary form requests (hydrates client.gap_dietary_missing)
// ---------------------------------------------------------------------------

async function fetchDietaryFormRequests(userId: string): Promise<RailResolverResult> {
  try {
    const rows = await pgClient`
      SELECT dfr.id, dfr.event_id
      FROM dietary_form_requests dfr
      WHERE dfr.client_user_id = ${userId}
        AND dfr.completed_at IS NULL
        AND dfr.expires_at > now()
      LIMIT 1
    `
    const row = rows[0] as { id: string; event_id: string } | undefined
    if (row) {
      return {
        'client.gap_dietary_missing': {
          requestId: row.id,
          eventId: row.event_id,
        },
      }
    }
  } catch (err) {
    console.error('[resolveClientRailData] dietary form requests group failed:', err)
  }
  return {}
}

// ---------------------------------------------------------------------------
// Contract pending (hydrates client.gap_contract_unsigned + client.contract_ready)
// ---------------------------------------------------------------------------

async function fetchContractsPending(tenantId: string | undefined): Promise<RailResolverResult> {
  if (!tenantId) return {}
  try {
    const rows = await pgClient`
      SELECT e.id AS event_id, e.occasion AS event_title, c.display_name AS chef_name
      FROM events e
      JOIN chefs c ON c.id = e.chef_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status IN ('accepted', 'deposit_paid')
        AND NOT EXISTS (
          SELECT 1 FROM event_contracts ec
          WHERE ec.event_id = e.id AND ec.client_signed_at IS NOT NULL
        )
      LIMIT 1
    `
    const row = rows[0] as
      | { event_id: string; event_title: string | null; chef_name: string | null }
      | undefined
    if (row) {
      return {
        // GAP item (completion gap category)
        'client.gap_contract_unsigned': {
          eventTitle: row.event_title,
          id: row.event_id,
          name: row.chef_name,
        },
        // Communication item (contract ready notification)
        'client.contract_ready': {
          eventTitle: row.event_title,
          id: row.event_id,
          name: row.chef_name,
        },
      }
    }
  } catch (err) {
    console.error('[resolveClientRailData] contracts group failed:', err)
  }
  return {}
}

// ---------------------------------------------------------------------------
// Feedback requested (hydrates client.review_prompt)
// ---------------------------------------------------------------------------

async function fetchFeedbackRequested(tenantId: string | undefined): Promise<RailResolverResult> {
  if (!tenantId) return {}
  try {
    const rows = await pgClient`
      SELECT e.id AS event_id, c.display_name AS chef_name
      FROM events e
      JOIN chefs c ON c.id = e.chef_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM event_reviews er
          WHERE er.event_id = e.id AND er.reviewer_type = 'client'
        )
        AND e.event_date >= now() - INTERVAL '30 days'
      ORDER BY e.event_date DESC
      LIMIT 1
    `
    const row = rows[0] as { event_id: string; chef_name: string | null } | undefined
    if (row) {
      return {
        'client.review_prompt': {
          id: row.event_id,
          name: row.chef_name,
        },
      }
    }
  } catch (err) {
    console.error('[resolveClientRailData] feedback group failed:', err)
  }
  return {}
}
