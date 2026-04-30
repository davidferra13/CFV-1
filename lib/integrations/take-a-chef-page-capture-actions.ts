'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createClientFromLead } from '@/lib/clients/actions'
import { findPlatformInquiryByContext } from '@/lib/gmail/platform-dedup'
import {
  createEmailSnapshot,
  ensurePlatformRecord,
  upsertPlatformPayout,
} from '@/lib/gmail/platform-records-writer'
import { transitionInquiry } from '@/lib/inquiries/actions'
import { isMarketplaceChannelValue } from '@/lib/marketplace/source-platform-display'
import {
  TAKE_A_CHEF_PAGE_CAPTURE_TYPES,
  mergeTakeAChefPageCaptureIntoUnknownFields,
  parseTakeAChefPageCapture,
  type TakeAChefPageCaptureType,
} from './take-a-chef-page-capture'

const TakeAChefPageCaptureSchema = z.object({
  captureType: z.enum(TAKE_A_CHEF_PAGE_CAPTURE_TYPES).optional(),
  pageUrl: z.string().url('Valid page URL required'),
  pageTitle: z.string().max(300).optional().or(z.literal('')),
  pageText: z.string().min(20, 'Captured page text is required').max(15000),
  pageLinks: z.array(z.string().url()).max(25).optional(),
  notes: z.string().max(4000).optional().or(z.literal('')),
})

export type TakeAChefPageCaptureInput = z.infer<typeof TakeAChefPageCaptureSchema>

export type TakeAChefPageCaptureResult = {
  success: boolean
  inquiryId?: string
  eventId?: string | null
  inquiryCreated?: boolean
  captureType?: TakeAChefPageCaptureType
  summary?: string
  error?: string
}

function getCaptureNextAction(params: {
  captureType: TakeAChefPageCaptureType
  currentStatus?: string | null
  hasLinkedEvent?: boolean
}) {
  if (params.captureType === 'proposal') {
    return {
      nextActionRequired: 'Waiting for client reply to captured proposal',
      nextActionBy: 'client',
    }
  }

  if (params.captureType === 'menu') {
    return {
      nextActionRequired: params.hasLinkedEvent
        ? 'Finalize the captured marketplace menu in ChefFlow'
        : 'Review captured marketplace menu draft',
      nextActionBy: 'chef',
    }
  }

  if (params.captureType === 'booking') {
    return {
      nextActionRequired: 'Review captured marketplace booking and create the event',
      nextActionBy: 'chef',
    }
  }

  if (params.captureType === 'guest_contact') {
    return {
      nextActionRequired: 'Review captured guest contact details',
      nextActionBy: 'chef',
    }
  }

  return {
    nextActionRequired:
      params.currentStatus === 'quoted'
        ? 'Waiting for client reply'
        : 'Review captured marketplace page',
    nextActionBy: params.currentStatus === 'quoted' ? 'client' : 'chef',
  }
}

async function syncProposalStatusFromCapture(params: {
  inquiryId: string
  currentStatus: string
}): Promise<string> {
  const stepsByStatus: Record<
    string,
    Array<'new' | 'awaiting_client' | 'awaiting_chef' | 'quoted'>
  > = {
    expired: ['new', 'awaiting_client', 'awaiting_chef', 'quoted'],
    new: ['awaiting_client', 'awaiting_chef', 'quoted'],
    awaiting_client: ['awaiting_chef', 'quoted'],
    awaiting_chef: ['quoted'],
    quoted: [],
    confirmed: [],
    declined: [],
  }

  const steps = stepsByStatus[params.currentStatus] ?? []
  let finalStatus = params.currentStatus

  for (const step of steps) {
    await transitionInquiry(params.inquiryId, step)
    finalStatus = step
  }

  return finalStatus
}

function isPlaceholderClientEmail(value: unknown): boolean {
  return typeof value === 'string' && value.endsWith('@placeholder.cheflowhq.com')
}

