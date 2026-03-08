// Instant-Book Server Action
// Creates event records + Stripe Checkout Session for deposit payment.
// On successful payment, the Stripe webhook transitions draft -> paid.
// No auth required - public booking page action.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createClientFromLead } from '@/lib/clients/actions'
import {
  BookingServiceModeSchema,
  ScheduleRequestSchema,
  summarizeScheduleRequest,
} from '@/lib/booking/schedule-schema'
import {
  buildSeriesSchedulePlan,
  getDefaultServeTimeForMealSlot,
} from '@/lib/booking/series-planning'
import { recordInquiryStateTransition } from '@/lib/inquiries/transition-log'
import { z } from 'zod'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

const InstantBookSchema = z.object({
  chef_slug: z.string().min(1).max(200),
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required').max(320),
  phone: z.string().max(50).optional().or(z.literal('')),
  occasion: z.string().min(1, 'Occasion is required').max(200),
  event_date: z.string().min(1, 'Event date is required').max(20),
  serve_time: z.string().min(1, 'Serve time is required').max(20),
  guest_count: z.number().int().positive().max(10000),
  address: z.string().min(1, 'Address is required').max(500),
  allergies_food_restrictions: z.string().max(2000).optional().or(z.literal('')),
  additional_notes: z.string().max(5000).optional().or(z.literal('')),
  service_mode: BookingServiceModeSchema.optional(),
  recurring_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurring_duration_weeks: z.number().int().min(1).max(52).optional(),
  menu_recommendation_lead_days: z.number().int().min(1).max(21).optional(),
  schedule_request_jsonb: ScheduleRequestSchema.optional(),
})

export type InstantBookInput = z.infer<typeof InstantBookSchema>

export type InstantBookResult = {
  checkoutUrl: string
  totalCents: number
  depositCents: number
}

function inferLocationCityState(address: string): { city: string; state: string } {
  const chunks = address
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const city = chunks.length >= 2 ? chunks[chunks.length - 2] : 'TBD'
  const stateChunk = chunks.length >= 1 ? chunks[chunks.length - 1] : 'MA'
  const state = stateChunk.split(/\s+/)[0] || 'MA'
  return { city, state }
}

function buildConflictMessage(conflicts: Array<{ session_date: string; reason: string }>): string {
  const preview = conflicts
    .slice(0, 5)
    .map((conflict) => `${conflict.session_date}: ${conflict.reason}`)
    .join('; ')
  if (conflicts.length <= 5) return preview
  return `${preview}; +${conflicts.length - 5} more`
}

/**
 * Create an instant-book checkout session.
 * 1. Validates chef instant-book setup
 * 2. Computes pricing and deposit
 * 3. Creates client + inquiry
 * 4. Creates event records (single event or multi-day series)
 * 5. Creates Stripe Checkout Session for deposit
 */
