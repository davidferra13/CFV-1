'use server'

// Waiting State Radar - Collectors
// Derives waiting items from existing domain tables.
// Each collector is isolated: failures log and skip, never crash the radar.

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db/index'
import type { WaitingItem, WaitingRiskLevel } from './types'

// ---- Helpers ----

function riskFromAge(createdAt: string, thresholdDays: number): WaitingRiskLevel {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays > thresholdDays * 2) return 'critical'
  if (ageDays > thresholdDays) return 'high'
  if (ageDays > thresholdDays / 2) return 'medium'
  return 'low'
}

// ---- Inquiry Collector ----

async function collectInquiries(tenantId: string): Promise<WaitingItem[]> {
  try {
    const rows = await pgClient`
      SELECT i.id, i.status, i.created_at, i.updated_at,
             i.client_name, i.event_type, i.follow_up_date,
             i.quoted_price_cents
      FROM inquiries i
      WHERE i.tenant_id = ${tenantId}
        AND i.status IN ('new', 'contacted', 'follow_up')
        AND i.archived_at IS NULL
      ORDER BY i.created_at ASC
      LIMIT 50
    `
    return rows.map((r: any) => {
      const isNew = r.status === 'new'
      return {
        id: `inquiry:${r.id}`,
        sourceKind: 'inquiry' as const,
        waitingOn: isNew ? ('chef' as const) : ('client' as const),
        title: `Inquiry: ${r.client_name || 'unknown'}`,
        waitingReason: isNew
          ? `New inquiry from ${r.client_name || 'unknown'} needs response`
          : `Waiting for ${r.client_name || 'client'} to reply`,
        followUpAt: r.follow_up_date || null,
        proofHref: `/inquiries?highlight=${r.id}`,
        riskLevel: riskFromAge(r.created_at, 3),
        waitingSince: r.created_at,
        revenueCents: r.quoted_price_cents || null,
        clientName: r.client_name || null,
        eventName: r.event_type || null,
      }
    })
  } catch (err) {
    console.error('[WaitingRadar] Inquiry collector failed:', err)
    return []
  }
}

// ---- Quote Collector ----

async function collectQuotes(tenantId: string): Promise<WaitingItem[]> {
  try {
    const rows = await pgClient`
      SELECT q.id, q.status, q.created_at, q.sent_at,
             q.total_cents, q.expires_at,
             c.full_name AS client_name,
             e.occasion AS event_name
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      LEFT JOIN events e ON e.id = q.event_id
      WHERE q.tenant_id = ${tenantId}
        AND q.status IN ('sent', 'viewed')
      ORDER BY q.sent_at ASC NULLS LAST
      LIMIT 50
    `
    return rows.map((r: any) => {
      const isExpired = r.expires_at && new Date(r.expires_at) < new Date()
      return {
        id: `quote:${r.id}`,
        sourceKind: 'quote' as const,
        waitingOn: 'client' as const,
        title: `Quote: ${r.client_name || 'client'}`,
        waitingReason: isExpired
          ? `Quote expired, awaiting ${r.client_name || 'client'} decision`
          : `Quote sent to ${r.client_name || 'client'}, awaiting acceptance`,
        followUpAt: r.expires_at || null,
        proofHref: `/quotes?highlight=${r.id}`,
        riskLevel: isExpired ? 'high' as const : riskFromAge(r.sent_at || r.created_at, 7),
        waitingSince: r.sent_at || r.created_at,
        revenueCents: r.total_cents || null,
        clientName: r.client_name || null,
        eventName: r.event_name || null,
      }
    })
  } catch (err) {
    console.error('[WaitingRadar] Quote collector failed:', err)
    return []
  }
}

// ---- Contract Collector ----

async function collectContracts(tenantId: string): Promise<WaitingItem[]> {
  try {
    const rows = await pgClient`
      SELECT ct.id, ct.status, ct.created_at, ct.sent_at,
             c.full_name AS client_name,
             e.occasion AS event_name
      FROM contracts ct
      LEFT JOIN clients c ON c.id = ct.client_id
      LEFT JOIN events e ON e.id = ct.event_id
      WHERE ct.tenant_id = ${tenantId}
        AND ct.status = 'sent'
      ORDER BY ct.sent_at ASC NULLS LAST
      LIMIT 50
    `
    return rows.map((r: any) => ({
      id: `contract:${r.id}`,
      sourceKind: 'contract' as const,
      waitingOn: 'client' as const,
      title: `Contract: ${r.client_name || 'client'}`,
      waitingReason: `Contract sent to ${r.client_name || 'client'}, awaiting signature`,
      followUpAt: null,
      proofHref: `/contracts?highlight=${r.id}`,
      riskLevel: riskFromAge(r.sent_at || r.created_at, 5),
      waitingSince: r.sent_at || r.created_at,
      revenueCents: null,
      clientName: r.client_name || null,
      eventName: r.event_name || null,
    }))
  } catch (err) {
    console.error('[WaitingRadar] Contract collector failed:', err)
    return []
  }
}

// ---- Payment Collector ----

