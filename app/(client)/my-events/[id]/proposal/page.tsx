// Unified Proposal Page - Client View
// Single-scroll page showing event summary, menu, contract, and payment
// State-machine driven: shows the right sections based on event status

import { requireClient } from '@/lib/auth/get-user'
import { getClientEventById } from '@/lib/events/client-actions'
import { getClientEventContract } from '@/lib/contracts/actions'
import { getCurrentJourneyAction } from '@/lib/events/journey-steps'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import AcceptProposalButton from '../accept-proposal-button'
import type { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']

function getStatusBadge(status: EventStatus) {
  const variants: Record<
    EventStatus,
    { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }
  > = {
    draft: { variant: 'default', label: 'Draft' },
    proposed: { variant: 'warning', label: 'Pending Your Review' },
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

export default async function UnifiedProposalPage({ params }: { params: { id: string } }) {
  await requireClient()

  const [event, contract] = await Promise.all([
    getClientEventById(params.id),
    getClientEventContract(params.id).catch(() => null),
  ])

  if (!event) {
    notFound()
  }

  const financial = event.financial
  const quotedPriceCents = financial?.quotedPriceCents ?? event.quoted_price_cents ?? 0
  const depositAmountCents = event.deposit_amount_cents ?? 0
  const totalPaidCents = financial?.totalPaidCents ?? 0
  const outstandingBalanceCents = financial?.outstandingBalanceCents ?? quotedPriceCents

  // Contract state helpers
  const contractExists = Boolean(event.hasContract)
  const contractStatus = event.contractStatus ?? null
  const contractSigned = Boolean(event.contractSignedAt) || contractStatus === 'signed'
  const contractPendingSignature =
    contractStatus === 'sent' || contractStatus === 'viewed'
  const contractAwaitingChef = contractStatus === 'draft'
  const contractReadyAfterAcceptance = event.status === 'proposed' && contractPendingSignature

  // Payment readiness: event is accepted AND (no contract, or contract is signed)
  const canPay =
    event.status === 'accepted' &&
    outstandingBalanceCents > 0 &&
    (!contractExists || contractSigned)

  const postAcceptAction = getCurrentJourneyAction({
    eventId: event.id,
    occasion: event.occasion ?? null,
    eventStatus: 'accepted',
    menuApprovalStatus: (event as any).menu_approval_status ?? null,
    menuApprovalUpdatedAt: (event as any).menu_approval_updated_at ?? null,
    hasContract: contractExists,
    contractStatus,
    contractSignedAt: event.contractSignedAt ?? null,
    preEventChecklistConfirmedAt: (event as any).pre_event_checklist_confirmed_at ?? null,
    hasOutstandingBalance: outstandingBalanceCents > 0,
    hasReview: event.hasReview ?? false,
  })
  const postAcceptRedirectHref =
    postAcceptAction?.key === 'contract_signing'
      ? `/my-events/${event.id}/contract?next=payment`
      : postAcceptAction?.actionHref ?? `/my-events/${event.id}`
  const acceptConfirmDescription = contractExists
    ? 'By accepting this proposal, you agree to the event details and pricing. We will take you to the agreement first if a signature is required, then payment.'
    : 'By accepting this proposal, you agree to the event details and pricing. We will take you straight to payment next.'

  // Terminal/post-active statuses - just show summary
  const isTerminalOrActive = ['in_progress', 'completed', 'cancelled'].includes(event.status)

  const locationParts = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ].filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href={`/my-events/${event.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Event
        </Link>
      </div>

      {/* Page heading */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Your Proposal</h1>
          {getStatusBadge(event.status)}
        </div>
        <p className="text-stone-500 text-sm">
          Everything for your {event.occasion ?? 'upcoming event'} in one place.
        </p>
      </div>

      {/* ── SECTION 1: Event Summary ───────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Occasion
              </div>
              <div className="font-medium text-stone-100">{event.occasion || '-'}</div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Date
              </div>
              <div className="font-medium text-stone-100">
                {format(new Date(event.event_date), 'PPP')}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Guests
              </div>
              <div className="font-medium text-stone-100">{event.guest_count ?? '-'}</div>
            </div>

            <div className="sm:col-span-1">
              <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Location
              </div>
              <div className="font-medium text-stone-100">
                {locationParts.length > 0 ? locationParts.join(', ') : '-'}
              </div>
            </div>

            {event.special_requests && (
              <div className="sm:col-span-2">
                <div className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                  Special Requests
                </div>
                <div className="text-stone-100 text-sm">{event.special_requests}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: Menu Preview ────────────────────────────────────────── */}
      {event.menus && event.menus.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.menus.map((menu: any) => (
              <div key={menu.id}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-stone-100">{menu.name}</h4>
                  {menu.status === 'approved' && <Badge variant="success">Approved</Badge>}
                  {menu.status === 'draft' && <Badge variant="default">Draft</Badge>}
                </div>
                {menu.description && <p className="text-stone-400 text-sm">{menu.description}</p>}
                {menu.service_style && (
                  <p className="text-stone-500 text-xs mt-1">Service style: {menu.service_style}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 3: Pricing & Quote ────────────────────────────────────── */}
      {!isTerminalOrActive && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
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

              {depositAmountCents > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-400">Deposit Required</span>
                  <span className="font-medium text-stone-300">
                    {formatCurrency(depositAmountCents)}
                  </span>
                </div>
              )}

              {totalPaidCents > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-400">Amount Paid</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(totalPaidCents)}
                    </span>
                  </div>
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-semibold text-stone-100">Balance Due</span>
                    <span
                      className={`text-xl font-bold ${outstandingBalanceCents > 0 ? 'text-red-700' : 'text-emerald-600'}`}
                    >
                      {formatCurrency(outstandingBalanceCents)}
                    </span>
                  </div>
                </>
              )}

              {/* What's included note */}
              <div className="pt-3 border-t">
                <p className="text-xs text-stone-500">
                  The service fee covers menu planning, ingredient sourcing, on-site preparation,
                  service, and full kitchen cleanup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 4: Contract ───────────────────────────────────────────── */}
      {contractExists && contract && event.status !== 'cancelled' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Service Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            {contractSigned && (
              <Alert variant="success" className="mb-4">
                <p className="font-medium text-sm">Contract signed</p>
                {contract.signed_at && (
                  <p className="text-sm">Signed on {format(new Date(contract.signed_at), 'PPP')}</p>
                )}
              </Alert>
            )}

            {contractPendingSignature && (
              <Alert variant="info" className="mb-4">
                <p className="font-medium text-sm">
                  {contractReadyAfterAcceptance ? 'Agreement ready' : 'Signature required'}
                </p>
                <p className="text-sm">
                  {contractReadyAfterAcceptance
                    ? "Accept the proposal first and we'll take you straight to signature, then payment."
                    : 'Please read and sign the service agreement below to proceed to payment.'}
                </p>
              </Alert>
            )}
            {contractAwaitingChef && (
              <Alert variant="info" className="mb-4">
                <p className="font-medium text-sm">Agreement in progress</p>
                <p className="text-sm">
                  {event.status === 'proposed'
                    ? 'Your chef is finalizing the service agreement so it is ready right after you accept this proposal.'
                    : 'Your chef is finalizing the service agreement. Payment will unlock as soon as it is sent.'}
                </p>
              </Alert>
            )}

            {/* Contract body */}
            {contract.body_snapshot && (
              <pre className="whitespace-pre-wrap text-sm text-stone-300 font-sans bg-stone-800 rounded-lg p-4 border border-stone-700 max-h-96 overflow-y-auto">
                {contract.body_snapshot}
              </pre>
            )}

            {/* Sign CTA */}
            {event.status !== 'proposed' && contractPendingSignature && (
              <div className="mt-4">
                <Link href={`/my-events/${event.id}/contract?next=payment`}>
                  <button
                    type="button"
                    className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
                  >
                    Sign Contract
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 5: Accept Proposal (proposed state) ───────────────────── */}
      {event.status === 'proposed' && (
        <Card className="mb-6 border-brand-700 bg-brand-950">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-stone-100 mb-2">Ready to accept?</h3>
            <p className="text-stone-400 text-sm mb-4">
              Review the details above and click Accept Proposal to move forward. You&apos;ll then
              be asked to{contractExists ? ' sign the contract and' : ''} make your payment.
            </p>
            <AcceptProposalButton
              eventId={event.id}
              successRedirectHref={postAcceptRedirectHref}
              confirmDescription={acceptConfirmDescription}
              buttonLabel="Accept Proposal"
            />
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 6: Payment CTA (accepted state, contract satisfied) ───── */}
      {canPay && (
        <Card className="mb-6 border-emerald-200 bg-emerald-950">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-stone-100 mb-2">Complete your booking</h3>
            <p className="text-stone-400 text-sm mb-4">
              {depositAmountCents > 0
                ? `A deposit of ${formatCurrency(depositAmountCents)} secures your event date.`
                : `Payment of ${formatCurrency(outstandingBalanceCents)} is required to confirm your event.`}
            </p>
            <Link href={`/my-events/${event.id}/pay`}>
              <button
                type="button"
                className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                Proceed to Payment - {formatCurrency(outstandingBalanceCents)}
              </button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Contract must be signed before payment */}
      {event.status === 'accepted' &&
        contractExists &&
        !contractSigned &&
        outstandingBalanceCents > 0 && (
          <Alert variant="info" className="mb-6">
            <p className="font-medium text-sm">
              {contractPendingSignature
                ? 'Sign the contract above to unlock payment.'
                : 'Your chef is finalizing the agreement. Payment will unlock once it is ready.'}
            </p>
          </Alert>
        )}

      {/* ── STATUS MESSAGES for paid / confirmed / in_progress / completed ── */}
      {event.status === 'paid' && (
        <Alert variant="success" className="mb-6">
          <p className="font-medium">Payment received - awaiting chef confirmation</p>
          <p className="text-sm mt-1">
            Your payment has been processed. Your chef will confirm the booking shortly.
          </p>
        </Alert>
      )}

      {event.status === 'confirmed' && (
        <Alert variant="success" className="mb-6">
          <p className="font-medium">All set - your event is confirmed!</p>
          <p className="text-sm mt-1">
            Your chef will be in touch with any final details before the big day.
          </p>
        </Alert>
      )}

      {event.status === 'in_progress' && (
        <Alert variant="info" className="mb-6">
          <p className="font-medium">Your event is happening now</p>
          <p className="text-sm mt-1">Enjoy!</p>
        </Alert>
      )}

      {event.status === 'completed' && (
        <Alert className="mb-6">
          <p className="font-medium">Event completed</p>
          <p className="text-sm mt-1">
            Thank you for choosing a private chef experience.{' '}
            <Link href={`/my-events/${event.id}#review`} className="underline text-brand-500">
              Leave a review
            </Link>
          </p>
        </Alert>
      )}

      {event.status === 'cancelled' && (
        <Alert variant="error" className="mb-6">
          <p className="font-medium">This event was cancelled</p>
        </Alert>
      )}
    </div>
  )
}
