// Client Event Detail - View event details and accept proposals

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { getClientReviewForEvent, getGoogleReviewUrlForTenant } from '@/lib/reviews/actions'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import AcceptProposalButton from './accept-proposal-button'
import { ClientFeedbackForm } from '@/components/reviews/client-feedback-form'
import { SubmittedReview } from '@/components/reviews/submitted-review'
import { ShareEventButton } from '@/components/sharing/share-event-button'
import { ClientRSVPSummary } from '@/components/sharing/client-rsvp-summary'
import { MessageChefButton } from '@/components/chat/message-chef-button'
import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']

// Status badge mapping
function getStatusBadge(status: EventStatus) {
  const variants: Record<EventStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'info', label: string }> = {
    draft: { variant: 'default', label: 'Draft' },
    proposed: { variant: 'warning', label: 'Pending Review' },
    accepted: { variant: 'warning', label: 'Payment Due' },
    paid: { variant: 'info', label: 'Paid' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'default', label: 'Completed' },
    cancelled: { variant: 'error', label: 'Cancelled' }
  }

  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export default async function EventDetailPage({
  params
}: {
  params: { id: string }
}) {
  await requireClient()

  const event = await getClientEventById(params.id)

  if (!event) {
    notFound()
  }

  const financial = event.financial
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const quotedPriceCents = financial?.quotedPriceCents ?? (event.quoted_price_cents ?? 0)
  const outstandingBalanceCents = financial?.outstandingBalanceCents ?? quotedPriceCents

  // Fetch sharing and RSVP data
  const [shares, guests, rsvpSummary] = await Promise.all([
    getEventShares(params.id),
    getEventGuests(params.id),
    getEventRSVPSummary(params.id),
  ])
  const activeShare = shares.find((s: any) => s.is_active) || null

  // Fetch review data for completed events
  let existingReview = null
  let googleReviewUrl: string | null = null
  if (event.status === 'completed') {
    ;[existingReview, googleReviewUrl] = await Promise.all([
      getClientReviewForEvent(params.id),
      getGoogleReviewUrlForTenant(event.tenant_id),
    ])
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/my-events"
          className="text-brand-600 hover:text-brand-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Events
        </Link>
      </div>

      {/* Event Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
              {event.occasion || 'Upcoming Event'}
            </h1>
            {getStatusBadge(event.status)}
          </div>
          <MessageChefButton
            context_type="event"
            event_id={event.id}
            label="Message Chef"
          />
        </div>
      </div>

      {/* Proposed event alert */}
      {event.status === 'proposed' && (
        <Alert variant="info" className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium mb-1">Proposal Pending</p>
              <p className="text-sm">
                Review the event details below and accept the proposal to proceed with payment.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Event Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-stone-600 mb-1">Date & Time</div>
              <div className="font-medium text-stone-900">
                {format(new Date(event.event_date), 'PPP')}
              </div>
            </div>

            <div>
              <div className="text-sm text-stone-600 mb-1">Guest Count</div>
              <div className="font-medium text-stone-900">
                {event.guest_count} guests
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-sm text-stone-600 mb-1">Location</div>
              <div className="font-medium text-stone-900">
                {[event.location_address, event.location_city, event.location_state, event.location_zip]
                  .filter(Boolean)
                  .join(', ') || 'Not set'}
              </div>
            </div>

            {event.special_requests && (
              <div className="sm:col-span-2">
                <div className="text-sm text-stone-600 mb-1">Special Requests</div>
                <div className="text-stone-900">
                  {event.special_requests}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-600">Total Price</span>
              <span className="font-semibold text-stone-900">
                {formatCurrency(quotedPriceCents)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-600">Amount Paid</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(totalPaidCents)}
              </span>
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-stone-900">Balance Due</span>
                <span className="text-2xl font-bold text-stone-900">
                  {formatCurrency(outstandingBalanceCents)}
                </span>
              </div>
            </div>

            {(event.deposit_amount_cents ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>Deposit Amount</span>
                    <span className="font-medium">
                      {formatCurrency(event.deposit_amount_cents ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {event.ledgerEntries && event.ledgerEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {event.ledgerEntries.map((entry: any) => (
                <div key={entry.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium text-stone-900">
                      {entry.description}
                    </div>
                    <div className="text-sm text-stone-600">
                      {format(new Date(entry.created_at), 'PPP')}
                    </div>
                  </div>
                  <div className="font-semibold text-stone-900">
                    {formatCurrency(entry.amount_cents)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attached Menus */}
      {event.menus && event.menus.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {event.menus.map((menu: any) => (
                <div key={menu.id}>
                  <h4 className="font-semibold text-stone-900 mb-2">
                    {menu.name}
                  </h4>
                  {menu.description && (
                    <p className="text-stone-600 text-sm mb-2">
                      {menu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {event.status === 'proposed' && (
          <AcceptProposalButton eventId={event.id} />
        )}

        {event.status === 'accepted' && outstandingBalanceCents > 0 && (
          <Link href={`/my-events/${event.id}/pay`} className="flex-1">
            <button className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition">
              Proceed to Payment
            </button>
          </Link>
        )}
      </div>

      {/* Share with Guests & RSVP Summary */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Share with Guests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShareEventButton
              eventId={event.id}
              existingShare={activeShare}
            />
            {guests.length > 0 && (
              <div className="pt-4 border-t border-stone-100">
                <h4 className="text-sm font-medium text-stone-700 mb-3">RSVP Responses</h4>
                <ClientRSVPSummary
                  guests={guests}
                  summary={{
                    total_guests: rsvpSummary?.total_guests ?? 0,
                    attending_count: rsvpSummary?.attending_count ?? 0,
                    declined_count: rsvpSummary?.declined_count ?? 0,
                    maybe_count: rsvpSummary?.maybe_count ?? 0,
                    pending_count: rsvpSummary?.pending_count ?? 0,
                    plus_one_count: rsvpSummary?.plus_one_count ?? 0,
                  }}
                  originalGuestCount={event.guest_count}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-Event Feedback (completed events only) */}
      {event.status === 'completed' && (
        <div className="mb-8">
          {existingReview ? (
            <SubmittedReview
              review={existingReview}
              eventId={event.id}
              googleReviewUrl={googleReviewUrl}
            />
          ) : (
            <ClientFeedbackForm
              eventId={event.id}
              googleReviewUrl={googleReviewUrl}
            />
          )}
        </div>
      )}
    </div>
  )
}
