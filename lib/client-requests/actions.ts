'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// Types
// ============================================

export type QuickRequestStatus = 'pending' | 'confirmed' | 'declined' | 'converted'

export interface CreateQuickRequestInput {
  requestedDate: string // ISO date string
  requestedTime?: string | null
  guestCount: number
  notes?: string | null
  preferredMenuId?: string | null
}

export interface QuickRequest {
  id: string
  tenant_id: string
  client_id: string
  requested_date: string
  requested_time: string | null
  guest_count: number
  notes: string | null
  preferred_menu_id: string | null
  status: QuickRequestStatus
  decline_reason: string | null
  converted_event_id: string | null
  created_at: string
  updated_at: string
}

export interface QuickRequestWithClient extends QuickRequest {
  client: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
}

// ============================================
// Client Actions
// ============================================

/**
 * Client creates a quick request for their chef.
 */
export async function createQuickRequest(input: CreateQuickRequestInput) {
  const user = await requireClient()
  const supabase = createServerClient()

  if (!input.requestedDate) {
    throw new Error('Date is required')
  }
  if (!input.guestCount || input.guestCount < 1) {
    throw new Error('Guest count must be at least 1')
  }

  // tenant_id comes from the client's session, never from input
  const tenantId = user.tenantId
  if (!tenantId) {
    throw new Error('No tenant associated with this client')
  }

  const { data, error } = await supabase
    .from('client_quick_requests')
    .insert({
      tenant_id: tenantId,
      client_id: user.entityId,
      requested_date: input.requestedDate,
      requested_time: input.requestedTime || null,
      guest_count: input.guestCount,
      notes: input.notes || null,
      preferred_menu_id: input.preferredMenuId || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[createQuickRequest] Error:', error)
    throw new Error('Failed to create request')
  }

  revalidatePath('/my-events/request')

  return data
}

/**
 * Client views their past requests.
 */
export async function getClientRequestHistory() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('client_quick_requests')
    .select('*')
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientRequestHistory] Error:', error)
    throw new Error('Failed to fetch request history')
  }

  return (data ?? []) as QuickRequest[]
}

/**
 * Client gets their most recent menu from past events (for "repeat last menu" feature).
 */
export async function getClientLastMenu() {
  const user = await requireClient()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('menu_id, menus(id, name)')
    .eq('client_id', user.entityId)
    .not('menu_id', 'is', null)
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No past events with a menu is fine
    return null
  }

  return data?.menus ? { id: (data.menus as any).id, name: (data.menus as any).name } : null
}

// ============================================
// Chef Actions
// ============================================

/**
 * Chef views pending (and optionally filtered) quick requests.
 */
export async function getQuickRequests(filters?: { status?: QuickRequestStatus }) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('client_quick_requests')
    .select(`
      *,
      client:clients!inner(id, full_name, email, phone)
    `)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getQuickRequests] Error:', error)
    throw new Error('Failed to fetch quick requests')
  }

  return (data ?? []) as QuickRequestWithClient[]
}

/**
 * Chef gets count of pending quick requests (for dashboard widget).
 */
export async function getPendingQuickRequestCount() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { count, error } = await supabase
    .from('client_quick_requests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.entityId)
    .eq('status', 'pending')

  if (error) {
    console.error('[getPendingQuickRequestCount] Error:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Chef converts a quick request into a real event.
 * Returns the new event ID so the chef can navigate to the event form to finish details.
 */
export async function convertRequestToEvent(requestId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('client_quick_requests')
    .select(`
      *,
      client:clients!inner(id, full_name, email, phone, dietary_notes, allergens)
    `)
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !request) {
    console.error('[convertRequestToEvent] Fetch error:', fetchError)
    throw new Error('Request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be converted')
  }

  // Create a draft event pre-filled from the request
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: user.entityId,
      client_id: request.client_id,
      event_date: request.requested_date,
      guest_count: request.guest_count,
      menu_id: request.preferred_menu_id,
      occasion: 'Quick Request',
      notes: request.notes,
      status: 'draft',
    })
    .select()
    .single()

  if (eventError || !event) {
    console.error('[convertRequestToEvent] Event creation error:', eventError)
    throw new Error('Failed to create event')
  }

  // Update the request status
  const { error: updateError } = await supabase
    .from('client_quick_requests')
    .update({
      status: 'converted',
      converted_event_id: event.id,
    })
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)

  if (updateError) {
    console.error('[convertRequestToEvent] Update error:', updateError)
    // Event was created but request status update failed; log but don't throw
  }

  revalidatePath('/dashboard')
  revalidatePath('/events')

  return { eventId: event.id }
}

/**
 * Chef declines a quick request with an optional reason.
 */
export async function declineRequest(requestId: string, reason?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify request belongs to this chef's tenant and is pending
  const { data: request, error: fetchError } = await supabase
    .from('client_quick_requests')
    .select('id, status')
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !request) {
    throw new Error('Request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be declined')
  }

  const { error } = await supabase
    .from('client_quick_requests')
    .update({
      status: 'declined',
      decline_reason: reason || null,
    })
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[declineRequest] Error:', error)
    throw new Error('Failed to decline request')
  }

  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Chef confirms a quick request (without full event conversion).
 */
export async function confirmRequest(requestId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: request, error: fetchError } = await supabase
    .from('client_quick_requests')
    .select('id, status')
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)
    .single()

  if (fetchError || !request) {
    throw new Error('Request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be confirmed')
  }

  const { error } = await supabase
    .from('client_quick_requests')
    .update({ status: 'confirmed' })
    .eq('id', requestId)
    .eq('tenant_id', user.entityId)

  if (error) {
    console.error('[confirmRequest] Error:', error)
    throw new Error('Failed to confirm request')
  }

  revalidatePath('/dashboard')

  return { success: true }
}
