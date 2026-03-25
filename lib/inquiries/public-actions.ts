// Public Inquiry Submission Server Action
// No auth required - uses admin client for public form submissions
// Auto-creates: client record, inquiry record, draft event

'use server'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { findChefByPublicSlug } from '@/lib/profile/public-chef'
import { createServerClient } from '@/lib/db/server'
import { createClientFromLead } from '@/lib/clients/actions'
import {
  BookingServiceModeSchema,
  ScheduleRequestSchema,
  summarizeScheduleRequest,
} from '@/lib/booking/schedule-schema'
import { FOUNDER_EMAIL, resolveOwnerChefId } from '@/lib/platform/owner-account'
import { z } from 'zod'

const DEFAULT_BOOKING_CHEF_EMAIL = FOUNDER_EMAIL

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
  budget_range: z.string().max(200).optional().or(z.literal('')),
  allergy_flag: z.enum(['none', 'yes', 'unknown']).optional(),
  favorite_ingredients_dislikes: z.string().optional().or(z.literal('')),
  allergies_food_restrictions: z.string().optional().or(z.literal('')),
  additional_notes: z.string().optional().or(z.literal('')),
  service_mode: BookingServiceModeSchema.optional(),
  recurring_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurring_duration_weeks: z.number().int().min(1).max(52).optional(),
  menu_recommendation_lead_days: z.number().int().min(1).max(21).optional(),
  schedule_request_jsonb: ScheduleRequestSchema.optional(),
  website_url: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
})

export type PublicInquiryInput = z.infer<typeof PublicInquirySchema>

/**
 * Submit a public inquiry from the chef profile page.
 * Creates three linked records in one shot:
 * 1. Client (idempotent - reuses existing by email)
 * 2. Inquiry (status: 'new', channel: 'website')
 * 3. Draft Event (status: 'draft', TBD placeholders for missing fields)
 */
