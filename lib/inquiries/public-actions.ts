// Public Inquiry Submission Server Action
// No auth required - uses admin client for public form submissions
// Auto-creates: client record and inquiry record. Event creation happens later.

'use server'

import { headers } from 'next/headers'
import { guardPublicIntent } from '@/lib/security/public-intent-guard'
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
import {
  parseFreeTextDietary,
  buildAllergyRecordRows,
  recordsToStringArray,
} from '@/lib/dietary/intake'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'
import { PUBLIC_INTAKE_LANE_KEYS, withSubmissionSource } from '@/lib/public/intake-lane-config'
import { executeInteraction } from '@/lib/interactions'

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
  client_birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthday must use YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  budget_cents: z.number().int().nonnegative().nullable().optional(),
  budget_range: z.string().max(200).optional().or(z.literal('')),
  allergy_flag: z.enum(['none', 'yes', 'unknown']).optional(),
  favorite_ingredients_dislikes: z.string().optional().or(z.literal('')),
  allergies_food_restrictions: z.string().optional().or(z.literal('')),
  additional_notes: z.string().optional().or(z.literal('')),
  referral_source: z.string().max(200).optional().or(z.literal('')),
  referral_partner_id: z.string().uuid().optional().nullable(),
  partner_location_id: z.string().uuid().optional().nullable(),
  existing_circle_id: z.string().uuid().optional(),
  service_mode: BookingServiceModeSchema.optional(),
  recurring_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurring_duration_weeks: z.number().int().min(1).max(52).optional(),
  menu_recommendation_lead_days: z.number().int().min(1).max(21).optional(),
  schedule_request_jsonb: ScheduleRequestSchema.optional(),
  website_url: z.string().max(2048).optional().or(z.literal('')),
})

type PublicInquiryInput = z.infer<typeof PublicInquirySchema>

