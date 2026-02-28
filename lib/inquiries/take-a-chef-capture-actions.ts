// @ts-nocheck — insert objects have dynamic parsed fields; strict typing not enforced here
'use server'

// Take a Chef Manual Capture Server Action
// Structured form capture — no AI required.
// Chef fills out the booking details directly from their TakeaChef notification.
// Pattern follows: lib/inquiries/public-actions.ts (submitPublicInquiry)

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createClientFromLead } from '@/lib/clients/actions'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Schema ────────────────────────────────────────────────────────────────

const TakeAChefCaptureSchema = z.object({
  // Client info
  full_name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),

  // Event details
  event_date: z.string().min(1, 'Event date is required'),
  serve_time: z.string().min(1, 'Serve time is required'),
  guest_count: z.number().int().positive('Guest count must be a positive number'),
  location: z.string().min(1, 'Location is required'),
  occasion: z.string().min(1, 'Occasion is required'),

  // Financial
  total_price_cents: z.number().int().nonnegative().optional().nullable(),
  commission_percent: z.number().min(0).max(50).default(25),
  log_commission: z.boolean().default(true),

  // Details
  dietary_restrictions: z.string().optional().or(z.literal('')),
  additional_notes: z.string().optional().or(z.literal('')),
})

export type TakeAChefCaptureInput = z.infer<typeof TakeAChefCaptureSchema>

export type TakeAChefCaptureResult = {
  success: boolean
  inquiryId?: string
  eventId?: string
  clientId?: string
  clientCreated?: boolean
  commissionExpenseId?: string
  error?: string
}

// ─── Server Action ────────────────────────────────────────────────────────

export async function captureTakeAChefBooking(
  input: TakeAChefCaptureInput
): Promise<TakeAChefCaptureResult> {
  const user = await requireChef()
  const validated = TakeAChefCaptureSchema.parse(input)
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  try {
    // 1. Parse dietary restrictions into array
    const dietaryList = validated.dietary_restrictions
      ? validated.dietary_restrictions
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : null

    // 2. Build source message for CRM record
    const sourceParts = [
      `Imported from Take a Chef booking notification`,
      `Serve time: ${validated.serve_time}`,
      validated.dietary_restrictions?.trim()
        ? `Dietary restrictions: ${validated.dietary_restrictions.trim()}`
        : null,
      validated.additional_notes?.trim() ? `Notes: ${validated.additional_notes.trim()}` : null,
    ].filter(Boolean)
    const sourceMessage = sourceParts.join('\n')

    // 3. Find or create client
    let clientId: string | null = null
    let clientCreated = false

    if (validated.email) {
      try {
        const clientResult = await createClientFromLead(tenantId, {
          email: validated.email.toLowerCase().trim(),
          full_name: validated.full_name.trim(),
          phone: validated.phone?.trim() || null,
          dietary_restrictions: dietaryList,
          source: 'take_a_chef',
        })
        clientId = clientResult.id
        clientCreated = clientResult.created
      } catch (clientErr) {
        console.error('[captureTakeAChefBooking] Client creation failed (non-fatal):', clientErr)
      }
    } else {
      // No email — create a minimal client record without email
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          full_name: validated.full_name.trim(),
          phone: validated.phone?.trim() || null,
          dietary_restrictions: dietaryList || [],
          allergies: [],
          status: 'active' as const,
          referral_source: 'take_a_chef' as const,
        })
        .select('id')
        .single()

      if (newClient) {
        clientId = newClient.id
        clientCreated = true
      }
    }

    // 4. Create inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        channel: 'take_a_chef' as const,
        client_id: clientId,
        first_contact_at: new Date().toISOString(),
        confirmed_date: validated.event_date,
        confirmed_guest_count: validated.guest_count,
        confirmed_location: validated.location.trim(),
        confirmed_occasion: validated.occasion.trim(),
        confirmed_budget_cents: validated.total_price_cents ?? null,
        confirmed_dietary_restrictions: dietaryList,
        confirmed_service_expectations: `Serve time ${validated.serve_time}. Chef arrives 2hr prior.`,
        source_message: sourceMessage,
        unknown_fields: {
          submission_source: 'take_a_chef_manual_capture',
          serve_time: validated.serve_time,
          commission_percent: validated.commission_percent,
          additional_notes: validated.additional_notes?.trim() || null,
        } as any,
        status: 'new',
        next_action_required: 'Review Take a Chef booking details',
        next_action_by: 'chef',
      })
      .select('id')
      .single()

    if (inquiryError || !inquiry) {
      throw new Error(`Inquiry creation failed: ${inquiryError?.message}`)
    }

    // 5. Create draft event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        inquiry_id: inquiry.id,
        event_date: validated.event_date,
        serve_time: validated.serve_time,
        guest_count: validated.guest_count,
        location_address: validated.location.trim(),
        location_city: 'TBD',
        location_zip: 'TBD',
        occasion: validated.occasion.trim(),
        quoted_price_cents: validated.total_price_cents ?? null,
        special_requests: sourceMessage || null,
      })
      .select('id')
      .single()

    if (eventError || !event) {
      console.error(
        '[captureTakeAChefBooking] Event creation failed (non-fatal):',
        eventError?.message
      )
      revalidatePath('/inquiries')
      return {
        success: true,
        inquiryId: inquiry.id,
        clientId: clientId || undefined,
        clientCreated,
      }
    }

    // 6. Log event state transition
    await supabase.from('event_state_transitions' as any).insert({
      tenant_id: tenantId,
      event_id: event.id,
      from_status: null,
      to_status: 'draft',
      metadata: { action: 'auto_created_from_take_a_chef_capture', inquiry_id: inquiry.id },
    })

    // 7. Link inquiry to event
    await supabase
      .from('inquiries')
      .update({ converted_to_event_id: event.id } as any)
      .eq('id', inquiry.id)

    // 8. Log commission as expense
    let commissionExpenseId: string | undefined
    if (
      validated.log_commission &&
      validated.commission_percent > 0 &&
      validated.total_price_cents &&
      validated.total_price_cents > 0
    ) {
      const commissionCents = Math.floor(
        (validated.total_price_cents * validated.commission_percent) / 100
      )
      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          tenant_id: tenantId,
          event_id: event.id,
          description: `Take a Chef platform commission (${validated.commission_percent}%)`,
          amount_cents: commissionCents,
          category: 'professional_services' as const,
          payment_method: 'other' as const,
          expense_date: validated.event_date,
          vendor_name: 'Take a Chef',
          notes:
            'Logged from Take a Chef booking capture. Represents platform commission taken from chef payout.',
          is_business: true,
        })
        .select('id')
        .single()

      commissionExpenseId = expense?.id
    }

    // 9. Log chef activity (non-blocking)
    try {
      const { logChefActivity } = await import('@/lib/activity/log-chef')
      await logChefActivity({
        tenantId,
        actorId: user.id,
        action: 'inquiry_created',
        domain: 'inquiry',
        entityType: 'inquiry',
        entityId: inquiry.id,
        summary: `Captured Take a Chef booking: ${validated.full_name.trim()} on ${validated.event_date}`,
        context: {
          channel: 'take_a_chef',
          client_name: validated.full_name.trim(),
          event_date: validated.event_date,
          guest_count: validated.guest_count,
          commission_percent: validated.commission_percent,
        },
        clientId: clientId || undefined,
      })
    } catch (actErr) {
      console.error('[captureTakeAChefBooking] Activity log failed (non-fatal):', actErr)
    }

    revalidatePath('/inquiries')
    revalidatePath('/events')
    revalidatePath('/clients')

    return {
      success: true,
      inquiryId: inquiry.id,
      eventId: event.id,
      clientId: clientId || undefined,
      clientCreated,
      commissionExpenseId,
    }
  } catch (err) {
    const error = err as Error
    console.error('[captureTakeAChefBooking] Failed:', error.message)
    return { success: false, error: error.message }
  }
}

