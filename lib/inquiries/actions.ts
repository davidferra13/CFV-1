// Inquiry Pipeline Server Actions
// Chef-only: Track inquiries from all channels through qualification to booking
// Adapts spec requirements to actual DB schema (confirmed_* fields, unknown_fields JSON)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'

type InquiryStatus = Database['public']['Enums']['inquiry_status']
type InquiryChannel = Database['public']['Enums']['inquiry_channel']

// Valid transitions map (matches DB trigger)
const VALID_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['awaiting_client', 'declined'],
  awaiting_client: ['awaiting_chef', 'declined', 'expired'],
  awaiting_chef: ['quoted', 'declined'],
  quoted: ['confirmed', 'declined', 'expired'],
  confirmed: [], // terminal — converts to event
  declined: [], // terminal
  expired: ['new'] // can be reopened
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateInquirySchema = z.object({
  channel: z.enum(['text', 'email', 'instagram', 'take_a_chef', 'phone', 'website', 'referral', 'walk_in', 'other']),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1, 'Client name required'),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  referral_partner_id: z.string().uuid().nullable().optional(),
  partner_location_id: z.string().uuid().nullable().optional(),
  confirmed_date: z.string().optional().or(z.literal('')),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().optional().or(z.literal('')),
  confirmed_occasion: z.string().optional().or(z.literal('')),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().optional().or(z.literal('')),
  confirmed_cannabis_preference: z.string().optional().or(z.literal('')),
  source_message: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  referral_source: z.string().optional().or(z.literal('')),
})

const UpdateInquirySchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional().or(z.literal('')),
  confirmed_date: z.string().nullable().optional(),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().nullable().optional(),
  confirmed_occasion: z.string().nullable().optional(),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  confirmed_service_expectations: z.string().nullable().optional(),
  confirmed_cannabis_preference: z.string().nullable().optional(),
  source_message: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  next_action_required: z.string().nullable().optional(),
  next_action_by: z.string().nullable().optional(),
  follow_up_due_at: z.string().nullable().optional(),
})

export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>
export type UpdateInquiryInput = z.infer<typeof UpdateInquirySchema>

// ============================================
// 1. CREATE INQUIRY
// ============================================

/**
 * Create inquiry (chef-only)
 * If client_id not provided, auto-link by email match
 * Stores lead contact info in unknown_fields for unlinked inquiries
 */
export async function createInquiry(input: CreateInquiryInput) {
  const user = await requireChef()
  const validated = CreateInquirySchema.parse(input)
  const supabase = createServerClient()

  let clientId = validated.client_id || null

  // Auto-link by email if no client_id provided
  if (!clientId && validated.client_email) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('email', validated.client_email)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    }
  }

  // Build unknown_fields for unlinked lead info and extra data
  const unknownFields: Record<string, string> = {}
  if (!clientId) {
    unknownFields.client_name = validated.client_name
    if (validated.client_email) unknownFields.client_email = validated.client_email
    if (validated.client_phone) unknownFields.client_phone = validated.client_phone
  }
  if (validated.notes) unknownFields.notes = validated.notes
  if (validated.referral_source) unknownFields.referral_source = validated.referral_source

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: user.tenantId!,
      channel: validated.channel,
      client_id: clientId,
      referral_partner_id: validated.referral_partner_id || null,
      partner_location_id: validated.partner_location_id || null,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.confirmed_date || null,
      confirmed_guest_count: validated.confirmed_guest_count ?? null,
      confirmed_location: validated.confirmed_location || null,
      confirmed_occasion: validated.confirmed_occasion || null,
      confirmed_budget_cents: validated.confirmed_budget_cents ?? null,
      confirmed_dietary_restrictions: validated.confirmed_dietary_restrictions ?? null,
      confirmed_service_expectations: validated.confirmed_service_expectations || null,
      confirmed_cannabis_preference: validated.confirmed_cannabis_preference || null,
      source_message: validated.source_message || null,
      unknown_fields: Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createInquiry] Error:', error)
    throw new Error('Failed to create inquiry')
  }

  revalidatePath('/inquiries')

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_created',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: inquiry.id,
      summary: `Created inquiry from ${validated.client_name} via ${validated.channel}`,
      context: { client_name: validated.client_name, channel: validated.channel, occasion: validated.confirmed_occasion },
      clientId: clientId || undefined,
    })
  } catch (err) {
    console.error('[createInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    const clientName = validated.client_name || 'Unknown'
    await evaluateAutomations(user.tenantId!, 'inquiry_created', {
      entityId: inquiry.id,
      entityType: 'inquiry',
      fields: {
        channel: validated.channel,
        client_name: clientName,
        occasion: validated.confirmed_occasion || null,
        guest_count: validated.confirmed_guest_count ?? null,
      },
    })
  } catch (err) {
    console.error('[createInquiry] Automation evaluation failed (non-blocking):', err)
  }

  return { success: true, inquiry }
}

// ============================================
// 2. GET INQUIRIES (LIST)
// ============================================

