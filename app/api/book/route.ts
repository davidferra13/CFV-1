// Public API endpoint for open booking submissions (no specific chef selected).
// Client describes their event, we match them to nearby chefs and create
// inquiries in each matched chef's inbox.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/admin'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { PUBLIC_INTAKE_JSON_BODY_MAX_BYTES } from '@/lib/api/request-body'
import { guardPublicIntent } from '@/lib/security/public-intent-guard'
import { matchChefsForBooking } from '@/lib/booking/match-chefs'
import { resolvePublicMarketScope } from '@/lib/public/public-market-scope'
import {
  PublicSeasonalMarketPulseIntentSchema,
  buildPublicSeasonalMarketPulseSourceMessageLine,
} from '@/lib/public/public-seasonal-market-pulse'
import { PUBLIC_INTAKE_LANE_KEYS, withSubmissionSource } from '@/lib/public/intake-lane-config'
import { parseBudgetToCents } from '@/lib/booking/budget-parser'
import { resolveGuestCountRange } from '@/lib/booking/guest-count-map'
import { canonicalizeBookingServiceType } from '@/lib/booking/service-types'

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim()
}

function parseDietaryRestrictions(value?: string | null) {
  if (!value?.trim()) return null

  const parsed = value
    .split(/[\n,]/)
    .map((item) => stripHtml(item))
    .filter(Boolean)

  return parsed.length > 0 ? parsed : null
}

