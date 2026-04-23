// Public API endpoint for embeddable inquiry widget submissions
// CORS-enabled - accepts POST from any external website
// Rate-limited by IP to prevent spam
// Creates: client + inquiry + draft event in one shot

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { z } from 'zod'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { PUBLIC_INTAKE_JSON_BODY_MAX_BYTES } from '@/lib/api/request-body'
import { guardPublicIntent } from '@/lib/security/public-intent-guard'
import { PUBLIC_INTAKE_LANE_KEYS, withSubmissionSource } from '@/lib/public/intake-lane-config'

// ── CORS headers for cross-origin embeds ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

// ── Validation schema (matches the embed form fields) ──
const EmbedInquirySchema = z.object({
  chef_id: z.string().uuid('Invalid chef ID'),
  // Required
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required').max(320),
  event_date: z.string().min(1, 'Event date is required'),
  serve_time: z.string().min(1, 'Serve time is required'),
  guest_count: z.number().int().positive().max(500),
  occasion: z.string().min(1, 'Occasion is required').max(500),
  // Optional
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  budget_cents: z.number().int().nonnegative().nullable().optional(),
  budget_range: z.string().max(200).optional().or(z.literal('')),
  allergy_flag: z.enum(['none', 'yes', 'unknown']).optional(),
  allergies_food_restrictions: z.string().max(2000).optional().or(z.literal('')),
  favorite_ingredients_dislikes: z.string().max(2000).optional().or(z.literal('')),
  additional_notes: z.string().max(5000).optional().or(z.literal('')),
  // Honeypot - must be empty (bots fill this in)
  website_url: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
  // UTM source attribution
  utm_source: z.string().max(200).optional().or(z.literal('')),
  utm_medium: z.string().max(200).optional().or(z.literal('')),
  utm_campaign: z.string().max(200).optional().or(z.literal('')),
  // Consent record (GDPR Article 9 - health/allergy data)
  consent_at: z.string().datetime().optional(),
  consent_version: z.string().max(50).optional(),
})

