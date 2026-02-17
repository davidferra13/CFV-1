// Quote Pipeline Server Actions — Chef-side
// Create, manage, and track quotes through the pricing pipeline
// Quotes bridge inquiries to confirmed pricing before events are created

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'

type QuoteStatus = Database['public']['Enums']['quote_status']
type PricingModel = Database['public']['Enums']['pricing_model']

// Valid transitions (matches DB trigger)
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [], // terminal
  rejected: [], // terminal
  expired: ['draft'], // can revise and resend
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateQuoteSchema = z.object({
  client_id: z.string().uuid(),
  inquiry_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  quote_name: z.string().optional().or(z.literal('')),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']),
  total_quoted_cents: z.number().int().positive('Total must be positive'),
  price_per_person_cents: z.number().int().positive().nullable().optional(),
  guest_count_estimated: z.number().int().positive().nullable().optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().nonnegative().nullable().optional(),
  deposit_percentage: z.number().min(0).max(100).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  pricing_notes: z.string().optional().or(z.literal('')),
  internal_notes: z.string().optional().or(z.literal('')),
})

const UpdateQuoteSchema = z.object({
  quote_name: z.string().optional().or(z.literal('')),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  total_quoted_cents: z.number().int().positive().optional(),
  price_per_person_cents: z.number().int().positive().nullable().optional(),
  guest_count_estimated: z.number().int().positive().nullable().optional(),
  deposit_required: z.boolean().optional(),
  deposit_amount_cents: z.number().int().nonnegative().nullable().optional(),
  deposit_percentage: z.number().min(0).max(100).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  pricing_notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
})

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>

// ============================================
// 1. CREATE QUOTE
// ============================================

export async function createQuote(input: CreateQuoteInput) {
  const user = await requireChef()
  const validated = CreateQuoteSchema.parse(input)
  const supabase = createServerClient()

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('tenant_id')
    .eq('id', validated.client_id)
    .single()

  if (!client || client.tenant_id !== user.tenantId) {
    throw new Error('Client not found or does not belong to your tenant')
  }

  // Verify inquiry belongs to tenant if provided
  if (validated.inquiry_id) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('tenant_id')
      .eq('id', validated.inquiry_id)
      .single()

    if (!inquiry || inquiry.tenant_id !== user.tenantId) {
      throw new Error('Inquiry not found or does not belong to your tenant')
    }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      inquiry_id: validated.inquiry_id || null,
      event_id: validated.event_id || null,
      quote_name: validated.quote_name || null,
      pricing_model: validated.pricing_model,
      total_quoted_cents: validated.total_quoted_cents,
      price_per_person_cents: validated.price_per_person_cents ?? null,
      guest_count_estimated: validated.guest_count_estimated ?? null,
      deposit_required: validated.deposit_required ?? false,
      deposit_amount_cents: validated.deposit_amount_cents ?? null,
      deposit_percentage: validated.deposit_percentage ?? null,
      valid_until: validated.valid_until || null,
      pricing_notes: validated.pricing_notes || null,
      internal_notes: validated.internal_notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createQuote] Error:', error)
    throw new Error('Failed to create quote')
  }

  revalidatePath('/quotes')
  return { success: true, quote }
}

// ============================================
// 2. GET QUOTES (LIST)
// ============================================

export async function getQuotes(filters?: {
  status?: QuoteStatus | QuoteStatus[]
  client_id?: string
  inquiry_id?: string
  event_id?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('quotes')
    .select(`
      *,
      client:clients(id, full_name, email),
      inquiry:inquiries(id, confirmed_occasion, status),
      event:events(id, occasion, event_date, status)
    `)
    .eq('tenant_id', user.tenantId!)

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id)
  }

  if (filters?.inquiry_id) {
    query = query.eq('inquiry_id', filters.inquiry_id)
  }

  if (filters?.event_id) {
    query = query.eq('event_id', filters.event_id)
  }

  const { data: quotes, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getQuotes] Error:', error)
    throw new Error('Failed to fetch quotes')
  }

  return quotes
}

