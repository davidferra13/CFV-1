'use server'

// Unified Client Timeline
// Merges events, inquiries, messages, ledger entries, and client reviews
// into a single chronological feed for the client detail page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { TimelineItemSource } from './unified-timeline-utils'

// Re-export type so existing imports from this file still work
export type { TimelineItemSource } from './unified-timeline-utils'
// SOURCE_CONFIG moved to lib/clients/unified-timeline-utils.ts

export type UnifiedTimelineItem = {
  id: string
  source: TimelineItemSource
  timestamp: string // ISO string used for sorting
  summary: string // One-line human-readable description
  detail?: string // Optional second line (amount, body snippet, etc.)
  href?: string // Clickable link if entity has a page
  actor?: 'chef' | 'client' | 'system'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function snippet(text: string | null | undefined, maxLen = 80): string {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '…' : trimmed
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function getUnifiedClientTimeline(
  clientId: string,
  limit = 60
): Promise<UnifiedTimelineItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Parallel fetch from all sources
  const [eventsRes, inquiriesRes, messagesRes, ledgerRes, reviewsRes] = await Promise.all([
    db
      .from('events')
      .select(
        'id, created_at, event_date, status, occasion, guest_count, quoted_price_cents, cancelled_at'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(30),

    db
      .from('inquiries')
      .select('id, created_at, first_contact_at, last_response_at, status, channel, confirmed_date')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20),

    db
      .from('messages')
      .select('id, created_at, sent_at, channel, direction, body, status, subject')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(30),

    db
      .from('ledger_entries')
      .select('id, created_at, received_at, entry_type, amount_cents, payment_method, description')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(30),

    db
      .from('client_reviews')
      .select('id, created_at, rating, what_they_loved, what_could_improve')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const items: UnifiedTimelineItem[] = []

  // ── Events ──
  for (const e of eventsRes.data ?? []) {
    const row = e as any
    const statusLabels: Record<string, string> = {
      draft: 'Event created (draft)',
      proposed: 'Event proposed to client',
      accepted: 'Client accepted event',
      paid: 'Event deposit paid',
      confirmed: 'Event confirmed',
      in_progress: 'Event in progress',
      completed: 'Event completed',
      cancelled: 'Event cancelled',
    }
    items.push({
      id: `event-${row.id}`,
      source: 'event',
      timestamp: row.cancelled_at ?? row.created_at,
      summary: statusLabels[row.status] ?? `Event - ${row.status}`,
      detail: [
        row.occasion,
        row.guest_count ? `${row.guest_count} guests` : null,
        row.quoted_price_cents ? formatCents(row.quoted_price_cents) : null,
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/events/${row.id}`,
      actor: 'chef',
    })
  }

  // ── Inquiries ──
  for (const inq of inquiriesRes.data ?? []) {
    const row = inq as any
    const ts = row.first_contact_at ?? row.created_at
    const statusLabels: Record<string, string> = {
      new: 'New inquiry received',
      awaiting_client: 'Awaiting client reply',
      awaiting_chef: 'Awaiting chef reply',
      quoted: 'Quote sent',
      confirmed: 'Inquiry confirmed',
      declined: 'Inquiry declined',
      expired: 'Inquiry expired',
    }
    items.push({
      id: `inquiry-${row.id}`,
      source: 'inquiry',
      timestamp: ts,
      summary: statusLabels[row.status] ?? `Inquiry - ${row.status}`,
      detail: row.channel ? `via ${row.channel}` : undefined,
      href: `/pipeline/inquiries/${row.id}`,
      actor: row.status === 'new' ? 'client' : 'chef',
    })
  }

  // ── Messages ──
  for (const msg of messagesRes.data ?? []) {
    const row = msg as any
    const ts = row.sent_at ?? row.created_at
    const dirLabel = row.direction === 'inbound' ? 'Client messaged' : 'You messaged client'
    items.push({
      id: `msg-${row.id}`,
      source: 'message',
      timestamp: ts,
      summary: dirLabel + (row.channel ? ` (${row.channel})` : ''),
      detail: snippet(row.subject || row.body),
      actor: row.direction === 'inbound' ? 'client' : 'chef',
    })
  }

  // ── Ledger Entries (payments) ──
  for (const le of ledgerRes.data ?? []) {
    const row = le as any
    const ts = row.received_at ?? row.created_at
    const typeLabels: Record<string, string> = {
      payment: 'Payment received',
      deposit: 'Deposit received',
      installment: 'Installment received',
      final_payment: 'Final payment received',
      tip: 'Tip received',
      refund: 'Refund issued',
      adjustment: 'Balance adjustment',
      add_on: 'Add-on charge',
      credit: 'Credit applied',
    }
    items.push({
      id: `ledger-${row.id}`,
      source: 'ledger',
      timestamp: ts,
      summary: typeLabels[row.entry_type] ?? `Payment - ${row.entry_type}`,
      detail: [
        formatCents(Math.abs(row.amount_cents)),
        row.payment_method,
        snippet(row.description, 40),
      ]
        .filter(Boolean)
        .join(' · '),
      actor: 'system',
    })
  }

  // ── Reviews ──
  for (const rev of reviewsRes.data ?? []) {
    const row = rev as any
    items.push({
      id: `review-${row.id}`,
      source: 'review',
      timestamp: row.created_at,
      summary: `Client left a review - ${row.rating}/5 stars`,
      detail: snippet(row.what_they_loved || row.what_could_improve),
      actor: 'client',
    })
  }

  // Sort newest first, de-dup by id, truncate
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const seen = new Set<string>()
  const deduped: UnifiedTimelineItem[] = []
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      deduped.push(item)
    }
  }

  return deduped.slice(0, limit)
}
