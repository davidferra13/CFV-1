// Client Event Actions - Client-only operations
// Clients can view their events and accept proposals

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { acceptProposal, transitionEvent } from '@/lib/events/transitions'
import { clientGetOrCreateConversation, sendChatMessage } from '@/lib/chat/actions'
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
    .not('status', 'eq', 'draft')
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
    .not('status', 'eq', 'draft')
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

  // Fetch event state transitions for the journey stepper
  const { data: transitions } = await supabase
    .from('event_state_transitions')
    .select('to_status, transitioned_at')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })

  // Check if any photos exist (for journey stepper "Photos Ready" step)
  const { count: photoCount } = await supabase
    .from('event_photos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .is('deleted_at', null)

  return {
    ...event,
    menus: menus || [],
    ledgerEntries: ledgerEntries || [],
    financial: financial ? {
      totalPaidCents: financial.total_paid_cents ?? 0,
      outstandingBalanceCents: financial.outstanding_balance_cents ?? 0,
      quotedPriceCents: financial.quoted_price_cents ?? 0,
      paymentStatus: financial.payment_status
    } : null,
    transitions: (transitions || []) as Array<{ to_status: string; transitioned_at: string }>,
    hasPhotos: (photoCount ?? 0) > 0,
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

/**
 * Client cancels an event directly (allowed for proposed/accepted states).
 */
export async function cancelEventAsClient(eventId: string, reason: string) {
  const user = await requireClient()
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    throw new Error('Cancellation reason is required')
  }

  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, status, client_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  if (!['proposed', 'accepted'].includes(event.status)) {
    throw new Error('Direct cancellation is only available before payment')
  }

  const result = await transitionEvent({
    eventId,
    toStatus: 'cancelled',
    metadata: {
      action: 'client_cancelled',
      reason: trimmedReason,
      clientId: user.entityId,
    },
  })

  revalidatePath('/my-events')
  revalidatePath(`/my-events/${eventId}`)

  return result
}

/**
 * Client requests cancellation by notifying chef in event chat.
 */
export async function requestCancellationViaChat(eventId: string, reason: string) {
  const user = await requireClient()
  const trimmedReason = reason.trim()
  if (!trimmedReason) {
    throw new Error('Cancellation reason is required')
  }

  const supabase = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, status, occasion, event_date')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  if (!['paid', 'confirmed', 'in_progress'].includes(event.status)) {
    throw new Error('Cancellation requests are only available after payment')
  }

  const conversationResult = await clientGetOrCreateConversation({
    context_type: 'event',
    event_id: eventId,
  })

  await sendChatMessage({
    conversation_id: conversationResult.conversation.id,
    message_type: 'text',
    body: [
      `Cancellation request for "${event.occasion || 'event'}" (${event.event_date}).`,
      `Reason: ${trimmedReason}`,
      'Please confirm next steps and any applicable refund details.',
    ].join('\n'),
  })

  revalidatePath('/my-chat')
  revalidatePath(`/my-events/${eventId}`)

  return { success: true as const }
}