async function resolvePublicLocationAttribution(
  db: any,
  tenantId: string,
  input: {
    referralPartnerId?: string | null
    partnerLocationId?: string | null
  }
) {
  let resolvedPartnerId: string | null = null
  let resolvedLocationId: string | null = null
  let resolvedLocationName: string | null = null

  if (input.partnerLocationId) {
    const { data: location, error } = await db
      .from('partner_locations')
      .select('id, partner_id, name')
      .eq('id', input.partnerLocationId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!error && location) {
      resolvedLocationId = location.id
      resolvedLocationName = location.name ?? null
      resolvedPartnerId = location.partner_id
    }
  }

  if (!resolvedPartnerId && input.referralPartnerId) {
    const { data: partner, error } = await db
      .from('referral_partners')
      .select('id')
      .eq('id', input.referralPartnerId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (!error && partner) {
      resolvedPartnerId = partner.id
    }
  }

  return {
    referralPartnerId: resolvedPartnerId,
    partnerLocationId: resolvedLocationId,
    partnerLocationName: resolvedLocationName,
  }
}

/**
 * Submit a public inquiry from the chef profile page.
 * Creates three linked records in one shot:
 * 1. Client (idempotent - reuses existing by email)
 * 2. Inquiry (status: 'new', channel: 'website')
 * 3. Draft Event (status: 'draft', TBD placeholders for missing fields)
 */
export async function submitPublicInquiry(input: PublicInquiryInput) {
  const validated = PublicInquirySchema.parse(input)
  const hdrs = await headers()

  const guard = await guardPublicIntent({
    action: 'public-profile-inquiry',
    headers: hdrs,
    rateLimit: {
      ip: {
        keyPrefix: 'public-inquiry:ip',
        max: 8,
        windowMs: 5 * 60_000,
        message: 'Too many submissions. Please try again later.',
      },
      email: {
        keyPrefix: 'public-inquiry:email',
        max: 4,
        windowMs: 60 * 60_000,
        message: 'Too many submissions from this email. Please try again later.',
        value: validated.email,
      },
    },
    honeypot: { value: validated.website_url },
  })

  if (!guard.ok) {
    if (guard.error.code === 'honeypot') {
      // Honeypot filled by bots; return success to avoid retries.
      return { success: true, inquiryCreated: false, eventCreated: false, circleGroupToken: null }
    }
    throw new Error(guard.error.message)
  }

  const db = createServerClient({ admin: true })
  const dietaryRecords = validated.allergies_food_restrictions
    ? parseFreeTextDietary(validated.allergies_food_restrictions, 'intake_form')
    : []
  const allergiesList = dietaryRecords.length > 0 ? recordsToStringArray(dietaryRecords) : null
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
    validated.client_birthday ? `Client Birthday: ${validated.client_birthday}` : null,
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
    const lookup = await findChefByPublicSlug<{
      id: string
      business_name: string | null
      email: string | null
      account_status: string | null
      deletion_scheduled_for: string | null
    }>(db, validated.chef_slug, 'id, business_name, email, account_status, deletion_scheduled_for')
    chef = lookup.data
    chefError = lookup.error
  } else {
    const ownerChefId = await resolveOwnerChefId(db)
    if (ownerChefId) {
      const lookup = await db
        .from('chefs')
        .select('id, business_name, email, account_status, deletion_scheduled_for')
        .eq('id', ownerChefId)
        .single()
      chef = lookup.data as {
        id: string
        business_name: string | null
        email: string | null
        account_status: string | null
        deletion_scheduled_for: string | null
      } | null
      chefError = lookup.error
    }

    if (!chef) {
      const founderLookup = await db
        .from('chefs')
        .select('id, business_name, email, account_status, deletion_scheduled_for')
        .ilike('email', DEFAULT_BOOKING_CHEF_EMAIL)
        .single()
      chef = founderLookup.data as {
        id: string
        business_name: string | null
        email: string | null
        account_status: string | null
        deletion_scheduled_for: string | null
      } | null
      chefError = founderLookup.error
    }
  }

  if (chefError || !chef) {
    throw new Error('Chef not found')
  }

  // Guard: reject inquiries for suspended or pending-deletion accounts
  const chefStatus = (chef as any).account_status as string | null
  const chefDeletion = (chef as any).deletion_scheduled_for as string | null
  if (chefStatus === 'suspended') {
    throw new Error('This chef is not currently accepting inquiries.')
  }
  if (chefDeletion) {
    throw new Error('This chef is not currently accepting inquiries.')
  }

  const tenantId = chef.id as string
  const chefName = (chef.business_name as string | null) || 'Your Chef'
  const chefEmail = (chef as any).email as string | null
  const resolvedAttribution = await resolvePublicLocationAttribution(db, tenantId, {
    referralPartnerId: validated.referral_partner_id ?? null,
    partnerLocationId: validated.partner_location_id ?? null,
  })

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
    birthday: validated.client_birthday || null,
    source: 'website',
  })

  // Persist structured allergy records for the client
  if (dietaryRecords.length > 0) {
    const rows = buildAllergyRecordRows(tenantId, client.id, dietaryRecords)
    try {
      await db.from('client_allergy_records').upsert(rows, {
        onConflict: 'client_id,allergen',
        ignoreDuplicates: true,
      })
    } catch (err) {
      console.error('[submitPublicInquiry] Allergy record upsert failed (non-blocking):', err)
    }
  }

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

  // 3a. Dedup: same client + chef + date within 24h = duplicate
  const dedup24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existingInquiry } = await db
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .eq('confirmed_date', validated.event_date || null)
    .gte('created_at', dedup24h)
    .limit(1)
    .single()

  if (existingInquiry) {
    return {
      success: true,
      inquiryCreated: false,
      eventCreated: false,
      duplicateOf: existingInquiry.id,
      circleGroupToken: null,
    }
  }

  // 3b. Create inquiry record linked to client
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
      referral_source: validated.referral_source?.trim() || null,
      referral_partner_id: resolvedAttribution.referralPartnerId,
      partner_location_id: resolvedAttribution.partnerLocationId,
      service_mode: serviceMode,
      schedule_request_jsonb: validated.schedule_request_jsonb ?? null,
      unknown_fields: withSubmissionSource(PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry, {
        address: validated.address.trim(),
        serve_time: validated.serve_time.trim(),
        allergy_flag: validated.allergy_flag ?? null,
        budget_mode: budgetMode,
        budget_range: validated.budget_range ?? null,
        budget_exact_cents: budgetCents,
        favorite_ingredients_dislikes: validated.favorite_ingredients_dislikes?.trim() || null,
        allergies_food_restrictions: validated.allergies_food_restrictions?.trim() || null,
        client_birthday: validated.client_birthday || null,
        additional_notes: validated.additional_notes?.trim() || null,
        service_mode: serviceMode,
        recurring_frequency:
          serviceMode === 'recurring' ? (validated.recurring_frequency ?? 'weekly') : null,
        recurring_duration_weeks:
          serviceMode === 'recurring' ? (validated.recurring_duration_weeks ?? 8) : null,
        menu_recommendation_lead_days:
          serviceMode === 'recurring' ? (validated.menu_recommendation_lead_days ?? 7) : null,
        schedule_request_jsonb: validated.schedule_request_jsonb ?? null,
        partner_location_id: resolvedAttribution.partnerLocationId,
        partner_location_name: resolvedAttribution.partnerLocationName,
      }),
      status: 'new',
    })
    .select('id')
    .single()

  if (inquiryError) {
    console.error('[submitPublicInquiry] Inquiry creation error:', inquiryError)
    throw new Error('Failed to create inquiry')
  }

  await recordPlatformEvent({
    eventKey: 'conversion.public_inquiry_submitted',
    source: 'public_booking',
    actorType: 'anonymous',
    tenantId,
    subjectType: 'inquiry',
    subjectId: inquiry.id,
    summary: `${validated.full_name.trim()} submitted a public inquiry for ${validated.occasion.trim()}`,
    details: `${validated.guest_count} guests on ${validated.event_date} at ${validated.serve_time.trim()}`,
    metadata: {
      ...extractRequestMetadata(hdrs),
      client_email: validated.email.toLowerCase().trim(),
      client_name: validated.full_name.trim(),
      occasion: validated.occasion.trim(),
      guest_count: validated.guest_count,
      service_mode: serviceMode,
      budget_mode: budgetMode,
      budget_range: budgetRange,
      budget_cents: budgetCents,
      referral_partner_id: resolvedAttribution.referralPartnerId,
      partner_location_id: resolvedAttribution.partnerLocationId,
      partner_location_name: resolvedAttribution.partnerLocationName,
    },
  })

  if (budgetKnown) {
    await recordPlatformEvent({
      eventKey: 'input.public_inquiry_budget_provided',
      source: 'public_booking',
      actorType: 'anonymous',
      tenantId,
      subjectType: 'inquiry',
      subjectId: inquiry.id,
      summary: `Budget information captured for inquiry ${inquiry.id}`,
      metadata: {
        ...extractRequestMetadata(hdrs),
        budget_mode: budgetMode,
        budget_range: budgetRange,
        budget_cents: budgetCents,
      },
      alertDedupeKey: `inquiry-budget:${inquiry.id}`,
    })
  }

  await executeInteraction({
    action_type: 'send_inquiry',
    actor_id: client.id,
    actor: { role: 'client', actorId: client.id, entityId: client.id, tenantId },
    target_type: 'system',
    target_id: inquiry.id,
    context_type: 'client',
    context_id: client.id,
    visibility: 'private',
    metadata: {
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry.id,
      source: 'public_inquiry',
      occasion: validated.occasion.trim(),
      suppress_interaction_notifications: true,
      suppress_interaction_activity: true,
      suppress_interaction_automation: true,
    },
    idempotency_key: `send_inquiry:${inquiry.id}`,
  })

  // Auto-create Dinner Circle OR link to existing one (non-blocking)
  let circleGroupToken: string | null = null
  let rebookCircleId: string | null = null
  try {
    if (validated.existing_circle_id) {
      // Rebook: reuse existing circle instead of creating a new one
      const { getGroupById } = await import('@/lib/hub/group-actions')
      const existingGroup = await getGroupById(validated.existing_circle_id)
      if (existingGroup) {
        circleGroupToken = existingGroup.group_token
        rebookCircleId = existingGroup.id
      }
    } else {
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
    }
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
      guestCount: validated.guest_count,
      location: validated.address.trim() || null,
      serveTime: validated.serve_time.trim() || null,
      circleUrl: circleGroupToken
        ? `https://app.cheflowhq.com/hub/g/${circleGroupToken}`
        : undefined,
    })
  } catch (emailErr) {
    console.error('[submitPublicInquiry] Acknowledgment email failed (non-blocking):', emailErr)
  }

  // Notify chef of new inquiry via email (non-blocking)
  if (chefEmail) {
    try {
      const { sendNewInquiryChefEmail } = await import('@/lib/email/notifications')
      await sendNewInquiryChefEmail({
        chefEmail,
        chefName,
        clientName: validated.full_name.trim(),
        occasion: validated.occasion.trim(),
        eventDate: validated.event_date || null,
        guestCount: validated.guest_count,
        source: 'portal',
        inquiryId: inquiry.id,
      })
    } catch (emailErr) {
      console.error(
        '[submitPublicInquiry] Chef notification email failed (non-blocking):',
        emailErr
      )
    }
  }

  // SMS acknowledgment to client (non-blocking)
  // Short, personal, direct. No AI formatting. Just a real-feeling text.
  try {
    const { sendSms } = await import('@/lib/sms/send')
    const clientPhone = (validated as any).phone?.trim()
    if (clientPhone) {
      const clientSmsBody = `Hi ${validated.full_name.trim().split(' ')[0]}, ${chefName} received your inquiry for ${validated.occasion.trim()}. We'll be in touch shortly to chat details.`
      await sendSms(clientPhone, clientSmsBody)
    }
  } catch (smsErr) {
    console.error('[submitPublicInquiry] Client SMS failed (non-blocking):', smsErr)
  }

  // SMS alert to chef (non-blocking) - hardwired so the chef actually knows
  // Priority: routing rules chef_sms_number > chefs.phone > env var
  // This fires regardless of whether email was delivered.
  try {
    const { sendSms } = await import('@/lib/sms/send')
    const db2: any = createServerClient()
    const [{ data: routingRule }, { data: chefRecord }] = await Promise.all([
      db2
        .from('ai_call_routing_rules')
        .select('chef_sms_number')
        .eq('chef_id', tenantId)
        .maybeSingle(),
      db2.from('chefs').select('phone').eq('id', tenantId).maybeSingle(),
    ])
    const chefPhone =
      routingRule?.chef_sms_number || chefRecord?.phone || process.env.CHEF_ALERT_SMS_NUMBER
    if (chefPhone) {
      const guestCount = validated.guest_count
      const eventDate = validated.event_date ? ` on ${validated.event_date}` : ''
      const chefSmsBody = `New inquiry: ${validated.full_name.trim()} - ${validated.occasion.trim()}${eventDate}, ${guestCount} guests. Check ChefFlow now.`
      await sendSms(chefPhone, chefSmsBody)
    }
  } catch (smsErr) {
    console.error('[submitPublicInquiry] Chef SMS alert failed (non-blocking):', smsErr)
  }

  // SSE push to chef dashboard - hardwired real-time alert
  try {
    const { broadcast } = await import('@/lib/realtime/broadcast')
    await broadcast(`chef-${tenantId}`, 'new_inquiry_received', {
      inquiryId: inquiry.id,
      clientName: validated.full_name.trim(),
      occasion: validated.occasion.trim(),
      eventDate: validated.event_date || null,
      guestCount: validated.guest_count,
      channel: 'portal',
      urgent: true,
    })
  } catch (sseErr) {
    console.error('[submitPublicInquiry] SSE broadcast failed (non-blocking):', sseErr)
  }

  // 4. Event creation is deferred until commercial commitment.

  // 5. Log initial event state transition (null → draft)

  // 5. Enqueue Remy reactive AI task - auto-score lead (non-blocking)
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

  // 8. Notification - new inquiry from website (non-blocking)
  try {
    const { getChefAuthUserId, createNotification } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(tenantId)
    if (chefUserId) {
      await createNotification({
        tenantId,
        recipientId: chefUserId,
        category: 'inquiry',
        action: 'new_inquiry',
        title: `New inquiry from ${validated.full_name}`,
        body: `${validated.full_name} is interested in booking ${validated.event_date || 'date TBD'}`,
        inquiryId: inquiry.id,
        clientId: client.id,
      })
    }
  } catch (err) {
    console.error('[submitPublicInquiry] Notification failed (non-blocking):', err)
  }

  // 9. Chef auto-response to client (non-blocking) - uses chef's configured template
  // Fires only if chef has auto-response enabled. Built-in system default ensures
  // something always sends if chef has no custom template configured.
  try {
    const { triggerAutoResponse } = await import('@/lib/communication/auto-response')
    await triggerAutoResponse(inquiry.id, tenantId)
  } catch (err) {
    console.error('[submitPublicInquiry] Auto-response failed (non-blocking):', err)
  }

  return { success: true, inquiryCreated: true, eventCreated: false, circleGroupToken }
}

/**
 * Public date availability check.
 * Returns whether a chef already has events on a given date.
 * No auth required (public surface). Returns only a boolean for privacy.
 */
export async function checkPublicDateAvailability(
  chefSlug: string,
  date: string
): Promise<{ busy: boolean }> {
  if (!chefSlug || !date) return { busy: false }

  try {
    const db = createServerClient({ admin: true })
    const chefLookup = await findChefByPublicSlug<{ id: string }>(db, chefSlug, 'id')
    if (!chefLookup.data) return { busy: false }

    const { count } = await db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chefLookup.data.id)
      .eq('event_date', date)
      .neq('status', 'cancelled')

    return { busy: (count ?? 0) > 0 }
  } catch {
    return { busy: false }
  }
}