// ─── Get TakeaChef conversion data for event detail page ──────────────────
// Lightweight check: is this event sourced from Take a Chef?

export type TakeAChefConversionData = {
  isTakeAChef: boolean
  clientName: string | null
  chefSlug: string | null
  directBookingUrl: string | null
}

export async function getTakeAChefConversionData(
  eventId: string
): Promise<TakeAChefConversionData> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const empty: TakeAChefConversionData = {
    isTakeAChef: false,
    clientName: null,
    chefSlug: null,
    directBookingUrl: null,
  }

  try {
    // Fetch event with client referral_source and inquiry channel
    const { data: event } = await supabase
      .from('events')
      .select('client_id, inquiry_id, client:clients(full_name, referral_source)')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return empty

    const client = event.client as any
    const isClientFromTAC = client?.referral_source === 'take_a_chef'

    // Check the linked inquiry channel if client source isn't already conclusive
    let isInquiryFromTAC = false
    if (event.inquiry_id) {
      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('channel')
        .eq('id', event.inquiry_id)
        .eq('tenant_id', tenantId)
        .single()
      isInquiryFromTAC = inquiry?.channel === 'take_a_chef'
    }

    const isTakeAChef = isClientFromTAC || isInquiryFromTAC
    if (!isTakeAChef) return empty

    // Fetch chef slug for the direct booking link
    const { data: chef } = await supabase.from('chefs').select('slug').eq('id', tenantId).single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const directBookingUrl = chef?.slug ? `${appUrl}/chef/${chef.slug}/inquire` : null

    return {
      isTakeAChef: true,
      clientName: client?.full_name || null,
      chefSlug: chef?.slug || null,
      directBookingUrl,
    }
  } catch {
    return empty
  }
}
