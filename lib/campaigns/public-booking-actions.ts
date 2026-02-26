// @ts-nocheck
'use server'

// Public Campaign Booking Actions
// Unauthenticated server actions used from the /book/[token] public page.
// These use the Supabase admin client to bypass RLS.
// Flow: getCampaignByToken (show dinner info) → submitCampaignBooking (create inquiry)

import { z } from 'zod'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

// ============================================================
// TYPES
// ============================================================

export type PublicDinnerInfo = {
  chef_name: string
  chef_business_name: string | null
  campaign_name: string
  occasion: string | null
  proposed_date: string | null
  proposed_time: string | null
  price_per_person_cents: number | null
  guest_count_min: number | null
  guest_count_max: number | null
  seats_available: number | null
  seats_booked: number
  concept_description: string | null
  menu_preview: Array<{ name: string; course_name: string }>
  is_full: boolean
}

export type CampaignBookingInput = {
  full_name: string
  email: string
  phone?: string
  guest_count: number
  dietary_restrictions?: string
  message?: string
}

// ============================================================
// GET CAMPAIGN INFO (public — no auth)
// ============================================================

export async function getCampaignByToken(token: string): Promise<PublicDinnerInfo | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient() as any

  const { data: campaign } = await db
    .from('marketing_campaigns')
    .select('*')
    .eq('public_booking_token', token)
    .eq('campaign_type', 'push_dinner')
    .single()

  if (!campaign) return null

  // Fetch chef info
  const { data: chef } = await db
    .from('chefs')
    .select('full_name, business_name')
    .eq('id', campaign.chef_id)
    .single()

  // Fetch chef preferences for display name
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('display_name, business_name')
    .eq('chef_id', campaign.chef_id)
    .maybeSingle()

  const chefName = prefs?.display_name || prefs?.business_name || chef?.full_name || 'Your Chef'

  // Fetch menu preview (courses only — no costs)
  let menuPreview: Array<{ name: string; course_name: string }> = []
  if (campaign.menu_id) {
    const { data: dishes } = await db
      .from('menu_dishes')
      .select('course_name, description')
      .eq('menu_id', campaign.menu_id)
      .order('course_number', { ascending: true })
      .limit(8)

    menuPreview = (dishes ?? []).map((d: any) => ({
      name: d.description ?? '',
      course_name: d.course_name ?? '',
    }))
  }

  const isFull =
    campaign.seats_available !== null && campaign.seats_booked >= campaign.seats_available

  return {
    chef_name: chefName,
    chef_business_name: chef?.business_name ?? null,
    campaign_name: campaign.name,
    occasion: campaign.occasion,
    proposed_date: campaign.proposed_date,
    proposed_time: campaign.proposed_time,
    price_per_person_cents: campaign.price_per_person_cents,
    guest_count_min: campaign.guest_count_min,
    guest_count_max: campaign.guest_count_max,
    seats_available: campaign.seats_available,
    seats_booked: campaign.seats_booked,
    concept_description: campaign.concept_description,
    menu_preview: menuPreview,
    is_full: isFull,
  }
}

// ============================================================
// SUBMIT BOOKING (public — no auth)
// ============================================================

const BookingSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  guest_count: z.number().int().min(1).max(50),
  dietary_restrictions: z.string().optional(),
  message: z.string().optional(),
})

export type SubmitBookingResult =
  | { success: true; inquiry_id: string }
  | { success: false; error: string }

