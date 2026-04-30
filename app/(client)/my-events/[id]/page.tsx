// Client Event Detail - View event details and accept proposals

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { getClientReviewForEvent, getGoogleReviewUrlForTenant } from '@/lib/reviews/actions'
import {
  getEventInviteAnalytics,
  getEventJoinRequests,
  getEventRSVPObservabilitySignals,
  getEventRSVPSummary,
  getEventShareInvites,
  getEventShares,
  getEventGuests,
  getGuestCommunicationLogs,
} from '@/lib/sharing/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import AcceptProposalButton from './accept-proposal-button'
import CancelEventButton from './cancel-event-button'
import { ClientFeedbackForm } from '@/components/reviews/client-feedback-form'
import { SubmittedReview } from '@/components/reviews/submitted-review'
import { ShareEventButton } from '@/components/sharing/share-event-button'
import { ClientRSVPSummary } from '@/components/sharing/client-rsvp-summary'
import { RSVPAdvancedPanel } from '@/components/sharing/rsvp-advanced-panel'
import { MessageChefButton } from '@/components/chat/message-chef-button'
import { getEventPhotosForClient } from '@/lib/events/photo-actions'
import { ClientEventPhotoGallery } from '@/components/events/client-event-photo-gallery'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { SessionHeartbeat } from '@/components/activity/session-heartbeat'
import { LivePrivacyPageToggle } from '@/components/activity/live-privacy-controls'
import { TrackedDownloadLink } from '@/components/activity/tracked-download-link'
import { CancellationPolicyDisplay } from '@/components/events/cancellation-policy-display'
import { EventJourneyStepper } from '@/components/events/event-journey-stepper'
import { CalendarAddButtons } from '@/components/events/calendar-add-buttons'

import { buildJourneySteps, getCurrentJourneyAction } from '@/lib/events/journey-steps'
import { getCircleTokenForEvent, getClientProfileToken } from '@/lib/hub/client-hub-actions'
import { PaymentSuccessRefresher } from '@/components/events/payment-success-refresher'
import { EventStatusWatcher } from '@/components/events/event-status-watcher'
import { CircleInviteCard } from '@/components/hub/circle-invite-card'
import { EventOperatingSpineCard } from '@/components/events/event-operating-spine-card'
import { buildClientEventProgress } from '@/lib/events/operating-spine'
import type { Database } from '@/types/database'
import { GuestCountChangeCard } from './guest-count-change-card'

type EventStatus = Database['public']['Enums']['event_status']

