'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { approveProposal, declineProposal } from '@/lib/proposals/client-proposal-actions'
import Link from 'next/link'
import type { PublicProposalData } from '@/lib/proposals/client-proposal-types'

type ProposalPublicViewProps = {
  proposal: PublicProposalData
  shareToken: string
}

function formatMoney(cents: number | null | undefined): string | null {
  if (typeof cents !== 'number') return null
  return `$${(cents / 100).toFixed(2)}`
}

function formatTime(value: string | null): string | null {
  if (!value) return null
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText ?? '0')
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatLocation(proposal: PublicProposalData): string | null {
  const cityLine = [proposal.locationCity, proposal.locationState, proposal.locationZip]
    .filter(Boolean)
    .join(', ')
  return proposal.locationAddress || cityLine || null
}

function DetailCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string | null
}) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-stone-100">{value}</p>
      {helper && <p className="mt-1 text-xs leading-relaxed text-stone-500">{helper}</p>}
    </div>
  )
}

export function ProposalPublicView({ proposal, shareToken }: ProposalPublicViewProps) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(proposal.status)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success')

  const isTerminal =
    currentStatus === 'approved' || currentStatus === 'declined' || currentStatus === 'expired'

  function handleApprove() {
    const previousStatus = currentStatus
    setCurrentStatus('approved')
    setFeedbackMessage(null)

    startTransition(async () => {
      try {
        const result = await approveProposal(shareToken)
        if (!result.success) {
          setCurrentStatus(previousStatus)
          setFeedbackType('error')
          setFeedbackMessage(result.message)
        } else {
          setFeedbackType('success')
          setFeedbackMessage(result.message)
        }
      } catch {
        setCurrentStatus(previousStatus)
        setFeedbackType('error')
        setFeedbackMessage('Something went wrong. Please try again.')
      }
    })
  }

  function handleDecline() {
    const previousStatus = currentStatus
    setCurrentStatus('declined')
    setShowDeclineForm(false)
    setFeedbackMessage(null)

    startTransition(async () => {
      try {
        const result = await declineProposal(shareToken, declineReason || undefined)
        if (!result.success) {
          setCurrentStatus(previousStatus)
          setFeedbackType('error')
          setFeedbackMessage(result.message)
        } else {
          setFeedbackType('success')
          setFeedbackMessage(result.message)
        }
      } catch {
        setCurrentStatus(previousStatus)
        setFeedbackType('error')
        setFeedbackMessage('Something went wrong. Please try again.')
      }
    })
  }

  // Group dishes by course
  const courseGroups: Record<string, any[]> = {}
  if (proposal.menu?.dishes) {
    for (const dish of proposal.menu.dishes) {
      const course = dish.course || 'Main'
      if (!courseGroups[course]) courseGroups[course] = []
      courseGroups[course].push(dish)
    }
  }

  const addonTotal = (proposal.selectedAddons || []).reduce((sum, a) => sum + a.priceCents, 0)
  const basePriceCents = proposal.totalPriceCents - addonTotal
  const perGuestCents =
    proposal.guestCount && proposal.guestCount > 0
      ? Math.round(proposal.totalPriceCents / proposal.guestCount)
      : null
  const depositLabel =
    proposal.payment.depositAmountCents != null
      ? formatMoney(proposal.payment.depositAmountCents)
      : proposal.payment.depositRequired === false
        ? 'No deposit published'
        : 'Deposit not published yet'
  const balanceLabel = formatMoney(proposal.payment.balanceDueCents)
  const locationLabel = formatLocation(proposal)
  const timeLabel = formatTime(proposal.eventServeTime)
  const dietaryItems = [...proposal.dietaryRestrictions, ...proposal.allergies]
  const hasOperationalNotes = Boolean(
    proposal.locationNotes ||
      proposal.kitchenNotes ||
      proposal.specialRequests ||
      dietaryItems.length > 0
  )

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover photo or gradient hero */}
        <div className="relative h-[340px] sm:h-[420px] overflow-hidden">
          {proposal.coverPhotoUrl ? (
            <>
              <Image
                src={proposal.coverPhotoUrl}
                alt=""
                fill
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-stone-950" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-900/60 via-stone-900 to-stone-950">
              {/* Decorative pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </div>
          )}

          {/* Hero content */}
          <div className="relative z-10 flex h-full flex-col items-center justify-end pb-10 px-4 text-center">
            {proposal.chefBusinessName && (
              <p className="text-sm font-medium tracking-widest uppercase text-brand-300/80 mb-3">
                {proposal.chefBusinessName}
              </p>
            )}
            {!proposal.chefBusinessName && proposal.chefName && (
              <p className="text-sm font-medium tracking-widest uppercase text-brand-300/80 mb-3">
                Chef {proposal.chefName}
              </p>
            )}
            <h1 className="text-3xl sm:text-5xl font-bold text-white max-w-2xl leading-tight">
              {proposal.title}
            </h1>
            {proposal.eventOccasion && (
              <p className="mt-3 text-lg text-stone-300">{proposal.eventOccasion}</p>
            )}

            {/* Status badges for terminal states */}
            {currentStatus === 'approved' && (
              <div className="mt-4">
                <Badge variant="success">Approved</Badge>
              </div>
            )}
            {currentStatus === 'declined' && (
              <div className="mt-4">
                <Badge variant="error">Declined</Badge>
              </div>
            )}
            {currentStatus === 'expired' && (
              <div className="mt-4">
                <Badge variant="warning">Expired</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-10">
        {/* Feedback message */}
        {feedbackMessage && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              feedbackType === 'success'
                ? 'border-green-800 bg-green-900/20 text-green-300'
                : 'border-red-800 bg-red-900/20 text-red-300'
            }`}
          >
            {feedbackMessage}
          </div>
        )}

        {/* Personal note */}
        {proposal.personalNote && (
          <div className="relative rounded-xl border border-stone-800 bg-stone-900/50 p-6 sm:p-8">
            <div className="absolute -top-3 left-6 bg-stone-900 px-3 text-xs font-medium uppercase tracking-wider text-brand-400">
              A note from your chef
            </div>
            <blockquote className="text-lg text-stone-200 leading-relaxed italic">
              &quot;{proposal.personalNote}&quot;
            </blockquote>
            {proposal.chefName && (
              <p className="mt-4 text-sm text-stone-400">- Chef {proposal.chefName}</p>
            )}
          </div>
        )}

        {/* Event details */}
        {(proposal.eventDate || proposal.guestCount || proposal.clientName) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {proposal.eventDate && (
              <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                  Date
                </p>
                <p className="text-lg font-semibold text-stone-100">
                  {new Date(proposal.eventDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {proposal.guestCount && (
              <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                  Guests
                </p>
                <p className="text-lg font-semibold text-stone-100">{proposal.guestCount}</p>
              </div>
            )}
            {proposal.clientName && (
              <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                  Prepared for
                </p>
                <p className="text-lg font-semibold text-stone-100">{proposal.clientName}</p>
              </div>
            )}
          </div>
        )}

        {/* Booking confidence */}
        <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
                Booking clarity
              </p>
              <h2 className="mt-2 text-2xl font-bold text-stone-100">
                Review the service shape before you approve.
              </h2>
            </div>
            <Badge variant={currentStatus === 'viewed' || currentStatus === 'sent' ? 'info' : 'default'}>
              {currentStatus}
            </Badge>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DetailCard
              label="Service time"
              value={timeLabel || 'Not published yet'}
              helper={proposal.eventDate ? 'Date is shown above. Confirm timing before payment.' : null}
            />
            <DetailCard
              label="Location"
              value={locationLabel || 'Location not published yet'}
              helper={proposal.locationNotes || 'Confirm address, access, parking, and kitchen fit in writing.'}
            />
            <DetailCard
              label="Service style"
              value={proposal.serviceStyle || 'Not published yet'}
              helper={proposal.kitchenNotes || 'Kitchen requirements should be settled before the event.'}
            />
            <DetailCard
              label="Dietary readiness"
              value={
                dietaryItems.length > 0
                  ? `${dietaryItems.length} dietary or allergy note${dietaryItems.length === 1 ? '' : 's'} captured`
                  : 'No dietary notes captured yet'
              }
              helper={
                dietaryItems.length > 0
                  ? dietaryItems.slice(0, 3).join(', ')
                  : 'Share allergies and hard restrictions before final approval.'
              }
            />
          </div>

          {hasOperationalNotes && (
            <div className="mt-5 rounded-lg border border-stone-800 bg-stone-950/50 p-4">
              <p className="text-sm font-semibold text-stone-100">Operational notes</p>
              <div className="mt-3 space-y-2 text-sm text-stone-400">
                {proposal.specialRequests && <p>Special requests: {proposal.specialRequests}</p>}
                {proposal.kitchenNotes && <p>Kitchen: {proposal.kitchenNotes}</p>}
                {proposal.locationNotes && <p>Location: {proposal.locationNotes}</p>}
                {dietaryItems.length > 0 && <p>Dietary and allergy: {dietaryItems.join(', ')}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Trust stack */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
            <p className="text-sm font-semibold text-stone-100">Chef proof</p>
            {proposal.reviews.totalReviews > 0 ? (
              <p className="mt-2 text-sm text-stone-400">
                {proposal.reviews.averageRating.toFixed(1)} average rating from{' '}
                {proposal.reviews.totalReviews} public review
                {proposal.reviews.totalReviews === 1 ? '' : 's'}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone-400">
                No public review summary is attached to this proposal yet.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
            <p className="text-sm font-semibold text-stone-100">Payment safety</p>
            <p className="mt-2 text-sm text-stone-400">
              Approving this proposal does not charge your card on this page. Review deposit,
              balance, and written payment terms before money changes hands.
            </p>
          </div>
          <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
            <p className="text-sm font-semibold text-stone-100">Covered issues to confirm</p>
            <p className="mt-2 text-sm text-stone-400">
              Before payment, confirm chef cancellation, late arrival, menu substitutions, kitchen
              readiness, dietary handling, and cleanup boundaries in writing.
            </p>
          </div>
        </div>

        {proposal.reviews.highlights.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {proposal.reviews.highlights.map((review) => (
              <blockquote
                key={review.id}
                className="rounded-xl border border-stone-800 bg-stone-900/30 p-5"
              >
                <p className="text-sm leading-relaxed text-stone-300">
                  &ldquo;{review.reviewText.length > 220
                    ? `${review.reviewText.slice(0, 217).trim()}...`
                    : review.reviewText}
                  &rdquo;
                </p>
                <footer className="mt-3 text-xs text-stone-500">
                  {review.reviewerName} via {review.sourceLabel}
                  {review.rating ? `, ${review.rating.toFixed(1)} stars` : ''}
                </footer>
              </blockquote>
            ))}
          </div>
        )}

        {/* Menu section */}
        {proposal.menu && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-stone-800" />
              <h2 className="text-xl font-bold uppercase tracking-wider text-stone-300">
                The Menu
              </h2>
              <div className="h-px flex-1 bg-stone-800" />
            </div>

            {proposal.menu.name && (
              <p className="text-center text-lg text-brand-400 font-medium mb-2">
                {proposal.menu.name}
              </p>
            )}
            {proposal.menu.description && (
              <p className="text-center text-sm text-stone-400 mb-8 max-w-lg mx-auto">
                {proposal.menu.description}
              </p>
            )}

            {Object.entries(courseGroups).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(courseGroups).map(([course, dishes]) => (
                  <div key={course}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400/80 mb-4 text-center">
                      {course}
                    </h3>
                    <div className="space-y-4">
                      {dishes.map((dish) => (
                        <div key={dish.id} className="text-center">
                          <p className="text-lg font-medium text-stone-100">{dish.name}</p>
                          {dish.description && (
                            <p className="text-sm text-stone-400 mt-1 max-w-md mx-auto">
                              {dish.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-stone-400 italic">
                Menu details will be shared separately
              </p>
            )}
          </div>
        )}

        {/* Template included services */}
        {proposal.template?.includedServices &&
          Object.keys(proposal.template.includedServices).length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-stone-800" />
                <h2 className="text-xl font-bold uppercase tracking-wider text-stone-300">
                  Included
                </h2>
                <div className="h-px flex-1 bg-stone-800" />
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(proposal.template.includedServices).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-3"
                  >
                    <svg
                      className="h-4 w-4 text-green-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span className="text-sm text-stone-200">
                      {typeof value === 'string' ? value : key}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Add-ons */}
        {proposal.selectedAddons && proposal.selectedAddons.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-stone-800" />
              <h2 className="text-xl font-bold uppercase tracking-wider text-stone-300">
                Enhancements
              </h2>
              <div className="h-px flex-1 bg-stone-800" />
            </div>
            <div className="space-y-3">
              {proposal.selectedAddons.map((addon) => (
                <div
                  key={addon.addonId}
                  className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-3"
                >
                  <span className="text-stone-200">{addon.name}</span>
                  <span className="text-sm text-stone-400">
                    +${(addon.priceCents / 100).toFixed(2)}/person
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-stone-800" />
            <h2 className="text-xl font-bold uppercase tracking-wider text-stone-300">
              Investment
            </h2>
            <div className="h-px flex-1 bg-stone-800" />
          </div>

          {addonTotal > 0 && (
            <div className="space-y-2 mb-4 pb-4 border-b border-stone-800">
              <div className="flex justify-between text-stone-300">
                <span>Base price</span>
                <span>${(basePriceCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Enhancements</span>
                <span>${(addonTotal / 100).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-baseline">
            <span className="text-lg text-stone-200">Total</span>
            <span className="text-3xl font-bold text-stone-100">
              ${(proposal.totalPriceCents / 100).toFixed(2)}
            </span>
          </div>

          {perGuestCents != null && (
            <p className="text-right text-sm text-stone-500 mt-1">
              {formatMoney(perGuestCents)} per guest
            </p>
          )}

          <div className="mt-6 grid gap-3 border-t border-stone-800 pt-5 sm:grid-cols-2">
            <DetailCard
              label="Deposit"
              value={depositLabel || 'Deposit not published yet'}
              helper={
                proposal.payment.source === 'chef_settings'
                  ? 'Estimated from this chef\'s published deposit settings.'
                  : proposal.payment.source === 'event'
                    ? 'Pulled from the linked event record.'
                    : 'No deposit amount is attached to this proposal.'
              }
            />
            <DetailCard
              label="Balance"
              value={balanceLabel || 'Balance not published yet'}
              helper={
                proposal.payment.balanceDueDaysBefore != null
                  ? `Usually due ${proposal.payment.balanceDueDaysBefore} day${
                      proposal.payment.balanceDueDaysBefore === 1 ? '' : 's'
                    } before service.`
                  : 'Confirm the balance due date before payment.'
              }
            />
          </div>

          {proposal.payment.termsText && (
            <p className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 p-3 text-sm leading-relaxed text-stone-400">
              {proposal.payment.termsText}
            </p>
          )}
        </div>

        {/* Policy visibility */}
        <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-6">
          <p className="text-sm font-semibold text-stone-100">Cancellation and rescheduling</p>
          {proposal.cancellationPolicy ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-stone-300">{proposal.cancellationPolicy.name}</p>
              {proposal.cancellationPolicy.gracePeriodHours != null && (
                <p className="text-sm text-stone-400">
                  Grace period: {proposal.cancellationPolicy.gracePeriodHours} hours.
                </p>
              )}
              {proposal.cancellationPolicy.tiers.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {proposal.cancellationPolicy.tiers.map((tier) => (
                    <div
                      key={`${tier.label}-${tier.minDays}-${tier.maxDays}`}
                      className="rounded-lg border border-stone-800 bg-stone-950/50 p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {tier.label}
                      </p>
                      <p className="mt-1 text-sm text-stone-200">
                        {tier.refundPercent != null
                          ? `${tier.refundPercent}% refund`
                          : 'Refund not published'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {proposal.cancellationPolicy.notes && (
                <p className="text-sm leading-relaxed text-stone-400">
                  {proposal.cancellationPolicy.notes}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              No public cancellation policy is attached to this proposal yet. Ask for written
              cancellation, rescheduling, and refund terms before payment.
            </p>
          )}
        </div>

        {/* Action buttons */}
        {!isTerminal && (
          <div className="space-y-4">
            {!showDeclineForm ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex-1 py-3 text-base"
                >
                  {isPending ? 'Processing...' : 'Approve This Proposal'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDeclineForm(true)}
                  disabled={isPending}
                  className="flex-1 py-3 text-base"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-6 space-y-4">
                <p className="text-stone-200">
                  We&apos;re sorry to hear that. Would you like to share a reason?
                </p>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional: let the chef know why (pricing, timing, dietary needs, etc.)"
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button variant="danger" onClick={handleDecline} disabled={isPending}>
                    {isPending ? 'Processing...' : 'Confirm Decline'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDeclineForm(false)
                      setDeclineReason('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal state messages */}
        {currentStatus === 'approved' && (
          <div className="rounded-xl border border-green-800/50 bg-green-900/10 p-6 text-center">
            <svg
              className="h-12 w-12 text-green-400 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-green-300 mb-1">Proposal Approved</h3>
            <p className="text-sm text-stone-400">
              Your chef has been notified and will follow up with next steps.
            </p>
          </div>
        )}

        {currentStatus === 'declined' && (
          <div className="rounded-xl border border-stone-700 bg-stone-900/30 p-6 text-center">
            <h3 className="text-lg font-semibold text-stone-300 mb-1">Proposal Declined</h3>
            <p className="text-sm text-stone-400">
              Your chef has been notified. Feel free to reach out if you change your mind.
            </p>
          </div>
        )}

        {currentStatus === 'expired' && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-900/10 p-6 text-center">
            <h3 className="text-lg font-semibold text-amber-300 mb-1">Proposal Expired</h3>
            <p className="text-sm text-stone-400">
              This proposal is no longer available. Contact your chef to request a new one.
            </p>
          </div>
        )}

        {/* Forward paths */}
        <div className="mt-8 space-y-4">
          {proposal.chefSlug && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/chef/${proposal.chefSlug}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                {proposal.chefName ? `View ${proposal.chefName}'s Profile` : 'View Chef Profile'}
              </Link>
              <Link
                href={`/chef/${proposal.chefSlug}/inquire`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-600 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
              >
                Book Again
              </Link>
            </div>
          )}
          <div className="text-center pt-2">
            <a
              href="https://cheflowhq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
            >
              Powered by <span className="font-semibold">ChefFlow</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
