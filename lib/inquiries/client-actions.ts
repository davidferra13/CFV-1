// Inquiry Client Actions
// Read-only access for the client portal - clients can view their own inquiries.
// RLS policies (inquiries_client_select, inquiry_transitions_client_select) were
// established in Layer 2 (20260215000002_layer_2_inquiry_messaging.sql).

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ClientInquiryListItem = {
  id: string
  status: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_location: string | null
  first_contact_at: string
  updated_at: string
  converted_to_event_id: string | null
}

export type ClientInquiryDetail = ClientInquiryListItem & {
  confirmed_budget_cents: number | null
  unknown_fields: unknown
  confirmed_dietary_restrictions: string[] | null
  confirmed_service_expectations: string | null
  source_message: string | null
  last_response_at: string | null
  transitions: {
    id: string
    from_status: string | null
    to_status: string
    transitioned_at: string
    reason: string | null
  }[]
  quotes: {
    id: string
    quote_name: string | null
    total_quoted_cents: number
    status: string
    pricing_model: string | null
    sent_at: string | null
  }[]
}

// ─── 1. List client's inquiries ──────────────────────────────────────────────

/**
 * Returns the client's active inquiries (excludes declined and expired).
 * Ordered most recent first.
 */
export async function getClientInquiries(): Promise<ClientInquiryListItem[]> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select(
      `
      id,
      status,
      confirmed_occasion,
      confirmed_date,
      confirmed_guest_count,
      confirmed_location,
      first_contact_at,
      updated_at,
      converted_to_event_id
    `
    )
    .eq('client_id', user.entityId)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted', 'confirmed'])
    .order('first_contact_at', { ascending: false })

  if (error) {
    console.error('[getClientInquiries] Error:', error)
    throw new Error('Failed to fetch inquiries')
  }

  return (data || []) as ClientInquiryListItem[]
}

// ─── 2. Get single inquiry for client ───────────────────────────────────────

/**
 * Returns full inquiry detail for the client, including transition history
 * and linked quotes. Returns null if not found or not owned by this client.
 */
export async function getClientInquiryById(inquiryId: string): Promise<ClientInquiryDetail | null> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select(
      `
      id,
      status,
      confirmed_occasion,
      confirmed_date,
      confirmed_guest_count,
      confirmed_location,
      confirmed_budget_cents,
      unknown_fields,
      confirmed_dietary_restrictions,
      confirmed_service_expectations,
      source_message,
      first_contact_at,
      last_response_at,
      updated_at,
      converted_to_event_id
    `
    )
    .eq('id', inquiryId)
    .eq('client_id', user.entityId)
    .single()

  if (error || !inquiry) return null

  // Fetch transition history - RLS policy covers this
  const { data: transitions } = await supabase
    .from('inquiry_state_transitions')
    .select('id, from_status, to_status, transitioned_at, reason')
    .eq('inquiry_id', inquiryId)
    .order('transitioned_at', { ascending: true })

  // Fetch linked quotes - quotes_client_can_view_own RLS policy covers this
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_name, total_quoted_cents, status, pricing_model, sent_at')
    .eq('inquiry_id', inquiryId)
    .eq('client_id', user.entityId)
    .in('status', ['sent', 'accepted', 'rejected'])

  return {
    ...(inquiry as any),
    transitions: transitions || [],
    quotes: quotes || [],
  } as ClientInquiryDetail
}