async function maybeCreateClient(params: {
  db: any
  tenantId: string
  fullName: string | null
  email: string | null
  phone: string | null
  sourceChannel: string
}): Promise<string | null> {
  if (!params.fullName) return null
  const clientSource = params.sourceChannel === 'take_a_chef' ? 'take_a_chef' : 'other'

  if (params.email) {
    try {
      const result = await createClientFromLead(params.tenantId, {
        email: params.email.toLowerCase().trim(),
        full_name: params.fullName.trim(),
        phone: params.phone?.trim() || null,
        source: clientSource,
      })
      return result.id
    } catch (error) {
      console.error('[take-a-chef-page-capture] Client creation skipped:', error)
      return null
    }
  }

  const { data: client, error } = await params.db
    .from('clients')
    .insert({
      tenant_id: params.tenantId,
      full_name: params.fullName.trim(),
      email: `source-capture-${Date.now()}@placeholder.cheflowhq.com`,
      phone: params.phone?.trim() || null,
      dietary_restrictions: [],
      allergies: [],
      status: 'active',
      referral_source: clientSource,
    })
    .select('id')
    .single()

  if (error || !client) {
    console.error('[take-a-chef-page-capture] Placeholder client creation skipped:', error)
    return null
  }

  return client.id
}

async function syncClientContactDetails(params: {
  db: any
  tenantId: string
  clientId: string | null
  fullName: string | null
  email: string | null
  phone: string | null
  sourceChannel: string
}) {
  if (!params.clientId) return

  const { data: client } = await params.db
    .from('clients')
    .select('id, full_name, email, phone, referral_source')
    .eq('tenant_id', params.tenantId)
    .eq('id', params.clientId)
    .maybeSingle()

  if (!client) return

  const updates: Record<string, unknown> = {}

  if (params.email && (!client.email || isPlaceholderClientEmail(client.email))) {
    updates.email = params.email.toLowerCase().trim()
  }
  if (params.phone && !client.phone) {
    updates.phone = params.phone.trim()
  }
  if (
    params.fullName &&
    (!client.full_name ||
      client.full_name.toLowerCase() === 'unknown' ||
      client.full_name.toLowerCase().includes('placeholder'))
  ) {
    updates.full_name = params.fullName.trim()
  }
  if (!client.referral_source) {
    updates.referral_source = params.sourceChannel === 'take_a_chef' ? 'take_a_chef' : 'other'
  }

  if (Object.keys(updates).length === 0) return

  await params.db
    .from('clients')
    .update(updates)
    .eq('tenant_id', params.tenantId)
    .eq('id', params.clientId)
}

