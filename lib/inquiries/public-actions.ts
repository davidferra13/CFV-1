// Public Inquiry Submission Server Action
// No auth required — uses admin client for public form submissions
// Auto-creates: client record, inquiry record, draft event

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createClientFromLead } from '@/lib/clients/actions'
import { z } from 'zod'

const PublicInquirySchema = z.object({
  chef_slug: z.string().min(1, 'Chef identifier required'),
  // Required
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  event_date: z.string().min(1, 'Event date is required'),
  city: z.string().min(1, 'City is required'),
  // Optional
  phone: z.string().optional().or(z.literal('')),
  guest_count: z.number().int().positive().nullable().optional(),
  occasion: z.string().optional().or(z.literal('')),
  budget_cents: z.number().int().nonnegative().nullable().optional(),
  message: z.string().optional().or(z.literal('')),
})

export type PublicInquiryInput = z.infer<typeof PublicInquirySchema>

/**
 * Submit a public inquiry from the chef profile page.
 * Creates three linked records in one shot:
 * 1. Client (idempotent — reuses existing by email)
 * 2. Inquiry (status: 'new', channel: 'website')
 * 3. Draft Event (status: 'draft', TBD placeholders for missing fields)
 */
export async function submitPublicInquiry(input: PublicInquiryInput) {
  const validated = PublicInquirySchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // 1. Resolve chef slug → tenant_id
  const { data: chef, error: chefError } = await (supabase as any)
    .from('chefs')
    .select('id')
    .eq('slug', validated.chef_slug)
    .single()

  if (chefError || !chef) {
    throw new Error('Chef not found')
  }

  const tenantId = chef.id as string

  // 2. Create or find existing client
  const client = await createClientFromLead(tenantId, {
    email: validated.email.toLowerCase().trim(),
    full_name: validated.full_name.trim(),
    phone: validated.phone?.trim() || null,
    source: 'website',
  })

  // 3. Create inquiry record linked to client
  const { data: inquiry, error: inquiryError } = await (supabase as any)
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'website',
      client_id: client.id,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.event_date || null,
      confirmed_guest_count: validated.guest_count ?? null,
      confirmed_location: validated.city.trim() || null,
      confirmed_occasion: validated.occasion?.trim() || null,
      confirmed_budget_cents: validated.budget_cents ?? null,
      source_message: validated.message?.trim() || null,
      unknown_fields: validated.message
        ? { message: validated.message.trim() }
        : null,
    })
    .select('id')
    .single()

  if (inquiryError) {
    console.error('[submitPublicInquiry] Inquiry creation error:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  // 4. Create draft event with available info (TBD for missing required fields)
  const { data: event, error: eventError } = await (supabase as any)
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry.id,
      event_date: validated.event_date,
      serve_time: 'TBD',
      guest_count: validated.guest_count || 1,
      location_address: validated.city.trim(),
      location_city: validated.city.trim(),
      location_zip: 'TBD',
      occasion: validated.occasion?.trim() || null,
      quoted_price_cents: validated.budget_cents ?? null,
      special_requests: validated.message?.trim() || null,
    })
    .select('id')
    .single()

  if (eventError) {
    console.error('[submitPublicInquiry] Event creation error:', eventError)
    // Inquiry was created — don't fail entirely, just log
    // Chef can still see the inquiry + client
    return { success: true, inquiryCreated: true, eventCreated: false }
  }

  // 5. Log initial event state transition (null → draft)
  await (supabase as any).from('event_state_transitions').insert({
    tenant_id: tenantId,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    metadata: { action: 'auto_created_from_public_inquiry', inquiry_id: inquiry.id },
  })

  // 6. Link inquiry to the created event
  await (supabase as any)
    .from('inquiries')
    .update({ converted_to_event_id: event.id })
    .eq('id', inquiry.id)

  return { success: true, inquiryCreated: true, eventCreated: true }
}