/**
 * Get inquiries (chef-only, tenant-scoped)
 * Joins with clients for display info
 */
export async function getInquiries(filters?: {
  status?: InquiryStatus | InquiryStatus[]
  channel?: InquiryChannel
  dateFrom?: string
  dateTo?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('inquiries')
    .select(`
      *,
      client:clients(id, full_name, email, phone)
    `)
    .eq('tenant_id', user.tenantId!)

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  if (filters?.channel) {
    query = query.eq('channel', filters.channel)
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data: inquiries, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getInquiries] Error:', error)
    throw new Error('Failed to fetch inquiries')
  }

  return inquiries
}

// ============================================
// 3. GET INQUIRY BY ID
// ============================================

/**
 * Get single inquiry with full transition history
 */
export async function getInquiryById(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      client:clients(id, full_name, email, phone)
    `)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getInquiryById] Error:', error)
    return null
  }

  // Get transition history
  const { data: transitions } = await supabase
    .from('inquiry_state_transitions')
    .select('*')
    .eq('inquiry_id', id)
    .order('transitioned_at', { ascending: true })

  return { ...inquiry, transitions: transitions || [] }
}

// ============================================
// 4. UPDATE INQUIRY
// ============================================

/**
 * Update inquiry fields (NOT status — use transitionInquiry)
 */
export async function updateInquiry(id: string, input: UpdateInquiryInput) {
  const user = await requireChef()
  const validated = UpdateInquirySchema.parse(input)
  const supabase = createServerClient()

  // Separate unknown_fields data from DB columns
  const { client_name, client_email, client_phone, notes, ...dbFields } = validated

  // Fetch current inquiry to merge unknown_fields
  const { data: current } = await supabase
    .from('inquiries')
    .select('unknown_fields')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Inquiry not found')
  }

  // Merge unknown_fields
  const existingUnknown = (current.unknown_fields as Record<string, string | undefined>) || {}
  const updatedUnknown: Record<string, string | undefined> = { ...existingUnknown }
  if (client_name !== undefined) updatedUnknown.client_name = client_name
  if (client_email !== undefined) updatedUnknown.client_email = client_email ?? undefined
  if (client_phone !== undefined) updatedUnknown.client_phone = client_phone ?? undefined
  if (notes !== undefined) updatedUnknown.notes = notes ?? undefined

  // Clean out undefined values
  const cleanedUnknown: Record<string, string> = {}
  for (const [k, v] of Object.entries(updatedUnknown)) {
    if (v !== undefined) cleanedUnknown[k] = v
  }

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .update({
      ...dbFields,
      unknown_fields: Object.keys(cleanedUnknown).length > 0 ? (cleanedUnknown as unknown as Json) : null,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateInquiry] Error:', error)
    throw new Error('Failed to update inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)
  return { success: true, inquiry }
}

// ============================================
// 5. TRANSITION INQUIRY
// ============================================

/**
 * Transition inquiry status
 * Validates in app code for better error messages
 * DB trigger also enforces and auto-inserts into inquiry_state_transitions
 */
export async function transitionInquiry(id: string, newStatus: InquiryStatus) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get current status
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
      `Allowed: ${allowed?.join(', ') || 'none (terminal state)'}`
    )
  }

  const { data: updated, error } = await supabase
    .from('inquiries')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[transitionInquiry] Error:', error)
    throw new Error('Failed to transition inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_transitioned',
      domain: 'inquiry',
      entityType: 'inquiry',
      entityId: id,
      summary: `Moved inquiry from ${currentStatus} → ${newStatus}`,
      context: { from_status: currentStatus, to_status: newStatus },
    })
  } catch (err) {
    console.error('[transitionInquiry] Activity log failed (non-blocking):', err)
  }

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: {
        from_status: currentStatus,
        to_status: newStatus,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('[transitionInquiry] Automation evaluation failed (non-blocking):', err)
  }

  return { success: true, inquiry: updated }
}

// ============================================
// 6. CONVERT INQUIRY TO EVENT
// ============================================

/**
 * Convert confirmed inquiry to draft event
 * Bridges the inquiry pipeline to the event lifecycle
 * Requires: client linked, date confirmed
 */
export async function convertInquiryToEvent(inquiryId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  if (inquiry.status !== 'confirmed') {
    throw new Error('Only confirmed inquiries can be converted to events')
  }

  if (!inquiry.client_id) {
    throw new Error('Inquiry must be linked to a client before converting to an event')
  }

  if (!inquiry.confirmed_date) {
    throw new Error('Confirmed date is required before converting to an event')
  }

  // Check for accepted quote on this inquiry — use its pricing if available
  const { data: acceptedQuote } = await supabase
    .from('quotes')
    .select('id, total_quoted_cents, deposit_amount_cents, pricing_model')
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single()

  // Pricing: accepted quote wins over inquiry budget
  const quotedPriceCents = acceptedQuote?.total_quoted_cents ?? inquiry.confirmed_budget_cents
  const depositAmountCents = acceptedQuote?.deposit_amount_cents ?? null
  const pricingModel = acceptedQuote?.pricing_model ?? null

  // Validate pricing exists before creating event
  if (!quotedPriceCents || quotedPriceCents <= 0) {
    throw new Error('Cannot convert inquiry to event without a confirmed price. Please attach a quote first.')
  }

  // Map cannabis_preference string → boolean
  const cannabisPref = inquiry.confirmed_cannabis_preference
  const cannabisBoolean = cannabisPref
    ? ['yes', 'true', 'open'].some(v => cannabisPref.toLowerCase().includes(v))
    : null

  // Create draft event from confirmed inquiry facts + accepted quote pricing
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: user.tenantId!,
      client_id: inquiry.client_id,
      inquiry_id: inquiry.id,
      referral_partner_id: inquiry.referral_partner_id || null,
      partner_location_id: inquiry.partner_location_id || null,
      event_date: inquiry.confirmed_date,
      serve_time: 'TBD',
      guest_count: inquiry.confirmed_guest_count || 1,
      location_address: inquiry.confirmed_location || 'TBD',
      location_city: 'TBD',
      location_zip: 'TBD',
      occasion: inquiry.confirmed_occasion,
      quoted_price_cents: quotedPriceCents,
      deposit_amount_cents: depositAmountCents,
      pricing_model: pricingModel,
      dietary_restrictions: inquiry.confirmed_dietary_restrictions || [],
      special_requests: inquiry.confirmed_service_expectations,
      cannabis_preference: cannabisBoolean,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (eventError) {
    console.error('[convertInquiryToEvent] Event creation error:', eventError)
    throw new Error(`Failed to create event: ${eventError.message}`)
  }

  // Log initial event transition to 'draft'
  await supabase.from('event_state_transitions').insert({
    tenant_id: user.tenantId!,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: user.id,
    metadata: { action: 'converted_from_inquiry', inquiry_id: inquiry.id }
  })

  // Link inquiry to the created event
  await supabase
    .from('inquiries')
    .update({ converted_to_event_id: event.id })
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)

  // Link accepted quote to the new event
  if (acceptedQuote) {
    await supabase
      .from('quotes')
      .update({ event_id: event.id })
      .eq('id', acceptedQuote.id)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/events')
  return { success: true, event }
}

// ============================================
// 7. GET INQUIRY STATS
// ============================================

/**
 * Return counts by status for dashboard/pipeline overview
 */
export async function getInquiryStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getInquiryStats] Error:', error)
    throw new Error('Failed to fetch inquiry stats')
  }

  const stats: Record<InquiryStatus, number> = {
    new: 0,
    awaiting_client: 0,
    awaiting_chef: 0,
    quoted: 0,
    confirmed: 0,
    declined: 0,
    expired: 0,
  }

  for (const inquiry of inquiries || []) {
    const status = inquiry.status as InquiryStatus
    if (status in stats) {
      stats[status]++
    }
  }

  return stats
}

// ============================================
// 8. DELETE INQUIRY
// ============================================

/**
 * Delete inquiry (chef-only)
 * Only allowed for 'new' or 'declined' status
 */
export async function deleteInquiry(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  if (!['new', 'declined'].includes(inquiry.status)) {
    throw new Error('Can only delete inquiries in "new" or "declined" status')
  }

  const { error } = await supabase
    .from('inquiries')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteInquiry] Error:', error)
    throw new Error('Failed to delete inquiry')
  }

  revalidatePath('/inquiries')
  return { success: true }
}

// ============================================
// 9. DECLINE WITH REASON
// ============================================

// COMMON_DECLINE_REASONS moved to lib/inquiries/constants.ts
// to avoid exporting a non-async value from a 'use server' file.

/**
 * Decline an inquiry and record the reason.
 * Combines the status transition + reason capture in one action.
 */
export async function declineInquiry(id: string, reason?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) throw new Error('Inquiry not found')

  const currentStatus = inquiry.status as InquiryStatus
  const allowed = VALID_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes('declined')) {
    throw new Error(`Cannot decline from status "${currentStatus}"`)
  }

  const { error } = await supabase
    .from('inquiries')
    .update({
      status: 'declined',
      decline_reason: reason ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[declineInquiry] Error:', error)
    throw new Error('Failed to decline inquiry')
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${id}`)

  // Fire automations (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(user.tenantId!, 'inquiry_status_changed', {
      entityId: id,
      entityType: 'inquiry',
      fields: { status: 'declined', from_status: currentStatus, to_status: 'declined', decline_reason: reason },
    })
  } catch { /* non-blocking */ }

  return { success: true }
}

// ============================================
// 10. LOST REASON ANALYTICS
// ============================================

export type LostReasonStat = { reason: string; count: number }

/**
 * Returns a breakdown of decline reasons, sorted by frequency.
 */
export async function getLostReasonStats(): Promise<LostReasonStat[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('inquiries')
    .select('decline_reason')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'declined')
    .not('decline_reason', 'is', null)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const r = row.decline_reason ?? 'Unknown'
    counts.set(r, (counts.get(r) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}
