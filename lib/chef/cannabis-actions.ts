'use server'

// Chef Cannabis Actions
// Used by chef portal pages in app/(chef)/cannabis/

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

// ─── Access Check ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given auth user ID has an active cannabis tier.
 * Admins always have access — no manual grant required.
 * Used by the chef layout to conditionally show the cannabis nav section.
 */
export async function hasCannabisAccess(authUserId: string): Promise<boolean> {
  try {
    // Admins always have cannabis tier access
    const adminCheck = await isAdmin().catch(() => false)
    if (adminCheck) return true

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('cannabis_tier_users')
      .select('status')
      .eq('auth_user_id', authUserId)
      .single()

    if (error || !data) return false
    return data.status === 'active'
  } catch {
    return false
  }
}

// ─── Cannabis Events ──────────────────────────────────────────────────────────

/**
 * Get all events for this chef that have cannabis_preference = true,
 * along with their cannabis_event_details if present.
 */
export async function getCannabisEvents() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      event_date,
      serve_time,
      occasion,
      guest_count,
      location_address,
      location_city,
      location_state,
      status,
      quoted_price_cents,
      client_id,
      clients!inner(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)
    .order('event_date', { ascending: false })

  if (error) throw new Error('Failed to fetch cannabis events: ' + error.message)

  // Also fetch cannabis_event_details for these events
  const eventIds = (data ?? []).map((e: any) => e.id)
  let details: any[] = []

  if (eventIds.length > 0) {
    const { data: detailData } = await supabase
      .from('cannabis_event_details')
      .select('*')
      .in('event_id', eventIds)

    details = detailData ?? []
  }

  const detailsByEventId = Object.fromEntries(details.map((d: any) => [d.event_id, d]))

  return (data ?? []).map((event: any) => ({
    ...event,
    cannabis_details: detailsByEventId[event.id] ?? null,
  }))
}

// ─── Cannabis Event Details CRUD ──────────────────────────────────────────────

export async function getCannabisEventDetails(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('cannabis_event_details')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error('Failed to fetch cannabis event details')
  return data ?? null
}

export async function upsertCannabisEventDetails(input: {
  eventId: string
  cannabisCategory?: 'cannabis_friendly' | 'infused_menu' | 'cbd_only' | 'micro_dose'
  guestConsentConfirmed?: boolean
  complianceNotes?: string
  compliancePlaceholderAcknowledged?: boolean
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase.from('cannabis_event_details').upsert(
    {
      event_id: input.eventId,
      tenant_id: user.tenantId!,
      cannabis_category: input.cannabisCategory ?? 'cannabis_friendly',
      guest_consent_confirmed: input.guestConsentConfirmed ?? false,
      compliance_notes: input.complianceNotes ?? null,
      compliance_placeholder_acknowledged: input.compliancePlaceholderAcknowledged ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id' }
  )

  if (error) throw new Error('Failed to save cannabis event details: ' + error.message)
  revalidatePath('/cannabis')
  return { success: true }
}

// ─── Cannabis Ledger ──────────────────────────────────────────────────────────

/**
 * Get ledger entries for all cannabis events owned by this chef.
 */
export async function getCannabisLedger() {
  const user = await requireChef()
  const supabase = createServerClient()

  // First get all cannabis event IDs
  const { data: cannabisEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date, occasion, clients!inner(full_name)')
    .eq('tenant_id', user.tenantId!)
    .eq('cannabis_preference', true)

  if (eventsError) throw new Error('Failed to fetch cannabis events for ledger')

  const eventIds = (cannabisEvents ?? []).map((e: any) => e.id)
  if (eventIds.length === 0)
    return { events: [], entries: [], totals: { revenue: 0, expenses: 0, profit: 0 } }

  // Fetch ledger entries for those events
  const { data: entries, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)
    .order('received_at', { ascending: false })

  if (ledgerError) throw new Error('Failed to fetch cannabis ledger entries')

  const allEntries = entries ?? []

  // Compute totals
  const revenue = allEntries
    .filter(
      (e: any) =>
        !e.is_refund &&
        ['payment', 'deposit', 'installment', 'final_payment', 'tip'].includes(e.entry_type)
    )
    .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

  const expenses = allEntries
    .filter((e: any) => e.entry_type === 'adjustment' && e.amount_cents < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount_cents ?? 0), 0)

  const refunds = allEntries
    .filter((e: any) => e.is_refund)
    .reduce((sum: number, e: any) => sum + (e.amount_cents ?? 0), 0)

  const eventMap = Object.fromEntries((cannabisEvents ?? []).map((e: any) => [e.id, e]))

  return {
    events: cannabisEvents ?? [],
    entries: allEntries.map((e: any) => ({
      ...e,
      event_info: eventMap[e.event_id] ?? null,
    })),
    totals: {
      revenue,
      expenses,
      profit: revenue - expenses - refunds,
    },
  }
}

// ─── Send Invite (routes to admin approval queue) ─────────────────────────────

export async function sendCannabisInvite(input: {
  inviteeEmail: string
  inviteeName?: string
  personalNote?: string
}) {
  const user = await requireChef()
  // Must have cannabis access to send invites
  const hasAccess = await hasCannabisAccess(user.id)
  if (!hasAccess) throw new Error('Cannabis tier access required to send invites')

  const supabase = createServerClient()

  // Check if an invite for this email is already pending or approved
  const { data: existing } = await supabase
    .from('cannabis_tier_invitations')
    .select('id, admin_approval_status, claimed_at')
    .eq('invitee_email', input.inviteeEmail.toLowerCase())
    .in('admin_approval_status', ['pending', 'approved'])
    .is('claimed_at', null)
    .maybeSingle()

  if (existing) {
    if (existing.admin_approval_status === 'pending') {
      throw new Error('An invite for this email is already awaiting admin approval.')
    }
    throw new Error('An active invite for this email already exists.')
  }

  const { error } = await supabase.from('cannabis_tier_invitations').insert({
    invited_by_auth_user_id: user.id,
    invited_by_user_type: 'chef',
    invitee_email: input.inviteeEmail.toLowerCase(),
    invitee_name: input.inviteeName ?? null,
    personal_note: input.personalNote ?? null,
    admin_approval_status: 'pending',
  })

  if (error) throw new Error('Failed to submit invite: ' + error.message)

  revalidatePath('/cannabis/invite')
  return { success: true }
}

// ─── My Sent Invites ──────────────────────────────────────────────────────────

export async function getMySentCannabisInvites() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('cannabis_tier_invitations')
    .select('*')
    .eq('invited_by_auth_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch sent invites')
  return (data ?? []) as {
    id: string
    invitee_email: string
    invitee_name: string | null
    personal_note: string | null
    admin_approval_status: string
    claimed_at: string | null
    created_at: string
  }[]
}
