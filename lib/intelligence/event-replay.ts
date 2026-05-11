// Event Replay - Timeline reconstruction of a past event
// Reconstructs the full lifecycle: booking, planning, execution, aftermath.
// Used as a learning tool and client history reference.

import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────────

export type TimelineEntryType =
  | 'booking'
  | 'menu_created'
  | 'menu_approved'
  | 'quote_sent'
  | 'payment_received'
  | 'prep_started'
  | 'service_started'
  | 'service_completed'
  | 'follow_up'
  | 'aar_filed'
  | 'status_change'
  | 'communication'
  | 'note'

export interface TimelineEntry {
  type: TimelineEntryType
  timestamp: string
  title: string
  detail: string | null
  icon: string // icon name hint for the UI
}

export interface EventReplayHighlight {
  type: 'positive' | 'negative' | 'learning'
  title: string
  detail: string
}

export interface EventReplayFinancials {
  quotedCents: number
  paidCents: number
  expensesCents: number
  profitCents: number
  marginPercent: number
  perGuestRevenueCents: number
  perGuestProfitCents: number
}

export interface EventReplay {
  eventId: string
  occasion: string
  eventDate: string
  clientName: string
  guestCount: number
  status: string
  timeline: TimelineEntry[]
  highlights: EventReplayHighlight[]
  learnings: EventReplayHighlight[]
  financials: EventReplayFinancials | null
  menuItems: string[]
  aarSummary: {
    calmRating: number
    prepRating: number
    executionRating: number | null
    whatWentWell: string | null
    whatWentWrong: string | null
    wouldDoDifferently: string | null
    forgottenItems: string[]
  } | null
}

// ── Main Function ──────────────────────────────────────────────────────────────

