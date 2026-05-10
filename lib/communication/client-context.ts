'use server'

// Fetches client context data for display in inbox thread sidebar.
// Called when thread.client_id is present.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getSingleClientHealthScore } from '@/lib/clients/health-score'

export type ClientThreadContext = {
  clientId: string
  fullName: string
  email: string | null
  phone: string | null
  status: string // active, dormant, vip, repeat_ready
  healthScore: number | null // 0-100
  healthTier: string | null // champion, loyal, at_risk, dormant, new
  totalEvents: number
  totalSpentCents: number
  lastEventDate: string | null
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number | null
  }>
  dietaryRestrictions: string[]
  allergies: string[]
  recentNotes: Array<{
    id: string
    noteText: string
    category: string
    createdAt: string
  }>
  openInquiries: number
}

export async function getClientContextForThread(
  clientId: string
): Promise<ClientThreadContext | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [clientResult, healthScore, upcomingResult, notesResult, inquiryResult, financialResult] =
    await Promise.all([
      // Client record
      db
        .from('clients')
        .select('id, full_name, email, phone, status, dietary_restrictions, allergies')
        .eq('id', clientId)
        .eq('tenant_id', user.tenantId!)
        .is('deleted_at', null)
        .single(),

      // Health score
      getSingleClientHealthScore(clientId).catch(() => null),

      // Upcoming events (not cancelled/completed, future dates, limit 3)
      db
        .from('events')
        .select('id, occasion, event_date, guest_count')
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId!)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .not('status', 'in', '("cancelled","completed")')
        .order('event_date', { ascending: true })
        .limit(3),

      // Recent notes (limit 3)
      db
        .from('client_notes')
        .select('id, note_text, category, created_at')
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId!)
        .order('created_at', { ascending: false })
        .limit(3),

      // Open inquiries count
      db
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId!)
        .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted']),

      // Financial summary
      db
        .from('client_financial_summary')
        .select('lifetime_value_cents, total_events, days_since_last_event')
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId!)
        .single(),
    ])

  const client = clientResult.data
  if (!client) return null

  const financial = financialResult.data
  const upcoming = upcomingResult.data ?? []
  const notes = notesResult.data ?? []
  const openInquiryCount = inquiryResult.count ?? 0

  // Compute last event date from days_since_last_event
  let lastEventDate: string | null = null
  if (financial?.days_since_last_event != null) {
    const d = new Date()
    d.setDate(d.getDate() - financial.days_since_last_event)
    lastEventDate = d.toISOString().split('T')[0]
  }

  return {
    clientId: client.id,
    fullName: client.full_name,
    email: client.email || null,
    phone: client.phone || null,
    status: client.status ?? 'active',
    healthScore: healthScore?.score ?? null,
    healthTier: healthScore?.tier ?? null,
    totalEvents: financial?.total_events ?? 0,
    totalSpentCents: financial?.lifetime_value_cents ?? 0,
    lastEventDate,
    upcomingEvents: upcoming.map((e: any) => ({
      id: e.id,
      occasion: e.occasion ?? null,
      eventDate: e.event_date,
      guestCount: e.guest_count ?? null,
    })),
    dietaryRestrictions: (client.dietary_restrictions ?? []).filter(Boolean),
    allergies: (client.allergies ?? []).filter(Boolean),
    recentNotes: notes.map((n: any) => ({
      id: n.id,
      noteText: n.note_text,
      category: n.category,
      createdAt: n.created_at,
    })),
    openInquiries: openInquiryCount,
  }
}
