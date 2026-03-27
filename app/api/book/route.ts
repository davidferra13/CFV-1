// Public API endpoint for open booking submissions (no specific chef selected).
// Client describes their event, we match them to nearby chefs and create
// inquiries in each matched chef's inbox.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/admin'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { checkRateLimit } from '@/lib/rateLimit'
import { matchChefsForBooking } from '@/lib/booking/match-chefs'

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
        const today = new Date().toISOString().split('T')[0]
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
  turnstile_token: z.string().max(4096).optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

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

    // Turnstile CAPTCHA (non-blocking if not configured)
    try {
      const { verifyTurnstileToken } = await import('@/lib/security/turnstile')
      const result = await verifyTurnstileToken(data.turnstile_token || '', ip)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'CAPTCHA verification failed' },
          { status: 403 }
        )
      }
    } catch {
      // Non-blocking
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

    if (chefsToNotify.length === 0) {
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
    const clientName = data.full_name.trim()
    const inquiryIds: string[] = []

    // Build the source message
    const sourceParts = [
      'Source: ChefFlow Open Booking',
      `Location: ${data.location}`,
      data.serve_time ? `Serve time: ${data.serve_time}` : null,
      data.budget_range ? `Budget: ${data.budget_range}` : null,
      data.service_type ? `Service type: ${data.service_type}` : null,
      data.dietary_restrictions?.trim()
        ? `Dietary restrictions: ${data.dietary_restrictions.trim()}`
        : null,
      data.additional_notes?.trim() ? `Notes: ${data.additional_notes.trim()}` : null,
    ].filter(Boolean)
    const sourceMessage = sourceParts.join('\n')

    // Create inquiry under each matched chef
    for (const chef of chefsToNotify) {
      try {
        const tenantId = chef.id

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
              phone: data.phone?.trim() || null,
              referral_source: 'website',
            })
            .select('id')
            .single()

          if (clientErr || !newClient) {
            console.error('[open-booking] Client creation failed for chef', tenantId, clientErr)
            continue
          }
          clientId = newClient.id
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
            confirmed_location: data.location.trim(),
            confirmed_occasion: data.occasion.trim(),
            confirmed_dietary_restrictions: data.dietary_restrictions
              ? data.dietary_restrictions
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : null,
            source_message: sourceMessage,
            unknown_fields: {
              open_booking: true,
              service_type: data.service_type || null,
              budget_range: data.budget_range || null,
              serve_time: data.serve_time || null,
              additional_notes: data.additional_notes?.trim() || null,
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
              serve_time: data.serve_time?.trim() || null,
              guest_count: data.guest_count,
              location_address: data.location.trim(),
              location_city: resolvedLocation.city || 'TBD',
              location_zip: resolvedLocation.zip || 'TBD',
              occasion: data.occasion.trim(),
              special_requests: sourceMessage || null,
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
          // Look up the chef's email from their auth record
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
              occasion: data.occasion.trim(),
              eventDate: data.event_date || null,
              guestCount: data.guest_count,
              source: 'portal',
              inquiryId: inquiry.id,
            })
          }
        } catch (emailErr) {
          console.error('[open-booking] Chef notification email failed (non-blocking):', emailErr)
        }
      } catch (chefErr) {
        console.error('[open-booking] Error processing chef', chef.id, chefErr)
      }
    }

    // Send client confirmation email (non-blocking)
    try {
      const { sendInquiryReceivedEmail } = await import('@/lib/email/notifications')
      await sendInquiryReceivedEmail({
        clientEmail,
        clientName,
        chefName: 'ChefFlow',
        occasion: data.occasion.trim(),
        eventDate: data.event_date || null,
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