export async function submitCampaignBooking(
  token: string,
  rawInput: CampaignBookingInput
): Promise<SubmitBookingResult> {
  const parse = BookingSchema.safeParse(rawInput)
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message ?? 'Invalid input' }
  }
  const input = parse.data

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const db = createAdminClient() as any

  // 1. Look up campaign
  const { data: campaign } = await db
    .from('marketing_campaigns')
    .select(
      'id, chef_id, name, status, proposed_date, proposed_time, seats_available, seats_booked, public_booking_token, occasion, guest_count_min, guest_count_max'
    )
    .eq('public_booking_token', token)
    .eq('campaign_type', 'push_dinner')
    .single()

  if (!campaign) return { success: false, error: 'This booking link is not valid.' }
  if (campaign.status === 'cancelled')
    return { success: false, error: 'This dinner has been cancelled.' }

  // 2. Check seat availability
  if (campaign.seats_available !== null && campaign.seats_booked >= campaign.seats_available) {
    return { success: false, error: 'Sorry — this dinner is fully booked.' }
  }

  // 3. Find or create client (idempotent by email + chef_id)
  const { data: existingClient } = await db
    .from('clients')
    .select('id')
    .eq('email', input.email)
    .eq('chef_id', campaign.chef_id)
    .maybeSingle()

  let clientId: string

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientErr } = await db
      .from('clients')
      .insert({
        chef_id: campaign.chef_id,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone ?? null,
        referral_source: 'other',
        referral_source_detail: `Campaign: ${campaign.name}`,
        status: 'active',
      })
      .select('id')
      .single()

    if (clientErr || !newClient) {
      return { success: false, error: 'Could not create your booking. Please try again.' }
    }
    clientId = newClient.id
  }

  // 4. Build the source message for the inquiry
  const sourceLines = [
    `Campaign: ${campaign.name}`,
    `Name: ${input.full_name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    `Guest count requested: ${input.guest_count}`,
    input.dietary_restrictions ? `Dietary: ${input.dietary_restrictions}` : null,
    input.message ? `Message: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  // 5. Create inquiry
  const { data: inquiry, error: inqErr } = await db
    .from('inquiries')
    .insert({
      chef_id: campaign.chef_id,
      client_id: clientId,
      channel: 'campaign_response',
      status: 'new',
      confirmed_date: campaign.proposed_date ?? null,
      confirmed_guest_count: input.guest_count,
      confirmed_occasion: campaign.occasion ?? null,
      source_message: sourceLines,
      unknown_fields: [
        `Campaign ID: ${campaign.id}`,
        `Campaign token: ${token}`,
        ...(input.dietary_restrictions
          ? [`Dietary restrictions: ${input.dietary_restrictions}`]
          : []),
        ...(input.message ? [`Client message: ${input.message}`] : []),
      ],
    })
    .select('id')
    .single()

  if (inqErr || !inquiry) {
    return { success: false, error: 'Could not save your booking request. Please try again.' }
  }

  // 6. Create a draft event linked to this inquiry
  await db.from('events').insert({
    chef_id: campaign.chef_id,
    client_id: clientId,
    inquiry_id: inquiry.id,
    status: 'draft',
    event_date: campaign.proposed_date ?? null,
    serve_time: campaign.proposed_time ?? null,
    guest_count: input.guest_count,
    occasion: campaign.occasion ?? campaign.name,
    dietary_restrictions: input.dietary_restrictions ? [input.dietary_restrictions] : [],
  })

  // 7. Update campaign_recipients if this client was in the list
  await db
    .from('campaign_recipients')
    .update({
      responded_at: new Date().toISOString(),
      converted_to_inquiry_id: inquiry.id,
    })
    .eq('campaign_id', campaign.id)
    .eq('client_id', clientId)

  // 8. Increment seats_booked
  await db
    .from('marketing_campaigns')
    .update({ seats_booked: (campaign.seats_booked ?? 0) + 1 })
    .eq('id', campaign.id)

  // 9. Send ack email (non-blocking)
  try {
    const { sendEmail } = await import('@/lib/email/send')
    const { CampaignEmail } = await import('@/lib/email/templates/campaign')
    const React = await import('react')

    const { data: prefs } = await db
      .from('chef_preferences')
      .select('display_name, business_name')
      .eq('chef_id', campaign.chef_id)
      .maybeSingle()

    const { data: chef } = await db
      .from('chefs')
      .select('full_name')
      .eq('id', campaign.chef_id)
      .single()

    const chefName = prefs?.display_name || prefs?.business_name || chef?.full_name || 'Your Chef'

    const ackBody = [
      `Hi ${input.full_name.split(' ')[0]},`,
      '',
      `Thanks for your interest in ${campaign.name}! ${chefName} has received your request and will be in touch shortly to confirm your reservation.`,
      '',
      `Here's what we have so far:`,
      campaign.proposed_date
        ? `Date: ${new Date(campaign.proposed_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
        : '',
      `Guests: ${input.guest_count}`,
      input.dietary_restrictions ? `Dietary notes: ${input.dietary_restrictions}` : '',
    ]
      .filter((l) => l !== undefined && l !== null)
      .join('\n')
      .trim()

    await sendEmail({
      to: input.email,
      subject: `Booking request received — ${campaign.name}`,
      react: React.default.createElement(CampaignEmail, {
        chefName,
        bodyText: ackBody,
        previewText: `${chefName} will be in touch shortly.`,
        unsubscribeUrl: '',
      }),
    })
  } catch (emailErr) {
    console.error('[campaign-booking] Ack email failed (non-blocking):', emailErr)
  }

  return { success: true, inquiry_id: inquiry.id }
}
