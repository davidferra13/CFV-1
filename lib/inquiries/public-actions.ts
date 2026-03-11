// Public Inquiry Submission Server Action
// No auth required — uses admin client for public form submissions
// Auto-creates: client record, inquiry record, draft event

'use server'

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildFeaturedMenuContextLine,
  cloneFeaturedMenuToEvent,
  normalizeBookingServiceModeForMenu,
  resolveRequestedFeaturedMenuId,
} from '@/lib/booking/featured-menu'
import { findExistingClientByEmail } from '@/lib/clients/find-existing'
import {
  BookingServiceModeSchema,
  ScheduleRequestSchema,
  summarizeScheduleRequest,
} from '@/lib/booking/schedule-schema'
import { resolveChefByPublicSlug } from '@/lib/chefs/public-slug-resolver'
import { recordInquiryStateTransition } from '@/lib/inquiries/transition-log'
import { FOUNDER_EMAIL, resolveOwnerChefId } from '@/lib/platform/owner-account'
import { getReferralLandingContext } from '@/lib/referrals/actions'
import { markRebookTokenUsed } from '@/lib/rebook/actions'
import { z } from 'zod'

const DEFAULT_BOOKING_CHEF_EMAIL = FOUNDER_EMAIL

const PublicInquirySchema = z.object({
  chef_slug: z.string().optional(),
  selected_menu_id: z.string().uuid().optional(),
  campaign_source: z.enum(['public_profile', 'rebook_qr', 'referral_qr']).optional(),
  rebook_token: z.string().optional(),
  referral_code: z.string().optional(),
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
  budget_range: z
    .enum(['under_500', '500_1500', '1500_3000', '3000_5000', 'over_5000', 'not_sure'])
    .optional(),
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
 * 1. Client (idempotent — reuses existing by email)
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

  const supabase: any = createServerClient({ admin: true })
  const allergiesList = validated.allergies_food_restrictions
    ? validated.allergies_food_restrictions
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : null
  const requestedFeaturedMenuId = validated.selected_menu_id?.trim() || null
  const normalizedRebookToken = validated.rebook_token?.trim() || null
  const normalizedReferralCode = validated.referral_code?.trim().toUpperCase() || null
  let rebookContext: {
    tenantId: string
    eventId: string
    clientId: string
  } | null = null

  // 1. Resolve chef / campaign context
  let chef: {
    id: string
    business_name: string | null
    featured_booking_menu_id: string | null
  } | null = null

  if (normalizedRebookToken) {
    const { data: rebookToken } = await supabase
      .from('rebook_tokens')
      .select('tenant_id, event_id, client_id, expires_at, used_at')
      .eq('token', normalizedRebookToken)
      .maybeSingle()

    if (!rebookToken) {
      throw new Error('This rebook link is invalid.')
    }

    if ((rebookToken as any).used_at) {
      throw new Error('This rebook link has already been used.')
    }

    if (new Date((rebookToken as any).expires_at) < new Date()) {
      throw new Error('This rebook link has expired.')
    }

    rebookContext = {
      tenantId: (rebookToken as any).tenant_id,
      eventId: (rebookToken as any).event_id,
      clientId: (rebookToken as any).client_id,
    }

    const lookup = await supabase
      .from('chefs')
      .select('id, business_name, booking_slug, slug, public_slug, featured_booking_menu_id')
      .eq('id', rebookContext.tenantId)
      .maybeSingle()

    if (!lookup.data) {
      throw new Error('Chef not found')
    }

    const requestedSlug = validated.chef_slug?.trim().toLowerCase() || ''
    const matchedSlug =
      !requestedSlug ||
      [lookup.data.booking_slug, lookup.data.slug, lookup.data.public_slug]
        .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
        .filter(Boolean)
        .includes(requestedSlug)

    if (!matchedSlug) {
      throw new Error('This rebook link does not match the selected chef.')
    }

    chef = {
      id: (lookup.data as any).id,
      business_name: (lookup.data as any).business_name ?? null,
      featured_booking_menu_id: (lookup.data as any).featured_booking_menu_id ?? null,
    }
  } else if (validated.chef_slug) {
    chef = await resolveChefByPublicSlug<{
      id: string
      business_name: string | null
      featured_booking_menu_id: string | null
    }>(supabase, validated.chef_slug, 'id, business_name, featured_booking_menu_id')
  } else {
    const ownerChefId = await resolveOwnerChefId(supabase)
    if (ownerChefId) {
      const lookup = await supabase
        .from('chefs')
        .select('id, business_name, featured_booking_menu_id')
        .eq('id', ownerChefId)
        .single()
      chef = lookup.data as {
        id: string
        business_name: string | null
        featured_booking_menu_id: string | null
      } | null
    }

    if (!chef) {
      const founderLookup = await supabase
        .from('chefs')
        .select('id, business_name, featured_booking_menu_id')
        .ilike('email', DEFAULT_BOOKING_CHEF_EMAIL)
        .single()
      chef = founderLookup.data as {
        id: string
        business_name: string | null
        featured_booking_menu_id: string | null
      } | null
    }
  }

  if (!chef) {
    throw new Error('Chef not found')
  }

  const tenantId = chef.id as string
  const chefName = (chef.business_name as string | null) || 'Your Chef'
  const resolvedFeaturedMenuId = requestedFeaturedMenuId
    ? resolveRequestedFeaturedMenuId(chef.featured_booking_menu_id, requestedFeaturedMenuId)
    : null

  if (requestedFeaturedMenuId && !resolvedFeaturedMenuId) {
    throw new Error('This ready-to-book menu is no longer available. Please refresh and try again.')
  }

  const { data: selectedFeaturedMenu } = resolvedFeaturedMenuId
    ? await supabase
        .from('menus')
        .select('id, name')
        .eq('id', resolvedFeaturedMenuId)
        .eq('tenant_id', tenantId)
        .neq('status', 'archived')
        .is('deleted_at', null)
        .maybeSingle()
    : { data: null }

  if (resolvedFeaturedMenuId && !selectedFeaturedMenu) {
    throw new Error('This ready-to-book menu is no longer available. Please refresh and try again.')
  }

  const selectedFeaturedMenuName =
    typeof selectedFeaturedMenu?.name === 'string' ? selectedFeaturedMenu.name : null
  const serviceMode = normalizeBookingServiceModeForMenu(
    validated.service_mode ?? 'one_off',
    Boolean(selectedFeaturedMenu)
  )
  const scheduleSummary = summarizeScheduleRequest(
    serviceMode === 'multi_day' ? validated.schedule_request_jsonb : undefined
  )
  const sourceParts = [
    `Serving Time: ${validated.serve_time.trim()}`,
    `Service Mode: ${
      serviceMode === 'recurring'
        ? 'Recurring'
        : serviceMode === 'multi_day'
          ? 'Multi-day'
          : 'One-off'
    }`,
    selectedFeaturedMenuName ? buildFeaturedMenuContextLine(selectedFeaturedMenuName) : null,
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
    selectedFeaturedMenuName
      ? `Start from the featured menu "${selectedFeaturedMenuName}" instead of a fully custom menu.`
      : null,
    serviceMode === 'recurring'
      ? `Recurring ${validated.recurring_frequency ?? 'weekly'} plan for ${
          validated.recurring_duration_weeks ?? 8
        } week(s). Menu recommendations requested ${validated.menu_recommendation_lead_days ?? 7} day(s) ahead.`
      : null,
    serviceMode === 'multi_day' && scheduleSummary ? scheduleSummary : null,
  ]
    .filter(Boolean)
    .join(' ')
  const referralContext = await getReferralLandingContext(tenantId, normalizedReferralCode)
  const campaignSource =
    validated.campaign_source ??
    (rebookContext ? 'rebook_qr' : referralContext.isValid ? 'referral_qr' : 'public_profile')

  // 2. Store contact info on the inquiry. Auto-link if already a client (read-only check).
  const contactName = validated.full_name.trim()
  const contactEmail = validated.email.toLowerCase().trim()
  const contactPhone = validated.phone?.trim() || null
  const existingClientId = await findExistingClientByEmail(supabase, tenantId, contactEmail)

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
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'website',
      client_id: existingClientId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.event_date || null,
      confirmed_guest_count: validated.guest_count,
      confirmed_location: validated.address.trim(),
      confirmed_occasion: validated.occasion.trim(),
      confirmed_budget_cents: budgetCents,
      confirmed_service_expectations: serviceExpectations,
      confirmed_dietary_restrictions: allergiesList,
      referral_source: referralContext.isValid ? 'referral' : rebookContext ? 'rebook' : null,
      source_message: sourceMessage || null,
      selected_menu_id: selectedFeaturedMenu?.id ?? null,
      service_mode: serviceMode,
      schedule_request_jsonb:
        serviceMode === 'multi_day' ? (validated.schedule_request_jsonb ?? null) : null,
      unknown_fields: {
        campaign_source: campaignSource,
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
        schedule_request_jsonb:
          serviceMode === 'multi_day' ? (validated.schedule_request_jsonb ?? null) : null,
        selected_menu_id: selectedFeaturedMenu?.id ?? null,
        selected_menu_name: selectedFeaturedMenuName,
        rebook_token: normalizedRebookToken,
        source_completed_event_id: rebookContext?.eventId ?? null,
        source_client_id: rebookContext?.clientId ?? null,
        referral_code: referralContext.isValid ? referralContext.referralCode : null,
        referred_by_client_id: referralContext.isValid ? referralContext.referrerClientId : null,
        referrer_name: referralContext.isValid ? referralContext.referrerName : null,
      },
      status: 'new',
    })
    .select('id')
    .single()

  if (inquiryError) {
    console.error('[submitPublicInquiry] Inquiry creation error:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  try {
    await recordInquiryStateTransition({
      supabase,
      tenantId,
      inquiryId: inquiry.id,
      fromStatus: null,
      toStatus: 'new',
      transitionedBy: null,
      reason: 'public_inquiry_submitted',
      metadata: {
        source: 'public_inquiry',
        service_mode: serviceMode,
        campaign_source: campaignSource,
        rebook_token: normalizedRebookToken,
        source_completed_event_id: rebookContext?.eventId ?? null,
        referral_code: referralContext.isValid ? referralContext.referralCode : null,
      },
    })
  } catch (transitionErr) {
    console.error(
      '[submitPublicInquiry] Initial inquiry transition insert failed (non-blocking):',
      transitionErr
    )
  }

  // Auto-create Dinner Circle (non-blocking)
  let circleGroupToken: string | null = null
  try {
    const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
    const { postFirstCircleMessage } = await import('@/lib/hub/inquiry-circle-first-message')
    const circle = await createInquiryCircle({
      inquiryId: inquiry.id,
      tenantId,
      clientName: validated.full_name.trim(),
      clientEmail: validated.email.toLowerCase().trim(),
      occasion: validated.occasion.trim(),
    })
    circleGroupToken = circle.groupToken
    await postFirstCircleMessage({
      groupId: circle.groupId,
      inquiryId: inquiry.id,
      tenantId,
    })
  } catch (circleErr) {
    console.error('[submitPublicInquiry] Circle creation failed (non-blocking):', circleErr)
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
      circleUrl: circleGroupToken
        ? `https://app.cheflowhq.com/hub/g/${circleGroupToken}`
        : undefined,
    })
  } catch (emailErr) {
    console.error('[submitPublicInquiry] Acknowledgment email failed (non-blocking):', emailErr)
  }

  // 4. Create draft event with available info (TBD for missing required fields)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: existingClientId,
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
    // Inquiry was created — don't fail entirely, just log
    // Chef can still see the inquiry + client
    return { success: true, inquiryCreated: true, eventCreated: false }
  }

  // 5. Log initial event state transition (null → draft)
  if (selectedFeaturedMenu?.id) {
    await cloneFeaturedMenuToEvent({
      supabase,
      tenantId,
      eventId: event.id,
      sourceMenuId: selectedFeaturedMenu.id,
    })
  }

  await supabase.from('event_state_transitions').insert({
    tenant_id: tenantId,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    metadata: {
      action: 'auto_created_from_public_inquiry',
      inquiry_id: inquiry.id,
      campaign_source: campaignSource,
      source_completed_event_id: rebookContext?.eventId ?? null,
      referral_code: referralContext.isValid ? referralContext.referralCode : null,
    },
  })

  // 6. Link inquiry to the created event
  await supabase.from('inquiries').update({ converted_to_event_id: event.id }).eq('id', inquiry.id)

  // Referral record creation is deferred to the "Convert to Client" flow.
  // The referral context is stored in unknown_fields so it can be applied later.

  if (normalizedRebookToken) {
    try {
      await markRebookTokenUsed(normalizedRebookToken)
    } catch (rebookErr) {
      console.error('[submitPublicInquiry] Rebook token consume failed (non-blocking):', rebookErr)
    }
  }

  // 7. Enqueue Remy reactive AI task — auto-score lead (non-blocking)
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
        selected_menu_id: selectedFeaturedMenu?.id ?? null,
        selected_menu_name: selectedFeaturedMenuName,
        recurring_frequency:
          serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : null,
        recurring_duration_weeks:
          serviceMode === 'recurring' ? (validated.recurring_duration_weeks ?? 8) : null,
        campaign_source: campaignSource,
        source_completed_event_id: rebookContext?.eventId ?? null,
        referral_code: referralContext.isValid ? referralContext.referralCode : null,
      },
    })
  } catch (err) {
    console.error('[submitPublicInquiry] Automation evaluation failed (non-blocking):', err)
  }

  try {
    const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
    await onInquiryCreated(tenantId, inquiry.id, existingClientId, {
      channel: 'website',
      clientName: validated.full_name,
      occasion: validated.occasion ?? undefined,
      budgetCents: validated.budget_cents ?? undefined,
      budgetMode,
      budgetRange: budgetRange ?? undefined,
      guestCount: validated.guest_count ?? undefined,
      serviceMode,
      selectedMenuId: selectedFeaturedMenu?.id ?? undefined,
      recurringFrequency:
        serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : undefined,
      campaignSource,
    })
  } catch (err) {
    console.error('[submitPublicInquiry] Remy reactive enqueue failed (non-blocking):', err)
  }

  // 8. Push notification — new inquiry from website (non-blocking)
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