// ============================================
// 3. GET QUOTE BY ID
// ============================================

export async function getQuoteById(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      client:clients(id, full_name, email, phone),
      inquiry:inquiries(id, confirmed_occasion, status, channel),
      event:events(id, occasion, event_date, status)
    `)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getQuoteById] Error:', error)
    return null
  }

  // Get transition history
  const { data: transitions } = await supabase
    .from('quote_state_transitions')
    .select('*')
    .eq('quote_id', id)
    .order('transitioned_at', { ascending: true })

  return { ...quote, transitions: transitions || [] }
}

// ============================================
// 4. UPDATE QUOTE
// ============================================

export async function updateQuote(id: string, input: UpdateQuoteInput) {
  const user = await requireChef()
  const validated = UpdateQuoteSchema.parse(input)
  const supabase = createServerClient()

  // Verify quote exists and is in draft
  const { data: current } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!current) {
    throw new Error('Quote not found')
  }

  if (current.status !== 'draft') {
    throw new Error('Can only edit quotes in draft status')
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateQuote] Error:', error)
    throw new Error('Failed to update quote')
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return { success: true, quote }
}

// ============================================
// 5. TRANSITION QUOTE (CHEF)
// ============================================

export async function transitionQuote(id: string, newStatus: QuoteStatus) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('status, total_quoted_cents, price_per_person_cents, guest_count_estimated, pricing_model, deposit_amount_cents, deposit_percentage, deposit_required, valid_until')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) {
    throw new Error('Quote not found')
  }

  const currentStatus = quote.status as QuoteStatus
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
      `Allowed: ${allowed?.join(', ') || 'none (terminal state)'}`
    )
  }

  // Build update payload with status-specific timestamps
  const updatePayload: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'sent') {
    updatePayload.sent_at = new Date().toISOString()
  }

  if (newStatus === 'accepted') {
    updatePayload.accepted_at = new Date().toISOString()
    updatePayload.snapshot_frozen = true
    updatePayload.pricing_snapshot = {
      total_quoted_cents: quote.total_quoted_cents,
      price_per_person_cents: quote.price_per_person_cents,
      guest_count_estimated: quote.guest_count_estimated,
      pricing_model: quote.pricing_model,
      deposit_amount_cents: quote.deposit_amount_cents,
      deposit_percentage: quote.deposit_percentage,
      deposit_required: quote.deposit_required,
      frozen_at: new Date().toISOString(),
    } as unknown as Json
  }

  if (newStatus === 'rejected') {
    updatePayload.rejected_at = new Date().toISOString()
  }

  if (newStatus === 'expired') {
    updatePayload.expired_at = new Date().toISOString()
  }

  const { data: updated, error } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[transitionQuote] Error:', error)
    throw new Error('Failed to transition quote')
  }

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)
  return { success: true, quote: updated }
}

// ============================================
// 6. GET CLIENT PRICING HISTORY
// ============================================

export async function getClientPricingHistory(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      total_quoted_cents,
      price_per_person_cents,
      guest_count_estimated,
      pricing_model,
      accepted_at,
      quote_name,
      event:events(id, occasion, event_date)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })

  if (error) {
    console.error('[getClientPricingHistory] Error:', error)
    return []
  }

  return quotes || []
}

// ============================================
// 7. GET QUOTES FOR INQUIRY
// ============================================

export async function getQuotesForInquiry(inquiryId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getQuotesForInquiry] Error:', error)
    return []
  }

  return quotes || []
}

// ============================================
// 8. DELETE QUOTE
// ============================================

export async function deleteQuote(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) {
    throw new Error('Quote not found')
  }

  if (quote.status !== 'draft') {
    throw new Error('Can only delete quotes in draft status')
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteQuote] Error:', error)
    throw new Error('Failed to delete quote')
  }

  revalidatePath('/quotes')
  return { success: true }
}
