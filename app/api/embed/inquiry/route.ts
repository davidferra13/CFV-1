// Public API endpoint for embeddable inquiry widget submissions
// CORS-enabled — accepts POST from any external website
// Rate-limited by IP to prevent spam
// Creates: client + inquiry + draft event in one shot

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { checkRateLimit } from '@/lib/rateLimit'
import { recordInquiryStateTransition } from '@/lib/inquiries/transition-log'

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
  budget_range: z
    .enum(['under_500', '500_1500', '1500_3000', '3000_5000', 'over_5000', 'not_sure'])
    .optional(),
  allergy_flag: z.enum(['none', 'yes', 'unknown']).optional(),
  allergies_food_restrictions: z.string().max(2000).optional().or(z.literal('')),
  favorite_ingredients_dislikes: z.string().max(2000).optional().or(z.literal('')),
  additional_notes: z.string().max(5000).optional().or(z.literal('')),
  // Honeypot — must be empty (bots fill this in)
  website_url: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
  // UTM source attribution
  utm_source: z.string().max(200).optional().or(z.literal('')),
  utm_medium: z.string().max(200).optional().or(z.literal('')),
  utm_campaign: z.string().max(200).optional().or(z.literal('')),
  // Cloudflare Turnstile CAPTCHA token (optional — graceful bypass when not configured)
  turnstile_token: z.string().max(4096).optional().or(z.literal('')),
})

// ── CORS preflight ──
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// ── Main submission handler ──
export async function POST(request: NextRequest) {
  // Rate limit by IP: 10 submissions per 5 minutes (uses Upstash Redis when configured)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`embed-inquiry:${ip}`, 10, 5 * 60_000)
  } catch {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: corsHeaders }
    )
  }

  try {
    const body = await request.json()

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

    // Honeypot check — bots fill hidden fields
    if (data.website_url && data.website_url.length > 0) {
      // Silently accept but don't create anything (don't reveal bot detection)
      return NextResponse.json(
        { success: true, message: 'Inquiry submitted successfully.' },
        { status: 200, headers: corsHeaders }
      )
    }

    // Cloudflare Turnstile CAPTCHA verification
    // Non-blocking if TURNSTILE_SECRET_KEY is not set (graceful bypass for dev/testing)
    // Returns 403 only if Turnstile IS configured and the token is definitively invalid
    const turnstileResult = await verifyTurnstileToken(data.turnstile_token || '', ip)
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || 'CAPTCHA verification failed' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Email validation (local-only — no external API call during form submission)
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
      // Non-blocking — if the validator itself fails, let the inquiry through
      console.error('[embed-inquiry] Email validation failed (non-blocking):', err)
    }

    const supabase: any = createAdminClient()

    // 1. Verify chef exists
    const { data: chef, error: chefError } = await supabase
      .from('chefs')
      .select('id, business_name')
      .eq('id', data.chef_id)
      .single()

    if (chefError || !chef) {
      return NextResponse.json({ error: 'Chef not found' }, { status: 404, headers: corsHeaders })
    }

    const tenantId = chef.id as string
    const chefName = (chef.business_name as string | null) || 'Your Chef'

    // Store contact info on the inquiry (no auto-client creation).
    // Chef can convert to a full client record later from the inquiry detail page.
    const clientEmail = data.email.toLowerCase().trim()
    const clientName = data.full_name.trim()
    const clientPhone = data.phone?.trim() || null

    // 3. Build source message from optional fields
    const sourceParts = [
      `Source: Embedded widget`,
      `Serving Time: ${data.serve_time.trim()}`,
      data.address?.trim() ? `Address: ${data.address.trim()}` : null,
      data.budget_cents != null
        ? `Exact Budget: $${(data.budget_cents / 100).toFixed(2)}`
        : data.budget_range
          ? `Budget Range: ${data.budget_range}`
          : null,
      data.favorite_ingredients_dislikes?.trim()
        ? `Favorites/Dislikes: ${data.favorite_ingredients_dislikes.trim()}`
        : null,
      data.allergies_food_restrictions?.trim()
        ? `Allergies/Restrictions: ${data.allergies_food_restrictions.trim()}`
        : null,
      data.additional_notes?.trim() ? `Additional Notes: ${data.additional_notes.trim()}` : null,
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

    // Parse dietary restrictions
    const allergiesList = data.allergies_food_restrictions
      ? data.allergies_food_restrictions
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean)
      : null

    // 4. Create inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'website',
        client_id: null,
        contact_name: clientName,
        contact_email: clientEmail,
        contact_phone: clientPhone,
        first_contact_at: new Date().toISOString(),
        confirmed_date: data.event_date || null,
        confirmed_guest_count: data.guest_count,
        confirmed_location: data.address?.trim() || null,
        confirmed_occasion: data.occasion.trim(),
        confirmed_budget_cents: budgetCents,
        confirmed_service_expectations: `Serve time ${data.serve_time.trim()}. Chef will arrive 2hr prior.`,
        confirmed_dietary_restrictions: allergiesList,
        source_message: sourceMessage,
        unknown_fields: {
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
        },
        status: 'new',
        utm_source: data.utm_source?.trim() || null,
        utm_medium: data.utm_medium?.trim() || null,
        utm_campaign: data.utm_campaign?.trim() || null,
      })
      .select('id')
      .single()

    if (inquiryError) {
      console.error('[embed-inquiry] Inquiry creation error:', inquiryError)
      return NextResponse.json(
        { error: 'Failed to create inquiry' },
        { status: 500, headers: corsHeaders }
      )
    }

    try {
      await recordInquiryStateTransition({
        supabase,
        tenantId,
        inquiryId: inquiry.id,
        fromStatus: null,
        toStatus: 'new',
        transitionedBy: null,
        reason: 'embed_inquiry_submitted',
        metadata: {
          source: 'embed_widget',
          utm_source: data.utm_source?.trim() || null,
          utm_medium: data.utm_medium?.trim() || null,
          utm_campaign: data.utm_campaign?.trim() || null,
        },
      })
    } catch (transitionErr) {
      console.error(
        '[embed-inquiry] Initial inquiry transition insert failed (non-blocking):',
        transitionErr
      )
    }

    // 5. Create draft event (non-blocking — if it fails, inquiry is still saved)
    try {
      const { data: event } = await supabase
        .from('events')
        .insert({
          tenant_id: tenantId,
          client_id: null,
          inquiry_id: inquiry.id,
          event_date: data.event_date,
          serve_time: data.serve_time.trim(),
          guest_count: data.guest_count,
          location_address: data.address?.trim() || 'TBD',
          location_city: 'TBD',
          location_zip: 'TBD',
          occasion: data.occasion.trim(),
          quoted_price_cents: budgetCents,
          special_requests: sourceMessage || null,
        })
        .select('id')
        .single()

      if (event) {
        // Log state transition (null → draft)
        await supabase.from('event_state_transitions').insert({
          tenant_id: tenantId,
          event_id: event.id,
          from_status: null,
          to_status: 'draft',
          metadata: { action: 'auto_created_from_embed_widget', inquiry_id: inquiry.id },
        })

        // Link inquiry to event
        await supabase
          .from('inquiries')
          .update({ converted_to_event_id: event.id })
          .eq('id', inquiry.id)
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
        tenantId,
        clientName,
        clientEmail,
        occasion: data.occasion.trim(),
      })
      circleGroupToken = circle.groupToken

      // Post chef's first response in the circle
      await postFirstCircleMessage({
        groupId: circle.groupId,
        inquiryId: inquiry.id,
        tenantId,
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
      await onInquiryCreated(tenantId, inquiry.id, null, {
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