export async function submitPublicInquiry(input: PublicInquiryInput) {
  const validated = PublicInquirySchema.parse(input)

  if (validated.website_url?.trim()) {
    // Honeypot filled by bots; return success to avoid retries.
    return { success: true, inquiryCreated: false, eventCreated: false }
  }

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  await checkRateLimit(`public-inquiry:ip:${ip}`, 8, 5 * 60_000)
  await checkRateLimit(
    `public-inquiry:email:${validated.email.toLowerCase().trim()}`,
    4,
    60 * 60_000
  )

  const db = createServerClient({ admin: true })
  const allergiesList = validated.allergies_food_restrictions
    ? validated.allergies_food_restrictions
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : null
  const serviceMode = validated.service_mode ?? 'one_off'
  const scheduleSummary = summarizeScheduleRequest(validated.schedule_request_jsonb)

  const sourceParts = [
    `Serving Time: ${validated.serve_time.trim()}`,
    `Service Mode: ${
      serviceMode === 'recurring'
        ? 'Recurring'
        : serviceMode === 'multi_day'
          ? 'Multi-day'
          : 'One-off'
    }`,
    serviceMode === 'recurring'
      ? `Recurring Plan: ${validated.recurring_frequency ?? 'weekly'} for ${
          validated.recurring_duration_weeks ?? 8
        } week(s); menu recommendation lead ${validated.menu_recommendation_lead_days ?? 7} day(s).`
      : null,
    scheduleSummary,
    validated.budget_cents != null
      ? `Exact Budget: $${(validated.budget_cents / 100).toFixed(2)}`
      : validated.budget_range
        ? `Budget Range: ${validated.budget_range}`
        : null,
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
  const serviceExpectations = [
    `Serve time ${validated.serve_time.trim()}. Chef will arrive 2hr prior.`,
    serviceMode === 'recurring'
      ? `Recurring ${validated.recurring_frequency ?? 'weekly'} plan for ${
          validated.recurring_duration_weeks ?? 8
        } week(s). Menu recommendations requested ${validated.menu_recommendation_lead_days ?? 7} day(s) ahead.`
      : null,
    serviceMode === 'multi_day' && scheduleSummary ? scheduleSummary : null,
  ]
    .filter(Boolean)
    .join(' ')

  // 1. Resolve chef slug → tenant_id (prefer slug; fallback to hardcoded email)
  let chef: { id: string; business_name: string | null } | null = null
  let chefError: { message?: string } | null = null

  if (validated.chef_slug) {
    const lookup = await findChefByPublicSlug<{ id: string; business_name: string | null }>(
      db,
      validated.chef_slug,
      'id, business_name'
    )
    chef = lookup.data
    chefError = lookup.error
  } else {
    const ownerChefId = await resolveOwnerChefId(db)
    if (ownerChefId) {
      const lookup = await db
        .from('chefs')
        .select('id, business_name')
        .eq('id', ownerChefId)
        .single()
      chef = lookup.data as { id: string; business_name: string | null } | null
      chefError = lookup.error
    }

    if (!chef) {
      const founderLookup = await db
        .from('chefs')
        .select('id, business_name')
        .ilike('email', DEFAULT_BOOKING_CHEF_EMAIL)
        .single()
      chef = founderLookup.data as { id: string; business_name: string | null } | null
      chefError = founderLookup.error
    }
  }

  if (chefError || !chef) {
    throw new Error('Chef not found')
  }

  const tenantId = chef.id as string
  const chefName = (chef.business_name as string | null) || 'Your Chef'

  const { data: discoveryProfile, error: discoveryError } = await (db as any)
    .from('chef_marketplace_profiles')
    .select('accepting_inquiries')
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (discoveryError && discoveryError.code !== '42P01') {
    console.error('[submitPublicInquiry] discovery profile lookup error:', discoveryError)
  }
  if (discoveryProfile && discoveryProfile.accepting_inquiries === false) {
    throw new Error('This chef is not currently accepting new inquiries.')
  }

  // 2. Create or find existing client
  const client = await createClientFromLead(tenantId, {
    email: validated.email.toLowerCase().trim(),
    full_name: validated.full_name.trim(),
    phone: validated.phone?.trim() || null,
    source: 'website',
  })

  // Only persist exact budget cents when explicitly provided.
  const budgetCents = validated.budget_cents ?? null
  const budgetMode: 'exact' | 'range' | 'not_sure' | 'unset' =
    budgetCents != null
      ? 'exact'
      : validated.budget_range === 'not_sure'
        ? 'not_sure'
        : validated.budget_range
          ? 'range'
          : 'unset'
  const budgetRange = validated.budget_range ?? null
  const budgetKnown = budgetMode === 'exact' || budgetMode === 'range'

  // 3. Create inquiry record linked to client
  const { data: inquiry, error: inquiryError } = await db
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
      confirmed_service_expectations: serviceExpectations,
      confirmed_dietary_restrictions: allergiesList,
      source_message: sourceMessage || null,
      service_mode: serviceMode,
      schedule_request_jsonb: validated.schedule_request_jsonb ?? null,
      unknown_fields: {
        address: validated.address.trim(),
        serve_time: validated.serve_time.trim(),
        allergy_flag: validated.allergy_flag ?? null,
        budget_mode: budgetMode,
        budget_range: validated.budget_range ?? null,
        budget_exact_cents: budgetCents,
        favorite_ingredients_dislikes: validated.favorite_ingredients_dislikes?.trim() || null,
        allergies_food_restrictions: validated.allergies_food_restrictions?.trim() || null,
        additional_notes: validated.additional_notes?.trim() || null,
        service_mode: serviceMode,
        recurring_frequency:
          serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : null,
        recurring_duration_weeks:
          serviceMode === 'recurring' ? (validated.recurring_duration_weeks ?? 8) : null,
        menu_recommendation_lead_days:
          serviceMode === 'recurring' ? (validated.menu_recommendation_lead_days ?? 7) : null,
        schedule_request_jsonb: validated.schedule_request_jsonb ?? null,
      },
      status: 'new',
    })
    .select('id')
    .single()

  if (inquiryError) {
    console.error('[submitPublicInquiry] Inquiry creation error:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  // Auto-create Dinner Circle (non-blocking)
  let circleGroupToken: string | null = null
  try {
    const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
    const { postFirstCircleMessage } = await import('@/lib/hub/inquiry-circle-first-message')
    const circle = await createInquiryCircle({
      inquiryId: inquiry.id,
      clientName: validated.full_name.trim(),
      clientEmail: validated.email.toLowerCase().trim(),
      occasion: validated.occasion.trim(),
    })
    circleGroupToken = circle.groupToken
    await postFirstCircleMessage({
      groupId: circle.groupId,
      inquiryId: inquiry.id,
    })
  } catch (circleErr) {
    console.error('[submitPublicInquiry] Circle creation failed (non-blocking):', circleErr)
  }

  // Send acknowledgment email to client (non-blocking - never fails the submission)
  try {
    const { sendInquiryReceivedEmail } = await import('@/lib/email/notifications')
    await sendInquiryReceivedEmail({
      clientEmail: validated.email.toLowerCase().trim(),
      clientName: validated.full_name.trim(),
      chefName,
      occasion: validated.occasion.trim(),
      eventDate: validated.event_date || null,
      circleUrl: circleGroupToken
        ? `https://app.cheflowhq.com/hub/g/${circleGroupToken}`
        : undefined,
    })
  } catch (emailErr) {
    console.error('[submitPublicInquiry] Acknowledgment email failed (non-blocking):', emailErr)
  }

  // 4. Create draft event with available info (TBD for missing required fields)
  const { data: event, error: eventError } = await db
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry.id,
      event_date: validated.event_date,
      serve_time: validated.serve_time.trim(),
      service_mode: serviceMode,
      guest_count: validated.guest_count,
      location_address: validated.address.trim(),
      location_city: 'TBD',
      location_zip: 'TBD',
      occasion: validated.occasion.trim(),
      quoted_price_cents: budgetCents,
      special_requests: sourceMessage || null,
    })
    .select('id')
    .single()

  if (eventError) {
    console.error('[submitPublicInquiry] Event creation error:', eventError)
    // Inquiry was created - don't fail entirely, just log
    // Chef can still see the inquiry + client
    return { success: true, inquiryCreated: true, eventCreated: false }
  }

  // 5. Log initial event state transition (null → draft)
  await db.from('event_state_transitions').insert({
    tenant_id: tenantId,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    metadata: { action: 'auto_created_from_public_inquiry', inquiry_id: inquiry.id },
  })

  // 6. Link inquiry to the created event
  await db.from('inquiries').update({ converted_to_event_id: event.id }).eq('id', inquiry.id)

  // 7. Enqueue Remy reactive AI task - auto-score lead (non-blocking)
  try {
    const { evaluateAutomations } = await import('@/lib/automations/engine')
    await evaluateAutomations(tenantId, 'inquiry_created', {
      entityId: inquiry.id,
      entityType: 'inquiry',
      fields: {
        channel: 'website',
        client_name: validated.full_name,
        occasion: validated.occasion || null,
        guest_count: validated.guest_count ?? null,
        budget_mode: budgetMode,
        budget_known: budgetKnown,
        budget_range: budgetRange,
        budget_cents: budgetCents,
        service_mode: serviceMode,
        recurring_frequency:
          serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : null,
        recurring_duration_weeks:
          serviceMode === 'recurring' ? (validated.recurring_duration_weeks ?? 8) : null,
      },
    })
  } catch (err) {
    console.error('[submitPublicInquiry] Automation evaluation failed (non-blocking):', err)
  }

  try {
    const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
    await onInquiryCreated(tenantId, inquiry.id, client.id, {
      channel: 'website',
      clientName: validated.full_name,
      occasion: validated.occasion ?? undefined,
      budgetCents: validated.budget_cents ?? undefined,
      budgetMode,
      budgetRange: budgetRange ?? undefined,
      guestCount: validated.guest_count ?? undefined,
      serviceMode,
      recurringFrequency:
        serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : undefined,
    })
  } catch (err) {
    console.error('[submitPublicInquiry] Remy reactive enqueue failed (non-blocking):', err)
  }

  // 8. Push notification - new inquiry from website (non-blocking)
  try {
    const { getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      const { notifyNewInquiry } = await import('@/lib/notifications/onesignal')
      await notifyNewInquiry(chefUserId, validated.full_name, validated.event_date || 'date TBD')
    }
  } catch (err) {
    console.error('[submitPublicInquiry] Push notification failed (non-blocking):', err)
  }

  return { success: true, inquiryCreated: true, eventCreated: true }
}
