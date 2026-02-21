'use server'

// Client Portal Actions
// Token-based magic-link access for clients — no account required.
// Chefs generate a token on the client detail page and share it.
// The token URL gives the client a read-mostly view of their events, quotes, and payments.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

export type ClientPortalData = {
  clientId: string
  clientName: string
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
    guest_count: number | null
  }>
  pastEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
  }>
  activeQuotes: Array<{
    id: string
    event_id: string
    event_occasion: string | null
    amount_cents: number
    valid_until: string | null
    status: string
  }>
  pendingPayments: Array<{
    eventId: string
    occasion: string | null
    outstandingCents: number
    paymentUrl: string
  }>
}

// ─── Chef action: generate or rotate portal token ─────────────────────────────

export async function generateClientPortalToken(clientId: string): Promise<string> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify ownership
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const token = randomBytes(32).toString('hex')

  await (supabase as any)
    .from('clients')
    .update({
      portal_access_token: token,
      portal_token_created_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
  return token
}

// ─── Chef action: revoke portal token ─────────────────────────────────────────

export async function revokeClientPortalToken(clientId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  await (supabase as any)
    .from('clients')
    .update({
      portal_access_token: null,
      portal_token_created_at: null,
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
}

// ─── Public: look up client by portal token ────────────────────────────────────
// No auth required — token IS the credential.

export async function getClientPortalData(token: string): Promise<ClientPortalData | null> {
  // Use admin client for public read (no user session)
  const supabase = createServerClient({ admin: true })

  // Look up client by token
  const { data: client } = await (supabase as any)
    .from('clients')
    .select('id, first_name, last_name, portal_access_token')
    .eq('portal_access_token', token)
    .single()

  if (!client) return null

  const clientId = client.id
  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Valued Client'

  const now = new Date().toISOString()

  // Fetch events for this client
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('client_id', clientId)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  const upcoming = (events ?? []).filter(e =>
    e.event_date >= now && !['completed'].includes(e.status)
  )
  const past = (events ?? []).filter(e =>
    e.status === 'completed' || e.event_date < now
  ).slice(-5)

  // Fetch active (sent) quotes for this client's events
  const eventIds = (events ?? []).map(e => e.id)
  let activeQuotes: ClientPortalData['activeQuotes'] = []

  if (eventIds.length > 0) {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, event_id, total_quoted_cents, valid_until, status')
      .in('event_id', eventIds)
      .eq('status', 'sent')

    const eventMap = new Map((events ?? []).map(e => [e.id, e]))
    activeQuotes = (quotes ?? []).filter(q => q.event_id != null).map(q => ({
      id: q.id,
      event_id: q.event_id!,
      event_occasion: eventMap.get(q.event_id!)?.occasion ?? null,
      amount_cents: q.total_quoted_cents ?? 0,
      valid_until: q.valid_until,
      status: q.status,
    }))
  }

  // Fetch outstanding payments from event_financial_summary
  const pendingPayments: ClientPortalData['pendingPayments'] = []
  if (eventIds.length > 0) {
    const { data: summaries } = await supabase
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents, payment_status')
      .in('event_id', eventIds)
      .gt('outstanding_balance_cents', 0)

    const eventMap = new Map((events ?? []).map(e => [e.id, e]))
    for (const s of (summaries ?? []).filter(s => s.event_id != null)) {
      const ev = eventMap.get(s.event_id!)
      if (!ev) continue
      pendingPayments.push({
        eventId: s.event_id!,
        occasion: ev.occasion,
        outstandingCents: s.outstanding_balance_cents ?? 0,
        paymentUrl: `/my-events/${s.event_id!}/pay`,
      })
    }
  }

  return {
    clientId,
    clientName,
    upcomingEvents: upcoming,
    pastEvents: past,
    pendingPayments,
    activeQuotes,
  }
}

// ─── Chef: get portal token for a client (for display on client detail) ───────

export async function getClientPortalToken(clientId: string): Promise<{ token: string | null; createdAt: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await (supabase as any)
    .from('clients')
    .select('portal_access_token, portal_token_created_at')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  return {
    token: data?.portal_access_token ?? null,
    createdAt: data?.portal_token_created_at ?? null,
  }
}
