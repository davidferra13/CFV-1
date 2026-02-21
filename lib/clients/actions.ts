// Client Management Server Actions
// Chef-only: Invitation-based client signup
// Enforces tenant scoping

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import crypto from 'crypto'

const InviteClientSchema = z.object({
  email: z.string().email('Valid email required'),
  full_name: z.string().min(1, 'Name required'),
})

const UpdateClientSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  favorite_cuisines: z.array(z.string()).optional(),
  favorite_dishes: z.array(z.string()).optional(),
  wine_beverage_preferences: z.string().optional(),
  partner_name: z.string().optional(),
  parking_instructions: z.string().optional(),
  access_instructions: z.string().optional(),
  kitchen_size: z.string().optional(),
  kitchen_constraints: z.string().optional(),
  house_rules: z.string().optional(),
  equipment_available: z.array(z.string()).optional(),
  equipment_must_bring: z.array(z.string()).optional(),
  vibe_notes: z.string().optional(),
  what_they_care_about: z.string().optional(),
  status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).optional(),
  // Kitchen profile structured fields (Migration D)
  kitchen_oven_notes: z.string().optional(),
  kitchen_burner_notes: z.string().optional(),
  kitchen_counter_notes: z.string().optional(),
  kitchen_refrigeration_notes: z.string().optional(),
  kitchen_plating_notes: z.string().optional(),
  kitchen_sink_notes: z.string().optional(),
  kitchen_profile_updated_at: z.string().optional(),
})

export type InviteClientInput = z.infer<typeof InviteClientSchema>
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>

/**
 * Send client invitation (chef-only)
 * Creates invitation record with unique token
 * V1: No email sending, just creates DB record
 */