const BookingSchema = z.object({
  // Client info
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required').max(320),
  phone: z.string().max(50).optional().or(z.literal('')),
  // Event details
  location: z.string().min(1, 'Location is required').max(300),
  event_date: z
    .string()
    .min(1, 'Event date is required')
    .refine(
      (val) => {
        const _bkd = new Date()
        const today = `${_bkd.getFullYear()}-${String(_bkd.getMonth() + 1).padStart(2, '0')}-${String(_bkd.getDate()).padStart(2, '0')}`
        return val >= today
      },
      { message: 'Event date must be in the future' }
    ),
  serve_time: z.string().max(20).optional().or(z.literal('')),
  guest_count: z.number().int().positive().max(500),
  occasion: z.string().min(1, 'Occasion is required').max(500),
  service_type: z.string().max(100).optional().or(z.literal('')),
  // Preferences
  budget_range: z.string().max(200).optional().or(z.literal('')),
  dietary_restrictions: z.string().max(2000).optional().or(z.literal('')),
  additional_notes: z.string().max(5000).optional().or(z.literal('')),
  seasonal_intent: PublicSeasonalMarketPulseIntentSchema.nullable().optional(),
  // Attribution (passed from URL search params)
  referral_source: z.string().max(200).optional().or(z.literal('')),
  referral_partner_id: z.string().uuid().optional().nullable().or(z.literal('')),
  utm_source: z.string().max(200).optional().or(z.literal('')),
  utm_medium: z.string().max(200).optional().or(z.literal('')),
  utm_campaign: z.string().max(200).optional().or(z.literal('')),
  // Anti-spam
  website_url: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await guardPublicIntent<Record<string, unknown>>({
      action: 'open-booking',
      request,
      body: {
        maxBytes: PUBLIC_INTAKE_JSON_BODY_MAX_BYTES,
        invalidJsonMessage: 'Invalid booking request body',
        payloadTooLargeMessage: 'Booking request body is too large',
      },
      rateLimit: {
        ip: {
          keyPrefix: 'open-booking:ip',
          max: 5,
          windowMs: 10 * 60_000,
          message: 'Too many submissions. Please try again in a few minutes.',
        },
        email: {
          keyPrefix: 'open-booking:email',
          max: 4,
          windowMs: 60 * 60_000,
          message: 'Too many submissions from this email. Please try again later.',
          getValue: (body) => body?.email,
        },
      },
      honeypot: { field: 'website_url' },
    })
    if (!guard.ok) {
      if (guard.error.code === 'honeypot') {
        return NextResponse.json({ success: true, message: 'Booking request submitted.' })
      }
      return NextResponse.json({ error: guard.error.message }, { status: guard.error.status })
    }

    const body = guard.body
    const ip = guard.metadata.ip
    const parseResult = BookingSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid form data' },
        { status: 400 }
      )
    }

    const data = parseResult.data
    const serviceType = canonicalizeBookingServiceType(data.service_type)

    // Email validation
    try {
      const check = validateEmailLocal(data.email)
      if (!check.isValid) {
        const suggestion = suggestEmailCorrection(data.email)
        return NextResponse.json(
          {
            error: check.reason || 'Invalid email address',
            emailSuggestion: suggestion || undefined,
          },
          { status: 400 }
        )
      }
    } catch {
      // Non-blocking
    }

    // Match chefs by location + service type + guest count
    const { chefs: matchedChefs, resolvedLocation } = await matchChefsForBooking({
      location: data.location,
      serviceType: serviceType || null,
      guestCount: data.guest_count,
    })

    if (!resolvedLocation) {
      return NextResponse.json(
        { error: 'We could not find that location. Try a city and state, or a ZIP code.' },
        { status: 400 }
      )
    }

    // Cap at 10 chefs to avoid spam
    const chefsToNotify = matchedChefs.slice(0, 10)
    const seasonalIntent = data.seasonal_intent
      ? {
          ...data.seasonal_intent,
          requestScope: (() => {
            const resolvedScope = resolvePublicMarketScope({
              explicitLabel: resolvedLocation.displayLabel || data.location,
              source: 'request_location',
            })
            return resolvedScope.isFallback ? undefined : resolvedScope
          })(),
        }
      : null

    const db: any = createAdminClient()
    const clientEmail = data.email.toLowerCase().trim()
    const clientName = stripHtml(data.full_name)
    const dietaryRestrictions = parseDietaryRestrictions(data.dietary_restrictions)
    const budgetCentsPerPerson = parseBudgetToCents(data.budget_range)
    const guestRange = resolveGuestCountRange(data.guest_count)
    const referralSource = data.referral_source?.trim() || data.utm_source?.trim() || 'open_booking'
    const referralPartnerId =
      data.referral_partner_id && data.referral_partner_id.trim()
        ? data.referral_partner_id.trim()
        : null

    let bookingToken: string | null = null
    let bookingId: string | null = null
    const initialBookingStatus = chefsToNotify.length === 0 ? 'no_match' : 'sent'

    const { data: booking, error: bookingErr } = await db
      .from('open_bookings')
      .insert({
        consumer_name: clientName,
        consumer_email: clientEmail,
        consumer_phone: data.phone?.trim() ? stripHtml(data.phone) : null,
        event_date: data.event_date || null,
        serve_time: data.serve_time?.trim() ? stripHtml(data.serve_time) : null,
        guest_count: data.guest_count,
        guest_count_range_label: guestRange?.label ?? null,
        guest_count_range_min: guestRange?.min ?? null,
        guest_count_range_max: guestRange?.max ?? null,
        occasion: stripHtml(data.occasion),
        service_type: serviceType || null,
        budget_range: data.budget_range?.trim() ? stripHtml(data.budget_range) : null,
        budget_cents_per_person: budgetCentsPerPerson,
        location: stripHtml(data.location),
        resolved_location: resolvedLocation.displayLabel,
        dietary_restrictions: dietaryRestrictions,
        additional_notes: data.additional_notes?.trim() ? stripHtml(data.additional_notes) : null,
        referral_source: referralSource,
        referral_partner_id: referralPartnerId,
        utm_source: data.utm_source?.trim() || null,
        utm_medium: data.utm_medium?.trim() || null,
        utm_campaign: data.utm_campaign?.trim() || null,
        status: initialBookingStatus,
        matched_chef_count: chefsToNotify.length,
        ip_address: ip,
      })
      .select('id, booking_token')
      .single()

    if (bookingErr || !booking?.id || !booking?.booking_token) {
      console.error('[open-booking] open_bookings insert failed:', bookingErr)
      return NextResponse.json(
        { error: 'We could not create a booking status link. Please try again.' },
        { status: 500 }
      )
    }

    bookingId = booking.id
    bookingToken = booking.booking_token

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

    if (chefsToNotify.length === 0) {
      // Save to waitlist so we can notify them when coverage expands
      try {
        await db.from('directory_waitlist').upsert(
          {
            email: clientEmail,
            location: resolvedLocation.displayLabel || data.location.trim(),
          },
          { onConflict: 'lower(email), lower(location)' }
        )
      } catch (waitlistErr) {
        // Duplicate or DB error - non-blocking, lead saved is best-effort
        console.error('[open-booking] Waitlist save failed (non-blocking):', waitlistErr)
      }

      try {
        const { sendBookingConfirmationEmail } = await import('@/lib/email/notifications')
        await sendBookingConfirmationEmail({
          consumerEmail: clientEmail,
          consumerName: clientName,
          occasion: stripHtml(data.occasion),
          eventDate: data.event_date || null,
          guestCount: data.guest_count,
          guestCountRangeLabel: guestRange?.label ?? null,
          location: resolvedLocation.displayLabel || stripHtml(data.location),
          matchedChefCount: 0,
          statusUrl: `${appUrl}/book/status/${bookingToken}`,
        })
      } catch (emailErr) {
        console.error('[open-booking] Client email failed (non-blocking):', emailErr)
      }

      return NextResponse.json({
        success: true,
        matched_count: 0,
        booking_token: bookingToken,
        message:
          'No chefs are currently available in your area for this request. We have saved your details and will notify you when a chef becomes available.',
        location: resolvedLocation.displayLabel,
      })
    }

    // Build the source message
    const sourceParts = [
      'Source: ChefFlow Open Booking',
      `Location: ${resolvedLocation.displayLabel || stripHtml(data.location)}`,
      data.serve_time ? `Serve time: ${stripHtml(data.serve_time)}` : null,
      data.budget_range ? `Budget: ${stripHtml(data.budget_range)}` : null,
      serviceType ? `Service type: ${serviceType}` : null,
      seasonalIntent ? buildPublicSeasonalMarketPulseSourceMessageLine(seasonalIntent) : null,
      data.dietary_restrictions?.trim()
        ? `Dietary restrictions: ${stripHtml(data.dietary_restrictions)}`
        : null,
      data.additional_notes?.trim() ? `Notes: ${stripHtml(data.additional_notes)}` : null,
    ].filter(Boolean)
    const sourceMessage = sourceParts.join('\n')

    // Create inquiry under each matched chef
    for (const chef of chefsToNotify) {
      try {
        const tenantId = chef.id

        // IL-4 fix: dedup - skip if same email already has an open-booking inquiry to this chef within 24h
        try {
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data: existingClientForDedup } = await db
            .from('clients')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('email', clientEmail)
            .single()

          if (existingClientForDedup) {
            const { count } = await db
              .from('inquiries')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', tenantId)
              .eq('client_id', existingClientForDedup.id)
              .gte('first_contact_at', cutoff)

            if ((count ?? 0) > 0) {
              console.log(`[open-booking] Dedup: skipping chef ${tenantId}, recent inquiry exists`)
              continue
            }
          }
        } catch {
          // Query error - proceed normally, don't block the booking
        }

        // Create or find client under this chef
        const { data: existingClient } = await db
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('email', clientEmail)
          .single()

        let clientId: string

        if (existingClient) {
          clientId = existingClient.id
        } else {
          const { data: newClient, error: clientErr } = await db
            .from('clients')
            .insert({
              tenant_id: tenantId,
              full_name: clientName,
              email: clientEmail,
              phone: data.phone?.trim() ? stripHtml(data.phone) : null,
              referral_source: referralSource,
              dietary_restrictions: dietaryRestrictions ?? [],
              allergies: dietaryRestrictions ?? [],
            })
            .select('id')
            .single()

          if (clientErr || !newClient) {
            console.error('[open-booking] Client creation failed for chef', tenantId, clientErr)
            continue
          }
          clientId = newClient.id

          // IL-1 fix: create structured allergy records from free-text dietary data
          if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            try {
              const { syncFlatToStructured } = await import('@/lib/dietary/allergy-sync')
              await syncFlatToStructured({ tenantId, clientId, db })
            } catch (allergyErr) {
              console.error('[open-booking] Allergy sync failed (non-blocking):', allergyErr)
            }
          }
        }

        // Create inquiry
        const { data: inquiry, error: inquiryErr } = await db
          .from('inquiries')
          .insert({
            tenant_id: tenantId,
            channel: 'website',
            client_id: clientId,
            first_contact_at: new Date().toISOString(),
            confirmed_date: data.event_date || null,
            confirmed_guest_count: data.guest_count,
            confirmed_location: stripHtml(data.location),
            confirmed_occasion: stripHtml(data.occasion),
            confirmed_budget_cents: budgetCentsPerPerson,
            budget_range: data.budget_range?.trim() ? stripHtml(data.budget_range) : null,
            confirmed_dietary_restrictions: dietaryRestrictions,
            referral_source: referralSource,
            referral_partner_id: referralPartnerId,
            source_message: sourceMessage,
            unknown_fields: withSubmissionSource(PUBLIC_INTAKE_LANE_KEYS.open_booking, {
              open_booking: true,
              open_booking_id: bookingId,
              referral_source: referralSource,
              referral_partner_id: referralPartnerId,
              service_type: serviceType || null,
              budget_range: data.budget_range?.trim() ? stripHtml(data.budget_range) : null,
              budget_cents_per_person: budgetCentsPerPerson,
              guest_count_range_label: guestRange?.label ?? null,
              guest_count_range_min: guestRange?.min ?? null,
              guest_count_range_max: guestRange?.max ?? null,
              serve_time: data.serve_time?.trim() ? stripHtml(data.serve_time) : null,
              additional_notes: data.additional_notes?.trim()
                ? stripHtml(data.additional_notes)
                : null,
              seasonal_market_intent: seasonalIntent,
              matched_location: resolvedLocation.displayLabel,
              distance_miles: chef.distance_miles,
              referrer_ip: ip,
            }),
            status: 'new',
            utm_source: data.utm_source?.trim() || 'chefflow_booking',
            utm_medium: data.utm_medium?.trim() || 'open_booking',
            utm_campaign: data.utm_campaign?.trim() || null,
          })
          .select('id')
          .single()

        if (inquiryErr || !inquiry) {
          console.error('[open-booking] Inquiry creation failed for chef', tenantId, inquiryErr)
          continue
        }
        // Link inquiry to parent booking record
        if (bookingId) {
          try {
            await db.from('open_booking_inquiries').insert({
              booking_id: bookingId,
              inquiry_id: inquiry.id,
              chef_id: tenantId,
              chef_name: chef.display_name || null,
            })
          } catch (linkErr) {
            console.error('[open-booking] Booking-inquiry link failed (non-blocking):', linkErr)
          }
        }

        // Inquiry-first lane: event creation happens after commercial commitment.

        // Send chef notification email (non-blocking)
        try {
          const { sendNewInquiryChefEmail } = await import('@/lib/email/notifications')
          const { data: chefRecord } = await db
            .from('chefs')
            .select('email')
            .eq('id', tenantId)
            .single()
          const chefEmail = chefRecord?.email
          if (chefEmail) {
            await sendNewInquiryChefEmail({
              chefEmail,
              chefName: chef.display_name,
              clientName,
              occasion: stripHtml(data.occasion),
              eventDate: data.event_date || null,
              guestCount: data.guest_count,
              source: 'portal',
              inquiryId: inquiry.id,
            })
          }
        } catch (emailErr) {
          console.error('[open-booking] Chef notification email failed (non-blocking):', emailErr)
        }

        // IL-2 fix: in-app notification via pipeline (enables push + SSE)
        try {
          const { getChefAuthUserId, createNotification } =
            await import('@/lib/notifications/actions')
          const chefUserId = await getChefAuthUserId(tenantId)
          if (chefUserId) {
            await createNotification({
              tenantId,
              recipientId: chefUserId,
              category: 'inquiry',
              action: 'new_inquiry',
              title: `New inquiry from ${clientName}`,
              body: `${clientName} is interested in booking ${data.event_date || 'date TBD'}`,
              inquiryId: inquiry.id,
              clientId,
            })
          }
        } catch (notifErr) {
          console.error('[open-booking] In-app notification failed (non-blocking):', notifErr)
        }

        // IL-2 fix: automation engine + Remy AI scoring (non-blocking)
        try {
          const { evaluateAutomations } = await import('@/lib/automations/engine')
          await evaluateAutomations(tenantId, 'inquiry_created', {
            entityId: inquiry.id,
            entityType: 'inquiry',
            fields: {
              channel: 'website',
              client_name: clientName,
              occasion: stripHtml(data.occasion),
              guest_count: data.guest_count,
            },
          })
        } catch (autoErr) {
          console.error('[open-booking] Automation evaluation failed (non-blocking):', autoErr)
        }

        try {
          const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
          await onInquiryCreated(tenantId, inquiry.id, clientId, {
            channel: 'website',
            clientName,
            occasion: stripHtml(data.occasion),
            guestCount: data.guest_count,
          })
        } catch (remyErr) {
          console.error('[open-booking] Remy reactive failed (non-blocking):', remyErr)
        }

        // IL-2 fix: chef auto-response (non-blocking)
        try {
          const { triggerAutoResponse } = await import('@/lib/communication/auto-response')
          await triggerAutoResponse(inquiry.id, tenantId)
        } catch (arErr) {
          console.error('[open-booking] Auto-response failed (non-blocking):', arErr)
        }
      } catch (chefErr) {
        console.error('[open-booking] Error processing chef', chef.id, chefErr)
      }
    }

    // Send client confirmation email (non-blocking)
    try {
      const { sendBookingConfirmationEmail } = await import('@/lib/email/notifications')
      await sendBookingConfirmationEmail({
        consumerEmail: clientEmail,
        consumerName: clientName,
        occasion: stripHtml(data.occasion),
        eventDate: data.event_date || null,
        guestCount: data.guest_count,
        guestCountRangeLabel: guestRange?.label ?? null,
        location: resolvedLocation.displayLabel || stripHtml(data.location),
        matchedChefCount: chefsToNotify.length,
        statusUrl: `${appUrl}/book/status/${bookingToken}`,
      })
    } catch (emailErr) {
      console.error('[open-booking] Client email failed (non-blocking):', emailErr)
    }

    return NextResponse.json({
      success: true,
      matched_count: chefsToNotify.length,
      location: resolvedLocation.displayLabel,
      booking_token: bookingToken,
      message: `Your request has been sent to ${chefsToNotify.length} chef${chefsToNotify.length !== 1 ? 's' : ''} near ${resolvedLocation.displayLabel}. They will reach out to you directly.`,
    })
  } catch (err) {
    console.error('[open-booking] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
