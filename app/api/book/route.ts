// Public API endpoint for open booking submissions (no specific chef selected).
// Client describes their event, we match them to nearby chefs and create
// inquiries in each matched chef's inbox.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/admin'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { checkRateLimit } from '@/lib/rateLimit'
import { matchChefsForBooking } from '@/lib/booking/match-chefs'
import { resolveOwnerChefId } from '@/lib/platform/owner-account'

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
  // Anti-spam
  website_url: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const host = request.headers.get('host') || undefined

  // Rate limit: 5 open bookings per 10 minutes per IP
  try {
    await checkRateLimit(`open-booking:${ip}`, 5, 10 * 60_000)
  } catch {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a few minutes.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const parseResult = BookingSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid form data' },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // Honeypot
    if (data.website_url && data.website_url.length > 0) {
      return NextResponse.json({ success: true, message: 'Booking request submitted.' })
    }

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
      serviceType: data.service_type || null,
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

    // Founder first-dibs: always include the founder if they're within radius
    // but were excluded by the 10-chef cap. Founder slot doesn't count against cap.
    try {
      const founderChefId = await resolveOwnerChefId(createAdminClient())
      if (founderChefId && !chefsToNotify.some((c) => c.id === founderChefId)) {
        // Check if founder was in the full matched list (within radius)
        const founderMatch = matchedChefs.find((c) => c.id === founderChefId)
        if (founderMatch) {
          chefsToNotify.push(founderMatch)
        }
      }
    } catch (founderErr) {
      console.error('[open-booking] Founder first-dibs check failed (non-blocking):', founderErr)
    }

    if (chefsToNotify.length === 0) {
      // Save to waitlist so we can notify them when coverage expands
      try {
        const waitlistDb: any = createAdminClient()
        await waitlistDb.from('directory_waitlist').upsert(
          {
            email: data.email.toLowerCase().trim(),
            location: resolvedLocation.displayLabel || data.location.trim(),
          },
          { onConflict: 'lower(email), lower(location)' }
        )
      } catch (waitlistErr) {
        // Duplicate or DB error - non-blocking, lead saved is best-effort
        console.error('[open-booking] Waitlist save failed (non-blocking):', waitlistErr)
      }

      return NextResponse.json({
        success: true,
        matched_count: 0,
        message:
          'No chefs are currently available in your area for this request. We have saved your details and will notify you when a chef becomes available.',
        location: resolvedLocation.displayLabel,
      })
    }

    const db: any = createAdminClient()
    const clientEmail = data.email.toLowerCase().trim()
    const clientName = stripHtml(data.full_name)
    const dietaryRestrictions = parseDietaryRestrictions(data.dietary_restrictions)
    const inquiryIds: string[] = []
    let firstCircleToken: string | null = null

    // Build the source message
    const sourceParts = [
      'Source: ChefFlow Open Booking',
      `Location: ${stripHtml(data.location)}`,
      data.serve_time ? `Serve time: ${stripHtml(data.serve_time)}` : null,
      data.budget_range ? `Budget: ${stripHtml(data.budget_range)}` : null,
      data.service_type ? `Service type: ${stripHtml(data.service_type)}` : null,
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
              referral_source: 'website',
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
            confirmed_dietary_restrictions: dietaryRestrictions,
            source_message: sourceMessage,
            unknown_fields: {
              open_booking: true,
              service_type: data.service_type?.trim() ? stripHtml(data.service_type) : null,
              budget_range: data.budget_range?.trim() ? stripHtml(data.budget_range) : null,
              serve_time: data.serve_time?.trim() ? stripHtml(data.serve_time) : null,
              additional_notes: data.additional_notes?.trim()
                ? stripHtml(data.additional_notes)
                : null,
              matched_location: resolvedLocation.displayLabel,
              distance_miles: chef.distance_miles,
              referrer_ip: ip,
            },
            status: 'new',
            utm_source: 'chefflow_booking',
            utm_medium: 'open_booking',
          })
          .select('id')
          .single()

        if (inquiryErr || !inquiry) {
          console.error('[open-booking] Inquiry creation failed for chef', tenantId, inquiryErr)
          continue
        }
        inquiryIds.push(inquiry.id)

        // Create draft event (non-blocking)
        try {
          const { data: event } = await db
            .from('events')
            .insert({
              tenant_id: tenantId,
              client_id: clientId,
              inquiry_id: inquiry.id,
              event_date: data.event_date,
              serve_time: data.serve_time?.trim() ? stripHtml(data.serve_time) : null,
              guest_count: data.guest_count,
              location_address: stripHtml(data.location),
              location_city: resolvedLocation.city || 'TBD',
              location_zip: resolvedLocation.zip || 'TBD',
              occasion: stripHtml(data.occasion),
              special_requests: sourceMessage || null,
              dietary_restrictions: dietaryRestrictions ?? [],
              allergies: dietaryRestrictions ?? [],
            })
            .select('id')
            .single()

          if (event) {
            await db.from('event_state_transitions').insert({
              tenant_id: tenantId,
              event_id: event.id,
              from_status: null,
              to_status: 'draft',
              metadata: { action: 'auto_created_from_open_booking', inquiry_id: inquiry.id },
            })
            await db
              .from('inquiries')
              .update({ converted_to_event_id: event.id })
              .eq('id', inquiry.id)
          }
        } catch (eventErr) {
          console.error('[open-booking] Event creation failed (non-blocking):', eventErr)
        }

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

        // Create Dinner Circle for communication (parity with submitPublicInquiry)
        try {
          const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
          const circle = await createInquiryCircle({
            inquiryId: inquiry.id,
            clientName,
            clientEmail,
            occasion: stripHtml(data.occasion),
          })
          if (!firstCircleToken && circle?.groupToken) {
            firstCircleToken = circle.groupToken
          }
        } catch (circleErr) {
          console.error('[open-booking] Dinner Circle creation failed (non-blocking):', circleErr)
        }
      } catch (chefErr) {
        console.error('[open-booking] Error processing chef', chef.id, chefErr)
      }
    }

    // Send client confirmation email (non-blocking)
    try {
      const { sendInquiryReceivedEmail } = await import('@/lib/email/notifications')
      const circleUrl = firstCircleToken
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'}/hub/g/${firstCircleToken}`
        : undefined
      await sendInquiryReceivedEmail({
        clientEmail,
        clientName,
        chefName: 'ChefFlow',
        occasion: stripHtml(data.occasion),
        eventDate: data.event_date || null,
        guestCount: data.guest_count ?? null,
        location: data.location?.trim() ? stripHtml(data.location) : null,
        circleUrl,
      })
    } catch (emailErr) {
      console.error('[open-booking] Client email failed (non-blocking):', emailErr)
    }

    return NextResponse.json({
      success: true,
      matched_count: chefsToNotify.length,
      location: resolvedLocation.displayLabel,
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
