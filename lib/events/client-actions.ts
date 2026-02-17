// Client Event Actions - Client-only operations
// Clients can view their events and accept proposals

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { acceptProposal } from '@/lib/events/transitions'
import { revalidatePath } from 'next/cache'

/**
 * Get all events for the current client
 */
export async function getClientEvents() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      client:clients!inner(id, full_name, email)
    `)
    .eq('client_id', user.entityId)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[getClientEvents] Error:', error)
    throw new Error('Failed to fetch events')
  }

  return events
}

/**
 * Get single event by ID (client must own it)
 */
export async function getClientEventById(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  // Fetch event with client data
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      client:clients!inner(id, full_name, email, phone)
    `)
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (error) {
    console.error('[getClientEventById] Error:', error)
    return null
  }

  // Fetch menus attached to this event (via menus.event_id FK)
  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, description, service_style, status')
    .eq('event_id', eventId)

  // Fetch ledger entries (payment history)
  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  // Fetch financial summary from view
  const { data: financial } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  return {
    ...event,
    menus: menus || [],
    ledgerEntries: ledgerEntries || [],
    financial: financial ? {
      totalPaidCents: financial.total_paid_cents ?? 0,
      outstandingBalanceCents: financial.outstanding_balance_cents ?? 0,
      quotedPriceCents: financial.quoted_price_cents ?? 0,
      paymentStatus: financial.payment_status
    } : null
  }
}

/**
 * Accept event proposal
 * Delegates to FSM transitionEvent via acceptProposal() for consistent
 * state validation, permission checks, and audit logging.
 */
export async function acceptEventProposal(eventId: string) {
  await requireClient()

  const result = await acceptProposal(eventId)

  revalidatePath('/my-events')
  revalidatePath(`/my-events/${eventId}`)

  return result
}