async function syncBookingEventFromCapture(params: {
  db: any
  tenantId: string
  userId: string
  inquiryId: string
  clientId: string | null
  currentEventId: string | null
  confirmedDate: string | null
  confirmedGuestCount: number | null
  confirmedLocation: string | null
  confirmedOccasion: string | null
  pageNotes: string | null
  parsed: ReturnType<typeof parseTakeAChefPageCapture>
}): Promise<string | null> {
  const eventDate = params.parsed.bookingDate || params.confirmedDate || null
  const guestCount = params.parsed.guestCount ?? params.confirmedGuestCount ?? 2
  const occasion = params.parsed.occasion || params.confirmedOccasion || 'Dinner'
  const locationAddress = params.parsed.location || params.confirmedLocation || 'TBD'
  const captureSpecialRequests = [params.parsed.summary, params.pageNotes?.trim() || null]
    .filter(Boolean)
    .join('\n\n')

  if (params.currentEventId) {
    const { data: existingEvent } = await params.db
      .from('events')
      .select(
        'id, event_date, guest_count, location_address, occasion, quoted_price_cents, special_requests'
      )
      .eq('tenant_id', params.tenantId)
      .eq('id', params.currentEventId)
      .maybeSingle()

    if (!existingEvent) return params.currentEventId

    const updates: Record<string, unknown> = {
      updated_by: params.userId,
    }

    if (!existingEvent.event_date && eventDate) updates.event_date = eventDate
    if ((!existingEvent.guest_count || existingEvent.guest_count <= 0) && guestCount > 0) {
      updates.guest_count = guestCount
    }
    if (!existingEvent.location_address && locationAddress) {
      updates.location_address = locationAddress
    }
    if (!existingEvent.occasion && occasion) {
      updates.occasion = occasion
    }
    if (
      (!existingEvent.quoted_price_cents || existingEvent.quoted_price_cents <= 0) &&
      params.parsed.amountCents
    ) {
      updates.quoted_price_cents = params.parsed.amountCents
    }
    if (!existingEvent.special_requests && captureSpecialRequests) {
      updates.special_requests = captureSpecialRequests
    }

    if (Object.keys(updates).length > 1) {
      await params.db
        .from('events')
        .update(updates)
        .eq('tenant_id', params.tenantId)
        .eq('id', params.currentEventId)
    }

    return params.currentEventId
  }

  if (!params.clientId || !eventDate) return null

  const { data: event, error } = await params.db
    .from('events')
    .insert({
      tenant_id: params.tenantId,
      client_id: params.clientId,
      inquiry_id: params.inquiryId,
      event_date: eventDate,
      serve_time: 'TBD',
      guest_count: guestCount,
      location_address: locationAddress,
      location_city: 'TBD',
      location_zip: 'TBD',
      occasion,
      quoted_price_cents: params.parsed.amountCents,
      special_requests: captureSpecialRequests || null,
      created_by: params.userId,
      updated_by: params.userId,
    })
    .select('id')
    .single()

  if (error || !event) {
    console.error('[take-a-chef-page-capture] Event creation skipped:', error)
    return null
  }

  await params.db.from('event_state_transitions').insert({
    tenant_id: params.tenantId,
    event_id: event.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: params.userId,
    metadata: {
      action: 'auto_created_from_take_a_chef_page_capture',
      inquiry_id: params.inquiryId,
      order_id: params.parsed.orderId,
    },
  })

  await params.db
    .from('inquiries')
    .update({ converted_to_event_id: event.id })
    .eq('tenant_id', params.tenantId)
    .eq('id', params.inquiryId)

  return event.id
}

function getPlatformStatusFromCapture(captureType: TakeAChefPageCaptureType): string {
  if (captureType === 'booking') return 'booked'
  if (captureType === 'guest_contact') return 'contact_revealed'
  if (captureType === 'proposal') return 'proposal_sent'
  if (captureType === 'message') return 'responded'
  return 'new'
}

function getCaptureUrls(captureType: TakeAChefPageCaptureType, pageUrl: string) {
  return {
    requestUrl: captureType === 'request' ? pageUrl : null,
    proposalUrl: captureType === 'proposal' ? pageUrl : null,
    guestContactUrl: captureType === 'guest_contact' ? pageUrl : null,
    bookingUrl: captureType === 'booking' ? pageUrl : null,
    menuUrl: captureType === 'menu' ? pageUrl : null,
  }
}