// ── CORS preflight ──
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// ── Main submission handler ──
export async function POST(request: NextRequest) {
  try {
    const guard = await guardPublicIntent<Record<string, unknown>>({
      action: 'embed-inquiry',
      request,
      body: {
        maxBytes: PUBLIC_INTAKE_JSON_BODY_MAX_BYTES,
        invalidJsonMessage: 'Invalid inquiry request body',
        payloadTooLargeMessage: 'Inquiry request body is too large',
      },
      rateLimit: {
        ip: {
          keyPrefix: 'embed-inquiry:ip',
          max: 10,
          windowMs: 5 * 60_000,
          message: 'Too many submissions. Please try again later.',
        },
        email: {
          keyPrefix: 'embed-inquiry:email',
          max: 3,
          windowMs: 60 * 60_000,
          message: 'Too many submissions from this email. Please try again later.',
          getValue: (body) => body?.email,
        },
      },
      honeypot: { field: 'website_url' },
    })
    if (!guard.ok) {
      if (guard.error.code === 'honeypot') {
        return NextResponse.json(
          { success: true, message: 'Inquiry submitted successfully.' },
          { status: 200, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: guard.error.message },
        { status: guard.error.status, headers: corsHeaders }
      )
    }

    const body = guard.body
    const ip = guard.metadata.ip

    // Validate input
    const parseResult = EmbedInquirySchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid form data' },
        { status: 400, headers: corsHeaders }
      )
    }

    const data = parseResult.data

    // Strip HTML tags from all free-text fields to prevent stored XSS.
    // These fields come from unauthenticated external users and are stored in
    // the database, so they must be sanitized before any DB insertion.
    const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim()

    // Email validation (local-only - no external API call during form submission)
    try {
      const emailCheck = validateEmailLocal(data.email)
      if (!emailCheck.isValid) {
        const suggestion = suggestEmailCorrection(data.email)
        return NextResponse.json(
          {
            error: emailCheck.reason || 'Invalid email address',
            emailSuggestion: suggestion || undefined,
          },
          { status: 400, headers: corsHeaders }
        )
      }
    } catch (err) {
      // Non-blocking - if the validator itself fails, let the inquiry through
      console.error('[embed-inquiry] Email validation failed (non-blocking):', err)
    }

    const db: any = createAdminClient()

    // 1. Verify chef exists and is accepting inquiries
    const { data: chef, error: chefError } = await db
      .from('chefs')
      .select('id, business_name, email, account_status, deletion_scheduled_for')
      .eq('id', data.chef_id)
      .single()

    if (chefError || !chef) {
      return NextResponse.json({ error: 'Chef not found' }, { status: 404, headers: corsHeaders })
    }

    // Reject inquiries for suspended or pending-deletion accounts
    if (
      (chef as any).account_status === 'suspended' ||
      (chef as any).deletion_scheduled_for != null
    ) {
      return NextResponse.json(
        { error: 'This chef is not currently accepting inquiries' },
        { status: 404, headers: corsHeaders }
      )
    }

    const tenantId = chef.id as string
    const chefName = (chef.business_name as string | null) || 'Your Chef'

    // Parse dietary restrictions early (needed for client + event + inquiry)
    const allergiesList = data.allergies_food_restrictions
      ? data.allergies_food_restrictions
          .split(/[\n,]/)
          .map((item: string) => stripHtml(item))
          .filter(Boolean)
      : null

    // 2. Create or find existing client (idempotent by email)
    const clientEmail = data.email.toLowerCase().trim()
    const clientName = stripHtml(data.full_name)

    // Check for existing client under this chef
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
      const { data: newClient, error: clientCreateError } = await db
        .from('clients')
        .insert({
          chef_id: tenantId,
          full_name: clientName,
          email: clientEmail,
          phone: data.phone ? stripHtml(data.phone) : null,
          referral_source: 'website',
          address: data.address ? stripHtml(data.address) : null,
          dietary_restrictions: allergiesList ?? [],
          allergies: allergiesList ?? [],
        })
        .select('id')
        .single()

      if (clientCreateError || !newClient) {
        console.error('[embed-inquiry] Client creation error:', clientCreateError)
        return NextResponse.json(
          { error: 'Failed to process inquiry' },
          { status: 500, headers: corsHeaders }
        )
      }
      clientId = newClient.id
    }

    // 3. Build source message from optional fields
    const sourceParts = [
      `Source: Embedded widget`,
      `Serving Time: ${stripHtml(data.serve_time)}`,
      data.address?.trim() ? `Address: ${stripHtml(data.address)}` : null,
      data.budget_cents != null
        ? `Exact Budget: $${(data.budget_cents / 100).toFixed(2)}`
        : data.budget_range
          ? `Budget Range: ${stripHtml(data.budget_range)}`
          : null,
      data.favorite_ingredients_dislikes?.trim()
        ? `Favorites/Dislikes: ${stripHtml(data.favorite_ingredients_dislikes)}`
        : null,
      data.allergies_food_restrictions?.trim()
        ? `Allergies/Restrictions: ${data.allergies_food_restrictions.trim()}`
        : null,
      data.additional_notes?.trim()
        ? `Additional Notes: ${stripHtml(data.additional_notes)}`
        : null,
    ].filter(Boolean)
    const sourceMessage = sourceParts.join('\n')

    // Only persist exact cents when explicitly provided.
    const budgetCents = data.budget_cents ?? null
    const budgetMode: 'exact' | 'range' | 'not_sure' | 'unset' =
      budgetCents != null
        ? 'exact'
        : data.budget_range === 'not_sure'
          ? 'not_sure'
          : data.budget_range
            ? 'range'
            : 'unset'
    const budgetRange = data.budget_range ?? null
    const budgetKnown = budgetMode === 'exact' || budgetMode === 'range'

    // allergiesList already parsed above (before client creation)

    // 3b. Dedup: same client + chef + date within 24h = duplicate
    const dedup24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existingInquiry } = await db
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .eq('confirmed_date', data.event_date || null)
      .gte('created_at', dedup24h)
      .limit(1)
      .single()

    if (existingInquiry) {
      // Return success to avoid confusing the user - inquiry already exists
      return NextResponse.json(
        {
          success: true,
          message: 'Inquiry submitted successfully.',
          inquiry_id: existingInquiry.id,
        },
        { status: 200, headers: corsHeaders }
      )
    }

    // 4. Create inquiry
    const { data: inquiry, error: inquiryError } = await db
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'website',
        client_id: clientId,
        first_contact_at: new Date().toISOString(),
        confirmed_date: data.event_date || null,
        confirmed_guest_count: data.guest_count,
        confirmed_location: data.address ? stripHtml(data.address) : null,
        confirmed_occasion: stripHtml(data.occasion),
        confirmed_budget_cents: budgetCents,
        confirmed_service_expectations: `Serve time ${data.serve_time.trim()}. Chef will arrive 2hr prior.`,
        confirmed_dietary_restrictions: allergiesList,
        source_message: sourceMessage,
        unknown_fields: withSubmissionSource(PUBLIC_INTAKE_LANE_KEYS.embed_inquiry, {
          embed_source: true,
          address: data.address?.trim() || null,
          serve_time: data.serve_time.trim(),
          allergy_flag: data.allergy_flag ?? null,
          budget_mode: budgetMode,
          budget_range: data.budget_range ?? null,
          budget_exact_cents: budgetCents,
          favorite_ingredients_dislikes: data.favorite_ingredients_dislikes?.trim() || null,
          allergies_food_restrictions: data.allergies_food_restrictions?.trim() || null,
          additional_notes: data.additional_notes?.trim() || null,
          referrer_ip: ip,
        }),
        status: 'new',
        utm_source: data.utm_source?.trim() || null,
        utm_medium: data.utm_medium?.trim() || null,
        utm_campaign: data.utm_campaign?.trim() || null,
        consent_at: data.consent_at ?? null,
        consent_version: data.consent_version ?? null,
      })
      .select('id')
      .single()

    if (inquiryError) {
      console.error('[embed-inquiry] Inquiry creation error:', inquiryError)
      // Compensating cleanup: if we just created this client, remove the orphan
      if (!existingClient) {
        try {
          await db.from('clients').delete().eq('id', clientId).eq('tenant_id', tenantId)
        } catch (cleanupErr) {
          console.error('[embed-inquiry] Client cleanup failed (orphan may remain):', cleanupErr)
        }
      }
      return NextResponse.json(
        { error: 'Failed to create inquiry' },
        { status: 500, headers: corsHeaders }
      )
    }

    // 5. Create draft event (non-blocking - if it fails, inquiry is still saved)
    try {
      const { data: event } = await db
        .from('events')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          inquiry_id: inquiry.id,
          event_date: data.event_date,
          serve_time: stripHtml(data.serve_time),
          guest_count: data.guest_count,
          location_address: data.address ? stripHtml(data.address) : 'TBD',
          location_city: 'TBD',
          location_zip: 'TBD',
          occasion: stripHtml(data.occasion),
          quoted_price_cents: budgetCents,
          special_requests: sourceMessage || null,
          dietary_restrictions: allergiesList ?? [],
          allergies: allergiesList ?? [],
        })
        .select('id')
        .single()

      if (event) {
        // Log state transition (null → draft)
        await db.from('event_state_transitions').insert({
          tenant_id: tenantId,
          event_id: event.id,
          from_status: null,
          to_status: 'draft',
          metadata: { action: 'auto_created_from_embed_widget', inquiry_id: inquiry.id },
        })

        // Link inquiry to event
        await db.from('inquiries').update({ converted_to_event_id: event.id }).eq('id', inquiry.id)
      }
    } catch (eventErr) {
      console.error('[embed-inquiry] Event creation failed (non-blocking):', eventErr)
    }

    // 5b. Auto-create Dinner Circle (non-blocking)
    let circleGroupToken: string | null = null
    try {
      const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
      const { postFirstCircleMessage } = await import('@/lib/hub/inquiry-circle-first-message')
      const circle = await createInquiryCircle({
        inquiryId: inquiry.id,
        clientName,
        clientEmail,
        occasion: data.occasion.trim(),
      })
      circleGroupToken = circle.groupToken

      // Post chef's first response in the circle
      await postFirstCircleMessage({
        groupId: circle.groupId,
        inquiryId: inquiry.id,
      })
    } catch (circleErr) {
      console.error('[embed-inquiry] Circle creation failed (non-blocking):', circleErr)
    }

    // 6. Send acknowledgment email (non-blocking)
    try {
      const { sendInquiryReceivedEmail } = await import('@/lib/email/notifications')
      await sendInquiryReceivedEmail({
        clientEmail,
        clientName,
        chefName,
        occasion: data.occasion.trim(),
        eventDate: data.event_date || null,
        circleUrl: circleGroupToken
          ? `https://app.cheflowhq.com/hub/g/${circleGroupToken}`
          : undefined,
      })
    } catch (emailErr) {
      console.error('[embed-inquiry] Acknowledgment email failed (non-blocking):', emailErr)
    }

    // 6b. Notify chef about new inquiry (non-blocking)
    try {
      const chefEmail = (chef as any).email as string | null
      if (chefEmail) {
        const { sendNewInquiryChefEmail } = await import('@/lib/email/notifications')
        await sendNewInquiryChefEmail({
          chefEmail,
          chefName,
          clientName,
          occasion: data.occasion?.trim() || null,
          eventDate: data.event_date || null,
          guestCount: data.guest_count ?? null,
          source: 'website',
          inquiryId: inquiry.id,
        })
      }
    } catch (chefEmailErr) {
      console.error('[embed-inquiry] Chef notification email failed (non-blocking):', chefEmailErr)
    }

    // 7. Fire automations (non-blocking)
    try {
      const { evaluateAutomations } = await import('@/lib/automations/engine')
      await evaluateAutomations(tenantId, 'inquiry_created', {
        entityId: inquiry.id,
        entityType: 'inquiry',
        fields: {
          channel: 'website',
          client_name: clientName,
          occasion: data.occasion || null,
          guest_count: data.guest_count ?? null,
          budget_mode: budgetMode,
          budget_known: budgetKnown,
          budget_range: budgetRange,
          budget_cents: budgetCents,
        },
      })
    } catch (automationErr) {
      console.error('[embed-inquiry] Automation evaluation failed (non-blocking):', automationErr)
    }

    // 8. Enqueue Remy AI lead scoring (non-blocking)
    try {
      const { onInquiryCreated } = await import('@/lib/ai/reactive/hooks')
      await onInquiryCreated(tenantId, inquiry.id, clientId, {
        channel: 'website',
        clientName,
        occasion: data.occasion ?? undefined,
        budgetCents: budgetCents ?? undefined,
        budgetMode,
        budgetRange: budgetRange ?? undefined,
        guestCount: data.guest_count ?? undefined,
      })
    } catch (aiErr) {
      console.error('[embed-inquiry] Remy reactive enqueue failed (non-blocking):', aiErr)
    }

    return NextResponse.json(
      { success: true, message: 'Inquiry submitted successfully.' },
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error('[embed-inquiry] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