async function collectPayments(tenantId: string): Promise<WaitingItem[]> {
  try {
    const rows = await pgClient`
      SELECT e.id, e.status, e.created_at, e.event_date,
             e.occasion, e.quoted_price_cents,
             c.full_name AS client_name,
             COALESCE(
               (SELECT SUM(amount_cents) FROM ledger_entries le
                WHERE le.event_id = e.id AND le.entry_type = 'payment'),
               0
             ) AS paid_cents
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status IN ('accepted', 'confirmed')
        AND e.deleted_at IS NULL
        AND e.quoted_price_cents > 0
      ORDER BY e.event_date ASC NULLS LAST
      LIMIT 50
    `
    return rows
      .filter((r: any) => (r.quoted_price_cents || 0) > (r.paid_cents || 0))
      .map((r: any) => {
        const outstanding = (r.quoted_price_cents || 0) - (r.paid_cents || 0)
        return {
          id: `payment:${r.id}`,
          sourceKind: 'payment' as const,
          waitingOn: 'payment' as const,
          title: `Payment: ${r.occasion || 'event'}`,
          waitingReason: `$${(outstanding / 100).toFixed(0)} outstanding for ${r.occasion || 'event'}`,
          followUpAt: r.event_date || null,
          proofHref: `/events/${r.id}`,
          riskLevel: (r.event_date && new Date(r.event_date) < new Date(Date.now() + 7 * 86400000)
            ? 'high'
            : 'medium') as WaitingRiskLevel,
          waitingSince: r.created_at,
          revenueCents: outstanding,
          clientName: r.client_name || null,
          eventName: r.occasion || null,
        }
      })
  } catch (err) {
    console.error('[WaitingRadar] Payment collector failed:', err)
    return []
  }
}

// ---- Task/Reminder Collector ----

async function collectTasksAndReminders(tenantId: string): Promise<WaitingItem[]> {
  try {
    const items: WaitingItem[] = []

    const tasks = await pgClient`
      SELECT t.id, t.title, t.due_date, t.created_at, t.status, t.priority
      FROM tasks t
      WHERE t.chef_id = ${tenantId}
        AND t.status IN ('pending', 'in_progress')
      ORDER BY t.due_date ASC NULLS LAST
      LIMIT 30
    `
    for (const t of tasks) {
      const ta = t as any
      items.push({
        id: `task:${ta.id}`,
        sourceKind: 'task' as const,
        waitingOn: 'chef' as const,
        title: ta.title || 'Pending task',
        waitingReason: ta.title || 'Pending task',
        followUpAt: ta.due_date || null,
        proofHref: '/tasks',
        riskLevel: ta.priority === 'urgent' ? 'critical' : ta.priority === 'high' ? 'high' : 'medium',
        waitingSince: ta.created_at,
        revenueCents: null,
        clientName: null,
        eventName: null,
      })
    }

    const reminders = await pgClient`
      SELECT r.id, r.text, r.due_date, r.created_at, r.priority
      FROM chef_todos r
      WHERE r.chef_id = ${tenantId}
        AND r.completed = false
      ORDER BY r.due_date ASC NULLS LAST
      LIMIT 30
    `
    for (const r of reminders) {
      const ra = r as any
      items.push({
        id: `reminder:${ra.id}`,
        sourceKind: 'reminder' as const,
        waitingOn: 'chef' as const,
        title: ra.text || 'Pending reminder',
        waitingReason: ra.text || 'Pending reminder',
        followUpAt: ra.due_date || null,
        proofHref: '/reminders',
        riskLevel: ra.priority === 'urgent' ? 'high' : 'medium',
        waitingSince: ra.created_at,
        revenueCents: null,
        clientName: null,
        eventName: null,
      })
    }

    return items
  } catch (err) {
    console.error('[WaitingRadar] Task/reminder collector failed:', err)
    return []
  }
}

// ---- Event Collector ----

async function collectEvents(tenantId: string): Promise<WaitingItem[]> {
  try {
    const rows = await pgClient`
      SELECT e.id, e.status, e.created_at, e.event_date,
             e.occasion, e.quoted_price_cents,
             c.full_name AS client_name
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${tenantId}
        AND e.status IN ('proposed', 'draft')
        AND e.deleted_at IS NULL
      ORDER BY e.event_date ASC NULLS LAST
      LIMIT 30
    `
    return rows.map((r: any) => ({
      id: `event:${r.id}`,
      sourceKind: 'event' as const,
      waitingOn: r.status === 'proposed' ? ('client' as const) : ('chef' as const),
      title: r.occasion || 'Event',
      waitingReason:
        r.status === 'proposed'
          ? `Proposal sent to ${r.client_name || 'client'}, awaiting response`
          : `Draft event needs attention`,
      followUpAt: r.event_date || null,
      proofHref: `/events/${r.id}`,
      riskLevel: riskFromAge(r.created_at, 7),
      waitingSince: r.created_at,
      revenueCents: r.quoted_price_cents || null,
      clientName: r.client_name || null,
      eventName: r.occasion || null,
    }))
  } catch (err) {
    console.error('[WaitingRadar] Event collector failed:', err)
    return []
  }
}

// ---- Public API ----

export async function collectWaitingItems(): Promise<WaitingItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const [inquiries, quotes, contracts, payments, tasksAndReminders, events] =
    await Promise.allSettled([
      collectInquiries(tenantId),
      collectQuotes(tenantId),
      collectContracts(tenantId),
      collectPayments(tenantId),
      collectTasksAndReminders(tenantId),
      collectEvents(tenantId),
    ])

  const items: WaitingItem[] = []
  const results = [inquiries, quotes, contracts, payments, tasksAndReminders, events]
  const labels = ['inquiries', 'quotes', 'contracts', 'payments', 'tasks', 'events']

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      items.push(...r.value)
    } else {
      console.error(`[WaitingRadar] ${labels[i]} collector rejected:`, r.reason)
    }
  }

  // Dedup by id
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

/** Compatibility alias used by existing rail resolver */
export { collectWaitingItems as collectWaitingRadar }