export async function createInstantBookingCheckout(
  input: InstantBookInput
): Promise<InstantBookResult> {
  const validated = InstantBookSchema.parse(input)
  const supabase: any = createServerClient({ admin: true })

  const { data: chef } = await supabase
    .from('chefs')
    .select(
      `
      id, business_name, booking_slug, booking_enabled, booking_model,
      booking_base_price_cents, booking_pricing_type,
      booking_deposit_type, booking_deposit_percent, booking_deposit_fixed_cents,
      booking_min_notice_days,
      stripe_account_id, stripe_onboarding_complete,
      platform_fee_percent, platform_fee_fixed_cents
    `
    )
    .eq('booking_slug', validated.chef_slug)
    .eq('booking_enabled', true)
    .single()

  if (!chef) throw new Error('Chef not found or booking not enabled')
  if (chef.booking_model !== 'instant_book')
    throw new Error('This chef does not accept instant bookings')
  if (!chef.stripe_onboarding_complete || !chef.stripe_account_id) {
    throw new Error('Chef has not completed payment setup')
  }

  const basePriceCents = chef.booking_base_price_cents
  if (!basePriceCents || basePriceCents <= 0) {
    throw new Error('Chef pricing is not configured')
  }

  const tenantId = chef.id as string
  const serviceMode = validated.service_mode ?? 'one_off'
  const bookingSource = serviceMode === 'multi_day' ? 'series' : 'instant_book'
  const recurringSummary =
    serviceMode === 'recurring'
      ? `Recurring ${validated.recurring_frequency ?? 'weekly'} plan for ${
          validated.recurring_duration_weeks ?? 8
        } week(s); menu recommendation lead ${validated.menu_recommendation_lead_days ?? 7} day(s).`
      : null
  const scheduleSummary = summarizeScheduleRequest(validated.schedule_request_jsonb)

  const totalCents =
    chef.booking_pricing_type === 'per_person'
      ? basePriceCents * validated.guest_count
      : basePriceCents

  let depositCents: number
  if (chef.booking_deposit_type === 'fixed' && chef.booking_deposit_fixed_cents > 0) {
    depositCents = Math.min(chef.booking_deposit_fixed_cents, totalCents)
  } else {
    const pct = chef.booking_deposit_percent ?? 30
    depositCents = Math.round(totalCents * (pct / 100))
  }
  if (depositCents <= 0) depositCents = totalCents

  const client = await createClientFromLead(tenantId, {
    email: validated.email.toLowerCase().trim(),
    full_name: validated.full_name.trim(),
    phone: validated.phone?.trim() || null,
    source: 'website',
  })

  const { data: inquiry } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel: 'website',
      client_id: client.id,
      first_contact_at: new Date().toISOString(),
      confirmed_date: validated.event_date,
      confirmed_guest_count: validated.guest_count,
      confirmed_location: validated.address.trim(),
      confirmed_occasion: validated.occasion.trim(),
      source_message: `Instant-book request. Serve time: ${validated.serve_time}. Service mode: ${serviceMode}.${
        recurringSummary ? ` ${recurringSummary}` : ''
      }${scheduleSummary ? ` ${scheduleSummary}` : ''}`,
      service_mode: serviceMode,
      schedule_request_jsonb: validated.schedule_request_jsonb ?? null,
      unknown_fields: {
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

  if (inquiry?.id) {
    try {
      await recordInquiryStateTransition({
        supabase,
        tenantId,
        inquiryId: inquiry.id,
        fromStatus: null,
        toStatus: 'new',
        transitionedBy: null,
        reason: 'instant_book_submitted',
        metadata: { source: 'instant_book', service_mode: serviceMode },
      })
    } catch (transitionErr) {
      console.error(
        '[createInstantBookCheckout] Initial inquiry transition insert failed (non-blocking):',
        transitionErr
      )
    }
  }

  const parsedLocation = inferLocationCityState(validated.address.trim())
  let checkoutEventId: string
  let checkoutSeriesId: string | null = null

  if (serviceMode === 'multi_day') {
    const schedulePlan = buildSeriesSchedulePlan({
      scheduleRequest: validated.schedule_request_jsonb ?? null,
      fallbackDate: validated.event_date,
      fallbackGuestCount: validated.guest_count,
    })

    const [eventsInRange, manualBlocksInRange] = await Promise.all([
      supabase
        .from('events')
        .select('id, event_date, status, occasion')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'in_progress', 'paid', 'accepted'])
        .gte('event_date', schedulePlan.start_date)
        .lte('event_date', `${schedulePlan.end_date}T23:59:59Z`),
      supabase
        .from('chef_availability_blocks')
        .select('block_date, is_event_auto, reason')
        .eq('chef_id', tenantId)
        .gte('block_date', schedulePlan.start_date)
        .lte('block_date', schedulePlan.end_date),
    ])

    const minNoticeDays = Number(chef.booking_min_notice_days ?? 7)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const conflicts: Array<{ session_date: string; reason: string }> = []

    for (const session of schedulePlan.sessions) {
      const eventOnDate = (eventsInRange.data || []).find(
        (event: any) => String(event.event_date).slice(0, 10) === session.session_date
      )
      if (eventOnDate) {
        conflicts.push({
          session_date: session.session_date,
          reason: `Existing ${eventOnDate.status} event "${eventOnDate.occasion || 'Untitled event'}"`,
        })
      }

      const manualBlock = (manualBlocksInRange.data || []).find(
        (block: any) => !block.is_event_auto && block.block_date === session.session_date
      )
      if (manualBlock) {
        conflicts.push({
          session_date: session.session_date,
          reason: manualBlock.reason
            ? `Chef blocked availability: ${manualBlock.reason}`
            : 'Chef blocked availability',
        })
      }

      const daysAhead = Math.floor(
        (new Date(`${session.session_date}T00:00:00.000Z`).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (daysAhead < minNoticeDays) {
        conflicts.push({
          session_date: session.session_date,
          reason: `Minimum notice is ${minNoticeDays} day${minNoticeDays === 1 ? '' : 's'}`,
        })
      }
    }

    if (conflicts.length > 0) {
      throw new Error(`Schedule conflicts detected: ${buildConflictMessage(conflicts)}`)
    }

    const pricingModel = chef.booking_pricing_type === 'per_person' ? 'per_person' : 'flat_rate'

    const { data: series, error: seriesError } = await supabase
      .from('event_series')
      .insert({
        tenant_id: tenantId,
        client_id: client.id,
        inquiry_id: inquiry?.id ?? null,
        service_mode: 'multi_day',
        status: 'draft',
        title: validated.occasion.trim(),
        start_date: schedulePlan.start_date,
        end_date: schedulePlan.end_date,
        base_guest_count: validated.guest_count,
        location_address: validated.address.trim(),
        location_city: parsedLocation.city,
        location_state: parsedLocation.state,
        location_zip: 'TBD',
        pricing_model: pricingModel,
        quoted_total_cents: totalCents,
        deposit_total_cents: depositCents,
      })
      .select('id')
      .single()

    if (seriesError || !series) {
      console.error('[createInstantBookingCheckout] Event series creation failed:', seriesError)
      throw new Error('Failed to create event series')
    }
    checkoutSeriesId = series.id

    const sessionPayload = schedulePlan.sessions.map((session) => ({
      series_id: series.id,
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry?.id ?? null,
      session_date: session.session_date,
      meal_slot: session.meal_slot,
      execution_type: session.execution_type,
      start_time: session.start_time,
      end_time: session.end_time,
      guest_count: session.guest_count ?? validated.guest_count,
      service_style: 'plated',
      location_address: validated.address.trim(),
      location_city: parsedLocation.city,
      location_state: parsedLocation.state,
      location_zip: 'TBD',
      status: 'draft',
      sort_order: session.sort_order,
      notes: session.notes,
    }))

    const { data: insertedSessions, error: sessionsError } = await supabase
      .from('event_service_sessions')
      .insert(sessionPayload)
      .select('id, session_date, meal_slot, start_time, sort_order')

    if (sessionsError || !insertedSessions || insertedSessions.length === 0) {
      console.error('[createInstantBookingCheckout] Event sessions creation failed:', sessionsError)
      throw new Error('Failed to create event sessions')
    }

    const sortedSessions = [...insertedSessions].sort((a: any, b: any) => {
      const dateCompare = String(a.session_date).localeCompare(String(b.session_date))
      if (dateCompare !== 0) return dateCompare
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
    })

    const eventPayload = sortedSessions.map((session: any, index: number) => ({
      tenant_id: tenantId,
      client_id: client.id,
      inquiry_id: inquiry?.id ?? null,
      event_series_id: series.id,
      source_session_id: session.id,
      event_date: session.session_date,
      serve_time: session.start_time || getDefaultServeTimeForMealSlot(session.meal_slot),
      guest_count: validated.guest_count,
      location_address: validated.address.trim(),
      location_city: parsedLocation.city,
      location_state: parsedLocation.state,
      location_zip: 'TBD',
      occasion:
        sortedSessions.length > 1
          ? `${validated.occasion.trim()} - ${session.meal_slot} (${session.session_date})`
          : validated.occasion.trim(),
      quoted_price_cents: index === 0 ? totalCents : null,
      deposit_amount_cents: index === 0 ? depositCents : null,
      pricing_model: pricingModel,
      service_mode: serviceMode,
      special_requests: [
        validated.additional_notes?.trim() || null,
        recurringSummary,
        scheduleSummary,
      ]
        .filter(Boolean)
        .join('\n'),
      booking_source: bookingSource,
    }))

    const { data: events, error: eventError } = await supabase
      .from('events')
      .insert(eventPayload)
      .select('id, source_session_id')

    if (eventError || !events || events.length === 0) {
      console.error('[createInstantBookingCheckout] Series event creation failed:', eventError)
      throw new Error('Failed to create events for multi-day service')
    }

    checkoutEventId = events[0].id

    await supabase.from('event_state_transitions').insert(
      events.map((event: any) => ({
        tenant_id: tenantId,
        event_id: event.id,
        from_status: null,
        to_status: 'draft',
        metadata: {
          action: 'auto_created_from_instant_book',
          inquiry_id: inquiry?.id,
          booking_source: bookingSource,
          event_series_id: series.id,
        },
      }))
    )

    for (const event of events) {
      if (!event.source_session_id) continue
      await supabase
        .from('event_service_sessions')
        .update({ event_id: event.id })
        .eq('id', event.source_session_id)
    }
  } else {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        tenant_id: tenantId,
        client_id: client.id,
        inquiry_id: inquiry?.id ?? null,
        event_date: validated.event_date,
        serve_time: validated.serve_time.trim(),
        guest_count: validated.guest_count,
        location_address: validated.address.trim(),
        location_city: parsedLocation.city,
        location_state: parsedLocation.state,
        location_zip: 'TBD',
        occasion: validated.occasion.trim(),
        quoted_price_cents: totalCents,
        deposit_amount_cents: depositCents,
        service_mode: serviceMode,
        special_requests: [
          validated.additional_notes?.trim() || null,
          recurringSummary,
          scheduleSummary,
        ]
          .filter(Boolean)
          .join('\n'),
        booking_source: bookingSource,
      })
      .select('id')
      .single()

    if (eventError || !event) {
      console.error('[createInstantBookingCheckout] Event creation failed:', eventError)
      throw new Error('Failed to create event')
    }

    checkoutEventId = event.id

    await supabase.from('event_state_transitions').insert({
      tenant_id: tenantId,
      event_id: event.id,
      from_status: null,
      to_status: 'draft',
      metadata: {
        action: 'auto_created_from_instant_book',
        inquiry_id: inquiry?.id,
        booking_source: bookingSource,
      },
    })
  }

  if (inquiry?.id) {
    await supabase
      .from('inquiries')
      .update({ converted_to_event_id: checkoutEventId })
      .eq('id', inquiry.id)
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const chefName = (chef.business_name as string) || 'Private Chef'

  const { computeApplicationFee } = await import('@/lib/stripe/transfer-routing')
  const feePercent = Number(chef.platform_fee_percent ?? 0)
  const feeFixed = Number(chef.platform_fee_fixed_cents ?? 0)
  const applicationFee = computeApplicationFee(depositCents, feePercent, feeFixed)

  const paymentIntentData: Record<string, unknown> = {
    metadata: {
      event_id: checkoutEventId,
      event_series_id: checkoutSeriesId ?? undefined,
      tenant_id: tenantId,
      client_id: client.id,
      payment_type: 'deposit',
      transfer_routed: 'true',
      booking_source: bookingSource,
    },
    transfer_data: {
      destination: chef.stripe_account_id,
    },
  }

  if (applicationFee > 0) {
    paymentIntentData.application_fee_amount = applicationFee
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: depositCents,
          product_data: {
            name: `${validated.occasion} - Deposit (${chefName})`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: paymentIntentData as any,
    success_url: `${appUrl}/book/${validated.chef_slug}/thank-you?mode=instant&event=${checkoutEventId}`,
    cancel_url: `${appUrl}/book/${validated.chef_slug}?booking=cancelled`,
    customer_email: validated.email.toLowerCase().trim(),
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  })

  return {
    checkoutUrl: session.url!,
    totalCents,
    depositCents,
  }
}