async function writeSourcePlatformCaptureRecord(params: {
  db: any
  tenantId: string
  inquiryId: string
  clientId: string | null
  eventId: string | null
  captureType: TakeAChefPageCaptureType
  pageUrl: string
  pageTitle: string | null
  pageText: string
  capturedAt: string
  nextActionRequired: string | null
  nextActionBy: string | null
  parsed: ReturnType<typeof parseTakeAChefPageCapture>
}) {
  try {
    const urls = getCaptureUrls(params.captureType, params.pageUrl)
    const platformRecordId = await ensurePlatformRecord(params.db, {
      tenantId: params.tenantId,
      inquiryId: params.inquiryId,
      clientId: params.clientId,
      eventId: params.eventId,
      platform: params.parsed.platformChannel,
      externalInquiryId: params.parsed.orderId,
      externalUriToken: params.parsed.ctaUriToken,
      externalUrl: params.parsed.primaryLink || params.pageUrl,
      ...urls,
      statusOnPlatform: getPlatformStatusFromCapture(params.captureType),
      nextActionRequired: params.nextActionRequired,
      nextActionBy: params.nextActionBy,
      lastCaptureType: 'manual_page_capture',
      payload: {
        page_title: params.pageTitle,
        capture_type: params.captureType,
        lawful_source: 'chef_supplied_manual_capture',
      },
    })

    if (!platformRecordId) return

    await createEmailSnapshot(params.db, {
      tenantId: params.tenantId,
      platformRecordId,
      inquiryId: params.inquiryId,
      eventId: params.eventId,
      captureType: params.captureType,
      clientName: params.parsed.clientName,
      email: params.parsed.email,
      phone: params.parsed.phone,
      bookingDate: params.parsed.bookingDate,
      guestCount: params.parsed.guestCount,
      location: params.parsed.location,
      occasion: params.parsed.occasion,
      amountCents: params.parsed.amountCents,
      summary: params.parsed.summary,
      textExcerpt: params.pageText,
      source: 'manual_capture',
      snapshotAt: params.capturedAt,
      metadata: {
        page_url: params.pageUrl,
        page_title: params.pageTitle,
        capture_type: params.captureType,
        lawful_source: 'chef_supplied_manual_capture',
      },
    })

    if (
      (params.captureType === 'booking' || params.captureType === 'proposal') &&
      params.parsed.amountCents != null
    ) {
      await upsertPlatformPayout(params.db, {
        tenantId: params.tenantId,
        platformRecordId,
        inquiryId: params.inquiryId,
        eventId: params.eventId,
        platform: params.parsed.platformChannel,
        grossBookingCents: params.parsed.amountCents,
        payoutStatus: 'untracked',
        source: 'manual_capture',
      })
    }
  } catch (error) {
    console.warn('[source-platform-capture] Write-through skipped:', error)
  }
}