export async function generateEventReplay(
  eventId: string,
  tenantId: string
): Promise<EventReplay | null> {
  const db: any = createServerClient()

  // Fetch event with related data
  const { data: event, error } = await db
    .from('events')
    .select(`
      id, occasion, event_date, guest_count, status, created_at,
      quoted_price_cents, amount_paid_cents,
      service_started_at, service_completed_at,
      follow_up_sent_at, follow_up_sent,
      menu_approval_status, menu_sent_at, menu_approved_at,
      time_shopping_minutes, time_prep_minutes, time_service_minutes,
      time_travel_minutes, time_reset_minutes,
      aar_filed,
      client:clients(id, full_name, email)
    `)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) return null

  const timeline: TimelineEntry[] = []
  const highlights: EventReplayHighlight[] = []
  const learnings: EventReplayHighlight[] = []

  // ── Build Timeline ──

  // 1. Booking created
  if (event.created_at) {
    timeline.push({
      type: 'booking',
      timestamp: event.created_at,
      title: 'Event created',
      detail: `${event.occasion || 'Event'} for ${(event.client as any)?.full_name || 'client'}`,
      icon: 'Calendar',
    })
  }

  // 2. Status transitions
  const { data: transitions } = await db
    .from('event_transitions')
    .select('from_status, to_status, created_at, reason')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  for (const t of (transitions ?? []) as any[]) {
    timeline.push({
      type: 'status_change',
      timestamp: t.created_at,
      title: `Status: ${formatStatus(t.from_status)} to ${formatStatus(t.to_status)}`,
      detail: t.reason || null,
      icon: 'ArrowRight',
    })
  }

  // 3. Quote/payment events
  const { data: ledgerEntries } = await db
    .from('ledger_entries')
    .select('type, amount_cents, description, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  for (const entry of (ledgerEntries ?? []) as any[]) {
    if (entry.type === 'payment' || entry.type === 'income') {
      timeline.push({
        type: 'payment_received',
        timestamp: entry.created_at,
        title: `Payment received: $${(entry.amount_cents / 100).toFixed(2)}`,
        detail: entry.description || null,
        icon: 'CurrencyDollar',
      })
    }
  }

  // 4. Menu events
  if (event.menu_sent_at) {
    timeline.push({
      type: 'menu_created',
      timestamp: event.menu_sent_at,
      title: 'Menu sent to client',
      detail: null,
      icon: 'UtensilsCrossed',
    })
  }

  if (event.menu_approved_at) {
    timeline.push({
      type: 'menu_approved',
      timestamp: event.menu_approved_at,
      title: 'Menu approved by client',
      detail: null,
      icon: 'Check',
    })
  }

  // 5. Service timeline
  if (event.service_started_at) {
    timeline.push({
      type: 'service_started',
      timestamp: event.service_started_at,
      title: 'Service started',
      detail: `${event.guest_count || 0} guests`,
      icon: 'Play',
    })
  }

  if (event.service_completed_at) {
    timeline.push({
      type: 'service_completed',
      timestamp: event.service_completed_at,
      title: 'Service completed',
      detail: event.time_service_minutes
        ? `${event.time_service_minutes} minutes of service`
        : null,
      icon: 'CheckCircle',
    })
  }

  // 6. Follow-up
  if (event.follow_up_sent_at) {
    timeline.push({
      type: 'follow_up',
      timestamp: event.follow_up_sent_at,
      title: 'Follow-up sent',
      detail: null,
      icon: 'Envelope',
    })
  }

  // 7. Get menu items
  const { data: menuDishes } = await db
    .from('dishes')
    .select('name, course')
    .eq('tenant_id', tenantId)
    .not('menu_id', 'is', null)
    .in('menu_id', (
      await db
        .from('menus')
        .select('id')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
    ).data?.map((m: any) => m.id) ?? [])

  const menuItems = (menuDishes ?? []).map(
    (d: any) => `${d.course ? `[${d.course}] ` : ''}${d.name}`
  )

  // 8. AAR data
  const { data: aar } = await db
    .from('after_action_reviews')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  let aarSummary: EventReplay['aarSummary'] = null

  if (aar) {
    timeline.push({
      type: 'aar_filed',
      timestamp: aar.created_at,
      title: 'After-action review filed',
      detail: `Calm: ${aar.calm_rating}/5, Prep: ${aar.preparation_rating}/5`,
      icon: 'ClipboardText',
    })

    aarSummary = {
      calmRating: aar.calm_rating,
      prepRating: aar.preparation_rating,
      executionRating: aar.execution_rating ?? null,
      whatWentWell: aar.what_went_well ?? null,
      whatWentWrong: aar.what_went_wrong ?? null,
      wouldDoDifferently: aar.would_do_differently ?? null,
      forgottenItems: aar.forgotten_items ?? [],
    }

    // Build highlights from AAR
    if (aar.what_went_well) {
      highlights.push({
        type: 'positive',
        title: 'What went well',
        detail: aar.what_went_well,
      })
    }

    if (aar.what_went_wrong) {
      highlights.push({
        type: 'negative',
        title: 'What went wrong',
        detail: aar.what_went_wrong,
      })
    }

    if (aar.would_do_differently) {
      learnings.push({
        type: 'learning',
        title: 'Would do differently',
        detail: aar.would_do_differently,
      })
    }

    if (aar.forgotten_items && aar.forgotten_items.length > 0) {
      learnings.push({
        type: 'learning',
        title: 'Forgotten items',
        detail: aar.forgotten_items.join(', '),
      })
    }

    if (aar.calm_rating >= 4 && aar.preparation_rating >= 4) {
      highlights.push({
        type: 'positive',
        title: 'Well-executed event',
        detail: `High ratings across the board (calm: ${aar.calm_rating}/5, prep: ${aar.preparation_rating}/5)`,
      })
    }

    if (aar.calm_rating <= 2) {
      learnings.push({
        type: 'learning',
        title: 'Stressful service',
        detail: `Calm rating was ${aar.calm_rating}/5. Review prep timeline and logistics.`,
      })
    }
  }

  // Sort timeline by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // ── Financials ──

  let financials: EventReplayFinancials | null = null
  const quotedCents = event.quoted_price_cents ?? 0
  const paidCents = event.amount_paid_cents ?? 0
  const guestCount = event.guest_count ?? 1

  // Get expenses from ledger
  const totalExpenses = (ledgerEntries ?? [])
    .filter((e: any) => e.type === 'expense' || e.type === 'cost')
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount_cents ?? 0), 0)

  if (paidCents > 0 || quotedCents > 0) {
    const profitCents = paidCents - totalExpenses
    const marginPercent = paidCents > 0 ? Math.round((profitCents / paidCents) * 100) : 0

    financials = {
      quotedCents,
      paidCents,
      expensesCents: totalExpenses,
      profitCents,
      marginPercent,
      perGuestRevenueCents: Math.round(paidCents / guestCount),
      perGuestProfitCents: Math.round(profitCents / guestCount),
    }

    if (marginPercent > 60) {
      highlights.push({
        type: 'positive',
        title: 'Strong profitability',
        detail: `${marginPercent}% margin ($${(profitCents / 100).toFixed(2)} profit)`,
      })
    } else if (marginPercent < 20 && marginPercent >= 0) {
      learnings.push({
        type: 'learning',
        title: 'Low margin event',
        detail: `Only ${marginPercent}% margin. Consider adjusting pricing for similar events.`,
      })
    }
  }

  return {
    eventId: event.id,
    occasion: event.occasion || 'Event',
    eventDate: event.event_date,
    clientName: (event.client as any)?.full_name || 'Unknown',
    guestCount,
    status: event.status,
    timeline,
    highlights,
    learnings,
    financials,
    menuItems,
    aarSummary,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatStatus(status: string): string {
  return (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
