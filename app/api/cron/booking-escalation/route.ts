import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const HOURS_48 = 48 * 60 * 60 * 1000
const DAYS_7 = 7 * 24 * 60 * 60 * 1000

const REVIEWING_STATUSES = new Set(['awaiting_chef', 'awaiting_client', 'quoted', 'confirmed'])
const RESPONDED_STATUSES = new Set(['awaiting_client', 'quoted', 'confirmed'])

type BookingRow = {
  id: string
  status: string
  consumer_name: string
  consumer_email: string
  occasion: string
  first_chef_response_at: string | null
  first_circle_token: string | null
}

type BookingInquiryLink = {
  inquiry_id: string
  chef_responded_at: string | null
  circle_group_token: string | null
  proposal_url: string | null
}

type InquiryRow = {
  id: string
  tenant_id: string | null
  client_id: string | null
  status: string | null
  last_response_at: string | null
  converted_to_event_id: string | null
}

function isChefResponded(inquiry: InquiryRow) {
  return Boolean(inquiry.last_response_at) || RESPONDED_STATUSES.has(inquiry.status ?? '')
}

function isChefReviewing(inquiry: InquiryRow) {
  return REVIEWING_STATUSES.has(inquiry.status ?? '')
}

async function resolveProposalUrl(db: any, inquiry: InquiryRow): Promise<string | null> {
  if (!inquiry.client_id || !inquiry.tenant_id) return null
  if (inquiry.status !== 'quoted' && inquiry.status !== 'confirmed') return null

  const { data: quote } = await db
    .from('quotes')
    .select('id, client_id, tenant_id, status')
    .eq('inquiry_id', inquiry.id)
    .in('status', ['sent', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!quote?.id || !quote.client_id || !quote.tenant_id) return null

  const { createClientPortalLinkForClient } = await import('@/lib/client-portal/actions')
  const portalLink = await createClientPortalLinkForClient({
    db,
    clientId: quote.client_id,
    tenantId: quote.tenant_id,
    path: `/quotes/${quote.id}`,
  })

  return portalLink.url
}

async function ensureCircleForResponse(input: {
  db: any
  booking: BookingRow
  link: BookingInquiryLink
  inquiry: InquiryRow
}): Promise<{ circleToken: string | null; proposalUrl: string | null }> {
  const { db, booking, link, inquiry } = input
  const responseAt = inquiry.last_response_at || new Date().toISOString()

  let circleToken = link.circle_group_token
  if (!circleToken) {
    const { createInquiryCircle } = await import('@/lib/hub/inquiry-circle-actions')
    const { postFirstCircleMessage } = await import('@/lib/hub/inquiry-circle-first-message')
    const circle = await createInquiryCircle({
      inquiryId: inquiry.id,
      clientName: booking.consumer_name,
      clientEmail: booking.consumer_email,
      occasion: booking.occasion,
    })
    circleToken = circle.groupToken
    await postFirstCircleMessage({ groupId: circle.groupId, inquiryId: inquiry.id })
  }

  const proposalUrl = link.proposal_url || (await resolveProposalUrl(db, inquiry))

  await db
    .from('open_booking_inquiries')
    .update({
      chef_responded_at: link.chef_responded_at || responseAt,
      circle_group_token: circleToken,
      proposal_url: proposalUrl,
    })
    .eq('booking_id', booking.id)
    .eq('inquiry_id', inquiry.id)

  if (!booking.first_circle_token && circleToken) {
    await db
      .from('open_bookings')
      .update({ first_circle_token: circleToken, updated_at: new Date().toISOString() })
      .eq('id', booking.id)
    booking.first_circle_token = circleToken
  }

  return { circleToken, proposalUrl }
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('booking-escalation', async () => {
      const db: any = createAdminClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
      const now = Date.now()

      let statusUpdated = 0
      let circlesCreated = 0
      let proposalLinksCreated = 0
      let followUpsSent = 0
      let finalsSent = 0
      let errors = 0

      try {
        const { data: activeBookings } = await db
          .from('open_bookings')
          .select(
            'id, status, consumer_name, consumer_email, occasion, first_chef_response_at, first_circle_token'
          )
          .in('status', ['sent', 'chef_reviewing', 'no_response'])
          .limit(500)

        for (const booking of (activeBookings ?? []) as BookingRow[]) {
          try {
            const { data: links } = await db
              .from('open_booking_inquiries')
              .select('inquiry_id, chef_responded_at, circle_group_token, proposal_url')
              .eq('booking_id', booking.id)

            if (!links || links.length === 0) continue

            const inquiryIds = links.map((link: BookingInquiryLink) => link.inquiry_id)
            const { data: inquiries } = await db
              .from('inquiries')
              .select('id, tenant_id, client_id, status, last_response_at, converted_to_event_id')
              .in('id', inquiryIds)

            const inquiryRows = ((inquiries ?? []) as InquiryRow[]).filter(
              (inquiry) => inquiry.status !== 'declined' && inquiry.status !== 'expired'
            )
            const responded = inquiryRows.filter(isChefResponded)
            const reviewing = inquiryRows.filter(isChefReviewing)

            for (const inquiry of responded) {
              const link = (links as BookingInquiryLink[]).find(
                (candidate) => candidate.inquiry_id === inquiry.id
              )
              if (!link) continue

              const hadCircle = Boolean(link.circle_group_token)
              const hadProposal = Boolean(link.proposal_url)
              const ensured = await ensureCircleForResponse({ db, booking, link, inquiry })
              if (!hadCircle && ensured.circleToken) circlesCreated++
              if (!hadProposal && ensured.proposalUrl) {
                proposalLinksCreated++
              }
            }

            const newStatus =
              responded.length > 0
                ? 'chef_responded'
                : reviewing.length > 0
                  ? 'chef_reviewing'
                  : booking.status

            if (
              newStatus !== booking.status ||
              (responded.length > 0 && !booking.first_chef_response_at)
            ) {
              await db
                .from('open_bookings')
                .update({
                  status: newStatus,
                  first_chef_response_at:
                    booking.first_chef_response_at ||
                    responded[0]?.last_response_at ||
                    new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', booking.id)
              statusUpdated++
            }
          } catch (err) {
            errors++
            console.error('[booking-escalation] Status check failed for booking', booking.id, err)
          }
        }
      } catch (phaseErr) {
        errors++
        console.error('[booking-escalation] Status detection failed:', phaseErr)
      }

      try {
        const cutoff48h = new Date(now - HOURS_48).toISOString()
        const { data: staleBookings } = await db
          .from('open_bookings')
          .select('id, consumer_email, consumer_name, occasion, booking_token')
          .eq('status', 'sent')
          .lte('created_at', cutoff48h)
          .is('follow_up_48h_sent_at', null)
          .limit(100)

        for (const booking of staleBookings ?? []) {
          try {
            const { sendBookingFollowUpEmail } = await import('@/lib/email/notifications')
            await sendBookingFollowUpEmail({
              consumerEmail: booking.consumer_email,
              consumerName: booking.consumer_name,
              occasion: booking.occasion,
              statusUrl: `${appUrl}/book/status/${booking.booking_token}`,
            })

            await db
              .from('open_bookings')
              .update({
                follow_up_48h_sent_at: new Date().toISOString(),
                status: 'no_response',
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.id)

            followUpsSent++
          } catch (err) {
            errors++
            console.error('[booking-escalation] 48h follow-up failed for', booking.id, err)
          }
        }
      } catch (phaseErr) {
        errors++
        console.error('[booking-escalation] 48h follow-up phase failed:', phaseErr)
      }

      try {
        const cutoff7d = new Date(now - DAYS_7).toISOString()
        const { data: expiredBookings } = await db
          .from('open_bookings')
          .select('id, consumer_email, consumer_name, occasion')
          .eq('status', 'no_response')
          .lte('created_at', cutoff7d)
          .is('final_7d_sent_at', null)
          .limit(100)

        for (const booking of expiredBookings ?? []) {
          try {
            const { sendBookingNoMatchEmail } = await import('@/lib/email/notifications')
            await sendBookingNoMatchEmail({
              consumerEmail: booking.consumer_email,
              consumerName: booking.consumer_name,
              occasion: booking.occasion,
            })

            await db
              .from('open_bookings')
              .update({
                final_7d_sent_at: new Date().toISOString(),
                status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.id)

            finalsSent++
          } catch (err) {
            errors++
            console.error('[booking-escalation] 7d final notice failed for', booking.id, err)
          }
        }
      } catch (phaseErr) {
        errors++
        console.error('[booking-escalation] 7d final phase failed:', phaseErr)
      }

      return {
        statusUpdated,
        circlesCreated,
        proposalLinksCreated,
        followUpsSent,
        finalsSent,
        errors,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[booking-escalation] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