export async function saveTakeAChefPageCapture(
  input: TakeAChefPageCaptureInput
): Promise<TakeAChefPageCaptureResult> {
  const user = await requireChef()
  const validated = TakeAChefPageCaptureSchema.parse(input)
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const parsed = parseTakeAChefPageCapture({
    pageUrl: validated.pageUrl,
    pageTitle: validated.pageTitle || null,
    pageText: validated.pageText,
    pageLinks: validated.pageLinks ?? [],
  })
  const captureType = validated.captureType ?? parsed.suggestedCaptureType
  const platformChannel = isMarketplaceChannelValue(parsed.platformChannel)
    ? parsed.platformChannel
    : 'other'
  const parsedWithChannel = { ...parsed, platformChannel }
  const capturedAt = new Date().toISOString()

  try {
    const existingInquiryId = await findPlatformInquiryByContext(db, tenantId, {
      channel: platformChannel,
      clientName: parsed.clientName,
      eventDate: parsed.bookingDate,
      orderId: parsed.orderId,
      externalIds: parsed.identityKeys,
    })

    if (existingInquiryId) {
      const { data: inquiry, error } = await db
        .from('inquiries')
        .select(
          'id, client_id, status, external_link, external_inquiry_id, confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_budget_cents, source_message, unknown_fields, converted_to_event_id'
        )
        .eq('tenant_id', tenantId)
        .eq('id', existingInquiryId)
        .single()

      if (error || !inquiry) {
        throw new Error(`Failed to load matched inquiry: ${error?.message}`)
      }

      const linkedClientId =
        inquiry.client_id ??
        (await maybeCreateClient({
          db,
          tenantId,
          fullName: parsed.clientName,
          email: parsed.email,
          phone: parsed.phone,
          sourceChannel: platformChannel,
        }))

      const nextAction = getCaptureNextAction({
        captureType,
        currentStatus: inquiry.status,
        hasLinkedEvent: Boolean(inquiry.converted_to_event_id),
      })

      const { error: updateError } = await db
        .from('inquiries')
        .update({
          client_id: linkedClientId ?? inquiry.client_id,
          status:
            captureType === 'booking' || captureType === 'guest_contact'
              ? 'confirmed'
              : inquiry.status,
          external_link: inquiry.external_link || parsed.primaryLink || validated.pageUrl,
          external_inquiry_id:
            inquiry.external_inquiry_id || parsed.orderId || parsed.ctaUriToken || null,
          confirmed_date: inquiry.confirmed_date || parsed.bookingDate,
          confirmed_guest_count: inquiry.confirmed_guest_count || parsed.guestCount,
          confirmed_location: inquiry.confirmed_location || parsed.location,
          confirmed_occasion: inquiry.confirmed_occasion || parsed.occasion,
          confirmed_budget_cents:
            inquiry.confirmed_budget_cents ||
            ((captureType === 'proposal' || captureType === 'booking') && parsed.amountCents
              ? parsed.amountCents
              : null),
          source_message: inquiry.source_message || parsed.summary,
          next_action_required: nextAction.nextActionRequired,
          next_action_by: nextAction.nextActionBy,
          unknown_fields: mergeTakeAChefPageCaptureIntoUnknownFields({
            unknownFields: inquiry.unknown_fields,
            identityKeys: parsed.identityKeys,
            captureType,
            pageUrl: validated.pageUrl,
            pageTitle: validated.pageTitle || null,
            pageLinks: validated.pageLinks,
            notes: validated.notes || null,
            parsed: parsedWithChannel,
            capturedAt,
          }),
        })
        .eq('tenant_id', tenantId)
        .eq('id', existingInquiryId)

      if (updateError) {
        throw new Error(`Failed to save page capture: ${updateError.message}`)
      }

      await syncClientContactDetails({
        db,
        tenantId,
        clientId: linkedClientId ?? inquiry.client_id,
        fullName: parsed.clientName,
        email: parsed.email,
        phone: parsed.phone,
        sourceChannel: platformChannel,
      })

      const finalStatus =
        captureType === 'proposal'
          ? await syncProposalStatusFromCapture({
              inquiryId: existingInquiryId,
              currentStatus: inquiry.status,
            })
          : captureType === 'booking' || captureType === 'guest_contact'
            ? 'confirmed'
            : inquiry.status

      const eventId =
        captureType === 'booking'
          ? await syncBookingEventFromCapture({
              db,
              tenantId,
              userId: user.id,
              inquiryId: existingInquiryId,
              clientId: linkedClientId ?? inquiry.client_id,
              currentEventId: inquiry.converted_to_event_id ?? null,
              confirmedDate: inquiry.confirmed_date ?? null,
              confirmedGuestCount: inquiry.confirmed_guest_count ?? null,
              confirmedLocation: inquiry.confirmed_location ?? null,
              confirmedOccasion: inquiry.confirmed_occasion ?? null,
              pageNotes: validated.notes || null,
              parsed: parsedWithChannel,
            })
          : (inquiry.converted_to_event_id ?? null)

      await writeSourcePlatformCaptureRecord({
        db,
        tenantId,
        inquiryId: existingInquiryId,
        clientId: linkedClientId ?? inquiry.client_id,
        eventId,
        captureType,
        pageUrl: validated.pageUrl,
        pageTitle: validated.pageTitle || null,
        pageText: validated.pageText,
        capturedAt,
        nextActionRequired: nextAction.nextActionRequired,
        nextActionBy: nextAction.nextActionBy,
        parsed: parsedWithChannel,
      })

      if (captureType === 'menu' && finalStatus === 'confirmed' && inquiry.converted_to_event_id) {
        revalidatePath(`/events/${inquiry.converted_to_event_id}`)
      }

      revalidatePath('/marketplace')
      revalidatePath('/dashboard')
      revalidatePath('/inquiries')
      revalidatePath(`/inquiries/${existingInquiryId}`)
      if (eventId) {
        revalidatePath('/events')
        revalidatePath(`/events/${eventId}`)
      }
      revalidatePath('/clients')

      return {
        success: true,
        inquiryId: existingInquiryId,
        eventId,
        inquiryCreated: false,
        captureType,
        summary: parsed.summary,
      }
    }

    const clientId = await maybeCreateClient({
      db,
      tenantId,
      fullName: parsed.clientName,
      email: parsed.email,
      phone: parsed.phone,
      sourceChannel: platformChannel,
    })

    const status =
      captureType === 'booking' || captureType === 'guest_contact'
        ? 'confirmed'
        : captureType === 'proposal'
          ? 'quoted'
          : 'new'
    const nextAction = getCaptureNextAction({
      captureType,
      currentStatus: status,
      hasLinkedEvent: false,
    })

    const { data: inquiry, error: insertError } = await db
      .from('inquiries')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        channel: platformChannel,
        external_platform: platformChannel,
        external_link: parsed.primaryLink || validated.pageUrl,
        external_inquiry_id: parsed.orderId || parsed.ctaUriToken || null,
        first_contact_at: capturedAt,
        confirmed_date: parsed.bookingDate,
        confirmed_guest_count: parsed.guestCount,
        confirmed_location: parsed.location,
        confirmed_occasion: parsed.occasion,
        confirmed_budget_cents:
          captureType === 'booking' || captureType === 'proposal' ? parsed.amountCents : null,
        source_message: parsed.summary,
        status,
        next_action_required: nextAction.nextActionRequired,
        next_action_by: nextAction.nextActionBy,
        unknown_fields: mergeTakeAChefPageCaptureIntoUnknownFields({
          unknownFields: {
            submission_source: 'source_platform_page_capture',
            source_platform_channel: platformChannel,
            client_name: parsed.clientName,
            client_email: parsed.email,
            client_phone: parsed.phone,
          },
          identityKeys: parsed.identityKeys,
          captureType,
          pageUrl: validated.pageUrl,
          pageTitle: validated.pageTitle || null,
          pageLinks: validated.pageLinks,
          notes: validated.notes || null,
          parsed: parsedWithChannel,
          capturedAt,
        }),
      })
      .select('id')
      .single()

    if (insertError || !inquiry) {
      throw new Error(`Failed to create inquiry from page capture: ${insertError?.message}`)
    }

    await syncClientContactDetails({
      db,
      tenantId,
      clientId,
      fullName: parsed.clientName,
      email: parsed.email,
      phone: parsed.phone,
      sourceChannel: platformChannel,
    })

    const eventId =
      captureType === 'booking'
        ? await syncBookingEventFromCapture({
            db,
            tenantId,
            userId: user.id,
            inquiryId: inquiry.id,
            clientId,
            currentEventId: null,
            confirmedDate: parsed.bookingDate,
            confirmedGuestCount: parsed.guestCount,
            confirmedLocation: parsed.location,
            confirmedOccasion: parsed.occasion,
            pageNotes: validated.notes || null,
            parsed: parsedWithChannel,
          })
        : null

    await writeSourcePlatformCaptureRecord({
      db,
      tenantId,
      inquiryId: inquiry.id,
      clientId,
      eventId,
      captureType,
      pageUrl: validated.pageUrl,
      pageTitle: validated.pageTitle || null,
      pageText: validated.pageText,
      capturedAt,
      nextActionRequired: nextAction.nextActionRequired,
      nextActionBy: nextAction.nextActionBy,
      parsed: parsedWithChannel,
    })

    revalidatePath('/marketplace')
    revalidatePath('/dashboard')
    revalidatePath('/inquiries')
    revalidatePath('/clients')
    if (eventId) {
      revalidatePath('/events')
      revalidatePath(`/events/${eventId}`)
    }

    return {
      success: true,
      inquiryId: inquiry.id,
      eventId,
      inquiryCreated: true,
      captureType,
      summary: parsed.summary,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save page capture'
    console.error('[take-a-chef-page-capture] Failed:', message)
    return { success: false, error: message }
  }
}
