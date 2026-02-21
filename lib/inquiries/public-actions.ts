// Public Inquiry Submission Server Action
// No auth required — uses admin client for public form submissions
// Auto-creates: client record, inquiry record, draft event

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createClientFromLead } from '@/lib/clients/actions'
import { z } from 'zod'

const DEFAULT_BOOKING_CHEF_EMAIL = 'davidferra13@gmail.com'

const BUDGET_RANGE_MIDPOINTS: Record<string, number> = {
  under_500: 25000,
  '500_1500': 100000,
  '1500_3000': 225000,
  '3000_5000': 400000,
  over_5000: 600000,
}

const PublicInquirySchema = z.object({
  chef_slug: z.string().optional(),
  // Required
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  address: z.string().min(1, 'Address is required'),
  event_date: z.string().min(1, 'Event date is required'),
  serve_time: z.string().min(1, 'Serve time is required'),
  guest_count: z.number().int().positive(),
  occasion: z.string().min(1, 'Occasion is required'),
  // Optional
  phone: z.string().optional().or(z.literal('')),
  budget_cents: z.number().int().nonnegative().nullable().optional(),
  budget_range: z.enum(['under_500', '500_1500', '1500_3000', '3000_5000', 'over_5000']).optional(),
  allergy_flag: z.enum(['none', 'yes', 'unknown']).optional(),
  favorite_ingredients_dislikes: z.string().optional().or(z.literal('')),
  allergies_food_restrictions: z.string().optional().or(z.literal('')),
  additional_notes: z.string().optional().or(z.literal('')),
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
  const allergiesList = validated.allergies_food_restrictions
    ? validated.allergies_food_restrictions
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : null

  const sourceParts = [
    `Serving Time: ${validated.serve_time.trim()}`,
    validated.favorite_ingredients_dislikes?.trim()
      ? `Favorites/Dislikes: ${validated.favorite_ingredients_dislikes.trim()}`
      : null,
    validated.allergies_food_restrictions?.trim()
      ? `Allergies/Food Restrictions: ${validated.allergies_food_restrictions.trim()}`
      : null,
    validated.additional_notes?.trim()
      ? `Additional Notes: ${validated.additional_notes.trim()}`
      : null,
  ].filter(Boolean)
  const sourceMessage = sourceParts.join('\n')

  // 1. Resolve chef slug → tenant_id (prefer slug; fallback to hardcoded email)
  let chefQuery = (supabase as any).from('chefs').select('id, business_name')

  if (validated.chef_slug) {
    chefQuery = chefQuery.eq('booking_slug', validated.chef_slug)
  } else {
    chefQuery = chefQuery.ilike('email', DEFAULT_BOOKING_CHEF_EMAIL)
  }

  const { data: chef, error: chefError } = await chefQuery.single()

  if (chefError || !chef) {
    throw new Error('Chef not found')
  }

  const tenantId = chef.id as string
  const chefName = (chef.business_name as string | null) || 'Your Chef'

  // 2. Create or find existing client
  const client = await createClientFromLead(tenantId, {
    email: validated.email.toLowerCase().trim(),
    full_name: validated.full_name.trim(),
    phone: validated.phone?.trim() || null,
    source: 'website',
  })

  // Derive budget in cents: explicit value > range midpoint > null
  const budgetCents =
    validated.budget_cents ??
    (validated.budget_range ? (BUDGET_RANGE_MIDPOINTS[validated.budget_range] ?? null) : null) ??
    null

  // 3. Create inquiry record linked to client
  const { data: inquiry, error: inquiryError } = await (supabase as any)
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'website',
      client_id: client.id,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.event_date || null,
      confirmed_guest_count: validated.guest_count,
      confirmed_location: validated.address.trim(),
      confirmed_occasion: validated.occasion.trim(),
      confirmed_budget_cents: budgetCents,
      confirmed_service_expectations: `Serve time ${validated.serve_time.trim()}. Chef will arrive 2hr prior.`,
      confirmed_dietary_restrictions: allergiesList,
      source_message: sourceMessage || null,
      unknown_fields: {
        address: validated.address.trim(),
        serve_time: validated.serve_time.trim(),
        allergy_flag: validated.allergy_flag ?? null,
        budget_range: validated.budget_range ?? null,
        favorite_ingredients_dislikes: validated.favorite_ingredients_dislikes?.trim() || null,
        allergies_food_restrictions: validated.allergies_food_restrictions?.trim() || null,
        additional_notes: validated.additional_notes?.trim() || null,
      },
      status: 'new',
    })
    .select('id')
    .single()

  if (inquiryError) {
    console.error('[submitPublicInquiry] Inquiry creation error:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  // Send acknowledgment email to client (non-blocking — never fails the submission)
  try {
    const { sendInquiryReceivedEmail } = await import('@/lib/email/notifications')
    await sendInquiryReceivedEmail({
      clientEmail: validated.email.toLowerCase().trim(),
      clientName: validated.full_name.trim(),
      chefName,
      occasion: validated.occasion.trim(),
      eventDate: validated.event_date || null,
    })
  } catch (emailErr) {
    console.error('[submitPublicInquiry] Acknowledgment email failed (non-blocking):', emailErr)
  }

  // 4. Create draft event with available info (TBD for missing required fields)
  const { data: event, error: eventError } = await (supabase as any)
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry.id,
      event_date: validated.event_date,
      serve_time: validated.serve_time.trim(),
      guest_count: validated.guest_count,
      location_address: validated.address.trim(),
      location_city: 'TBD',
      location_zip: 'TBD',
      occasion: validated.occasion.trim(),
      quoted_price_cents: validated.budget_cents ?? null,
      special_requests: sourceMessage || null,
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