export async function inviteClient(input: InviteClientInput) {
  const user = await requireChef()
  const validated = InviteClientSchema.parse(input)

  const supabase = createServerClient()

  // Check if client already exists with this email in this tenant
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('email', validated.email)
    .single()

  if (existingClient) {
    throw new Error('Client with this email already exists in your tenant')
  }

  // Check if pending invitation exists
  const { data: existingInvitation } = await supabase
    .from('client_invitations')
    .select('id, used_at')
    .eq('tenant_id', user.tenantId!)
    .eq('email', validated.email)
    .is('used_at', null)
    .single()

  if (existingInvitation) {
    throw new Error('Pending invitation already exists for this email')
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')

  // Create invitation (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .insert({
      tenant_id: user.tenantId!,
      email: validated.email,
      full_name: validated.full_name,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[inviteClient] Error:', error)
    throw new Error('Failed to create invitation')
  }

  revalidatePath('/clients')

  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/client-signup?token=${token}`

  // Send invitation email to client (non-blocking)
  try {
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name')
      .eq('id', user.tenantId!)
      .single()

    if (chef) {
      const { sendClientInvitationEmail } = await import('@/lib/email/notifications')
      await sendClientInvitationEmail({
        clientEmail: validated.email,
        clientName: validated.full_name,
        chefName: chef.business_name || 'Your Chef',
        invitationUrl,
        expiresInDays: 7,
      })
    }
  } catch (emailErr) {
    console.error('[inviteClient] Email failed (non-blocking):', emailErr)
  }

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_created',
      domain: 'client',
      entityType: 'client_invitation',
      entityId: invitation.id,
      summary: `Invited new client: ${validated.full_name} (${validated.email})`,
      context: { client_name: validated.full_name, email: validated.email },
    })
  } catch (err) {
    console.error('[inviteClient] Activity log failed (non-blocking):', err)
  }

  return { success: true, invitation, invitationUrl }
}

/**
 * Get all clients for chef's tenant
 */
export async function getClients() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClients] Error:', error)
    throw new Error('Failed to fetch clients')
  }

  return clients
}

/**
 * Get single client by ID (chef-only, RLS enforces tenant scoping)
 */
export async function getClientById(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getClientById] Error:', error)
    return null
  }

  return client
}

/**
 * Create a client record from lead data (used by Gmail sync pipeline).
 * Does NOT require auth session — uses admin client for automated pipelines.
 * Idempotent: returns existing client if email already exists in tenant.
 */
export async function createClientFromLead(
  tenantId: string,
  lead: {
    email: string
    full_name: string
    phone?: string | null
    dietary_restrictions?: string[] | null
    allergies?: string[] | null
    source?: string | null
  }
) {
  const supabase = createServerClient({ admin: true })

  // Idempotent: check if client already exists with this email
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', lead.email)
    .single()

  if (existing) {
    return { id: existing.id, created: false }
  }

  // Create the client record
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: tenantId,
      email: lead.email,
      full_name: lead.full_name,
      phone: lead.phone || null,
      dietary_restrictions: lead.dietary_restrictions || [],
      allergies: lead.allergies || [],
      status: 'active',
      referral_source:
        (lead.source as
          | 'email'
          | 'phone'
          | 'instagram'
          | 'take_a_chef'
          | 'referral'
          | 'website'
          | 'other') || 'email',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createClientFromLead] Error:', error)
    throw new Error(`Failed to create client: ${error.message}`)
  }

  return { id: client.id, created: true }
}

/**
 * Update client (chef-only)
 */
export async function updateClient(clientId: string, input: UpdateClientInput) {
  const user = await requireChef()
  const validated = UpdateClientSchema.parse(input)

  const supabase = createServerClient()

  const { data: client, error } = await (supabase as any)
    .from('clients')
    .update(validated)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateClient] Error:', error)
    throw new Error('Failed to update client')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_updated',
      domain: 'client',
      entityType: 'client',
      entityId: clientId,
      summary: `Updated client: ${client.full_name} — ${Object.keys(validated).join(', ')}`,
      context: { client_name: client.full_name, changed_fields: Object.keys(validated) },
      clientId,
    })
  } catch (err) {
    console.error('[updateClient] Activity log failed (non-blocking):', err)
  }

  return { success: true, client }
}

/**
 * Get pending invitations for tenant
 */
export async function getPendingInvitations() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: invitations, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingInvitations] Error:', error)
    throw new Error('Failed to fetch invitations')
  }

  return invitations
}

/**
 * Cancel invitation (chef-only)
 * V1: Just delete the record
 */
export async function cancelInvitation(invitationId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('client_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[cancelInvitation] Error:', error)
    throw new Error('Failed to cancel invitation')
  }

  revalidatePath('/clients')
  return { success: true }
}

/**
 * Get clients with statistics (chef-only)
 * Uses client_financial_summary view for computed stats
 */
export async function getClientsWithStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (clientsError) {
    console.error('[getClientsWithStats] Error:', clientsError)
    throw new Error('Failed to fetch clients')
  }

  // Use the client_financial_summary view for stats
  const { data: financialSummaries } = await supabase
    .from('client_financial_summary')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  // Build stats map from the view
  const statsMap = new Map<
    string,
    {
      totalEvents: number
      totalSpentCents: number
      lastEventDate: string | null
    }
  >()

  if (financialSummaries) {
    for (const summary of financialSummaries) {
      if (summary.client_id) {
        statsMap.set(summary.client_id, {
          totalEvents: summary.total_events_count ?? 0,
          totalSpentCents: summary.lifetime_value_cents ?? 0,
          lastEventDate: summary.last_event_date,
        })
      }
    }
  }

  // Merge clients with stats
  return clients.map((client) => ({
    ...client,
    totalEvents: statsMap.get(client.id)?.totalEvents ?? 0,
    totalSpentCents: statsMap.get(client.id)?.totalSpentCents ?? 0,
    lastEventDate: statsMap.get(client.id)?.lastEventDate ?? null,
  }))
}

/**
 * Get events for a specific client (chef-only)
 */
export async function getClientEvents(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Get events for this client
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getClientEvents] Error:', error)
    throw new Error('Failed to fetch client events')
  }

  return events
}

/**
 * Get client with detailed statistics
 * Uses client_financial_summary view for computed metrics
 */
export async function getClientWithStats(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    console.error('[getClientWithStats] Error:', clientError)
    return null
  }

  // Use the client_financial_summary view
  const { data: financialSummary } = await supabase
    .from('client_financial_summary')
    .select('*')
    .eq('client_id', clientId)
    .single()

  return {
    ...client,
    totalEvents: financialSummary?.total_events_count ?? 0,
    completedEvents: financialSummary?.total_events_completed ?? 0,
    totalSpentCents: financialSummary?.lifetime_value_cents ?? 0,
    averageEventValueCents: financialSummary?.average_spend_per_event ?? 0,
    lastEventDate: financialSummary?.last_event_date ?? null,
    outstandingBalanceCents: financialSummary?.outstanding_balance_cents ?? 0,
  }
}

/**
 * Server action: Update a client's household tag stored in the `household` JSONB.
 * Accepts a FormData payload from a client-side form with fields:
 * - clientId
 * - household_tag
 */
export async function updateClientHousehold(formData: FormData) {
  const user = await requireChef()

  const clientId = String(formData.get('clientId') ?? '')
  const tag = formData.get('household_tag') ? String(formData.get('household_tag')) : null

  if (!clientId) throw new Error('Missing clientId')

  const supabase = createServerClient()

  const { data: client, error } = await supabase
    .from('clients')
    .update({ household: tag ? { tag } : null } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateClientHousehold] Error:', error)
    throw new Error('Failed to update client household')
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)

  return { success: true, client }
}

/**
 * Get dormancy status for a client (days since last event, isDormant flag).
 */
export async function getClientDormancyInfo(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('client_financial_summary')
    .select('last_event_date, days_since_last_event, is_dormant')
    .eq('client_id', clientId)
    .single()

  if (!data) return null

  return {
    lastEventDate: data.last_event_date as string | null,
    daysSinceLastEvent: data.days_since_last_event as number | null,
    isDormant: data.is_dormant as boolean | null,
  }
}

/**
 * Update a client's lifecycle status.
 * Valid statuses: active, dormant, repeat_ready, vip
 */
export async function updateClientStatus(clientId: string, status: string) {
  const user = await requireChef()

  const validStatuses = ['active', 'dormant', 'repeat_ready', 'vip']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('clients')
    .update({ status } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateClientStatus] Error:', error)
    throw new Error('Failed to update client status')
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

/**
 * Get comprehensive financial detail for a single client.
 * Returns per-event breakdown (quoted, paid, outstanding, payment status),
 * all ledger entries for the client, and summary totals.
 */
export async function getClientFinancialDetail(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to this tenant
  const { data: clientCheck } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!clientCheck) throw new Error('Client not found')

  // Parallel: events for this client + ledger entries for this client
  const [eventsResult, ledgerResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, occasion, event_date, status, quoted_price_cents, payment_status, deposit_amount_cents, guest_count'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('event_date', { ascending: false }),
    supabase
      .from('ledger_entries')
      .select(
        'id, entry_type, amount_cents, is_refund, description, payment_method, created_at, received_at, event_id, events(id, occasion, event_date)'
      )
      .eq('client_id', clientId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false }),
  ])

  const events = eventsResult.data ?? []
  const ledgerEntries = ledgerResult.data ?? []

  // Fetch financial summary for each event from the view
  const eventIds = events.map((e) => e.id)
  const { data: summaries } =
    eventIds.length > 0
      ? await supabase
          .from('event_financial_summary')
          .select(
            'event_id, total_paid_cents, total_refunded_cents, outstanding_balance_cents, tip_amount_cents, net_revenue_cents'
          )
          .in('event_id', eventIds)
      : { data: [] }

  const summaryMap = new Map<
    string,
    {
      total_paid_cents: number
      total_refunded_cents: number
      outstanding_balance_cents: number
      tip_amount_cents: number
      net_revenue_cents: number
    }
  >()
  for (const s of summaries ?? []) {
    if (s.event_id)
      summaryMap.set(s.event_id, {
        total_paid_cents: s.total_paid_cents ?? 0,
        total_refunded_cents: s.total_refunded_cents ?? 0,
        outstanding_balance_cents: s.outstanding_balance_cents ?? 0,
        tip_amount_cents: s.tip_amount_cents ?? 0,
        net_revenue_cents: s.net_revenue_cents ?? 0,
      })
  }

  // Build per-event breakdown
  const eventBreakdown = events.map((event) => {
    const fin = summaryMap.get(event.id) ?? {
      total_paid_cents: 0,
      total_refunded_cents: 0,
      outstanding_balance_cents: 0,
      tip_amount_cents: 0,
      net_revenue_cents: 0,
    }
    return {
      eventId: event.id,
      occasion: event.occasion ?? 'Untitled Event',
      eventDate: event.event_date,
      status: event.status,
      guestCount: event.guest_count ?? 0,
      quotedPriceCents: event.quoted_price_cents ?? 0,
      depositAmountCents: event.deposit_amount_cents ?? 0,
      paymentStatus: event.payment_status ?? 'unpaid',
      totalPaidCents: fin.total_paid_cents,
      totalRefundedCents: fin.total_refunded_cents,
      outstandingBalanceCents: fin.outstanding_balance_cents,
      tipAmountCents: fin.tip_amount_cents,
    }
  })

  // Compute summary totals (exclude cancelled events from outstanding)
  const activeEvents = eventBreakdown.filter((e) => e.status !== 'cancelled')
  const totalQuotedCents = activeEvents.reduce((sum, e) => sum + e.quotedPriceCents, 0)
  const totalPaidCents = activeEvents.reduce((sum, e) => sum + e.totalPaidCents, 0)
  const totalOutstandingCents = activeEvents.reduce((sum, e) => sum + e.outstandingBalanceCents, 0)
  const totalRefundedCents = eventBreakdown.reduce((sum, e) => sum + e.totalRefundedCents, 0)

  // Tips: compute from ledger entries (entry_type = 'tip') to stay consistent
  // with getTenantFinancialSummary — ledger is the source of truth, not events.tip_amount_cents
  const totalTipsCents = ledgerEntries
    .filter((e: any) => e.entry_type === 'tip')
    .reduce((sum: number, e: any) => sum + e.amount_cents, 0)

  return {
    eventBreakdown,
    ledgerEntries,
    summary: {
      totalQuotedCents,
      totalPaidCents,
      totalOutstandingCents,
      totalRefundedCents,
      totalTipsCents,
      collectionRatePercent:
        totalQuotedCents > 0 ? Math.round((totalPaidCents / totalQuotedCents) * 100) : 100,
    },
  }
}

/**
 * Toggle automated emails on/off for a specific client.
 * Chef-controlled only — the client does not see or manage this setting.
 */
export async function setClientAutomatedEmails(clientId: string, enabled: boolean) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('clients')
    .update({ automated_emails_enabled: enabled } as any)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[setClientAutomatedEmails] Error:', error)
    throw new Error('Failed to update client email preference')
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

/**
 * Create a client record directly from an inquiry (chef-only).
 * Used in the "Add as Client" flow on the inquiry detail page.
 * Creates the client without auth account — a "shadow client" the chef manages.
 * Also links the new client to the source inquiry.
 */
export async function addClientFromInquiry(input: {
  full_name: string
  email: string
  phone?: string
  inquiryId: string
}): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  try {
    const user = await requireChef()
    const supabase = createServerClient()

    if (!input.full_name.trim() || !input.email.trim()) {
      return { success: false, error: 'Name and email are required' }
    }

    // Check for duplicate email in this tenant
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', input.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      // Client already exists — just link the inquiry
      await supabase
        .from('inquiries')
        .update({ client_id: existing.id })
        .eq('id', input.inquiryId)
        .eq('tenant_id', user.tenantId!)

      revalidatePath(`/inquiries/${input.inquiryId}`)
      revalidatePath('/clients')
      return { success: true, clientId: existing.id }
    }

    // Create the client record
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        tenant_id: user.tenantId!,
        full_name: input.full_name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
      } as any)
      .select('id')
      .single()

    if (clientErr || !client) {
      console.error('[addClientFromInquiry] Insert error:', clientErr)
      return { success: false, error: 'Failed to create client record' }
    }

    // Link inquiry to new client
    await supabase
      .from('inquiries')
      .update({ client_id: client.id })
      .eq('id', input.inquiryId)
      .eq('tenant_id', user.tenantId!)

    revalidatePath(`/inquiries/${input.inquiryId}`)
    revalidatePath('/clients')
    revalidatePath('/inquiries')

    return { success: true, clientId: client.id }
  } catch (err) {
    console.error('[addClientFromInquiry] Error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Create a client record directly (chef-only).
 * Creates a "shadow client" without requiring an auth account.
 * Used by the Event Creation Wizard when a chef adds a new client inline.
 * Returns the new client's ID so the wizard can immediately create an event.
 */
export async function createClientDirect(input: {
  full_name: string
  email: string
}): Promise<{ success: true; clientId: string } | { success: false; error: string }> {
  try {
    const user = await requireChef()

    if (!input.full_name.trim()) {
      return { success: false, error: 'Client name is required' }
    }
    if (!input.email.trim()) {
      return { success: false, error: 'Client email is required' }
    }

    const supabase = createServerClient()

    // Check for duplicate email in this tenant
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', input.email.trim().toLowerCase())
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'A client with this email already exists' }
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        tenant_id: user.tenantId!,
        full_name: input.full_name.trim(),
        email: input.email.trim().toLowerCase(),
        status: 'active',
      } as any)
      .select('id')
      .single()

    if (clientErr || !client) {
      console.error('[createClientDirect] Insert error:', clientErr)
      return { success: false, error: 'Failed to create client record' }
    }

    revalidatePath('/clients')

    // Log chef activity (non-blocking)
    try {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'client_created',
        domain: 'client',
        entityType: 'client',
        entityId: client.id,
        summary: `Created client: ${input.full_name.trim()} (${input.email.trim()}) via event wizard`,
        context: { client_name: input.full_name.trim(), email: input.email.trim() },
      })
    } catch (err) {
      console.error('[createClientDirect] Activity log failed (non-blocking):', err)
    }

    return { success: true, clientId: client.id }
  } catch (err) {
    console.error('[createClientDirect] Error:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Search clients by name (case-insensitive partial match).
 * Used by the Command Center orchestrator for client lookup tasks.
 */
export async function searchClientsByName(
  query: string
): Promise<
  Array<{ id: string; full_name: string | null; email: string | null; status: string | null }>
> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email, status')
    .eq('tenant_id', user.tenantId!)
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[searchClientsByName] Error:', error)
    return []
  }

  return data ?? []
}
