// Open Booking Status Queries
// Public token-based server queries for the booking status page.
// Uses admin client to bypass RLS since consumers don't have accounts.

import { createAdminClient } from '@/lib/db/admin'

export type BookingStatusData = {
  bookingToken: string
  consumerName: string
  consumerPhone: string | null
  occasion: string
  eventDate: string | null
  serveTime: string | null
  guestCount: number
  guestCountRangeLabel: string | null
  location: string
  resolvedLocation: string | null
  budgetRange: string | null
  serviceType: string | null
  dietaryRestrictions: string[]
  additionalNotes: string | null
  status: string
  matchedChefCount: number
  firstChefResponseAt: string | null
  firstCircleToken: string | null
  createdAt: string
  inquiries: Array<{
    inquiryId: string
    chefName: string | null
    status: string | null
    chefRespondedAt: string | null
    circleGroupToken: string | null
    proposalUrl: string | null
  }>
}

const REVIEWING_STATUSES = new Set(['awaiting_chef', 'awaiting_client', 'quoted', 'confirmed'])
const RESPONDED_STATUSES = new Set(['awaiting_client', 'quoted', 'confirmed'])

function hasChefResponse(inquiry: { status: string | null; last_response_at: string | null }) {
  return Boolean(inquiry.last_response_at) || RESPONDED_STATUSES.has(inquiry.status ?? '')
}

function hasChefReview(inquiry: { status: string | null }) {
  return REVIEWING_STATUSES.has(inquiry.status ?? '')
}

function deriveBookingStatus(
  storedStatus: string,
  inquiries: Array<{ status: string | null; last_response_at: string | null }>
) {
  if (inquiries.some(hasChefResponse)) return 'chef_responded'
  if (inquiries.some(hasChefReview)) return 'chef_reviewing'
  return storedStatus
}

export async function getBookingStatus(bookingToken: string): Promise<BookingStatusData | null> {
  if (!/^[a-f0-9]{16,64}$/i.test(bookingToken)) return null

  const db: any = createAdminClient()

  const { data: booking } = await db
    .from('open_bookings')
    .select('*')
    .eq('booking_token', bookingToken)
    .maybeSingle()

  if (!booking) return null

  // Fetch linked inquiry info
  const { data: links } = await db
    .from('open_booking_inquiries')
    .select('inquiry_id, chef_name, chef_responded_at, circle_group_token, proposal_url')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: true })

  const inquiryIds = (links ?? []).map((link: any) => link.inquiry_id).filter(Boolean)
  let inquiryById = new Map<string, any>()

  if (inquiryIds.length > 0) {
    const { data: inquiries } = await db
      .from('inquiries')
      .select('id, status, last_response_at')
      .in('id', inquiryIds)

    inquiryById = new Map((inquiries ?? []).map((inquiry: any) => [inquiry.id, inquiry]))
  }

  const enrichedInquiries = (links ?? []).map((link: any) => {
    const inquiry = inquiryById.get(link.inquiry_id) ?? {}
    return {
      inquiryId: link.inquiry_id,
      chefName: link.chef_name,
      status: inquiry.status ?? null,
      chefRespondedAt: link.chef_responded_at ?? inquiry.last_response_at ?? null,
      circleGroupToken: link.circle_group_token ?? null,
      proposalUrl: link.proposal_url ?? null,
    }
  })

  const derivedStatus = deriveBookingStatus(
    booking.status,
    Array.from(inquiryById.values()).map((inquiry: any) => ({
      status: inquiry.status ?? null,
      last_response_at: inquiry.last_response_at ?? null,
    }))
  )

  return {
    bookingToken: booking.booking_token,
    consumerName: booking.consumer_name,
    consumerPhone: booking.consumer_phone,
    occasion: booking.occasion,
    eventDate: booking.event_date,
    serveTime: booking.serve_time,
    guestCount: booking.guest_count,
    guestCountRangeLabel: booking.guest_count_range_label,
    location: booking.location,
    resolvedLocation: booking.resolved_location,
    budgetRange: booking.budget_range,
    serviceType: booking.service_type,
    dietaryRestrictions: Array.isArray(booking.dietary_restrictions)
      ? booking.dietary_restrictions.filter(Boolean)
      : [],
    additionalNotes: booking.additional_notes,
    status: derivedStatus,
    matchedChefCount: booking.matched_chef_count,
    firstChefResponseAt: booking.first_chef_response_at,
    firstCircleToken: booking.first_circle_token,
    createdAt: booking.created_at,
    inquiries: enrichedInquiries,
  }
}