// Status badge mapping
function getStatusBadge(status: EventStatus) {
  const variants: Record<
    EventStatus,
    { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
  > = {
    draft: { variant: 'default', label: 'Draft' },
    proposed: { variant: 'warning', label: 'Pending Review' },
    accepted: { variant: 'warning', label: 'Payment Due' },
    paid: { variant: 'info', label: 'Paid' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'default', label: 'Completed' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  }

  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await getClientEventById(params.id)
  return { title: event ? event.occasion || 'Event' : 'Event' }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { payment?: string; redirect_status?: string }
}) {
  await requireClient()

  const event = await getClientEventById(params.id)

  if (!event) {
    notFound()
  }

  const financial = event.financial
  const financialAvailable = financial != null
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const quotedPriceCents = financial?.quotedPriceCents ?? event.quoted_price_cents ?? 0
  const outstandingBalanceCents = financialAvailable ? (financial?.outstandingBalanceCents ?? 0) : 0
  const contractStatus = event.contractStatus ?? null
  const contractPendingSignature = contractStatus === 'sent' || contractStatus === 'viewed'
  const contractNeedsChefHandoff =
    event.status === 'accepted' &&
    event.hasContract &&
    !event.contractSignedAt &&
    !contractPendingSignature
  const currentJourneyAction = getCurrentJourneyAction({
    eventId: event.id,
    occasion: event.occasion ?? null,
    eventStatus: event.status,
    eventTransitions: event.transitions,
    menuApprovalStatus: (event as any).menu_approval_status ?? null,
    menuApprovalUpdatedAt: (event as any).menu_approval_updated_at ?? null,
    hasContract: event.hasContract,
    contractStatus,
    contractSignedAt: event.contractSignedAt ?? null,
    preEventChecklistConfirmedAt: (event as any).pre_event_checklist_confirmed_at ?? null,
    hasOutstandingBalance: outstandingBalanceCents > 0,
    hasReview: event.hasReview,
  })
  const postAcceptAction = getCurrentJourneyAction({
    eventId: event.id,
    occasion: event.occasion ?? null,
    eventStatus: 'accepted',
    eventTransitions: event.transitions,
    menuApprovalStatus: (event as any).menu_approval_status ?? null,
    menuApprovalUpdatedAt: (event as any).menu_approval_updated_at ?? null,
    hasContract: event.hasContract,
    contractStatus,
    contractSignedAt: event.contractSignedAt ?? null,
    preEventChecklistConfirmedAt: (event as any).pre_event_checklist_confirmed_at ?? null,
    hasOutstandingBalance: outstandingBalanceCents > 0,
    hasReview: event.hasReview,
  })
  const postAcceptRedirectHref =
    postAcceptAction?.key === 'contract_signing'
      ? `/my-events/${event.id}/contract?next=payment`
      : (postAcceptAction?.actionHref ?? `/my-events/${event.id}`)
  const acceptedPrimaryHref =
    currentJourneyAction?.key === 'contract_signing'
      ? `/my-events/${event.id}/contract?next=payment`
      : (currentJourneyAction?.actionHref ?? `/my-events/${event.id}/pay`)
  const proposedAcceptDescription = event.hasContract
    ? 'By accepting this proposal, you agree to the event details and pricing. We will take you to the agreement first if a signature is required, then payment.'
    : 'By accepting this proposal, you agree to the event details and pricing. We will take you straight to payment next.'

  // Fetch sharing and RSVP data
  const [
    shares,
    guests,
    rsvpSummary,
    joinRequests,
    shareInvites,
    inviteAnalytics,
    observability,
    communicationLogs,
    clientProfileToken,
  ] = await Promise.all([
    getEventShares(params.id).catch(() => []),
    getEventGuests(params.id).catch(() => []),
    getEventRSVPSummary(params.id).catch(() => ({
      attending: 0,
      declined: 0,
      pending: 0,
      total: 0,
    })),
    getEventJoinRequests(params.id).catch(() => []),
    getEventShareInvites(params.id).catch(() => []),
    getEventInviteAnalytics(params.id).catch(() => null),
    getEventRSVPObservabilitySignals(params.id).catch(() => null),
    getGuestCommunicationLogs(params.id).catch(() => []),
    getClientProfileToken().catch(() => null),
  ])
  const activeShare = shares.find((s: any) => s.is_active) || null
  const clientProgress = buildClientEventProgress({
    event: event as any,
    currentAction: currentJourneyAction,
    totalPaidCents,
    outstandingBalanceCents,
    financialAvailable,
    guestCountChangePending: Boolean((event as any).guestCountChangeCenter?.pendingRequest),
    guestsCount: guests.length,
    hasActiveShare: Boolean(activeShare),
  })

  // Dinner Circle is the canonical guest coordination surface once the event is live.
  const circleToken =
    event.status !== 'cancelled' ? await getCircleTokenForEvent(params.id).catch(() => null) : null

  // Fetch review data and photos for completed events
  let existingReview = null
  let googleReviewUrl: string | null = null
  let eventPhotos: Awaited<ReturnType<typeof getEventPhotosForClient>> = []
  if (event.status === 'completed') {
    ;[existingReview, googleReviewUrl, eventPhotos] = await Promise.all([
      getClientReviewForEvent(params.id).catch(() => null),
      getGoogleReviewUrlForTenant(event.tenant_id).catch(() => null),
      getEventPhotosForClient(params.id).catch(() => []),
    ])
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/my-events"
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to My Events
        </Link>
      </div>

      {/* Payment success: banner + deferred refresh to catch async webhook ledger write */}
      {(searchParams?.payment === 'success' || searchParams?.redirect_status === 'succeeded') && (
        <PaymentSuccessRefresher />
      )}
      {(searchParams?.payment === 'success' || searchParams?.redirect_status === 'succeeded') && (
        <div className="mb-6 rounded-xl border border-emerald-700 bg-emerald-950/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center mt-0.5">
              <svg
                className="w-4 h-4 text-emerald-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-emerald-200">Payment received</p>
              <p className="text-sm text-emerald-400 mt-0.5">
                Your payment was processed successfully. Your chef has been notified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Event Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 mb-2">
              {event.occasion || 'Upcoming Event'}
            </h1>
            {getStatusBadge(event.status)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MessageChefButton context_type="event" event_id={event.id} label="Message Chef" />
            <LivePrivacyPageToggle compact surface="events" />
          </div>
        </div>
      </div>

      {/* Dinner Circle nudge */}
      {circleToken && event.status !== 'cancelled' && (
        <div className="mb-6">
          <CircleInviteCard
            groupToken={circleToken}
            profileToken={clientProfileToken}
            inviteRole="client"
            occasion={event.occasion ?? null}
            openHref={`/my-hub/g/${circleToken}`}
            title="Your dinner circle is live"
            description="Send one polished link to your guests and keep the host side, chef, and table aligned in the same thread."
          />
        </div>
      )}

      <div className="mb-6">
        <EventOperatingSpineCard
          spine={clientProgress}
          audience="client"
          title="Booking progress"
          description="Your booking, menu, payment, guest details, and messages stay in one checklist."
        />
      </div>

      {/* Proposed event alert */}
      {event.status === 'proposed' && (
        <Alert variant="info" className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="font-medium mb-1">Proposal Pending</p>
              <p className="text-sm">
                Review the event details below and accept the proposal to continue into
                {event.hasContract ? ' contract and payment.' : ' payment.'}
              </p>
            </div>
            <Link
              href={`/my-events/${event.id}/proposal`}
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 bg-stone-900 border border-brand-700 px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Full Proposal
            </Link>
          </div>
        </Alert>
      )}

      {/* Journey Timeline */}
      {event.status !== 'cancelled' && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Your Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <EventJourneyStepper
              steps={buildJourneySteps({
                eventId: event.id,
                occasion: event.occasion ?? null,
                eventStatus: event.status,
                eventTransitions: event.transitions,
                hasPhotos: event.hasPhotos,
                menuApprovalStatus: (event as any).menu_approval_status ?? null,
                menuApprovalUpdatedAt: (event as any).menu_approval_updated_at ?? null,
                hasContract: event.hasContract,
                contractStatus,
                contractSignedAt: event.contractSignedAt ?? null,
                preEventChecklistConfirmedAt:
                  (event as any).pre_event_checklist_confirmed_at ?? null,
                hasOutstandingBalance: outstandingBalanceCents > 0,
                hasReview: event.hasReview,
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* Event Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-stone-400 mb-1">Date & Time</div>
              <div className="font-medium text-stone-100">
                {format(new Date(event.event_date), 'PPP')}
                {(event as any).event_timezone && (
                  <span className="ml-2 text-xs text-stone-400 font-normal">
                    {(event as any).event_timezone.replace('America/', '').replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-stone-400 mb-1">Guest Count</div>
              <div className="font-medium text-stone-100">{event.guest_count} guests</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-sm text-stone-400 mb-1">Location</div>
              <div className="font-medium text-stone-100">
                {[
                  event.location_address,
                  event.location_city,
                  event.location_state,
                  event.location_zip,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Not set'}
              </div>
            </div>

            {event.special_requests && (
              <div className="sm:col-span-2">
                <div className="text-sm text-stone-400 mb-1">Special Requests</div>
                <div className="text-stone-100">{event.special_requests}</div>
              </div>
            )}
          </div>

          {/* Calendar add buttons - shown when event is locked in */}
          {['paid', 'confirmed', 'in_progress'].includes(event.status) && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <CalendarAddButtons
                eventId={event.id}
                occasion={event.occasion || 'Private Chef Dinner'}
                eventDate={event.event_date}
                startTime={event.serve_time ?? undefined}
                location={
                  [event.location_address, event.location_city, event.location_state]
                    .filter(Boolean)
                    .join(', ') || undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <GuestCountChangeCard
        eventId={event.id}
        currentGuestCount={event.guest_count}
        center={(event as any).guestCountChangeCenter}
      />

      {/* Payment Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!financialAvailable ? (
            <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-center">
              <p className="text-sm text-amber-400">
                Payment information is temporarily unavailable. Please refresh the page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Total</span>
                <span className="text-base font-semibold text-stone-100">
                  {formatCurrency(quotedPriceCents)}
                </span>
              </div>
              {(event as any).price_per_person_cents != null && event.guest_count != null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500">Per person</span>
                  <span className="text-stone-400">
                    {formatCurrency((event as any).price_per_person_cents)} x {event.guest_count}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-stone-400">Amount Paid</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(totalPaidCents)}
                </span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-stone-100">Balance Due</span>
                  <span
                    className={`text-2xl font-bold ${outstandingBalanceCents > 0 ? 'text-red-700' : 'text-stone-100'}`}
                  >
                    {formatCurrency(outstandingBalanceCents)}
                  </span>
                </div>
                {outstandingBalanceCents > 0 &&
                  ['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status) && (
                    <div className="mt-3">
                      <Link
                        href={`/my-events/${event.id}/pay`}
                        className="block w-full bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition text-sm text-center"
                      >
                        Pay Remaining Balance
                      </Link>
                    </div>
                  )}
              </div>

              {(event.deposit_amount_cents ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-stone-400">
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
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {event.ledgerEntries && event.ledgerEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <TrackedDownloadLink
              href={`/api/documents/receipt/${event.id}`}
              documentType="receipt"
              entityId={event.id}
              className="text-sm font-medium text-brand-500 hover:text-brand-400"
            >
              Download Receipt
            </TrackedDownloadLink>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {event.ledgerEntries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-stone-100">{entry.description}</div>
                    <div className="text-sm text-stone-400">
                      {format(new Date(entry.created_at), 'PPP')}
                    </div>
                  </div>
                  <div className="font-semibold text-stone-100">
                    {formatCurrency(entry.amount_cents)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dinner Photos - visible on completed events that have photos */}
      <ClientEventPhotoGallery photos={eventPhotos} />

      {/* Menu Section - smart status card */}
      {event.status !== 'cancelled' && event.status !== 'draft' && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Menu</CardTitle>
              {(event as any).menu_modified_after_approval ? (
                <Badge variant="warning">Updated</Badge>
              ) : (event as any).menu_approval_status === 'approved' ? (
                <Badge variant="success">Approved</Badge>
              ) : (event as any).menu_approval_status === 'sent' ? (
                <Badge variant="warning">Review Needed</Badge>
              ) : (event as any).menu_approval_status === 'revision_requested' ? (
                <Badge variant="info">Changes Sent</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {/* Menu updated after approval - show alert */}
            {(event as any).menu_modified_after_approval &&
              (event as any).menu_approval_status === 'approved' && (
                <div className="mb-4 rounded-lg border border-amber-700 bg-amber-950/50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-300">Your chef updated the menu</p>
                  <p className="mt-1 text-xs text-amber-400">
                    Changes were made after you approved it. Review the updated menu below.
                  </p>
                </div>
              )}

            {/* No menu attached yet - show CTA or preference status */}
            {(!event.menus || event.menus.length === 0) && !(event as any).menu_approval_status && (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-brand-950 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-stone-400 text-sm">
                  Help your chef create the perfect menu by sharing your preferences.
                </p>
                <Link
                  href={`/my-events/${event.id}/choose-menu`}
                  className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition"
                >
                  Choose Your Menu
                </Link>
              </div>
            )}

            {/* Menu is being worked on (attached but not sent for approval) */}
            {event.menus && event.menus.length > 0 && !(event as any).menu_approval_status && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-50" />
                  </div>
                  <p className="text-sm text-stone-300">Your chef is preparing your menu</p>
                </div>
                {event.menus.map((menu: any) => (
                  <div key={menu.id} className="border border-stone-700 rounded-lg p-3">
                    <h4 className="font-medium text-stone-100">{menu.name}</h4>
                    {menu.description && (
                      <p className="text-stone-400 text-sm mt-1">{menu.description}</p>
                    )}
                    {menu.service_style && (
                      <Badge variant="info" className="mt-2">
                        {(
                          {
                            plated: 'Plated',
                            plated_dinner: 'Plated',
                            family_style: 'Family Style',
                            buffet: 'Buffet',
                            cocktail: 'Cocktail / Passed',
                            stations: 'Stations',
                            tasting: 'Tasting Menu',
                          } as Record<string, string>
                        )[menu.service_style] || menu.service_style.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Menu sent for approval */}
            {event.menus &&
              event.menus.length > 0 &&
              (event as any).menu_approval_status === 'sent' && (
                <div className="space-y-4">
                  {event.menus.map((menu: any) => (
                    <div key={menu.id} className="border border-stone-700 rounded-lg p-3">
                      <h4 className="font-medium text-stone-100">{menu.name}</h4>
                      {menu.description && (
                        <p className="text-stone-400 text-sm mt-1">{menu.description}</p>
                      )}
                    </div>
                  ))}
                  <p className="text-sm text-amber-400">Your chef is waiting for your review.</p>
                </div>
              )}

            {/* Menu approved - show the menu with celebration */}
            {event.menus &&
              event.menus.length > 0 &&
              (event as any).menu_approval_status === 'approved' && (
                <div className="space-y-4">
                  {event.menus.map((menu: any) => (
                    <div key={menu.id}>
                      <h4 className="font-semibold text-stone-100 mb-1">{menu.name}</h4>
                      {menu.description && (
                        <p className="text-stone-400 text-sm">{menu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* Revision requested */}
            {(event as any).menu_approval_status === 'revision_requested' && (
              <div className="space-y-3">
                <p className="text-sm text-stone-400">
                  You requested changes to the menu. Your chef is working on an update.
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-stone-500">Chef is revising the menu</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Printable Guest Menu - available once event is confirmed */}
      {event.menus &&
        event.menus.length > 0 &&
        ['confirmed', 'in_progress', 'completed'].includes(event.status) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Printable Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-stone-400 text-sm mb-4">
                Your printable guest menu is ready. Download and print it to place on the dining
                table.
              </p>
              <TrackedDownloadLink
                href={`/api/documents/foh-menu/${event.id}`}
                documentType="foh_menu"
                entityId={event.id}
                className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Menu PDF
              </TrackedDownloadLink>
            </CardContent>
          </Card>
        )}

      {/* Cancellation policy - shown on paid/confirmed events so clients understand terms */}
      {['accepted', 'paid', 'confirmed', 'in_progress'].includes(event.status) && (
        <div className="mb-4">
          <CancellationPolicyDisplay variant="compact" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {event.status === 'proposed' && (
          <AcceptProposalButton
            eventId={event.id}
            successRedirectHref={postAcceptRedirectHref}
            confirmDescription={proposedAcceptDescription}
          />
        )}

        {event.status === 'accepted' &&
          outstandingBalanceCents > 0 &&
          !contractNeedsChefHandoff && (
            <Link
              href={acceptedPrimaryHref}
              className="flex-1 block w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition text-center"
            >
              {currentJourneyAction?.actionLabel ?? 'Proceed to Payment'}
            </Link>
          )}

        {['proposed', 'accepted'].includes(event.status) && (
          <Link
            href={`/my-events/${event.id}/proposal`}
            className="flex-1 block w-full border border-stone-600 bg-stone-900 text-stone-300 px-6 py-3 rounded-lg font-semibold hover:bg-stone-800 transition text-sm text-center"
          >
            View Full Proposal
          </Link>
        )}

        {['proposed', 'accepted', 'paid', 'confirmed', 'in_progress'].includes(event.status) && (
          <CancelEventButton
            eventId={event.id}
            status={event.status as 'proposed' | 'accepted' | 'paid' | 'confirmed' | 'in_progress'}
          />
        )}
      </div>

      {contractNeedsChefHandoff && (
        <Alert variant="info" className="mb-8">
          <p className="font-medium mb-1">Agreement in progress</p>
          <p className="text-sm">
            Your chef is finalizing the service agreement. Payment will unlock once it is ready.
          </p>
        </Alert>
      )}

      {/* Share with Guests & RSVP Summary */}
      {event.status !== 'draft' && event.status !== 'cancelled' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Share with Guests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShareEventButton eventId={event.id} existingShare={activeShare} />
            <RSVPAdvancedPanel
              eventId={event.id}
              shareId={activeShare?.id || null}
              shareSettings={
                activeShare
                  ? {
                      require_join_approval: (activeShare as any).require_join_approval ?? true,
                      rsvp_deadline_at: (activeShare as any).rsvp_deadline_at ?? null,
                      enforce_capacity: (activeShare as any).enforce_capacity ?? false,
                      waitlist_enabled: (activeShare as any).waitlist_enabled ?? true,
                      max_capacity: (activeShare as any).max_capacity ?? null,
                    }
                  : null
              }
              joinRequests={joinRequests as any[]}
              invites={shareInvites as any[]}
              analytics={inviteAnalytics as any}
              observability={observability as any}
              communicationLogs={communicationLogs as any[]}
            />
            {guests.length > 0 && (
              <div className="pt-4 border-t border-stone-800">
                <h4 className="text-sm font-medium text-stone-300 mb-3">Guest Responses</h4>
                <ClientRSVPSummary
                  guests={guests}
                  summary={{
                    total_guests: rsvpSummary?.total_guests ?? 0,
                    attending_count: rsvpSummary?.attending_count ?? 0,
                    declined_count: rsvpSummary?.declined_count ?? 0,
                    maybe_count: rsvpSummary?.maybe_count ?? 0,
                    pending_count: rsvpSummary?.pending_count ?? 0,
                    waitlisted_count: (rsvpSummary as any)?.waitlisted_count ?? 0,
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
        <div id="review" className="mb-8">
          {existingReview ? (
            <SubmittedReview
              review={existingReview}
              eventId={event.id}
              googleReviewUrl={googleReviewUrl}
            />
          ) : (
            <ClientFeedbackForm eventId={event.id} googleReviewUrl={googleReviewUrl} />
          )}
        </div>
      )}

      {/* Rebook CTA (completed events only) */}
      {event.status === 'completed' && (
        <Card className="mb-8 border-brand-700 bg-gradient-to-r from-stone-900 to-stone-800">
          <CardContent className="py-6 text-center">
            <h3 className="text-lg font-semibold text-stone-100 mb-2">Loved the experience?</h3>
            <p className="text-sm text-stone-400 mb-4">
              Book your next event and let us create something special again.
            </p>
            <Link
              href="/book-now"
              className="inline-block rounded-lg bg-brand-600 hover:bg-brand-500 text-white py-2.5 px-6 text-sm font-medium transition-colors"
            >
              Book Again
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Live event status watcher - refreshes page when chef transitions the event */}
      <EventStatusWatcher eventId={event.id} />

      {/* Activity tracking */}
      <ActivityTracker
        eventType="event_viewed"
        entityType="event"
        entityId={event.id}
        metadata={{
          event_status: event.status,
          occasion: event.occasion,
          event_date: event.event_date,
          outstanding_balance_cents: outstandingBalanceCents,
        }}
      />
      {event.status === 'proposed' && (
        <ActivityTracker
          eventType="proposal_viewed"
          entityType="event"
          entityId={event.id}
          metadata={{
            occasion: event.occasion,
            quoted_price_cents: quotedPriceCents,
          }}
        />
      )}
      <SessionHeartbeat entityType="event" entityId={event.id} />
    </div>
  )
}
