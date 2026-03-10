'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getCall } from './actions'

// ─── Types ───────────────────────────────────────────────────────

export type PreCallBrief = {
  callId: string
  generatedAt: string
  client: {
    name: string
    email: string | null
    phone: string | null
    preferredContact: string | null
    dietaryRestrictions: string[]
    allergies: string[]
    dislikes: string[]
    favoriteCuisines: string[]
    spiceTolerance: string | null
    notes: string | null
  } | null
  eventHistory: {
    totalEvents: number
    events: {
      id: string
      title: string | null
      date: string | null
      status: string
      guestCount: number | null
      occasion: string | null
    }[]
  }
  financial: {
    totalSpentCents: number
    averageEventValueCents: number
    paymentBehavior: 'excellent' | 'good' | 'fair' | 'unknown'
    outstandingBalanceCents: number
  }
  healthScore: {
    score: number
    tier: string
  } | null
  openItems: {
    pendingQuotes: number
    upcomingEvents: number
    openInquiries: number
  }
  lastCommunication: string | null
  contactName: string
}

// ─── Action ──────────────────────────────────────────────────────

/**
 * Generate a deterministic pre-call intelligence brief.
 * No AI involved. Gathers client profile, event history, financials,
 * health score, and open items from the database.
 */
export async function generatePreCallBrief(callId: string): Promise<PreCallBrief> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get call details
  const call = await getCall(callId)
  if (!call) throw new Error('Call not found')

  const contactName =
    call.client?.full_name || call.contact_name || call.contact_company || 'Unknown'
  const clientId = call.client_id

  // Build brief sections
  let clientInfo: PreCallBrief['client'] = null
  let eventHistory: PreCallBrief['eventHistory'] = { totalEvents: 0, events: [] }
  let financial: PreCallBrief['financial'] = {
    totalSpentCents: 0,
    averageEventValueCents: 0,
    paymentBehavior: 'unknown',
    outstandingBalanceCents: 0,
  }
  let healthScore: PreCallBrief['healthScore'] = null
  let openItems: PreCallBrief['openItems'] = {
    pendingQuotes: 0,
    upcomingEvents: 0,
    openInquiries: 0,
  }
  let lastCommunication: string | null = null

  if (clientId) {
    // ── Client profile ──
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (client) {
      clientInfo = {
        name: client.full_name,
        email: client.email || null,
        phone: client.phone || null,
        preferredContact: client.preferred_contact_method || null,
        dietaryRestrictions: client.dietary_restrictions || [],
        allergies: client.allergies || [],
        dislikes: client.dislikes || [],
        favoriteCuisines: client.favorite_cuisines || [],
        spiceTolerance: client.spice_tolerance || null,
        notes: client.notes || null,
      }
    }

    // ── Event history ──
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, status, guest_count, occasion')
      .eq('client_id', clientId)
      .eq('chef_id', user.tenantId!)
      .order('event_date', { ascending: false })
      .limit(10)

    if (events && events.length > 0) {
      // Get total count
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('chef_id', user.tenantId!)

      eventHistory = {
        totalEvents: count || events.length,
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          status: e.status,
          guestCount: e.guest_count,
          occasion: e.occasion,
        })),
      }
    }

    // ── Financial summary ──
    const { data: ledgerEntries } = await supabase
      .from('ledger_entries')
      .select('amount_cents, entry_type')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)

    if (ledgerEntries && ledgerEntries.length > 0) {
      const payments = ledgerEntries
        .filter((e: any) => e.entry_type === 'payment')
        .reduce((s: number, e: any) => s + Math.abs(e.amount_cents || 0), 0)

      const charges = ledgerEntries
        .filter((e: any) => e.entry_type === 'charge' || e.entry_type === 'invoice')
        .reduce((s: number, e: any) => s + Math.abs(e.amount_cents || 0), 0)

      const completedEvents = eventHistory.events.filter((e) => e.status === 'completed').length

      financial = {
        totalSpentCents: payments,
        averageEventValueCents: completedEvents > 0 ? Math.round(payments / completedEvents) : 0,
        paymentBehavior:
          charges > 0 && payments >= charges * 0.95
            ? 'excellent'
            : charges > 0 && payments >= charges * 0.8
              ? 'good'
              : charges > 0
                ? 'fair'
                : 'unknown',
        outstandingBalanceCents: Math.max(0, charges - payments),
      }
    }

    // ── Health score ──
    try {
      const { getClientHealthScores } = await import('@/lib/clients/health-score')
      const summary = await getClientHealthScores()
      const clientScore = summary.scores.find((s) => s.clientId === clientId)
      if (clientScore) {
        healthScore = {
          score: clientScore.score,
          tier: clientScore.tier,
        }
      }
    } catch (err) {
      console.error('[pre-call-brief] Health score lookup failed:', err)
    }

    // ── Open items ──
    const { count: quoteCount } = await supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .in('status', ['draft', 'sent'])

    const today = new Date().toISOString().split('T')[0]
    const { count: upcomingCount } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('chef_id', user.tenantId!)
      .gte('event_date', today)
      .not('status', 'in', '("completed","cancelled")')

    const { count: inquiryCount } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .in('status', ['new', 'in_progress', 'follow_up'])

    openItems = {
      pendingQuotes: quoteCount || 0,
      upcomingEvents: upcomingCount || 0,
      openInquiries: inquiryCount || 0,
    }

    // ── Last communication ──
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastMsg) {
      lastCommunication = lastMsg.created_at
    }
  }

  return {
    callId,
    generatedAt: new Date().toISOString(),
    contactName,
    client: clientInfo,
    eventHistory,
    financial,
    healthScore,
    openItems,
    lastCommunication,
  }
}
